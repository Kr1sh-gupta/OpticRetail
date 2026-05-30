FROM python:3.11-slim

# Install system dependencies required for OpenCV and video decoding
RUN apt-get update && apt-get install -y \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone pipeline source code from the dedicated pipeline branch
RUN git clone -b pipeline https://github.com/Kr1sh-gupta/OpticRetail.git .

# Install runtime dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Fix NumPy 2.x incompatibility with onnxruntime
RUN pip install "numpy<2" -q

# Install gdown to download videos from Google Drive at container startup
RUN pip install gdown -q

# ─── COPY pre-exported ONNX model from local machine ─────────────────────────
# This avoids ANY network dependency during build.
# The file lives at e:\purplle\pipeline\yolov8n.onnx on your machine.
# Build context is set to the purplle root (../) in docker-compose so this path works.
COPY pipeline/yolov8n.onnx /app/yolov8n.onnx

# Copy the video download helper script into the image
COPY demo/download_videos.py /app/download_videos.py

# At runtime: download videos (if not already mounted/present), then run pipeline
CMD ["sh", "-c", "python download_videos.py && python detect.py"]
