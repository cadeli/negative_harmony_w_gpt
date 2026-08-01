// --- BASE MUSICALE ---
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const ENHARMONICS = { "DB": "C#", "EB": "D#", "FB": "E", "GB": "F#", "AB": "G#", "BB": "A#", "CB": "B", "E#": "F", "B#": "C" };

// Normalise et convertit une note en index (0-11)
const noteToIndex = note => {
    if (!note) return -1;
    let n = note.trim().toUpperCase();
    return NOTES.indexOf(ENHARMONICS[n] || n);
};

const indexToNote = i => NOTES[(i % 12 + 12) % 12];

// --- ALGORITHME D'HARMONIE NÉGATIVE (Formule directe en 1 ligne) ---
function transposeNoteInNegativeHarmony(note, toniqueIndex) {
    const noteIdx = noteToIndex(note);
    if (noteIdx === -1) return note;
    // Formule condensée de la réflexion autour de l'axe Tonique/Quinte
    return indexToNote(2 * toniqueIndex + 7 - noteIdx);
}

// --- STRUCTURES D'ACCORDS (Format minimaliste) ---
const CHORDS = {
    "maj": [0,4,7], "m": [0,3,7], "7": [0,4,7,10], "maj7": [0,4,7,11], "m7": [0,3,7,10],
    "6": [0,4,7,9], "m6": [0,3,7,9], "sus2": [0,2,7], "sus4": [0,5,7], "dim": [0,3,6], "aug": [0,4,8], "m7b5": [0,3,6,10]
};

// Extrait les notes d'un accord
function getChordNotes(chord) {
    const match = chord.trim().match(/^([A-G][b#]?)(.*)$/i);
    if (!match) return [];
    const rootIdx = noteToIndex(match[1]);
    const quality = match[2] || "maj";
    const intervals = CHORDS[quality];
    return intervals ? intervals.map(i => indexToNote(rootIdx + i)) : [];
}

// Identification simplifiée : cherche la fondamentale correspondante
function identifyChord(notesArray) {
    const indexes = notesArray.map(noteToIndex).filter(i => i !== -1);
    for (const rootIdx of indexes) {
        const intervals = [...new Set(indexes.map(i => (i - rootIdx + 12) % 12))].sort((a, b) => a - b).join(",");
        for (const [name, pattern] of Object.entries(CHORDS)) {
            if (pattern.join(",") === intervals) {
                return `${indexToNote(rootIdx)}${name === "maj" ? "" : name}`;
            }
        }
    }
    return "cannot read chord";
}

// --- FONCTION PRINCIPALE ---
function transposer() {
    const toniqueIdx = noteToIndex(document.getElementById("tone")?.value);
    if (toniqueIdx === -1) return alert("Tonalité invalide !");

    // Séquence
    const notesInput = document.getElementById("notes")?.value.trim();
    if (notesInput) {
        const res = notesInput.split(/\s+/).map(n => transposeNoteInNegativeHarmony(n, toniqueIdx));
        document.getElementById("resultatNotes").innerText = res.join(" ");
    }

    // Accord
    const accordInput = document.getElementById("accord")?.value.trim();
    if (accordInput) {
        const chordNotes = getChordNotes(accordInput);
        if (!chordNotes.length) return alert("Accord invalide !");
        const resNotes = chordNotes.map(n => transposeNoteInNegativeHarmony(n, toniqueIdx));
        document.getElementById("resultatAccord").innerText = `${identifyChord(resNotes)} (${resNotes.join(" ")})`;
    }
}

// --- MOTEUR AUDIO AUDIO COMPACT ---
let audioCtx = null;
const getCtx = () => audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, start, duration) {
    if (!freq) return;
    const ctx = getCtx(), osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(start); osc.stop(start + duration);
}

const noteFreq = note => 440 * Math.pow(2, ((4 + 1) * 12 + noteToIndex(note) - 69) / 12);

const playSeq = (notes, step = 0.4) => {
    const ctx = getCtx(), now = ctx.currentTime;
    notes.forEach((n, i) => playTone(noteFreq(n), now + (i * step), step));
};

const playChord = notes => {
    const ctx = getCtx(), now = ctx.currentTime;
    notes.forEach(n => playTone(noteFreq(n), now, 1.5));
};

// Handlers IHM
const playOriginalMelody = () => playSeq(document.getElementById("notes")?.value.trim().split(/\s+/) || []);
const playTransposedMelody = () => playSeq(document.getElementById("resultatNotes")?.innerText.trim().split(/\s+/) || []);
const playOriginalChord = () => playChord(getChordNotes(document.getElementById("accord")?.value || ""));
const playTransposedChord = () => {
    const text = document.getElementById("resultatAccord")?.innerText.trim();
    const match = text?.match(/\(([^)]+)\)/);
    if (match) playChord(match[1].split(/\s+/));
};

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
