from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
import os
import shutil
import tempfile
import time
import uuid
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno locales si existen
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

import jwt
from database import get_connection, init_db, verify_password, hash_password, needs_rehash
from loader import load_csv_file, delete_temporada_data, clear_temporada_tickets, load_initial_2026_season, get_or_create_temporada
from pydantic import BaseModel
from llm_client import get_gemini_client, get_gemini_model_name, GeminiNotConfiguredError
from tools import AVAILABLE_TOOLS
from google.genai import types
from google.genai.errors import APIError

app = FastAPI(title="Toros de Tijuana - Sales Dashboard API", version="1.0.0")

# Sistema de Caché en Memoria con TTL (Invalidación automática en escrituras)
_DASHBOARD_CACHE: Dict[str, dict] = {}
_CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "600"))

def get_cache(key: str) -> Optional[dict]:
    entry = _DASHBOARD_CACHE.get(key)
    if entry and time.time() < entry["expires_at"]:
        return entry["data"]
    if entry:
        _DASHBOARD_CACHE.pop(key, None)
    return None

def set_cache(key: str, data: dict, ttl_seconds: int = _CACHE_TTL_SECONDS):
    _DASHBOARD_CACHE[key] = {
        "data": data,
        "expires_at": time.time() + ttl_seconds
    }

def invalidate_all_cache():
    _DASHBOARD_CACHE.clear()

# Security, JWT and Environment configuration
JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("SECRET_KEY", "toros-jwt-secret-key-change-in-production-2026-xyz789")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))

ENVIRONMENT = os.getenv("ENVIRONMENT", "production").lower()
ALLOWED_ORIGINS_ENV = os.getenv("ALLOWED_ORIGINS", "")

allowed_origins_list = []
if ALLOWED_ORIGINS_ENV:
    allowed_origins_list.extend([o.strip() for o in ALLOWED_ORIGINS_ENV.split(",") if o.strip()])

# Include localhost only in development or if ALLOWED_ORIGINS was not explicitly set
if ENVIRONMENT in ("development", "dev", "local") or not ALLOWED_ORIGINS_ENV:
    allowed_origins_list.extend([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ])

# Remove duplicates while preserving order
allowed_origins = list(dict.fromkeys(allowed_origins_list))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# JWT generation and verification
def create_access_token(user_id: int, username: str, rol: str = "Administrador") -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": str(user_id),
        "username": username,
        "rol": rol,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autenticación requerido")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Formato de token inválido. Use 'Bearer <token>'")
    token = parts[1]
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token ha expirado. Inicia sesión nuevamente.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido o corrupto.")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Identificador de usuario ausente en token")

    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT id, nombre, correo, username, rol, avatar_color FROM usuarios WHERE id = ?", (int(user_id),))
    user = c.fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return dict(user)

# Rate limiting for login
LOGIN_ATTEMPTS: Dict[str, List[float]] = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 300  # 5 minutos

def check_login_rate_limit(key: str):
    now = time.time()
    LOGIN_ATTEMPTS[key] = [t for t in LOGIN_ATTEMPTS[key] if now - t < LOCKOUT_WINDOW_SECONDS]
    if len(LOGIN_ATTEMPTS[key]) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Demasiados intentos fallidos de inicio de sesión. Por favor espera 5 minutos."
        )

def record_failed_login(key: str):
    LOGIN_ATTEMPTS[key].append(time.time())

def clear_failed_logins(key: str):
    LOGIN_ATTEMPTS.pop(key, None)

class TemporadaCreate(BaseModel):
    nombre: str
    ano: int
    descripcion: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
def login(req: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{req.username.strip().lower()}"
    check_login_rate_limit(rate_key)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, nombre, correo, username, password_hash, rol, avatar_color 
    FROM usuarios 
    WHERE username = ? OR correo = ?
    """, (req.username.strip().lower(), req.username.strip().lower()))
    user = cursor.fetchone()

    if not user or not verify_password(req.password, user["password_hash"]):
        conn.close()
        record_failed_login(rate_key)
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    # Transparent rehash to bcrypt if legacy hash
    if needs_rehash(user["password_hash"]):
        new_bcrypt = hash_password(req.password)
        cursor.execute("UPDATE usuarios SET password_hash = ? WHERE id = ?", (new_bcrypt, user["id"]))
        conn.commit()

    conn.close()
    clear_failed_logins(rate_key)

    user_dict = {
        "id": user["id"],
        "nombre": user["nombre"],
        "correo": user["correo"],
        "username": user["username"],
        "rol": user["rol"],
        "avatar_color": user["avatar_color"]
    }
    token = create_access_token(user["id"], user["username"], user["rol"])
    return {
        "status": "success",
        "user": user_dict,
        "token": token
    }

@app.on_event("startup")
def startup_event():
    init_db()
    temp_id = get_or_create_temporada("Temporada 2026", 2026)
    # If fresh database (0 cargas), auto-load the 3 CSVs so it is ready on deploy!
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) as cnt FROM cargas WHERE temporada_id = ?", (temp_id,))
    cnt = c.fetchone()["cnt"]
    conn.close()
    if cnt == 0:
        print("Auto-seeding Temporada 2026 from CSVs...")
        base_dir = Path(__file__).resolve().parent.parent
        csv_dir = base_dir / "csvs"
        files = sorted(list(csv_dir.glob("*.csv")))
        for f in files:
            try:
                load_csv_file(str(f), temp_id)
            except Exception as e:
                print(f"Error loading {f}: {e}")

@app.get("/")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Toros Sales API"}

@app.get("/api/temporadas")
def list_temporadas(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        t.id, t.nombre, t.ano, t.descripcion, t.fecha_creacion,
        COUNT(DISTINCT c.id) as total_cargas,
        COALESCE(SUM(CASE WHEN v.es_cortesia = 0 THEN v.total ELSE 0 END), 0) as total_ingreso,
        COALESCE(SUM(CASE WHEN v.es_cortesia = 0 THEN 1 ELSE 0 END), 0) as total_pagados,
        COALESCE(SUM(CASE WHEN v.es_cortesia = 1 THEN 1 ELSE 0 END), 0) as total_cortesias,
        COUNT(v.id) as total_boletos
    FROM temporadas t
    LEFT JOIN cargas c ON c.temporada_id = t.id
    LEFT JOIN ventas v ON v.temporada_id = t.id
    GROUP BY t.id
    ORDER BY t.ano DESC, t.id DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@app.post("/api/temporadas")
def create_temporada(payload: TemporadaCreate, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO temporadas (nombre, ano, descripcion) VALUES (?, ?, ?)",
                       (payload.nombre, payload.ano, payload.descripcion or f"Ventas {payload.nombre}"))
        conn.commit()
        temp_id = cursor.lastrowid
        conn.close()
        invalidate_all_cache()
        return {"id": temp_id, "nombre": payload.nombre, "ano": payload.ano}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Error al crear temporada: {str(e)}")

@app.delete("/api/temporadas/{temporada_id}")
def delete_temporada(temporada_id: int, current_user: dict = Depends(get_current_user)):
    delete_temporada_data(temporada_id)
    invalidate_all_cache()
    return {"status": "success", "message": f"Temporada {temporada_id} eliminada con éxito."}

@app.post("/api/temporadas/{temporada_id}/reset")
def reset_temporada(temporada_id: int, current_user: dict = Depends(get_current_user)):
    """Limpia todos los datos de ventas de una temporada para poder recargar desde la interfaz."""
    clear_temporada_tickets(temporada_id)
    invalidate_all_cache()
    return {"status": "success", "message": f"Datos de boletos de temporada {temporada_id} eliminados. Lista para recargar."}

@app.post("/api/init-2026")
@app.post("/api/temporadas/{temporada_id}/reload-initial")
def reload_initial(temporada_id: int = 1, current_user: dict = Depends(get_current_user)):
    """Recarga los 3 CSVs iniciales de 2026."""
    temp_id = get_or_create_temporada("Temporada 2026", 2026)
    clear_temporada_tickets(temp_id)
    results = []
    base_dir = Path(__file__).resolve().parent.parent
    csv_dir = base_dir / "csvs"
    files = sorted(list(csv_dir.glob("*.csv")))
    for f in files:
        res = load_csv_file(str(f), temp_id)
        results.append(res)
    invalidate_all_cache()
    return {"status": "success", "cargas": results}

@app.get("/api/dashboard/{temporada_id}")
def get_dashboard_data(temporada_id: int, current_user: dict = Depends(get_current_user)):
    cache_key = f"dashboard_{temporada_id}"
    cached = get_cache(cache_key)
    if cached is not None:
        return cached

    conn = get_connection()
    cursor = conn.cursor()

    # Verify temporada
    cursor.execute("SELECT * FROM temporadas WHERE id = ?", (temporada_id,))
    temp_row = cursor.fetchone()
    if not temp_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Temporada no encontrada")

    # 1. KPIs (Optimizado con covering index e índice de orden: <0.08s)
    cursor.execute("""
    SELECT 
        COUNT(*) as total_boletos,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso_total,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN 1 ELSE 0 END), 0) as boletos_pagados,
        COALESCE(SUM(CASE WHEN es_cortesia = 1 THEN 1 ELSE 0 END), 0) as boletos_cortesias,
        COALESCE(SUM(descuento), 0) as total_descuentos
    FROM ventas
    WHERE temporada_id = ?
    """, (temporada_id,))
    kpi_raw = cursor.fetchone()

    cursor.execute("SELECT COUNT(DISTINCT orden) as total_ordenes FROM ventas WHERE temporada_id = ?", (temporada_id,))
    total_ordenes = cursor.fetchone()["total_ordenes"] or 0
    
    total_boletos = kpi_raw["total_boletos"] or 0
    ingreso_total = round(kpi_raw["ingreso_total"] or 0, 2)
    boletos_pagados = kpi_raw["boletos_pagados"] or 0
    boletos_cortesias = kpi_raw["boletos_cortesias"] or 0
    total_descuentos = round(kpi_raw["total_descuentos"] or 0, 2)
    ticket_promedio = round(ingreso_total / boletos_pagados, 2) if boletos_pagados > 0 else 0.0

    # Events count
    cursor.execute("SELECT COUNT(DISTINCT nombre) as total_eventos FROM eventos WHERE temporada_id = ?", (temporada_id,))
    tot_events = cursor.fetchone()["total_eventos"] or 1
    
    # Capacidad estimada Estadio Chevron = 17,000 asientos por juego
    capacidad_estadio = 17000
    total_aforo_posible = tot_events * capacidad_estadio
    aforo_promedio_pct = round(((boletos_pagados + boletos_cortesias) / total_aforo_posible) * 100, 1) if total_aforo_posible > 0 else 0.0

    # Risk / Occupation score (0-10, based on occupancy)
    gauge_score = round(min(10.0, max(1.0, (aforo_promedio_pct / 100.0) * 10.0)), 1) if aforo_promedio_pct else 5.0

    # 2. Sales Analytics Timeline (by week / date range)
    cursor.execute("""
    SELECT 
        substr(fecha_venta, 1, 10) as dia,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN 1 ELSE 0 END), 0) as pagados,
        COALESCE(SUM(CASE WHEN es_cortesia = 1 THEN 1 ELSE 0 END), 0) as cortesias
    FROM ventas
    WHERE temporada_id = ? AND fecha_venta != ''
    GROUP BY dia
    ORDER BY dia ASC
    """, (temporada_id,))
    daily_sales = [dict(r) for r in cursor.fetchall()]

    # 3. Events Breakdown Table (Optimizado: agregación directa sobre ventas + metadata en memoria)
    cursor.execute("""
    SELECT 
        evento_nombre,
        MIN(fecha_partido) as fecha_partido,
        COUNT(CASE WHEN es_cortesia = 0 THEN 1 END) as pagados,
        COUNT(CASE WHEN es_cortesia = 1 THEN 1 END) as cortesias,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso,
        COALESCE(AVG(CASE WHEN es_cortesia = 0 THEN total END), 0) as ticket_prom
    FROM ventas
    WHERE temporada_id = ?
    GROUP BY evento_nombre
    ORDER BY MIN(fecha_partido) ASC, ingreso DESC
    """, (temporada_id,))
    events_raw = cursor.fetchall()

    cursor.execute("SELECT nombre, fase, rival, jornada FROM eventos WHERE temporada_id = ?", (temporada_id,))
    ev_metadata = {r["nombre"]: dict(r) for r in cursor.fetchall()}
    
    # Query real daily sales per event to build authentic cumulative sparkline curves
    cursor.execute("""
    SELECT 
        evento_nombre,
        substr(fecha_venta, 1, 10) as dia,
        COUNT(*) as cant
    FROM ventas
    WHERE temporada_id = ? AND fecha_venta != ''
    GROUP BY evento_nombre, dia
    ORDER BY dia ASC
    """, (temporada_id,))
    spark_rows = cursor.fetchall()
    event_progress = defaultdict(list)
    for sr in spark_rows:
        event_progress[sr["evento_nombre"]].append(sr["cant"])

    events_table = []
    for ev in events_raw:
        p_count = ev["pagados"] or 0
        ing = round(ev["ingreso"] or 0, 2)
        ev_name = ev["evento_nombre"]
        meta = ev_metadata.get(ev_name, {})

        # Build real cumulative progression sampled across 6 points
        counts = event_progress.get(ev_name, [])
        if not counts:
            sparkline = [p_count] * 6 if p_count > 0 else [0] * 6
        else:
            cum = []
            running = 0
            for c in counts:
                running += c
                cum.append(running)
            if len(cum) <= 6:
                step = (len(cum) - 1) / 5.0 if len(cum) > 1 else 0
                sparkline = [cum[int(round(i * step))] for i in range(6)] if len(cum) > 1 else [cum[0]] * 6
            else:
                step = (len(cum) - 1) / 5.0
                sparkline = [cum[int(round(i * step))] for i in range(6)]

        events_table.append({
            "evento": ev_name,
            "fase": meta.get("fase") or "Temporada Regular",
            "rival": meta.get("rival") or "Toros",
            "jornada": meta.get("jornada") or "J1",
            "fecha": ev["fecha_partido"] or "-",
            "pagados": p_count,
            "cortesias": ev["cortesias"] or 0,
            "ingreso": ing,
            "ticket_promedio": round(ev["ticket_prom"] or 0, 2),
            "sparkline": sparkline
        })

    # 4. Sales by Canal
    cursor.execute("""
    SELECT 
        canal_normalizado as canal,
        COUNT(CASE WHEN es_cortesia = 0 THEN 1 END) as boletos_pagados,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso
    FROM ventas
    WHERE temporada_id = ?
    GROUP BY canal_normalizado
    ORDER BY ingreso DESC
    """, (temporada_id,))
    canales = [dict(r) for r in cursor.fetchall()]

    # 5. Sales by Zona
    cursor.execute("""
    SELECT 
        zona,
        COUNT(CASE WHEN es_cortesia = 0 THEN 1 END) as boletos_pagados,
        COUNT(CASE WHEN es_cortesia = 1 THEN 1 END) as boletos_cortesias,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso
    FROM ventas
    WHERE temporada_id = ?
    GROUP BY zona
    ORDER BY ingreso DESC
    LIMIT 10
    """, (temporada_id,))
    zonas = [dict(r) for r in cursor.fetchall()]

    # 6. Ticket Types Breakdown (Pagados vs Cortesías)
    cursor.execute("""
    SELECT 
        tipo_boleto,
        es_cortesia,
        COUNT(*) as cantidad,
        COALESCE(SUM(total), 0) as total_monto
    FROM ventas
    WHERE temporada_id = ?
    GROUP BY tipo_boleto, es_cortesia
    ORDER BY cantidad DESC
    """, (temporada_id,))
    tipos_boleto = [dict(r) for r in cursor.fetchall()]

    # 7. Recent User / Vendor Activity Feed (Optimizado con subconsulta acotada a últimos 500 registros)
    cursor.execute("""
    SELECT 
        vendido_por,
        canal_normalizado,
        COUNT(*) as boletos_lote,
        COALESCE(SUM(total), 0) as monto_lote,
        MAX(fecha_venta) as fecha,
        es_cortesia
    FROM (
        SELECT vendido_por, canal_normalizado, total, fecha_venta, es_cortesia
        FROM ventas
        WHERE temporada_id = ? AND vendido_por != ''
        ORDER BY fecha_venta DESC
        LIMIT 500
    )
    GROUP BY vendido_por, canal_normalizado, substr(fecha_venta, 1, 13), es_cortesia
    ORDER BY fecha DESC
    LIMIT 10
    """, (temporada_id,))
    activities = [dict(r) for r in cursor.fetchall()]

    # 8. Cargas History for this temporada
    cursor.execute("""
    SELECT * FROM cargas WHERE temporada_id = ? ORDER BY fecha_carga DESC
    """, (temporada_id,))
    cargas = [dict(r) for r in cursor.fetchall()]

    conn.close()

    result = {
        "temporada": dict(temp_row),
        "kpis": {
            "ingreso_total": ingreso_total,
            "boletos_pagados": boletos_pagados,
            "boletos_cortesias": boletos_cortesias,
            "total_boletos": total_boletos,
            "ticket_promedio": ticket_promedio,
            "total_ordenes": total_ordenes,
            "total_descuentos": total_descuentos,
            "total_eventos": tot_events,
            "capacidad_estadio": capacidad_estadio,
            "aforo_promedio_pct": aforo_promedio_pct,
            "gauge_score": gauge_score
        },
        "daily_sales": daily_sales,
        "events_table": events_table,
        "canales": canales,
        "zonas": zonas,
        "tipos_boleto": tipos_boleto,
        "activities": activities,
        "cargas": cargas
    }
    set_cache(cache_key, result)
    return result

@app.get("/api/comparativa")
def compare_temporadas(t1_id: Optional[int] = Query(None), t2_id: Optional[int] = Query(None), current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM temporadas ORDER BY ano DESC, id DESC")
    temp_rows = [r["id"] for r in cursor.fetchall()]
    
    if not temp_rows:
        conn.close()
        raise HTTPException(status_code=404, detail="No hay temporadas registradas.")

    if not t1_id or t1_id not in temp_rows:
        t1_id = temp_rows[0]
    if not t2_id or t2_id not in temp_rows:
        t2_id = temp_rows[1] if len(temp_rows) > 1 else temp_rows[0]

    cache_key = f"comparativa_{t1_id}_{t2_id}"
    cached = get_cache(cache_key)
    if cached is not None:
        conn.close()
        return cached

    def get_summary(tid):
        cursor.execute("SELECT * FROM temporadas WHERE id = ?", (tid,))
        temp = cursor.fetchone()
        if not temp:
            return None
        cursor.execute("""
        SELECT 
            COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso,
            COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN 1 ELSE 0 END), 0) as pagados,
            COALESCE(SUM(CASE WHEN es_cortesia = 1 THEN 1 ELSE 0 END), 0) as cortesias,
            COUNT(*) as total_boletos
        FROM ventas WHERE temporada_id = ?
        """, (tid,))
        kpis = dict(cursor.fetchone())
        cursor.execute("SELECT COUNT(DISTINCT orden) as total_ordenes FROM ventas WHERE temporada_id = ?", (tid,))
        kpis["total_ordenes"] = cursor.fetchone()["total_ordenes"] or 0
        kpis["ticket_promedio"] = round(kpis["ingreso"] / kpis["pagados"], 2) if kpis["pagados"] else 0
        return {"temporada": dict(temp), "kpis": kpis}

    res1 = get_summary(t1_id)
    res2 = get_summary(t2_id)
    conn.close()

    if not res1 or not res2:
        raise HTTPException(status_code=404, detail="Una o ambas temporadas no existen.")

    k1 = res1["kpis"]
    k2 = res2["kpis"]

    diff_ingreso = k2["ingreso"] - k1["ingreso"]
    diff_ingreso_pct = round((diff_ingreso / k1["ingreso"]) * 100, 2) if k1["ingreso"] else 0.0

    diff_pagados = k2["pagados"] - k1["pagados"]
    diff_pagados_pct = round((diff_pagados / k1["pagados"]) * 100, 2) if k1["pagados"] else 0.0

    diff_cortesias = k2["cortesias"] - k1["cortesias"]
    diff_cortesias_pct = round((diff_cortesias / k1["cortesias"]) * 100, 2) if k1["cortesias"] else 0.0

    diff_ticket = k2["ticket_promedio"] - k1["ticket_promedio"]
    diff_ticket_pct = round((diff_ticket / k1["ticket_promedio"]) * 100, 2) if k1["ticket_promedio"] else 0.0

    result = {
        "temporada_base": res1,
        "temporada_comparada": res2,
        "diferencias": {
            "ingreso": {"absoluto": round(diff_ingreso, 2), "porcentaje": diff_ingreso_pct},
            "pagados": {"absoluto": diff_pagados, "porcentaje": diff_pagados_pct},
            "cortesias": {"absoluto": diff_cortesias, "porcentaje": diff_cortesias_pct},
            "ticket_promedio": {"absoluto": round(diff_ticket, 2), "porcentaje": diff_ticket_pct}
        }
    }
    set_cache(cache_key, result)
    return result

class ChatMessage(BaseModel):
    rol: str
    texto: str

class ChatRequest(BaseModel):
    pregunta: str
    temporada_id: int = 1
    historial: Optional[List[ChatMessage]] = None

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Endpoint del Asistente IA para análisis de mercado y ventas.
    Usa Google Gemini con function calling sobre la base de datos de los Toros de Tijuana.
    """
    pregunta = req.pregunta.strip()
    if not pregunta:
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")

    try:
        client = get_gemini_client()
        model_name = get_gemini_model_name()
    except GeminiNotConfiguredError:
        raise HTTPException(
            status_code=503,
            detail="Asistente no configurado: falta GEMINI_API_KEY en variables de entorno."
        )

    system_instruction = (
        "Eres el Asistente IA de Inteligencia de Negocio y Análisis de Mercado para los Toros de Tijuana (LMB).\n"
        "Tu objetivo es asistir a directivos y analistas respondiendo consultas con los datos reales de la temporada.\n\n"
        "PRINCIPIOS Y REGLAS ESTRICTAS:\n"
        "1. NUNCA calcules ni inventes cifras por tu cuenta. Siempre ejecuta las herramientas fijas disponibles para consultar datos.\n"
        "2. Si el usuario realiza una pregunta para la que no existe herramienta disponible, explícalo con honestidad y cortesía sin estimar ni adivinar.\n"
        "3. Prohibido intentar generar o ejecutar sentencias SQL arbitrarias.\n"
        "4. CORTESÍAS: Los boletos de cortesía (es_cortesia = 1) NUNCA se suman a los boletos pagados en métricas de ingreso o ticket promedio.\n"
        "5. MONEDA: Todas las cifras monetarias están expresadas en Pesos Mexicanos (MXN). Exprésalas siempre con formato de moneda.\n"
        "6. INGRESO NETO: La base de datos no contiene comisiones de boletera, deducciones operativas ni impuestos. Por tanto, el INGRESO NETO NO PUEDE CALCULARSE. Si se pregunta por ingreso neto, declara explícitamente esta limitación.\n"
        "7. IDIOMA Y ESTILO: Responde siempre en español, de forma analítica, ejecutiva, estructurada y profesional."
    )

    history = []
    if req.historial:
        for msg in req.historial[-8:]:
            role = "user" if msg.rol.lower() in ("user", "usuario") else "model"
            history.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=msg.texto)]
            ))

    current_prompt = f"[Temporada ID activa: {req.temporada_id}]\nPregunta: {pregunta}"

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.2,
        tools=AVAILABLE_TOOLS
    )

    try:
        chat = client.chats.create(
            model=model_name,
            config=config,
            history=history
        )

        response = chat.send_message(current_prompt)

        herramientas_usadas = []
        for h in chat.get_history():
            for part in getattr(h, "parts", []):
                if getattr(part, "function_call", None):
                    herramientas_usadas.append({
                        "nombre": part.function_call.name,
                        "argumentos": getattr(part.function_call, "args", {})
                    })

        return {
            "status": "success",
            "respuesta": response.text or "No se pudo generar una respuesta explicativa.",
            "herramientas_usadas": herramientas_usadas,
            "modelo": model_name
        }

    except APIError as e:
        status_code = 429 if getattr(e, "code", None) == 429 else 503
        raise HTTPException(
            status_code=status_code,
            detail=f"Error en el servicio de Gemini: {getattr(e, 'message', str(e))}"
        )
    except Exception as e:
        err_msg = str(e)
        if "getaddrinfo" in err_msg.lower() or "connecterror" in err_msg.lower() or "timeout" in err_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="No se pudo establecer conexión con los servidores de Google Gemini. Verifica tu conexión de red o reintenta en unos momentos."
            )
        raise HTTPException(
            status_code=500,
            detail=f"Error procesando la consulta con el Asistente IA: {err_msg}"
        )

MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB max

@app.post("/api/cargas/upload")
async def upload_csv_file(
    temporada_id: Optional[int] = Form(None), 
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not temporada_id or temporada_id <= 0:
        temporada_id = get_or_create_temporada("Temporada 2026", 2026)

    # 1. Validate file extension and sanitize display name (path traversal prevention)
    raw_filename = file.filename or ""
    safe_filename = Path(raw_filename).name
    if not safe_filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos con extensión .csv")

    # 2. Secure temporary filename to avoid path traversal
    upload_dir = Path(__file__).resolve().parent / "uploads"
    upload_dir.mkdir(exist_ok=True)
    temp_path = upload_dir / f"secure_{uuid.uuid4().hex}.csv"

    # 3. Stream file and enforce maximum size
    total_bytes = 0
    try:
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413, 
                        detail=f"El archivo excede el tamaño máximo permitido ({MAX_UPLOAD_SIZE // (1024*1024)} MB)"
                    )
                buffer.write(chunk)

        result = load_csv_file(str(temp_path), temporada_id)

        # Update filename in cargas log to clean display name
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE cargas SET nombre_archivo = ? WHERE id = ?", (safe_filename, result["carga_id"]))
        conn.commit()
        conn.close()
        invalidate_all_cache()

        return {
            "status": "success",
            "result": result,
            "message": f"Archivo {safe_filename} procesado exitosamente."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando CSV: {str(e)}")
    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass
