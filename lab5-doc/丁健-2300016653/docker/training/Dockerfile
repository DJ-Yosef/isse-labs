# Base image
FROM python:3.9-slim

# Setup working directory
WORKDIR /app
# Copy requirements.txt and install dependencies
COPY docker/training/requirements.txt .
RUN pip install -r requirements.txt
# Copy the training script to the working directory
COPY docker/training/train.py ./train.py
# Store model in a shared volume
VOLUME ["/app/models"]
# Set the command to run the training script
CMD ["python", "train.py"]

