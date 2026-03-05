// src/pages/SettingsPage.jsx
// Settings page — currently exposes Client management.
// The Clients section is admin-only; non-admins see a permission notice.

import { useState, useEffect, useRef } from "react";
import { fetchClients, createClient, updateClient } from "../api";

// ── Tiny reusable primitives ──────────────────────────────────────────────────

function SectionHeader({ title, description }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h2 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>
        {title}
      </h2>
      {description && (
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>{description}</p>
      )}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "var(--bg-raised)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function InlineInput({ value, onChange, onCommit, onCancel, placeholder, autoFocus }) {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);

  return (
    <input
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter") { e.preventDefault(); onCommit(); }
        if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      }}
      placeholder={placeholder}
      style={{
        flex: 1,
        background: "var(--bg-overlay)",
        border: "1px solid var(--accent)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)",
        fontSize: "13px",
        padding: "5px 10px",
        outline: "none",
        boxShadow: "0 0 0 3px rgba(37,99,235,0.15)",
      }}
    />
  );
}

function ActionBtn({ children, onClick, variant = "ghost", disabled }) {
  const [hov, setHov] = useState(false);
  const isPrimary  = variant === "primary";
  const isDanger   = variant === "danger";

  const bg = disabled
    ? "var(--bg-overlay)"
    : isPrimary ? (hov ? "var(--accent-hover)" : "var(--accent)")
    : isDanger  ? (hov ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.10)")
    : hov ? "var(--bg-overlay)" : "transparent";

  const color = disabled
    ? "var(--text-muted)"
    : isPrimary ? "#fff"
    : isDanger  ? "var(--danger)"
    : "var(--text-secondary)";

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "5px 12px", fontSize: "12px", fontWeight: 600,
        background: bg, color,
        border: isPrimary ? "none" : `1px solid ${isDanger ? "rgba(239,68,68,0.25)" : "var(--border-default)"}`,
        borderRadius: "var(--radius-sm)",
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ── Client row — display or edit mode ─────────────────────────────────────────

function ClientRow({ client, isLast, onSaved }) {
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState(client.name);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  const commit = () => {
    const name = draft.trim();
    if (!name || name === client.name) { setEditing(false); setDraft(client.name); return; }
    setSaving(true); setError(null);
    updateClient(client.id, name)
      .then(() => { onSaved({ ...client, name }); setEditing(false); })
      .catch(e => setError(e.message || "Save failed"))
      .finally(() => setSaving(false));
  };

  const cancel = () => { setDraft(client.name); setEditing(false); setError(null); };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "10px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
      minHeight: "46px",
    }}>
      {/* Client icon */}
      <div style={{
        width: 28, height: 28, borderRadius: "6px", flexShrink: 0,
        background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
      }}>
        {client.name.slice(0, 2).toUpperCase()}
      </div>

      {editing ? (
        <>
          <InlineInput
            value={draft}
            onChange={setDraft}
            onCommit={commit}
            onCancel={cancel}
            placeholder="Client name"
            autoFocus
          />
          <ActionBtn onClick={commit} variant="primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </ActionBtn>
          <ActionBtn onClick={cancel}>Cancel</ActionBtn>
        </>
      ) : (
        <>
          <span style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)" }}>
            {client.name}
          </span>
          <ActionBtn onClick={() => { setDraft(client.name); setEditing(true); }}>
            Edit
          </ActionBtn>
        </>
      )}

      {error && (
        <span style={{ fontSize: "11px", color: "var(--danger)" }}>⚠ {error}</span>
      )}
    </div>
  );
}

// ── Add-client row ─────────────────────────────────────────────────────────────

function AddClientRow({ onAdded, onCancel }) {
  const [name,   setName]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const commit = () => {
    const n = name.trim();
    if (!n) return;
    setSaving(true); setError(null);
    createClient(n)
      .then(created => { onAdded(created); })
      .catch(e => setError(e.message || "Could not create client"))
      .finally(() => setSaving(false));
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "10px 16px",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
      borderRadius: "0 0 var(--radius-md) var(--radius-md)",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "6px", flexShrink: 0,
        background: "var(--accent-muted)", border: "1px solid rgba(37,99,235,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, color: "var(--accent)",
      }}>+</div>
      <InlineInput
        value={name}
        onChange={setName}
        onCommit={commit}
        onCancel={onCancel}
        placeholder="New client name…"
        autoFocus
      />
      <ActionBtn onClick={commit} variant="primary" disabled={saving || !name.trim()}>
        {saving ? "Adding…" : "Add"}
      </ActionBtn>
      <ActionBtn onClick={onCancel}>Cancel</ActionBtn>
      {error && <span style={{ fontSize: "11px", color: "var(--danger)" }}>⚠ {error}</span>}
    </div>
  );
}

// ── Clients section ───────────────────────────────────────────────────────────

function ClientsSection() {
  const [clients,    setClients]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);

  useEffect(() => {
    fetchClients()
      .then(data => setClients(data || []))
      .catch(() => setError("Could not load clients"))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (updated) =>
    setClients(cs => cs.map(c => c.id === updated.id ? updated : c));

  const handleAdded = (created) => {
    setClients(cs => [...cs, created]);
    setShowAdd(false);
  };

  if (loading) return <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading…</p>;
  if (error)   return <p style={{ fontSize: "13px", color: "var(--danger)" }}>{error}</p>;

  return (
    <>
      <Card>
        {clients.length === 0 && !showAdd && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            No clients yet. Add one below.
          </div>
        )}

        {clients.map((c, i) => (
          <ClientRow
            key={c.id}
            client={c}
            isLast={i === clients.length - 1 && !showAdd}
            onSaved={handleSaved}
          />
        ))}

        {showAdd && (
          <AddClientRow
            onAdded={handleAdded}
            onCancel={() => setShowAdd(false)}
          />
        )}
      </Card>

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            marginTop: "12px",
            fontSize: "13px", fontWeight: 600,
            color: "var(--accent)", background: "transparent",
            border: "1px solid var(--accent)",
            borderRadius: "var(--radius-sm)",
            padding: "6px 14px",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--accent-muted)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          + Add Client
        </button>
      )}
    </>
  );
}

// ── Access denied notice ──────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <Card style={{ padding: "24px 20px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
      }}>🔒</div>
      <div>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
          Admin access required
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Managing clients is restricted to administrators. Contact your admin to make changes.
        </div>
      </div>
    </Card>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function SettingsPage({ user, onBack }) {
  const isAdmin = user?.is_admin === true;

  return (
    <div style={{
      minHeight: "calc(100vh - 52px)",
      background: "var(--bg-base)",
      padding: "32px",
    }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* Page title */}
        <div style={{ marginBottom: "32px" }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                fontSize: "13px", color: "var(--text-muted)", background: "transparent",
                border: "none", padding: "0 0 14px", cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            >
              ← Back
            </button>
          )}
          <h1 style={{ fontSize: "17px", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
            Settings
          </h1>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
            Manage your workspace configuration.
          </p>
        </div>

        {/* ── Clients ── */}
        <section style={{ marginBottom: "36px" }}>
          <SectionHeader
            title="Clients"
            description="Companies that job roles are associated with. Used when creating or editing a job."
          />
          {isAdmin ? <ClientsSection /> : <AccessDenied />}
        </section>

      </div>
    </div>
  );
}