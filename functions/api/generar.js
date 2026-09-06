// Cloudflare Pages Function: POST /api/generar
// Recibe { texto, materia } y devuelve { resumen, puntos, flashcards, preguntas }
// generados por Gemini. La API key vive como secreto GEMINI_API_KEY (nunca en el frontend).

// Modelos a intentar, en orden. Se usan con el prefijo "models/" (nombre completo
// que devuelve la API). Si el primero da 404, se prueba el siguiente.
const MODELOS = [
  "models/gemini-2.5-flash",
  "models/gemini-flash-latest",
  "models/gemini-2.5-flash-lite"
];

// Límite de caracteres del texto que enviamos al modelo (evita costos/errores por textos enormes).
const MAX_CHARS = 100000;

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: "Falta configurar GEMINI_API_KEY en Cloudflare." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Cuerpo inválido. Se esperaba JSON." }, 400);
  }

  let texto = (body && body.texto ? String(body.texto) : "").trim();
  const materia = (body && body.materia ? String(body.materia) : "la materia").trim();

  if (!texto) {
    return json({ error: "No se recibió texto para procesar." }, 400);
  }
  if (texto.length > MAX_CHARS) {
    texto = texto.slice(0, MAX_CHARS);
  }

  const prompt = construirPrompt(texto, materia);

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json"
    }
  };

  // Intenta cada modelo en orden; usa el primero que responda bien.
  let geminiResp = null;
  let ultimoDetalle = "";
  for (const modelo of MODELOS) {
    const url = "https://generativelanguage.googleapis.com/v1beta/" +
      modelo + ":generateContent?key=" + encodeURIComponent(apiKey);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (r.ok) {
        geminiResp = r;
        break;
      }
      ultimoDetalle = "Modelo " + modelo + " → HTTP " + r.status + ": " +
        (await r.text()).slice(0, 300);
    } catch (e) {
      ultimoDetalle = "Modelo " + modelo + " → " + e.message;
    }
  }

  if (!geminiResp) {
    return json({ error: "Gemini respondió con error.", detalle: ultimoDetalle }, 502);
  }

  const data = await geminiResp.json();
  const textoGenerado =
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text;

  if (!textoGenerado) {
    return json({ error: "Gemini no devolvió contenido utilizable." }, 502);
  }

  let resultado;
  try {
    resultado = JSON.parse(textoGenerado);
  } catch {
    // Por si el modelo envolviera el JSON en texto adicional, intentamos rescatarlo.
    const match = textoGenerado.match(/\{[\s\S]*\}/);
    if (match) {
      try { resultado = JSON.parse(match[0]); } catch { /* cae abajo */ }
    }
  }

  if (!resultado) {
    return json({ error: "No se pudo interpretar la respuesta de la IA." }, 502);
  }

  // Normaliza la estructura para el frontend.
  const salida = {
    resumen: typeof resultado.resumen === "string" ? resultado.resumen : "",
    puntos: Array.isArray(resultado.puntos) ? resultado.puntos : [],
    flashcards: Array.isArray(resultado.flashcards) ? resultado.flashcards : [],
    preguntas: Array.isArray(resultado.preguntas) ? resultado.preguntas : []
  };

  return json(salida, 200);
}

function construirPrompt(texto, materia) {
  return [
    "Eres un profesor experto que ayuda a estudiantes de secundaria de Costa Rica",
    "a estudiar para un examen. La materia es: " + materia + ".",
    "A partir del SIGUIENTE MATERIAL DE ESTUDIO, genera contenido de repaso EN ESPAÑOL.",
    "",
    "Devuelve ÚNICAMENTE un objeto JSON válido (sin texto adicional, sin markdown) con esta forma exacta:",
    "{",
    '  "resumen": "string con un resumen claro del material en 2 a 4 párrafos",',
    '  "puntos": [ { "titulo": "string", "items": ["string", "string"] } ],',
    '  "flashcards": [ { "q": "pregunta corta", "a": "respuesta corta" } ],',
    '  "preguntas": [ { "texto": "enunciado", "opciones": ["op A","op B","op C"], "correcta": 0 } ]',
    "}",
    "",
    "Reglas:",
    "- 'puntos': entre 4 y 8 bloques temáticos, cada uno con 2 a 5 items.",
    "- 'flashcards': entre 10 y 15 tarjetas de pregunta/respuesta.",
    "- 'preguntas': entre 6 y 10 preguntas de selección única con exactamente 3 opciones.",
    "- 'correcta' es el índice (0, 1 o 2) de la opción correcta.",
    "- Usa un lenguaje claro y apropiado para estudiantes de noveno año.",
    "- Básate SOLO en el material dado; no inventes datos que no estén relacionados.",
    "",
    "MATERIAL DE ESTUDIO:",
    '"""',
    texto,
    '"""'
  ].join("\n");
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
