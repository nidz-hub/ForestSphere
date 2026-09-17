from pathlib import Path
import cv2
from ultralytics import YOLO

# Load trained elephant detection model
MODEL_PATH = Path("runs") / "detect" / "train-3" / "weights" / "best.pt"

# Test image folder
IMAGE_FOLDER = Path("..") / "datasets" / "african-wildlife" / "images" / "test"

# Load YOLO model
model = YOLO(str(MODEL_PATH))

# Get test images
images = sorted(
    list(IMAGE_FOLDER.glob("*.jpg")) +
    list(IMAGE_FOLDER.glob("*.jpeg")) +
    list(IMAGE_FOLDER.glob("*.png"))
)

print(f"Virtual camera found {len(images)} images.")
print("Starting elephant detection...\n")

for image_path in images:

    frame = cv2.imread(str(image_path))

    if frame is None:
        print(f"Could not read: {image_path}")
        continue

    # Run elephant detection
    results = model(
        frame,
        classes=1,
        conf=0.25,
        verbose=False
    )

    result = results[0]

    # Number of detected elephants
    detections = len(result.boxes)

    if detections > 0:
        print(
            f"🐘 Elephant detected | "
            f"Image: {image_path.name} | "
            f"Count: {detections}"
        )
    else:
        print(f"No elephant | Image: {image_path.name}")

    # Display detection result
    annotated_frame = result.plot()

    cv2.imshow(
        "ForestSphere Virtual Camera - Elephant Detection",
        annotated_frame
    )

    # Wait 0.5 seconds
    # Press Q to stop
    if cv2.waitKey(500) & 0xFF == ord("q"):
        break

cv2.destroyAllWindows()