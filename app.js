// ===== Asistente de Estudio (Opción A: con IA) =====

// pdf.js necesita saber dónde está su "worker"
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

const STORAGE_KEY = "asistenteEstudio_v1";

// ----- Elementos del DOM -----
const materiaSelect = document.getElementById("materia-select");
const fileInput = document.getElementById("file-input");
const btnAgregar = document.getElementById("btn-agregar");
const btnGenerar = document.getElementById("btn-generar");
const fileStatus = document.getElementById("file-status");
const fileList = document.getElementById("file-list");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loading-text");
const errorBox = document.getElementById("error-box");
const contenido = document.getElementById("contenido");

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

const resumenCont = document.getElementById("resumen-cont");
const puntosCont = document.getElementById("puntos-cont");

// Flashcards
const fcEl = document.getElementById("flashcard");
const fcFront = document.getElementById("fc-front");
const fcBack = document.getElementById("fc-back");
const fcCounter = document.getElementById("fc-counter");

// Quiz
const quizForm = document.getElementById("quiz-form");
const quizResult = document.getElementById("quiz-result");
const quizCheck = document.getElementById("quiz-check");
const quizReset = document.getElementById("quiz-reset");

// Estado en memoria
let FLASHCARDS = [];
let PREGUNTAS = []; // lista plana; cada item: { texto, opciones, correcta, grupo }
let fcIndex = 0;
let archivos = []; // lista propia que ACUMULA archivos de distintas carpetas

// ===================================================================
//  Lista de archivos acumulados (Opción C)
// ===================================================================
// Al hacer clic en "Agregar", abrimos el selector de archivos.
btnAgregar.addEventListener("click", () => fileInput.click());

// Cada vez que se eligen archivos, se SUMAN a la lista (evitando duplicados por nombre+tamaño).
fileInput.addEventListener("change", () => {
  const nuevos = Array.from(fileInput.files || []);
  nuevos.forEach(f => {
    const yaEsta = archivos.some(a => a.name === f.name && a.size === f.size);
    if (!yaEsta) archivos.push(f);
  });
  fileInput.value = ""; // permite volver a elegir el mismo archivo si hiciera falta
  renderListaArchivos();
});

function renderListaArchivos() {
  fileList.innerHTML = "";
  archivos.forEach((f, i) => {
    const li = document.createElement("li");
    li.className = "file-item";
    const nombre = document.createElement("span");
    nombre.textContent = "📄 " + f.name;
    const quitar = document.createElement("button");
    quitar.className = "file-remove";
    quitar.type = "button";
    quitar.textContent = "✖";
    quitar.title = "Quitar";
    quitar.addEventListener("click", () => {
      archivos.splice(i, 1);
      renderListaArchivos();
    });
    li.appendChild(nombre);
    li.appendChild(quitar);
    fileList.appendChild(li);
  });
}

// ===================================================================
//  Navegación de tabs
// ===================================================================
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
  });
});

// ===================================================================
//  Utilidades de UI
// ===================================================================
function mostrarError(msg) {
  errorBox.hidden = false;
  errorBox.textContent = "⚠️ " + msg;
}
function limpiarError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}
function mostrarCarga(texto) {
  loading.hidden = false;
  loadingText.textContent = texto || "Procesando…";
}
function ocultarCarga() {
  loading.hidden = true;
}

// ===================================================================
//  Extracción de texto según el tipo de archivo
// ===================================================================
async function extraerTexto(file) {
  const nombre = file.name.toLowerCase();

  if (nombre.endsWith(".txt")) {
    return await file.text();
  }

  if (nombre.endsWith(".pdf")) {
    if (!window.pdfjsLib) throw new Error("No se pudo cargar el lector de PDF.");
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let texto = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      texto += content.items.map(it => it.str).join(" ") + "\n";
    }
    return texto;
  }

  if (nombre.endsWith(".docx")) {
    if (!window.mammoth) throw new Error("No se pudo cargar el lector de Word.");
    const buffer = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buffer });
    return res.value;
  }

  throw new Error("Formato no soportado. Usa PDF, Word (.docx) o texto (.txt).");
}

// ===================================================================
//  Llamada a la Function que usa Gemini
// ===================================================================
async function generarConIA(texto, materia) {
  const resp = await fetch("/api/generar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto, materia })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    let msg = data.error || "Error al generar el contenido.";
    if (data.detalle) msg += " (" + data.detalle + ")";
    throw new Error(msg);
  }
  return data;
}

// ===================================================================
//  Botón Generar
// ===================================================================
btnGenerar.addEventListener("click", async () => {
  limpiarError();
  const files = archivos.slice();
  if (files.length === 0) {
    mostrarError("Primero agrega uno o varios archivos (PDF, Word o texto).");
    return;
  }

  const materiaValor = materiaSelect.value;
  const materiaTexto = materiaSelect.options[materiaSelect.selectedIndex].text;

  try {
    btnGenerar.disabled = true;
    contenido.style.display = "none";

    // Extrae y combina el texto de todos los archivos.
    const partes = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      mostrarCarga("📖 Leyendo archivo " + (i + 1) + " de " + files.length + ": " + f.name + "…");
      const t = await extraerTexto(f);
      if (t && t.trim().length >= 20) {
        partes.push("===== DOCUMENTO: " + f.name + " =====\n" + t.trim());
      }
    }

    if (partes.length === 0) {
      throw new Error("No se pudo extraer texto de los archivos (¿son PDF escaneados como imagen?).");
    }

    const textoCombinado = partes.join("\n\n");
    const nombres = files.map(f => f.name).join(", ");

    mostrarCarga("🤖 Generando resumen, flashcards y preguntas con IA…");
    const resultado = await generarConIA(textoCombinado, materiaTexto);

    aplicarResultado(resultado);
    guardar(materiaValor, nombres, resultado);

    let estado = "✅ Generado a partir de: " + nombres;
    if (resultado.meta) {
      const m = resultado.meta;
      const procesados = (m.caracteresProcesados || 0).toLocaleString("es-CR");
      const total = (m.totalCaracteres || 0).toLocaleString("es-CR");
      if (m.recortado) {
        estado += " · ⚠️ El texto era muy largo: se procesaron " + procesados +
          " de " + total + " caracteres.";
      } else {
        estado += " · Se procesó el documento completo (" + total + " caracteres).";
      }
    }
    fileStatus.textContent = estado;

    ocultarCarga();
    contenido.style.display = "";
  } catch (e) {
    ocultarCarga();
    mostrarError(e.message);
  } finally {
    btnGenerar.disabled = false;
  }
});

// ===================================================================
//  Aplicar y renderizar el resultado en los tabs
// ===================================================================
function aplicarResultado(r) {
  // Resumen: cada bloque separado por saltos de línea. Si una línea parece un
  // subtítulo (corta y en MAYÚSCULAS, o termina en ':'), la mostramos como encabezado.
  const bloques = (r.resumen || "").split(/\n{2,}|\n/).map(p => p.trim()).filter(Boolean);
  if (bloques.length) {
    resumenCont.innerHTML = bloques.map(b => {
      const esSubtitulo =
        (b.length < 90 && (b === b.toUpperCase()) && /[A-ZÁÉÍÓÚÑ]/.test(b)) ||
        (b.length < 70 && b.endsWith(":"));
      return esSubtitulo
        ? "<h3 class='resumen-sub'>" + escapar(b.replace(/:$/, "")) + "</h3>"
        : "<p>" + escapar(b) + "</p>";
    }).join("");
  } else {
    resumenCont.innerHTML = "<p>Sin resumen.</p>";
  }

  // Puntos clave
  puntosCont.innerHTML = "";
  (r.puntos || []).forEach(bloque => {
    const div = document.createElement("div");
    div.className = "card";
    const items = (bloque.items || []).map(it => "<li>" + escapar(it) + "</li>").join("");
    div.innerHTML = "<h3>" + escapar(bloque.titulo || "") + "</h3><ul>" + items + "</ul>";
    puntosCont.appendChild(div);
  });

  // Flashcards
  FLASHCARDS = (r.flashcards || []).filter(f => f && f.q && f.a);
  fcIndex = 0;
  renderFlashcard();

  // Preguntas: dos grupos (del examen y nuevas). Compatibilidad con formato viejo 'preguntas'.
  const valida = p => p && p.texto && Array.isArray(p.opciones) && p.opciones.length >= 2;
  const examen = (r.preguntasExamen || []).filter(valida).map(p => ({ ...p, grupo: "examen" }));
  let nuevas = (r.preguntasNuevas || []).filter(valida).map(p => ({ ...p, grupo: "nuevas" }));
  if (nuevas.length === 0 && Array.isArray(r.preguntas)) {
    nuevas = r.preguntas.filter(valida).map(p => ({ ...p, grupo: "nuevas" }));
  }
  PREGUNTAS = examen.concat(nuevas);
  renderQuiz();

  // Volver al primer tab
  tabs.forEach(t => t.classList.remove("active"));
  panels.forEach(p => p.classList.remove("active"));
  tabs[0].classList.add("active");
  document.getElementById("panel-resumen").classList.add("active");
}

function escapar(s) {
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}

// ===================================================================
//  Flashcards
// ===================================================================
function renderFlashcard() {
  fcEl.classList.remove("flipped");
  if (FLASHCARDS.length === 0) {
    fcFront.textContent = "Aún no hay flashcards.";
    fcBack.textContent = "";
    fcCounter.textContent = "0 / 0";
    return;
  }
  fcFront.textContent = FLASHCARDS[fcIndex].q;
  fcBack.textContent = FLASHCARDS[fcIndex].a;
  fcCounter.textContent = (fcIndex + 1) + " / " + FLASHCARDS.length;
}

fcEl.addEventListener("click", () => {
  if (FLASHCARDS.length) fcEl.classList.toggle("flipped");
});
document.getElementById("fc-next").addEventListener("click", () => {
  if (!FLASHCARDS.length) return;
  fcIndex = (fcIndex + 1) % FLASHCARDS.length;
  renderFlashcard();
});
document.getElementById("fc-prev").addEventListener("click", () => {
  if (!FLASHCARDS.length) return;
  fcIndex = (fcIndex - 1 + FLASHCARDS.length) % FLASHCARDS.length;
  renderFlashcard();
});

// ===================================================================
//  Quiz
// ===================================================================
function renderQuiz() {
  quizForm.innerHTML = "";
  quizResult.hidden = true;

  if (PREGUNTAS.length === 0) {
    quizForm.innerHTML = "<p class='hint'>Aún no hay preguntas.</p>";
    return;
  }

  let grupoActual = null;
  PREGUNTAS.forEach((p, i) => {
    // Inserta un subtítulo cuando cambia el grupo.
    if (p.grupo !== grupoActual) {
      grupoActual = p.grupo;
      const sub = document.createElement("h3");
      sub.className = "grupo-subtitulo";
      sub.textContent = grupoActual === "examen"
        ? "📋 Del examen"
        : "✨ Nuevas de práctica";
      quizForm.appendChild(sub);
    }

    const div = document.createElement("div");
    div.className = "pregunta";
    div.dataset.index = i;

    const texto = document.createElement("div");
    texto.className = "pregunta-texto";
    texto.textContent = (i + 1) + ") " + p.texto;
    div.appendChild(texto);

    p.opciones.forEach((op, j) => {
      const label = document.createElement("label");
      label.className = "opcion";
      const letra = String.fromCharCode(65 + j);
      label.innerHTML = '<input type="radio" name="p' + i + '" value="' + j + '"> ' +
        "<strong>" + letra + ")</strong> " + escapar(op);
      div.appendChild(label);
    });

    quizForm.appendChild(div);
  });
}

quizCheck.addEventListener("click", () => {
  if (!PREGUNTAS.length) return;
  let correctas = 0;
  let contestadas = 0;

  PREGUNTAS.forEach((p, i) => {
    const preguntaDiv = quizForm.querySelector('.pregunta[data-index="' + i + '"]');
    const opciones = preguntaDiv.querySelectorAll(".opcion");
    opciones.forEach(o => o.classList.remove("correcta", "incorrecta"));

    const seleccion = quizForm.querySelector('input[name="p' + i + '"]:checked');
    const correcta = typeof p.correcta === "number" ? p.correcta : 0;

    if (opciones[correcta]) opciones[correcta].classList.add("correcta");

    if (seleccion) {
      contestadas++;
      const elegida = parseInt(seleccion.value, 10);
      if (elegida === correcta) correctas++;
      else if (opciones[elegida]) opciones[elegida].classList.add("incorrecta");
    }
  });

  const total = PREGUNTAS.length;
  const nota = Math.round((correctas / total) * 100);
  const emoji = nota >= 70 ? "🎉" : (nota >= 50 ? "💪" : "📚");
  quizResult.hidden = false;
  quizResult.textContent = emoji + " Obtuviste " + correctas + " de " + total +
    " correctas (" + nota + "%). " +
    (contestadas < total ? "Dejaste " + (total - contestadas) + " sin responder." : "");
});

quizReset.addEventListener("click", renderQuiz);

// ===================================================================
//  Guardado en localStorage (por materia)
// ===================================================================
function guardar(materia, nombreArchivo, resultado) {
  let store = {};
  try { store = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { store = {}; }
  store[materia] = { nombreArchivo, resultado, fecha: new Date().toISOString() };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); } catch { /* cuota llena, ignorar */ }
}

function cargarGuardado(materia) {
  let store = {};
  try { store = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { store = {}; }
  return store[materia] || null;
}

// Al cambiar de materia, si hay algo guardado lo mostramos; si no, limpiamos.
materiaSelect.addEventListener("change", () => {
  limpiarError();
  const guardado = cargarGuardado(materiaSelect.value);
  if (guardado) {
    aplicarResultado(guardado.resultado);
    fileStatus.textContent = "📁 Guardado: " + guardado.nombreArchivo;
    contenido.style.display = "";
  } else {
    fileStatus.textContent = "";
    contenido.style.display = "none";
  }
  fileInput.value = "";
  archivos = [];
  renderListaArchivos();
});

// ===================================================================
//  Inicio: cargar lo guardado de la materia inicial (si existe)
// ===================================================================
(function init() {
  const guardado = cargarGuardado(materiaSelect.value);
  if (guardado) {
    aplicarResultado(guardado.resultado);
    fileStatus.textContent = "📁 Guardado: " + guardado.nombreArchivo;
    contenido.style.display = "";
  } else {
    contenido.style.display = "none";
  }
})();
