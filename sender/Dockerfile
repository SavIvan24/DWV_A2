# Dockerfile for sender
FROM python:3.9-slim

WORKDIR /app
COPY sender.py requirements.txt ./
RUN pip install -r requirements.txt

CMD ["python", "sender.py"]