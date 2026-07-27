"""Build the `goods` collection in Qdrant.

Embeds each (original-language) product name with the multilingual model and
uploads it with its English category payload. Reads connection details from the
environment (see config.py): QDRANT_URL, QDRANT_API_KEY, COLLECTION_NAME.
"""
import json
import os

from fastembed import TextEmbedding
from qdrant_client import QdrantClient, models

from goods_categorizer.config import (
    DATA_DIR, QDRANT_URL, QDRANT_API_KEY, COLLECTION_NAME,
    EMBEDDINGS_MODEL, FASTEMBED_MODEL_PATH,
)

BATCH = 512


def main():
    items = json.load(open(os.path.join(DATA_DIR, "good_items.json"), encoding="utf-8"))
    payload = json.load(open(os.path.join(DATA_DIR, "good_items_en.json"), encoding="utf-8"))
    texts = [r["item"] for r in items]

    if FASTEMBED_MODEL_PATH:
        emb = TextEmbedding(EMBEDDINGS_MODEL, specific_model_path=FASTEMBED_MODEL_PATH)
    else:
        emb = TextEmbedding(EMBEDDINGS_MODEL)
    vectors = list(emb.embed(texts, batch_size=256))
    dim = len(vectors[0])

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=120)
    if client.collection_exists(COLLECTION_NAME):
        client.delete_collection(COLLECTION_NAME)
    client.create_collection(
        COLLECTION_NAME,
        vectors_config=models.VectorParams(size=dim, distance=models.Distance.COSINE),
    )

    points = [
        models.PointStruct(id=i, vector=vectors[i].tolist(), payload=payload[i])
        for i in range(len(vectors))
    ]
    for i in range(0, len(points), BATCH):
        client.upsert(COLLECTION_NAME, points=points[i:i + BATCH], wait=(i + BATCH >= len(points)))

    print(f"uploaded {client.count(COLLECTION_NAME).count} points to '{COLLECTION_NAME}'")


if __name__ == "__main__":
    main()
