// Accuracy and latency against the Railway backend this replaces.
//
//   node --env-file=.env test/compare.mjs
//   COLLECTION_NAME=goods-en-minilm EMBEDDINGS_MODEL=sentence-transformers/all-MiniLM-L6-v2 \
//     node --env-file=.env test/compare.mjs
//
// The old backend embeds an English query with a multilingual MiniLM and
// searches 2,964 Russian subcategory names. The new one embeds with a model
// from the Cloud Inference catalog and searches the 179 English categories.
// Different index, so a ranking diff means nothing on its own: what matters is
// whether the answer is right.
//
// CASES below is hand-written from the taxonomy in data/categories_en.json. Both
// systems are scored against the same labels, and the debatable ones are
// debatable for both. Labels are the top category, which is the coarser and
// less arguable of the two levels the demo returns.
const OLD = process.env.OLD ?? "https://goodscategorizationdemo-production.up.railway.app";
const REPS = Number(process.env.REPS ?? 3);

const handler = (await import("../frontend/api/categorize.ts")).default;

async function callNew(q) {
  const out = {};
  const res = {
    status(c) {
      out.code = c;
      return this;
    },
    json(b) {
      out.body = b;
    },
  };
  const t = Date.now();
  await handler({ query: { q } }, res);
  return { ...out, ms: Date.now() - t };
}

// The Railway container resets a connection now and then. Retry rather than
// lose the run, and drop the timing of a retried call so a reset does not show
// up as the old backend being slow.
async function callOld(q, attempt = 0) {
  const t = Date.now();
  try {
    const r = await fetch(`${OLD}/api/categorize?q=${encodeURIComponent(q)}`);
    return { code: r.status, body: await r.json(), ms: Date.now() - t, retried: attempt > 0 };
  } catch (err) {
    if (attempt >= 3) throw err;
    await new Promise((done) => setTimeout(done, 500 * 2 ** attempt));
    return callOld(q, attempt + 1);
  }
}

const CASES = [
  ["CPU cooler", "Computers"],
  ["graphics card", "Computers"],
  ["mechanical keyboard", "Computers"],
  ["SSD hard drive", "Computers"],
  ["car battery", "Auto"],
  ["windshield wipers", "Auto"],
  ["motor oil", "Auto"],
  ["winter tires", "Auto"],
  ["olive oil", "Food"],
  ["ground coffee", "Food"],
  ["frozen pizza", "Food"],
  ["fresh bread", "Food"],
  ["running shoes", "Clothing, Shoes & Accessories"],
  ["winter jacket", "Clothing, Shoes & Accessories"],
  ["leather handbag", "Clothing, Shoes & Accessories"],
  ["shampoo", "Beauty Products"],
  ["lipstick", "Beauty Products"],
  ["perfume", "Beauty Products"],
  ["baby stroller", "Children Goods"],
  ["toy building blocks", "Children Goods"],
  ["school backpack", "Children Goods"],
  ["washing machine", "Household Appliances"],
  ["microwave oven", "Household Appliances"],
  ["vacuum cleaner", "Household Appliances"],
  ["air conditioner", "Household Appliances"],
  ["smartphone", "Electronics"],
  ["wireless headphones", "Electronics"],
  ["digital camera", "Electronics"],
  ["gps navigator", "Electronics"],
  ["yoga mat", "Sports & Recreation"],
  ["mountain bike", "Sports & Recreation"],
  ["fishing rod", "Sports & Recreation"],
  ["ski boots", "Sports & Recreation"],
  ["vitamin c tablets", "Health Products"],
  ["blood pressure monitor", "Health Products"],
  ["reading glasses", "Health Products"],
  ["power drill", "Construction and Repair"],
  ["interior door", "Construction and Repair"],
  ["heating radiator", "Construction and Repair"],
  ["lawn mower", "Cottage, orchard and garden"],
  ["tomato seeds", "Cottage, orchard and garden"],
  ["barbecue grill", "Cottage, orchard and garden"],
  ["bed sheets", "Household Goods"],
  ["floor lamp", "Household Goods"],
  ["laundry detergent", "Household Goods"],
  ["acoustic guitar", "Leisure and Entertainment"],
  ["concert tickets", "Leisure and Entertainment"],
  ["legal consultation", "Services"],
  ["car insurance", "Services"],
];

const cats = (r) => r.body?.result?.categories ?? [];
const tops = (r) => cats(r).map((c) => c.top_category);
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const mean = (xs) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

// Warm up: the first call pays a TLS handshake that would otherwise land in the
// numbers, and the Railway container may be cold.
for (let i = 0; i < 3; i++) {
  await callNew("warmup");
  await callOld("warmup");
}

const ms = { neu: [], old: [] };
const hit = { neu1: 0, neu3: 0, old1: 0, old3: 0 };
const misses = [];

for (const [q, want] of CASES) {
  let n, o;
  for (let r = 0; r < REPS; r++) {
    if (r % 2 === 0) {
      n = await callNew(q);
      o = await callOld(q);
    } else {
      o = await callOld(q);
      n = await callNew(q);
    }
    if (n.code !== 200 || o.code !== 200) {
      console.log(`  error ${q}: new ${n.code} ${JSON.stringify(n.body).slice(0, 100)}, old ${o.code}`);
      continue;
    }
    ms.neu.push(n.ms);
    if (!o.retried) ms.old.push(o.ms);
  }

  const nt = tops(n);
  const ot = tops(o);
  if (nt[0] === want) hit.neu1++;
  if (nt.includes(want)) hit.neu3++;
  if (ot[0] === want) hit.old1++;
  if (ot.includes(want)) hit.old3++;

  const mark = (t) => (t[0] === want ? "  " : t.includes(want) ? "~ " : "X ");
  if (nt[0] !== want || ot[0] !== want) {
    misses.push(
      `${q.padEnd(24)} want ${want.padEnd(30)} ${mark(nt)}new ${String(nt[0]).padEnd(30)} ${mark(ot)}old ${ot[0]}`,
    );
  }
}

const n = CASES.length;
const p = (x) => `${((x / n) * 100).toFixed(1)}%`;

console.log(`\ncollection: ${process.env.COLLECTION_NAME ?? "goods-en"}`);
console.log(`model:      ${process.env.EMBEDDINGS_MODEL ?? "mixedbread-ai/mxbai-embed-large-v1"}`);

console.log("\n=== top category correct, over " + n + " hand-labeled queries ===");
console.log(`new  top-1 ${p(hit.neu1)}   within top-3 ${p(hit.neu3)}`);
console.log(`old  top-1 ${p(hit.old1)}   within top-3 ${p(hit.old3)}`);

console.log("\n=== latency, ms (measured from this machine) ===");
console.log(`new  p50 ${pct(ms.neu, 50)}  p95 ${pct(ms.neu, 95)}  mean ${mean(ms.neu)}   (n=${ms.neu.length})`);
console.log(`old  p50 ${pct(ms.old, 50)}  p95 ${pct(ms.old, 95)}  mean ${mean(ms.old)}   (n=${ms.old.length})`);

if (misses.length) {
  console.log(`\n=== disagreements with the labels (${misses.length}) ===`);
  for (const line of misses) console.log(line);
}
