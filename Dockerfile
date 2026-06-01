FROM python:3.11-slim
WORKDIR /app

# Install system dependencies required for OpenCV and Git
RUN apt-get update && apt-get install -y \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Clone the pipeline branch directly into the container so the backend can execute it
RUN git clone -b pipeline https://github.com/Kr1sh-gupta/OpticRetail.git /pipeline

# Install backend requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install pipeline requirements (Ultralytics YOLO, OpenCV, etc)
RUN pip install --no-cache-dir opencv-python-headless ultralytics torch torchvision filterpy pandas psycopg2-binary numpy

# Copy backend source code
COPY . .

# Expose port and run server
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
