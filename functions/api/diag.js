// Endpoint de diagnóstico: GET /api/diag
// NO revela la clave. Solo dice si la Function puede VER la variable GEMINI_API_KEY
// y cuántos caracteres tiene, para descartar problemas de configuración.

export async function onRequestGet(context) {
  const { env } = context;
  const key = env.GEMINI_API_KEY;

  const info = {
    verVariable: !!key,
    longitud: key ? String(key).length : 0,
    // Muestra solo los primeros 4 caracteres para confirmar que es la key correcta,
    // sin exponerla completa.
    prefijo: key ? String(key).slice(0, 4) + "…" : null,
    variablesDisponibles: Object.keys(env || {}),
  };

  return new Response(JSON.stringify(info, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
