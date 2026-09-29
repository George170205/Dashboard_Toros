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

    # Tabla de Usuarios
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        correo TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL DEFAULT 'Administrador',
        avatar_color TEXT DEFAULT '#fe9365',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Seed de usuarios autorizados
    import hashlib
    def h(p): return hashlib.sha256(p.encode()).hexdigest()
    default_pw = h("toros2026")

    users_data = [
        ("Jorge Ruiz", "jorge.ruiz@toros.com", "jorge.ruiz", default_pw, "Administrador General", "#fe9365"),
        ("Juan Manuel Vega", "juan.vega@toros.com", "juan.vega", default_pw, "Director / Administrador", "#0ac282"),
        ("Manuel Alejandro Quevedo", "manuel.quevedo@toros.com", "manuel.quevedo", default_pw, "Analista Financiero", "#01a9ac"),
        ("Alexa Luna Montesinos", "alexa.luna@toros.com", "alexa.luna", default_pw, "Administradora", "#ec4899"),
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO usuarios (nombre, correo, username, password_hash, rol, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?)
    """, users_data)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema created and users seeded successfully.")
