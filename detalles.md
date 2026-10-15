Contexto: repo Dashboard_Toros (React+Vite en Vercel, FastAPI+SQLite en Render, asistente IA con Gemini y function calling en backend/tools.py). Lee plan_trabajo_dashboard_ventas.md y README.md antes de tocar código.

Reglas:
- Haz SOLO lo que pide esta fase; no refactorices nada más.
- Cortesías y pagados nunca se suman en ingreso ni ticket promedio.
- No guardes datos personales (nombre, correo, teléfono) en la base ni en el repo.
- Antes de editar, dime qué archivos vas a modificar. Al terminar, resume cambios y cómo probarlos.
- No inventes cifras ni valores fijos: si algo no se puede calcular con los datos, dímelo.

Cómo trabajar con este archivo: ejecuta ÚNICAMENTE la fase que yo te indique en mi mensaje (por ejemplo "Ejecuta la Fase 1"). No empieces la siguiente aunque parezca relacionada. Al terminar, detente, resume los cambios y espera mi confirmación. Si una fase depende de cambios de otra anterior, adapta tu código a cómo quedó el repo en ese momento, no a como estaba al inicio.

Orden de ejecución recomendado: Fase 0, Fase 1, Fase 2, Fase 3, Fase 5, Fase 6, Fase 7,Fase 7B,Fase 4.

# Fase 0 Modelos de Gemini (que el chat funcione)

Tareas:
1. No asumas que existen gemini-3.8-flash ni gemini-3.5-flash. Escribe un script (backend/list_models.py) que liste los modelos disponibles con client.models.list() usando mi GEMINI_API_KEY.
2. Ajusta GEMINI_MODEL (valor por defecto en llm_client.py y .env.example) y la lista de modelos de respaldo en main.py con modelos que sí existan y soporten generateContent y function calling.
3. Actualiza el texto del badge "Gemini 3.8 Flash" en AiAssistantView.jsx para que muestre el modelo real que respondió (el backend ya devuelve el campo "modelo").
4. Prueba: haz una pregunta simple en el Asistente IA y confirma que responde.

# Fase 1 Cifras correctas

Problema: backend/main.py (get_dashboard_data) y tools.py (top_eventos) agrupan por evento_nombre. Pero un mismo nombre (ej. "J1: Sultanes vs Toros") corresponde a DOS partidos con distinta fecha_partido. Hoy se fusionan.

Tareas:
1. Agrupar eventos por (evento_nombre, fecha_partido) en el dashboard, en top_eventos y en los sparklines. Ajusta EventsTable.jsx para que la key y el toggleSelect usen nombre+fecha, no solo nombre.
2. total_eventos debe contar partidos distintos (nombre+fecha_partido) y EXCLUIR eventos con tipo = 'Paquete'. Corrige el cálculo de aforo con eso.
3. Haz la capacidad del estadio configurable por variable de entorno STADIUM_CAPACITY (default 17000) en lugar de fija en el código.
4. En el frontend elimina valores inventados: la barra de boletos con 12000 fijo (usa el máximo real de pagados entre los eventos), el fallback aforo 44.8, el color verde/rojo por "isEven" en los sparklines (calcula verde/rojo según si la curva sube o baja realmente), las mini-barras decorativas de KpiCards y el texto fijo "335,233 boletos" del Header (alimenta esas notificaciones desde los datos reales o quítalas).
5. Cambia la etiqueta "del aforo emitido" para aclarar que el aforo incluye cortesías, o calcula aforo solo con pagados y muéstralo por separado.

Pruebas (Fase 1):
- Los KPIs globales NO deben cambiar: 281,138 boletos pagados, 54,095 cortesías, 335,233 boletos totales, ingreso $82,041,921, ticket promedio $291.82.
- Sí deben cambiar: la cantidad de partidos (hoy dice 54; no debe incluir paquetes), el aforo y las filas de eventos que antes se fusionaban.
- Los paquetes (ej. "Paquete Acereros vs Toros") se siguen mostrando en la tabla con su badge, pero no cuentan como partido ni en el aforo.

# Fase 2 Seguridad

Antes de desplegar esta fase, estas variables deben estar configuradas en Render: JWT_SECRET y DEFAULT_ADMIN_PASSWORD (si no, la app no arranca por el punto 1).

Tareas en backend/ y README.md:
1. main.py: elimina el valor por defecto de JWT_SECRET. Si falta la variable y ENVIRONMENT es production, la app debe fallar al iniciar con un mensaje claro.
2. database.py: no uses una contraseña por defecto conocida. Lee DEFAULT_ADMIN_PASSWORD de entorno y, si no existe, genera una aleatoria y muéstrala una sola vez en logs al sembrar usuarios.
3. Los usuarios que ya existen en la base conservan el hash de la contraseña anterior ("toros2026"), así que el cambio del punto 2 no los afecta. Crea un script (backend/rotate_passwords.py) que asigne contraseñas nuevas a los usuarios existentes, tomadas de variables de entorno o generadas y mostradas una sola vez.
4. README.md: quita las credenciales y la tabla de usuarios; deja solo la instrucción de configurarlas por variables de entorno.
5. Control por rol: solo "Administrador General" y "Director / Administrador" pueden borrar temporadas, resetear datos, recargar iniciales y subir CSV. Los demás roles solo lectura. Crea una dependencia require_admin en FastAPI y úsala en esos endpoints; oculta esos botones en el frontend según el rol.
6. Dime si backend/uploads/ o la carpeta csvs/ están versionadas en git y qué archivos con datos personales podrían estar en el historial. No reescribas el historial: solo repórtalo.

# Fase 3 Rendimiento y Despliegue

Tareas:
1. Chat: en /api/chat usa client.aio (versión async del SDK google-genai) o convierte el endpoint a def normal para no bloquear el event loop. Mantén reintentos y modelos de respaldo.
2. Carga de CSV: /api/cargas/upload debe guardar el archivo, crear la carga con estado 'procesando' y ejecutar load_csv_file en segundo plano (BackgroundTasks o threadpool). Agrega endpoint GET /api/cargas/{id}/estado y haz que CargasView.jsx muestre progreso consultándolo cada 2 segundos. Agrega columnas estado y progreso a la tabla cargas con migración segura (ALTER TABLE si no existen).
3. Reemplaza @app.on_event("startup") por lifespan. El auto-seed desde csvs/ solo debe correr si existe la carpeta y la variable AUTO_SEED=true.
4. Documenta en el README que en Render SQLite necesita Persistent Disk montado y SQLITE_DB_PATH apuntando a él, o propón migrar a PostgreSQL.

# Fase 4 Pendientes de Negocio y docs

Tareas:
1. Comparativa: además de KPIs por temporada, agrega comparación temporada regular por jornada (J1, J2...) y postemporada por fase (Serie de Zona, Campeonato, Rey), según Fase 3 del plan de trabajo. Endpoint nuevo y tabla en ComparativaView.jsx.
2. Paquetes: no cambies la lógica todavía. Genera un reporte de cuántas filas con tipo 'Paquete' existen y cómo se ven, para decidir cómo registrarlos sin duplicar ingresos.
3. README: alinea con el código real (parámetros de tools.py, índices existentes, usuarios y variables de entorno nuevas, herramientas nuevas del asistente).

# Fase 5: Responsive móvil

Depende de la Fase 1 (ambas tocan EventsTable.jsx): adapta tu código a cómo quedó ese archivo.

Problema (se ve en el teléfono): en pantallas angostas, la tabla "Ventas por Partido & Evento" hace que toda la página se ensanche. Las tarjetas y la tabla miden casi el doble que el header sticky, y el navegador achica todo. Causa: .dashboard-grid-2-1 usa "1fr", que no puede ser menor que el contenido mínimo de sus hijos, y la tabla (8 columnas) lo fuerza a crecer. El overflow-x de .table-responsive nunca se activa.

Tareas:
1. Contención del ancho (index.css):
   - Cambia las columnas de .dashboard-grid-2-1 a minmax(0, 1fr) (en escritorio: minmax(0, 2fr) minmax(0, 1fr)).
   - Agrega min-width: 0 a .content-card y a los hijos directos de las grids.
   - Verifica que ningún elemento haga scroll horizontal de toda la página en 360, 390 y 768 px de ancho.

2. Vista compacta de la tabla en móvil (EventsTable.jsx, ≤768px):
   - Dentro de la tarjeta, al mismo ancho que las demás, muestra solo: Evento/Partido (con badge de fase y fecha debajo), Boletos Pagados y Total Ingreso. Oculta Sel, Cortesías, Tendencia y Ticket Prom. en esta vista.
   - Evita que el nombre del evento se parta en 4 líneas: usa texto más pequeño y máximo 2 líneas con ellipsis.
   - Agrega un botón visible "Ver tabla completa" (ícono Maximize2 de lucide-react) en el encabezado de la tarjeta.

3. Vista expandida a pantalla completa:
   - Al presionar el botón (o una fila), abre un overlay position: fixed; inset: 0 con fondo blanco, barra superior con título, botón de cerrar (X) y los filtros Todos/Regular/Playoffs.
   - Dentro del overlay muestra la tabla completa con TODAS las columnas, con scroll horizontal y scroll vertical propios, encabezado sticky y la primera columna (evento) fija a la izquierda.
   - Sin el límite de 15 filas en esta vista (usa scroll o paginación de 50).
   - Bloquea el scroll del body mientras está abierto y ciérralo con el botón o la tecla Escape.
   - En escritorio, el botón también puede abrir la misma vista expandida.

4. Otras vistas con el mismo problema (usan estilos inline que los media queries no alcanzan). Pásalos a clases CSS con media queries:
   - CanalesView.jsx: la grid "1fr 1fr" de Zonas y Tipos de Boleto debe apilarse en una columna en ≤768px.
   - ComparativaView.jsx: la grid repeat(4, 1fr) de métricas debe ser 2 columnas en tablet y 1 en móvil; los dos selectores de temporada deben apilarse.
   - CargasView.jsx: la tabla de historial debe quedar contenida con scroll horizontal propio.

5. No cambies lógica de datos ni endpoints. Solo layout, CSS y el componente de la vista expandida.

Criterio de aceptación: a 390 px de ancho el header, las tarjetas KPI, la gráfica, el medidor y la tabla compacta tienen el mismo ancho, y la página no tiene scroll horizontal.

# Fase 6: Herramientas y Gráficas

Depende de la Fase 1 (agrupación por partido), la Fase 3 (endpoint de chat async) y la Fase 5 (gráfica responsive): adapta tu código a cómo quedó el repo.

Problema: en el Asistente IA, la pregunta "cantidad de boletos vendidos entre julio y agosto, qué porcentaje representan, y una gráfica de ventas vs cortesías de esas fechas" fue rechazada porque (a) ninguna herramienta de backend/tools.py filtra por rango de fechas y (b) el chat solo renderiza markdown, no gráficas.

Reglas que se mantienen: cero text-to-SQL libre; solo herramientas Python tipadas y parametrizadas; cortesías y pagados siempre como series separadas, nunca sumadas en ingreso ni ticket promedio; cifras en MXN; el modelo nunca inventa ni calcula datos de la gráfica.

Antes de empezar, ejecuta una vez: SELECT MIN(fecha_venta), MAX(fecha_venta), MIN(fecha_partido), MAX(fecha_partido) FROM ventas, y dime los rangos reales de datos.

Tareas:
1. backend/tools.py: crea ventas_por_periodo(temporada_id: int, fecha_inicio: str, fecha_fin: str, base_fecha: str = "venta", agrupar_por: str = "semana").
   - fecha_inicio y fecha_fin en formato YYYY-MM-DD; valida con datetime.strptime. Si son inválidas o inicio > fin, devuelve {"error": "mensaje claro"} sin lanzar excepción.
   - base_fecha: "venta" filtra por substr(fecha_venta,1,10); "partido" filtra por fecha_partido. Rechaza otros valores.
   - agrupar_por: "dia", "semana", "mes" o "total".
   - Devuelve: boletos_pagados, boletos_cortesias, total_emitidos, ingreso_bruto_mxn (solo pagados), ticket_promedio_mxn (solo pagados), porcentaje_cortesias_del_periodo, y porcentaje_del_total_de_temporada para pagados, cortesías e ingreso (calculado en SQL/Python, no por el modelo). Incluye también una serie por periodo.
   - Un periodo sin datos devuelve ceros, no error.
2. Cada herramienta con series devuelve además una clave "grafica": {"tipo": "barras_agrupadas" | "linea", "titulo": str, "eje_x": [...], "series": [{"nombre": "Boletos pagados", "valores": [...]}, {"nombre": "Cortesías", "valores": [...]}], "unidad": "boletos" | "MXN"}.
3. backend/main.py (/api/chat): adapta esto a cómo quedó el endpoint tras la Fase 3. Tras la respuesta, recorre el historial del chat (chat_used.get_history() o su equivalente en client.aio), extrae la clave "grafica" de las function_response y devuélvela en un campo nuevo "graficas" (máximo 3). El modelo nunca construye los datos de la gráfica.
4. Frontend: crea components/ChatChart.jsx en SVG puro, sin dependencias nuevas, con el estilo de SalesAnalyticsChart.jsx. Soporta barras agrupadas y líneas, leyenda, tooltip al pasar o tocar, viewBox con width 100% (que respete lo de la Fase 5 en móvil). Colores: pagados #0ac282, cortesías #fe5d70. En AiAssistantView.jsx renderiza msg.graficas debajo del texto del mensaje y guárdalas en el estado del mensaje.
5. System prompt del chat:
   - Para cualquier pregunta con fechas o meses, usa ventas_por_periodo.
   - Si el usuario dice "vendidos entre X y Y" sin aclarar, asume base_fecha="venta", dilo en una línea y ofrece repetirlo por fecha de partido.
   - El año por defecto es el de la temporada activa.
   - Si no hay herramienta para una pregunta, no digas "no tengo herramientas instaladas": explica en lenguaje simple qué sí puede consultar y propón la pregunta más cercana.
6. Herramientas opcionales, en este orden, cada una con parámetros validados y límite de filas: ventas_por_tipo_boleto, cortesias_por_solicitante (por vendido_por), comparar_temporadas (usando la lógica de /api/comparativa), detalle_evento (por rival y fecha_partido), ventas_por_dia_semana.
7. Agrega un chip de pregunta sugerida: "Ventas vs cortesías por mes".

Pruebas:
- La pregunta original de julio-agosto con la Temporada 2026: compara los números con una consulta manual en SQLite.
- Un rango sin ventas devuelve ceros sin romper.
- Una fecha inválida devuelve un mensaje amable.
- La gráfica se ve completa a 390 px de ancho.

# Fase 7: Historial de conversaciones por usuario

Depende de la Fase 3 (persistencia en disco y endpoint de chat async), la Fase 5 (responsive) y la Fase 6 (gráficas del chat): adapta tu código a cómo quedó el repo.

Problema: al refrescar la página, el Asistente IA pierde la conversación completa, incluidas las gráficas. El sistema lo usan ~5 personas y cada una debe tener su propio historial, privado.

Reglas: cada usuario solo puede leer, renombrar o borrar SUS conversaciones; el filtro se hace en el backend con el id del usuario del token JWT, nunca con datos enviados por el cliente. Una conversación ajena responde 404. No guardes datos personales de clientes (nombre, correo, teléfono).

Tareas:
1. backend/database.py: tablas nuevas con migración segura (CREATE TABLE IF NOT EXISTS):
   - conversaciones(id, usuario_id, titulo, temporada_id, fecha_creacion, fecha_actualizacion)
   - mensajes(id, conversacion_id, rol, texto, herramientas_json, graficas_json, modelo, fecha_creacion)
   - Índices por (usuario_id, fecha_actualizacion) y por conversacion_id. Activa ON DELETE CASCADE de mensajes y verifica que PRAGMA foreign_keys esté activo en esa conexión.
2. Endpoints (todos con get_current_user):
   - GET /api/conversaciones: lista las del usuario, más recientes primero, con paginación.
   - POST /api/conversaciones: crea una vacía (opcionalmente con temporada_id).
   - GET /api/conversaciones/{id}: devuelve la conversación con sus mensajes, gráficas incluidas.
   - PATCH /api/conversaciones/{id}: renombrar.
   - DELETE /api/conversaciones/{id}: borrar la conversación y sus mensajes.
3. /api/chat: acepta conversacion_id (si falta, crea una nueva). El backend carga los últimos 8 mensajes de la base para armar el historial de Gemini e ignora cualquier historial enviado por el cliente. Guarda la pregunta del usuario y la respuesta (texto, herramientas_usadas, graficas y modelo) en la base. Devuelve conversacion_id y el título. Si la llamada a Gemini falla, la pregunta del usuario queda guardada igualmente.
4. Título automático: toma los primeros ~60 caracteres de la primera pregunta, sin llamar a otro modelo.
5. Frontend (AiAssistantView.jsx):
   - Panel de conversaciones a la izquierda (en móvil, un cajón que se abre con un botón), con botón "Nueva conversación", título, fecha relativa, renombrar y borrar (borrar pide confirmación).
   - Al abrir la sección, carga la última conversación del usuario; al refrescar, se recupera completa con sus gráficas.
   - Cada gráfica muestra la fecha y hora en que se generó y la leyenda "Datos al momento de la consulta".
   - Sustituye el botón actual "Nueva Conversación" (que solo limpia el estado local) por el flujo nuevo.
6. Exportar: en cada gráfica, botón "Descargar CSV" generado en el navegador a partir de los datos guardados de la gráfica (BOM UTF-8 y separador ; para que Excel lo abra bien). No guardes archivos en el servidor.
7. Límites: máximo 200 conversaciones por usuario (avisa para borrar antiguas) y 100 mensajes por conversación (sugiere iniciar una nueva).
8. Al cerrar sesión, limpia del estado del navegador cualquier conversación cargada.

Pruebas:
- Haz una pregunta con gráfica, refresca la página y comprueba que todo reaparece igual.
- Con dos usuarios distintos, confirma que ninguno ve las conversaciones del otro y que pedir el id ajeno por API devuelve 404.
- Borrar una conversación elimina también sus mensajes.
- Una pregunta nueva en una conversación existente usa el contexto previo.
- Funciona a 390 px de ancho.
- Reinicia el backend: el historial sigue ahí (con el disco persistente de la Fase 3).

# Fase 7B: Compartir, revisión por administrador y detección de huecos

Depende de la Fase 2 (require_admin y roles), la Fase 6 (herramientas del chat) y la Fase 7 (historial por usuario): adapta tu código a cómo quedó el repo.

Reglas: la privacidad por defecto sigue igual (cada usuario solo ve lo suyo); todo acceso extra debe estar autorizado por el backend con el usuario del token, nunca por datos del cliente; no se crean links públicos.

Tareas:
1. Compartir (solo lectura, a usuarios concretos):
   - Tabla conversaciones_compartidas(id, conversacion_id, usuario_destino_id, fecha). Migración segura.
   - POST /api/conversaciones/{id}/compartir {usuario_id}, DELETE /api/conversaciones/{id}/compartir/{usuario_id} (revocar), GET /api/conversaciones/compartidas-conmigo.
   - GET /api/usuarios/directorio: devuelve solo id y nombre de los usuarios (sin correo ni username).
   - Solo el dueño comparte o revoca. El destinatario puede leer (con sus gráficas) pero no escribir en esa conversación.
   - Botón "Continuar en copia propia" que duplica la conversación en el historial del destinatario.
   - En el frontend: botón Compartir con selector de usuario, sección "Compartidas conmigo" en el panel de conversaciones y etiqueta "Compartida por X".
2. Revisión por administrador (solo lectura):
   - Permiso configurable por variable de entorno REVIEWER_ROLES (default: "Administrador General"), con una dependencia require_reviewer.
   - GET /api/admin/conversaciones (lista de todas: nombre de usuario, título, fecha, cantidad de mensajes, paginada) y GET /api/admin/conversaciones/{id} (solo lectura).
   - Tabla auditoria_accesos(id, revisor_id, conversacion_id, fecha). Cada lectura de una conversación ajena por este endpoint se registra.
   - Aviso visible y permanente en la pantalla del asistente: "Los administradores pueden revisar las conversaciones para mejorar el asistente."
3. Detección de huecos:
   - Nueva herramienta registrar_solicitud_sin_herramienta(resumen: str, motivo: str) en tools.py. Instruye en el system prompt: cuando no exista herramienta para responder, llámala UNA vez con un resumen breve y neutro (sin datos personales) y luego explica al usuario qué sí puede consultar.
   - Tabla solicitudes_sin_herramienta(id, usuario_id, conversacion_id, mensaje_id, resumen, motivo, fecha). La herramienta guarda en ella (el backend inyecta usuario_id y conversacion_id, no el modelo).
   - Registra también en esa tabla (motivo "error_herramienta") cuando una herramienta devuelve {"error": ...}.
4. Feedback: botones 👍/👎 en cada respuesta del asistente, guardados en mensajes.feedback (1, -1 o NULL) con endpoint PATCH /api/mensajes/{id}/feedback; solo el dueño de la conversación puede calificar.
5. Panel "Mejoras del asistente" (frontend, solo para revisores):
   - Preguntas sin herramienta, agrupadas por resumen normalizado (minúsculas, sin acentos) con conteo y fecha de la última vez.
   - Respuestas con 👎, con enlace para abrir la conversación en modo lectura.
   - Errores de herramientas más frecuentes.
   - Sin llamadas adicionales a Gemini para agrupar.
6. Oculta del frontend los elementos de revisión a quien no tenga el rol, y verifica también en el backend.

Pruebas:
- Un usuario sin permiso que pida /api/admin/... recibe 403.
- Un usuario que no es dueño no puede compartir ni revocar; el destinatario no puede escribir en la conversación compartida.
- Al revocar, la conversación desaparece de "Compartidas conmigo".
- Cada lectura de revisor queda en auditoria_accesos.
- Pregunta inexistente (por ejemplo, consumo de bebidas en el estadio): el asistente la declina con amabilidad y aparece en el panel de huecos.
- Todo funciona a 390 px de ancho.