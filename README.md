# OpticRetail CV Pipeline

Welcome to the `pipeline` branch of OpticRetail. This repository contains the edge detection node responsible for tracking and extracting stateful behavior from CCTV feeds.

## How it Works
The pipeline uses **YOLOv8** combined with **BoT-SORT** tracking to follow individuals through the store. It natively computes real-time business state (e.g., Queue Depth, Zone Dwelling) and formats the output into strict JSON schema payloads.

## Running the Pipeline
In production, you do **not** need to run this manually. The `backend` container autonomously clones this branch and executes `detect.py` as a background subprocess whenever the `Start Simulation` command is received from the dashboard.

If you wish to run it manually for debugging:
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python detect.py
```
