// Endpoint de diagnóstico: GET /api/diag
// NO revela la clave. Solo dice si la Function puede VER la variable GEMINI_API_KEY
// y cuántos caracteres tiene, para descartar problemas de configuración.

export async function onRequestGet(context) {
  const { env } = context;
  const key = env.GEMINI_API_KEY;

  const info = {
    verVariable: !!key,
    longitud: key ? String(key).length : 0,
    prefijo: key ? String(key).slice(0, 4) + "…" : null,
    variablesDisponibles: Object.keys(env || {}),
    modelosDisponibles: null,
    errorListado: null,
  };

  // Pregunta a la API de Gemini qué modelos están disponibles para esta key.
  if (key) {
    try {
      const url = "https://generativelanguage.googleapis.com/v1beta/models?key=" +
        encodeURIComponent(key);
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        info.modelosDisponibles = (data.models || [])
          .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
          .map(m => m.name);
      } else {
        info.errorListado = "HTTP " + resp.status + ": " + (await resp.text()).slice(0, 300);
      }
    } catch (e) {
      info.errorListado = e.message;
    }
  }

  return new Response(JSON.stringify(info, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
