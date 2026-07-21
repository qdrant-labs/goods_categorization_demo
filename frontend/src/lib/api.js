// Talks to the original goods_categorization backend:
//   GET /api/categorize?q=  -> { result: { categories: [{category, top_category, score}] } }
//   GET /api/embed?q=       -> { result: { embedding: [x, y] } }
// The category cluster background (graph.json) is bundled as a static asset.
// The backend serves this frontend, so the API calls are same-origin.
//
// Set VITE_MOCK=1 in dev (no backend) to preview the styling with sample data.
const USE_MOCK = import.meta.env.VITE_MOCK === "1";
const BASE = import.meta.env.BASE_URL || "/";

let graphCache = null;

export async function loadGraph() {
  if (!graphCache) {
    graphCache = await fetch(`${BASE}data/graph.json`).then((r) => r.json());
  }
  return graphCache;
}

export async function categorize(query) {
  if (USE_MOCK) return mockCategories();
  const res = await fetch(`api/categorize?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Categorize failed (${res.status})`);
  const data = await res.json();
  return data.result?.categories || [];
}

export async function embed(query) {
  if (USE_MOCK) return mockPoint();
  const res = await fetch(`api/embed?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Embed failed (${res.status})`);
  const data = await res.json();
  return data.result?.embedding || null;
}

/* ------------------------------- dev mock -------------------------------- */

function mockCategories() {
  return Promise.resolve([
    { category: "CPU cooling systems", top_category: "Computers", score: 0.71 },
    { category: "Computer components", top_category: "Computers", score: 0.55 },
    { category: "Case fans", top_category: "Computers", score: 0.41 },
    { category: "Air conditioners", top_category: "Home appliances", score: 0.22 },
  ]);
}

function mockPoint() {
  return Promise.resolve([12.2, 6.4]);
}
