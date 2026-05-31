"""
detect.py — Main Detection Pipeline
=====================================
Processes CCTV footage using OpenCV + YOLOv8 ONNX model (via onnxruntime).
Detects persons, classifies staff by black-clothing HSV filter,
maps positions to store zones, and emits structured events to the API.

Tech stack: opencv-python-headless + onnxruntime (no GPU required, ~27MB total)
This is intentionally lightweight so it runs on any company system.

Usage:
    python detect.py              # Process all 5 cameras sequentially
    python detect.py --cam CAM1   # Process a single camera
"""
import cv2
import numpy as np
import os
import sys
import logging
import urllib.request
import argparse
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import time
import queue
import threading
import requests

import onnxruntime as ort

from tracker import Tracker
from emit import EventBuffer, build_event

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("opticretail.detect")

# ============================================================
# Live HTTP Log Stream Handler
# ============================================================
class HTTPLogHandler(logging.Handler):
    """
    Interceptors for pipeline logging to forward console output 
    via HTTP POST requests to the FastAPI backend's /pipeline/logs.
    Uses an internal queue & worker thread to never block the main CV engine.
    """
    def __init__(self, api_url: str):
        super().__init__()
        self.api_url = api_url
        self.log_queue = queue.Queue()
        self.worker_thread = threading.Thread(target=self._send_logs_worker, daemon=True)
        self.worker_thread.start()

    def emit(self, record):
        try:
            # Avoid infinite recursion if requests module logs something!
            if record.name.startswith("urllib3") or record.name.startswith("requests"):
                return
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
                "level": record.levelname,
                "message": self.format(record)
            }
            self.log_queue.put(log_entry)
        except Exception:
            self.handleError(record)

    def _send_logs_worker(self):
        while True:
            logs_to_send = []
            try:
                first_log = self.log_queue.get(timeout=1.0)
                logs_to_send.append(first_log)
                while len(logs_to_send) < 50:
                    try:
                        next_log = self.log_queue.get_nowait()
                        logs_to_send.append(next_log)
                    except queue.Empty:
                        break
            except queue.Empty:
                continue

            if logs_to_send:
                try:
                    requests.post(
                        self.api_url,
                        json=logs_to_send,
                        timeout=3,
                        headers={"Content-Type": "application/json"}
                    )
                except Exception:
                    pass

# Wire the HTTP handler to the root logger so ALL logs are captured
API_INGEST_URL = os.getenv("API_INGEST_URL", "http://localhost:8000/events/ingest")
# Derive status and log base URLs from ingest URL
API_BASE = API_INGEST_URL.rsplit("/", 2)[0] # http://localhost:8000
API_STATUS_URL = f"{API_BASE}/pipeline/status"
API_LOGS_URL = f"{API_BASE}/pipeline/logs"

http_log_handler = HTTPLogHandler(API_LOGS_URL)
http_log_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)s | %(message)s"))
logging.getLogger().addHandler(http_log_handler)

# ============================================================
# Configuration from .env
# ============================================================
STORE_ID = os.getenv("STORE_ID", "STORE_BLR_002")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", 0.40))
FRAME_SKIP = int(os.getenv("FRAME_SKIP", 5))

# ============================================================
# Camera Configuration
# Maps camera env key → metadata
# ============================================================
CAMERAS = {
    "CAM1": {
        "source": os.getenv("CAM1_SOURCE"),
        "id":     os.getenv("CAM1_ID", "CAM_FLOOR_01"),
        "zone":   os.getenv("CAM1_ZONE", "MAIN_FLOOR_A"),
        "type":   "floor",
        # Zone polygons [x1,y1, x2,y2] in pixel coordinates (1920x1080)
        # TODO: Calibrate these coordinates from actual camera footage
        "zones": {
            "SKINCARE":   (0,    0,    960,  1080),
            "FRAGRANCE":  (960,  0,    1920, 1080),
        }
    },
    "CAM2": {
        "source": os.getenv("CAM2_SOURCE"),
        "id":     os.getenv("CAM2_ID", "CAM_FLOOR_02"),
        "zone":   os.getenv("CAM2_ZONE", "MAIN_FLOOR_B"),
        "type":   "floor",
        "zones": {
            "MAKEUP":      (0,    0,    960,  1080),
            "ACCESSORIES": (960,  0,    1920, 1080),
        }
    },
    "CAM3": {
        "source": os.getenv("CAM3_SOURCE"),
        "id":     os.getenv("CAM3_ID", "CAM_ENTRY_03"),
        "zone":   os.getenv("CAM3_ZONE", "ENTRY_EXIT"),
        "type":   "entry",
        # Virtual tripwire Y coordinate — persons crossing this line = ENTRY/EXIT
        # TODO: Calibrate based on actual door position in the frame
        "tripwire_y": 540,
    },
    "CAM4": {
        "source": os.getenv("CAM4_SOURCE"),
        "id":     os.getenv("CAM4_ID", "CAM_STORAGE_04"),
        "zone":   os.getenv("CAM4_ZONE", "STORAGE"),
        "type":   "storage",  # Excluded from customer analytics
    },
    "CAM5": {
        "source": os.getenv("CAM5_SOURCE"),
        "id":     os.getenv("CAM5_ID", "CAM_BILLING_05"),
        "zone":   os.getenv("CAM5_ZONE", "BILLING"),
        "type":   "billing",
        "billing_zone": (200, 300, 1700, 1080),  # Bounding box for queue area
    },
}

YOLO_MODEL_PATH = "yolov8n.onnx"

# ============================================================
# Model Loading
# ============================================================
def load_model() -> ort.InferenceSession:
    """
    Loads the yolov8n.onnx model via onnxruntime (CPU mode).
    PREREQUISITE: Run 'python setup_model.py' once to generate yolov8n.onnx.
    """
    if not os.path.exists(YOLO_MODEL_PATH):
        logger.error(
            f"\n  Model file not found: {YOLO_MODEL_PATH}\n"
            "  Run this command ONCE to generate it:\n"
            "    python setup_model.py\n"
        )
        sys.exit(1)

    logger.info("Loading YOLOv8n ONNX model (onnxruntime, CPU mode)...")
    session = ort.InferenceSession(YOLO_MODEL_PATH, providers=["CPUExecutionProvider"])
    logger.info("Model loaded successfully.")
    return session


# ============================================================
# Staff Classification — HSV Black Clothing Filter
# Staff wear all-black uniform (confirmed in understanding.md)
# ============================================================
def is_staff_by_clothing(frame: np.ndarray, bbox) -> bool:
    """
    Classifies a detected person as staff if their clothing is predominantly black.
    Uses HSV color space — black pixels have low Saturation (S) and low-to-medium Value (V).
    """
    x1, y1, x2, y2 = bbox
    # Analyse the torso region (middle 50% of bounding box height)
    torso_y1 = y1 + int((y2 - y1) * 0.25)
    torso_y2 = y1 + int((y2 - y1) * 0.75)
    
    # Exclude left and right 20% background margins to analyze pure clothing pixels
    width = x2 - x1
    torso_x1 = x1 + int(width * 0.20)
    torso_x2 = x1 + int(width * 0.80)
    
    roi = frame[torso_y1:torso_y2, torso_x1:torso_x2]
    if roi.size == 0:
        return False

    hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
    # Black clothing: saturation <= 90 and value <= 95 to accommodate store spotlights
    lower_black = np.array([0, 0, 0])
    upper_black = np.array([180, 90, 95])
    
    mask = cv2.inRange(hsv, lower_black, upper_black)
    black_ratio = np.sum(mask > 0) / mask.size
    
    # Expecting > 40% black pixels inside isolated center region for staff classification
    is_staff = bool(black_ratio > 0.40)
    return is_staff


# ============================================================
# YOLO Inference
# ============================================================
def run_yolo(session: ort.InferenceSession, frame: np.ndarray):
    """
    Runs YOLOv8 ONNX inference on a single frame.
    Returns list of (bbox_xyxy, confidence) for 'person' class (class_id=0).
    """
    input_h, input_w = 640, 640
    img = cv2.resize(frame, (input_w, input_h))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))[np.newaxis, ...]

    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: img})[0]

    # YOLOv8 output shape: [1, 84, 8400] → transpose → [8400, 84]
    predictions = np.squeeze(outputs).T
    frame_h, frame_w = frame.shape[:2]
    detections = []

    for pred in predictions:
        cx, cy, w, h = pred[:4]
        scores = pred[4:]
        class_id = np.argmax(scores)
        confidence = scores[class_id]

        if class_id != 0 or confidence < CONFIDENCE_THRESHOLD:
            continue

        # Convert normalised YOLO coords to frame pixel coords
        x1 = int((cx - w / 2) * frame_w / input_w)
        y1 = int((cy - h / 2) * frame_h / input_h)
        x2 = int((cx + w / 2) * frame_w / input_w)
        y2 = int((cy + h / 2) * frame_h / input_h)

        # Clamp to frame bounds
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(frame_w - 1, x2), min(frame_h - 1, y2)

        detections.append(((x1, y1, x2, y2), float(confidence)))

    return detections


# ============================================================
# Zone Mapping
# ============================================================
def get_zone_for_bbox(bbox, zones: dict) -> str:
    """Returns the zone name if the center of the bounding box falls within it."""
    cx = (bbox[0] + bbox[2]) // 2
    cy = (bbox[1] + bbox[3]) // 2
    for zone_name, (zx1, zy1, zx2, zy2) in zones.items():
        if zx1 <= cx <= zx2 and zy1 <= cy <= zy2:
            return zone_name
    return None


def get_entry_direction(bbox, prev_bbox, tripwire_y: int) -> str:
    """Determines ENTRY or EXIT based on crossing direction over tripwire."""
    if prev_bbox is None:
        return None
    prev_cy = (prev_bbox[1] + prev_bbox[3]) // 2
    curr_cy = (bbox[1] + bbox[3]) // 2
    if prev_cy < tripwire_y <= curr_cy:
        return "ENTRY"
    if prev_cy > tripwire_y >= curr_cy:
        return "EXIT"
    return None


# ============================================================
# Process a single camera
# ============================================================
def process_camera(cam_key: str, cam_config: dict, model: ort.InferenceSession, buffer: EventBuffer):
    source = cam_config.get("source")
    cam_id = cam_config["id"]
    cam_type = cam_config["type"]

    if not source or not os.path.exists(source):
        logger.error(f"[{cam_key}] Source not found: {source}")
        return

    # Storage room is intentionally excluded from customer analytics
    if cam_type == "storage":
        logger.info(f"[{cam_key}] Skipping storage room camera (excluded from customer metrics per understanding.md).")
        return

    logger.info(f"[{cam_key}] Processing: {source}")

    cap = cv2.VideoCapture(source)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        total_frames = 1000

    # Emit initial status
    try:
        requests.post(API_STATUS_URL, json={
            "store_id": STORE_ID,
            "camera_id": cam_key,
            "current_frame": 0,
            "total_frames": total_frames,
            "percentage": 0.0,
            "fps": 0.0,
            "status": "PROCESSING"
        }, timeout=2)
    except Exception:
        pass

    fps = cap.get(cv2.CAP_PROP_FPS) or 15
    start_time = time.time()
    tracker = Tracker()
    frame_idx = 0
    # Track previous bboxes for entry/exit direction detection (CAM3)
    prev_bboxes = {}

    # For ZONE_DWELL tracking: visitor_id → (zone, enter_time)
    zone_dwells = {}
    DWELL_INTERVAL_MS = 30000  # emit ZONE_DWELL every 30s of continuous dwell

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % FRAME_SKIP != 0:
            continue

        # Post status update every 30 frames
        if frame_idx % 30 == 0:
            elapsed_time = time.time() - start_time
            current_fps = round(frame_idx / elapsed_time, 1) if elapsed_time > 0 else 0.0
            percentage = round((frame_idx / total_frames) * 100, 2)
            if percentage > 100.0:
                percentage = 100.0
            try:
                requests.post(API_STATUS_URL, json={
                    "store_id": STORE_ID,
                    "camera_id": cam_key,
                    "current_frame": frame_idx,
                    "total_frames": total_frames,
                    "percentage": percentage,
                    "fps": current_fps,
                    "status": "PROCESSING"
                }, timeout=1)
            except Exception:
                pass

        # Compute timestamp from video frame position
        elapsed_secs = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
        # TODO: For live RTSP streams, replace with datetime.now(timezone.utc)
        base_time = datetime(2026, 4, 10, 14, 0, 0, tzinfo=timezone.utc)
        frame_ts = base_time + timedelta(seconds=elapsed_secs)

        # Run YOLO detection
        raw_detections = run_yolo(model, frame)

        # Build structured detections: (bbox, is_staff, confidence)
        structured = []
        for (bbox, confidence) in raw_detections:
            is_staff = is_staff_by_clothing(frame, bbox)
            structured.append((bbox, is_staff, confidence))

        # Update tracker
        new_events, lost_tracks = tracker.update(structured, frame_ts)

        # --- Emit events for new/re-entered visitors ---
        for track, event_type in new_events:
            event = build_event(
                store_id=STORE_ID,
                camera_id=cam_id,
                visitor_id=track.visitor_id,
                event_type=event_type,
                timestamp=frame_ts,
                is_staff=track.is_staff,
                confidence=track.confidence,
                session_seq=track.session_seq,
            )
            buffer.add(event)

        # --- Emit EXIT events for lost tracks ---
        for track in lost_tracks:
            event = build_event(
                store_id=STORE_ID,
                camera_id=cam_id,
                visitor_id=track.visitor_id,
                event_type="EXIT",
                timestamp=frame_ts,
                is_staff=track.is_staff,
                confidence=track.confidence,
                session_seq=track.session_seq,
            )
            buffer.add(event)
            # Clean up dwell tracking
            zone_dwells.pop(track.visitor_id, None)

        # --- Zone events for floor cameras ---
        if cam_type == "floor" and "zones" in cam_config:
            zones = cam_config["zones"]
            for vid, track in tracker.active_tracks.items():
                if track.is_staff:
                    continue
                current_zone = get_zone_for_bbox(track.bbox, zones)
                prev_zone = track.zone_id

                if current_zone != prev_zone:
                    if prev_zone:
                        # ZONE_EXIT from old zone
                        dwell_ms = 0
                        if vid in zone_dwells:
                            enter_time = zone_dwells[vid][1]
                            dwell_ms = int((frame_ts - enter_time).total_seconds() * 1000)
                            del zone_dwells[vid]
                        buffer.add(build_event(
                            store_id=STORE_ID, camera_id=cam_id,
                            visitor_id=vid, event_type="ZONE_EXIT",
                            timestamp=frame_ts, zone_id=prev_zone,
                            dwell_ms=dwell_ms, is_staff=False,
                            confidence=track.confidence, session_seq=track.session_seq
                        ))
                    if current_zone:
                        # ZONE_ENTER to new zone
                        zone_dwells[vid] = (current_zone, frame_ts)
                        buffer.add(build_event(
                            store_id=STORE_ID, camera_id=cam_id,
                            visitor_id=vid, event_type="ZONE_ENTER",
                            timestamp=frame_ts, zone_id=current_zone,
                            is_staff=False, confidence=track.confidence,
                            session_seq=track.session_seq
                        ))
                    track.zone_id = current_zone

                # ZONE_DWELL: emit every 30s of continuous dwell
                elif current_zone and vid in zone_dwells:
                    enter_time = zone_dwells[vid][1]
                    elapsed_ms = int((frame_ts - enter_time).total_seconds() * 1000)
                    if elapsed_ms >= DWELL_INTERVAL_MS:
                        buffer.add(build_event(
                            store_id=STORE_ID, camera_id=cam_id,
                            visitor_id=vid, event_type="ZONE_DWELL",
                            timestamp=frame_ts, zone_id=current_zone,
                            dwell_ms=elapsed_ms, is_staff=False,
                            confidence=track.confidence, session_seq=track.session_seq
                        ))
                        zone_dwells[vid] = (current_zone, frame_ts)  # Reset dwell window

        # --- Entry/Exit direction for CAM3 ---
        if cam_type == "entry":
            tripwire_y = cam_config.get("tripwire_y", 540)
            for vid, track in tracker.active_tracks.items():
                direction = get_entry_direction(
                    track.bbox,
                    prev_bboxes.get(vid),
                    tripwire_y
                )
                if direction:
                    buffer.add(build_event(
                        store_id=STORE_ID, camera_id=cam_id,
                        visitor_id=vid, event_type=direction,
                        timestamp=frame_ts, is_staff=track.is_staff,
                        confidence=track.confidence, session_seq=track.session_seq
                    ))
            # Save current bboxes for next frame
            prev_bboxes = {vid: t.bbox for vid, t in tracker.active_tracks.items()}

        # --- Billing queue depth for CAM5 ---
        if cam_type == "billing" and "billing_zone" in cam_config:
            bz = cam_config["billing_zone"]
            queue_count = 0
            for vid, track in tracker.active_tracks.items():
                if track.is_staff:
                    continue
                cx = (track.bbox[0] + track.bbox[2]) // 2
                cy = (track.bbox[1] + track.bbox[3]) // 2
                if bz[0] <= cx <= bz[2] and bz[1] <= cy <= bz[3]:
                    queue_count += 1

            if queue_count > 0:
                # Emit a BILLING_QUEUE_JOIN for each person in the queue zone
                for vid, track in tracker.active_tracks.items():
                    if track.is_staff:
                        continue
                    cx = (track.bbox[0] + track.bbox[2]) // 2
                    cy = (track.bbox[1] + track.bbox[3]) // 2
                    if bz[0] <= cx <= bz[2] and bz[1] <= cy <= bz[3]:
                        buffer.add(build_event(
                            store_id=STORE_ID, camera_id=cam_id,
                            visitor_id=vid, event_type="BILLING_QUEUE_JOIN",
                            timestamp=frame_ts, zone_id="BILLING",
                            is_staff=False, confidence=track.confidence,
                            queue_depth=queue_count, session_seq=track.session_seq
                        ))
                        break  # One event per frame is enough for queue depth

    cap.release()
    buffer.flush()
    logger.info(f"[{cam_key}] Processing complete.")
    try:
        requests.post(API_STATUS_URL, json={
            "store_id": STORE_ID,
            "camera_id": cam_key,
            "current_frame": total_frames,
            "total_frames": total_frames,
            "percentage": 100.0,
            "fps": 0.0,
            "status": "COMPLETED"
        }, timeout=2)
    except Exception:
        pass


# ============================================================
# Main Entry Point
# ============================================================
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="OpticRetail Detection Pipeline")
    parser.add_argument("--cam", type=str, default=None, help="Process single camera (e.g. CAM1). Default: all cameras.")
    args = parser.parse_args()

    model = load_model()
    buffer = EventBuffer()

    # Wipe old logs at the beginning of the entire pipeline execution run
    try:
        requests.delete(API_LOGS_URL, timeout=2)
    except Exception:
        pass

    if args.cam:
        cam_key = args.cam.upper()
        if cam_key not in CAMERAS:
            logger.error(f"Unknown camera key: {cam_key}. Valid: {list(CAMERAS.keys())}")
            sys.exit(1)
        process_camera(cam_key, CAMERAS[cam_key], model, buffer)
    else:
        for cam_key, cam_config in CAMERAS.items():
            process_camera(cam_key, cam_config, model, buffer)

    buffer.flush()
    logger.info(f"Pipeline complete. Total events emitted: {buffer.total_sent}")
    
    # Set final IDLE status when everything completes
    try:
        requests.post(API_STATUS_URL, json={
            "store_id": STORE_ID,
            "camera_id": "NONE",
            "current_frame": 0,
            "total_frames": 0,
            "percentage": 0.0,
            "fps": 0.0,
            "status": "IDLE"
        }, timeout=2)
    except Exception:
        pass
