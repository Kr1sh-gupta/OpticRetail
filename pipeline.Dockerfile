FROM python:3.11-slim

# Install system dependencies required for OpenCV, Git, and video decoding
RUN apt-get update && apt-get install -y \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone the repository directly from the backend branch (which contains the pipeline)
RUN git clone -b backend https://github.com/Kr1sh-gupta/OpticRetail.git .

# Move into the pipeline directory and install dependencies
WORKDIR /app/pipeline
RUN pip install --no-cache-dir -r requirements.txt

# Run the setup script to export yolov8n.onnx, ensure NumPy 1.x compatibility, and start the pipeline!
CMD ["sh", "-c", "python setup_model.py && pip install \"numpy<2\" && python detect.py"]
