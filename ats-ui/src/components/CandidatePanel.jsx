// src/components/CandidatePanel.jsx
import { useState, useEffect } from "react";
import {
  fetchComments, addComment,
  fetchStages, fetchCandidate, fetchEvents,
  fetchRecruiters, updateOwnership,
} from "../api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(raw) {
  if (!raw) return "";
  return new Date(raw).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

const STAGE_COLOURS = {
  new:       "var(--stage-new)",
  screening: "var(--stage-screening)",
  interview: "var(--stage-interview)",
  offered:   "var(--stage-offered)",
  hired:     "var(--stage-hired)",
  rejected:  "var(--stage-rejected)",
};
const sc = (n) => STAGE_COLOURS[n?.toLowerCase()] ?? "var(--text-muted)";

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

function StageChip({ name }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "1px 8px", borderRadius: "999px",
      fontSize: "11px", fontWeight: 600,
      background: "var(--bg-overlay)", color: sc(name),
      border: `1px solid ${sc(name)}55`,
      textTransform: "capitalize",
    }}>{name ?? "—"}</span>
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function CandidatePanel({ application, roleId, onClose, onStageChange }) {
  // Tabs reset when candidate changes
  const [tab,             setTab]             = useState("overview");

  // Remote data
  const [events,          setEvents]          = useState([]);
  const [comments,        setComments]        = useState([]);
  const [stages,          setStages]          = useState([]);
  const [candidate,       setCandidate]       = useState(null);
  const [recruiters,      setRecruiters]      = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);

  // Local ownership mirror (so Overview reflects saves immediately)
  const [localOwnership,  setLocalOwnership]  = useState({
    candidate_owner:    null,
    assigned_recruiter: null,
  });

  // Resume preview pane
  const [showResume,      setShowResume]      = useState(false);

  // Comment composer
  const [newComment,      setNewComment]      = useState("");
  const [isPrivate,       setIsPrivate]       = useState(false);
  const [taggedIds,       setTaggedIds]       = useState([]);
  const [saving,          setSaving]          = useState(false);
  const [saveError,       setSaveError]       = useState(null);

  // Ownership editor
  const [ownerEdit,       setOwnerEdit]       = useState(false);
  const [newCandOwner,    setNewCandOwner]    = useState("");
  const [newAssigned,     setNewAssigned]     = useState("");
  const [savingOwner,     setSavingOwner]     = useState(false);
  const [ownerError,      setOwnerError]      = useState(null);

  // Local substage (mirrors prop initially, then tracks optimistic updates)
  const [localSubstage,   setLocalSubstage]   = useState(null);
  // Local stage (mirrors prop, tracks optimistic updates)
  const [localStage,      setLocalStage]      = useState(null);

  const appId = application?.application_id;

  // ── Fetch when candidate changes ──────────────────────────────────────────
  useEffect(() => {
    if (!appId) return;

    // Reset all local state for new candidate
    setTab("overview");
    setEvents([]);
    setComments([]);
    setStages([]);
    setCandidate(null);
    setShowResume(false);
    setOwnerEdit(false);
    setNewComment("");
    setTaggedIds([]);
    setIsPrivate(false);
    setSaveError(null);
    setLocalSubstage(application.substage_id ?? null);
    setLocalStage(application.stage);
    setLocalOwnership({
      candidate_owner:    application.candidate_owner    ?? null,
      assigned_recruiter: application.assigned_recruiter ?? null,
    });

    setLoading(true);
    setError(null);

    Promise.all([
      fetchEvents(appId),
      fetchComments(appId),
      fetchStages(roleId),
      fetchCandidate(application.candidate_id),
      fetchRecruiters(),
    ])
      .then(([evData, cmData, stData, cdData, recData]) => {
        setEvents(evData   || []);
        setComments(cmData || []);
        setStages(stData   || []);
        setCandidate(cdData);
        setRecruiters(recData || []);
      })
      .catch(() => setError("Could not load candidate details"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  if (!application) return null;

  // Derive current stage's substages from local stage value
  const currentStageObj = stages.find((s) => s.name === localStage);
  const substages        = currentStageObj?.substages || [];

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStageChange = (newStage) => {
    // Clear substage when stage changes
    setLocalStage(newStage);
    setLocalSubstage(null);
    onStageChange(appId, newStage, null);
  };

  const handleSubstageChange = (substageId) => {
    const id = substageId ? parseInt(substageId) : null;
    setLocalSubstage(id);
    onStageChange(appId, localStage, id);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || saving) return;
    setSaveError(null);
    setSaving(true);
    addComment(appId, newComment, isPrivate, taggedIds)
      .then(() => {
        setNewComment("");
        setTaggedIds([]);
        setIsPrivate(false);
        return Promise.all([
          fetchComments(appId),
          fetchEvents(appId),
        ]);
      })
      .then(([cmData, evData]) => {
        setComments(cmData);
        setEvents(evData);
      })
      .catch(() => setSaveError("Could not add comment"))
      .finally(() => setSaving(false));
  };

  const handleSaveOwnership = () => {
    setOwnerError(null);
    setSavingOwner(true);
    updateOwnership(appId, {
      candidate_owner_id:    newCandOwner ? parseInt(newCandOwner)  : undefined,
      assigned_recruiter_id: newAssigned  ? parseInt(newAssigned)   : undefined,
    })
      .then(() => {
        // Mirror saved values locally so the Overview row updates immediately
        const ownerName    = recruiters.find((r) => r.id === parseInt(newCandOwner))?.name;
        const assignedName = recruiters.find((r) => r.id === parseInt(newAssigned))?.name;
        setLocalOwnership({
          candidate_owner:    newCandOwner ? ownerName    : localOwnership.candidate_owner,
          assigned_recruiter: newAssigned  ? assignedName : localOwnership.assigned_recruiter,
        });
        setOwnerEdit(false);
        setNewCandOwner("");
        setNewAssigned("");
      })
      .catch(() => setOwnerError("Failed to save ownership"))
      .finally(() => setSavingOwner(false));
  };

  const toggleTag = (id) =>
    setTaggedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "timeline", label: `Timeline${events.length   ? ` (${events.length})`   : ""}` },
    { key: "comments", label: `Comments${comments.length ? ` (${comments.length})` : ""}` },
  ];

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
          display: "flex", flexDirection: "column", minWidth: 0,
        }}>
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Resume Preview</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <a href={candidate.resume_url} target="_blank" rel="noreferrer" style={{
                fontSize: "12px", color: "var(--accent)",
                padding: "3px 10px",
                border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)",
                textDecoration: "none",
              }}>↓ Download</a>
              <button
                onClick={() => setShowResume(false)}
                style={{
                  background: "transparent", border: "none",
                  color: "var(--text-muted)", fontSize: "18px",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >×</button>
            </div>
          </div>
          <iframe
            src={candidate.resume_url}
            style={{ flex: 1, border: "none", background: "#fff" }}
            title="Resume Preview"
          />
        </div>
      )}

      {/* ── Main panel (fixed 420px) ── */}
      <div style={{
        width: "420px", flexShrink: 0,
        display: "flex", flexDirection: "column",
        height: "100%", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 20px 0",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          {/* Name row */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: "12px",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                margin: "0 0 3px", fontSize: "16px",
                fontWeight: 700, letterSpacing: "-0.01em",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {application.candidate_name}
              </h3>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {application.email}
              </div>
              {candidate?.phone && (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  📞 {candidate.phone}
                </div>
              )}
              {candidate?.linkedin_url && (
                <a
                  href={candidate.linkedin_url}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize: "12px", color: "var(--accent)", marginTop: "2px", display: "inline-block" }}
                >
                  🔗 LinkedIn
                </a>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", flexShrink: 0, marginLeft: "10px" }}>
              {candidate?.resume_url && (
                <button
                  onClick={() => setShowResume(!showResume)}
                  title={showResume ? "Hide resume" : "Preview resume"}
                  style={{
                    padding: "5px 10px", fontSize: "11px", fontWeight: 600,
                    background: showResume ? "var(--accent)" : "var(--bg-raised)",
                    color: showResume ? "#fff" : "var(--text-secondary)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-sm)", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!showResume) e.currentTarget.style.borderColor = "var(--accent)"; }}
                  onMouseLeave={(e) => { if (!showResume) e.currentTarget.style.borderColor = "var(--border-default)"; }}
                >
                  {showResume ? "◀ Resume" : "📄 Resume"}
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: "transparent", border: "none",
                  fontSize: "20px", color: "var(--text-muted)", padding: "2px 4px",
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >×</button>
            </div>
          </div>

          {/* Stage + substage bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "9px 12px", marginBottom: "14px",
            background: "var(--bg-raised)", borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            flexWrap: "wrap",
          }}>
            {/* Stage dot */}
            <span style={{
              width: "7px", height: "7px", borderRadius: "50%",
              background: sc(localStage), flexShrink: 0,
            }} />

            {/* Stage select */}
            <select
              value={localStage ?? ""}
              onChange={(e) => handleStageChange(e.target.value)}
              style={selectStyle}
            >
              {stages.length === 0
                ? <option value={localStage}>{localStage}</option>
                : stages.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))
              }
            </select>

            {/* Substage select — only when current stage has substages */}
            {substages.length > 0 && (
              <>
                <span style={{ color: "var(--border-strong)", fontSize: "12px", flexShrink: 0 }}>›</span>
                <select
                  value={localSubstage ?? ""}
                  onChange={(e) => handleSubstageChange(e.target.value)}
                  style={{ ...selectStyle, fontSize: "12px" }}
                >
                  <option value="">No substage</option>
                  {substages.map((ss) => (
                    <option key={ss.id} value={ss.id}>{ss.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex" }}>
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: "9px 0",
                  background: "transparent", border: "none",
                  borderBottom: tab === key
                    ? "2px solid var(--accent)"
                    : "2px solid transparent",
                  color: tab === key ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: "12px", fontWeight: tab === key ? 600 : 400,
                  transition: "color 0.15s, border-color 0.15s",
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* ── Loading / Error ── */}
        {loading && <CentredMsg>Loading…</CentredMsg>}
        {error && !loading && (
          <div style={{ padding: "16px 20px", color: "var(--danger)", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {!loading && !error && tab === "overview" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>

            {/* Role / ownership section */}
            <Section title="Role Details">
              <Row label="Recruiter">
                {application.recruiter ?? "—"}
              </Row>
              <Row label="Candidate Owner">
                {localOwnership.candidate_owner ?? "—"}
              </Row>
              <Row label="Assigned To">
                {localOwnership.assigned_recruiter ?? "—"}
              </Row>
              {(localSubstage || application.substage_name) && (
                <Row label="Sub-stage">
                  {substages.find((s) => s.id === localSubstage)?.name
                    ?? application.substage_name
                    ?? "—"}
                </Row>
              )}
            </Section>

            {/* Ownership editor */}
            {!ownerEdit ? (
              <button
                onClick={() => { setOwnerEdit(true); setOwnerError(null); }}
                style={{
                  fontSize: "12px", color: "var(--accent)",
                  background: "transparent",
                  border: "1px solid var(--accent)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px 10px", marginBottom: "20px",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-muted)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                Edit Ownership
              </button>
            ) : (
              <div style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                padding: "14px", marginBottom: "20px",
              }}>
                <div style={{
                  fontSize: "12px", fontWeight: 600,
                  color: "var(--text-secondary)", marginBottom: "10px",
                }}>
                  Update Ownership
                </div>
                <SmallSelect
                  label="Candidate Owner"
                  value={newCandOwner}
                  onChange={setNewCandOwner}
                  options={recruiters}
                />
                <SmallSelect
                  label="Assigned Recruiter"
                  value={newAssigned}
                  onChange={setNewAssigned}
                  options={recruiters}
                />
                {ownerError && (
                  <div style={{ fontSize: "12px", color: "var(--danger)", marginBottom: "8px" }}>
                    {ownerError}
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <Btn onClick={handleSaveOwnership} disabled={savingOwner} size="sm">
                    {savingOwner ? "Saving…" : "Save"}
                  </Btn>
                  <Btn
                    variant="ghost" size="sm"
                    onClick={() => { setOwnerEdit(false); setOwnerError(null); setNewCandOwner(""); setNewAssigned(""); }}
                  >
                    Cancel
                  </Btn>
                </div>
              </div>
            )}

            {/* Candidate info */}
            <Section title="Candidate Info">
              {candidate?.phone && (
                <Row label="Phone">{candidate.phone}</Row>
              )}
              {candidate?.linkedin_url && (
                <Row label="LinkedIn">
                  <a
                    href={candidate.linkedin_url}
                    target="_blank" rel="noreferrer"
                    style={{ color: "var(--accent)", fontSize: "12px" }}
                  >
                    View Profile →
                  </a>
                </Row>
              )}
              {candidate?.resume_url && (
                <Row label="Resume">
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setShowResume(true)}
                      style={{
                        fontSize: "12px", color: "var(--accent)",
                        background: "transparent",
                        border: "1px solid var(--accent)",
                        borderRadius: "var(--radius-sm)",
                        padding: "2px 8px",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-muted)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      Preview
                    </button>
                    <a
                      href={candidate.resume_url}
                      target="_blank" rel="noreferrer"
                      style={{
                        fontSize: "12px", color: "var(--text-secondary)",
                        background: "var(--bg-overlay)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-sm)",
                        padding: "2px 8px", textDecoration: "none",
                      }}
                    >
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

            {/* Composer */}
            <div style={{
              borderTop: "1px solid var(--border-subtle)",
              padding: "12px 20px 16px",
              flexShrink: 0,
            }}>
              <textarea
                placeholder="Add a comment… (⌘ Enter to submit)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment();
                }}
                style={{
                  display: "block", width: "100%",
                  minHeight: "68px", padding: "10px 12px", resize: "none",
                  background: "var(--bg-raised)", color: "var(--text-primary)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "13px", fontFamily: "var(--font-ui)",
                  boxSizing: "border-box", outline: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "var(--shadow-accent)"; }}
                onBlur={(e)  => { e.target.style.borderColor = "var(--border-default)"; e.target.style.boxShadow = "none"; }}
              />

              {/* Controls row */}
              <div style={{
                marginTop: "8px", display: "flex",
                gap: "8px", alignItems: "center", flexWrap: "wrap",
              }}>
                {/* Private toggle */}
                <label style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  fontSize: "12px", color: "var(--text-secondary)", cursor: "pointer",
                }}>
                  <input
                    type="checkbox" checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  Private
                </label>

                {/* Tag dropdown */}
                {recruiters.length > 0 && (
                  <TagDropdown
                    recruiters={recruiters}
                    taggedIds={taggedIds}
                    onToggle={toggleTag}
                  />
                )}

                {/* Submit */}
                <Btn
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || saving}
                  style={{ marginLeft: "auto" }}
                  size="sm"
                >
                  {saving ? "Saving…" : "Add"}
                </Btn>
              </div>

              {/* Tagged names preview */}
              {taggedIds.length > 0 && (
                <div style={{ marginTop: "5px", fontSize: "11px", color: "var(--text-muted)" }}>
                  Tagging: {recruiters
                    .filter((r) => taggedIds.includes(r.id))
                    .map((r) => r.name)
                    .join(", ")}
                </div>
              )}

              {saveError && (
                <div style={{ color: "var(--danger)", fontSize: "12px", marginTop: "6px" }}>
                  {saveError}
                </div>
              )}
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
      }}>{cfg.icon}</div>
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

function CommentRow({ comment }) {
  return (
    <div style={{
      background: comment.is_private ? "rgba(245,158,11,0.05)" : "var(--bg-raised)",
      borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: "10px",
      border: `1px solid ${comment.is_private ? "rgba(245,158,11,0.25)" : "var(--border-subtle)"}`,
    }}>
      {comment.is_private && (
        <span style={{
          fontSize: "10px", fontWeight: 700, color: "var(--warning)",
          background: "rgba(245,158,11,0.15)", padding: "1px 7px",
          borderRadius: "999px", display: "inline-block", marginBottom: "7px",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>Private</span>
      )}
      <div style={{
        fontSize: "13px", color: "var(--text-primary)",
        lineHeight: 1.55, marginBottom: "7px",
        wordBreak: "break-word",
      }}>
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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest("[data-tag-dropdown]")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div style={{ position: "relative" }} data-tag-dropdown="">
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontSize: "12px", color: "var(--text-secondary)",
          background: taggedIds.length > 0 ? "var(--accent-muted)" : "var(--bg-raised)",
          border: `1px solid ${taggedIds.length > 0 ? "var(--accent)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-sm)", padding: "4px 10px",
          transition: "all 0.15s",
        }}
      >
        @ Tag{taggedIds.length > 0 ? ` (${taggedIds.length})` : ""}
      </button>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: 0,
          background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)", padding: "4px 0",
          minWidth: "180px", boxShadow: "var(--shadow-md)", zIndex: 20,
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
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { if (!taggedIds.includes(r.id)) e.currentTarget.style.background = "var(--bg-raised)"; }}
              onMouseLeave={(e) => { if (!taggedIds.includes(r.id)) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: "10px", width: "10px", flexShrink: 0 }}>
                {taggedIds.includes(r.id) ? "✓" : ""}
              </span>
              {r.name}
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "5px 14px 2px" }}>
            <button
              onClick={() => setOpen(false)}
              style={{ fontSize: "11px", color: "var(--text-muted)", background: "transparent", border: "none" }}
            >Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared layout helpers ─────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "10px", fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "9px",
      }}>{title}</div>
      <div style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-start", padding: "5px 0",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ fontSize: "12px", color: "var(--text-muted)", flexShrink: 0, minWidth: "110px" }}>
        {label}
      </span>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "right" }}>
        {children}
      </span>
    </div>
  );
}

function SmallSelect({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <label style={{
        fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
        display: "block", marginBottom: "4px",
      }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        <option value="">— unchanged —</option>
        {options.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "primary", style: s = {}, size = "md" }) {
  const primary = variant === "primary";
  const pad     = size === "sm" ? "5px 14px" : "8px 18px";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: pad, fontSize: "13px", fontWeight: 600,
        background: disabled ? "var(--bg-overlay)" : primary ? "var(--accent)" : "var(--bg-raised)",
        color:      disabled ? "var(--text-muted)"  : primary ? "#fff"          : "var(--text-secondary)",
        border: primary ? "none" : "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        transition: "background 0.15s",
        ...s,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = primary ? "var(--accent-hover)" : "var(--bg-overlay)"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = primary ? "var(--accent)" : "var(--bg-raised)"; }}
    >{children}</button>
  );
}

function CentredMsg({ children }) {
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "13px", color: "var(--text-muted)",
    }}>{children}</div>
  );
}

function EmptyMsg({ children }) {
  return (
    <div style={{
      textAlign: "center", padding: "40px 0",
      color: "var(--text-muted)", fontSize: "13px",
    }}>{children}</div>
  );
}

const selectStyle = {
  width: "100%", padding: "6px 10px",
  background: "var(--bg-overlay)", color: "var(--text-primary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  fontSize: "13px", outline: "none", cursor: "pointer",
};