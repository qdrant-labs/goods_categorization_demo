import os

CODE_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.dirname(CODE_DIR)
DATA_DIR = os.path.join(ROOT_DIR, 'data')

COLLECTION_NAME = os.environ.get("COLLECTION_NAME", "goods")

QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333").strip()

# Sanitize the key: it goes into an HTTP header, which must be ASCII. Stray
# whitespace or non-ASCII characters from copy-paste would otherwise crash the
# client at startup, so drop them here.
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "").strip().encode("ascii", "ignore").decode()

EMBEDDINGS_MODEL = os.environ.get(
    "EMBEDDINGS_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)
# Optional: point at a pre-downloaded model dir instead of fetching from the hub.
FASTEMBED_MODEL_PATH = os.environ.get("FASTEMBED_MODEL_PATH") or None
