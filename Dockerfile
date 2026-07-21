# Build step #1: build the Qdrant-styled front end
FROM node:20-bookworm-slim as build-step
WORKDIR /app
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.9

ENV PYTHONFAULTHANDLER=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONHASHSEED=random \
  PIP_NO_CACHE_DIR=off \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=100 \
  POETRY_VERSION=1.1.4

RUN pip install "poetry==$POETRY_VERSION"

WORKDIR /code
COPY poetry.lock pyproject.toml /code/

RUN poetry config virtualenvs.create false \
  && poetry install --no-dev --no-interaction --no-ansi

RUN python -c 'from sentence_transformers import SentenceTransformer; SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2") '

COPY . /code
COPY --from=build-step /app/dist /code/static

CMD uvicorn goods_categorizer.service:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WORKERS:-1}
