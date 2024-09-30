
const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteToIndex(note) {
    return notes.indexOf(note.toUpperCase());
}

function indexToNote(index) {
    return notes[(index + 12) % 12];
}

function transposeNoteInNegativeHarmony(note, toniqueIndex) {
    const noteIndex = noteToIndex(note);
    if (noteIndex === -1) return note; // Note invalide

    const transpositionRules = {
        0: 7,   // Tonique (0) -> Quinte (7)
        1: 6,   // Seconde bémol (1) -> Quinte bémol (6)
        2: 5,   // Seconde (2) -> Quarte (5)
        3: 4,   // Tierce mineure (3) -> Tierce majeure (4)
        4: 3,   // Tierce majeure (4) -> Tierce mineure (3)
        5: 2,   // Quarte (5) -> Seconde (2)
        7: 0,   // Quinte (7) -> Tonique (0)
        6: 1,   // Quinte bémol (6) -> Seconde bémol (1)
        9: 10,  // Sixte (9) -> Septième bémol (10)
        8: 11,  // Sixte bémol (8) -> Septième majeure (11)
        10: 9,  // Septième bémol (10) -> Sixte (9)
        11: 8   // Septième majeure (11) -> Sixte bémol (8)
    };

    const interval = (noteIndex - toniqueIndex + 12) % 12;
    const transposedInterval = transpositionRules[interval];

    if (transposedInterval === undefined) return note;

    const transposedIndex = (toniqueIndex + transposedInterval) % 12;
    return indexToNote(transposedIndex);
}

function getChordNotes(chord) {
    const basicChords = {
        "maj": [0, 4, 7],
        "m": [0, 3, 7],
        "7": [0, 4, 7, 10],
        "maj7": [0, 4, 7, 11],
        "m7": [0, 3, 7, 10],
        "6": [0, 4, 7, 9],
        "m6": [0, 3, 7, 9],
        "9": [0, 4, 7, 10, 14],
        "m9": [0, 3, 7, 10, 14],
        "maj9": [0, 4, 7, 11, 14],
        "11": [0, 4, 7, 10, 14, 17],
        "m11": [0, 3, 7, 10, 14, 17],
        "13": [0, 4, 7, 10, 14, 21],
        "m13": [0, 3, 7, 10, 14, 21],
        "sus2": [0, 2, 7],
        "sus4": [0, 5, 7],
        "dim": [0, 3, 6],
        "aug": [0, 4, 8],
        "7b9": [0, 4, 7, 10, 13],
        "7#9": [0, 4, 7, 10, 15],
        "7#11": [0, 4, 7, 10, 18],
        "7b13": [0, 4, 7, 10, 20],
        "m7b5": [0, 3, 6, 10],  // Ajout de Bm7b5
        "dim7": [0, 3, 6, 9]    // Ajout de dim7
    };

    let root = chord.match(/^[A-G][b#]?/)[0].toUpperCase();
    let quality = chord.slice(root.length);

    if (quality === "") quality = "maj";

    const rootIndex = noteToIndex(root);
    const intervals = basicChords[quality];

    if (!intervals) return [];

    return intervals.map(interval => indexToNote(rootIndex + interval));
}

function identifyChord(notes) {
    const tonic = notes[notes.length - 1]; // Dernière note comme tonique
    const tonicIndex = noteToIndex(tonic);

    const intervals = notes.map(note => (noteToIndex(note) - tonicIndex + 12) % 12);
    intervals.sort((a, b) => a - b);

    const chordTypes = {
        "0,4,7": "maj",
        "0,3,7": "m",
        "0,4,7,10": "7",
        "0,4,7,11": "maj7",
        "0,3,7,10": "m7",
        "0,4,7,9": "6",
        "0,3,7,9": "m6",
        "0,4,7,10,14": "9",
        "0,3,7,10,14": "m9",
        "0,4,7,11,14": "maj9",
        "0,4,7,10,14,17": "11",
        "0,3,7,10,14,17": "m11",
        "0,4,7,10,14,21": "13",
        "0,3,7,10,14,21": "m13",
        "0,2,7": "sus2",
        "0,5,7": "sus4",
        "0,3,6": "dim",
        "0,4,8": "aug",
        "0,4,7,10,13": "7b9",
        "0,4,7,10,15": "7#9",
        "0,4,7,10,18": "7#11",
        "0,4,7,10,20": "7b13",
        "0,3,6,10": "m7b5",  // Reconnaissance de m7b5
        "0,3,6,9": "dim7"    // Reconnaissance de dim7
    };

    const key = intervals.join(",");
    const chordType = chordTypes[key];

    return chordType ? `${tonic}${chordType}` : "Accord non identifié";
}

function transposer() {
    const tonique = document.getElementById("tone").value.trim();
    const notesInput = document.getElementById("notes").value.trim();
    const accordInput = document.getElementById("accord").value.trim();
    const toniqueIndex = noteToIndex(tonique);

    if (toniqueIndex === -1) {
        alert("Tonalité invalide !");
        return;
    }

    // Pour la suite de notes
    if (notesInput) {
        const notesArray = notesInput.split(/\s+/);
        const transposedNotes = notesArray.map(note => transposeNoteInNegativeHarmony(note, toniqueIndex));
        document.getElementById("resultatNotes").innerText = `Notes transposées : ${transposedNotes.join(" ")}`;
    }

    // Pour l'accord
    if (accordInput) {
        const chordNotes = getChordNotes(accordInput);
        const transposedChordNotes = chordNotes.map(note => transposeNoteInNegativeHarmony(note, toniqueIndex));
        const transposedChordName = identifyChord(transposedChordNotes);
        document.getElementById("resultatAccord").innerText = `Accord transposé : ${transposedChordName} (${transposedChordNotes.join(" ")})`;
    }
}