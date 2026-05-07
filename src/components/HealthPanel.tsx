import type { HealthSnapshot, ProviderHealth, HealthStatus } from "../domain/health";

interface Props {
  snapshot:  HealthSnapshot;
  onRefresh: () => void;
  onClose:   () => void;
}

const STATUS_LABEL: Record<HealthStatus, string> = {
  ready:         "Ready",
  missing:       "Missing",
  auth_required: "Auth needed",
  offline:       "Offline",
  error:         "Error",
  unknown:       "Not verified",
  installed:     "Installed",
};

// missing/error = red; auth/offline = amber; installed/unknown = neutral muted
const STATUS_COLOR: Record<HealthStatus, string> = {
  ready:         "var(--success)",
  missing:       "var(--danger)",
  auth_required: "var(--warning)",
  offline:       "var(--warning)",
  error:         "var(--danger)",
  unknown:       "var(--text-faint)",
  installed:     "var(--text-muted)",
};

function ProviderCard({ p }: { p: ProviderHealth }) {
  const color   = STATUS_COLOR[p.status];
  const label   = STATUS_LABEL[p.status];
  const neutral = p.status === "unknown" || p.status === "installed";

  return (
    <div className="health-card">
      <div className="health-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <span className="health-status-dot" style={{ background: color }} />
          <span className="health-card-name">{p.name}</span>
          {p.command && <span className="health-card-command">{p.command}</span>}
          {p.version && <span className="health-card-version">{p.version}</span>}
        </div>
        <span
          className="health-status-badge"
          style={{
            color,
            borderColor: neutral ? "var(--border-subtle)" : `${color}55`,
            opacity:     neutral ? 0.7 : 1,
          }}
        >
          {label}
        </span>
      </div>

      <p className="health-card-explanation" style={{ color: neutral ? "var(--text-faint)" : "var(--text-muted)" }}>
        {p.explanation}
      </p>

      {p.status !== "ready" && p.fixHint && (
        <p className="health-card-hint">{p.fixHint}</p>
      )}

      {p.durationMs !== undefined && p.durationMs > 0 && (
        <div className="health-card-meta">
          {p.durationMs}ms
          {p.details.authChecked    && <span> · auth checked</span>}
          {p.details.serviceChecked && <span> · service checked</span>}
        </div>
      )}
    </div>
  );
}

export function HealthPanel({ snapshot, onRefresh, onClose }: Props) {
  const isScanning = snapshot.status === "scanning";
  const providers  = Object.values(snapshot.providers);

  return (
    <div
      className="cmd-modal-overlay"
      style={{ zIndex: 350 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cmd-modal-panel cmd-modal-panel--wide soft-enter" onClick={(e) => e.stopPropagation()}>

        <div className="cmd-modal-header">
          <div className="cmd-modal-title-group">
            <span className="cmd-modal-title">System Health</span>
            <span className="cmd-modal-subtitle">
              CLI availability and authentication — scanned at startup.
            </span>
          </div>
          <button
            className="cmd-pill-btn"
            onClick={onRefresh}
            disabled={isScanning}
          >
            {isScanning ? "Scanning…" : "Refresh"}
          </button>
          <button className="cmd-icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {providers.map((p) => <ProviderCard key={p.id} p={p} />)}
        </div>

        <div className="cmd-modal-footer" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "var(--text-faint)" }}>
            {snapshot.status === "idle"     && "Not yet scanned."}
            {snapshot.status === "scanning" && "Scanning all providers…"}
            {snapshot.status === "ready"    && snapshot.completedAt
              && `Scanned ${new Date(snapshot.completedAt).toLocaleTimeString()}`}
            {snapshot.status === "error"    && `Scan error — ${snapshot.error ?? "unknown"}`}
          </span>
          <button className="cmd-pill-btn cmd-pill-btn--ghost" style={{ fontSize: 12 }} onClick={onClose}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
