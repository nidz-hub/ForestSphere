
import cv2
import threading
import time

CAMERA_URL = "rtsp://192.0.0.4:8080/h264.sdp" 

latest_frame = None
frame_lock = threading.Lock()
camera_running = True

def camera_reader():
    global latest_frame, camera_running

    cap = cv2.VideoCapture(
        CAMERA_URL + "?rtsp_transport=tcp&fflags=nobuffer&flags=low_delay",
        cv2.CAP_FFMPEG
    )

    if not cap.isOpened():
        print("Could not open the camera stream.")
        camera_running = False
        return

    print("Low-latency camera reader started.")

    while camera_running:
        success, frame = cap.read()

        if success:
            with frame_lock:
                latest_frame = frame
        else:
            time.sleep(0.01)

    cap.release()

reader = threading.Thread(target=camera_reader, daemon=True)
reader.start()

while camera_running:
    with frame_lock:
        frame = latest_frame.copy() if latest_frame is not None else None

    if frame is None:
        time.sleep(0.01)
        continue

    cv2.imshow("ForestSphere Low-Latency Camera", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        camera_running = False
        break

cv2.destroyAllWindows()
