import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "toros_dashboard.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Temporadas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS temporadas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE,
        ano INTEGER NOT NULL,
        descripcion TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Cargas de archivos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cargas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temporada_id INTEGER NOT NULL,
        nombre_archivo TEXT NOT NULL,
        fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_filas INTEGER DEFAULT 0,
        filas_nuevas INTEGER DEFAULT 0,
        filas_duplicadas INTEGER DEFAULT 0,
        filas_error INTEGER DEFAULT 0,
        total_monto REAL DEFAULT 0,
        total_boletos_pagados INTEGER DEFAULT 0,
        total_cortesias INTEGER DEFAULT 0,
        FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE
    )
    """)

    # Catalogo de Eventos
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS eventos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temporada_id INTEGER NOT NULL,
        nombre TEXT NOT NULL,
        fecha_partido TEXT,
        fase TEXT,
        serie TEXT,
        jornada TEXT,
        rival TEXT,
        tipo TEXT,
        FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE,
        UNIQUE(temporada_id, nombre, fecha_partido)
    )
    """)

    # Ventas / Boletos (1 fila = 1 boleto)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temporada_id INTEGER NOT NULL,
        carga_id INTEGER NOT NULL,
        evento_id INTEGER,
        evento_nombre TEXT NOT NULL,
        orden TEXT NOT NULL,
        codigo_compra TEXT,
        fecha_venta TEXT NOT NULL,
        fecha_partido TEXT,
        vendido_por TEXT,
        tipo_boleto TEXT,
        es_cortesia INTEGER DEFAULT 0,
        zona TEXT,
        seccion TEXT,
        asiento TEXT,
        medio_compra TEXT,
        canal_normalizado TEXT,
        metodo_pago TEXT,
        precio REAL DEFAULT 0,
        descuento REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        comision REAL DEFAULT 0,
        total REAL DEFAULT 0,
        FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE,
        FOREIGN KEY (carga_id) REFERENCES cargas(id) ON DELETE CASCADE,
        FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE SET NULL
    )
    """)

    # Llave única: Orden + Evento + Zona + Seccion + Asiento
    cursor.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ventas_unique_ticket 
    ON ventas(temporada_id, orden, evento_nombre, zona, seccion, asiento)
    """)

    # Índices para consultas y KPIs ultrarrápidos
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ventas_temp_cortesia ON ventas(temporada_id, es_cortesia)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ventas_temp_evento ON ventas(temporada_id, evento_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ventas_temp_fecha ON ventas(temporada_id, fecha_venta)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ventas_canal ON ventas(temporada_id, canal_normalizado)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ventas_zona ON ventas(temporada_id, zona)")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema created successfully.")
