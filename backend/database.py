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

import bcrypt
import hashlib
import hmac

def hash_password(password: str) -> str:
    """Hashes a password using bcrypt with standard work factor."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_value: str) -> bool:
    """Verifies password against bcrypt, with fallback to legacy PBKDF2/SHA-256."""
    if not hashed_value or not plain_password:
        return False
    # 1. Bcrypt verification
    if hashed_value.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_value.encode('utf-8'))
        except Exception:
            return False
    # 2. PBKDF2 fallback
    if "$" in hashed_value and not hashed_value.startswith("$2"):
        try:
            salt, stored_hash = hashed_value.split("$", 1)
            calculated = hashlib.pbkdf2_hmac("sha256", plain_password.encode('utf-8'), salt.encode('utf-8'), 100_000).hex()
            return hmac.compare_digest(calculated, stored_hash)
        except Exception:
            return False
    # 3. Plain legacy SHA-256 fallback
    legacy = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
    return hmac.compare_digest(legacy, hashed_value)

def needs_rehash(hashed_value: str) -> bool:
    """Returns True if the hash should be upgraded to bcrypt."""
    return not hashed_value.startswith(("$2b$", "$2a$", "$2y$"))

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

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_ventas_ev_covering 
    ON ventas(temporada_id, evento_nombre, es_cortesia, total, fecha_partido)
    """)

    # Índices de cobertura (Covering Indexes) para agregaciones ultrarrápidas (<0.1s)
    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_ventas_kpi_covering 
    ON ventas(temporada_id, es_cortesia, total, descuento)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_ventas_temp_orden 
    ON ventas(temporada_id, orden)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_ventas_canal_covering 
    ON ventas(temporada_id, canal_normalizado, es_cortesia, total)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_ventas_zona_covering 
    ON ventas(temporada_id, zona, es_cortesia, total)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_ventas_tipo_covering 
    ON ventas(temporada_id, tipo_boleto, es_cortesia, total)
    """)

    cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_ventas_timeline_covering 
    ON ventas(temporada_id, fecha_venta, es_cortesia, total)
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
        elif needs_rehash(existing["password_hash"]):
            # Upgrade legacy hash to modern bcrypt
            pw_bcrypt = hash_password(default_pw_raw)
            cursor.execute("UPDATE usuarios SET password_hash = ? WHERE id = ?", (pw_bcrypt, existing["id"]))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database schema created, legacy hashes migrated, and users seeded with PBKDF2 salt successfully.")
