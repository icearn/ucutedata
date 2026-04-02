FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY message_hub ./message_hub
COPY README.md ./README.md

CMD ["uvicorn", "message_hub.api:app", "--host", "0.0.0.0", "--port", "8010"]
