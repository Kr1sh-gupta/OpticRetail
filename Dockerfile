FROM python:3.11-slim
WORKDIR /app

# Download the pipeline branch directly as a zip (bypasses apt-get update and git entirely for maximum speed!)
ADD https://github.com/Kr1sh-gupta/OpticRetail/archive/refs/heads/pipeline.zip /pipeline.zip
RUN python -c "import zipfile, os; zipfile.ZipFile('/pipeline.zip').extractall('/'); os.rename('/OpticRetail-pipeline', '/pipeline'); os.remove('/pipeline.zip')"

# Install backend requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install PyTorch (CPU Only) to massively reduce download size (from ~2.5GB to ~150MB)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install remaining pipeline requirements
RUN pip install --no-cache-dir opencv-python-headless ultralytics filterpy pandas psycopg2-binary numpy
RUN pip install --no-cache-dir -r /pipeline/requirements.txt

# Generate YOLO ONNX model
RUN cd /pipeline && python setup_model.py

# Copy backend source code
COPY . .

# Expose port and run server
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
