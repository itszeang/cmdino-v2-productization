interface Props {
  title:          string;
  body:           string;
  confirmLabel?:  string;
  secondaryLabel?: string;
  cancelLabel?:   string;
  destructive?:   boolean;
  onConfirm:      () => void;
  onSecondary?:    () => void;
  onCancel:       () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  secondaryLabel,
  cancelLabel  = "Cancel",
  destructive  = false,
  onConfirm,
  onSecondary,
  onCancel,
}: Props) {
  return (
    <>
      <div className="confirm-overlay" onClick={onCancel} />
      <div className="confirm-dialog soft-enter">
        <div className={`confirm-title${destructive ? " confirm-title--destructive" : ""}`}>
          {title}
        </div>
        <div className="confirm-body">{body}</div>
        <div className="confirm-actions">
          <button className="cmdino-action-btn cmdino-action-btn--ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button className="cmdino-action-btn cmdino-action-btn--danger" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
          <button
            className={`cmdino-action-btn${destructive ? " cmdino-action-btn--danger" : " cmdino-action-btn--primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
