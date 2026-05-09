// ==================== ESTAT ====================
let totesCancons = [];
let playlists = {};
let cuaActual = [];
let nomCuaActual = "";
let indexActual = -1;
let vistaModal = "graella"; // "graella", "detall" o "afegir"
let cancoSeleccionades = new Set(); // cançons seleccionades a la vista "afegir"
let nomDetall = "";          // quina playlist s'està veient en detall
let indexArrossegant = null;       // posició de la playlist que s'està arrossegant
let indexCancoArrossegant = null;  // posició de la cançó (dins playlist) que s'està arrossegant

// ==================== ELEMENTS DEL DOM ====================
const reproductor = document.getElementById("reproductor");
const titolActual = document.getElementById("titol-actual");
const cuaActualText = document.getElementById("cua-actual");
const llista = document.getElementById("llista-cancons");
const cercador = document.getElementById("cercador");
const resultatCerca = document.getElementById("resultat-cerca");

const modal = document.getElementById("modal-playlists");
const vistaGraella = document.getElementById("vista-graella");
const vistaDetall = document.getElementById("vista-detall");
const graellaPlaylists = document.getElementById("graella-playlists");
const detallNom = document.getElementById("detall-nom");
const detallQuantitat = document.getElementById("detall-quantitat");
const detallCancons = document.getElementById("detall-cancons");
const vistaAfegir = document.getElementById("vista-afegir");
const afegirTitol = document.getElementById("afegir-titol");
const afegirCerca = document.getElementById("afegir-cerca");
const afegirLlista = document.getElementById("afegir-llista");
const botoConfirmarAfegir = document.getElementById("boto-confirmar-afegir");

// ==================== REPRODUCCIÓ ====================
function reprodueix(index) {
  if (index < 0 || index >= cuaActual.length) return;
  indexActual = index;
  const canco = cuaActual[index];
  reproductor.src = "/api/musica/" + encodeURIComponent(canco);
  reproductor.play();
  titolActual.textContent = "🔊 Ara sona: " + canco;
}

function anterior() {
  if (cuaActual.length === 0) return;
  let nou = indexActual - 1;
  if (nou < 0) nou = cuaActual.length - 1;
  reprodueix(nou);
}

function seguent() {
  if (cuaActual.length === 0) return;
  let nou = indexActual + 1;
  if (nou >= cuaActual.length) nou = 0;
  reprodueix(nou);
}

function activaCua(novaCua, nom) {
  cuaActual = novaCua;
  nomCuaActual = nom;
  indexActual = -1;
  if (nom === "") {
    cuaActualText.textContent = "📃 Sonant: totes les cançons";
  } else {
    cuaActualText.textContent = "📋 Sonant la playlist: " + nom;
  }
}

document.getElementById("boto-anterior").onclick = anterior;
document.getElementById("boto-seguent").onclick = seguent;
document.getElementById("boto-totes").onclick = () => {
  activaCua([...totesCancons], "");
};
reproductor.addEventListener("ended", seguent);

// ==================== LLISTA DE CANÇONS PRINCIPAL ====================
function pintaLlistaCancons() {
  llista.innerHTML = "";
  totesCancons.forEach((canco, i) => {
    const item = document.createElement("li");

    const botoPlay = document.createElement("button");
    botoPlay.textContent = "▶";
    botoPlay.onclick = () => {
      activaCua([...totesCancons], "");
      reprodueix(i);
    };
    item.appendChild(botoPlay);
    item.append(" " + canco + " ");

    // Selector ràpid per afegir directament a una playlist
    const selector = document.createElement("select");
    const opcioPredeterminada = document.createElement("option");
    opcioPredeterminada.textContent = "➕ Afegir a...";
    opcioPredeterminada.value = "";
    selector.appendChild(opcioPredeterminada);
    Object.keys(playlists).forEach((nomPL) => {
      const op = document.createElement("option");
      op.textContent = nomPL;
      op.value = nomPL;
      selector.appendChild(op);
    });
    selector.onchange = () => {
      const nomPL = selector.value;
      if (nomPL) {
        afegeixCancoAPlaylist(nomPL, canco);
        selector.value = "";
      }
    };
    item.appendChild(selector);

    llista.appendChild(item);
  });
}

// ==================== MODAL ====================
function obreModal() {
  modal.classList.add("obert");
  mostraGraella();
}

function tancaModal() {
  modal.classList.remove("obert");
}

function mostraGraella() {
  vistaModal = "graella";
  nomDetall = "";
  vistaGraella.hidden = false;
  vistaDetall.hidden = true;
  vistaAfegir.hidden = true;
  pintaGraella();
}

function mostraDetall(nom) {
  vistaModal = "detall";
  nomDetall = nom;
  vistaGraella.hidden = true;
  vistaDetall.hidden = false;
  vistaAfegir.hidden = true;
  pintaDetall();
}

function mostraAfegir() {
  if (!nomDetall) return;
  vistaModal = "afegir";
  cancoSeleccionades.clear();
  vistaGraella.hidden = true;
  vistaDetall.hidden = true;
  vistaAfegir.hidden = false;
  afegirTitol.textContent = "📋 " + nomDetall + " — Afegir cançons";
  afegirCerca.value = "";
  pintaAfegir();
}

document.getElementById("boto-obrir-playlists").onclick = obreModal;
document.getElementById("boto-tancar-modal").onclick = tancaModal;
document.getElementById("boto-tornar-graella").onclick = mostraGraella;
document.getElementById("boto-tornar-detall").onclick = () => mostraDetall(nomDetall);

modal.addEventListener("click", (e) => {
  if (e.target === modal) tancaModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("obert")) tancaModal();
});

// ==================== GRAELLA DE PLAYLISTS ====================
function pintaGraella() {
  graellaPlaylists.innerHTML = "";
  const noms = Object.keys(playlists);
  if (noms.length === 0) {
    const buit = document.createElement("p");
    buit.className = "missatge-buit";
    buit.textContent = "Encara no tens cap playlist. Crea'n una a sota!";
    graellaPlaylists.appendChild(buit);
    return;
  }
  noms.forEach((nom, index) => {
    const cancons = playlists[nom];
    const targeta = document.createElement("div");
    targeta.className = "targeta-playlist";
    targeta.draggable = true;
    targeta.dataset.index = index;
    targeta.onclick = () => mostraDetall(nom);

    targeta.addEventListener("dragstart", (e) => {
      indexArrossegant = index;
      targeta.classList.add("arrossegant");
      e.dataTransfer.effectAllowed = "move";
    });

    targeta.addEventListener("dragend", () => {
      targeta.classList.remove("arrossegant");
      document.querySelectorAll(".targeta-playlist.sobre").forEach((t) => {
        t.classList.remove("sobre");
      });
    });

    targeta.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (indexArrossegant !== null && indexArrossegant !== index) {
        targeta.classList.add("sobre");
      }
    });

    targeta.addEventListener("dragleave", () => {
      targeta.classList.remove("sobre");
    });

    targeta.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      targeta.classList.remove("sobre");
      if (indexArrossegant === null || indexArrossegant === index) return;
      reordenaPlaylists(indexArrossegant, index);
      indexArrossegant = null;
    });

    const icona = document.createElement("div");
    icona.className = "icona";
    icona.textContent = "📋";
    targeta.appendChild(icona);

    const nomEl = document.createElement("div");
    nomEl.className = "nom";
    nomEl.textContent = nom;
    targeta.appendChild(nomEl);

    const quantitat = document.createElement("div");
    quantitat.className = "quantitat";
    quantitat.textContent =
      cancons.length + (cancons.length === 1 ? " cançó" : " cançons");
    targeta.appendChild(quantitat);

    graellaPlaylists.appendChild(targeta);
  });
}

async function reordenaPlaylists(desDe, fins) {
  const noms = Object.keys(playlists);
  const [moguda] = noms.splice(desDe, 1);
  noms.splice(fins, 0, moguda);
  await fetch("/api/playlists/reordena", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ noms: noms }),
  });
  await carregaPlaylists();
}

async function reordenaCancons(nomPL, desDe, fins) {
  const cancons = [...playlists[nomPL]];
  const [moguda] = cancons.splice(desDe, 1);
  cancons.splice(fins, 0, moguda);
  await fetch(
    "/api/playlists/" + encodeURIComponent(nomPL) + "/cancons/reordena",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancons: cancons }),
    }
  );
  await carregaPlaylists();
}

// ==================== DETALL D'UNA PLAYLIST ====================
function pintaDetall() {
  const nom = nomDetall;
  if (!playlists[nom]) {
    mostraGraella();
    return;
  }
  const cancons = playlists[nom];
  detallNom.textContent = "📋 " + nom;
  detallQuantitat.textContent =
    cancons.length + (cancons.length === 1 ? " cançó" : " cançons");

  detallCancons.innerHTML = "";
  if (cancons.length === 0) {
    const buit = document.createElement("li");
    buit.className = "missatge-buit";
    buit.textContent = "Aquesta playlist és buida. Cerca cançons a sota per afegir-ne!";
    detallCancons.appendChild(buit);
  } else {
    cancons.forEach((canco, i) => {
      const li = document.createElement("li");
      li.draggable = true;
      li.dataset.indexCanco = i;

      li.addEventListener("dragstart", (e) => {
        indexCancoArrossegant = i;
        li.classList.add("arrossegant");
        e.dataTransfer.effectAllowed = "move";
      });

      li.addEventListener("dragend", () => {
        li.classList.remove("arrossegant");
        document
          .querySelectorAll("#detall-cancons li.sobre")
          .forEach((el) => el.classList.remove("sobre"));
      });

      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (
          indexCancoArrossegant !== null &&
          indexCancoArrossegant !== i
        ) {
          li.classList.add("sobre");
        }
      });

      li.addEventListener("dragleave", () => {
        li.classList.remove("sobre");
      });

      li.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        li.classList.remove("sobre");
        if (
          indexCancoArrossegant === null ||
          indexCancoArrossegant === i
        )
          return;
        reordenaCancons(nom, indexCancoArrossegant, i);
        indexCancoArrossegant = null;
      });

      const botoPlay = document.createElement("button");
      botoPlay.textContent = "▶";
      botoPlay.className = "boto-play-canco";
      botoPlay.onclick = (e) => {
        e.stopPropagation();
        activaCua([...cancons], nom);
        reprodueix(i);
        tancaModal();
      };
      li.appendChild(botoPlay);

      const text = document.createElement("span");
      text.textContent = canco;
      li.appendChild(text);

      const botoTreu = document.createElement("button");
      botoTreu.textContent = "✕";
      botoTreu.className = "boto-perill";
      botoTreu.onclick = (e) => {
        e.stopPropagation();
        treuCancoDePlaylist(nom, canco);
      };
      li.appendChild(botoTreu);
      detallCancons.appendChild(li);
    });
  }

  document.getElementById("detall-reproduir").onclick = () => {
    if (cancons.length === 0) {
      alert("Aquesta playlist és buida!");
      return;
    }
    activaCua([...cancons], nom);
    reprodueix(0);
    tancaModal();
  };
  document.getElementById("detall-afegir").onclick = mostraAfegir;
  document.getElementById("detall-esborrar").onclick = () => esborraPlaylist(nom);
}

// ==================== VISTA AFEGIR CANÇONS ====================
function pintaAfegir() {
  afegirLlista.innerHTML = "";
  const aDins = playlists[nomDetall] || [];
  const text = afegirCerca.value.toLowerCase().trim();

  const disponibles = totesCancons.filter(
    (c) => !aDins.includes(c) && c.toLowerCase().includes(text)
  );

  if (disponibles.length === 0) {
    const buit = document.createElement("li");
    buit.className = "missatge-buit";
    buit.textContent =
      text === ""
        ? "No queden cançons per afegir — ja estan totes a la playlist!"
        : "Cap cançó coincideix amb la cerca.";
    afegirLlista.appendChild(buit);
    actualitzaBotoConfirmar();
    return;
  }

  disponibles.forEach((canco) => {
    const li = document.createElement("li");
    li.className = "item-afegir";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = cancoSeleccionades.has(canco);
    checkbox.onchange = () => {
      if (checkbox.checked) cancoSeleccionades.add(canco);
      else cancoSeleccionades.delete(canco);
      actualitzaBotoConfirmar();
    };

    const label = document.createElement("label");
    label.className = "etiqueta-afegir";
    label.appendChild(checkbox);
    const span = document.createElement("span");
    span.textContent = canco;
    label.appendChild(span);

    li.appendChild(label);
    afegirLlista.appendChild(li);
  });

  actualitzaBotoConfirmar();
}

function actualitzaBotoConfirmar() {
  const n = cancoSeleccionades.size;
  if (n === 0) {
    botoConfirmarAfegir.textContent = "✅ Afegir cançons seleccionades";
    botoConfirmarAfegir.disabled = true;
  } else if (n === 1) {
    botoConfirmarAfegir.textContent = "✅ Afegir 1 cançó";
    botoConfirmarAfegir.disabled = false;
  } else {
    botoConfirmarAfegir.textContent = "✅ Afegir " + n + " cançons";
    botoConfirmarAfegir.disabled = false;
  }
}

async function confirmaAfegir() {
  const cancons = Array.from(cancoSeleccionades);
  if (cancons.length === 0) return;
  for (const canco of cancons) {
    await fetch(
      "/api/playlists/" + encodeURIComponent(nomDetall) + "/cancons",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canco: canco }),
      }
    );
  }
  cancoSeleccionades.clear();
  await carregaPlaylists();
  mostraDetall(nomDetall);
}

afegirCerca.addEventListener("input", pintaAfegir);
botoConfirmarAfegir.onclick = confirmaAfegir;

// ==================== ACCIONS DE PLAYLISTS ====================
async function carregaPlaylists() {
  const r = await fetch("/api/playlists");
  playlists = await r.json();
  if (modal.classList.contains("obert")) {
    if (vistaModal === "graella") pintaGraella();
    else if (vistaModal === "detall") pintaDetall();
    else if (vistaModal === "afegir") pintaAfegir();
  }
  pintaLlistaCancons();
}

async function creaPlaylist() {
  const input = document.getElementById("nom-nova-playlist");
  const nom = input.value.trim();
  if (!nom) {
    alert("Has de posar un nom!");
    return;
  }
  const r = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom: nom }),
  });
  if (!r.ok) {
    const err = await r.json();
    alert("Error: " + err.error);
    return;
  }
  input.value = "";
  await carregaPlaylists();
}

async function esborraPlaylist(nom) {
  if (!confirm("Segur que vols esborrar la playlist '" + nom + "'?")) return;
  await fetch("/api/playlists/" + encodeURIComponent(nom), { method: "DELETE" });
  if (nomDetall === nom) mostraGraella();
  await carregaPlaylists();
}

async function afegeixCancoAPlaylist(nomPL, canco) {
  await fetch("/api/playlists/" + encodeURIComponent(nomPL) + "/cancons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ canco: canco }),
  });
  await carregaPlaylists();
}

async function treuCancoDePlaylist(nomPL, canco) {
  await fetch(
    "/api/playlists/" + encodeURIComponent(nomPL) +
      "/cancons/" + encodeURIComponent(canco),
    { method: "DELETE" }
  );
  await carregaPlaylists();
}

document.getElementById("boto-crear-playlist").onclick = creaPlaylist;

// ==================== BUSCADOR (llista principal) ====================
cercador.addEventListener("input", () => {
  const text = cercador.value.toLowerCase();
  const items = llista.querySelectorAll("li");
  let trobades = 0;
  items.forEach((item) => {
    if (item.textContent.toLowerCase().includes(text)) {
      item.style.display = "";
      trobades++;
    } else {
      item.style.display = "none";
    }
  });
  if (text === "") resultatCerca.textContent = "";
  else if (trobades === 0) resultatCerca.textContent = "No s'ha trobat cap cançó";
  else if (trobades === 1) resultatCerca.textContent = "1 cançó trobada";
  else resultatCerca.textContent = trobades + " cançons trobades";
});

// ==================== CÀRREGA INICIAL ====================
async function inicia() {
  try {
    const r = await fetch("/api/cancons");
    totesCancons = await r.json();
    activaCua([...totesCancons], "");
    pintaLlistaCancons();
    await carregaPlaylists();
  } catch (e) {
    llista.innerHTML = "<li>❌ Error carregant les cançons</li>";
    console.error(e);
  }
}

inicia();
