// candidate/CommentComposer.jsx
// Chat-style comment input.
// Features: auto-growing textarea, lock-icon private toggle,
// inline @mention suggestion popover, tagged-names chip preview, send button.

import { useState } from "react";
import { LockIcon } from "./shared";

// ── Main composer ─────────────────────────────────────────────────────────────

export default function CommentComposer({
  value,
  isPrivate,
  saving,
  saveError,
  mention,
  mentionMatches,
  mentionIdx,
  liveTaggedNames,
  textareaRef,
  mentionListRef,
  onChange,
  onKeyDown,
  onTogglePrivate,
  onInsertMention,
  onMentionIdx,
  onSubmit,
}) {
  const [focused, setFocused] = useState(false);
  const isMac  = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);
  const hasText = value.trim().length > 0;

  // Auto-grow: reset to auto then read scrollHeight
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

      {/* @mention suggestion popover — floats above the composer */}
      {mention && mentionMatches.length > 0 && (
        <MentionPopover
          matches={mentionMatches}
          activeIdx={mentionIdx}
          listRef={mentionListRef}
          onSelect={onInsertMention}
          onHover={onMentionIdx}
        />
      )}

      {/* Composer box — border changes on focus and private mode */}
      <div style={{
        border: `1px solid ${
          focused   ? "var(--accent)"          :
          isPrivate ? "rgba(245,158,11,0.45)"  :
                      "var(--border-default)"
        }`,
        borderRadius: "var(--radius-md)",
        boxShadow: focused ? "0 0 0 3px rgba(37,99,235,0.15)" : "none",
        background: isPrivate ? "rgba(245,158,11,0.03)" : "var(--bg-raised)",
        transition: "border-color 0.15s, box-shadow 0.15s, background 0.2s",
        overflow: "hidden",
      }}>

        {/* Private mode banner */}
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
          ref={(el) => {
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
            background: "transparent", color: "var(--text-primary)",
            border: "none", outline: "none",
            fontSize: "13px", fontFamily: "var(--font-ui)",
            lineHeight: 1.6, boxSizing: "border-box",
          }}
        />

        {/* Toolbar */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "5px 8px 7px",
          borderTop: `1px solid ${isPrivate ? "rgba(245,158,11,0.15)" : "var(--border-subtle)"}`,
          gap: 4,
        }}>
          <LockToggle isPrivate={isPrivate} onToggle={onTogglePrivate} />
          <AtHint />

          {/* Tagged-name chips */}
          {liveTaggedNames.length > 0 && (
            <div style={{
              display: "flex", gap: 4, alignItems: "center",
              flexWrap: "nowrap", overflow: "hidden", maxWidth: 140,
            }}>
              {liveTaggedNames.map((name) => (
                <span key={name} style={{
                  fontSize: 10, fontWeight: 600, color: "var(--accent)",
                  background: "rgba(37,99,235,0.12)",
                  borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap",
                }}>
                  @{name}
                </span>
              ))}
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Keyboard shortcut hint */}
          {hasText && !saving && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, letterSpacing: "0.01em" }}>
              {isMac ? "⌘↵" : "Ctrl+↵"}
            </span>
          )}

          <SendButton onClick={onSubmit} disabled={!hasText || saving} saving={saving} />
        </div>
      </div>

      {/* Error */}
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

function LockToggle({ isPrivate, onToggle }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={isPrivate ? "Private — click to make public" : "Click to make private"}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: "var(--radius-sm)",
        border: "none",
        background: isPrivate ? "rgba(245,158,11,0.18)" : hov ? "var(--bg-overlay)" : "transparent",
        color: isPrivate ? "#f59e0b" : hov ? "var(--text-secondary)" : "var(--text-muted)",
        transition: "background 0.15s, color 0.15s",
        flexShrink: 0, position: "relative",
      }}
    >
      <LockIcon size={14} locked={isPrivate} />
      {isPrivate && (
        <span style={{
          position: "absolute", top: 4, right: 4,
          width: 5, height: 5, borderRadius: "50%",
          background: "#f59e0b", border: "1.5px solid var(--bg-raised)",
        }} />
      )}
    </button>
  );
}

// ── @ hint ────────────────────────────────────────────────────────────────────

function AtHint() {
  return (
    <div
      title="Type @ to mention a teammate"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28,
        fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)",
        color: "var(--text-muted)", opacity: 0.55,
        cursor: "default", userSelect: "none", flexShrink: 0,
      }}
    >
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
        transition: "background 0.15s, color 0.15s", flexShrink: 0,
      }}
    >
      {saving ? (
        <><span style={{ fontSize: 11, opacity: 0.7 }}>◌</span> Sending</>
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
        zIndex: 1200,
      }}
    >
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
      onMouseDown={(e) => { e.preventDefault(); onSelect(recruiter); }}
      onMouseEnter={onHover}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 12px", cursor: "pointer",
        background: isActive ? "var(--accent-muted)" : "transparent",
        borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
        transition: "background 0.1s, border-color 0.1s",
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: isActive ? "rgba(37,99,235,0.25)" : "var(--bg-raised)",
        border: `1px solid ${isActive ? "rgba(37,99,235,0.4)" : "var(--border-default)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
        color: isActive ? "var(--accent)" : "var(--text-muted)",
        transition: "all 0.1s",
      }}>
        {ini}
      </div>
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
      <span style={{
        fontSize: 11, fontFamily: "var(--font-mono)", flexShrink: 0,
        color: isActive ? "var(--accent)" : "var(--text-muted)",
        opacity: isActive ? 1 : 0.5,
      }}>@</span>
    </div>
  );
}