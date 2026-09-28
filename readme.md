# Semantic Product Categorization

Type a product name and get the catalog categories it belongs to, ranked. The
cluster map shows where the query landed among the categories.

## Two Services, Not Three

The demo runs on **Vercel** and **Qdrant Cloud**, and nothing else.

The query is embedded inside the cluster by **Qdrant Cloud Inference**, so there
is no model to load and no Python process to host. What used to be a FastAPI
container on Railway is one serverless function that posts JSON to Qdrant:
[`frontend/api/categorize.ts`](frontend/api/categorize.ts). It has no
dependencies.

## The Language Change

This is the one demo where the port changed what the demo can answer, so it is
stated up front.

The old collection held 2,964 **Russian** subcategory names, embedded with
`paraphrase-multilingual-MiniLM-L12-v2`. That model is not in the Cloud
Inference catalog, and neither is any other multilingual model: checked
`paraphrase-multilingual-mpnet-base-v2` and `multilingual-e5-large` as well.
Keeping the language meant keeping an external provider key, which is the third
vendor this work exists to remove.

So the demo is now **English only**. The new collection holds the 179 English
category labels, which were always the only answers this endpoint could return:
the API sent back `top_category` and `category`, never the subcategory the
vectors were built from.

Four strings in the UI claimed multilingual support and are corrected, along
with the Russian and German example chips, which would now fail.

## What's Inside

| | |
|-|-|
| Qdrant | Holds the category vectors and answers the nearest-neighbor query. |
| Qdrant Cloud Inference | Embeds the query in-cluster, so the app ships no model. |
| `mxbai-embed-large-v1` | The embedding model. 1024 dimensions. |
| React (Vite) on Vercel | The frontend, styled with the Qdrant design system. |

| Component | |
|-|-|
| `frontend/api/categorize.ts` | `GET /api/categorize?q=`. The whole backend. |
| `indexer/build_en.py` | Builds the category collection. Standard library only. |
| `data/categories_en.json` | The 179 label pairs, derived from the old collection. |

## How It Works

Each category is one point: the text `"Top / Category"` embedded with mxbai. The
parent is included because 2 category names repeat across groups, with
"Accessories" sitting under both Auto and Computers.

A query is embedded in-cluster and matched against those 179 points. The top 3
are kept, one score per category, taking the closest hit rather than summing
them: summing made the number unbounded, so two hits from one category could
show a "score" above 1, which cannot be a cosine.

## Build the Collection

```bash
cp .env.example .env    # then fill in QDRANT_URL and QDRANT_API_KEY
python indexer/build_en.py
```

179 points, about 2,100 inference tokens, a few seconds. Pass
`--from-collection goods` to re-derive `data/categories_en.json` from an
existing collection's payloads first.

## Run Locally

**Prerequisites:** Node 20 or newer, and a Qdrant Cloud cluster with Cloud
Inference enabled. A local Qdrant in Docker cannot serve this demo, because
nothing would embed the query.

```bash
npm i -g vercel
cd frontend && vercel dev
```

## Configuration

| Variable | Default | |
|-|-|-|
| `QDRANT_URL` | none | Qdrant Cloud endpoint |
| `QDRANT_API_KEY` | none | Qdrant Cloud key |
| `COLLECTION_NAME` | `goods-en` | collection to search |
| `EMBEDDINGS_MODEL` | `mixedbread-ai/mxbai-embed-large-v1` | the in-cluster encoder |
| `TOP_K` | `3` | categories returned |

`VITE_API_BASE` must be **unset**. It pointed the frontend at the old Railway
API; empty means same-origin, which is where the function now is.

## Measured Against the Backend It Replaces

The index changed, so comparing rankings would say nothing. What matters is
whether the answer is right, so both systems are scored against the same labels.

49 English product queries, each labeled with its expected top category, written
by hand from the taxonomy in `data/categories_en.json`. The debatable ones are
debatable for both systems. 3 repetitions, interleaved, and `test/compare.mjs`
re-runs the whole thing.

| | top-1 correct | within top-3 | p50 | p95 |
|-|-|-|-|-|
| new, mxbai | 81.6% | 95.9% | **124ms** | **182ms** |
| old, Railway | 79.6% | 95.9% | 175ms | 240ms |

**The accuracy difference is not real.** 81.6% against 79.6% is 40 queries out
of 49 against 39, and the paired counts show why that means nothing: the two
systems agree on 34 queries, the new one wins 8 the old one loses, and the old
one wins 7 the new one loses. An exact sign test on those 15 discordant pairs
gives p = 1.00. Read the table as a draw on accuracy and a clear win on latency.

Holding the draw is itself the result worth stating, because it was not
guaranteed: the new index is 179 category labels against the old one's 2,964
subcategory examples, so it has 16 times less text to match against, in a
language the collection was not built in.

The 15 queries the two systems disagree on are listed by `test/compare.mjs`.
Both sides fail on the same kind of item, one that sits between groups: a
washing machine is an appliance or a household good, and ski boots are footwear
or sports equipment.

### What Did Not Work

`all-MiniLM-L6-v2` was built and measured first, because at 384 dimensions it
matches the old collection's size and is far cheaper to run. It is half the
latency and clearly worse:

| | top-1 correct | within top-3 | p50 |
|-|-|-|-|
| MiniLM-L6 | 75.5% | 85.7% | 59ms |
| mxbai | 81.6% | 95.9% | 124ms |

Losing 10 points of top-3 accuracy to save 65ms is the wrong trade for a demo
whose entire job is returning the right category, so the collection was rebuilt
on mxbai and the MiniLM one deleted.

The first build indexed the 175 categories in `data/graph_en.json`. The live
collection has 179, and the five missing ones include all of Pet Supplies, so
the demo would have silently lost the ability to answer "cat food". The label
set now comes from the collection itself.

## Where This Stops Working

**A cluster without Cloud Inference.** The function sends query text, not a
vector, and nothing in this repository can embed. A cluster with inference off
returns an error on every query rather than degrading.

**Any language but English.** Stated above, and it is a real loss. If a
multilingual model reaches the Cloud Inference catalog, re-running
`indexer/build_en.py` against a translated label set is the whole fix.

**A catalog much larger than this one.** 179 points is small enough that the
search is effectively exact. A taxonomy of hundreds of thousands of categories
would need the payload index and tuning that this demo does not have.

**The query dot on the cluster map** is positioned by the frontend from the
matched categories. The original UMAP projection is not bundled, and running it
in a serverless function is not practical.

## Checks

```bash
node --env-file=.env test/compare.mjs   # the accuracy and latency tables above
node --env-file=.env test/serve.mjs     # the built frontend and the function on one port
```
