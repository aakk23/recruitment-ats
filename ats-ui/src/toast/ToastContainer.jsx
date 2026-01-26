import { useToast } from "./ToastContext";

function ToastContainer() {
  const { toast, hideToast } = useToast();

  if (!toast) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#2a2a2a",
        color: "#fff",
        padding: "12px 14px",
        borderRadius: "8px",
        border:
          toast.type === "error"
            ? "1px solid #f44336"
            : "1px solid #4CAF50",
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        zIndex: 2000,
        minWidth: "260px",
        maxWidth: "360px"
      }}
    >
      {/* Header row: message + close */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px"
        }}
      >
        <div
          style={{
            fontSize: "14px",
            lineHeight: "1.4",
            flex: 1
          }}
        >
          {toast.message}
        </div>

        {toast.type === "error" && (
          <button
            onClick={hideToast}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#ccc",
              cursor: "pointer",
              fontSize: "18px",
              lineHeight: "1",
              padding: 0
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Optional action */}
      {toast.action && (
        <div style={{ marginTop: "8px" }}>
          <button
            onClick={() => {
              toast.action.onClick();
              hideToast();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "#4CAF50",
              cursor: "pointer",
              padding: 0,
              fontSize: "13px"
            }}
          >
            {toast.action.label}
          </button>
        </div>
      )}
    </div>
  );
}

export default ToastContainer;
