import os
import unicodedata

CODE_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.dirname(CODE_DIR)
DATA_DIR = os.path.join(ROOT_DIR, 'data')

COLLECTION_NAME = os.environ.get("COLLECTION_NAME", "goods")

# Common Cyrillic/Greek look-alikes (homoglyphs) of the base64url alphabet that
# copy-paste sometimes substitutes for the real ASCII characters. Map them back.
_HOMOGLYPHS = {
    # Cyrillic uppercase -> Latin
    "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O",
    "Р": "P", "С": "C", "Т": "T", "У": "Y", "Х": "X", "І": "I", "Ј": "J", "Ѕ": "S",
    # Cyrillic lowercase -> Latin
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
    "і": "i", "ј": "j", "ѕ": "s", "һ": "h", "ԛ": "q", "ԝ": "w",
    # Greek -> Latin
    "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K",
    "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
    "ο": "o", "ν": "v", "α": "a", "ρ": "p", "ϲ": "c",
    # Dashes/underscores that are not ASCII hyphen/underscore
    "‐": "-", "‑": "-", "–": "-", "—": "-", "﹣": "-", "－": "-",
    "＿": "_",
}
_HOMOGLYPH_TABLE = str.maketrans(_HOMOGLYPHS)


def _sanitize_key(raw: str) -> str:
    """The API key goes into an HTTP header (ASCII only). Repair look-alike
    characters from copy-paste, fold compatibility forms, then drop anything
    still non-ASCII so a bad paste can never crash the service."""
    k = unicodedata.normalize("NFKC", raw.strip())
    k = k.translate(_HOMOGLYPH_TABLE)
    return k.encode("ascii", "ignore").decode()


QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333").strip()
QDRANT_API_KEY = _sanitize_key(os.environ.get("QDRANT_API_KEY", ""))

EMBEDDINGS_MODEL = os.environ.get(
    "EMBEDDINGS_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)
# Optional: point at a pre-downloaded model dir instead of fetching from the hub.
FASTEMBED_MODEL_PATH = os.environ.get("FASTEMBED_MODEL_PATH") or None
