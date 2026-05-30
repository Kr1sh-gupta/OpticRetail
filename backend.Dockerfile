FROM python:3.11-slim

# Install git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Clone the repository directly from the backend branch
RUN git clone -b backend https://github.com/Kr1sh-gupta/OpticRetail.git .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

# Start Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
