/**
 * GET /api/categorize?q=
 *
 * The whole backend. Replaces the FastAPI service that ran on Railway and
 * loaded a multilingual MiniLM to embed the query. Qdrant Cloud Inference
 * embeds inside the cluster, so nothing here loads a model.
 *
 * The collection changed with it. The old one held 2,964 Russian subcategory
 * names, and no multilingual model exists in the Cloud Inference catalog, so
 * the demo could keep its language or its two-vendor setup, not both. It now
 * searches the 175 English categories from `data/graph_en.json`, which were
 * always the only answers this endpoint could return.
 */

const BASE = (process.env.QDRANT_URL ?? "").replace(/\/+$/, "");
const API_KEY = process.env.QDRANT_API_KEY ?? "";
const COLLECTION = process.env.COLLECTION_NAME || "goods-en";
const MODEL = process.env.EMBEDDINGS_MODEL || "mixedbread-ai/mxbai-embed-large-v1";
const TOP_K = Number(process.env.TOP_K ?? 3);
const TIMEOUT_MS = Number(process.env.QDRANT_TIMEOUT_MS ?? 15000);

type Hit = { score: number; payload: { category?: string; top_category?: string } };

type Req = { query?: Record<string, string | string[] | undefined> };
type Res = { status(code: number): Res; json(body: unknown): void };

export default async function handler(req: Req, res: Res) {
  const q = String(req.query?.q ?? "");
  if (!q.trim()) {
    res.status(200).json({ result: { categories: [] } });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}/collections/${COLLECTION}/points/query`, {
      method: "POST",
      headers: { "api-key": API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        query: { text: q, model: MODEL },
        limit: TOP_K,
        with_payload: true,
      }),
      signal: controller.signal,
    });
    const payload: any = await r.json();
    if (!r.ok || !payload.result) {
      throw new Error(payload?.status?.error ?? `Qdrant returned ${r.status}`);
    }

    // Keep the closest example per category rather than summing the hits.
    // Summing made the number unbounded: two hits from the same category added
    // together and the UI showed a "score" above 1, which cannot be a cosine.
    // It also rewarded a category for appearing twice over one that matched
    // better once.
    const best = new Map<string, { category: string; top_category: string; score: number }>();
    for (const hit of payload.result.points as Hit[]) {
      const category = hit.payload?.category ?? "";
      const top_category = hit.payload?.top_category ?? "";
      const key = `${top_category}|${category}`;
      const seen = best.get(key);
      if (!seen || hit.score > seen.score) best.set(key, { category, top_category, score: hit.score });
    }

    const categories = [...best.values()].sort((a, b) => b.score - a.score);
    res.status(200).json({ result: { categories } });
  } catch (err) {
    console.error(`categorize failed for q=${JSON.stringify(q)}:`, err);
    res.status(500).json({ error: "Unavailable", detail: "Categorization is temporarily unavailable." });
  } finally {
    clearTimeout(timer);
  }
}
