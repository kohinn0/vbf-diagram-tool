FROM python:3.11-slim AS base

WORKDIR /app

# Install system dependencies for document generation
# LibreOffice for PDF conversion, plus cleanup to keep image smaller
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Install Python dependencies first (layer caching optimization)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory with correct permissions
# This is the mount point for the named volume
RUN mkdir -p /app/data && chmod 777 /app/data

# Expose the application port
EXPOSE 8000

# Use exec form for proper signal handling (graceful shutdown)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
