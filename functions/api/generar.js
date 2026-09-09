// Cloudflare Pages Function: POST /api/generar
// Recibe { texto, materia } y devuelve { resumen, puntos, flashcards, preguntas }
// generados por Gemini. La API key vive como secreto GEMINI_API_KEY (nunca en el frontend).

// Modelos a intentar, en orden. Se usan con el prefijo "models/" (nombre completo
// que devuelve la API). Si uno da error, se prueba el siguiente.
// Solo modelos vigentes (según el diagnóstico /api/diag de la key de Nancy).
const MODELOS = [
  "models/gemini-flash-latest",
  "models/gemini-2.5-flash",
  "models/gemini-3.5-flash"
];

// Límite de caracteres del texto que enviamos al modelo.
// Gemini flash admite una ventana de contexto muy grande (~1M tokens), así que subimos
// bastante el límite para que quepan documentos largos completos (p. ej. una antología de
// ~416.000 caracteres) combinados con un examen de práctica.
const MAX_CHARS = 900000;

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

  // Registramos cuánto texto recibimos y si hubo que recortarlo, para informar al usuario.
  const totalCaracteres = texto.length;
  let recortado = false;
  if (texto.length > MAX_CHARS) {
    texto = texto.slice(0, MAX_CHARS);
    recortado = true;
  }

  const prompt = construirPrompt(texto, materia);

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      // Subimos el límite de salida para que quepan TODAS las preguntas del examen
      // (p. ej. 55) + las nuevas + resumen extenso + puntos + flashcards.
      maxOutputTokens: 32000
    }
  };

  // Intenta cada modelo en orden; usa el primero que responda bien.
  let geminiResp = null;
  const detalles = [];
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
      detalles.push(modelo.replace("models/", "") + " → HTTP " + r.status + ": " +
        (await r.text()).slice(0, 200));
    } catch (e) {
      detalles.push(modelo.replace("models/", "") + " → " + e.message);
    }
  }

  if (!geminiResp) {
    return json({ error: "Gemini respondió con error.", detalle: detalles.join(" || ") }, 502);
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
    preguntasExamen: Array.isArray(resultado.preguntasExamen) ? resultado.preguntasExamen : [],
    preguntasNuevas: Array.isArray(resultado.preguntasNuevas) ? resultado.preguntasNuevas : [],
    // Compatibilidad: si el modelo usara el campo viejo 'preguntas', lo tratamos como nuevas.
    _preguntasLegacy: Array.isArray(resultado.preguntas) ? resultado.preguntas : []
  };
  if (salida.preguntasNuevas.length === 0 && salida._preguntasLegacy.length > 0) {
    salida.preguntasNuevas = salida._preguntasLegacy;
  }
  delete salida._preguntasLegacy;

  // Info para que la app pueda avisar cuánto texto se procesó y si se recortó.
  salida.meta = {
    totalCaracteres: totalCaracteres,
    caracteresProcesados: recortado ? MAX_CHARS : totalCaracteres,
    recortado: recortado
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
    '  "resumen": "string con un resumen extenso y completo, en varios párrafos",',
    '  "puntos": [ { "titulo": "string", "items": ["string", "string"] } ],',
    '  "flashcards": [ { "q": "pregunta corta", "a": "respuesta corta" } ],',
    '  "preguntasExamen": [ { "texto": "enunciado", "opciones": ["op A","op B","op C"], "correcta": 0 } ],',
    '  "preguntasNuevas": [ { "texto": "enunciado", "opciones": ["op A","op B","op C"], "correcta": 0 } ]',
    "}",
    "",
    "Reglas de EXTENSIÓN (muy importante: el resumen debe ser proporcional al tamaño del material):",
    "- 'resumen': debe ser COMPLETO y cubrir TODO el material de principio a fin, no solo el inicio.",
    "  Si el material está dividido en unidades o temas, recórrelos TODOS en orden. Escribe un",
    "  párrafo (o varios) por cada unidad/tema importante. Para un documento largo (p. ej. una",
    "  antología de más de 100 páginas) el resumen debe tener AL MENOS 8 a 15 párrafos.",
    "  Puedes usar subtítulos dentro del texto (por ejemplo 'UNIDAD 1: ...') seguidos de su explicación.",
    "- 'puntos': entre 10 y 18 bloques temáticos (uno por cada tema relevante del material),",
    "  cada uno con 3 a 6 items. Cubre TODAS las unidades/temas, no solo las primeras.",
    "- 'flashcards': entre 15 y 25 tarjetas de pregunta/respuesta, repartidas por todo el material.",
    "- 'correcta' es el índice (0, 1 o 2) de la opción correcta.",
    "- Usa un lenguaje claro y apropiado para estudiantes de noveno año.",
    "- Básate SOLO en el material dado; no inventes datos que no estén relacionados.",
    "- Es OBLIGATORIO cubrir también los temas que aparecen al FINAL del material.",
    "- El material puede incluir VARIOS documentos (marcados con '===== DOCUMENTO: ... =====').",
    "",
    "Sobre las DOS listas de preguntas:",
    "- 'preguntasExamen': si en el material hay un EXAMEN o PRÁCTICA con preguntas, debes COPIAR",
    "  ABSOLUTAMENTE TODAS Y CADA UNA de esas preguntas, SIN OMITIR NINGUNA y SIN RESUMIR.",
    "  Recorre el examen de la primera a la última pregunta (por ejemplo, si el examen tiene 55",
    "  preguntas numeradas del 1 al 55, tu lista 'preguntasExamen' debe tener las 55 completas).",
    "  Copia cada una TAL CUAL (mismo enunciado y mismas opciones, en el mismo orden).",
    "  NO tomes solo una muestra ni selecciones algunas: son TODAS obligatoriamente.",
    "  Determina la opción 'correcta' usando la información del material (muchos exámenes incluyen",
    "  sus respuestas). Si no hay ningún examen con preguntas en el material, deja 'preguntasExamen'",
    "  como lista vacía [].",
    "- 'preguntasNuevas': crea entre 15 y 20 preguntas NUEVAS de selección única con exactamente",
    "  3 opciones. Deben IMITAR el estilo, formato y dificultad de las del examen (enunciado con",
    "  texto/esquema para leer y opciones A/B/C tipo MEP), pero SIN repetir las de 'preguntasExamen'.",
    "  Cubre distintos temas del material. Si no hay examen de referencia, igual crea 15-20 preguntas",
    "  de buena calidad basadas en el contenido.",
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
