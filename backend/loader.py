import os
import glob
import time
from pathlib import Path
from typing import Dict, List, Tuple
from database import get_connection, init_db
from parser import CSVFileScanner, parse_event_details

def get_or_create_temporada(nombre: str = "Temporada 2026", ano: int = 2026) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM temporadas WHERE nombre = ?", (nombre,))
    row = cursor.fetchone()
    if row:
        temp_id = row["id"]
    else:
        cursor.execute("INSERT INTO temporadas (nombre, ano, descripcion) VALUES (?, ?, ?)",
                       (nombre, ano, f"Ventas de boletos para {nombre}"))
        conn.commit()
        temp_id = cursor.lastrowid
    conn.close()
    return temp_id

def delete_temporada_data(temporada_id: int):
    """Deletes all data for a season (ventas, eventos, cargas, temporada)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ventas WHERE temporada_id = ?", (temporada_id,))
    cursor.execute("DELETE FROM eventos WHERE temporada_id = ?", (temporada_id,))
    cursor.execute("DELETE FROM cargas WHERE temporada_id = ?", (temporada_id,))
    cursor.execute("DELETE FROM temporadas WHERE id = ?", (temporada_id,))
    conn.commit()
    conn.close()

def clear_temporada_tickets(temporada_id: int):
    """Keeps the temporada record but deletes all uploaded files, events and tickets"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ventas WHERE temporada_id = ?", (temporada_id,))
    cursor.execute("DELETE FROM eventos WHERE temporada_id = ?", (temporada_id,))
    cursor.execute("DELETE FROM cargas WHERE temporada_id = ?", (temporada_id,))
    conn.commit()
    conn.close()

def load_csv_file(filepath: str, temporada_id: int) -> Dict:
    """
    Ingests a CSV file into the database.
    Performs event catalog extraction, ticket parsing, arithmetic validation,
    and deduplication based on unique key.
    """
    filename = Path(filepath).name
    scanner = CSVFileScanner(filepath)
    raw_catalog = scanner.scan_event_catalog()

    # Map event_name -> list of match dates
    event_dates_map = {}
    for ev_name, ev_date in raw_catalog:
        event_dates_map.setdefault(ev_name, []).append(ev_date)

    conn = get_connection()
    cursor = conn.cursor()

    # Register load
    cursor.execute(
        "INSERT INTO cargas (temporada_id, nombre_archivo) VALUES (?, ?)",
        (temporada_id, filename)
    )
    carga_id = cursor.lastrowid
    conn.commit()

    # Insert or update events
    event_id_cache = {}
    for ev_name, dates in event_dates_map.items():
        details = parse_event_details(ev_name)
        for dt in dates:
            cursor.execute("""
            INSERT OR IGNORE INTO eventos (temporada_id, nombre, fecha_partido, fase, serie, jornada, rival, tipo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (temporada_id, ev_name, dt, details["fase"], details["serie"], details["jornada"], details["rival"], details["tipo"]))
            
            cursor.execute("SELECT id FROM eventos WHERE temporada_id = ? AND nombre = ? AND fecha_partido = ?",
                           (temporada_id, ev_name, dt))
            ev_row = cursor.fetchone()
            if ev_row:
                event_id_cache[(ev_name, dt)] = ev_row["id"]
    conn.commit()

    # Parse and insert tickets in batches
    batch_size = 5000
    batch = []
    
    total_filas = 0
    filas_nuevas = 0
    filas_duplicadas = 0
    filas_error = 0
    total_monto = 0.0
    total_pagados = 0
    total_cortesias = 0

    insert_sql = """
    INSERT OR IGNORE INTO ventas (
        temporada_id, carga_id, evento_id, evento_nombre, orden, codigo_compra,
        fecha_venta, fecha_partido, vendido_por, tipo_boleto, es_cortesia,
        zona, seccion, asiento, medio_compra, canal_normalizado, metodo_pago,
        precio, descuento, subtotal, comision, total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    start_time = time.time()
    for item in scanner.parse_tickets(event_dates_map):
        total_filas += 1
        if not item["arithmetic_valid"]:
            filas_error += 1

        ev_id = event_id_cache.get((item["evento"], item["fecha_partido"]))
        record = (
            temporada_id,
            carga_id,
            ev_id,
            item["evento"],
            item["orden"],
            item["codigo_compra"],
            item["fecha_venta"],
            item["fecha_partido"],
            item["vendido_por"],
            item["tipo_boleto"],
            item["es_cortesia"],
            item["zona"],
            item["seccion"],
            item["asiento"],
            item["medio_compra"],
            item["canal_normalizado"],
            item["metodo_pago"],
            item["precio"],
            item["descuento"],
            item["subtotal"],
            item["comision"],
            item["total"]
        )
        batch.append(record)

        if len(batch) >= batch_size:
            cursor.executemany(insert_sql, batch)
            changes = conn.total_changes
            conn.commit()
            batch.clear()

    if batch:
        cursor.executemany(insert_sql, batch)
        conn.commit()
        batch.clear()

    # Update summary counts for this carga
    cursor.execute("""
    SELECT 
        COUNT(*) as total_inserted,
        SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END) as monto_pagado,
        SUM(CASE WHEN es_cortesia = 0 THEN 1 ELSE 0 END) as boletos_pagados,
        SUM(CASE WHEN es_cortesia = 1 THEN 1 ELSE 0 END) as cortesias
    FROM ventas WHERE carga_id = ?
    """, (carga_id,))
    res = cursor.fetchone()

    filas_nuevas = res["total_inserted"] or 0
    filas_duplicadas = total_filas - filas_nuevas
    total_monto = res["monto_pagado"] or 0.0
    total_pagados = res["boletos_pagados"] or 0
    total_cortesias = res["cortesias"] or 0

    cursor.execute("""
    UPDATE cargas SET 
        total_filas = ?,
        filas_nuevas = ?,
        filas_duplicadas = ?,
        filas_error = ?,
        total_monto = ?,
        total_boletos_pagados = ?,
        total_cortesias = ?
    WHERE id = ?
    """, (total_filas, filas_nuevas, filas_duplicadas, filas_error, total_monto, total_pagados, total_cortesias, carga_id))
    conn.commit()
    conn.close()

    elapsed = time.time() - start_time
    print(f"[{filename}] Loaded {filas_nuevas} new / {filas_duplicadas} dupes / {filas_error} errors in {elapsed:.2f}s")

    return {
        "carga_id": carga_id,
        "filename": filename,
        "total_filas": total_filas,
        "filas_nuevas": filas_nuevas,
        "filas_duplicadas": filas_duplicadas,
        "filas_error": filas_error,
        "total_monto": total_monto,
        "total_pagados": total_pagados,
        "total_cortesias": total_cortesias,
        "elapsed_seconds": round(elapsed, 2)
    }

def load_initial_2026_season(csv_folder: str = "csvs") -> List[Dict]:
    """Loads all 3 CSVs of Season 2026"""
    init_db()
    temp_id = get_or_create_temporada("Temporada 2026", 2026)
    
    files = sorted(glob.glob(os.path.join(csv_folder, "*.csv")))
    results = []
    print(f"Loading {len(files)} files into Temporada 2026 (id={temp_id})...")
    for f in files:
        res = load_csv_file(f, temp_id)
        results.append(res)
    return results

if __name__ == "__main__":
    init_db()
    results = load_initial_2026_season()
    print("Initial 2026 load complete:")
    for r in results:
        print(r)
