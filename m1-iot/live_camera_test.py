
import cv2

# Paste the H264 RTSP address copied from IP Webcam.
CAMERA_URL = "rtsp://192.0.0.4:8080/h264.sdp"

print("Connecting to IP Webcam RTSP stream...")

cap = cv2.VideoCapture(CAMERA_URL, cv2.CAP_FFMPEG)

if not cap.isOpened():
    print("Could not open the RTSP stream.")
    print("Check that the phone server is running and the URL is correct.")
    raise SystemExit(1)

print("Connected! Press Q to quit.")

try:
    while True:
        success, frame = cap.read()

        if not success:
            print("Unable to read frame. Check the network and stream.")
            break

        cv2.imshow("ForestSphere - Live Phone Camera", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
finally:
    cap.release()
    cv2.destroyAllWindows()
