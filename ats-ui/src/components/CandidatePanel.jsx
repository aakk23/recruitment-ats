// src/components/CandidatePanel.jsx
import { useState, useEffect, useRef } from "react";
import {
  fetchComments, addComment,
  fetchStages, fetchCandidate, fetchEvents,
  fetchRecruiters, updateOwnership, updateApplicationStage,
} from "../api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(raw) {
  if (!raw) return "";
  return new Date(raw).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

const STAGE_COLOURS = {
  new: "var(--stage-new)", screening: "var(--stage-screening)",
  interview: "var(--stage-interview)", offered: "var(--stage-offered)",
  hired: "var(--stage-hired)", rejected: "var(--stage-rejected)",
};
const sc = (n) => STAGE_COLOURS[n?.toLowerCase()] ?? "var(--text-muted)";

const EVENT_CFG = {
  application_created: { icon: "✦", bg: "var(--accent-muted)", color: "var(--accent)",
    label: () => "Application created", detail: (e) => `Started in ${e.metadata?.initial_stage ?? "new"}` },
  stage_changed: { icon: "→", bg: "rgba(139,92,246,0.15)", color: "#8b5cf6",
    label: () => "Stage moved",
    detail: (e) => <StageMove from={e.metadata?.from_stage} to={e.metadata?.to_stage} /> },
  comment_added: { icon: "💬", bg: "rgba(34,197,94,0.12)", color: "var(--success)",
    label: () => "Comment added",
    detail: (e) => e.metadata?.preview ? <i style={{ color: "var(--text-muted)" }}>"{e.metadata.preview}"</i> : null },
  resume_uploaded: { icon: "📄", bg: "rgba(245,158,11,0.12)", color: "var(--warning)",
    label: () => "Resume uploaded", detail: (e) => e.metadata?.filename ?? null },
};

function StageChip({ name }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "1px 7px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
      background: "var(--bg-overlay)", color: sc(name),
      border: `1px solid ${sc(name)}44`, textTransform: "capitalize",
    }}>{name}</span>
  );
}

function StageMove({ from, to }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
      <StageChip name={from ?? "—"} />
      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>→</span>
      <StageChip name={to ?? "—"} />
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CandidatePanel({ application, roleId, onClose, onStageChange }) {
  const [tab,          setTab]          = useState("overview");
  const [events,       setEvents]       = useState([]);
  const [comments,     setComments]     = useState([]);
  const [stages,       setStages]       = useState([]);
  const [candidate,    setCandidate]    = useState(null);
  const [recruiters,   setRecruiters]   = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // Resume preview
  const [showResume,   setShowResume]   = useState(false);

  // Comment state
  const [newComment,   setNewComment]   = useState("");
  const [isPrivate,    setIsPrivate]    = useState(false);
  const [taggedIds,    setTaggedIds]    = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState(null);

  // Ownership
  const [ownerEdit,    setOwnerEdit]    = useState(false);
  const [newCandOwner, setNewCandOwner] = useState("");
  const [newAssigned,  setNewAssigned]  = useState("");
  const [savingOwner,  setSavingOwner]  = useState(false);

  // Stage/substage
  const [selectedSubstage, setSelectedSubstage] = useState(null);

  useEffect(() => {
    if (!application) return;
    setLoading(true);
    setError(null);
    setCandidate(null);
    setStages([]);
    setEvents([]);
    setComments([]);
    setShowResume(false);
    setSelectedSubstage(application.substage_id ?? null);

    Promise.all([
      fetchEvents(application.application_id),
      fetchComments(application.application_id),
      fetchStages(roleId),
      fetchCandidate(application.candidate_id),
      fetchRecruiters(),
    ])
      .then(([evData, cmData, stData, cdData, recData]) => {
        setEvents(evData || []);
        setComments(cmData || []);
        setStages(stData || []);
        setCandidate(cdData);
        setRecruiters(recData || []);
      })
      .catch(() => setError("Could not load candidate details"))
      .finally(() => setLoading(false));
  }, [application, roleId]);

  if (!application) return null;

  const currentStageObj = stages.find((s) => s.name === application.stage);
  const substages = currentStageObj?.substages || [];

  const handleStageSelect = (newStage, substageId = null) => {
    setSelectedSubstage(substageId);
    onStageChange(application.application_id, newStage, substageId);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || saving) return;
    setSaveError(null);
    setSaving(true);
    addComment(application.application_id, newComment, isPrivate, taggedIds)
      .then(() => {
        setNewComment(""); setTaggedIds([]); setIsPrivate(false);
        return Promise.all([
          fetchComments(application.application_id),
          fetchEvents(application.application_id),
        ]);
      })
      .then(([cmData, evData]) => { setComments(cmData); setEvents(evData); })
      .catch(() => setSaveError("Could not add comment"))
      .finally(() => setSaving(false));
  };

  const handleSaveOwnership = () => {
    setSavingOwner(true);
    updateOwnership(application.application_id, {
      candidate_owner_id:    newCandOwner  ? parseInt(newCandOwner)  : undefined,
      assigned_recruiter_id: newAssigned   ? parseInt(newAssigned)   : undefined,
    })
      .then(() => setOwnerEdit(false))
      .finally(() => setSavingOwner(false));
  };

  const toggleTag = (id) => setTaggedIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );

  const TABS = [
    { key: "overview",  label: "Overview" },
    { key: "timeline",  label: `Timeline${events.length  ? ` (${events.length})`  : ""}` },
    { key: "comments",  label: `Comments${comments.length ? ` (${comments.length})` : ""}` },
  ];

  // Width changes when resume preview is open
  const panelWidth = showResume ? "860px" : "420px";

  return (
    <div style={{
      position: "fixed", top: 0, right: 0,
      width: panelWidth, maxWidth: "100vw", height: "100vh",
      display: "flex",
      background: "var(--bg-surface)",
      borderLeft: "1px solid var(--border-subtle)",
      boxShadow: "var(--shadow-lg)",
      zIndex: 1000,
      transition: "width 0.25s ease",
    }}>

      {/* ── Resume iframe pane ── */}
      {showResume && candidate?.resume_url && (
        <div style={{
          flex: 1, borderRight: "1px solid var(--border-subtle)",
          display: "flex", flexDirection: "column",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Resume Preview</span>
            <div style={{ display: "flex", gap: "8px" }}>
              <a href={candidate.resume_url} target="_blank" rel="noreferrer" style={{
                fontSize: "12px", color: "var(--accent)", padding: "4px 10px",
                border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)", textDecoration: "none",
              }}>↓ Download</a>
              <button onClick={() => setShowResume(false)} style={{
                background: "transparent", border: "none", color: "var(--text-muted)",
                fontSize: "18px", cursor: "pointer",
              }}>×</button>
            </div>
          </div>
          <iframe
            src={candidate.resume_url}
            style={{ flex: 1, border: "none", background: "#fff" }}
            title="Resume Preview"
          />
        </div>
      )}

      {/* ── Main panel ── */}
      <div style={{ width: "420px", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%" }}>

        {/* Header */}
        <div style={{
          padding: "18px 20px 0",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: "0 0 3px", fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                {application.candidate_name}
              </h3>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{application.email}</div>
              {candidate?.phone && (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>📞 {candidate.phone}</div>
              )}
              {candidate?.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" style={{
                  fontSize: "12px", color: "var(--accent)", marginTop: "2px", display: "inline-block",
                }}>🔗 LinkedIn</a>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0, marginLeft: "8px" }}>
              {candidate?.resume_url && (
                <button
                  onClick={() => setShowResume(!showResume)}
                  title={showResume ? "Hide resume" : "Preview resume"}
                  style={{
                    padding: "5px 10px", fontSize: "11px", fontWeight: 600,
                    background: showResume ? "var(--accent)" : "var(--bg-raised)",
                    color: showResume ? "#fff" : "var(--text-secondary)",
                    border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {showResume ? "◀ Resume" : "📄 Resume"}
                </button>
              )}
              <button onClick={onClose} style={{
                background: "transparent", border: "none", fontSize: "20px",
                color: "var(--text-muted)", cursor: "pointer", padding: "2px 4px",
              }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >×</button>
            </div>
          </div>

          {/* Stage + substage row */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px",
            padding: "10px 12px", background: "var(--bg-raised)", borderRadius: "var(--radius-md)",
            flexWrap: "wrap",
          }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: sc(application.stage), flexShrink: 0 }} />
            <select
              value={application.stage}
              onChange={(e) => handleStageSelect(e.target.value, null)}
              style={selectStyle}
            >
              {stages.length === 0
                ? <option value={application.stage}>{application.stage}</option>
                : stages.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)
              }
            </select>
            {substages.length > 0 && (
              <>
                <span style={{ color: "var(--text-muted)", fontSize: "11px", flexShrink: 0 }}>›</span>
                <select
                  value={selectedSubstage ?? ""}
                  onChange={(e) => handleStageSelect(application.stage, e.target.value ? parseInt(e.target.value) : null)}
                  style={{ ...selectStyle, fontSize: "12px" }}
                >
                  <option value="">No substage</option>
                  {substages.map((ss) => <option key={ss.id} value={ss.id}>{ss.name}</option>)}
                </select>
              </>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex" }}>
            {TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: "9px 0", background: "transparent", border: "none",
                borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === key ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "12px", fontWeight: tab === key ? 600 : 400, transition: "all 0.15s",
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Loading / Error */}
        {loading && <LoadMsg>Loading…</LoadMsg>}
        {error && !loading && <div style={{ padding: "16px", color: "var(--danger)", fontSize: "13px" }}>{error}</div>}

        {/* ── OVERVIEW TAB ── */}
        {!loading && !error && tab === "overview" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>

            {/* Role details */}
            <Section title="Role Details">
              <Row label="Role">{application.recruiter}</Row>
              {application.candidate_owner    && <Row label="Candidate Owner">{application.candidate_owner}</Row>}
              {application.assigned_recruiter && <Row label="Assigned Recruiter">{application.assigned_recruiter}</Row>}
              {application.substage_name      && <Row label="Sub-stage">{application.substage_name}</Row>}
            </Section>

            {/* Ownership edit */}
            <div style={{ marginBottom: "20px" }}>
              {!ownerEdit ? (
                <button onClick={() => setOwnerEdit(true)} style={{
                  fontSize: "12px", color: "var(--accent)", background: "transparent",
                  border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)",
                  padding: "4px 10px", cursor: "pointer",
                }}>
                  Edit Ownership
                </button>
              ) : (
                <div style={{
                  background: "var(--bg-raised)", border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)", padding: "14px",
                }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "10px" }}>
                    Update Ownership
                  </div>
                  <SmallSelect label="Candidate Owner" value={newCandOwner} onChange={setNewCandOwner} options={recruiters} />
                  <SmallSelect label="Assigned Recruiter" value={newAssigned} onChange={setNewAssigned} options={recruiters} />
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <Btn onClick={handleSaveOwnership} disabled={savingOwner} size="sm">
                      {savingOwner ? "Saving…" : "Save"}
                    </Btn>
                    <Btn variant="ghost" onClick={() => setOwnerEdit(false)} size="sm">Cancel</Btn>
                  </div>
                </div>
              )}
            </div>

            {/* Candidate info */}
            <Section title="Candidate Info">
              {candidate?.phone        && <Row label="Phone">{candidate.phone}</Row>}
              {candidate?.linkedin_url && (
                <Row label="LinkedIn">
                  <a href={candidate.linkedin_url} target="_blank" rel="noreferrer"
                    style={{ color: "var(--accent)", fontSize: "12px" }}>
                    View Profile →
                  </a>
                </Row>
              )}
              {candidate?.resume_url && (
                <Row label="Resume">
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button onClick={() => { setShowResume(true); setTab("overview"); }} style={{
                      fontSize: "12px", color: "var(--accent)", background: "transparent",
                      border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)",
                      padding: "3px 8px", cursor: "pointer",
                    }}>
                      Preview
                    </button>
                    <a href={candidate.resume_url} target="_blank" rel="noreferrer" style={{
                      fontSize: "12px", color: "var(--text-secondary)", background: "var(--bg-overlay)",
                      border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
                      padding: "3px 8px", textDecoration: "none",
                    }}>
                      ↓ Download
                    </a>
                  </div>
                </Row>
              )}
              <Row label="Added">{fmt(application.created_at)}</Row>
            </Section>
          </div>
        )}

        {/* ── TIMELINE TAB ── */}
        {!loading && !error && tab === "timeline" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 12px" }}>
            {events.length === 0
              ? <EmptyMsg>No activity yet</EmptyMsg>
              : events.map((e) => <EventRow key={e.id} event={e} />)
            }
          </div>
        )}

        {/* ── COMMENTS TAB ── */}
        {!loading && !error && tab === "comments" && (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 8px" }}>
              {comments.length === 0
                ? <EmptyMsg>No comments yet</EmptyMsg>
                : comments.map((c) => <CommentRow key={c.id} comment={c} />)
              }
            </div>

            {/* Comment composer */}
            <div style={{
              borderTop: "1px solid var(--border-subtle)",
              padding: "12px 20px 16px", flexShrink: 0,
            }}>
              <textarea
                placeholder="Add a comment… (⌘ Enter to submit)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment(); }}
                style={{
                  display: "block", width: "100%", minHeight: "68px",
                  padding: "10px 12px", resize: "none",
                  background: "var(--bg-raised)", color: "var(--text-primary)",
                  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
                  fontSize: "13px", fontFamily: "var(--font-ui)", boxSizing: "border-box", outline: "none",
                }}
              />

              {/* Private + tag row */}
              <div style={{ marginTop: "8px", display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
                <label style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer",
                }}>
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)}
                    style={{ accentColor: "var(--accent)" }} />
                  Private
                </label>

                {/* Tag dropdown */}
                {recruiters.length > 0 && (
                  <div style={{ position: "relative" }}>
                    <TagDropdown
                      recruiters={recruiters}
                      taggedIds={taggedIds}
                      onToggle={toggleTag}
                    />
                  </div>
                )}

                {/* Send button */}
                <Btn
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || saving}
                  style={{ marginLeft: "auto" }}
                  size="sm"
                >
                  {saving ? "Saving…" : "Add"}
                </Btn>
              </div>

              {/* Tagged preview */}
              {taggedIds.length > 0 && (
                <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                  Tagging: {recruiters.filter((r) => taggedIds.includes(r.id)).map((r) => r.name).join(", ")}
                </div>
              )}

              {saveError && <div style={{ color: "var(--danger)", fontSize: "12px", marginTop: "6px" }}>{saveError}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EventRow({ event }) {
  const cfg = EVENT_CFG[event.event_type] ?? {
    icon: "·", bg: "var(--bg-overlay)", color: "var(--text-muted)",
    label: (e) => e.event_type, detail: () => null,
  };
  return (
    <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%",
        background: cfg.bg, color: cfg.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", flexShrink: 0, border: `1px solid ${cfg.color}33`, zIndex: 1,
      }}>{cfg.icon}</div>
      <div style={{ flex: 1, paddingTop: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{cfg.label(event)}</span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{fmt(event.created_at)}</span>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{cfg.detail(event)}</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>{event.recruiter_name ?? "System"}</div>
      </div>
    </div>
  );
}

function CommentRow({ comment }) {
  return (
    <div style={{
      background: comment.is_private ? "rgba(245,158,11,0.06)" : "var(--bg-raised)",
      borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: "10px",
      border: `1px solid ${comment.is_private ? "rgba(245,158,11,0.3)" : "var(--border-subtle)"}`,
    }}>
      {comment.is_private && (
        <span style={{
          fontSize: "10px", fontWeight: 700, color: "var(--warning)",
          background: "rgba(245,158,11,0.15)", padding: "1px 6px",
          borderRadius: "999px", marginBottom: "6px", display: "inline-block",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Private</span>
      )}
      <div style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5, marginBottom: "6px" }}>
        {comment.comment}
      </div>
      {comment.tagged_names?.length > 0 && (
        <div style={{ fontSize: "11px", color: "var(--accent)", marginBottom: "4px" }}>
          @ {comment.tagged_names.join(", ")}
        </div>
      )}
      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
        {comment.recruiter} · {fmt(comment.created_at)}
      </div>
    </div>
  );
}

function TagDropdown({ recruiters, taggedIds, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: "12px", color: "var(--text-secondary)",
          background: "var(--bg-raised)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)", padding: "4px 10px", cursor: "pointer",
        }}
      >
        @ Tag{taggedIds.length > 0 ? ` (${taggedIds.length})` : ""}
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: 0,
          background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)", padding: "6px 0",
          minWidth: "180px", boxShadow: "var(--shadow-md)", zIndex: 10,
        }}>
          {recruiters.map((r) => (
            <div
              key={r.id}
              onClick={() => onToggle(r.id)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "7px 14px", cursor: "pointer", fontSize: "13px",
                color: taggedIds.includes(r.id) ? "var(--accent)" : "var(--text-primary)",
                background: taggedIds.includes(r.id) ? "var(--accent-muted)" : "transparent",
              }}
            >
              <span style={{ fontSize: "10px" }}>{taggedIds.includes(r.id) ? "✓" : " "}</span>
              {r.name}
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "6px 14px 0" }}>
            <button onClick={() => setOpen(false)} style={{
              fontSize: "11px", color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer",
            }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "8px" }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
      <span style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0, minWidth: "110px" }}>{label}</span>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "right" }}>{children}</span>
    </div>
  );
}

function SmallSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        <option value="">— unchanged —</option>
        {options.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", style: s = {}, size = "md" }) {
  const isPrimary = variant === "primary";
  const pad = size === "sm" ? "5px 14px" : "8px 18px";
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding: pad, fontSize: "13px", fontWeight: 600,
      background: disabled ? "var(--bg-overlay)" : isPrimary ? "var(--accent)" : "var(--bg-raised)",
      color: disabled ? "var(--text-muted)" : isPrimary ? "#fff" : "var(--text-secondary)",
      border: isPrimary ? "none" : "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)", transition: "background 0.15s", ...s,
    }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = isPrimary ? "var(--accent-hover)" : "var(--bg-overlay)"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = isPrimary ? "var(--accent)" : "var(--bg-raised)"; }}
    >{children}</button>
  );
}

function LoadMsg({ children }) {
  return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: "var(--text-muted)" }}>{children}</div>;
}

function EmptyMsg({ children }) {
  return <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "13px" }}>{children}</div>;
}

const selectStyle = {
  width: "100%", padding: "6px 10px",
  background: "var(--bg-overlay)", color: "var(--text-primary)",
  border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
  fontSize: "13px", outline: "none", cursor: "pointer",
};