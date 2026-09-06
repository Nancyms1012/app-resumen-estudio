// ===== Datos del Tema 1 (demo) =====

const FLASHCARDS = [
  { q: "¿En qué año y con quién inicia el Imperio Romano?", a: "29 a.C., con Augusto (Octavio)." },
  { q: "¿En qué año cae el Imperio Romano de Occidente?", a: "476 d.C." },
  { q: "¿Quién fue el último emperador de Occidente?", a: "Rómulo Augústulo." },
  { q: "¿Qué jefe bárbaro lo depuso?", a: "Odoacro, jefe de los Hérulos." },
  { q: "¿Quién dividió el Imperio en 395 d.C. y entre quiénes?", a: "Teodosio, entre sus hijos Arcadio (Oriente) y Honorio (Occidente)." },
  { q: "¿Cuál era la capital del Imperio de Oriente?", a: "Constantinopla." },
  { q: "Menciona 3 causas internas de la caída.", a: "Corrupción, guerras civiles y ambición de los generales (también la persecución de cristianos)." },
  { q: "¿Quién fue Atila y dónde fue vencido?", a: "Rey de los Hunos (\"Azote de Dios\"), vencido en los Campos Cataláunicos." },
  { q: "¿Quién reunificó y expandió el Imperio Carolingio?", a: "Carlomagno." },
  { q: "¿En qué año cae Constantinopla y ante quién?", a: "En 1453, ante los turcos otomanos." },
  { q: "¿Qué es un vasallo?", a: "Hombre libre que debe obediencia y servicio militar a un señor más poderoso." },
  { q: "¿Qué es un feudo?", a: "La concesión de tierras que el señor da al vasallo para su sustento." },
  { q: "¿Qué significa que la sociedad feudal era \"teocéntrica\"?", a: "Que el pensamiento y las acciones giraban en torno a Dios." },
  { q: "¿Cuál fue la única institución estable tras la caída de Roma?", a: "La Iglesia Católica." },
  { q: "¿Cómo se llama hoy Constantinopla?", a: "Estambul." }
];

const PREGUNTAS = [
  {
    texto: "El Imperio Romano de Occidente cayó en el año:",
    opciones: ["395 d.C.", "476 d.C.", "1453 d.C."],
    correcta: 1
  },
  {
    texto: "La ruptura religiosa entre Oriente y Occidente en 1054 se conoce por conflictos como:",
    opciones: ["Las Cruzadas", "Los iconoclastas y el arrianismo", "La Reforma Protestante"],
    correcta: 1
  },
  {
    texto: "En el feudalismo, la concesión de tierras que recibía el vasallo se llamaba:",
    opciones: ["Señorío", "Vasallaje", "Feudo"],
    correcta: 2
  },
  {
    texto: "¿Cuál fue una causa del surgimiento del feudalismo en Europa?",
    opciones: [
      "El sometimiento absoluto de los nobles hacia los reyes.",
      "La migración de la población de las ciudades al campo para una economía de autoconsumo.",
      "El fortalecimiento del comercio marítimo internacional."
    ],
    correcta: 1
  },
  {
    texto: "¿Qué acontecimiento puso fin al Imperio Romano de Oriente en 1453?",
    opciones: [
      "La toma de Constantinopla por los turcos otomanos.",
      "La invasión de los visigodos a Toledo.",
      "La coronación de Carlomagno."
    ],
    correcta: 0
  }
];

// ===== Navegación de tabs =====
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
  });
});

// ===== Flashcards =====
let fcIndex = 0;
const fcEl = document.getElementById("flashcard");
const fcFront = document.getElementById("fc-front");
const fcBack = document.getElementById("fc-back");
const fcCounter = document.getElementById("fc-counter");

function renderFlashcard() {
  fcEl.classList.remove("flipped");
  fcFront.textContent = FLASHCARDS[fcIndex].q;
  fcBack.textContent = FLASHCARDS[fcIndex].a;
  fcCounter.textContent = (fcIndex + 1) + " / " + FLASHCARDS.length;
}

fcEl.addEventListener("click", () => fcEl.classList.toggle("flipped"));

document.getElementById("fc-next").addEventListener("click", () => {
  fcIndex = (fcIndex + 1) % FLASHCARDS.length;
  renderFlashcard();
});
document.getElementById("fc-prev").addEventListener("click", () => {
  fcIndex = (fcIndex - 1 + FLASHCARDS.length) % FLASHCARDS.length;
  renderFlashcard();
});

renderFlashcard();

// ===== Quiz =====
const quizForm = document.getElementById("quiz-form");
const quizResult = document.getElementById("quiz-result");

function renderQuiz() {
  quizForm.innerHTML = "";
  quizResult.hidden = true;
  PREGUNTAS.forEach((p, i) => {
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
      const letra = String.fromCharCode(65 + j); // A, B, C
      label.innerHTML = '<input type="radio" name="p' + i + '" value="' + j + '"> ' +
        "<strong>" + letra + ")</strong> " + op;
      div.appendChild(label);
    });

    quizForm.appendChild(div);
  });
}

document.getElementById("quiz-check").addEventListener("click", () => {
  let correctas = 0;
  let contestadas = 0;

  PREGUNTAS.forEach((p, i) => {
    const preguntaDiv = quizForm.querySelector('.pregunta[data-index="' + i + '"]');
    const opciones = preguntaDiv.querySelectorAll(".opcion");
    opciones.forEach(o => o.classList.remove("correcta", "incorrecta"));

    const seleccion = quizForm.querySelector('input[name="p' + i + '"]:checked');

    // Marca siempre la correcta en verde
    opciones[p.correcta].classList.add("correcta");

    if (seleccion) {
      contestadas++;
      const elegida = parseInt(seleccion.value, 10);
      if (elegida === p.correcta) {
        correctas++;
      } else {
        opciones[elegida].classList.add("incorrecta");
      }
    }
  });

  const total = PREGUNTAS.length;
  const nota = Math.round((correctas / total) * 100);
  let emoji = nota >= 70 ? "🎉" : (nota >= 50 ? "💪" : "📚");
  quizResult.hidden = false;
  quizResult.textContent = emoji + " Obtuviste " + correctas + " de " + total +
    " correctas (" + nota + "%). " +
    (contestadas < total ? "Dejaste " + (total - contestadas) + " sin responder." : "");
});

document.getElementById("quiz-reset").addEventListener("click", renderQuiz);

renderQuiz();


// ===== Selector de materia =====
// Por ahora solo "Estudios Sociales" (sociales) tiene contenido en la demo.
// Las demás muestran un aviso de "Contenido próximamente".
const MATERIAS_CON_CONTENIDO = ["sociales"];

const materiaSelect = document.getElementById("materia-select");
const temaSelect = document.getElementById("tema-select");
const tabsNav = document.querySelector(".tabs");
const mainContainer = document.querySelector(".container");

// Aviso reutilizable de "próximamente"
const aviso = document.createElement("div");
aviso.id = "aviso-materia";
aviso.className = "panel active";
aviso.style.textAlign = "center";
aviso.hidden = true;
aviso.innerHTML =
  '<h2>🚧 Contenido próximamente</h2>' +
  '<p>Esta materia todavía no tiene material cargado en la demo.</p>' +
  '<p class="hint">Cuando conectemos la generación con IA, bastará con subir un ' +
  'archivo para que la app cree aquí el resumen, los puntos clave, las flashcards ' +
  'y las preguntas. ✨</p>';
mainContainer.appendChild(aviso);

function aplicarMateria() {
  const materia = materiaSelect.value;
  const tieneContenido = MATERIAS_CON_CONTENIDO.includes(materia);

  if (tieneContenido) {
    // Muestra los tabs y paneles normales; oculta el aviso
    tabsNav.style.display = "";
    aviso.hidden = true;
    temaSelect.disabled = false;
    // Reactiva el tab que esté marcado como activo
    const activo = document.querySelector(".tab.active");
    panels.forEach(p => p.classList.remove("active"));
    if (activo) {
      document.getElementById("panel-" + activo.dataset.tab).classList.add("active");
    }
  } else {
    // Oculta tabs y todos los paneles; muestra el aviso
    tabsNav.style.display = "none";
    panels.forEach(p => p.classList.remove("active"));
    aviso.hidden = false;
    temaSelect.disabled = true;
  }
}

materiaSelect.addEventListener("change", aplicarMateria);
aplicarMateria();
