import re
from datetime import datetime
from typing import Dict, List, Tuple, Any

def parse_amount(val: str) -> float:
    if not val:
        return 0.0
    val = val.strip().replace('$', '').strip()
    if val == '-' or not val:
        return 0.0
    # In these CSVs: 70,00 -> 70.00; 8.422.450,00 -> 8422450.00
    val = val.replace('.', '').replace(',', '.')
    try:
        return float(val)
    except ValueError:
        return 0.0

def parse_date(date_str: str) -> str:
    """Parses '29/05/26 21:16' to '2026-05-29 21:16:00'"""
    if not date_str or date_str.strip() in ('-', '31/12/69', '31/12/69 00:00'):
        return ""
    date_str = date_str.strip()
    try:
        if len(date_str) == 8: # '24/04/26'
            dt = datetime.strptime(date_str, "%d/%m/%y")
            return dt.strftime("%Y-%m-%d")
        elif len(date_str) >= 14: # '29/05/26 21:16'
            dt = datetime.strptime(date_str[:14], "%d/%m/%y %H:%M")
            return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        pass
    return date_str

def normalize_canal(medio: str) -> str:
    m = (medio or "").lower().strip()
    if not m or m == '-':
        return "Desconocido"
    if "taquilla" in m:
        return "Taquilla"
    if "android" in m:
        return "App Android"
    if "ios" in m:
        return "App iOS"
    if "ticketmatch" in m:
        return "Ticketmatch"
    if "desktop" in m or "boletomovil" in m:
        return "Web Boletomóvil"
    if "mobile" in m:
        return "Web Móvil"
    return medio.strip()

def normalize_zona(zona: str) -> str:
    if not zona:
        return "General"
    z = zona.strip()
    # Add space before CamelCase like Superior1raBase -> Superior 1ra Base
    z = re.sub(r'([a-z])([A-Z0-9])', r'\1 \2', z)
    z = re.sub(r'([0-9])([A-Za-z])', r'\1 \2', z)
    return z

def parse_event_details(event_name: str) -> Dict[str, str]:
    """Extracts fase, serie, jornada, rival and tipo from event name"""
    tipo = "Paquete" if "paquete" in event_name.lower() else "Juego"
    fase = "Temporada Regular"
    
    if "serie del rey" in event_name.lower():
        fase = "Serie del Rey"
    elif "serie de campeonato" in event_name.lower():
        fase = "Serie de Campeonato"
    elif "serie de zona" in event_name.lower():
        fase = "Serie de Zona"
    elif "playoff" in event_name.lower():
        fase = "Playoffs"
        
    jornada = "J1"
    if "juego inaugural" in event_name.lower():
        jornada = "Juego Inaugural"
    else:
        m = re.search(r'\b(J[0-9]+)\b', event_name, re.IGNORECASE)
        if m:
            jornada = m.group(1).upper()
            
    rival = "Rival"
    m_rival = re.search(r'([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]+)\s+vs\s+Toros', event_name, re.IGNORECASE)
    if m_rival:
        raw_rival = m_rival.group(1).strip()
        # Clean prefix if it has "J1: Sultanes" or "Serie de Zona | Charros"
        if ":" in raw_rival:
            raw_rival = raw_rival.split(":")[-1].strip()
        if "|" in raw_rival:
            raw_rival = raw_rival.split("|")[-1].strip()
        rival = raw_rival.strip()
        
    return {
        "fase": fase,
        "serie": f"{rival} vs Toros",
        "jornada": jornada,
        "rival": rival,
        "tipo": tipo
    }

class CSVFileScanner:
    """Scans and parses the custom CSV format with FILTROS APLICADOS catalog"""
    def __init__(self, filepath_or_stream):
        self.source = filepath_or_stream

    def scan_event_catalog(self) -> List[Tuple[str, str]]:
        """Scans the bottom FILTROS APLICADOS section for event name and match date"""
        events = []
        in_filtros = False
        totales_found = False

        if isinstance(self.source, str):
            f = open(self.source, 'r', encoding='utf-8-sig', errors='replace')
        else:
            self.source.seek(0)
            f = self.source

        try:
            for line in f:
                if 'TOTALES;' in line:
                    totales_found = True
                if totales_found and 'FILTROS APLICADOS' in line:
                    in_filtros = True
                    continue
                if in_filtros:
                    parts = line.strip().split(';')
                    if len(parts) >= 2:
                        ev_name = parts[0].strip()
                        ev_date = parts[1].strip()
                        if ev_name and ev_date and ev_name != 'EVENTOS':
                            parsed_date = parse_date(ev_date)
                            events.append((ev_name, parsed_date))
        finally:
            if isinstance(self.source, str):
                f.close()
            else:
                self.source.seek(0)
        return events

    def parse_tickets(self, event_dates_map: Dict[str, List[str]], on_progress=None):
        """
        Yields validated ticket rows.
        event_dates_map maps event_name -> list of match dates (YYYY-MM-DD)
        """
        if isinstance(self.source, str):
            f = open(self.source, 'r', encoding='utf-8-sig', errors='replace')
        else:
            self.source.seek(0)
            f = self.source

        line_idx = 0
        try:
            # Skip title (1) and empty (2)
            f.readline()
            f.readline()
            header_line = f.readline()
            line_idx = 3

            for line in f:
                line_idx += 1
                if not line.strip() or line.startswith('TOTALES;') or line.startswith(';;;;'):
                    if line.startswith('TOTALES;'):
                        break
                    continue

                parts = line.rstrip('\r\n').split(';')
                if len(parts) < 16:
                    continue

                # Columns mapping based on schema:
                # 0: NUMERO DE ORDEN
                # 1: CODIGO DE COMPRA
                # 2: EVENTO
                # 3: FECHA
                # 4: VENDIDO POR
                # 5: TIPO
                # 6: ZONA
                # 7: SECCION
                # 8: ASIENTO
                # 9: MEDIO DE COMPRA
                # 10: METODO DE PAGO
                # 11: PRECIO
                # 12: DESCUENTO
                # 13: SUBTOTAL
                # 14: COMISION
                # 15: TOTAL
                orden = parts[0].strip()
                codigo_compra = parts[1].strip()
                evento = parts[2].strip()
                fecha_venta_raw = parts[3].strip()
                vendido_por = parts[4].strip()
                tipo_boleto = parts[5].strip()
                zona = parts[6].strip()
                seccion = parts[7].strip()
                asiento = parts[8].strip()
                medio_compra = parts[9].strip()
                metodo_pago = parts[10].strip()
                
                precio = parse_amount(parts[11])
                descuento = parse_amount(parts[12])
                subtotal = parse_amount(parts[13])
                comision = parse_amount(parts[14])
                total = parse_amount(parts[15])

                # Arithmetic validation
                arithmetic_valid = (
                    abs((precio - descuento) - subtotal) < 0.05 and
                    abs((subtotal + comision) - total) < 0.05
                )

                fecha_venta = parse_date(fecha_venta_raw)

                # Disambiguate match date from catalog
                fecha_partido = ""
                dates_for_ev = event_dates_map.get(evento, [])
                if len(dates_for_ev) == 1:
                    fecha_partido = dates_for_ev[0]
                elif len(dates_for_ev) > 1:
                    # Sort dates
                    sorted_dates = sorted(dates_for_ev)
                    first_game = sorted_dates[0]
                    # Rule: sales after the first game date belong to the subsequent game
                    if fecha_venta and fecha_venta[:10] > first_game:
                        fecha_partido = sorted_dates[1]
                    else:
                        fecha_partido = first_game
                else:
                    # Fallback to sales date if not found in catalog
                    fecha_partido = fecha_venta[:10] if fecha_venta else ""

                # Cortesía rule: total == 0 or explicit courtesy type
                tipo_lower = tipo_boleto.lower()
                is_cortesia_name = any(k in tipo_lower for k in ('cortesía', 'cortesia', 'damas', 'canje'))
                es_cortesia = 1 if (total == 0.0 or is_cortesia_name) else 0

                canal_norm = normalize_canal(medio_compra)
                zona_norm = normalize_zona(zona)

                yield {
                    "line_idx": line_idx,
                    "orden": orden,
                    "codigo_compra": codigo_compra,
                    "evento": evento,
                    "fecha_venta": fecha_venta,
                    "fecha_partido": fecha_partido,
                    "vendido_por": vendido_por,
                    "tipo_boleto": tipo_boleto,
                    "es_cortesia": es_cortesia,
                    "zona": zona_norm,
                    "seccion": seccion,
                    "asiento": asiento,
                    "medio_compra": medio_compra,
                    "canal_normalizado": canal_norm,
                    "metodo_pago": metodo_pago,
                    "precio": precio,
                    "descuento": descuento,
                    "subtotal": subtotal,
                    "comision": comision,
                    "total": total,
                    "arithmetic_valid": arithmetic_valid
                }
        finally:
            if isinstance(self.source, str):
                f.close()
