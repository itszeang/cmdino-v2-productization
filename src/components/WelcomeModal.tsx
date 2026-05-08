import { useState } from "react";
import type { HealthSnapshot } from "../domain/health";
import { WelcomeHealthSummary } from "./WelcomeHealthSummary";

const STEPS = [
  {
    num:   "01",
    title: "Check local CLIs",
    desc:  "Verify Claude, Codex, Gemini, or Ollama is installed and authenticated on this machine.",
  },
  {
    num:   "02",
    title: "Load a template",
    desc:  "Choose a multi-agent workspace layout that matches your workflow.",
  },
  {
    num:   "03",
    title: "Start and handoff",
    desc:  "Launch agents, attach context files, and route output between them.",
  },
];

interface Props {
  onDismiss:      (dontShowAgain: boolean) => void;
  onLoadDemo:     () => void;
  onDeployAgent:  () => void;
  onLoadTemplate: () => void;
  providerHealth: HealthSnapshot;
  onOpenHealth:   () => void;
}

export function WelcomeModal({
  onDismiss, onLoadDemo, onDeployAgent, onLoadTemplate,
  providerHealth, onOpenHealth,
}: Props) {
  const [dontShow, setDontShow] = useState(true);

  // CTA three-tier logic (custom excluded from AI provider count):
  //   ready AI CLI        → Deploy First Agent primary
  //   installed-only      → Load Template primary, Deploy secondary
  //   none / scan / error → Open Health primary
  const cliProviders  = Object.values(providerHealth.providers).filter(p => p.id !== "custom");
  const isScanning    = providerHealth.status === "scanning" || providerHealth.status === "idle";
  const hasScanError  = providerHealth.status === "error";
  const hasReady      = !isScanning && !hasScanError && cliProviders.some(p => p.status === "ready");
  const hasInstalled  = !isScanning && !hasScanError && cliProviders.some(p => p.status === "installed");
  const hasAnyUsable  = hasReady || hasInstalled;
  // Custom is usable but no CLI ready/installed → keep Deploy available as secondary
  const customUsable  = !hasAnyUsable
    && (providerHealth.providers.custom?.status === "ready"
      || providerHealth.providers.custom?.status === "installed");

  // Primary CTA tier
  const primaryTier: "deploy" | "template" | "health" =
    hasReady                     ? "deploy"   :
    hasInstalled || customUsable ? "template" :
    "health";

  return (
    <div className="cmd-modal-overlay" style={{ zIndex: 400 }}>
      <div className="cmd-modal-panel cmd-modal-panel--welcome soft-enter">

        {/* Header */}
        <div className="cmd-modal-header">
          <img
            src="/app-icon.png"
            alt=""
            aria-hidden="true"
            style={{ width: 28, height: 28, borderRadius: 8, display: "block", flexShrink: 0 }}
          />
          <div className="cmd-modal-title-group">
            <span className="cmd-modal-title">Set up CMDino</span>
            <span className="cmd-modal-subtitle">
              CMDino runs local CLI tools you install and authenticate on this machine.
            </span>
          </div>
        </div>

        {/* 3-step quickstart */}
        <div style={{
          display: "flex", flexShrink: 0,
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              style={{
                flex: 1, padding: "12px 14px 13px",
                borderRight: i < STEPS.length - 1 ? "1px solid var(--border-subtle)" : "none",
                display: "flex", flexDirection: "column", gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  color: "var(--text-faint)", fontSize: 15, fontWeight: 700,
                  letterSpacing: 1, fontVariantNumeric: "tabular-nums", flexShrink: 0,
                }}>
                  {s.num}
                </span>
                <span style={{ color: "var(--text-main)", fontSize: 11, fontWeight: 650, lineHeight: 1.3 }}>
                  {s.title}
                </span>
              </div>
              <p style={{
                color: "var(--text-muted)", fontSize: 10.5, lineHeight: 1.5,
                paddingLeft: 10, borderLeft: "1px solid var(--border-subtle)",
                margin: 0,
              }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Compact provider readiness summary */}
        <WelcomeHealthSummary snapshot={providerHealth} />

        {/* Footer — CTAs adapt to health state */}
        <div
          className="cmd-modal-footer"
          style={{ justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)" }}
        >
          <label style={{
            display: "flex", alignItems: "center", gap: 6,
            cursor: "pointer", userSelect: "none",
          }}>
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              style={{ accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Don't show again</span>
          </label>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="cmd-pill-btn cmd-pill-btn--ghost"
              style={{ fontSize: 11, padding: "7px 11px" }}
              onClick={() => onDismiss(dontShow)}
            >
              Start Empty
            </button>
            <button
              className="cmd-pill-btn"
              style={{ fontSize: 11, padding: "7px 13px", borderColor: "transparent" }}
              onClick={() => { onLoadDemo(); onDismiss(dontShow); }}
            >
              Load Demo
            </button>
            <button
              className="cmd-pill-btn"
              style={{ fontSize: 11, padding: "7px 13px", borderColor: "transparent" }}
              onClick={onLoadTemplate}
            >
              Load Template
            </button>

            {/* Secondary Deploy: shown when installed-only or custom-only (not yet primary) */}
            {primaryTier !== "deploy" && (hasInstalled || customUsable) && (
              <button
                className="cmd-pill-btn"
                style={{ fontSize: 11, padding: "7px 13px" }}
                onClick={() => { onDeployAgent(); onDismiss(dontShow); }}
              >
                Deploy First Agent
              </button>
            )}

            {/* Primary CTA — tier-driven */}
            {primaryTier === "deploy" && (
              <button
                className="cmd-pill-btn cmd-pill-btn--primary"
                onClick={() => { onDeployAgent(); onDismiss(dontShow); }}
              >
                Deploy First Agent
              </button>
            )}
            {primaryTier === "template" && (
              <button
                className="cmd-pill-btn cmd-pill-btn--primary"
                onClick={onLoadTemplate}
              >
                Load Template
              </button>
            )}
            {primaryTier === "health" && (
              <button
                className="cmd-pill-btn cmd-pill-btn--primary"
                onClick={onOpenHealth}
              >
                Open Health
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
