// Run the built frontend and the function together on one port, the way Vercel
// serves them.
//
//   cd frontend && npm ci && npm run build
//   node --env-file=.env test/serve.mjs      # http://localhost:4175
//
// For looking at the demo without installing the Vercel CLI. Not how it deploys.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 4175);
const DIST = fileURLToPath(new URL("../frontend/dist/", import.meta.url));

const routes = {
  "/api/categorize": (await import("../frontend/api/categorize.ts")).default,
};

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json",
  ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  const route = routes[url.pathname];
  if (route) {
    const reply = {
      status(code) {
        res.statusCode = code;
        return this;
      },
      json(body) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(body));
      },
    };
    await route({ query: Object.fromEntries(url.searchParams) }, reply);
    return;
  }

  // Everything else is the SPA: a real file if there is one, index.html if not.
  const asked = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
  for (const path of [join(DIST, asked), join(DIST, "index.html")]) {
    try {
      const body = await readFile(path);
      res.setHeader("content-type", TYPES[extname(path)] ?? "application/octet-stream");
      res.end(body);
      return;
    } catch {
      /* fall through to index.html */
    }
  }
  res.statusCode = 404;
  res.end("not found");
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
