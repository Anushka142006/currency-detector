#!/usr/bin/env bash
# exit on error
set -o errexit

# Upgrade pip to avoid version errors
pip install --upgrade pip

# Install the corrected requirements.txt
pip install -r requirements.txt

# This line ensures the YOLO model is downloaded and ready on the server
python -c "from ultralytics import YOLO; YOLO('best_currency_v2.pt')"
