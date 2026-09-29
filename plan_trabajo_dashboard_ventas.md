# Plan de trabajo: Dashboard de ventas por temporada

## 1. Objetivo

Construir un dashboard web que analice las ventas de boletos de un club deportivo y permita **comparar varias temporadas**.

- Cada temporada tiene su propia sección (Temporada 2026, Temporada 2027, etc.).
- Cargar una temporada nueva **no borra ni sobreescribe** las anteriores.
- Se puede comparar una temporada contra otra (por ejemplo 2027 vs 2026).

**Estado:** fase de planeación. Todavía no se programa nada.

## 2. Reglas de negocio acordadas

1. **Cortesías y boletos pagados son cosas distintas** y nunca se suman en un mismo indicador.
2. **Cortesía** incluye los tipos `Cortesía`, `Damas Gratis` y `Canje`. Se conserva el tipo original para poder desglosarlo.
3. **Pagado** incluye `Adulto`, `50% Niños`, `50% 3ra edad`, `Empresas 30%`, `Torogrill 10%`, `Acompañante` y `Upgrade`.
4. Regla de clasificación verificable en cada carga: **cortesía = total $0; pagado = total mayor a $0**. En la muestra analizada coincide exactamente (16,551 cortesías = 16,551 boletos con total $0).
5. Los indicadores de ingreso, ticket promedio y ventas por canal usan solo boletos pagados. Las cortesías se reportan aparte (volumen, evento, quién las solicitó).

## 3. Hallazgos de la auditoría de datos

Se auditó una muestra del primer archivo (43,629 boletos reales, 10,703 órdenes, ventas del 04/05 al 29/05 de 2026).

### Estructura de los CSV

- Fila 1: título del reporte. Fila 2: vacía. Fila 3: encabezados. Datos desde la fila 4.
- Al final: una fila `TOTALES` (solo trae guiones, **no sirve para validar**), una fila vacía y el bloque **`FILTROS APLICADOS`** con catálogo de eventos, fecha de cada partido, administradores y rango de fechas.
- Puede haber filas completamente vacías entre las ventas: el lector debe ignorarlas.
- `31/12/69` en FECHA INICIO y FECHA FIN es una fecha vacía (época Unix): no interpretarla como fecha real.

### Granularidad y llave única

- **Cada fila es un boleto**, no una orden (promedio de 4.08 boletos por orden).
- `Orden + Asiento` **no** es llave única (2,729 filas repiten esa combinación).
- `Orden + Evento + Zona + Sección + Asiento` **sí** es única (cero duplicados).
- El código de barras viene enmascarado y no sirve como llave.

### Validación aritmética

En el 100% de las filas: `Precio − Descuento = Subtotal` y `Subtotal + Comisión = Total`. La comisión es 0 en toda la muestra. Esta verificación sustituye a la fila TOTALES.

### Eventos

- Formatos de nombre: `J1: Rival vs Toros`, `Juego Inaugural: Rival vs Toros`, `Playoffs J1: ...`, `Serie de Zona | J1: ...`, `Serie de Campeonato | J1: ...`, `Serie del Rey | J6: ...`, `Paquete ... vs Toros`.
- **El nombre del evento no identifica un partido**: `J1: Sultanes vs Toros` corresponde a dos juegos (05/05 y 29/05).
- La fila de venta trae la **fecha de venta**, no la fecha del partido. La fecha del partido solo está en el catálogo del bloque final.
- Regla de desambiguación por fecha de venta: una venta posterior al primer juego solo puede pertenecer al segundo. En la muestra, 3,814 boletos son inequívocos y 2,633 son ambiguos (vendidos hasta el 05/05). La regla se apoya en que no hay asientos repetidos dentro del segundo grupo.
- No hay filas de paquetes en la muestra: **falta confirmar cómo se registran** (una fila por paquete o una por partido).

### Volumen

- Los tres archivos suman unas **275 mil filas** por temporada (aprox. 19 mil, 130 mil y 125 mil).
- Los archivos parecen cortes consecutivos por evento. Una serie puede quedar partida entre dos archivos.

### Canales, tipos y zonas

- `MEDIO DE COMPRA` trae 10 valores que son en realidad 5 o 6 canales (varias variantes de iOS, Android y web). Requiere tabla de equivalencias.
- `ZONA` trae 17 nombres con formato irregular (por ejemplo `Preferente3raBase`). Requiere catálogo.
- `TIPO` trae 10 valores (ver sección 2).
- Los vendedores mezclan personas, canales del sistema (`Venta en línea`), cuentas genéricas y usuarios deshabilitados.

### Datos personales

Nombre, correo y teléfono aparecen en los boletos comprados en línea, y hay algunos nombres en `CLIENTE`. **No se guardan en la base de datos**: se descartan durante la carga.

## 4. Modelo de datos propuesto

| Tabla | Contenido |
|---|---|
| `temporadas` | Año o nombre de la temporada |
| `cargas` | Archivo subido, fecha, temporada, filas nuevas, repetidas y con error |
| `eventos` | Temporada, nombre, fecha del partido, fase, serie, jornada, rival, tipo (juego o paquete) |
| `ventas` | Un boleto por fila: temporada, evento, orden, fecha de venta, zona, sección, asiento, canal normalizado, vendedor, tipo original, grupo (pagado o cortesía), precio, descuento, total |
| `catalogo_canales`, `catalogo_zonas`, `catalogo_vendedores` | Equivalencias de nombres |

Además se guardan **tablas de resumen** por evento, zona y canal para que el dashboard sea rápido.

## 5. Arquitectura y stack

| Capa | Opción | Nota |
|---|---|---|
| Frontend | React (Next.js o Vite) en Vercel | Estética basada en la plantilla de admin de referencia (barra lateral, tarjetas de KPI, gráficas), con paleta clara |
| Gráficas | ECharts o ApexCharts | Buen soporte para comparativas |
| Backend | FastAPI (Python + pandas) en Render | Procesa CSV por bloques |
| Base de datos | PostgreSQL | Verificar límites de almacenamiento y vigencia del plan gratuito (Render, Neon o Supabase) |
| Autenticación | Login simple (JWT o proveedor externo) | Un solo rol al inicio |

Restricciones técnicas a considerar:

- **La carga de archivos no pasa por Vercel** (límite pequeño de tamaño de petición en sus funciones; verificar el límite vigente). El frontend sube directo al backend en Render.
- Procesamiento **por bloques y en segundo plano**, con barra de progreso, por la memoria limitada de la instancia gratuita.
- El plan gratuito de Render suspende el servicio por inactividad: la primera petición puede tardar.

## 6. Fases de trabajo

### Fase 0. Auditoría de datos (en curso)
- Auditar los tres CSV completos (sin datos personales).
- **Entregable:** lista de eventos, filas ambiguas, tratamiento de paquetes, catálogos de canales y zonas.

### Fase 1. Lectura y limpieza del archivo
- Saltar título y filas vacías, detectar encabezados, cortar en TOTALES, leer el catálogo de eventos.
- Parsear montos (`$70,00`, `-` como cero) y fechas (`dd/mm/aa hh:mm`). Sección siempre como texto.
- Descartar datos personales. Normalizar canales y zonas. Clasificar pagado o cortesía.

### Fase 2. Modelo de datos y carga
- Crear el esquema (sección 4).
- Endpoint y pantalla de carga: elegir temporada, subir archivo, vista previa.
- Validaciones: columnas esperadas, aritmética de montos, llave única.
- **Entregable:** resumen por carga (filas nuevas, repetidas, con error).

### Fase 3. Eventos y comparabilidad
- Tabla de eventos con fase, serie, jornada, rival, fecha y tipo.
- Regla de desambiguación por fecha de venta para nombres repetidos.
- Reglas de comparación: **temporada regular por jornada**, **postemporada por fase** (el número de juegos depende de los resultados).

### Fase 4. API de métricas
Endpoints por temporada y comparativos:
- Ingresos y boletos pagados; ticket promedio; descuentos otorgados.
- Cortesías por evento, tipo y solicitante (siempre aparte).
- Ventas por zona, sección, tipo de boleto, canal, método de pago y vendedor.
- Curva de ventas acumuladas y ventas por días de anticipación al partido.

### Fase 5. Interfaz
- Una entrada por temporada en la barra lateral.
- Tarjetas de KPI (pagados y cortesías separados) y gráficas.
- Vista **Comparar**: dos o más temporadas lado a lado, con diferencias absolutas y en porcentaje.
- Vista **Cargas**: historial de archivos subidos.

### Fase 6. Despliegue y pruebas
- Variables de entorno, CORS entre Vercel y Render, respaldos.
- Prueba completa con los tres CSV reales de 2026.
- Prueba de que cargar una temporada nueva no altera las anteriores.

## 7. Riesgos y decisiones pendientes

| # | Tema | Acción |
|---|---|---|
| 1 | Nombres de evento repetidos | Medir filas ambiguas en los archivos completos. Si son muchas, solicitar exportación con fecha o ID del evento, o exportar esos eventos uno por uno |
| 2 | Paquetes | Confirmar cómo se registran (una fila por paquete o por partido) para no duplicar ingresos o boletos |
| 3 | Cortes entre archivos | Una serie puede quedar partida; se cubre con la llave única y el resumen de carga |
| 4 | Espacio en base de datos | Estimar peso por temporada y elegir proveedor; no guardar datos personales |
| 5 | Cambios de formato entre temporadas | El cargador debe fallar con un mensaje claro si cambian columnas o encabezados |
| 6 | Acceso | Definir quién puede ver y quién puede cargar datos |
| 7 | Clasificación de `Acompañante` y `Upgrade` | Hoy se tratan como pagados por tener total mayor a $0; confirmar con el negocio |
