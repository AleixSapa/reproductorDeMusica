import json
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

CARPETA_BASE = Path(__file__).parent.parent
CARPETA_MUSICA = CARPETA_BASE / "musica"
CARPETA_FRONTEND = CARPETA_BASE / "frontend"
FITXER_PLAYLISTS = Path(__file__).parent / "playlists.json"
EXTENSIONS_MUSICA = {".mp3", ".m4a", ".wav", ".ogg", ".flac"}

app = Flask(
    __name__,
    static_folder=str(CARPETA_FRONTEND),
    static_url_path="",
)


# --- Funcions auxiliars per llegir/escriure el fitxer de playlists ---

def llegir_playlists():
    if not FITXER_PLAYLISTS.exists():
        return {}
    with open(FITXER_PLAYLISTS, "r", encoding="utf-8") as f:
        return json.load(f)


def desar_playlists(playlists):
    with open(FITXER_PLAYLISTS, "w", encoding="utf-8") as f:
        json.dump(playlists, f, ensure_ascii=False, indent=2)


# --- Pàgina principal i música ---

@app.route("/")
def index():
    return send_from_directory(CARPETA_FRONTEND, "index.html")


@app.route("/api/cancons")
def llista_cancons():
    cancons = []
    for fitxer in CARPETA_MUSICA.iterdir():
        if fitxer.suffix.lower() in EXTENSIONS_MUSICA:
            cancons.append(fitxer.name)
    cancons.sort()
    return jsonify(cancons)


@app.route("/api/musica/<path:nom>")
def serveix_canco(nom):
    return send_from_directory(CARPETA_MUSICA, nom)


# --- Playlists ---

@app.route("/api/playlists", methods=["GET"])
def get_playlists():
    return jsonify(llegir_playlists())


@app.route("/api/playlists", methods=["POST"])
def crea_playlist():
    dades = request.get_json()
    nom = (dades.get("nom") or "").strip()
    if not nom:
        return jsonify({"error": "El nom no pot estar buit"}), 400
    playlists = llegir_playlists()
    if nom in playlists:
        return jsonify({"error": "Ja existeix"}), 400
    playlists[nom] = []
    desar_playlists(playlists)
    return jsonify({"ok": True})


@app.route("/api/playlists/reordena", methods=["POST"])
def reordena_playlists():
    nous_noms = request.get_json().get("noms", [])
    playlists = llegir_playlists()
    nou_ordre = {nom: playlists[nom] for nom in nous_noms if nom in playlists}
    # Conserva qualsevol playlist que no estigués a la llista (per seguretat)
    for nom, cançons in playlists.items():
        if nom not in nou_ordre:
            nou_ordre[nom] = cançons
    desar_playlists(nou_ordre)
    return jsonify({"ok": True})


@app.route("/api/playlists/<nom>", methods=["DELETE"])
def esborra_playlist(nom):
    playlists = llegir_playlists()
    if nom in playlists:
        del playlists[nom]
        desar_playlists(playlists)
    return jsonify({"ok": True})


@app.route("/api/playlists/<nom>/cancons", methods=["POST"])
def afegeix_canco_a_playlist(nom):
    dades = request.get_json()
    canco = dades.get("canco", "")
    playlists = llegir_playlists()
    if nom not in playlists:
        return jsonify({"error": "Playlist no trobada"}), 404
    if canco not in playlists[nom]:
        playlists[nom].append(canco)
        desar_playlists(playlists)
    return jsonify({"ok": True})


@app.route("/api/playlists/<nom>/cancons/<path:canco>", methods=["DELETE"])
def treu_canco_de_playlist(nom, canco):
    playlists = llegir_playlists()
    if nom in playlists and canco in playlists[nom]:
        playlists[nom].remove(canco)
        desar_playlists(playlists)
    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
