let lastSpokenText = "";
let selectedLanguage = "english";
let isDetectionActive = false;

const marathiVocab = {
    "10": "दहा", "20": "वीस", "30": "तीस", "40": "चाळीस", "50": "पन्नास",
    "100": "शंभर", "110": "एकशे दहा", "120": "एकशे वीस", "150": "एकशे पन्नास",
    "200": "दोनशे", "500": "पाचशे", "2000": "दोन हजार"
};

const translations = {
    english: { prompt: "Please show the notes", and: " and ", total: "Total ", curr: " rupees", code: "en-US" },
    hindi: { prompt: "कृपया नोट दिखाएं", and: " और ", total: "कुल ", curr: " रुपये", code: "hi-IN" },
    marathi: { prompt: "कृपया नोटा दाखवा", and: " आणि ", total: "एकूण ", curr: " रुपये", code: "mr-IN" }
};

// --- FORCE VOICE LOAD ---
window.speechSynthesis.getVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

function toMarathiWords(num) {
    let s = num.toString();
    if (marathiVocab[s]) return marathiVocab[s];
    let val = parseInt(num);
    if (val > 100 && val < 200) return "एकशे " + (marathiVocab[(val - 100).toString()] || (val - 100));
    if (val > 200 && val < 300) return "दोनशे " + (marathiVocab[(val - 200).toString()] || (val - 200));
    return s;
}

function speak(text, lang, callback) {
    window.speechSynthesis.cancel();
    
    // Create a new utterance
    const msg = new SpeechSynthesisUtterance(text);
    let voices = window.speechSynthesis.getVoices();
    
    // Find the specific voice
    let target = voices.find(v => v.lang.includes(lang));
    if (!target && lang === "mr-IN") {
        target = voices.find(v => v.lang.includes('hi-IN'));
        msg.lang = "hi-IN";
    } else {
        msg.lang = lang;
    }

    if (target) msg.voice = target;
    msg.rate = 1.1; 
    
    // Crucial: Handle the callback for the language prompt
    if (callback) {
        msg.onend = () => {
            console.log("Speech finished, executing callback...");
            callback();
        };
    }
    
    // Force the engine to stay awake
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(msg);
}

// --- NEW HIGH-PRIORITY START ---
function startApp() {
    document.getElementById('startArea').style.display = 'none';
    document.getElementById('appArea').style.display = 'block';

    // 1. Create a "Silent Audio" Heartbeat to keep the browser audio thread alive
    const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    silentAudio.loop = true;
    silentAudio.play().catch(e => console.log("Audio kickstart required"));

    // 2. Initial English prompt to clear the engine
    setTimeout(() => {
        speak("Select English, Hindi, or Marathi.", "en-US", listenForLanguage);
    }, 200);
}

function listenForLanguage() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    document.getElementById('status').innerText = "Listening...";

    recognition.onresult = (event) => {
        const res = event.results[0][0].transcript.toLowerCase();
        console.log("Heard Choice: " + res);

        if (res.includes("marathi") || res.includes("marati") || res.includes("mara")) selectedLanguage = "marathi";
        else if (res.includes("hindi")) selectedLanguage = "hindi";
        else selectedLanguage = "english";

        document.getElementById('status').innerText = "Mode: " + selectedLanguage.toUpperCase();
        
        // INSTANT TRIGGER
        const t = translations[selectedLanguage];
        // We call speak immediately without any extra timeouts
        speak(t.prompt, t.code, () => { 
            isDetectionActive = true; 
            document.getElementById('status').innerText = "System Ready - Show Notes";
        });
    };
    
    recognition.onerror = () => {
        selectedLanguage = "english";
        isDetectionActive = true;
        speak(translations.english.prompt, "en-US");
    };
    
    recognition.start();
}

// Detection Loop
setInterval(() => {
    if (!isDetectionActive) return;

    fetch("/get_notes")
        .then(res => res.json())
        .then(data => {
            if (!data.notes || data.notes.length === 0) {
                lastSpokenText = "";
                return;
            }

            let t = translations[selectedLanguage];
            let noteLabels = [];
            let totalVal = 0;

            // Sort alphabetical to keep speech consistent
            data.notes.sort().forEach(note => {
                let val = parseInt(note);
                totalVal += val;
                if (selectedLanguage === "marathi") noteLabels.push(marathiVocab[note] || note);
                else noteLabels.push(note);
            });

            let finalTotal = (selectedLanguage === "marathi") ? toMarathiWords(totalVal) : totalVal;
            let currentSpeech = noteLabels.join(t.and) + t.curr + ". " + t.total + finalTotal + t.curr;

            if (currentSpeech !== lastSpokenText) {
                lastSpokenText = currentSpeech;
                speak(currentSpeech, t.code);
            }
        });
}, 1800);