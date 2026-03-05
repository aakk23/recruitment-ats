// candidate/TimelineTab.jsx
// Timeline tab: ordered list of application events (stage moves, comments, uploads…).

import { fmt, sc } from "./shared";
import { EmptyMsg } from "./shared";

// ── Event type config ─────────────────────────────────────────────────────────

const EVENT_CFG = {
  application_created: {
    icon: "✦", bg: "var(--accent-muted)", color: "var(--accent)",
    label: () => "Application created",
    detail: (e) => `Started in ${e.metadata?.initial_stage ?? "new"}`,
  },
  stage_changed: {
    icon: "→", bg: "rgba(139,92,246,0.15)", color: "#8b5cf6",
    label: () => "Stage moved",
    detail: (e) => <StageMove from={e.metadata?.from_stage} to={e.metadata?.to_stage} />,
  },
  comment_added: {
    icon: "💬", bg: "rgba(34,197,94,0.12)", color: "var(--success)",
    label: () => "Comment added",
    detail: (e) => e.metadata?.preview
      ? <i style={{ color: "var(--text-muted)" }}>"{e.metadata.preview}"</i>
      : null,
  },
  resume_uploaded: {
    icon: "📄", bg: "rgba(245,158,11,0.12)", color: "var(--warning)",
    label: () => "Resume uploaded",
    detail: (e) => e.metadata?.filename ?? null,
  },
};

// ── Stage chip ────────────────────────────────────────────────────────────────

function StageChip({ name }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 8px", borderRadius: "999px",
      fontSize: "11px", fontWeight: 600,
      background: "var(--bg-overlay)", color: sc(name),
      border: `1px solid ${sc(name)}55`,
      textTransform: "capitalize",
    }}>
      {name ?? "—"}
    </span>
  );
}

function StageMove({ from, to }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
      <StageChip name={from} />
      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>→</span>
      <StageChip name={to} />
    </span>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event }) {
  const cfg = EVENT_CFG[event.event_type] ?? {
    icon: "·", bg: "var(--bg-overlay)", color: "var(--text-muted)",
    label: (e) => e.event_type.replace(/_/g, " "),
    detail: () => null,
  };
  return (
    <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
        background: cfg.bg, color: cfg.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", border: `1px solid ${cfg.color}33`,
      }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, paddingTop: "3px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "baseline" }}>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{cfg.label(event)}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
            {fmt(event.created_at)}
          </span>
        </div>
        {cfg.detail(event) && (
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "3px" }}>
            {cfg.detail(event)}
          </div>
        )}
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>
          {event.recruiter_name ?? "System"}
        </div>
      </div>
    </div>
  );
}

// ── Tab root ──────────────────────────────────────────────────────────────────

export default function TimelineTab({ events }) {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 12px" }}>
      {events.length === 0
        ? <EmptyMsg>No activity yet</EmptyMsg>
        : events.map((e) => <EventRow key={e.id} event={e} />)
      }
    </div>
  );
}