FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY kiwisaver_insight ./kiwisaver_insight
COPY database ./database
COPY README.md ./README.md

EXPOSE 8000
CMD ["uvicorn", "kiwisaver_insight.api:app", "--host", "0.0.0.0", "--port", "8000"]
