"""
Script para listar los modelos disponibles en la cuenta de Google Gemini API
utilizando el SDK oficial `google-genai` y la clave GEMINI_API_KEY.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai

# Cargar .env si existe
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

api_key = os.getenv("GEMINI_API_KEY", "").strip()

if not api_key:
    print("ERROR: GEMINI_API_KEY no encontrada en el entorno ni en backend/.env")
    exit(1)

print(f"Iniciando consulta de modelos con GEMINI_API_KEY (prefijo: {api_key[:8]}...)...")

try:
    client = genai.Client(api_key=api_key)
    models = list(client.models.list())
    
    print("\n" + "=" * 70)
    print("MODELOS DISPONIBLES EN TU PROYECTO / API KEY:")
    print("=" * 70)

    content_models = []
    for m in models:
        # Extraer nombre limpio (ej. gemini-2.0-flash o gemini-2.5-flash)
        raw_name = m.name or ""
        clean_name = raw_name.replace("models/", "")
        methods = getattr(m, "supported_generation_methods", []) or []
        
        # Filtrar modelos de texto/chat (generateContent)
        is_content = (
            not methods or 
            "generateContent" in methods or 
            "generate_content" in [str(x).lower() for x in methods]
        )
        
        if is_content:
            content_models.append((clean_name, raw_name, methods))

    print(f"Total modelos encontrados: {len(models)}")
    print(f"Modelos compatibles con generateContent: {len(content_models)}\n")

    for clean_name, raw_name, methods in sorted(content_models, key=lambda x: x[0]):
        methods_str = ", ".join(methods) if methods else "generateContent (estándar)"
        print(f"  • {clean_name}")
        print(f"    Ruta: {raw_name}")
        print(f"    Métodos soportados: {methods_str}")
        print("-" * 50)

except Exception as e:
    print(f"ERROR consultando la API de Gemini: {e}")
