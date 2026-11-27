# Asistente de Estudio (app-resumen-estudio): memoria del proyecto

Al empezar una sesión sobre este proyecto, leer este archivo primero. No pedirle a Nancy que repita el contexto.

## Qué es
App web para que el hijo de Nancy estudie para exámenes (9° año, MEP/CONED). Nancy sube archivos (PDF, Word, txt), la IA (Gemini) genera Resumen, Puntos clave, Flashcards, Preguntas y Cobertura del temario. Nancy genera y guarda; su hijo solo entra, elige materia y estudia (sin clave).

## Datos de despliegue
- Repo: Nancyms1012/app-resumen-estudio, rama `main` (push directo OK, cada push redespliega solo).
- Hosting: Cloudflare Pages, proyecto `app-resumen-estudio`, preset None, build vacío, output `/`.
- URLs: https://study.raceclubhub.com (principal) y https://app-resumen-estudio.pages.dev
- Nancy no puede instalar software. Todo se hace por git push y panel web de Cloudflare. UI en español. Recarga con Ctrl+Shift+R tras cada cambio.

## Configuración en Cloudflare (ya hecha)
- Secreto `GEMINI_API_KEY` (Google AI Studio, capa gratuita). Nunca pegarla en el chat ni en el código. Una vez se vio parcialmente en una captura y Nancy la regeneró.
- Secreto `CLAVE_EDICION`: contraseña de Nancy para guardar en la nube.
- KV namespace `estudio-kv` enlazado con el nombre exacto `ESTUDIO_KV`.
- Dominio personalizado study.raceclubhub.com configurado.
- Variables o bindings nuevos solo se aplican tras un Retry deployment (o un push nuevo).

## Archivos
- `index.html`, `styles.css`, `app.js`: frontend estático. Librerías pdf.js 3.11.174 y mammoth 1.6.0 por CDN.
- `functions/api/generar.js`: POST, llama a Gemini y devuelve el JSON del contenido.
- `functions/api/contenido.js`: GET `?materia=` lee de KV (abierto), POST guarda en KV (exige `clave` = CLAVE_EDICION). Clave KV: `contenido:<materia>`.
- `functions/api/diag.js`: GET de diagnóstico (¿ve la variable?, lista modelos disponibles). No revela la key.
- `README.md`: pasos de despliegue. `.gitignore` excluye `texto_extraido.txt` y `examen_extraido.txt`.
- PDFs subidos al repo por Nancy: `ESTUDIOS_SOCIALES_ZAPANDI.pdf` (antología CONED, 183 págs, ~408k caracteres) y `Practica-Estudios-Sociales-III-Ciclo-Noveno-2024.pdf` (examen MEP, 55 ítems de selección única A/B/C).

## Funciones de la app
- 5 materias en el selector: Estudios Sociales (`sociales`), Español (`espanol`), Matemáticas (`matematicas`), Ciencias (`ciencias`), Cívica (`civica`). Título genérico "Asistente de Estudio", sin subtítulo.
- Archivos acumulables: botón "Agregar archivo(s)" suma archivos de carpetas distintas a una lista con ✖ para quitar. La lista se limpia al cambiar de materia.
- Texto combinado de todos los archivos con separadores `===== DOCUMENTO: nombre =====`. Límite `MAX_CHARS = 900000`. El aviso verde muestra caracteres procesados y el conteo "Preguntas: N del examen + M nuevas".
- Preguntas en dos grupos: "📋 Del examen" (copiadas tal cual si se sube un examen, con su respuesta) y "✨ Nuevas de práctica" (15-20, mismo estilo MEP, sin repetir). Se califican juntas.
- Resumen extenso por unidad/tema (8-15 párrafos), 10-18 bloques de puntos clave, 15-25 flashcards.
- Tab "✅ Cobertura" (solo aparece si hay temario): caja desplegable con textarea o carga de archivo; la IA clasifica cada tema en cubierto, parcial o no cubierto, con porcentaje.
- Guardado: localStorage (clave `asistenteEstudio_v1`, por materia) como respaldo local, y nube (KV) con clave. Al abrir o cambiar de materia, `cargarMateria()` intenta primero la nube y luego localStorage.

## Gemini: lecciones aprendidas
- Modelos usados, en orden: `models/gemini-flash-latest`, `models/gemini-2.5-flash`, `models/gemini-3.5-flash`. Siempre con prefijo `models/`.
- Modelos retirados que dan 404: `gemini-2.5-flash-lite`, `gemini-2.5-pro`. Revisar `/api/diag` para ver los vigentes de la key.
- Errores 502/503/429 son temporales: la Function reintenta hasta 3 veces por modelo. `maxOutputTokens = 12000` (valores altos aumentan los 502).
- Si el error trae HTML (`<!DOCTYPE html>`), es respuesta de Google, no de la app.
- Importante: la Function corta el texto en `MAX_CHARS`; la app avisa si se recortó.

## Estado y pendientes (al 16-sep-2026)
1. Español y Cívica fallaban con HTTP 502 (Sociales sí funcionaba). Se subieron reintentos automáticos (commit f1ded85). NO está confirmado que ya funcionen. Si siguen fallando, pedir el mensaje exacto y considerar procesar por partes.
2. Las preguntas "Del examen" salían solo 6-7 de 55. Se reforzó el prompt para copiar todas (commit 163ad22), pero Nancy no ha confirmado el resultado. Si sigue corto, generar las preguntas del examen en una llamada aparte.
3. Fórmulas de Matemáticas y Ciencias: Nancy cargó Ciencias y no las ve. Posibles causas: el prompt no pide fórmulas, o el PDF las trae como imagen (pdf.js solo extrae texto). Pendiente: que Nancy suba el PDF de Ciencias al repo para revisar si es texto o imagen. Si es imagen, usar Gemini con visión/OCR.
4. Temario de varios años: Nancy debe pegar solo la parte de noveno año (la última del documento). Se ofreció filtrarlo por código, sin decisión aún.
5. Idea ofrecida y sin implementar: botón "Borrar todo" (limpia lista de archivos y resultado guardado). Nota: el texto "📁 Guardado: …" es un aviso, no un archivo cargado, por eso no tiene ✖.
6. Opción 2 (procesar documentos grandes por partes y combinar) queda como respaldo si la Opción 1 (un solo envío) falla.
7. Falta probar de punta a punta el guardado en la nube y la vista del hijo (otro dispositivo o incógnito, sin clave).

## Trampas del sandbox
- `node` no está en el PATH: usar `bash -lc 'node --check archivo.js'`.
- Python: `bash -lc 'pyenv global 3.11.15 && python3 ...'`; para leer PDFs se instaló `pypdf`.
- La herramienta de lectura no ve `/tmp`; guardar archivos temporales dentro del workspace.
- Si el repo local da error de objetos corruptos: `git fetch --refetch origin` o un clon nuevo.
