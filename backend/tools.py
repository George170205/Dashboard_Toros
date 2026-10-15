"""
Herramientas de solo lectura para el Asistente IA de los Toros de Tijuana.
REGLAS ESTRICTAS:
1. Consultas fijas parametrizadas (prohibido text-to-SQL libre).
2. Cortesías (es_cortesia = 1) NUNCA se suman a ingresos ni ticket promedio.
3. Todas las cifras monetarias están expresadas en MXN.
4. El ingreso neto NO se puede calcular (la BD no contiene comisiones ni impuestos).
"""

from typing import Optional, List, Dict, Any
from database import get_connection

def obtener_kpis_temporada(temporada_id: int = 1) -> Dict[str, Any]:
    """
    Obtiene los indicadores clave de desempeño (KPIs) generales de una temporada.
    Retorna total de boletos pagados, boletos de cortesía, ingreso bruto total (MXN),
    ticket promedio pagado y total de órdenes registradas.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT 
        COUNT(*) as total_boletos,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso_bruto,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN 1 ELSE 0 END), 0) as boletos_pagados,
        COALESCE(SUM(CASE WHEN es_cortesia = 1 THEN 1 ELSE 0 END), 0) as boletos_cortesias,
        COALESCE(SUM(descuento), 0) as total_descuentos
    FROM ventas
    WHERE temporada_id = ?
    """, (temporada_id,))
    row = cursor.fetchone()

    cursor.execute("SELECT COUNT(DISTINCT orden) as total_ordenes FROM ventas WHERE temporada_id = ?", (temporada_id,))
    total_ordenes = cursor.fetchone()["total_ordenes"] or 0
    
    conn.close()

    boletos_pagados = row["boletos_pagados"] or 0
    ingreso_bruto = round(row["ingreso_bruto"] or 0, 2)
    ticket_promedio = round(ingreso_bruto / boletos_pagados, 2) if boletos_pagados > 0 else 0.0

    return {
        "temporada_id": temporada_id,
        "total_boletos_emitidos": row["total_boletos"] or 0,
        "boletos_pagados": boletos_pagados,
        "boletos_cortesias": row["boletos_cortesias"] or 0,
        "ingreso_bruto_mxn": ingreso_bruto,
        "ticket_promedio_pagado_mxn": ticket_promedio,
        "total_ordenes": total_ordenes,
        "descuentos_aplicados_mxn": round(row["total_descuentos"] or 0, 2),
        "nota_ingreso_neto": "El ingreso neto no puede calcularse porque la base de datos no contiene registro de comisiones ni impuestos."
    }

def ventas_por_zona(temporada_id: int = 1) -> List[Dict[str, Any]]:
    """
    Consulta las ventas agrupadas por zona del estadio para la temporada indicada.
    Retorna la lista de zonas ordenadas por mayor ingreso bruto recaudado, incluyendo
    boletos pagados, cortesías e ingreso en MXN.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        zona,
        COUNT(CASE WHEN es_cortesia = 0 THEN 1 END) as boletos_pagados,
        COUNT(CASE WHEN es_cortesia = 1 THEN 1 END) as boletos_cortesias,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso_bruto
    FROM ventas
    WHERE temporada_id = ?
    GROUP BY zona
    ORDER BY ingreso_bruto DESC
    """, (temporada_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        pagados = r["boletos_pagados"] or 0
        ingreso = round(r["ingreso_bruto"] or 0, 2)
        ticket_prom = round(ingreso / pagados, 2) if pagados > 0 else 0.0
        result.append({
            "zona": r["zona"] or "Sin Zona",
            "boletos_pagados": pagados,
            "boletos_cortesias": r["boletos_cortesias"] or 0,
            "ingreso_bruto_mxn": ingreso,
            "ticket_promedio_mxn": ticket_prom
        })
    return result

def top_eventos(temporada_id: int = 1, limite: int = 5) -> List[Dict[str, Any]]:
    """
    Obtiene los eventos o partidos con mayor recaudación para la temporada indicada.
    Parámetros:
        temporada_id: ID de la temporada activa.
        limite: Número máximo de eventos a devolver (por defecto 5, máximo 20).
    """
    limite_seguro = min(max(1, int(limite)), 20)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        v.evento_nombre,
        v.fecha_partido as fecha,
        COUNT(CASE WHEN v.es_cortesia = 0 THEN 1 END) as boletos_pagados,
        COUNT(CASE WHEN v.es_cortesia = 1 THEN 1 END) as boletos_cortesias,
        COALESCE(SUM(CASE WHEN v.es_cortesia = 0 THEN v.total ELSE 0 END), 0) as ingreso_bruto
    FROM ventas v
    WHERE v.temporada_id = ?
    GROUP BY v.evento_nombre, v.fecha_partido
    ORDER BY ingreso_bruto DESC
    LIMIT ?
    """, (temporada_id, limite_seguro))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        pagados = r["boletos_pagados"] or 0
        ingreso = round(r["ingreso_bruto"] or 0, 2)
        result.append({
            "evento": r["evento_nombre"],
            "fecha": r["fecha"] or "-",
            "boletos_pagados": pagados,
            "boletos_cortesias": r["boletos_cortesias"] or 0,
            "ingreso_bruto_mxn": ingreso,
            "ticket_promedio_mxn": round(ingreso / pagados, 2) if pagados > 0 else 0.0
        })
    return result

def ventas_por_canal(temporada_id: int = 1) -> List[Dict[str, Any]]:
    """
    Consulta las ventas agrupadas por canal de comercialización (ej. Taquilla, Web, Torobono).
    Retorna boletos pagados e ingresos en MXN.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT 
        canal_normalizado as canal,
        COUNT(CASE WHEN es_cortesia = 0 THEN 1 END) as boletos_pagados,
        COUNT(CASE WHEN es_cortesia = 1 THEN 1 END) as boletos_cortesias,
        COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso_bruto
    FROM ventas
    WHERE temporada_id = ?
    GROUP BY canal_normalizado
    ORDER BY ingreso_bruto DESC
    """, (temporada_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "canal": r["canal"] or "No especificado",
            "boletos_pagados": r["boletos_pagados"] or 0,
            "boletos_cortesias": r["boletos_cortesias"] or 0,
            "ingreso_bruto_mxn": round(r["ingreso_bruto"] or 0, 2)
        })
    return result

def simular_impacto_precio(temporada_id: int = 1, porcentaje_aumento: float = 0.0, zona: Optional[str] = None) -> Dict[str, Any]:
    """
    Simula el impacto en el ingreso bruto de incrementar o disminuir un porcentaje en el precio de los boletos pagados.
    Parámetros:
        temporada_id: ID de la temporada a evaluar.
        porcentaje_aumento: Porcentaje de incremento (ejemplo: 20 para +20%, -10 para -10%).
        zona: (Opcional) Filtrar por una zona específica, o null para todo el estadio.
    """
    conn = get_connection()
    cursor = conn.cursor()

    if zona:
        cursor.execute("""
        SELECT 
            COUNT(CASE WHEN es_cortesia = 0 THEN 1 END) as pagados,
            COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso_actual,
            COUNT(CASE WHEN es_cortesia = 1 THEN 1 END) as cortesias
        FROM ventas
        WHERE temporada_id = ? AND LOWER(zona) = LOWER(?)
        """, (temporada_id, zona.strip()))
    else:
        cursor.execute("""
        SELECT 
            COUNT(CASE WHEN es_cortesia = 0 THEN 1 END) as pagados,
            COALESCE(SUM(CASE WHEN es_cortesia = 0 THEN total ELSE 0 END), 0) as ingreso_actual,
            COUNT(CASE WHEN es_cortesia = 1 THEN 1 END) as cortesias
        FROM ventas
        WHERE temporada_id = ?
        """, (temporada_id,))
    row = cursor.fetchone()
    conn.close()

    pagados = row["pagados"] or 0
    cortesias = row["cortesias"] or 0
    ingreso_actual = round(row["ingreso_actual"] or 0, 2)
    factor = 1.0 + (porcentaje_aumento / 100.0)
    ingreso_proyectado = round(ingreso_actual * factor, 2)
    diferencia_bruta = round(ingreso_proyectado - ingreso_actual, 2)

    return {
        "temporada_id": temporada_id,
        "zona_evaluada": zona if zona else "Todo el Estadio",
        "porcentaje_aplicado": porcentaje_aumento,
        "boletos_pagados_afectados": pagados,
        "boletos_cortesias_no_afectados": cortesias,
        "ingreso_bruto_actual_mxn": ingreso_actual,
        "ingreso_bruto_proyectado_mxn": ingreso_proyectado,
        "diferencia_bruta_mxn": diferencia_bruta,
        "advertencia_ingreso_neto": (
            "AVISO IMPORTANTE: El ingreso NETO no puede calcularse debido a que la base de datos "
            "no registra costos operativos, impuestos (IVA/ISR) ni comisiones cobradas por la boletera."
        ),
        "supuesto_economico": (
            "Este cálculo asume una demanda inelástica (mismo volumen de venta de boletos). "
            "En la práctica, un aumento de precio puede reducir el volumen de boletos vendidos."
        )
    }

# Lista de funciones exportables como herramientas de Gemini
AVAILABLE_TOOLS = [
    obtener_kpis_temporada,
    ventas_por_zona,
    top_eventos,
    ventas_por_canal,
    simular_impacto_precio
]

TOOL_DISPATCHER = {
    "obtener_kpis_temporada": obtener_kpis_temporada,
    "ventas_por_zona": ventas_por_zona,
    "top_eventos": top_eventos,
    "ventas_por_canal": ventas_por_canal,
    "simular_impacto_precio": simular_impacto_precio
}
