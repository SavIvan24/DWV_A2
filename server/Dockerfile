# Dockerfile for server
FROM python:3.9-slim

WORKDIR /app
COPY server.py requirements.txt ./
RUN pip install -r requirements.txt

CMD ["python", "server.py"]