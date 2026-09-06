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

## Notas

- Modelo usado: `gemini-2.5-flash` (rápido y económico; con capa gratuita).
- Si un PDF es una imagen escaneada (sin texto), la extracción fallará: en ese
  caso se necesitaría OCR (mejora futura).
- El contenido se genera solo con base en el archivo subido.

---

Proyecto de Nancy (Nancyms1012).
