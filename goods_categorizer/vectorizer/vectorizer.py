from fastembed import TextEmbedding

from goods_categorizer.config import EMBEDDINGS_MODEL, FASTEMBED_MODEL_PATH


class Vectorizer:
    """Embeds text with the multilingual MiniLM model via fastembed.

    Uses the same model the `goods` collection was built with, so queries and
    stored vectors share one space.
    """

    def __init__(self):
        if FASTEMBED_MODEL_PATH:
            self.model = TextEmbedding(EMBEDDINGS_MODEL, specific_model_path=FASTEMBED_MODEL_PATH)
        else:
            self.model = TextEmbedding(EMBEDDINGS_MODEL)

    def embed(self, text: str):
        return list(self.model.embed([text]))[0].tolist()
