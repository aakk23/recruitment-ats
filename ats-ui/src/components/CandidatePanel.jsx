// src/components/CandidatePanel.jsx
// Shell component: owns all state, data-fetching, and event handlers.
// Rendering is fully delegated to sub-components in ./candidate/.

import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchComments, addComment,
  fetchStages, fetchCandidate, fetchEvents,
  fetchRecruiters, updateOwnership,
} from "../api";

import { getActiveMention, extractTaggedIds, CentredMsg } from "./candidate/shared";
import PanelHeader  from "./candidate/PanelHeader";
import OverviewTab  from "./candidate/OverviewTab";
import TimelineTab  from "./candidate/TimelineTab";
import CommentsTab  from "./candidate/CommentsTab";

export default function CandidatePanel({ application, roleId, onClose, onStageChange }) {

  // ── Remote data ─────────────────────────────────────────────────────────────
  const [events,     setEvents]     = useState([]);
  const [comments,   setComments]   = useState([]);
  const [stages,     setStages]     = useState([]);
  const [candidate,  setCandidate]  = useState(null);
  const [recruiters, setRecruiters] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [tab,        setTab]        = useState("overview");
  const [showResume, setShowResume] = useState(false);

  // ── Stage mirrors ────────────────────────────────────────────────────────────
  const [localStage,    setLocalStage]    = useState(null);
  const [localSubstage, setLocalSubstage] = useState(null);

  // ── Ownership editor ─────────────────────────────────────────────────────────
  const [localOwnership, setLocalOwnership] = useState({ candidate_owner: null, assigned_recruiter: null });
  const [ownerEdit,      setOwnerEdit]      = useState(false);
  const [newCandOwner,   setNewCandOwner]   = useState("");
  const [newAssigned,    setNewAssigned]    = useState("");
  const [savingOwner,    setSavingOwner]    = useState(false);
  const [ownerError,     setOwnerError]     = useState(null);

  // ── Comment composer ─────────────────────────────────────────────────────────
  const [newComment, setNewComment] = useState("");
  const [isPrivate,  setIsPrivate]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [saveError,  setSaveError]  = useState(null);

  // ── @mention state ────────────────────────────────────────────────────────────
  const [mention,    setMention]    = useState(null); // { query, start, end } | null
  const [mentionIdx, setMentionIdx] = useState(0);
  const textareaRef    = useRef(null);
  const mentionListRef = useRef(null);

  const appId = application?.application_id;

  // ── Fetch everything when candidate changes ───────────────────────────────────
  useEffect(() => {
    if (!appId) return;

    // Reset all local state
    setTab("overview");
    setShowResume(false);
    setEvents([]); setComments([]); setStages([]); setCandidate(null);
    setNewComment(""); setIsPrivate(false); setSaveError(null); setMention(null);
    setOwnerEdit(false); setNewCandOwner(""); setNewAssigned(""); setOwnerError(null);
    setLocalStage(application.stage);
    setLocalSubstage(application.substage_id ?? null);
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

  // ── Derived values (computed before early-return so hooks stay stable) ────────
  const currentStageObj = stages.find((s) => s.name === localStage);
  const substages       = currentStageObj?.substages || [];

  const mentionMatches = mention
    ? recruiters.filter(r => r.name.toLowerCase().startsWith(mention.query.toLowerCase())).slice(0, 6)
    : [];

  const liveTaggedNames = newComment
    ? extractTaggedIds(newComment, recruiters)
        .map(id => recruiters.find(r => r.id === id)?.name)
        .filter(Boolean)
    : [];

  // useCallback must be above the early return (Rules of Hooks)
  const insertMention = useCallback((recruiter) => {
    const ta = textareaRef.current;
    if (!ta || !mention) return;
    const before   = newComment.slice(0, mention.start);
    const after    = newComment.slice(mention.end);
    const inserted = `@${recruiter.name} `;
    setNewComment(before + inserted + after);
    setMention(null);
    const cur = mention.start + inserted.length;
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(cur, cur); });
  }, [mention, newComment]);

  // ── Early return after all hooks ──────────────────────────────────────────────
  if (!application) return null;

  // ── Stage handlers ────────────────────────────────────────────────────────────
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

  // ── Comment handlers ──────────────────────────────────────────────────────────
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

  const handleCommentChange = (e) => {
    const val = e.target.value;
    setNewComment(val);
    setMention(getActiveMention(val, e.target.selectionStart));
    setMentionIdx(0);
  };

  const handleCommentKeyDown = (e) => {
    if (mention && mentionMatches.length > 0) {
      if (e.key === "ArrowDown")  { e.preventDefault(); setMentionIdx(i => (i + 1) % mentionMatches.length); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); setMentionIdx(i => (i - 1 + mentionMatches.length) % mentionMatches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionMatches[mentionIdx]); return; }
      if (e.key === "Escape")     { setMention(null); return; }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddComment();
  };

  // ── Ownership handler ─────────────────────────────────────────────────────────
  const handleSaveOwnership = () => {
    setOwnerError(null); setSavingOwner(true);
    updateOwnership(appId, {
      candidate_owner_id:    newCandOwner ? parseInt(newCandOwner) : undefined,
      assigned_recruiter_id: newAssigned  ? parseInt(newAssigned)  : undefined,
    })
      .then(() => {
        setLocalOwnership({
          candidate_owner:    newCandOwner ? recruiters.find(r => r.id === parseInt(newCandOwner))?.name : localOwnership.candidate_owner,
          assigned_recruiter: newAssigned  ? recruiters.find(r => r.id === parseInt(newAssigned))?.name  : localOwnership.assigned_recruiter,
        });
        setOwnerEdit(false); setNewCandOwner(""); setNewAssigned("");
      })
      .catch(() => setOwnerError("Failed to save ownership"))
      .finally(() => setSavingOwner(false));
  };

  // ── Layout ────────────────────────────────────────────────────────────────────
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

      {/* Resume preview pane — only shown when showResume + URL exists */}
      {showResume && candidate?.resume_url && (
        <div style={{ flex: 1, borderRight: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>Resume Preview</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <a href={candidate.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "var(--accent)", padding: "3px 10px", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)", textDecoration: "none" }}>↓ Download</a>
              <button onClick={() => setShowResume(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "18px" }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
              >×</button>
            </div>
          </div>
          <iframe src={candidate.resume_url} style={{ flex: 1, border: "none", background: "#fff" }} title="Resume Preview" />
        </div>
      )}

      {/* Main 420px panel column */}
      <div style={{ width: "420px", flexShrink: 0, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

        <PanelHeader
          application={application}
          candidate={candidate}
          stages={stages}
          substages={substages}
          localStage={localStage}
          localSubstage={localSubstage}
          showResume={showResume}
          tab={tab}
          events={events}
          comments={comments}
          onStageChange={handleStageChange}
          onSubstageChange={handleSubstageChange}
          onToggleResume={() => setShowResume(s => !s)}
          onClose={onClose}
          onTabChange={setTab}
        />

        {/* Loading / error */}
        {loading && <CentredMsg>Loading…</CentredMsg>}
        {error && !loading && (
          <div style={{ padding: "16px 20px", color: "var(--danger)", fontSize: "13px" }}>{error}</div>
        )}

        {/* Tab bodies */}
        {!loading && !error && tab === "overview" && (
          <OverviewTab
            application={application}
            candidate={candidate}
            substages={substages}
            localSubstage={localSubstage}
            localOwnership={localOwnership}
            recruiters={recruiters}
            ownerEdit={ownerEdit}
            newCandOwner={newCandOwner}
            newAssigned={newAssigned}
            savingOwner={savingOwner}
            ownerError={ownerError}
            onStartEdit={() => { setOwnerEdit(true); setOwnerError(null); }}
            onCancelEdit={() => { setOwnerEdit(false); setOwnerError(null); setNewCandOwner(""); setNewAssigned(""); }}
            onNewCandOwner={setNewCandOwner}
            onNewAssigned={setNewAssigned}
            onSaveOwnership={handleSaveOwnership}
            onShowResume={() => setShowResume(true)}
          />
        )}

        {!loading && !error && tab === "timeline" && (
          <TimelineTab events={events} />
        )}

        {!loading && !error && tab === "comments" && (
          <CommentsTab
            comments={comments}
            newComment={newComment}
            isPrivate={isPrivate}
            saving={saving}
            saveError={saveError}
            mention={mention}
            mentionMatches={mentionMatches}
            mentionIdx={mentionIdx}
            liveTaggedNames={liveTaggedNames}
            textareaRef={textareaRef}
            mentionListRef={mentionListRef}
            onCommentChange={handleCommentChange}
            onCommentKeyDown={handleCommentKeyDown}
            onTogglePrivate={() => setIsPrivate(p => !p)}
            onInsertMention={insertMention}
            onMentionIdx={setMentionIdx}
            onAddComment={handleAddComment}
          />
        )}

      </div>
    </div>
  );
}