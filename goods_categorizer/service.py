import json
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from goods_categorizer.categorizer import GoodsCategorizer
from goods_categorizer.config import DATA_DIR

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
    return {"result": categorizer.categorize(good=q)}


@app.get("/api/embed")
async def embed(q: str):
    return {"result": categorizer.embed(good=q)}


@app.get("/api/graph")
async def get_graph():
    with open(graph_path, encoding="utf-8") as fd:
        return json.load(fd)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
