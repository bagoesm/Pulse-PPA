#!/bin/bash
# scripts/download_models.sh
# Download face-api.js model weights from jsdelivr CDN

TARGET_DIR="public/models"
mkdir -p "$TARGET_DIR"

BASE_URL="https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model"

FILES=(
  "ssd_mobilenetv1_model-weights_manifest.json"
  "ssd_mobilenetv1_model.bin"
  "tiny_face_detector_model-weights_manifest.json"
  "tiny_face_detector_model.bin"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model.bin"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model.bin"
)

echo "Downloading face-api models to $TARGET_DIR..."

for FILE in "${FILES[@]}"; do
  if [ -f "$TARGET_DIR/$FILE" ]; then
    echo "$FILE already exists, skipping."
  else
    echo "Downloading $FILE..."
    curl -s -L -o "$TARGET_DIR/$FILE" "$BASE_URL/$FILE"
    if [ $? -ne 0 ]; then
      echo "Failed to download $FILE"
      exit 1
    fi
  fi
done

echo "All face-api models downloaded successfully!"
