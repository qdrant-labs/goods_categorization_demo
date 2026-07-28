import json
import os
import traceback

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from goods_categorizer.categorizer import GoodsCategorizer
from goods_categorizer.config import DATA_DIR, COLLECTION_NAME, QDRANT_URL, QDRANT_API_KEY

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

categorizer = GoodsCategorizer()
graph_path = os.path.join(DATA_DIR, 'graph_en.json')


@app.get("/api/categorize")
async def categorize(q: str):
    try:
        return {"result": categorizer.categorize(good=q)}
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": type(e).__name__, "detail": str(e)[:500]},
        )


@app.get("/api/embed")
async def embed(q: str):
    return {"result": categorizer.embed(good=q)}


@app.get("/api/graph")
async def get_graph():
    with open(graph_path, encoding="utf-8") as fd:
        return json.load(fd)


@app.get("/api/health")
async def health():
    """Diagnostics: shows what config the service is actually using and whether
    it can reach the Qdrant collection (without exposing the key itself)."""
    raw = os.environ.get("QDRANT_API_KEY", "")
    bad = [{"pos": i, "codepoint": hex(ord(c))} for i, c in enumerate(raw) if ord(c) > 127]
    info = {
        "qdrant_url": QDRANT_URL,
        "collection": COLLECTION_NAME,
        "raw_key_len": len(raw),
        "raw_key_ascii": raw.isascii(),
        "raw_non_ascii": bad[:20],
        "sanitized_key_len": len(QDRANT_API_KEY),
        "sanitized_key_ascii": QDRANT_API_KEY.isascii(),
    }
    try:
        cols = [c.name for c in categorizer.qdrant_client.get_collections().collections]
        info["qdrant_ok"] = True
        info["collection_exists"] = COLLECTION_NAME in cols
        if info["collection_exists"]:
            info["points"] = categorizer.qdrant_client.count(COLLECTION_NAME).count
    except Exception as e:
        info["qdrant_ok"] = False
        info["error"] = f"{type(e).__name__}: {str(e)[:200]}"
    return info


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
