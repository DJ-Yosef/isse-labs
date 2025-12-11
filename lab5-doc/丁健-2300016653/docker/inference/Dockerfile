# Base image
FROM python:3.9-slim

# Setup working directory
WORKDIR /app

# Copy requirements.txt and install dependencies
COPY docker/inference/requirements.txt .
RUN pip install -r requirements.txt

# Copy the server script to the working directory
COPY docker/inference/server.py .

# Expose the Flask port
EXPOSE 8080

# Set the command to run the server
CMD ["python", "server.py"]
