# Backend service: FastAPI + fastembed, querying Qdrant Cloud.
# The React frontend is deployed separately (e.g. Vercel) and calls this API.
FROM python:3.11-slim-bookworm

RUN apt-get update -y && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir \
    "fastapi==0.103.2" \
    "uvicorn==0.18.3" \
    "qdrant-client[fastembed]==1.14.2"

# Bake the embedding model into the image so there is no cold-start download.
RUN python -c 'from fastembed import TextEmbedding; TextEmbedding("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")'

COPY goods_categorizer /app/goods_categorizer
COPY data /app/data

EXPOSE 8000

CMD uvicorn goods_categorizer.service:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WORKERS:-1}
