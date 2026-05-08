import type { RuntimeErrorInfo } from "../domain/runtimeError";

const HEALTH_KINDS = new Set(["auth_required", "service_unavailable", "command_not_found"]);

interface Props {
  error:         RuntimeErrorInfo;
  onRetry:       () => void;
  onSettings:    () => void;
  onOpenHealth?: () => void;
  onDismiss:     () => void;
  /** true = compact strip above xterm; false = centered panel replacing dormant view */
  variant:       "strip" | "panel";
}

export function RuntimeErrorCard({ error, onRetry, onSettings, onOpenHealth, onDismiss, variant }: Props) {
  const showHealth = onOpenHealth && HEALTH_KINDS.has(error.kind);

  if (variant === "strip") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px",
        background: "var(--surface-2, rgba(255,255,255,0.04))",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0, minHeight: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 11, fontWeight: 650, color: "var(--text-muted)",
            marginRight: 6, whiteSpace: "nowrap",
          }}>
            {error.title}
          </span>
          <span style={{
            fontSize: 10, color: "var(--text-faint)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {error.message}
          </span>
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
          {showHealth && (
            <StripBtn onClick={onOpenHealth!} title="Open Health panel">Health</StripBtn>
          )}
          <StripBtn onClick={onSettings} title="Agent Settings">Settings</StripBtn>
          <StripBtn onClick={onRetry} accent title="Restart terminal">Retry</StripBtn>
          <button
            onClick={onDismiss}
            title="Dismiss"
            style={{
              background: "transparent", border: "none",
              color: "var(--text-faint)", fontSize: 14, lineHeight: 1,
              cursor: "pointer", padding: "2px 4px", borderRadius: 4,
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
          >×</button>
        </div>
      </div>
    );
  }

  // Panel variant — centered, replaces dormant view
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 4, padding: "20px 24px",
      background: "var(--surface-2, rgba(255,255,255,0.04))",
      borderRadius: 10, maxWidth: 340,
      border: "1px solid var(--border-subtle)",
      position: "relative",
    }}>
      <button
        onClick={onDismiss}
        title="Dismiss"
        style={{
          position: "absolute", top: 8, right: 8,
          background: "transparent", border: "none",
          color: "var(--text-faint)", fontSize: 16, lineHeight: 1,
          cursor: "pointer", padding: "2px 5px", borderRadius: 4,
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
      >×</button>

      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", textAlign: "center" }}>
        {error.title}
      </span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
        {error.message}
      </span>
      <span style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center", marginBottom: 8 }}>
        {error.nextAction}
      </span>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {showHealth && (
          <PanelBtn onClick={onOpenHealth!}>Health</PanelBtn>
        )}
        <PanelBtn onClick={onSettings}>Settings</PanelBtn>
        <PanelBtn onClick={onRetry} accent>Retry</PanelBtn>
      </div>
    </div>
  );
}

function StripBtn({
  onClick, title, accent = false, children,
}: { onClick: () => void; title?: string; accent?: boolean; children: React.ReactNode }) {
  const base  = accent ? "var(--accent)" : "var(--text-muted)";
  const bdBase = accent ? "var(--border-strong)" : "var(--border-subtle)";
  return (
    <button
      onClick={onClick} title={title}
      style={{
        background: accent ? "var(--button-bg)" : "transparent",
        border: `1px solid ${bdBase}`,
        color: base,
        fontSize: 10, padding: "3px 8px", borderRadius: 999,
        fontFamily: "inherit", fontWeight: 600,
        cursor: "pointer", whiteSpace: "nowrap",
        transition: "background 0.1s, color 0.1s",
      }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "var(--button-hover)";
        b.style.color = "var(--text-main)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = accent ? "var(--button-bg)" : "transparent";
        b.style.color = base;
      }}
    >{children}</button>
  );
}

function PanelBtn({
  onClick, accent = false, children,
}: { onClick: () => void; accent?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: accent ? "var(--accent)" : "var(--button-bg)",
        border: `1px solid ${accent ? "transparent" : "var(--border-subtle)"}`,
        color: accent ? "var(--app-bg)" : "var(--text-muted)",
        fontSize: 11, padding: "6px 14px", borderRadius: 999,
        fontFamily: "inherit", fontWeight: 650,
        cursor: "pointer", whiteSpace: "nowrap",
        transition: "opacity 0.12s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.82"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
    >{children}</button>
  );
}
