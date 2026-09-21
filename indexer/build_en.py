"""Build the English category collection.

    python indexer/build_en.py --collection goods-en

The original collection holds 2,964 Russian subcategory names embedded with a
multilingual MiniLM. That model is not in the Qdrant Cloud Inference catalog and
neither is any other multilingual one, so the demo cannot keep both its language
and its two-vendor setup. The English category list that ships in
`data/graph_en.json` is what gets indexed instead.

The API only ever returned `top_category` and `category`, never the subcategory,
so the distinct label pairs are exactly the set of answers the demo can give.
They live in `data/categories_en.json`, which was derived from the old
collection rather than from `data/graph_en.json`, because that file is missing
five of them, Pet Supplies among them, and a demo that cannot answer "cat food"
would be a regression rather than a port. Pass `--from-collection goods` to
re-derive it.

Standard library only. Qdrant Cloud Inference does the embedding, so nothing
here loads a model.
"""

import argparse
import json
import os
import ssl
import sys
import urllib.request
from urllib.error import HTTPError

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CATEGORIES = os.path.join(ROOT, "data", "categories_en.json")

DEFAULT_MODEL = "mixedbread-ai/mxbai-embed-large-v1"
# Dimensions per model, so the collection is created with the right size.
DIMS = {
    "mixedbread-ai/mxbai-embed-large-v1": 1024,
    "sentence-transformers/all-MiniLM-L6-v2": 384,
}


def env(name):
    value = os.environ.get(name, "").strip().strip('"').strip("'")
    if not value:
        sys.exit(f"{name} is not set. Put it in .env and run with --env-file, or export it.")
    return value


def request(url, key, path, body=None, method=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{url}{path}",
        data=data,
        method=method or ("POST" if data else "GET"),
        headers={"api-key": key, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120, context=ssl.create_default_context()) as r:
            return json.load(r)
    except HTTPError as e:
        sys.exit(f"{e.code} on {path}: {e.read().decode()[:400]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--collection", default="goods-en")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument(
        "--from-collection",
        help="re-derive data/categories_en.json from this collection's payloads first",
    )
    ap.add_argument("--recreate", action="store_true", help="delete the collection first")
    args = ap.parse_args()

    size = DIMS.get(args.model)
    if size is None:
        sys.exit(f"unknown dimension for {args.model}; add it to DIMS")

    url = env("QDRANT_URL").rstrip("/")
    key = env("QDRANT_API_KEY")

    if args.from_collection:
        pairs, offset = set(), None
        while True:
            body = {"limit": 1000, "with_payload": True}
            if offset is not None:
                body["offset"] = offset
            page = request(url, key, f"/collections/{args.from_collection}/points/scroll", body)["result"]
            for point in page["points"]:
                payload = point["payload"]
                if payload.get("top_category") and payload.get("category"):
                    pairs.add((payload["top_category"], payload["category"]))
            offset = page.get("next_page_offset")
            if offset is None:
                break
        with open(CATEGORIES, "w", encoding="utf-8", newline=chr(10)) as fd:
            json.dump(
                [{"top_category": t, "category": c} for t, c in sorted(pairs)],
                fd,
                ensure_ascii=False,
                indent=2,
            )
        print(f"wrote {len(pairs)} categories from {args.from_collection}")

    with open(CATEGORIES, encoding="utf-8") as fd:
        categories = [(c["top_category"], c["category"]) for c in json.load(fd)]

    if args.recreate:
        request(url, key, f"/collections/{args.collection}", method="DELETE")

    request(
        url,
        key,
        f"/collections/{args.collection}",
        {"vectors": {"size": size, "distance": "Cosine"}},
        method="PUT",
    )

    # "Auto / Automotive Tools" rather than the bare category name: the parent
    # disambiguates the several categories that share a name across groups,
    # "Accessories" being under both Auto and Clothing.
    points = [
        {
            "id": i,
            "vector": {"text": f"{top} / {category}", "model": args.model},
            "payload": {"category": category, "top_category": top},
        }
        for i, (top, category) in enumerate(categories)
    ]

    # One request: 179 short strings is well inside any sane body limit, and
    # wait=true means the next line can count them honestly.
    result = request(
        url, key, f"/collections/{args.collection}/points?wait=true", {"points": points}, method="PUT"
    )
    count = request(url, key, f"/collections/{args.collection}/points/count", {"exact": True})

    print(f"{args.collection}: {count['result']['count']} points, {size}d, {args.model}")
    tokens = (result.get("usage") or {}).get("inference", {}).get("models", {})
    if tokens:
        print(f"inference tokens: {tokens}")


if __name__ == "__main__":
    main()
