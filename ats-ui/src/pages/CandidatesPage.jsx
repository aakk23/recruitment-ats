import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCandidates } from "../api";

export default function CandidatesPage({ onCandidateSelect }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const load = useCallback((cursor = null, append = false) => {
    if (cursor) setLoadingMore(true);
    else {
      setLoading(true);
      setError(null);
    }
    fetchCandidates({
      search: debouncedSearch || undefined,
      limit: 50,
      cursor: cursor || undefined,
    })
      .then((data) => {
        const list = data?.items || [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        setNextCursor(data?.next_cursor || null);
      })
      .catch(() => setError("Could not load candidates"))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [debouncedSearch]);

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    load();
  }, [load]);

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg-base)", padding: "28px 32px" }}>
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em" }}>Candidates</h1>
            <p style={{ margin: "3px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
              {items.length > 0 ? `${items.length}${nextCursor ? "+" : ""} candidates` : "Search and open candidate profiles"}
            </p>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            style={{
              width: 270,
              padding: "9px 12px",
              fontSize: "13px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>

        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <div style={theadStyle}>
            <div style={{ ...thStyle, flex: "1 1 280px" }}>Candidate</div>
            <div style={{ ...thStyle, flex: "0 0 190px" }}>Phone</div>
            <div style={{ ...thStyle, flex: "0 0 120px" }}>Applications</div>
            <div style={{ ...thStyle, flex: "0 0 130px" }}>Last Applied</div>
          </div>

          {error && (
            <div style={{ padding: "14px 16px", color: "var(--danger)", fontSize: "13px" }}>{error}</div>
          )}

          {loading && (
            <div style={{ padding: "16px", color: "var(--text-muted)", fontSize: "13px" }}>Loading candidates...</div>
          )}

          {!loading && !error && items.length === 0 && (
            <div style={{ padding: "28px 16px", color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>
              No candidates found.
            </div>
          )}

          {!loading && !error && items.map((cand, idx) => (
            <button
              key={cand.id}
              onClick={() => onCandidateSelect?.(cand.id)}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                borderTop: "1px solid var(--border-subtle)",
                borderBottom: idx === items.length - 1 && !nextCursor ? "none" : "1px solid var(--border-subtle)",
                background: "transparent",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ ...tdStyle, flex: "1 1 280px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{cand.full_name}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{cand.email || "No email"}</div>
              </div>
              <div style={{ ...tdStyle, flex: "0 0 190px" }}>{cand.phone || "—"}</div>
              <div style={{ ...tdStyle, flex: "0 0 120px" }}>{cand.applications_count || 0}</div>
              <div style={{ ...tdStyle, flex: "0 0 130px" }}>
                {cand.last_applied_at ? new Date(cand.last_applied_at).toLocaleDateString() : "—"}
              </div>
            </button>
          ))}

          {nextCursor && (
            <div style={{ padding: "10px 16px", textAlign: "center", borderTop: "1px solid var(--border-subtle)" }}>
              <button
                onClick={() => load(nextCursor, true)}
                disabled={loadingMore}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "13px",
                }}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const theadStyle = {
  display: "flex",
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: "1px solid var(--border-subtle)",
  background: "var(--bg-raised)",
};

const thStyle = {
  fontSize: "11px",
  color: "var(--text-muted)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const tdStyle = {
  fontSize: "13px",
  color: "var(--text-secondary)",
};
