// Cloudflare Pages Function: /api/contenido
//   GET  /api/contenido?materia=sociales   -> lee el contenido guardado (ABIERTO, sin clave)
//   POST /api/contenido                     -> guarda contenido (PROTEGIDO con clave)
//
// Requiere:
//   - Un KV namespace enlazado con el nombre ESTUDIO_KV.
//   - Una variable secreta CLAVE_EDICION (la contraseña de mamá para guardar/editar).

const MATERIAS_VALIDAS = ["sociales", "espanol", "matematicas", "ciencias", "civica"];

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

function claveKV(materia) {
  return "contenido:" + materia;
}

// ---------- LEER (abierto, para que el estudiante solo entre y vea) ----------
export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.ESTUDIO_KV) {
    return json({ error: "Falta configurar el almacenamiento (KV) en Cloudflare." }, 500);
  }

  const url = new URL(request.url);
  const materia = (url.searchParams.get("materia") || "").trim();
  if (!MATERIAS_VALIDAS.includes(materia)) {
    return json({ error: "Materia inválida." }, 400);
  }

  const guardado = await env.ESTUDIO_KV.get(claveKV(materia));
  if (!guardado) {
    return json({ existe: false }, 200);
  }

  let data;
  try { data = JSON.parse(guardado); } catch { data = null; }
  if (!data) {
    return json({ existe: false }, 200);
  }

  return json({ existe: true, ...data }, 200);
}

// ---------- GUARDAR (protegido con clave, solo mamá) ----------
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ESTUDIO_KV) {
    return json({ error: "Falta configurar el almacenamiento (KV) en Cloudflare." }, 500);
  }
  if (!env.CLAVE_EDICION) {
    return json({ error: "Falta configurar CLAVE_EDICION en Cloudflare." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Cuerpo inválido. Se esperaba JSON." }, 400);
  }

  const clave = body && body.clave ? String(body.clave) : "";
  if (clave !== env.CLAVE_EDICION) {
    return json({ error: "Clave incorrecta. No tienes permiso para guardar." }, 401);
  }

  const materia = (body && body.materia ? String(body.materia) : "").trim();
  if (!MATERIAS_VALIDAS.includes(materia)) {
    return json({ error: "Materia inválida." }, 400);
  }

  const resultado = body && body.resultado ? body.resultado : null;
  if (!resultado) {
    return json({ error: "No se recibió contenido para guardar." }, 400);
  }

  const registro = {
    resultado: resultado,
    temario: body && body.temario ? String(body.temario) : "",
    nombreArchivo: body && body.nombreArchivo ? String(body.nombreArchivo) : "",
    fecha: new Date().toISOString()
  };

  await env.ESTUDIO_KV.put(claveKV(materia), JSON.stringify(registro));

  return json({ ok: true, fecha: registro.fecha }, 200);
}
