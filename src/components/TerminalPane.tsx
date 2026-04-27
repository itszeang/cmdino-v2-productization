import { useCallback, useEffect, useRef, useState } from "react";
import { DinoLane } from "../dino/DinoLane";
import type { TerminalAgent } from "../domain/terminalAgent";
import {
  type DinoState,
  type SimTrigger,
  triggerToState,
} from "../terminal/dinoStateMachine";

const SIM_BUTTONS: { label: string; trigger: SimTrigger; color: string; symbol: string }[] = [
  { label: "RUNNING",  trigger: "running",  color: "#00c8ff", symbol: "▶" },
  { label: "THINKING", trigger: "thinking", color: "#a855f7", symbol: "◈" },
  { label: "SUCCESS",  trigger: "success",  color: "#22c55e", symbol: "✓" },
  { label: "ERROR",    trigger: "error",    color: "#f87171", symbol: "✗" },
  { label: "DEAD",     trigger: "dead",     color: "#6b7280", symbol: "■" },
];

const DOT_COLOR: Record<string, string> = {
  running:  "#00c8ff",
  thinking: "#a855f7",
  success:  "#22c55e",
  error:    "#f87171",
  dead:     "#6b7280",
  idle:     "#1e3a4a",
};

// Multi-line log groups per trigger — appended together on each press
const SIM_LOG_GROUPS: Record<SimTrigger, string[][]> = {
  running: [
    [
      "$ npm run build",
      "  vite v5.4.21 building for production...",
      "  transforming... ✓ 40 modules",
      "  dist/assets/index.js   151kb │ gzip: 49kb",
    ],
    [
      "$ cargo build --release",
      "   Compiling cmdino v0.0.1 (C:\\project\\src-tauri)",
      "   Compiling tauri v2.10.3",
      "   Finished `release` in 3.47s",
    ],
    [
      "$ git add . && git commit -m 'feat: update state machine'",
      "  [main 4a8b2c1] feat: update state machine",
      "  3 files changed, 47 insertions(+), 12 deletions(-)",
    ],
    [
      "$ npm install",
      "  added 71 packages in 8s",
      "  9 packages are looking for funding",
    ],
    [
      "$ python agent.py --task refactor",
      "  Loading model context...",
      "  Running task: refactor",
      "  Writing output to /tmp/agent_out.py",
    ],
  ],
  thinking: [
    [
      "[agent] Reading task context...",
      "[agent] Scanning 14 source files",
      "[agent] Found 3 relevant modules",
      "[agent] Synthesizing plan...",
    ],
    [
      "[llm] Tokens used: 3,842 / 8,192",
      "[llm] Context: 46% full",
      "[llm] Generating response...",
      "[llm] Streaming output...",
    ],
    [
      "[search] Querying codebase for 'dinoStateMachine'",
      "[search] 12 matches in 4 files",
      "[search] Ranking by relevance...",
      "[search] Top result: src/terminal/dinoStateMachine.ts:14",
    ],
    [
      "[claude] Analyzing diff...",
      "[claude] Lines changed: +82 -34",
      "[claude] Checking for regressions...",
      "[claude] No breaking changes detected.",
    ],
  ],
  success: [
    [
      "✓ Build completed in 2.4s",
      "✓ 0 errors   0 warnings",
      "✓ Output written to dist/",
      "✓ Ready.",
    ],
    [
      "✓ All 47 tests passed",
      "✓ Coverage: 94.3%",
      "✓ No regressions found",
      "✓ Task complete.",
    ],
    [
      "✓ Commit pushed to origin/main",
      "✓ CI triggered (run #1047)",
      "✓ PR #38 auto-updated",
    ],
    [
      "✓ Agent task finished",
      "✓ Output saved to /outputs/result.md",
      "✓ Awaiting next instruction.",
    ],
  ],
  error: [
    [
      "✗ ERROR: Build failed",
      "  Error: Cannot find module './config'",
      "    at Object.<anonymous> (src/App.tsx:14:1)",
      "  Process exited with code 1",
    ],
    [
      "✗ Test failed: 3 / 47",
      "  AssertionError: expected 'patrol_running' to equal 'idle_center'",
      "    at src/dino/DinoLane.test.ts:82",
      "  Process exited with code 1",
    ],
    [
      "✗ Runtime error",
      "  TypeError: Cannot read properties of undefined (reading 'frames')",
      "    at SpriteAnimator (src/dino/SpriteAnimator.tsx:32)",
      "  Traceback ended",
    ],
    [
      "✗ cargo build failed",
      "  error[E0308]: mismatched types",
      "  --> src-tauri/src/lib.rs:14:5",
      "  aborting due to previous error",
    ],
  ],
  dead: [
    [
      "^C",
      "Interrupt received.",
      "Process terminated.",
      "Session closed.",
    ],
  ],
};

interface Props {
  agent: TerminalAgent;
}

export function TerminalPane({ agent }: Props) {
  const [dinoState, setDinoState] = useState<DinoState>("idle_center");
  const [logs, setLogs] = useState<string[]>([
    `> Session started — ${agent.label}`,
    `> Dino assigned: ${agent.dinoId}`,
    `> Awaiting task...`,
  ]);
  const [activeTrigger, setActiveTrigger] = useState<SimTrigger | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const trigger = useCallback((t: SimTrigger) => {
    setActiveTrigger(t);
    setDinoState(triggerToState(t));
    const groups = SIM_LOG_GROUPS[t];
    const group = groups[Math.floor(Math.random() * groups.length)];
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [
      ...prev.slice(-200),
      ``,
      `[${ts}]`,
      ...group,
    ]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const dotColor = activeTrigger ? DOT_COLOR[activeTrigger] : DOT_COLOR.idle;
  const dotPulse = activeTrigger === "running" || activeTrigger === "thinking";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#0b0f14",
        border: "1px solid #0e2233",
        borderRadius: 6,
        overflow: "hidden",
        height: "100%",
        boxShadow: "0 0 32px rgba(0,200,255,0.05)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          background: "#0d1520",
          borderBottom: "1px solid #0e2233",
          flexShrink: 0,
        }}
      >
        {/* Status dot */}
        <div
          className={dotPulse ? "status-dot-pulse" : undefined}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
            boxShadow: activeTrigger && activeTrigger !== "dead"
              ? `0 0 8px ${dotColor}, 0 0 16px ${dotColor}40`
              : "none",
            transition: "background 0.25s, box-shadow 0.25s",
            flexShrink: 0,
          }}
        />
        <span style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>
          {agent.label}
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: "#233344",
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          {activeTrigger
            ? SIM_BUTTONS.find(b => b.trigger === activeTrigger)?.label ?? "IDLE"
            : "IDLE"}
        </span>
      </div>

      {/* Log area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 14px",
          lineHeight: 1.75,
          fontSize: 11.5,
          color: "#556677",
          background: "#070b0e",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {logs.map((line, i) =>
          line === "" ? (
            <div key={i} style={{ height: 6 }} />
          ) : (
            <div
              key={i}
              style={{
                color:
                  line.startsWith("✗") || line.includes("ERROR") || line.includes("error") || line.includes("failed") || line.includes("exited with")
                    ? "#f87171"
                    : line.startsWith("✓")
                    ? "#4ade80"
                    : line.startsWith("^C") || line.includes("terminated") || line.includes("Session closed")
                    ? "#6b7280"
                    : line.startsWith("[llm]") || line.startsWith("[claude]")
                    ? "#a78bfa"
                    : line.startsWith("[agent]") || line.startsWith("[search]")
                    ? "#67e8f9"
                    : line.startsWith("$")
                    ? "#e2e8f0"
                    : line.startsWith("[")
                    ? "#7dd3fc"
                    : line.startsWith(">")
                    ? "#334455"
                    : "#556677",
                fontFamily: "inherit",
              }}
            >
              {line}
            </div>
          )
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Dino Lane */}
      <DinoLane dinoId={agent.dinoId} state={dinoState} />

      {/* Simulation controls */}
      <div
        style={{
          display: "flex",
          gap: 5,
          padding: "8px 10px",
          background: "#0a0f16",
          borderTop: "1px solid #0e2233",
          flexShrink: 0,
        }}
      >
        {SIM_BUTTONS.map(({ label, trigger: t, color, symbol }) => {
          const active = activeTrigger === t;
          return (
            <button
              key={t}
              onClick={() => trigger(t)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "5px 4px",
                background: active ? `${color}14` : "transparent",
                border: "none",
                borderTop: `2px solid ${active ? color : "#0e2233"}`,
                color: active ? color : "#2a3a4a",
                fontSize: 10,
                fontFamily: "inherit",
                fontWeight: 700,
                letterSpacing: 1,
                cursor: "pointer",
                transition: "color 0.12s, border-color 0.12s, background 0.12s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.color = color;
                el.style.borderTopColor = color;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.color = active ? color : "#2a3a4a";
                el.style.borderTopColor = active ? color : "#0e2233";
              }}
            >
              <span style={{ fontSize: 9, opacity: active ? 1 : 0.5 }}>{symbol}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
