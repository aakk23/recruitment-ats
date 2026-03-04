// src/pages/RolesPage.jsx
import { useState, useEffect, useCallback } from "react";
import { fetchRoles } from "../api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(title) {
  return title
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// Deterministic hue from role title — gives each card a unique but stable tint
function titleHue(title) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return h;
}

// ─────────────────────────────────────────────────────────────────────────────

function RolesPage({ onRoleSelect }) {
  const [statusFilter, setStatusFilter] = useState("open");
  const [roles,        setRoles]        = useState([]);
  const [nextCursor,   setNextCursor]   = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setRoles([]);
    setNextCursor(null);
    fetchRoles(statusFilter)
      .then((data) => { setRoles(data.items); setNextCursor(data.next_cursor); })
      .catch(() => setError("Could not load roles"))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const loadMore = useCallback(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    fetchRoles(statusFilter, 50, nextCursor)
      .then((data) => { setRoles((p) => [...p, ...data.items]); setNextCursor(data.next_cursor); })
      .catch(() => setError("Could not load more roles"))
      .finally(() => setLoadingMore(false));
  }, [statusFilter, nextCursor, loadingMore]);

  return (
    <div style={{ minHeight: "calc(100vh - 52px)", background: "var(--bg-base)", padding: "32px 24px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* ── Page header ── */}
        <div style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "28px",
        }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
              Roles
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
              {roles.length > 0 ? `${roles.length}${nextCursor ? "+" : ""} ${statusFilter} positions` : ""}
            </p>
          </div>

          {/* Filter tabs */}
          <div style={{
            display: "flex",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "3px",
            gap: "2px",
          }}>
            {["open", "closed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "5px 16px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  background: statusFilter === s ? "var(--bg-raised)" : "transparent",
                  color: statusFilter === s ? "var(--text-primary)" : "var(--text-muted)",
                  border: statusFilter === s ? "1px solid var(--border-default)" : "1px solid transparent",
                  transition: "all 0.15s",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── States ── */}
        {loading && (
          <div style={{ color: "var(--text-muted)", padding: "60px 0", textAlign: "center", fontSize: "13px" }}>
            Loading roles…
          </div>
        )}
        {error && (
          <div style={{
            padding: "12px 16px", background: "var(--danger-muted)",
            border: "1px solid var(--danger)", borderRadius: "var(--radius-md)",
            color: "var(--danger)", fontSize: "13px", marginBottom: "16px",
          }}>
            {error}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && roles.length === 0 && (
          <div style={{
            textAlign: "center", padding: "80px 0",
            color: "var(--text-muted)",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📋</div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              No {statusFilter} roles
            </div>
            <div style={{ fontSize: "13px" }}>
              {statusFilter === "open" ? "Open roles will appear here once created." : "Closed roles will appear here."}
            </div>
          </div>
        )}

        {/* ── Role cards grid ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "14px",
        }}>
          {roles.map((role) => {
            const hue = titleHue(role.title);
            const isOpen = role.status === "open";
            return (
              <div
                key={role.id}
                onClick={() => onRoleSelect(role)}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)",
                  padding: "0",
                  cursor: "pointer",
                  overflow: "hidden",
                  transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Accent top border strip — unique hue per role */}
                <div style={{
                  height: "3px",
                  background: `hsl(${hue}, 65%, 55%)`,
                }} />

                <div style={{ padding: "18px 20px 20px" }}>
                  {/* Avatar + Title row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: `hsl(${hue}, 55%, 18%)`,
                      border: `1px solid hsl(${hue}, 55%, 28%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: `hsl(${hue}, 65%, 65%)`,
                      flexShrink: 0,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.02em",
                    }}>
                      {getInitials(role.title)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        lineHeight: 1.3,
                        marginBottom: "3px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {role.title}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {role.client}
                      </div>
                    </div>
                  </div>

                  {/* Footer row — status badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <span className={`badge ${isOpen ? "badge-open" : "badge-closed"}`}>
                      <span className="dot" style={{
                        background: isOpen ? "var(--success)" : "var(--danger)",
                      }} />
                      {role.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Load more ── */}
        {nextCursor && (
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{
                padding: "8px 24px",
                background: "var(--bg-surface)",
                color: loadingMore ? "var(--text-muted)" : "var(--text-secondary)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontWeight: 500,
                transition: "all 0.15s",
              }}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RolesPage;