"""
setup_model.py — One-time ONNX Model Setup
==========================================
Run this script ONCE before running detect.py for the first time.

What it does:
1. Downloads yolov8n.pt from the official Ultralytics GitHub releases (~6MB)
2. Exports it to yolov8n.onnx using the ultralytics export function
3. Uninstalls ultralytics (keeping the runtime lean)

After this script completes, detect.py uses only onnxruntime — no ultralytics needed.

Usage:
    pip install ultralytics    (one-time)
    python setup_model.py
"""
import os
import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("setup_model")

ONNX_PATH = "yolov8n.onnx"


def install_ultralytics():
    logger.info("Installing ultralytics (temporary — for ONNX export only)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "ultralytics", "-q"])
    logger.info("ultralytics installed.")


def export_onnx():
    from ultralytics import YOLO
    logger.info("Downloading yolov8n.pt and exporting to ONNX format...")
    model = YOLO("yolov8n.pt")
    model.export(format="onnx", imgsz=640, simplify=True)
    # ultralytics exports to yolov8n.onnx in the current directory
    if not os.path.exists(ONNX_PATH):
        logger.error(f"Export failed — {ONNX_PATH} not found.")
        sys.exit(1)
    logger.info(f"✅  Model exported successfully: {ONNX_PATH}")


def main():
    if os.path.exists(ONNX_PATH):
        logger.info(f"{ONNX_PATH} already exists. Nothing to do.")
        logger.info("You can now run: python detect.py")
        return

    install_ultralytics()
    export_onnx()

    logger.info("")
    logger.info("=" * 55)
    logger.info("  Setup complete! You can now run the pipeline:")
    logger.info("    python detect.py")
    logger.info("=" * 55)


if __name__ == "__main__":
    main()
