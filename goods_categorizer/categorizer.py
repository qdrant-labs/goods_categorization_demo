from collections import defaultdict

from qdrant_client import QdrantClient

from goods_categorizer.config import QDRANT_URL, QDRANT_API_KEY, COLLECTION_NAME
from goods_categorizer.vectorizer.vectorizer import Vectorizer


class GoodsCategorizer:
    def __init__(self):
        self.vectorizer = Vectorizer()
        self.qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

    def categorize(self, good: str):
        vector = self.vectorizer.embed(good)
        hits = self.qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=vector,
            limit=3,
            with_payload=True,
        ).points

        # Keep the closest example per category rather than summing the hits.
        # Summing made the number unbounded: two example products from the same
        # category inside the top 3 added together and the UI showed a "score"
        # above 1, which cannot be a cosine similarity. It also rewarded a
        # category for appearing twice over one that matched better once.
        scores = defaultdict(float)
        for hit in hits:
            payload = hit.payload or {}
            cat = (payload.get("top_category"), payload.get("category"))
            scores[cat] = max(scores[cat], hit.score)

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return {
            "categories": [
                {"category": cat, "top_category": top_cat, "score": score}
                for (top_cat, cat), score in ranked
            ]
        }

    def embed(self, good: str):
        # The 2D cluster-map projection (original UMAP mapper) is not bundled,
        # so the live query dot is disabled. Categorization is unaffected.
        return {"embedding": None}


if __name__ == "__main__":
    categorizer = GoodsCategorizer()
    print(categorizer.categorize("CPU cooler"))
