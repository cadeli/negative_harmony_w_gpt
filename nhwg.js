// Chronologie chromatique standard
const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Table d'équivalences pour gérer les bémols
const ENHARMONICS = {
    "DB": "C#", "EB": "D#", "FB": "E", "GB": "F#",
    "AB": "G#", "BB": "A#", "CB": "B", "E#": "F", "B#": "C"
};

/**
 * Convertit n'importe quelle note (ex: "Db", "c#") en index chromatique (0-11)
 */
function noteToIndex(note) {
    if (!note) return -1;
    let normalized = note.trim().toUpperCase();
    if (ENHARMONICS[normalized]) {
        normalized = ENHARMONICS[normalized];
    }
    return CHROMATIC_NOTES.indexOf(normalized);
}

function indexToNote(index) {
    return CHROMATIC_NOTES[(index % 12 + 12) % 12];
}

/**
 * Transpose une note selon l'axe d'harmonie négative de la tonalité
 * Axe standard : Tonique (0) <-> Quinte (7), Tierce Min (3) <-> Tierce Maj (4)
 */
function transposeNoteInNegativeHarmony(note, toniqueIndex) {
    const noteIndex = noteToIndex(note);
    if (noteIndex === -1) return note; // Conserve la chaîne originale si invalide

    // Distance relative par rapport à la tonique (0 à 11)
    const interval = (noteIndex - toniqueIndex + 12) % 12;

    // Réflexion sur l'axe : 0->7, 1->6, 2->5, 3->4, 4->3, 5->2, 6->1, 7->0...
    const negativeInterval = (7 - interval + 12) % 12;

    const transposedIndex = (toniqueIndex + negativeInterval) % 12;
    return indexToNote(transposedIndex);
}

/**
 * Dictionnaire d'accords (intervalles réduits modulo 12 et triés)
 */
const CHORD_LIBRARY = {
    "0,4,7": "maj",
    "0,3,7": "m",
    "0,4,7,10": "7",
    "0,4,7,11": "maj7",
    "0,3,7,10": "m7",
    "0,4,7,9": "6",
    "0,3,7,9": "m6",
    "0,2,4,7,10": "9",
    "0,2,3,7,10": "m9",
    "0,2,4,7,11": "maj9",
    "0,2,3,5,7,10": "m11",
    "0,2,4,5,7,10": "11",
    "0,2,4,7,9,10": "13",
    "0,2,3,7,9,10": "m13",
    "0,2,7": "sus2",
    "0,5,7": "sus4",
    "0,3,6": "dim",
    "0,4,8": "aug",
    "0,1,4,7,10": "7b9",
    "0,3,4,7,10": "7#9",
    "0,3,6,10": "m7b5",
    "0,3,6,9": "dim7"
};

/**
 * Génère les notes d'un accord donné (ex: "Cmaj7", "F#m", "Bb7")
 */
function getChordNotes(chord) {
    const match = chord.trim().match(/^([A-G][b#]?)(.*)$/i);
    if (!match) return [];

    const root = match[1];
    let quality = match[2] || "maj";
    if (quality === "") quality = "maj";

    const rootIndex = noteToIndex(root);
    if (rootIndex === -1) return [];

    // Recherche inverse dans CHORD_LIBRARY
    let targetIntervals = null;
    for (const [key, value] of Object.entries(CHORD_LIBRARY)) {
        if (value === quality) {
            targetIntervals = key.split(",").map(Number);
            break;
        }
    }

    if (!targetIntervals) return [];

    return targetIntervals.map(interval => indexToNote(rootIndex + interval));
}

/**
 * Identifie un accord à partir d'une liste de notes en testant toutes les fondamentales possibles
 */
function identifyChord(notesArray) {
    if (!notesArray || notesArray.length === 0) return "cannot read chord";

    const uniqueIndexes = [...new Set(notesArray.map(n => noteToIndex(n)).filter(i => i !== -1))];

    // Tester chaque note comme fondamentale potentielle
    for (const rootIndex of uniqueIndexes) {
        const intervals = uniqueIndexes
            .map(idx => (idx - rootIndex + 12) % 12)
            .sort((a, b) => a - b);

        const key = intervals.join(",");
        if (CHORD_LIBRARY[key]) {
            const rootName = indexToNote(rootIndex);
            const chordType = CHORD_LIBRARY[key] === "maj" ? "" : CHORD_LIBRARY[key];
            return `${rootName}${chordType}`;
        }
    }

    return "cannot read chord";
}

/**
 * Fonction principale reliée à l'IHM
 */
function transposer() {
    const toneInput = document.getElementById("tone")?.value;
    const notesInput = document.getElementById("notes")?.value;
    const accordInput = document.getElementById("accord")?.value;

    const toniqueIndex = noteToIndex(toneInput);

    if (toniqueIndex === -1) {
        alert("Tonalité invalide ! Utilisez une note comme C, D#, Bb, etc.");
        return;
    }

    // 1. Traitement de la suite de notes
    if (notesInput && notesInput.trim() !== "") {
        const notesArray = notesInput.trim().split(/\s+/);
        const transposedNotes = notesArray.map(note => transposeNoteInNegativeHarmony(note, toniqueIndex));
        
        const resNotes = document.getElementById("resultatNotes");
        if (resNotes) resNotes.innerText = transposedNotes.join(" ");
    }

    // 2. Traitement de l'accord
    if (accordInput && accordInput.trim() !== "") {
        const chordNotes = getChordNotes(accordInput);
        
        if (chordNotes.length === 0) {
            alert("Accord non reconnu ou format invalide !");
            return;
        }

        const transposedChordNotes = chordNotes.map(note => transposeNoteInNegativeHarmony(note, toniqueIndex));
        const transposedChordName = identifyChord(transposedChordNotes);

        const resAccord = document.getElementById("resultatAccord");
        if (resAccord) {
            resAccord.innerText = `${transposedChordName} (${transposedChordNotes.join(" ")})`;
        }
    }
}
