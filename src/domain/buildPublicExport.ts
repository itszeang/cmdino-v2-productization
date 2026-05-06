import type { TerminalAgent } from "./terminalAgent";
import type { WorkflowLink } from "./workflow";
import type { SessionLogEvent } from "./sessionLog";
import type { GeneratedOutputFile } from "./attachments";

export interface BuildPublicExportInput {
  workspaceName:  string;
  agents:         TerminalAgent[];
  workflowLinks:  WorkflowLink[];
  sessionEntries: SessionLogEvent[];
  outputFiles:    GeneratedOutputFile[];
  generatedAt:    number;
}

export interface OutputFileInput {
  fileName: string;
  content:  string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts: number): string {
  return new Date(ts).toISOString().split("T")[0];
}

function fmtTs(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function agentSummary(agents: TerminalAgent[]): string {
  if (agents.length === 0) return "No agents currently configured.\n";
  return agents.map((a) => {
    const kind    = a.agentKind ?? "custom";
    const cwd     = a.cwd ? `\`${a.cwd}\`` : "(not set)";
    const atts    = a.attachments.length;
    const attNote = atts > 0 ? `, ${atts} attachment${atts !== 1 ? "s" : ""}` : "";
    return `- **${a.label}** (${kind})  cwd: ${cwd}${attNote}`;
  }).join("\n") + "\n";
}

function workflowSummary(links: WorkflowLink[], agents: TerminalAgent[]): string {
  if (links.length === 0) return "No workflow routes configured yet.\n";
  const labelMap = Object.fromEntries(agents.map((a) => [a.configId, a.label]));
  return links.map((l) => {
    const src   = labelMap[l.sourceConfigId] ?? l.sourceConfigId;
    const tgt   = labelMap[l.targetConfigId] ?? l.targetConfigId;
    const arrow = l.kind === "route" ? "→" : "↪";
    return `- ${src} ${arrow} ${tgt}  (${l.kind})`;
  }).join("\n") + "\n";
}

// Notable session actions — human-readable bullets, up to 6, derived deterministically
// from event type counts. No timestamps, no audit log dump.

const NOTABLE_PRIORITY: Array<[string, (n: number) => string]> = [
  ["workspace_loaded",  (n) => `Loaded workspace${n > 1 ? ` ${n} times` : ""}`],
  ["agent_created",     (n) => `Deployed ${n} agent${n !== 1 ? "s" : ""}`],
  ["terminal_start",    (n) => `Started ${n} terminal session${n !== 1 ? "s" : ""}`],
  ["preset_brain_send", (n) => `Sent preset context to terminal${n !== 1 ? "s" : ""}${n > 1 ? ` (×${n})` : ""}`],
  ["manual_handoff",    (n) => `Ran ${n} manual handoff${n !== 1 ? "s" : ""} between agents`],
  ["auto_forward",      (n) => `Auto-forwarded output ${n} time${n !== 1 ? "s" : ""}`],
  ["manual_send",       (n) => `Sent context directly to terminal${n > 1 ? ` (×${n})` : ""}`],
  ["workspace_saved",   (n) => `Saved workspace${n > 1 ? ` ${n} times` : ""}`],
  ["terminal_restart",  (n) => `Restarted terminals${n > 1 ? ` (×${n})` : ""}`],
  ["terminal_error",    (n) => `${n} terminal error${n !== 1 ? "s" : ""} — check logs`],
];

function notableActions(entries: SessionLogEvent[]): string {
  if (entries.length === 0) return "No session activity recorded yet.\n";
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.type] = (counts[e.type] ?? 0) + 1;
  }
  const bullets: string[] = [];
  for (const [type, fmt] of NOTABLE_PRIORITY) {
    if (counts[type] && bullets.length < 6) {
      bullets.push(`- ${fmt(counts[type])}`);
    }
  }
  if (bullets.length === 0) return "No notable session actions recorded yet.\n";
  return bullets.join("\n") + "\n";
}

// Compressed output count summary — "3 memory briefs, 2 transcripts"

function outputsSummary(files: GeneratedOutputFile[]): string {
  if (files.length === 0) return "No generated output files detected yet.\n";
  const counts: Record<string, number> = {};
  for (const f of files) {
    counts[f.kind] = (counts[f.kind] ?? 0) + 1;
  }
  const labels: Record<string, string> = {
    memory_brief: "memory brief",
    transcript:   "transcript",
    text:         "text file",
    markdown:     "markdown file",
  };
  return Object.entries(counts)
    .map(([k, n]) => `${n} ${labels[k] ?? k}${n !== 1 ? "s" : ""}`)
    .join(", ") + "\n";
}

// ── BUILD_UPDATE.md ───────────────────────────────────────────────────────────

function buildUpdateMd(input: BuildPublicExportInput): string {
  const { workspaceName, agents, workflowLinks, sessionEntries, outputFiles, generatedAt } = input;
  const date = fmtDate(generatedAt);

  return `# CMDino Build Update — ${date}

Generated: ${fmtTs(generatedAt)}
Workspace: ${workspaceName}

---

[WHAT YOU WORKED ON THIS WEEK — 1-2 sentences, then delete this line]

## Agents currently configured

${agentSummary(agents)}
## Workflow setup

${workflowSummary(workflowLinks, agents)}
## What's working

- Deploy AI CLI agents (claude, codex, gemini, ollama) as real local terminals
- Attach .md/.txt context files — preview and send into the live PTY
- Drag-and-drop file attachment on Tauri desktop
- Workspace save/load — full agent config as local JSON
- Workspace Templates — 5 pre-built multi-agent configurations
- Visual workflow canvas — handoff tracking and preferred route arrows
- Auto Forward Lite — pipe last clean output block to another agent
- Session event history with timeline view
- Memory Brief generation — workspace state exported as markdown
- Transcript export — buffered terminal output cleaned and saved
- Build-in-Public Export Kit
- Attachment panel with Generated/Uploaded/Preset Brains grouping
- Readiness guard — validates CLI tools before start

## Notable session actions

${notableActions(sessionEntries)}
## Generated outputs

${outputsSummary(outputFiles)}
## What's still rough

- Auto Forward captures raw terminal output — noisy CLIs may forward messy context; select text first
- Workflow builder is drag-and-drop only; no autonomous execution or scheduled triggers
- No cloud sync — workspaces are local JSON on this machine
- Some CLI TUIs may not render cleanly in xterm.js
- Main JS bundle above Vite's 500 kB warning threshold (build passes)
- No license or payment gate yet — alpha distribution only
- Installer reinstall flow should be re-tested before any public push

## Next steps

[WHAT YOU'RE WORKING ON NEXT — then delete this line]

---

*Generated locally by CMDino. Edit before sharing. No AI summarization.*
`;
}

// ── X_THREAD_DRAFT.md ─────────────────────────────────────────────────────────

function xThreadDraftMd(input: BuildPublicExportInput): string {
  const { workspaceName, agents, workflowLinks, generatedAt } = input;
  const date         = fmtDate(generatedAt);
  const agentCount   = agents.length;
  const agentLine    = agentCount > 0
    ? `${agentCount} agent${agentCount !== 1 ? "s" : ""} configured in "${workspaceName}".`
    : "No agents configured yet.";
  const workflowLine = workflowLinks.length > 0
    ? `${workflowLinks.length} workflow route${workflowLinks.length !== 1 ? "s" : ""} wired.`
    : "";

  return `# X Thread Draft — ${date}

Edit before posting. Delete placeholders. Drop or combine posts as needed.
No metrics, no launch claims.

---

**1/**
Building CMDino — a local desktop command center for running multiple AI CLI agents at the same time.

Real terminals, not a chatbot wrapper. claude, codex, gemini, ollama — or any CLI tool — each gets its own pane.

[attach hero video]

---

**2/**
Running several AI CLIs in parallel means a lot of copy-pasting between tabs and context getting lost mid-task.

CMDino keeps them in one window. Attach context files to each agent, forward output between them, see the handoff map on a canvas.

[attach workflow screenshot]

---

**3/**
This week: [ONE THING YOU ACTUALLY SHIPPED]

${agentLine}${workflowLine ? " " + workflowLine : ""}

Still alpha. Still rough in places. But it's the tool I'm using for my actual workflow now.

[attach feature screenshot]

---

**4/**
Things I've deliberately not built yet:

No cloud sync (workspaces are local JSON), no autonomous execution (you trigger every handoff), no AI behind the coordination (CMDino runs your tools, doesn't pick them).

Getting the local-first version right first.

---

**5/**
Two things I use every session: Memory Briefs and Transcript export.

Memory Briefs generate a markdown snapshot of your current workspace — agent config, recent actions, workflow state. Paste it into the next session to pick up where you left off.

Transcript export pulls the terminal buffer into a clean file. Both land in a local outputs folder and show up in the attachment panel right away.

---

**6/**
[HOW TO GET ACCESS / LINK / OR JUST "DM me"]

What does your multi-agent CLI setup look like right now?

---

*Delete all bracket placeholders before posting.*
`;
}

// ── RELEASE_NOTES_DRAFT.md ────────────────────────────────────────────────────

function releaseNotesDraftMd(input: BuildPublicExportInput): string {
  const { generatedAt } = input;
  const date = fmtDate(generatedAt);

  return `# CMDino Release Notes Draft

Version: [V1.X Alpha]
Date: ${date}

---

## Added

- [what shipped this cycle]
- [another addition]

## Changed

- [behavior or UX change]

## Fixed

- [only include verified fixes — remove section if none]

## Known Limitations

- Auto Forward captures raw terminal output — noisy CLIs may forward messy context
- Workflow builder is manual routing only; no autonomous execution
- No cloud sync — workspaces are local JSON files
- Some CLI TUIs may not render cleanly in xterm.js
- Main JS bundle exceeds Vite's 500 kB warning (build succeeds)
- No payment or license gate — alpha only
- Installer reinstall flow: re-test before public upload

## Testing Notes

- Build: \`npm run build\` [PASS/FAIL]
- Packaged app smoke test: [PASS/FAIL/SKIP]
- [what you tested this cycle]

---

*Fill in [brackets] before publishing.*
`;
}

// ── SCREENSHOT_CHECKLIST.md ───────────────────────────────────────────────────

function screenshotChecklistMd(input: BuildPublicExportInput): string {
  const { generatedAt } = input;
  const date = fmtDate(generatedAt);

  return `# CMDino Screenshot Checklist

Date: ${date}
For: [release notes / X thread / product page]

---

## Core Workspace

- [ ] Workspace main — agents deployed, terminals visible, dino lanes active
- [ ] Focus mode — single pane expanded, full terminal readable
- [ ] Grid mode — multiple panes side by side
- [ ] Workspace name in header, viewmode toggle visible

## Workflow Builder

- [ ] Workflow canvas — nodes placed, route arrows between agents
- [ ] Handoff or auto-forward in progress (if you have a recording)
- [ ] Workflow with 3+ agents and multiple links

## Onboarding

- [ ] Welcome modal — first launch state, all three CTA buttons visible
- [ ] Template picker — 5 template cards, agent kind pills
- [ ] Empty workspace state — before any agents deployed

## Attachment System

- [ ] Attachment panel open — Generated / Uploaded / Preset Brains sections visible
- [ ] Generated output file shown in Generated section after Memory Briefs
- [ ] Preset brain attached and previewed in panel
- [ ] Drag-and-drop file landing on a pane (if you have a recording)

## Agent Lifecycle

- [ ] Dino egg idle — dormant terminal, pre-start state
- [ ] Dino hatch animation frame — agent starting up
- [ ] Dino running — active patrol or processing state
- [ ] Readiness error panel — CLI not installed or not authenticated state

## Export Features

- [ ] Memory Briefs generated — success notice visible, files in outputs
- [ ] Transcript export — success notice visible, files in outputs
- [ ] Build Update Kit — success notice, 4 files in outputs
- [ ] Generated Outputs section in attachment panel showing all files

## Packaged App (if applicable)

- [ ] Installed app window with native chrome
- [ ] App launch from installed state — no terminal setup needed
- [ ] App icon on desktop/taskbar

---

*Delete rows that don't apply. Add rows for new features.*
`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function buildPublicExportKit(input: BuildPublicExportInput): OutputFileInput[] {
  return [
    { fileName: "BUILD_UPDATE.md",         content: buildUpdateMd(input) },
    { fileName: "X_THREAD_DRAFT.md",       content: xThreadDraftMd(input) },
    { fileName: "RELEASE_NOTES_DRAFT.md",  content: releaseNotesDraftMd(input) },
    { fileName: "SCREENSHOT_CHECKLIST.md", content: screenshotChecklistMd(input) },
  ];
}
