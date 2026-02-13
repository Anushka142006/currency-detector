#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

# This line ensures the YOLO model is ready
python -c "from ultralytics import YOLO; YOLO('best_currency_v2.pt')"