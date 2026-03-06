export default function PermissionToggleGroup({ groups, selected, onToggle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {groups.map((group) => (
        <div
          key={group.title}
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-secondary)",
              background: "var(--bg-raised)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {group.title}
          </div>
          <div style={{ padding: "8px 10px", display: "grid", gap: "6px" }}>
            {group.items.map((item) => {
              const active = selected.includes(item.key);
              return (
                <label
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    background: active ? "var(--accent-muted)" : "transparent",
                  }}
                >
                  <span>{item.label}</span>
                  <button
                    type="button"
                    onClick={() => onToggle(item.key)}
                    style={{
                      width: "36px",
                      height: "20px",
                      borderRadius: "999px",
                      background: active ? "var(--accent)" : "var(--bg-overlay)",
                      border: "1px solid " + (active ? "var(--accent)" : "var(--border-default)"),
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: active ? "flex-end" : "flex-start",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: "#fff",
                      }}
                    />
                  </button>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
