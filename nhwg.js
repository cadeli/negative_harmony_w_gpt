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


// --- MOTEUR AUDIO (Web Audio API) ---

let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// Convertit un nom de note en fréquence (Octave 4 par défaut)
function noteToFrequency(noteName, octave = 4) {
    const cleanNote = noteName.trim().toUpperCase();
    const index = noteToIndex(cleanNote);
    if (index === -1) return null;

    // A4 = 440Hz = Index 9 à l'octave 4
    const midiNote = (octave + 1) * 12 + index;
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Joue une note unique avec une enveloppe douce
function playTone(freq, startTime, duration) {
    if (!freq) return;
    const ctx = getAudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine'; // 'sine' pour un son doux, 'triangle' pour un son plus chaud
    osc.frequency.setValueAtTime(freq, startTime);

    // Enveloppe d'attaque et de relâchement (éviter les clics audio)
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
}

// Joue la mélodie transposée note par note (séquence)
function playTransposedMelody() {
    const text = document.getElementById("resultatNotes").innerText.trim();
    if (!text) return;

    const notes = text.split(/\s+/);
    const ctx = getAudioContext();
    let now = ctx.currentTime;
    const noteDuration = 0.4; // Durée de chaque note en secondes

    notes.forEach((note, index) => {
        const freq = noteToFrequency(note, 4);
        playTone(freq, now + (index * noteDuration), noteDuration);
    });
}

// Joue l'accord transposé (toutes les notes simultanément)
function playTransposedChord() {
    const text = document.getElementById("resultatAccord").innerText.trim();
    if (!text) return;

    // Extrait les notes entre parenthèses ex: "Dm7b5 (D F Ab C)" -> "D F Ab C"
    const match = text.match(/\(([^)]+)\)/);
    const notesText = match ? match[1] : text;
    const notes = notesText.split(/\s+/);

    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const chordDuration = 1.5; // Durée de l'accord

    notes.forEach((note) => {
        const freq = noteToFrequency(note, 4);
        playTone(freq, now, chordDuration);
    });
}

// --- FONCTIONS DE LECTURE AUDIO (ORIGINALE & TRANSPOSÉE) ---

// 1. Mélodie Originale
function playOriginalMelody() {
    const input = document.getElementById("notes")?.value.trim();
    if (!input) return;

    const notes = input.split(/\s+/);
    playMelodyArray(notes);
}

// 2. Mélodie Transposée (Négative)
function playTransposedMelody() {
    const text = document.getElementById("resultatNotes")?.innerText.trim();
    if (!text) return;

    const notes = text.split(/\s+/);
    playMelodyArray(notes);
}

// 3. Accord Original
function playOriginalChord() {
    const input = document.getElementById("accord")?.value.trim();
    if (!input) return;

    const chordNotes = getChordNotes(input);
    if (chordNotes.length > 0) {
        playChordArray(chordNotes);
    }
}

// 4. Accord Transposé (Négatif)
function playTransposedChord() {
    const text = document.getElementById("resultatAccord")?.innerText.trim();
    if (!text) return;

    // Extrait les notes entre parenthèses ex: "Dm7b5 (D F Ab C)" -> "D F Ab C"
    const match = text.match(/\(([^)]+)\)/);
    const notesText = match ? match[1] : text;
    const notes = notesText.split(/\s+/);

    playChordArray(notes);
}


// --- HELPER AUDIO (Génériques) ---

function playMelodyArray(notesArray) {
    const ctx = getAudioContext();
    let now = ctx.currentTime;
    const noteDuration = 0.4;

    notesArray.forEach((note, index) => {
        const freq = noteToFrequency(note, 4);
        playTone(freq, now + (index * noteDuration), noteDuration);
    });
}

function playChordArray(notesArray) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const chordDuration = 1.5;

    notesArray.forEach((note) => {
        const freq = noteToFrequency(note, 4);
        playTone(freq, now, chordDuration);
    });
}
