import random
import time


class VirtualPIRSensor:
    def __init__(self, sensor_id="PIR-001", zone="Zone-A"):
        self.sensor_id = sensor_id
        self.zone = zone

    def detect_motion(self):
        # Simulate PIR motion detection
        return random.choice([True, False])

    def get_event(self):
        motion = self.detect_motion()

        return {
            "sensorId": self.sensor_id,
            "zone": self.zone,
            "motionDetected": motion,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }


if __name__ == "__main__":
    sensor = VirtualPIRSensor()

    print("ForestSphere Virtual PIR Sensor started...")
    print("Press Ctrl+C to stop.\n")

    try:
        while True:
            event = sensor.get_event()

            if event["motionDetected"]:
                print("🚨 Motion detected!")
                print(event)
            else:
                print("No motion detected.")

            time.sleep(2)

    except KeyboardInterrupt:
        print("\nPIR sensor stopped.")