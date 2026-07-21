# Status — Goods Categorization

**Front end:** Qdrant-styled categorization UI + live cluster map, wired to
`GET /api/categorize` + `/api/embed` (category graph bundled). Backend now serves
it (static mount added).
**Back end connection:** patched to accept `QDRANT_URL` + `QDRANT_API_KEY`.

## ⚠️ Needs modernization before it will run on Qdrant Cloud
`pyproject.toml` pins **`qdrant-client ^0.3.4`** (very old) — incompatible with
current Qdrant Cloud. To run it you must:
1. Bump `qdrant-client` to a current 1.x in `pyproject.toml` (regenerate lock).
2. Update the query in `goods_categorizer/categorizer.py` — the old
   `self.qdrant_client.search(..., top=3, append_payload=True)` returning
   `(hit, payload)` tuples becomes `query_points(..., query=vec, limit=3,
   with_payload=True).points` (iterate `hit.payload` / `hit.score`).
3. Update `goods_categorizer/upload_data.py` similarly (collection creation with
   `VectorParams`, upsert with modern `PointStruct`) and load the `goods`
   collection (model `paraphrase-multilingual-MiniLM-L12-v2`, 384-d).
4. Deploy on Render, instance ≥ 2 GB RAM.

I did not blind-rewrite this unverified — it needs a real pass + a build/run check.
