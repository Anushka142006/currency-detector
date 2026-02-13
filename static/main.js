let selectedLanguage = "english";
let isDetectionActive = false;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const status = document.getElementById('status');

const translations = {
    english: { prompt: "Please show the notes", code: "en-US" },
    hindi: { prompt: "कृपया नोट दिखाएं", code: "hi-IN" },
    marathi: { prompt: "कृपया नोटा दाखवा", code: "mr-IN" }
};

async function startApp() {
    document.getElementById('startArea').style.display = 'none';
    
    // 1. Request Camera Permission on Phone
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" }, // Forces BACK camera
            audio: false 
        });
        video.srcObject = stream;
        status.innerText = "Camera Active. Picking language...";
    } catch (err) {
        status.innerText = "Camera Error: " + err.message;
        return;
    }

    // 2. Immediate Voice Wake-up
    speak("Choose English, Hindi, or Marathi", "en-US", listenForLanguage);
}

function speak(text, lang, callback) {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = lang;
    if (callback) msg.onend = callback;
    window.speechSynthesis.speak(msg);
}

function listenForLanguage() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    status.innerText = "Listening for language...";

    recognition.onresult = (event) => {
        const res = event.results[0][0].transcript.toLowerCase();
        if (res.includes("marathi")) selectedLanguage = "marathi";
        else if (res.includes("hindi")) selectedLanguage = "hindi";
        else selectedLanguage = "english";

        const t = translations[selectedLanguage];
        speak(t.prompt, t.code, () => {
            isDetectionActive = true;
            status.innerText = "Detection Active (" + selectedLanguage + ")";
            startDetectionLoop();
        });
    };
    recognition.start();
}

function startDetectionLoop() {
    const context = canvas.getContext('2d');
    // Slowed down to 3 seconds to give Render's CPU time to think
    setInterval(() => {
        if (!isDetectionActive) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.4); // Compressed more for speed
        
        // Use relative path "/" to ensure it hits your Render server correctly
        fetch("/process_frame", {
            method: "POST",
            body: JSON.stringify({ image: imageData }),
            headers: { "Content-Type": "application/json" }
        })
        .then(res => {
            if (!res.ok) throw new Error("Server busy");
            return res.json();
        })
        .then(data => {
            console.log("Detection:", data.notes);
            if (data.notes && data.notes.length > 0) {
                // Prepare the sentence
                let textToSpeak = data.notes.join(" and ");
                speak(textToSpeak, translations[selectedLanguage].code);
            }
        })
        .catch(err => console.log("Detection error:", err));
    }, 3000); 
}
