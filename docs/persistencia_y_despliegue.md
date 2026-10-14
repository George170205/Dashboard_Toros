# Persistencia de Datos y Estrategia de Despliegue en Render

## 1. Diagnóstico del Riesgo: Almacenamiento Efímero
En las instancias de servicio web estándar y gratuitas de Render, el contenedor opera con un sistema de archivos efímero (ephemeral storage). Esto implica:
- Cada nuevo despliegue (`redeploy`), reinicio manual o recuperación tras inactividad sustituye el contenedor por una imagen limpia.
- El archivo local `toros_dashboard.db` se reinicializa en cada reinicio.
- Aunque el script de inicio (`startup_event`) contiene un auto-seed que recarga los 3 CSVs iniciales de la Temporada 2026, **cualquier nueva temporada creada por el usuario o cualquier carga de CSVs efectuada a través de la interfaz web se pierde si no hay persistencia**.

---

## 2. Solución Inmediata: Disco Persistente en Render (Render Disk)
Se ha actualizado [`render.yaml`](../render.yaml) para montar un disco persistente dedicado:
```yaml
disk:
  name: toros-data
  mountPath: /var/data
  sizeGB: 1
envVars:
  - key: SQLITE_DB_PATH
    value: /var/data/toros_dashboard.db
```
- **Comportamiento:** En producción (Render), SQLite almacena la base de datos en `/var/data/toros_dashboard.db`. Los datos persisten a través de todos los redeploys y reinicios.
- **En entorno local:** Al no estar definida la variable `SQLITE_DB_PATH`, el backend utiliza automáticamente la ruta por defecto `backend/toros_dashboard.db`.

---

## 3. Hoja de Ruta: Migración a PostgreSQL
Para soportar concurrencia alta, múltiples réplicas del servidor web y copias de seguridad continuas gestionadas, se proyecta la migración a PostgreSQL:

1. **Aprovisionamiento:**
   - Crear una base de datos PostgreSQL en Render, Neon o Supabase.
   - Definir la variable de entorno `DATABASE_URL` en el dashboard de Render.
2. **Compatibilidad en Backend:**
   - Usar `psycopg2-binary` o SQLAlchemy como capa de abstracción.
   - Migrar la sentencia `INSERT OR IGNORE` de SQLite a `INSERT ... ON CONFLICT DO NOTHING` de PostgreSQL.
3. **Migración de Datos:**
   - Exportar los registros de temporadas, eventos, cargas y ventas desde SQLite usando un script de volcado (`pgloader` o script Python de transferencia).
