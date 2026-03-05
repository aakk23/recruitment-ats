// candidate/CommentsTab.jsx
// Comments tab: scrollable comment list + composer footer.
// CommentRow and CommentEmptyState live here — they are only used by this tab.

import { useState } from "react";
import { fmt, LockIcon } from "./shared";
import CommentComposer from "./CommentComposer";

// ── Comment text — renders @mentions as highlighted chips ─────────────────────

function CommentText({ text }) {
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

// ── Single comment row ────────────────────────────────────────────────────────

function CommentRow({ comment }) {
  const ini = (comment.recruiter || "?").split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", gap: 10, alignItems: "flex-start",
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
        {/* Meta: name · timestamp · private badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
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
              borderRadius: 999, padding: "0 6px", height: 16,
            }}>
              <LockIcon size={8} locked />
              Private
            </span>
          )}
        </div>

        {/* Bubble */}
        <div style={{
          fontSize: 13, color: "var(--text-primary)",
          lineHeight: 1.6, wordBreak: "break-word",
          background: comment.is_private ? "rgba(245,158,11,0.04)" : "var(--bg-surface)",
          border: `1px solid ${comment.is_private ? "rgba(245,158,11,0.18)" : "var(--border-subtle)"}`,
          borderRadius: "var(--radius-md)",
          padding: "8px 12px",
        }}>
          <CommentText text={comment.comment} />
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

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
        Start the conversation. Use{" "}
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>@</span>
        {" "}to mention a teammate.
      </div>
    </div>
  );
}

// ── Tab root ──────────────────────────────────────────────────────────────────

export default function CommentsTab({
  comments,
  // composer props — passed straight through to CommentComposer
  newComment, isPrivate, saving, saveError,
  mention, mentionMatches, mentionIdx, liveTaggedNames,
  textareaRef, mentionListRef,
  onCommentChange, onCommentKeyDown, onTogglePrivate,
  onInsertMention, onMentionIdx, onAddComment,
}) {
  return (
    <>
      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 6px" }}>
        {comments.length === 0
          ? <CommentEmptyState />
          : comments.map((c) => <CommentRow key={c.id} comment={c} />)
        }
      </div>

      {/* Composer pinned to bottom */}
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
          onChange={onCommentChange}
          onKeyDown={onCommentKeyDown}
          onTogglePrivate={onTogglePrivate}
          onInsertMention={onInsertMention}
          onMentionIdx={onMentionIdx}
          onSubmit={onAddComment}
        />
      </div>
    </>
  );
}