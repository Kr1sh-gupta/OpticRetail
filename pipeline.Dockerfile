FROM python:3.11-slim

# Install system dependencies required for OpenCV, Git, and video decoding
RUN apt-get update && apt-get install -y \
    git \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone the repository directly from the dedicated pipeline branch
RUN git clone -b pipeline https://github.com/Kr1sh-gupta/OpticRetail.git .

# Install runtime dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Bake yolov8n.onnx into the image at BUILD TIME (avoids runtime download timeouts)
# ultralytics is only needed for the one-time export — uninstall it to keep the image lean
RUN pip install ultralytics -q && python setup_model.py && pip uninstall -y ultralytics

# Fix NumPy 2.x incompatibility with onnxruntime
RUN pip install "numpy<2" -q

# At runtime, just run the pipeline — model is already in the image
CMD ["python", "detect.py"]
