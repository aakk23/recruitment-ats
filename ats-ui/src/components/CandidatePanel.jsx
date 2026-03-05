// src/components/CandidatePanel.jsx
import { useState, useEffect, useRef, useCallback } from "react";
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

// ── @mention helpers ──────────────────────────────────────────────────────────

// Given textarea value + cursor position, find the active @-mention token
// Returns { query, start, end } or null
function getActiveMention(text, cursor) {
  // Walk backwards from cursor to find the most recent '@'
  let i = cursor - 1;
  while (i >= 0 && text[i] !== "@" && text[i] !== "\n" && !/\s/.test(text[i])) i--;
  if (i >= 0 && text[i] === "@") {
    const query = text.slice(i + 1, cursor);
    // Only trigger if query has no spaces (i.e. user is still on one token)
    if (!/\s/.test(query)) {
      return { query, start: i, end: cursor };
    }
  }
  return null;
}

// Extract all @Name mentions from text and map to recruiter ids
function extractTaggedIds(text, recruiters) {
  const mentions = [...text.matchAll(/@([\w .'-]+)/g)].map(m => m[1].trim());
  const ids = [];
  for (const m of mentions) {
    const r = recruiters.find(r => r.name.toLowerCase() === m.toLowerCase());
    if (r && !ids.includes(r.id)) ids.push(r.id);
  }
  return ids;
}

// Render comment text with @mentions highlighted
function CommentText({ text }) {
  // Split on @Word boundaries
  const parts = text.split(/(@[\w .'-]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span key={i} style={{
            color: "var(--accent)", fontWeight: 600,
            background: "rgba(37,99,235,0.12)",
            borderRadius: "4px", padding: "0 3px",
          }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CandidatePanel({ application, roleId, onClose, onStageChange }) {
  const [tab,             setTab]             = useState("overview");

  // Remote data
  const [events,          setEvents]          = useState([]);
  const [comments,        setComments]        = useState([]);
  const [stages,          setStages]          = useState([]);
  const [candidate,       setCandidate]       = useState(null);
  const [recruiters,      setRecruiters]      = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);

  // Local ownership mirror
  const [localOwnership,  setLocalOwnership]  = useState({
    candidate_owner:    null,
    assigned_recruiter: null,
  });

  // Resume preview pane
  const [showResume,      setShowResume]      = useState(false);

  // Comment composer
  const [newComment,      setNewComment]      = useState("");
  const [isPrivate,       setIsPrivate]       = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saveError,       setSaveError]       = useState(null);

  // @mention popover state
  const [mention,         setMention]         = useState(null); // { query, start, end } | null
  const [mentionIdx,      setMentionIdx]      = useState(0);
  const textareaRef = useRef(null);
  const mentionListRef = useRef(null);

  // Ownership editor
  const [ownerEdit,       setOwnerEdit]       = useState(false);
  const [newCandOwner,    setNewCandOwner]    = useState("");
  const [newAssigned,     setNewAssigned]     = useState("");
  const [savingOwner,     setSavingOwner]     = useState(false);
  const [ownerError,      setOwnerError]      = useState(null);

  // Local stage / substage mirrors
  const [localSubstage,   setLocalSubstage]   = useState(null);
  const [localStage,      setLocalStage]      = useState(null);

  const appId = application?.application_id;

  // ── Fetch on candidate change ─────────────────────────────────────────────
  useEffect(() => {
    if (!appId) return;

    setTab("overview");
    setEvents([]); setComments([]); setStages([]); setCandidate(null);
    setShowResume(false); setOwnerEdit(false);
    setNewComment(""); setIsPrivate(false); setSaveError(null);
    setMention(null);
    setLocalSubstage(application.substage_id ?? null);
    setLocalStage(application.stage);
    setLocalOwnership({
      candidate_owner:    application.candidate_owner    ?? null,
      assigned_recruiter: application.assigned_recruiter ?? null,
    });

    setLoading(true); setError(null);

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

  const currentStageObj = stages.find((s) => s.name === localStage);
  const substages        = currentStageObj?.substages || [];

  // ── Stage handlers ────────────────────────────────────────────────────────
  const handleStageChange = (newStage) => {
    setLocalStage(newStage);
    setLocalSubstage(null);
    onStageChange(appId, newStage, null);
  };

  const handleSubstageChange = (substageId) => {
    const id = substageId ? parseInt(substageId) : null;
    setLocalSubstage(id);
    onStageChange(appId, localStage, id);
  };

  // ── Comment handlers ──────────────────────────────────────────────────────
  const handleAddComment = () => {
    const text = newComment.trim();
    if (!text || saving) return;
    const taggedIds = extractTaggedIds(text, recruiters);
    setSaveError(null); setSaving(true);
    addComment(appId, text, isPrivate, taggedIds)
      .then(() => {
        setNewComment(""); setIsPrivate(false); setMention(null);
        return Promise.all([fetchComments(appId), fetchEvents(appId)]);
      })
      .then(([cmData, evData]) => { setComments(cmData); setEvents(evData); })
      .catch(() => setSaveError("Could not add comment"))
      .finally(() => setSaving(false));
  };

  // ── @mention: update on every keystroke ───────────────────────────────────
  const handleCommentChange = (e) => {
    const val    = e.target.value;
    const cursor = e.target.selectionStart;
    setNewComment(val);
    const m = getActiveMention(val, cursor);
    setMention(m);
    setMentionIdx(0);
  };

  // Filter recruiter list by the current @query
  const mentionMatches = mention
    ? recruiters.filter(r =>
        r.name.toLowerCase().startsWith(mention.query.toLowerCase())
      ).slice(0, 6)
    : [];

  // Insert chosen recruiter into the textarea text — useCallback MUST be above
  // the early return to satisfy Rules of Hooks (hook count must be stable).
  const insertMention = useCallback((recruiter) => {
    const ta = textareaRef.current;
    if (!ta || !mention) return;
    const before = newComment.slice(0, mention.start);
    const after  = newComment.slice(mention.end);
    const inserted = `@${recruiter.name} `;
    const next = before + inserted + after;
    setNewComment(next);
    setMention(null);
    const newCursor = mention.start + inserted.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    });
  }, [mention, newComment]);

  // Early return AFTER all hooks — Rules of Hooks requires consistent hook call order
  if (!application) return null;

  // Keyboard nav in mention list
  const handleCommentKeyDown = (e) => {
    if (mention && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx(i => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx(i => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionMatches[mentionIdx]);
        return;
      }
      if (e.key === "Escape") {
        setMention(null);
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAddComment();
    }
  };

  // ── Ownership handler ─────────────────────────────────────────────────────
  const handleSaveOwnership = () => {
    setOwnerError(null); setSavingOwner(true);
    updateOwnership(appId, {
      candidate_owner_id:    newCandOwner ? parseInt(newCandOwner)  : undefined,
      assigned_recruiter_id: newAssigned  ? parseInt(newAssigned)   : undefined,
    })
      .then(() => {
        const ownerName    = recruiters.find((r) => r.id === parseInt(newCandOwner))?.name;
        const assignedName = recruiters.find((r) => r.id === parseInt(newAssigned))?.name;
        setLocalOwnership({
          candidate_owner:    newCandOwner ? ownerName    : localOwnership.candidate_owner,
          assigned_recruiter: newAssigned  ? assignedName : localOwnership.assigned_recruiter,
        });
        setOwnerEdit(false); setNewCandOwner(""); setNewAssigned("");
      })
      .catch(() => setOwnerError("Failed to save ownership"))
      .finally(() => setSavingOwner(false));
  };

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "timeline", label: `Timeline${events.length   ? ` (${events.length})`   : ""}` },
    { key: "comments", label: `Comments${comments.length ? ` (${comments.length})` : ""}` },
  ];

  const panelWidth = showResume ? "860px" : "420px";

  // Compute active @mention tags for the toolbar preview
  const liveTaggedNames = newComment
    ? extractTaggedIds(newComment, recruiters).map(id => recruiters.find(r => r.id === id)?.name).filter(Boolean)
    : [];

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
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "18px" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
              >×</button>
            </div>
          </div>
          <iframe src={candidate.resume_url} style={{ flex: 1, border: "none", background: "#fff" }} title="Resume Preview" />
        </div>
      )}

      {/* ── Main panel ── */}
      <div style={{
        width: "420px", flexShrink: 0,
        display: "flex", flexDirection: "column",
        height: "100%", overflow: "hidden",
      }}>

        {/* ── Panel header ── */}
        <div style={{ padding: "18px 20px 0", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          {/* Name row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: "0 0 3px", fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {application.candidate_name}
              </h3>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{application.email}</div>
              {candidate?.phone && (
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>📞 {candidate.phone}</div>
              )}
              {candidate?.linkedin_url && (
                <a href={candidate.linkedin_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: "12px", color: "var(--accent)", marginTop: "2px", display: "inline-block" }}>
                  🔗 LinkedIn
                </a>
              )}
            </div>
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
              <button onClick={onClose}
                style={{ background: "transparent", border: "none", fontSize: "20px", color: "var(--text-muted)", padding: "2px 4px" }}
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
            border: "1px solid var(--border-subtle)", flexWrap: "wrap",
          }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: sc(localStage), flexShrink: 0 }} />
            <select value={localStage ?? ""} onChange={(e) => handleStageChange(e.target.value)} style={selectStyle}>
              {stages.length === 0
                ? <option value={localStage}>{localStage}</option>
                : stages.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)
              }
            </select>
            {substages.length > 0 && (
              <>
                <span style={{ color: "var(--border-strong)", fontSize: "12px", flexShrink: 0 }}>›</span>
                <select value={localSubstage ?? ""} onChange={(e) => handleSubstageChange(e.target.value)} style={{ ...selectStyle, fontSize: "12px" }}>
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
                flex: 1, padding: "9px 0",
                background: "transparent", border: "none",
                borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === key ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "12px", fontWeight: tab === key ? 600 : 400,
                transition: "color 0.15s, border-color 0.15s",
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* ── Loading / Error ── */}
        {loading && <CentredMsg>Loading…</CentredMsg>}
        {error && !loading && (
          <div style={{ padding: "16px 20px", color: "var(--danger)", fontSize: "13px" }}>{error}</div>
        )}

        {/* ══ OVERVIEW TAB ════════════════════════════════════════════════════ */}
        {!loading && !error && tab === "overview" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            <Section title="Role Details">
              <Row label="Recruiter">{application.recruiter ?? "—"}</Row>
              <Row label="Candidate Owner">{localOwnership.candidate_owner ?? "—"}</Row>
              <Row label="Assigned To">{localOwnership.assigned_recruiter ?? "—"}</Row>
              {(localSubstage || application.substage_name) && (
                <Row label="Sub-stage">
                  {substages.find((s) => s.id === localSubstage)?.name ?? application.substage_name ?? "—"}
                </Row>
              )}
            </Section>

            {/* Ownership editor */}
            {!ownerEdit ? (
              <button
                onClick={() => { setOwnerEdit(true); setOwnerError(null); }}
                style={{
                  fontSize: "12px", color: "var(--accent)", background: "transparent",
                  border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)",
                  padding: "4px 10px", marginBottom: "20px",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-muted)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                Edit Ownership
              </button>
            ) : (
              <div style={{ background: "var(--bg-raised)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "14px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "10px" }}>Update Ownership</div>
                <SmallSelect label="Candidate Owner"    value={newCandOwner} onChange={setNewCandOwner} options={recruiters} />
                <SmallSelect label="Assigned Recruiter" value={newAssigned}  onChange={setNewAssigned}  options={recruiters} />
                {ownerError && <div style={{ fontSize: "12px", color: "var(--danger)", marginBottom: "8px" }}>{ownerError}</div>}
                <div style={{ display: "flex", gap: "8px" }}>
                  <Btn onClick={handleSaveOwnership} disabled={savingOwner} size="sm">
                    {savingOwner ? "Saving…" : "Save"}
                  </Btn>
                  <Btn variant="ghost" size="sm"
                    onClick={() => { setOwnerEdit(false); setOwnerError(null); setNewCandOwner(""); setNewAssigned(""); }}>
                    Cancel
                  </Btn>
                </div>
              </div>
            )}

            <Section title="Candidate Info">
              {candidate?.phone && <Row label="Phone">{candidate.phone}</Row>}
              {candidate?.linkedin_url && (
                <Row label="LinkedIn">
                  <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontSize: "12px" }}>View Profile →</a>
                </Row>
              )}
              {candidate?.resume_url && (
                <Row label="Resume">
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button onClick={() => setShowResume(true)} style={{ fontSize: "12px", color: "var(--accent)", background: "transparent", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)", padding: "2px 8px" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--accent-muted)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>Preview</button>
                    <a href={candidate.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "var(--text-secondary)", background: "var(--bg-overlay)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", padding: "2px 8px", textDecoration: "none" }}>↓ Download</a>
                  </div>
                </Row>
              )}
              <Row label="Added">{fmt(application.created_at)}</Row>
            </Section>
          </div>
        )}

        {/* ══ TIMELINE TAB ════════════════════════════════════════════════════ */}
        {!loading && !error && tab === "timeline" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 12px" }}>
            {events.length === 0
              ? <EmptyMsg>No activity yet</EmptyMsg>
              : events.map((e) => <EventRow key={e.id} event={e} />)
            }
          </div>
        )}

        {/* ══ COMMENTS TAB ════════════════════════════════════════════════════ */}
        {!loading && !error && tab === "comments" && (
          <>
            {/* Comment list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 6px" }}>
              {comments.length === 0
                ? <CommentEmptyState />
                : comments.map((c) => <CommentRow key={c.id} comment={c} />)
              }
            </div>

            {/* ── Composer ── */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "10px 16px 14px", flexShrink: 0 }}>
              <CommentComposer
                value={newComment}
                isPrivate={isPrivate}
                saving={saving}
                saveError={saveError}
                mention={mention}
                mentionMatches={mentionMatches}
                mentionIdx={mentionIdx}
                liveTaggedNames={liveTaggedNames}
                textareaRef={textareaRef}
                mentionListRef={mentionListRef}
                onChange={handleCommentChange}
                onKeyDown={handleCommentKeyDown}
                onTogglePrivate={() => setIsPrivate(p => !p)}
                onInsertMention={insertMention}
                onMentionIdx={setMentionIdx}
                onSubmit={handleAddComment}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══ Comment composer ══════════════════════════════════════════════════════════
// Chat-style input: lock icon toggle for private, inline @mention popover.

function CommentComposer({
  value, isPrivate, saving, saveError,
  mention, mentionMatches, mentionIdx, liveTaggedNames,
  textareaRef, mentionListRef,
  onChange, onKeyDown, onTogglePrivate, onInsertMention, onMentionIdx, onSubmit,
}) {
  const [focused, setFocused] = useState(false);
  const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const hasText = value.trim().length > 0;

  // Auto-grow textarea with JS
  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const handleChange = (e) => {
    autoGrow(e.target);
    onChange(e);
  };

  return (
    <div style={{ position: "relative" }}>

      {/* ── @mention suggestion popover — floats above the composer ── */}
      {mention && mentionMatches.length > 0 && (
        <MentionPopover
          matches={mentionMatches}
          activeIdx={mentionIdx}
          listRef={mentionListRef}
          onSelect={onInsertMention}
          onHover={onMentionIdx}
        />
      )}

      {/* ── Main composer box ── */}
      <div style={{
        border: `1px solid ${
          focused       ? "var(--accent)"             :
          isPrivate     ? "rgba(245,158,11,0.45)"     :
                          "var(--border-default)"
        }`,
        borderRadius: "var(--radius-md)",
        boxShadow: focused ? "0 0 0 3px rgba(37,99,235,0.15)" : "none",
        background: isPrivate ? "rgba(245,158,11,0.03)" : "var(--bg-raised)",
        transition: "border-color 0.15s, box-shadow 0.15s, background 0.2s",
        overflow: "hidden",
      }}>

        {/* Private mode banner — sits above textarea inside the box */}
        {isPrivate && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px 4px",
            background: "rgba(245,158,11,0.08)",
            borderBottom: "1px solid rgba(245,158,11,0.18)",
            fontSize: 11, color: "#f59e0b", fontWeight: 600,
            letterSpacing: "0.03em",
          }}>
            <LockIcon size={10} locked />
            Only visible to your team
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={el => {
            if (textareaRef) textareaRef.current = el;
            autoGrow(el);
          }}
          placeholder="Add a comment… type @ to mention someone"
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={2}
          style={{
            display: "block", width: "100%",
            minHeight: 64, maxHeight: 160,
            padding: "10px 12px 6px",
            resize: "none", overflow: "auto",
            background: "transparent",
            color: "var(--text-primary)",
            border: "none", outline: "none",
            fontSize: "13px", fontFamily: "var(--font-ui)",
            lineHeight: 1.6,
            boxSizing: "border-box",
          }}
        />

        {/* ── Toolbar — lives inside the box at the bottom ── */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "5px 8px 7px",
          borderTop: `1px solid ${isPrivate ? "rgba(245,158,11,0.15)" : "var(--border-subtle)"}`,
          gap: 4,
        }}>

          {/* 🔒 Lock icon — icon-only, toggles private mode */}
          <LockToggle isPrivate={isPrivate} onToggle={onTogglePrivate} />

          {/* @ mention hint — only visible while typing mentions */}
          <AtHint label="@" />

          {/* Live tagged-names chip row */}
          {liveTaggedNames.length > 0 && (
            <div style={{
              display: "flex", gap: 4, alignItems: "center",
              flexWrap: "nowrap", overflow: "hidden", maxWidth: 140,
            }}>
              {liveTaggedNames.map(name => (
                <span key={name} style={{
                  fontSize: 10, fontWeight: 600,
                  color: "var(--accent)",
                  background: "rgba(37,99,235,0.12)",
                  borderRadius: 999, padding: "1px 7px",
                  whiteSpace: "nowrap",
                }}>@{name}</span>
              ))}
            </div>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Keyboard shortcut hint */}
          {hasText && !saving && (
            <span style={{
              fontSize: 10, color: "var(--text-muted)",
              flexShrink: 0, letterSpacing: "0.01em",
            }}>
              {isMac ? "⌘↵" : "Ctrl+↵"}
            </span>
          )}

          {/* Send button — icon + label */}
          <SendButton onClick={onSubmit} disabled={!hasText || saving} saving={saving} />
        </div>
      </div>

      {/* Error message */}
      {saveError && (
        <div style={{
          fontSize: 11, color: "var(--danger)", marginTop: 5,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span>⚠</span> {saveError}
        </div>
      )}
    </div>
  );
}

// ── Lock toggle ───────────────────────────────────────────────────────────────
// Icon-only button. When locked (private), glows amber. When unlocked, shows
// a muted open-lock icon. Tooltip explains the action.

function LockToggle({ isPrivate, onToggle }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={isPrivate ? "Private comment — click to make public" : "Click to make private"}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28,
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: isPrivate
          ? "rgba(245,158,11,0.18)"
          : hov ? "var(--bg-overlay)" : "transparent",
        color: isPrivate
          ? "#f59e0b"
          : hov ? "var(--text-secondary)" : "var(--text-muted)",
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0,
        position: "relative",
      }}
    >
      <LockIcon size={14} locked={isPrivate} />
      {/* Amber dot indicator when locked */}
      {isPrivate && (
        <span style={{
          position: "absolute", top: 4, right: 4,
          width: 5, height: 5, borderRadius: "50%",
          background: "#f59e0b",
          border: "1.5px solid var(--bg-raised)",
        }} />
      )}
    </button>
  );
}

// ── @ hint icon ───────────────────────────────────────────────────────────────

function AtHint({ label }) {
  return (
    <div title="Type @ to mention a teammate" style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 28, height: 28,
      fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)",
      color: "var(--text-muted)",
      opacity: 0.55,
      cursor: "default",
      userSelect: "none",
      flexShrink: 0,
    }}>
      @
    </div>
  );
}

// ── Send button ───────────────────────────────────────────────────────────────

function SendButton({ onClick, disabled, saving }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 11px",
        background: disabled ? "var(--bg-overlay)" : hov ? "var(--accent-hover)" : "var(--accent)",
        color: disabled ? "var(--text-muted)" : "#fff",
        border: "none", borderRadius: "var(--radius-sm)",
        fontSize: 12, fontWeight: 600,
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0,
      }}
    >
      {saving ? (
        <>
          <span style={{ fontSize: 11, opacity: 0.7 }}>◌</span>
          Sending
        </>
      ) : (
        <>
          Send
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ marginTop: 0.5 }}>
            <path d="M1 5.5h9M6 1.5l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </>
      )}
    </button>
  );
}

// ── @mention popover ──────────────────────────────────────────────────────────
// Appears above the composer, floats over other content.

function MentionPopover({ matches, activeIdx, listRef, onSelect, onHover }) {
  return (
    <div
      ref={listRef}
      style={{
        position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
        background: "var(--bg-overlay)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.55)",
        overflow: "hidden",
        zIndex: 1200, // above the panel (z:1000) and anything else
      }}
    >
      {/* Popover header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px 5px",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: "0.07em",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>@</span>
        Mention a teammate
      </div>

      {matches.map((r, i) => (
        <MentionRow
          key={r.id}
          recruiter={r}
          isActive={i === activeIdx}
          onSelect={onSelect}
          onHover={() => onHover(i)}
        />
      ))}
    </div>
  );
}

function MentionRow({ recruiter, isActive, onSelect, onHover }) {
  const ini = recruiter.name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div
      onMouseDown={e => { e.preventDefault(); onSelect(recruiter); }}
      onMouseEnter={onHover}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", cursor: "pointer",
        background: isActive ? "var(--accent-muted)" : "transparent",
        borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: isActive ? "rgba(37,99,235,0.25)" : "var(--bg-raised)",
        border: `1px solid ${isActive ? "rgba(37,99,235,0.4)" : "var(--border-default)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
        color: isActive ? "var(--accent)" : "var(--text-muted)",
        transition: "all 0.1s",
      }}>{ini}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {recruiter.name}
        </div>
        {recruiter.email && (
          <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {recruiter.email}
          </div>
        )}
      </div>

      {/* @ badge on the right */}
      <span style={{
        fontSize: 11, fontFamily: "var(--font-mono)", flexShrink: 0,
        color: isActive ? "var(--accent)" : "var(--text-muted)",
        opacity: isActive ? 1 : 0.5,
      }}>@</span>
    </div>
  );
}

// ── Comment row ───────────────────────────────────────────────────────────────

function CommentRow({ comment }) {
  const ini = (comment.recruiter || "?").split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start",
        padding: "4px 6px", margin: "0 -6px 16px",
        borderRadius: "var(--radius-md)",
        background: hov ? "var(--bg-raised)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-muted)",
        marginTop: 1,
      }}>{ini}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Meta row: name · time · private badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 5, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
            {comment.recruiter ?? "Unknown"}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {fmt(comment.created_at)}
          </span>
          {comment.is_private && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 10, fontWeight: 600, color: "#f59e0b",
              background: "rgba(245,158,11,0.10)",
              border: "1px solid rgba(245,158,11,0.22)",
              borderRadius: 999, padding: "0 6px",
              height: 16,
            }}>
              <LockIcon size={8} locked />
              Private
            </span>
          )}
        </div>

        {/* Comment bubble */}
        <div style={{
          fontSize: 13, color: "var(--text-primary)",
          lineHeight: 1.6, wordBreak: "break-word",
          background: comment.is_private
            ? "rgba(245,158,11,0.04)"
            : "var(--bg-surface)",
          border: `1px solid ${
            comment.is_private ? "rgba(245,158,11,0.18)" : "var(--border-subtle)"
          }`,
          borderRadius: "var(--radius-md)",
          padding: "8px 12px",
        }}>
          <CommentText text={comment.comment} />
        </div>
      </div>
    </div>
  );
}

// ── Comment empty state ───────────────────────────────────────────────────────

function CommentEmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "48px 20px 32px", gap: 10, color: "var(--text-muted)",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "var(--bg-raised)", border: "1px solid var(--border-default)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18,
      }}>💬</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
        No comments yet
      </div>
      <div style={{ fontSize: 12, textAlign: "center", maxWidth: 200, lineHeight: 1.5 }}>
        Start the conversation. Use <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>@</span> to mention a teammate.
      </div>
    </div>
  );
}

// ── Lock icon SVG ─────────────────────────────────────────────────────────────

function LockIcon({ size = 14, locked = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      {locked ? (
        <>
          <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="7" cy="9.25" r="1" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4.5 6V4a2.5 2.5 0 014.5 2.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="7" cy="9.25" r="1" fill="currentColor" />
        </>
      )}
    </svg>
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
          <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{fmt(event.created_at)}</span>
        </div>
        {cfg.detail(event) && (
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "3px" }}>{cfg.detail(event)}</div>
        )}
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>{event.recruiter_name ?? "System"}</div>
      </div>
    </div>
  );
}

// ── Shared layout helpers ─────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "9px" }}>{title}</div>
      <div style={{ background: "var(--bg-raised)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "5px 0", borderBottom: "1px solid var(--border-subtle)" }}>
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
  const primary = variant === "primary";
  const pad     = size === "sm" ? "5px 14px" : "8px 18px";
  return (
    <button disabled={disabled} onClick={onClick} style={{
      padding: pad, fontSize: "13px", fontWeight: 600,
      background: disabled ? "var(--bg-overlay)" : primary ? "var(--accent)" : "var(--bg-raised)",
      color:      disabled ? "var(--text-muted)"  : primary ? "#fff"          : "var(--text-secondary)",
      border: primary ? "none" : "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)", transition: "background 0.15s", ...s,
    }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = primary ? "var(--accent-hover)" : "var(--bg-overlay)"; }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = primary ? "var(--accent)" : "var(--bg-raised)"; }}
    >{children}</button>
  );
}

function CentredMsg({ children }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", color: "var(--text-muted)" }}>{children}</div>
  );
}

function EmptyMsg({ children }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "13px" }}>{children}</div>
  );
}

const selectStyle = {
  width: "100%", padding: "6px 10px",
  background: "var(--bg-overlay)", color: "var(--text-primary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  fontSize: "13px", outline: "none", cursor: "pointer",
};