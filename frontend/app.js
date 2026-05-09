// ==================== ESTAT ====================
let totesCancons = [];   // totes les cançons del servidor
let playlists = {};       // {"nom": ["cancio1.mp3", ...]}
let cuaActual = [];       // llista que sona ara (totes o d'una playlist)
let nomCuaActual = "";    // "" = totes les cançons, sinó nom de la playlist
let indexActual = -1;     // posició dins de cuaActual
let estatCerquesPlaylists = {}; // recorda la cerca de cada playlist {"nom": "text"}

// ==================== ELEMENTS DEL DOM ====================
const reproductor = document.getElementById("reproductor");
const titolActual = document.getElementById("titol-actual");
const cuaActualText = document.getElementById("cua-actual");
const llista = document.getElementById("llista-cancons");
const contenidorPlaylists = document.getElementById("contenidor-playlists");
const cercador = document.getElementById("cercador");
const resultatCerca = document.getElementById("resultat-cerca");

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

// ==================== LLISTA DE CANÇONS ====================
function pintaLlistaCancons() {
  llista.innerHTML = "";
  totesCancons.forEach((canco, i) => {
    const item = document.createElement("li");

    // Botó play
    const botoPlay = document.createElement("button");
    botoPlay.textContent = "▶";
    botoPlay.onclick = () => {
      activaCua([...totesCancons], "");
      reprodueix(i);
    };
    item.appendChild(botoPlay);
    item.append(" " + canco + " ");

    // Selector per afegir a una playlist
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

// ==================== PLAYLISTS ====================
async function carregaPlaylists() {
  const r = await fetch("/api/playlists");
  playlists = await r.json();
  pintaPlaylists();
  pintaLlistaCancons(); // recarreguem el selector "Afegir a..." amb les playlists noves
}

function pintaPlaylists() {
  contenidorPlaylists.innerHTML = "";
  const noms = Object.keys(playlists);
  if (noms.length === 0) {
    contenidorPlaylists.innerHTML = "<p><i>Encara no tens cap playlist. Crea'n una!</i></p>";
    return;
  }
  noms.forEach((nom) => {
    const cancons = playlists[nom];
    const div = document.createElement("div");

    const titol = document.createElement("h3");
    titol.textContent = "📋 " + nom + " (" + cancons.length + " cançons)";
    div.appendChild(titol);

    const botoPlay = document.createElement("button");
    botoPlay.textContent = "▶ Reproduir tota";
    botoPlay.onclick = () => {
      if (cancons.length === 0) {
        alert("Aquesta playlist és buida!");
        return;
      }
      activaCua([...cancons], nom);
      reprodueix(0);
    };
    div.appendChild(botoPlay);

    const botoEsborra = document.createElement("button");
    botoEsborra.textContent = "🗑️ Esborrar playlist";
    botoEsborra.onclick = () => esborraPlaylist(nom);
    div.appendChild(botoEsborra);

    const ul = document.createElement("ul");
    cancons.forEach((canco) => {
      const li = document.createElement("li");
      li.textContent = canco + " ";
      const botoTreu = document.createElement("button");
      botoTreu.textContent = "✕";
      botoTreu.onclick = () => treuCancoDePlaylist(nom, canco);
      li.appendChild(botoTreu);
      ul.appendChild(li);
    });
    div.appendChild(ul);

    // --- Buscador per afegir cançons a aquesta playlist ---
    const cercaDiv = document.createElement("div");
    cercaDiv.className = "afegir-cancons";

    const cercaInput = document.createElement("input");
    cercaInput.type = "search";
    cercaInput.placeholder = "🔍 Cerca cançons per afegir...";

    const suggerimentsDiv = document.createElement("div");
    suggerimentsDiv.className = "suggeriments";

    function actualitzaSuggeriments() {
      const text = cercaInput.value.toLowerCase().trim();
      suggerimentsDiv.innerHTML = "";
      if (!text) return;

      const candidats = totesCancons.filter(
        (c) => c.toLowerCase().includes(text) && !cancons.includes(c)
      );

      if (candidats.length === 0) {
        const p = document.createElement("p");
        p.className = "sense-resultats";
        p.textContent = "No hi ha cançons que coincideixin (o ja estan totes afegides)";
        suggerimentsDiv.appendChild(p);
        return;
      }

      candidats.forEach((c) => {
        const item = document.createElement("div");
        item.className = "suggeriment";
        item.textContent = "➕ " + c;
        item.onclick = () => afegeixCancoAPlaylist(nom, c);
        suggerimentsDiv.appendChild(item);
      });
    }

    cercaInput.addEventListener("input", () => {
      estatCerquesPlaylists[nom] = cercaInput.value;
      actualitzaSuggeriments();
    });

    cercaDiv.appendChild(cercaInput);
    cercaDiv.appendChild(suggerimentsDiv);
    div.appendChild(cercaDiv);

    // Si estàvem cercant abans del re-render, restaura el text
    if (estatCerquesPlaylists[nom]) {
      cercaInput.value = estatCerquesPlaylists[nom];
      actualitzaSuggeriments();
    }

    contenidorPlaylists.appendChild(div);
  });
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

// ==================== BUSCADOR ====================
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
