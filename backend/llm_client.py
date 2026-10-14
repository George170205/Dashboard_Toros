"""
Cliente de Google Gemini utilizando el SDK oficial moderno `google-genai`.
"""

import os
from typing import Optional
from google import genai

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

class GeminiNotConfiguredError(Exception):
    """Excepción cuando GEMINI_API_KEY no está presente en el entorno."""
    pass

def get_gemini_client() -> genai.Client:
    """
    Inicializa y devuelve una instancia del cliente oficial de Google Gemini.
    Si GEMINI_API_KEY no está configurada, lanza GeminiNotConfiguredError.
    """
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise GeminiNotConfiguredError(
            "Asistente no configurado: falta GEMINI_API_KEY en variables de entorno."
        )
    return genai.Client(api_key=api_key)

def get_gemini_model_name() -> str:
    """Devuelve el nombre del modelo configurado."""
    return os.getenv("GEMINI_MODEL", GEMINI_MODEL)
