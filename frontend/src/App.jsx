import { useEffect, useMemo, useState } from "react";

import "./App.css";

import Header from "./components/Header";
import HeroPanel from "./components/HeroPanel";
import Footer from "./components/Footer";
import LoadingState from "./components/LoadingState";
import EmptyState from "./components/EmptyState";
import CategoryClusterMap from "./components/CategoryClusterMap";
import HowItWorksModal from "./components/HowItWorksModal";

import { categorize, loadGraph } from "./lib/api";

function App() {
  const [theme, setTheme] = useState("light");
  const [query, setQuery] = useState("Система охлаждения CPU");
  // The query the results actually reflect — only updates on a real search, so
  // the "Top categories for …" title doesn't change while you're still typing.
  const [submittedQuery, setSubmittedQuery] = useState("Система охлаждения CPU");
  const [categories, setCategories] = useState([]);
  const [graph, setGraph] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    loadGraph().then(setGraph).catch((e) => console.error(e));
    categorizeGood(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function categorizeGood(searchQuery = query) {
    const clean = searchQuery.trim();
    if (!clean) return;
    setQuery(clean);
    setSubmittedQuery(clean);
    setLoading(true);
    setError("");
    setHasSearched(true);
    try {
      setCategories(await categorize(clean));
    } catch (err) {
      console.error(err);
      setError("Categorization failed.");
    } finally {
      setLoading(false);
    }
  }

  // Place the query marker at the (score-weighted) position of its top matched
  // categories in the map — "your query landed here". Derived from the current
  // results + the static graph, so no separate projection is needed.
  const queryPoint = useMemo(() => {
    if (!categories.length || !graph.length) return null;
    const byCat = new Map(
      graph.map((g) => [(g.category || "").trim().toLowerCase(), g])
    );
    let x = 0, y = 0, w = 0;
    for (const c of categories.slice(0, 3)) {
      const g = byCat.get((c.category || "").trim().toLowerCase());
      if (!g) continue;
      const weight = Math.max(Number(c.score) || 0, 0.01);
      x += g.vec[0] * weight;
      y += g.vec[1] * weight;
      w += weight;
    }
    return w ? [x / w, y / w] : null;
  }, [categories, graph]);

  return (
    <main className={`app ${theme}`}>
      <Header
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onOpenHowItWorks={() => setShowHowItWorks(true)}
      />

      <section className="page">
        <HeroPanel
          query={query}
          setQuery={setQuery}
          onSearch={categorizeGood}
          loading={loading}
          error={error}
        />

        {categories.length > 0 ? (
          <section className={`results-section${loading ? " is-loading" : ""}`}>
            <div className="results-header">
              <div>
                <p className="eyebrow">Vector results</p>
                <h2>Top categories for “{submittedQuery}”</h2>
              </div>
              <span className="result-count">{categories.length} categories</span>
            </div>

            <div className="top-categories">
              {categories.map((c, i) => (
                <span key={i}>
                  {c.category}
                  <small style={{ opacity: 0.7, marginLeft: 6 }}>
                    {c.top_category}
                  </small>
                  <strong>{Number(c.score).toFixed(3)}</strong>
                </span>
              ))}
            </div>

            <CategoryClusterMap graph={graph} queryPoint={queryPoint} />
          </section>
        ) : loading ? (
          <LoadingState />
        ) : (
          hasSearched && <EmptyState />
        )}
      </section>

      <Footer theme={theme} />

      {showHowItWorks && (
        <HowItWorksModal onClose={() => setShowHowItWorks(false)} />
      )}
    </main>
  );
}

export default App;
