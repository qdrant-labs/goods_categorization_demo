# Consumer goods categorisation

![Demo](./demo.gif)

Type a product name and the demo returns the most likely categories from a
multi-level category tree. The name is embedded with a multilingual text model
and matched against a Qdrant collection of category examples — so it works
across languages and by meaning, not keywords. Adding new categories is just
adding vectors to the collection; **no retraining** required.

The colored dots under the results are the category vectors, projected to 2D so
the space can be rendered (relative distances are approximate).

## What's inside

| | |
|-|-|
| Qdrant | Vector database storing the category examples. |
| `paraphrase-multilingual-MiniLM-L12-v2` | Multilingual embedding model (384-dim). |
| FastEmbed | Runs the model to embed queries and data. |
| React (Vite) | The frontend, styled with the Qdrant design system. |

## Run locally

The backend talks to **Qdrant Cloud** (or any Qdrant). Set the connection env
vars, then run the API and the frontend separately.

**Backend**

```bash
pip install "fastapi" "uvicorn" "qdrant-client[fastembed]"

export QDRANT_URL="https://<your-cluster>:6333"
export QDRANT_API_KEY="<your-key>"
export COLLECTION_NAME="goods"

uvicorn goods_categorizer.service:app --host 0.0.0.0 --port 8000
```

**Frontend** (in another terminal)

```bash
cd frontend
npm install
npm run dev
```

The frontend calls the backend on the same origin by default. To point it at a
backend on a different host, set `VITE_API_BASE` (e.g. `http://localhost:8000`).

## Build the collection

The product data lives in `data/`. To (re)build the `goods` collection in the
Qdrant cluster named by your env vars:

```bash
python -m goods_categorizer.upload_data
```

## Deploy

The backend (API) and frontend (static site) are deployed as two services
against Qdrant Cloud.

**Backend — Railway (or any Docker host)**

1. Deploy this repo from GitHub. The `Dockerfile` installs deps, bakes the
   embedding model, and runs FastAPI bound to `$PORT`.
2. Set env vars: `QDRANT_URL`, `QDRANT_API_KEY`, `COLLECTION_NAME=goods`.
3. Copy the service URL.

**Frontend — Vercel**

1. Import this repo with **Root Directory = `frontend`** (Vite is auto-detected).
2. Set `VITE_API_BASE` to the backend URL from the step above.
3. Deploy — the resulting URL is the public demo.
