import sqlite3
import os
from pathlib import Path

DB_PATH = Path(os.getenv("SQLITE_DB_PATH", Path(__file__).resolve().parent / "toros_dashboard.db"))

def get_connection():
    # Ensure parent directory exists (e.g. if mounted disk /data)
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn

import hashlib
import hmac
import secrets

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${pw_hash}"

def verify_password(plain_password: str, hashed_value: str) -> bool:
    if not hashed_value or not plain_password:
        return False
    if "$" in hashed_value:
        try:
            salt, stored_hash = hashed_value.split("$", 1)
            calculated = hashlib.pbkdf2_hmac("sha256", plain_password.encode(), salt.encode(), 100_000).hex()
            return hmac.compare_digest(calculated, stored_hash)
        except Exception:
            return False
    # Legacy SHA-256 fallback (without salt) to allow migration
    legacy = hashlib.sha256(plain_password.encode()).hexdigest()
    return hmac.compare_digest(legacy, hashed_value)

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

    # Índice de optimización para series de tiempo y sparklines de eventos
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_ventas_temp_ev_fecha 
    ON ventas(temporada_id, evento_nombre, fecha_venta)
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

    # Seed de usuarios autorizados con contraseñas saladas individuales
    default_pw_raw = os.getenv("DEFAULT_ADMIN_PASSWORD", "toros2026")

    users_data = [
        ("Jorge Ruiz", "jorge.ruiz@toros.com", "jorge.ruiz", "Administrador General", "#fe9365"),
        ("Juan Manuel Vega", "juan.vega@toros.com", "juan.vega", "Director / Administrador", "#0ac282"),
        ("Manuel Alejandro Quevedo", "manuel.quevedo@toros.com", "manuel.quevedo", "Analista Financiero", "#01a9ac"),
        ("Alexa Luna Montesinos", "alexa.luna@toros.com", "alexa.luna", "Administradora", "#ec4899"),
    ]

    for nombre, correo, username, rol, avatar in users_data:
        cursor.execute("SELECT id, password_hash FROM usuarios WHERE username = ? OR correo = ?", (username, correo))
        existing = cursor.fetchone()
        if not existing:
            pw_salted = hash_password(default_pw_raw)
            cursor.execute("""
            INSERT INTO usuarios (nombre, correo, username, password_hash, rol, avatar_color)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (nombre, correo, username, pw_salted, rol, avatar))
        elif "$" not in existing["password_hash"]:
            # Upgrade legacy un-salted SHA-256 hash to PBKDF2 with unique salt
            pw_salted = hash_password(default_pw_raw)
            cursor.execute("UPDATE usuarios SET password_hash = ? WHERE id = ?", (pw_salted, existing["id"]))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema created, legacy hashes migrated, and users seeded with PBKDF2 salt successfully.")
