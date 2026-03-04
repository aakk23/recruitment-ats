import { useState, useEffect, useCallback } from "react";
import { fetchRoles } from "../api";

function RolesPage({ onRoleSelect }) {
  const [statusFilter, setStatusFilter] = useState("open");
  const [roles, setRoles] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Initial load / filter change — reset list
  useEffect(() => {
    setLoading(true);
    setError(null);
    setRoles([]);
    setNextCursor(null);

    fetchRoles(statusFilter)
      .then((data) => {
        setRoles(data.items);
        setNextCursor(data.next_cursor);
      })
      .catch(() => setError("Could not load roles"))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  // Load next page
  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    fetchRoles(statusFilter, 50, nextCursor)
      .then((data) => {
        setRoles((prev) => [...prev, ...data.items]);
        setNextCursor(data.next_cursor);
      })
      .catch(() => setError("Could not load more roles"))
      .finally(() => setLoadingMore(false));
  }, [statusFilter, nextCursor, loadingMore]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1e1e1e",
      padding: "24px",
      boxSizing: "border-box",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "1400px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}>
          <h2 style={{ margin: 0, color: "#fff" }}>Roles</h2>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.reload();
            }}
            style={{
              padding: "6px 12px",
              background: "#2a2a2a",
              color: "#fff",
              border: "1px solid #444",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["open", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 12px",
                background: statusFilter === s ? "#333" : "#2a2a2a",
                color: statusFilter === s ? "#fff" : "#aaa",
                border: "1px solid #444",
                borderRadius: "6px",
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── States ── */}
        {loading && <div style={{ color: "#777" }}>Loading roles…</div>}
        {error && <div style={{ color: "red" }}>{error}</div>}
        {!loading && !error && roles.length === 0 && (
          <div style={{ color: "#777" }}>No roles in this state yet</div>
        )}

        {/* ── Role cards ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "12px",
        }}>
          {roles.map((role) => (
            <div
              key={role.id}
              onClick={() => onRoleSelect(role)}
              style={{
                border: "1px solid #444",
                borderRadius: "8px",
                padding: "12px",
                cursor: "pointer",
                background: "#1f1f1f",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "6px", color: "#fff" }}>
                {role.title}
              </div>
              <div style={{ fontSize: "12px", color: "#aaa" }}>Client: {role.client}</div>
              <div style={{ fontSize: "11px", color: "#777" }}>Status: {role.status}</div>
            </div>
          ))}
        </div>

        {/* ── Load More ── */}
        {nextCursor && (
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                padding: "8px 24px",
                background: loadingMore ? "#333" : "#2a2a2a",
                color: loadingMore ? "#666" : "#aaa",
                border: "1px solid #444",
                borderRadius: "8px",
                cursor: loadingMore ? "default" : "pointer",
                fontSize: "13px",
              }}
            >
              {loadingMore ? "Loading…" : "Load more roles"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export default RolesPage;