interface Props {
  title:          string;
  body:           string;
  confirmLabel?:  string;
  cancelLabel?:   string;
  destructive?:   boolean;
  onConfirm:      () => void;
  onCancel:       () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  destructive  = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 300,
        }}
      />
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 360,
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        padding: "20px 20px 16px",
        display: "flex", flexDirection: "column", gap: 12,
        zIndex: 301,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        <div style={{
          fontWeight: 700, fontSize: 13,
          color: destructive ? "var(--danger, #f87171)" : "var(--text-main)",
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
          {body}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            className="cmd-pill-btn"
            style={{ fontSize: 11, padding: "5px 12px" }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`cmd-pill-btn${destructive ? " cmd-pill-btn--danger" : ""}`}
            style={{ fontSize: 11, padding: "5px 12px" }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
