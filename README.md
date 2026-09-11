# 📚 Asistente de Estudio (con IA)

App web para estudiar: subes un archivo (PDF, Word o texto), eliges la materia y
la IA genera **Resumen**, **Puntos clave**, **Flashcards** y **Preguntas de
práctica**, organizados en pestañas.

## ¿Cómo funciona?

1. Eliges la **materia** (Estudios Sociales, Español, Matemáticas, Ciencias, Cívica).
2. **Subes un archivo** (`.pdf`, `.docx` o `.txt`).
3. El navegador extrae el texto (con `pdf.js` y `mammoth.js`).
4. El texto se envía a una **Cloudflare Pages Function** (`/functions/api/generar.js`),
   que llama a **Google Gemini** usando una API key guardada de forma segura.
5. La app muestra el resultado en las pestañas y lo **guarda en el navegador**
   (localStorage) por materia, para no regenerarlo cada vez.

## Archivos

- `index.html` — interfaz (selector, subida, tabs).
- `styles.css` — diseño responsive en español.
- `app.js` — extracción de archivos, llamada a la IA, render y guardado.
- `functions/api/generar.js` — backend seguro que llama a Gemini.

---

## 🚀 Despliegue en Cloudflare Pages

> No requiere instalar nada: se hace desde el panel web de Cloudflare.

1. En Cloudflare, ve a **Workers & Pages → Create → Pages → Connect to Git**.
2. Selecciona el repositorio **`app-resumen-estudio`**.
3. Configuración de compilación:
   - **Framework preset:** `None`
   - **Build command:** *(vacío)*
   - **Build output directory:** `/`
4. Clic en **Save and Deploy**.

### 🔑 Configurar la API key de Gemini (paso obligatorio)

La app necesita tu clave de Gemini como **variable de entorno secreta**
(así nunca queda expuesta en el código):

1. En tu proyecto de Pages → **Settings → Environment variables** (Variables de entorno).
2. Agrega una variable:
   - **Nombre:** `GEMINI_API_KEY`
   - **Valor:** *(pega aquí tu API key de Google AI Studio)*
   - Márcala como **Secret** / **Encrypt** si aparece la opción.
3. Guarda y vuelve a hacer **Deploy** (Retry deployment) para que tome la variable.

> Consigue la key gratis en https://aistudio.google.com/apikey

### Probar en local (opcional)

Para probar las Functions en local se usa Wrangler (requiere instalar Node), pero
como el flujo aquí es por panel web, basta con desplegar y probar en la URL de Pages.

---

## ☁️ Guardar en la nube (para que el estudiante solo entre y vea)

El contenido puede guardarse en **Cloudflare Workers KV**. Quien edita (mamá) usa una
clave para guardar; el estudiante solo entra, elige materia y ve todo (sin clave).

Configuración en el panel de Cloudflare (una sola vez):

1. **Crear el almacén KV**
   - Cloudflare → **Workers & Pages → KV → Create a namespace**.
   - Nombre sugerido: `estudio-kv`. Crear.

2. **Enlazar el KV al proyecto de Pages**
   - En tu proyecto de Pages → **Settings → Functions → KV namespace bindings** (o
     *Bindings*) → **Add binding**.
   - **Variable name:** `ESTUDIO_KV`  ·  **KV namespace:** el que creaste (`estudio-kv`).
   - Guardar.

3. **Agregar la clave de edición (secreto)**
   - En tu proyecto → **Settings → Variables and secrets → Add**.
   - **Type:** Secret · **Name:** `CLAVE_EDICION` · **Value:** *(la contraseña que usará mamá)*.
   - Guardar.

4. **Volver a desplegar** (Deployments → Retry deployment) para que tome KV y el secreto.

### Dominio propio (opcional): study.raceclubhub.com

- En tu proyecto de Pages → **Custom domains → Set up a custom domain**.
- Escribe `study.raceclubhub.com` y sigue los pasos (Cloudflare crea el registro DNS solo
  porque el dominio ya está en tu cuenta).

### Endpoints

- `GET  /api/contenido?materia=<materia>` → lee el contenido guardado (abierto).
- `POST /api/contenido` → guarda (requiere `clave` correcta en el cuerpo).

## Notas

- Modelo usado: `gemini-flash-latest` (rápido y económico; con capa gratuita).
- Si un PDF es una imagen escaneada (sin texto), la extracción fallará: en ese
  caso se necesitaría OCR (mejora futura).
- El contenido se genera solo con base en el archivo subido.

---

Proyecto de Nancy (Nancyms1012).
