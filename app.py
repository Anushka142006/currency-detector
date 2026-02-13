import os
from flask import Flask, render_template, Response, jsonify
import cv2
from ultralytics import YOLO

app = Flask(__name__)

# Load Model
model = YOLO("best_currency_v2.pt")

# Mobile Tip: If using the app on a phone, the browser handles the camera stream 
# better if we initialize the camera inside the generator. 
# However, for Render, this setup is standard.
camera = cv2.VideoCapture(0) 

def generate_frames():
    global latest_notes
    while True:
        success, frame = camera.read()
        if not success:
            break

        # conf=0.60, iou=0.3, imgsz=640 for angle accuracy
        results = model(frame, conf=0.60, iou=0.3, imgsz=640, verbose=False)
        
        current_frame_notes = []
        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                label = model.names[cls]
                current_frame_notes.append(label)

        global latest_notes
        latest_notes = current_frame_notes 

        # Draw boxes on screen
        annotated = results[0].plot()
        ret, buffer = cv2.imencode(".jpg", annotated)
        
        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/get_notes")
def get_notes():
    return jsonify({"notes": latest_notes})

if __name__ == "__main__":
    # Get port from Render's environment, default to 5000
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)