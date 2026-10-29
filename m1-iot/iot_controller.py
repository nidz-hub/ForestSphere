
import random
import time
from pathlib import Path

import cv2
import requests
from ultralytics import YOLO


# ============================================================
# ForestSphere Configuration
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    BASE_DIR.parent
    / "runs"
    / "detect"
    / "train-3"
    / "weights"
    / "best.pt"
)

# Temporary virtual-camera input: images currently available
IMAGE_FOLDER = BASE_DIR / "outputs" / "detections"

# Keep new results separate from the input images
OUTPUT_FOLDER = BASE_DIR / "outputs" / "run_detections"

API_URL = "http://localhost:5000/api/elephant-detections"

CAMERA_ID = "CAM-001"
SENSOR_ID = "PIR-001"
ZONE = "Zone-A"

CONFIDENCE_THRESHOLD = 0.50
SENSOR_INTERVAL_SECONDS = 2

OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)


# ============================================================
# Virtual PIR Sensor
# ============================================================

def detect_motion():
    """Simulate a PIR sensor. True means motion detected."""
    return random.choice([True, False])


# ============================================================
# Backend Integration
# ============================================================

def send_detection_to_backend(event):
    try:
        response = requests.post(API_URL, json=event, timeout=5)

        if response.status_code in (200, 201):
            print("Backend accepted the detection event.")
            return True

        print(f"Backend returned HTTP {response.status_code}: "
              f"{response.text}")
        return False

    except requests.exceptions.RequestException as error:
        print(f"Backend unavailable: {error}")
        print("Detection was performed locally; backend storage "
              "is not confirmed.")
        return False


# ============================================================
# Load YOLO Model
# ============================================================

print("Loading YOLO model...")

if not MODEL_PATH.is_file():
    raise FileNotFoundError(f"Model weights not found: {MODEL_PATH}")

model = YOLO(str(MODEL_PATH))

print("Model classes:", model.names)
print("Model path:", MODEL_PATH)


# Find the elephant class by its actual label
names = model.names

if isinstance(names, dict):
    elephant_class_ids = [
        int(class_id)
        for class_id, name in names.items()
        if str(name).strip().lower() == "elephant"
    ]
else:
    elephant_class_ids = [
        class_id
        for class_id, name in enumerate(names)
        if str(name).strip().lower() == "elephant"
    ]

if not elephant_class_ids:
    raise ValueError(
        "No class named 'elephant' was found in this model. "
        "Check the model class names before continuing."
    )

ELEPHANT_CLASS_ID = elephant_class_ids[0]
print("Elephant class ID:", ELEPHANT_CLASS_ID)


# ============================================================
# Load Virtual Camera Images
# ============================================================

extensions = ("*.jpg", "*.jpeg", "*.png", "*.webp")

images = sorted(
    path
    for pattern in extensions
    for path in IMAGE_FOLDER.glob(pattern)
    if path.is_file()
)

print("Image folder:", IMAGE_FOLDER)
print("Image folder exists:", IMAGE_FOLDER.is_dir())
print("Virtual camera images:", len(images))

if not images:
    raise FileNotFoundError(
        f"No camera images found in {IMAGE_FOLDER}. "
        "Add JPG, JPEG, PNG, or WebP images to this folder."
    )

print("\n======================================")
print(" ForestSphere IoT Monitoring")
print("======================================")
print("PIR sensor:", SENSOR_ID)
print("Camera:", CAMERA_ID)
print("Zone:", ZONE)
print("Confidence threshold:", CONFIDENCE_THRESHOLD)
print("Press Q in the image window or Ctrl+C in the terminal to stop.")
print("======================================\n")


# ============================================================
# Continuous Sensor Monitoring
# ============================================================

image_index = 0

try:
    while True:
        motion_detected = detect_motion()

        if not motion_detected:
            print("PIR: No motion detected.")
            time.sleep(SENSOR_INTERVAL_SECONDS)
            continue

        print("\nPIR: MOTION DETECTED!")
        
        # Simulate the camera supplying the next available image
        image_path = images[image_index % len(images)]
        image_index += 1

        print("Virtual camera image:", image_path.name)

        frame = cv2.imread(str(image_path))

        if frame is None:
            print("Could not read image:", image_path)
            time.sleep(SENSOR_INTERVAL_SECONDS)
            continue

        # Run detection for elephants only
        result = model(
            frame,
            classes=[ELEPHANT_CLASS_ID],
            conf=CONFIDENCE_THRESHOLD,
            verbose=False
        )[0]

        elephant_count = len(result.boxes)

        if elephant_count > 0:
            confidences = result.boxes.conf.tolist()
            highest_confidence = max(confidences)

            if highest_confidence >= 0.85:
                risk_level = "CRITICAL"
            elif highest_confidence >= 0.70:
                risk_level = "HIGH"
            else:
                risk_level = "MEDIUM"

            if elephant_count >= 3:
                if risk_level == "MEDIUM":
                    risk_level = "HIGH"
                elif risk_level == "HIGH":
                    risk_level = "CRITICAL"

            timestamp = time.strftime("%Y%m%d_%H%M%S")
            output_filename = (
                f"elephant_{timestamp}_{image_path.stem}.jpg"
            )
            output_path = OUTPUT_FOLDER / output_filename

            annotated_frame = result.plot()
            cv2.imwrite(str(output_path), annotated_frame)

            print("ELEPHANT DETECTED!")
            print("Count:", elephant_count)
            print(f"Highest confidence: {highest_confidence:.2f}")
            print("Risk level:", risk_level)
            print("Saved image:", output_path)

            event = {
                "deviceId": CAMERA_ID,
                "sensorId": SENSOR_ID,
                "zone": ZONE,
                "detectedObject": "elephant",
                "elephantCount": elephant_count,
                "confidence": round(highest_confidence, 2),
                "timestamp": time.strftime(
                    "%Y-%m-%dT%H:%M:%SZ", time.gmtime()
                ),
                "image": output_filename,
                "riskLevel": risk_level
            }

            print("Detection event:", event)
            send_detection_to_backend(event)

            display_frame = annotated_frame
        else:
            print("Motion detected, but no elephant was found.")
            display_frame = result.plot()

        cv2.imshow("ForestSphere - Elephant Detection", display_frame)

        if cv2.waitKey(500) & 0xFF == ord("q"):
            print("Monitoring stopped.")
            break

        time.sleep(SENSOR_INTERVAL_SECONDS)

except KeyboardInterrupt:
    print("\nMonitoring stopped by user.")

finally:
    cv2.destroyAllWindows()
    print("ForestSphere monitoring ended.")
