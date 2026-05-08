import type { HealthSnapshot, HealthStatus, HealthProviderId } from "../domain/health";

const PROVIDER_ORDER: HealthProviderId[] = ["claude", "codex", "gemini", "ollama", "custom"];

const STATUS_LABEL: Record<HealthStatus, string> = {
  ready:         "Ready",
  installed:     "Installed",
  auth_required: "Auth needed",
  offline:       "Offline",
  missing:       "Missing",
  unknown:       "Not verified",
  error:         "Check failed",
};

// Welcome-context colors: missing is amber (not red-heavy), per founder notes
const STATUS_COLOR: Record<HealthStatus, string> = {
  ready:         "#86efac",
  installed:     "var(--text-muted)",
  auth_required: "#fbbf24",
  offline:       "#fbbf24",
  missing:       "#fbbf24",
  unknown:       "var(--text-faint)",
  error:         "#fca5a5",
};

function buildSummaryLine(snapshot: HealthSnapshot): string {
  if (snapshot.status === "scanning") return "Scanning installed tools…";
  if (snapshot.status === "idle")     return "Health check not run yet.";
  if (snapshot.status === "error")    return "Health check needs attention. Open Health for details.";

  const cli       = Object.values(snapshot.providers).filter(p => p.id !== "custom");
  const ready     = cli.filter(p => p.status === "ready");
  const installed = cli.filter(p => p.status === "installed");
  const authNeeded = cli.filter(p => p.status === "auth_required");
  const offline   = cli.filter(p => p.status === "offline");
  const missing   = cli.filter(p => p.status === "missing");

  const usable = ready.length + installed.length;

  if (usable === 0) {
    return "No AI CLI providers are ready yet. Open Health to see install steps.";
  }

  const parts: string[] = [];
  if (ready.length > 0) {
    parts.push(`${ready.length} provider${ready.length !== 1 ? "s" : ""} ready`);
  }
  if (installed.length > 0) {
    parts.push(`${installed.length} installed`);
  }
  if (authNeeded.length > 0) {
    parts.push(`${authNeeded.map(p => p.name).join(", ")} needs login`);
  }
  if (offline.length > 0) {
    const n = offline.length;
    parts.push(`${offline.map(p => p.name).join(", ")} ${n !== 1 ? "are" : "is"} offline`);
  }
  if (missing.length > 0) {
    parts.push(`${missing.map(p => p.name).join(", ")} not installed`);
  }
  return parts.join(". ") + ".";
}

interface Props {
  snapshot: HealthSnapshot;
}

export function WelcomeHealthSummary({ snapshot }: Props) {
  const isScanning   = snapshot.status === "scanning" || snapshot.status === "idle";
  const summaryLine  = buildSummaryLine(snapshot);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Section label row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 14px 5px",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 0.7,
          color: "var(--text-faint)", textTransform: "uppercase",
        }}>
          Local CLI providers
        </span>
        {isScanning && (
          <span style={{ fontSize: 9, color: "var(--text-faint)" }}>Scanning…</span>
        )}
      </div>

      {/* One row per provider */}
      {PROVIDER_ORDER.map((id) => {
        const p = snapshot.providers[id];
        if (!p) return null;
        const color = STATUS_COLOR[p.status];
        const label = STATUS_LABEL[p.status];

        return (
          <div
            key={id}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 14px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: color, flexShrink: 0,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 550,
              color: "var(--text-main)",
              minWidth: 56, flexShrink: 0,
            }}>
              {p.name}
            </span>
            {p.command && (
              <span style={{
                fontSize: 10, color: "var(--text-faint)",
                fontFamily: "monospace", flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {p.command}
              </span>
            )}
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
              color,
              background: `${color}18`,
              border: `1px solid ${color}40`,
              padding: "1px 6px", borderRadius: 999,
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {label}
            </span>
          </div>
        );
      })}

      {/* Summary line */}
      <div style={{ padding: "6px 14px 8px" }}>
        <span style={{ fontSize: 10, color: "var(--text-faint)", lineHeight: 1.5 }}>
          {summaryLine}
        </span>
      </div>
    </div>
  );
}
