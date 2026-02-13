import os, base64, cv2, numpy as np
from flask import Flask, render_template, request, jsonify
from ultralytics import YOLO

app = Flask(__name__)
model = YOLO("best_currency_v2.pt")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/process_frame", methods=["POST"])
def process_frame():
    data = request.json['image']
    # Decode image from phone
    encoded_data = data.split(',')[1]
    nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Run YOLO
    results = model(frame, conf=0.6)
    notes = [model.names[int(box.cls[0])] for r in results for box in r.boxes]
    
    return jsonify({"notes": notes})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
