import time
import random
from pathlib import Path

import cv2
import requests
from ultralytics import YOLO


# ============================================================
# ForestSphere IoT + AI Configuration
# ============================================================

MODEL_PATH = Path("runs") / "detect" / "train-3" / "weights" / "best.pt"

IMAGE_FOLDER = (
    Path("..")
    / "datasets"
    / "african-wildlife"
    / "images"
    / "test"
)

OUTPUT_FOLDER = Path("m1-iot") / "outputs" / "detections"

API_URL = "http://localhost:5000/api/elephant-detections"

CAMERA_ID = "CAM-001"
SENSOR_ID = "PIR-001"
ZONE = "Zone-A"

# Only detections with confidence >= 0.50
# will be treated as valid elephant detections.
CONFIDENCE_THRESHOLD = 0.50


# ============================================================
# Create Output Directory
# ============================================================

OUTPUT_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# Virtual PIR Sensor
# ============================================================

def detect_motion():
    """
    Simulates a PIR motion sensor.

    Returns:
        True  -> motion detected
        False -> no motion detected
    """

    return random.choice([True, False])


# ============================================================
# Risk Level Calculation
# ============================================================

def calculate_risk_level(confidence, elephant_count):
    """
    Calculates a demonstration risk level using
    YOLO confidence and elephant count.

    Confidence:
        >= 0.85 -> CRITICAL
        >= 0.70 -> HIGH
        >= 0.50 -> MEDIUM

    Multiple elephants can increase the risk level.
    """

    if confidence >= 0.85:
        risk_level = "CRITICAL"

    elif confidence >= 0.70:
        risk_level = "HIGH"

    else:
        risk_level = "MEDIUM"


    # Multiple elephants increase the operational risk.
    if elephant_count >= 3:

        if risk_level == "MEDIUM":
            risk_level = "HIGH"

        elif risk_level == "HIGH":
            risk_level = "CRITICAL"


    return risk_level


# ============================================================
# Send Detection Event to ForestSphere Backend
# ============================================================

def send_detection_to_backend(detection_event):
    """
    Sends an elephant detection event to the ForestSphere API.
    """

    try:

        response = requests.post(
            API_URL,
            json=detection_event,
            timeout=10
        )


        if response.status_code == 201:

            print(
                "   ☁️ Detection sent to backend successfully."
            )

            return True


        else:

            print(
                "   ❌ Backend rejected detection."
            )

            print(
                f"   Status code: {response.status_code}"
            )

            print(
                f"   Response: {response.text}"
            )

            return False


    except requests.exceptions.ConnectionError:

        print(
            "   ❌ Could not connect to ForestSphere backend."
        )

        print(
            "   Make sure the backend is running on port 5000."
        )

        return False


    except requests.exceptions.Timeout:

        print(
            "   ❌ Backend request timed out."
        )

        return False


    except requests.exceptions.RequestException as error:

        print(
            f"   ❌ Backend request failed: {error}"
        )

        return False


# ============================================================
# Load YOLO Model
# ============================================================

print("Loading YOLO model...")

model = YOLO(str(MODEL_PATH))


# ============================================================
# Find Test Images
# ============================================================

images = sorted(
    list(IMAGE_FOLDER.glob("*.jpg")) +
    list(IMAGE_FOLDER.glob("*.jpeg")) +
    list(IMAGE_FOLDER.glob("*.png"))
)


# ============================================================
# System Information
# ============================================================

print("\n======================================")
print(" ForestSphere IoT Monitoring System")
print("======================================")

print(
    f"Virtual camera images : {len(images)}"
)

print(
    f"PIR sensor            : {SENSOR_ID}"
)

print(
    f"Camera                : {CAMERA_ID}"
)

print(
    f"Monitoring zone       : {ZONE}"
)

print(
    "YOLO model            : YOLO11n"
)

print(
    f"Confidence threshold  : {CONFIDENCE_THRESHOLD:.2f}"
)

print(
    "Backend API           : localhost:5000"
)

print(
    f"Detection images      : {OUTPUT_FOLDER}"
)

print("======================================")
print("Starting monitoring...\n")


# ============================================================
# Main Monitoring Loop
# ============================================================

for image_path in images:

    # --------------------------------------------------------
    # Step 1: Virtual PIR Sensor
    # --------------------------------------------------------

    motion_detected = detect_motion()


    if not motion_detected:

        print(
            "⚪ PIR: No motion detected"
        )

        time.sleep(1)

        continue


    # --------------------------------------------------------
    # Step 2: Motion Detected
    # --------------------------------------------------------

    print(
        "\n🟢 PIR: Motion detected!"
    )

    print(
        f"📷 Camera activated: {image_path.name}"
    )


    # --------------------------------------------------------
    # Step 3: Read Camera Image
    # --------------------------------------------------------

    frame = cv2.imread(
        str(image_path)
    )


    if frame is None:

        print(
            "❌ Could not read image"
        )

        continue


    # --------------------------------------------------------
    # Step 4: YOLO Elephant Detection
    # --------------------------------------------------------

    results = model(
        frame,
        classes=1,
        conf=CONFIDENCE_THRESHOLD,
        verbose=False
    )

    result = results[0]

    elephant_count = len(
        result.boxes
    )


    # --------------------------------------------------------
    # Step 5: Elephant Detected
    # --------------------------------------------------------

    if elephant_count > 0:

        confidences = (
            result.boxes.conf.tolist()
        )

        highest_confidence = max(
            confidences
        )


        # ----------------------------------------------------
        # Step 6: Calculate Risk
        # ----------------------------------------------------

        risk_level = calculate_risk_level(
            highest_confidence,
            elephant_count
        )


        # ----------------------------------------------------
        # Step 7: Create Annotated Image
        # ----------------------------------------------------

        annotated_frame = result.plot()


        timestamp = time.strftime(
            "%Y%m%d_%H%M%S"
        )


        output_filename = (
            f"elephant_{timestamp}_{image_path.stem}.jpg"
        )


        output_path = (
            OUTPUT_FOLDER / output_filename
        )


        # Save YOLO annotated image

        cv2.imwrite(
            str(output_path),
            annotated_frame
        )


        # ----------------------------------------------------
        # Step 8: Display Detection Information
        # ----------------------------------------------------

        print(
            "\n🐘 ELEPHANT DETECTED!"
        )

        print(
            f"   Elephant count      : "
            f"{elephant_count}"
        )

        print(
            f"   Highest confidence  : "
            f"{highest_confidence:.2f}"
        )

        print(
            f"   Risk level          : "
            f"{risk_level}"
        )

        print(
            f"   Zone                : "
            f"{ZONE}"
        )

        print(
            f"   Annotated image     : "
            f"{output_path}"
        )


        # ----------------------------------------------------
        # Step 9: Create Detection Event
        # ----------------------------------------------------

        detection_event = {

            "deviceId": CAMERA_ID,

            "sensorId": SENSOR_ID,

            "zone": ZONE,

            "detectedObject": "elephant",

            "elephantCount": elephant_count,

            "confidence": round(
                highest_confidence,
                2
            ),

            "timestamp": time.strftime(
                "%Y-%m-%dT%H:%M:%SZ",
                time.gmtime()
            ),

            "image": output_filename,

            "riskLevel": risk_level
        }


        # ----------------------------------------------------
        # Step 10: Display Detection Event
        # ----------------------------------------------------

        print(
            "\n📦 Detection Event:"
        )

        print(
            detection_event
        )


        # ----------------------------------------------------
        # Step 11: Send to Backend
        # ----------------------------------------------------

        print(
            "\n☁️ Sending detection "
            "to ForestSphere backend..."
        )


        sent = send_detection_to_backend(
            detection_event
        )


        if sent:

            print(
                "🚨 ALERT: Elephant detection "
                "stored in MongoDB Atlas!"
            )

        else:

            print(
                "⚠️ ALERT: Elephant detected, "
                "but backend storage failed."
            )


    # --------------------------------------------------------
    # Step 12: No Elephant Detected
    # --------------------------------------------------------

    else:

        print(
            "⚪ Motion detected, "
            "but no elephant found."
        )

        annotated_frame = frame


    # --------------------------------------------------------
    # Step 13: Show Camera Feed
    # --------------------------------------------------------

    cv2.imshow(
        "ForestSphere IoT Monitoring",
        annotated_frame
    )


    # --------------------------------------------------------
    # Step 14: Keyboard Control
    # --------------------------------------------------------

    if cv2.waitKey(500) & 0xFF == ord("q"):

        print(
            "\nMonitoring stopped by user."
        )

        break


# ============================================================
# Cleanup
# ============================================================

cv2.destroyAllWindows()


print("\n======================================")
print(" ForestSphere Monitoring Finished")
print("======================================")