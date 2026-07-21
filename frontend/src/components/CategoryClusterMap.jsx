// Plots the category embedding space (graph.json, projected to 2D by the demo's
// UMAP mapper) with each category coloured by its top-level category, and marks
// where the query landed (from /api/embed).
const PALETTE = [
  "blue", "pink", "indigo", "green", "red", "yellow", "purple", "mint", "rose",
];

const PAD = 8;
const RANGE = 84;

function normalizer(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1;
  const spanY = Math.max(...ys) - minY || 1;
  return ([x, y]) => ({
    left: PAD + ((x - minX) / spanX) * RANGE,
    top: PAD + ((y - minY) / spanY) * RANGE,
  });
}

function CategoryClusterMap({ graph, queryPoint }) {
  if (!graph || graph.length === 0) return null;

  const topCats = [...new Set(graph.map((g) => g.top_category))];
  const colorFor = (t) => PALETTE[topCats.indexOf(t) % PALETTE.length];

  const allPoints = graph.map((g) => g.vec);
  if (queryPoint) allPoints.push(queryPoint);
  const toPos = normalizer(allPoints);

  return (
    <section className="cluster-section">
      <div className="cluster-map">
        {graph.map((g, i) => {
          const pos = toPos(g.vec);
          return (
            <span
              key={i}
              className={`cluster-dot ${colorFor(g.top_category)}`}
              style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            >
              <span className="cluster-tooltip">
                <strong>{g.category}</strong>
                <small>{g.top_category}</small>
              </span>
            </span>
          );
        })}

        {queryPoint && (
          <span
            className="query-marker"
            style={(() => {
              const p = toPos(queryPoint);
              return { left: `${p.left}%`, top: `${p.top}%` };
            })()}
          />
        )}
      </div>

      <div className="cluster-notes">
        <ul>
          <li>Each dot is a product category, coloured by its top-level group.</li>
          <li>The ringed marker shows where your query landed in the space.</li>
        </ul>
      </div>
    </section>
  );
}

export default CategoryClusterMap;
