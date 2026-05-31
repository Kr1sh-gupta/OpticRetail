import os
import cv2
import numpy as np
from ultralytics import YOLO
import sys

# OpticRetail - Standalone Shoplifting & Concealment Detection Script
# Ported from the Billiance detection engine

# Path to the YOLOv8 model in the pipeline
YOLO_MODEL_PATH = "yolov8n.onnx"
if not os.path.exists(YOLO_MODEL_PATH):
    YOLO_MODEL_PATH = os.path.join(os.path.dirname(__file__), "yolov8n.pt")

# Load YOLO model (supporting PyTorch .pt or ONNX)
print(f"[BILLIANCE AI] Loading YOLO model from {YOLO_MODEL_PATH}...")
try:
    model = YOLO(YOLO_MODEL_PATH)
except Exception:
    # Fallback to yolov8n.pt if ONNX fails to load directly via ultralytics YOLO
    model = YOLO("yolov8n.pt")

# Default source video: Secure Storage Room CCTV
VIDEO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "CCTV Footage"))
video_path = os.path.join(VIDEO_DIR, "CAM 4.mp4")

if not os.path.exists(video_path):
    # Try local directory
    video_path = "CAM 4.mp4"

print(f"[BILLIANCE AI] Target CCTV feed: {video_path}")
if not os.path.exists(video_path):
    print(f"⚠️ Video file not found at {video_path}. Please provide a valid CCTV video feed.")
    sys.exit(1)

cap = cv2.VideoCapture(video_path)

# Confidence drop threshold for detecting shoplifting
CONFIDENCE_DROP_THRESHOLD = 0.20
print(f"[BILLIANCE AI] Initialized Obscuration Trigger Threshold: {CONFIDENCE_DROP_THRESHOLD * 100}% drop.")

confidence_history = {}
frame_count = 0

# Mock Email Alert function (designed for secure safety - no network requests)
def send_email_mock(frame_filename, visitor_id, confidence_drop):
    print("\n" + "="*60)
    print("📨 [MOCK EMAIL SERVICE] Obscuration Alert In-Flight!")
    print(f"Subject: 🚨 CRITICAL - Potential Shoplifting in Secure Storage Room")
    print(f"Target suspect ID: VIS_{visitor_id}")
    print(f"Heuristic Trigger: YOLO Person Confidence Drop: {confidence_drop * 100:.1f}%")
    print(f"Attachment Evidence: {frame_filename}")
    print("✨ [MOCK EMAIL SERVICE] Security alert collage emailed successfully! (Real email dispatch is disabled for safety)")
    print("="*60 + "\n")

# Loop through video frames
while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    frame_count += 1
    # Frame skip to optimize processing
    if frame_count % 3 != 0:
        continue

    results = model.track(frame, persist=True)
    if not results or not results[0].boxes:
        continue

    boxes = results[0].boxes.xywh.cpu()
    confidences = results[0].boxes.conf.cpu().tolist()

    if results[0].boxes.id is not None:
        track_ids = results[0].boxes.id.int().cpu().tolist()
    else:
        track_ids = [None] * len(boxes)

    annotated_frame = results[0].plot()

    for box, confidence, track_id in zip(boxes, confidences, track_ids):
        if track_id is None:
            continue

        x, y, w, h = box

        if track_id in confidence_history:
            prev_conf = confidence_history[track_id]
            drop = prev_conf - confidence

            if drop > CONFIDENCE_DROP_THRESHOLD:
                # Obscuration triggered!
                color = (0, 0, 255) # Red
                label = f"SUSPICIOUS CONCEALMENT (Drop: {drop*100:.0f}%)"
                
                # Save evidence frame
                frame_filename = f"shoplifting_frame_vis_{track_id}_fr_{frame_count}.jpg"
                cv2.imwrite(frame_filename, annotated_frame)
                
                # Fire mock email alert
                send_email_mock(frame_filename, track_id, drop)
            else:
                color = (0, 255, 0) # Green
                label = f"Tracking VIS_{track_id}"
        else:
            color = (0, 255, 0)
            label = f"Tracking VIS_{track_id}"

        # Update confidence memory
        confidence_history[track_id] = confidence

        # Draw visual indicators
        cv2.rectangle(annotated_frame,
                      (int(x - w / 2), int(y - h / 2)),
                      (int(x + w / 2), int(y + h / 2)),
                      color, 2)
        cv2.putText(annotated_frame, label, (int(x - w / 2), int(y - h / 2) - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

    # Display window (press 'q' to close)
    cv2.imshow("OpticRetail Security AI - Billiance Engine", annotated_frame)
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()
print("OpticRetail Security AI simulation completed successfully.")
