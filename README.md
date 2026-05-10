# CMDino

<p align="center">
  <strong>Local-first desktop command center for multi-agent AI CLI workflows.</strong>
</p>

<p align="center">
  Run Claude, Codex, Gemini, Ollama, and custom shell agents as real local terminals —<br>
  with a visual workspace for context, handoff, artifact reading, and review.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0--alpha.1-f59e0b">
  <img alt="Runtime" src="https://img.shields.io/badge/runtime-Tauri%20v2-24c8db">
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-React%2018%20%2B%20TypeScript-61dafb">
  <img alt="Backend" src="https://img.shields.io/badge/backend-Rust%20PTY-10b981">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-0078d4">
  <img alt="Status" src="https://img.shields.io/badge/status-closed%20alpha-111827">
</p>

---

CMDino is a local-first desktop workspace for developers running multiple AI CLI agents simultaneously. It spawns real local processes, renders each in a managed terminal pane, and adds the coordination layer that raw terminals lack: agent presets, context files, guided context flow, manual handoff, auto-forwarding, workflow visualization, provider health checks, readiness validation, workspace persistence, and lifecycle feedback — all inside a dark hacker-style desktop shell.

CMDino does not ship Claude, Codex, Gemini, or Ollama. It orchestrates CLI tools you install and authenticate on your own machine.

This is an alpha build: local-first, Windows-focused, no cloud sync, no accounts, no payment.

---

## What It Does

| Concern | How CMDino handles it |
|---|---|
| Multi-agent isolation | Each agent gets its own PTY, label, command, working directory, and dino identity |
| Guided context delivery | Tabbed context picker — Output Shelf, Starter Context, Local File, Added Context |
| File picker | Native file dialog filters to `.md` / `.txt`; manual path paste as fallback |
| Agent-to-agent handoff | Capture output, edit it, send to another running terminal, record a workflow link |
| Fast forwarding | Send Latest pushes the latest clean output block to a linked or selected target |
| Artifact reading | Full-screen Artifact Reader modal for comfortably reading long markdown outputs |
| Workflow visibility | Draggable Agent Map shows route edges, handoff links, and lifecycle states |
| Provider readiness | Startup health scan checks CLI install, version, and auth for each provider |
| Workspace continuity | Save/load full workspace configs as local `.cmdino.json` files |
| Session tracking | Activity log records terminal lifecycle, handoffs, forwards, and workspace actions |

---

## Dashboards & Panels

### Agent Workspace (main view)

The primary workspace shows terminal panes in **Grid** or **Focus** mode. Up to 12 agents run simultaneously, each in an isolated PTY. A tab bar at the top shows all agents with live status dots.

The single chrome row per pane shows:
- **Add Context** / **Add Context (N)** — open the tabbed context picker
- **Review & Send** — capture output, edit, and send to another agent
- **Send Latest** / target selector — one-click forward of last clean output block
- Status dot, copy output, view session logs, restart, focus/grid toggle, agent settings, close

### Agent Map (Workflow Panel)

Visual canvas with all deployed agents as draggable nodes. Shows:
- Route edges (user-authored preferred handoff paths)
- Handoff/forward links (recorded automatically from user actions)
- Lifecycle-aware node styles (running, spawning, error, dormant)
- Dino avatar per node
- Drag nodes to custom positions (persisted)
- Route creation mode: click "Route" on source node, then click target
- Reset Layout button

### Add Context Panel (per agent)

Tabbed context picker inside each pane — replaces the old attachment manager:

| Tab | Purpose |
|---|---|
| **Output Shelf** | Generated files from your previous work (Memory Briefs, Terminal Logs, Share Files) |
| **Starter Context** | Role instructions and reusable agent brains (Claude Planner, Codex Builder, etc.) |
| **Local File** | Add your own `.md` or `.txt` file — native file picker or manual path |
| **Added Context** | All files currently attached to this agent |

Selected file shows: artifact type, source, attached state, purpose hint, and terminal state copy ("Add to Agent keeps this here — not sent yet" / "Send Into Agent will paste into terminal" / "Start this agent before sending").

Actions per selected file: **Add to Agent**, **Send Into Agent** (disabled until attached), **Remove from Agent**, **Copy File Path**, **Open Reader**.

### Output Shelf (Drawer)

Slide-out panel for all generated output files:

- **Continue Later** group — Memory Briefs
- **Terminal Logs** group — raw terminal transcripts
- **Share Progress** group — build-in-public kit files
- **Other Notes** group — markdown and text outputs

Per file: readable type label, filename, relative time, size, attached state, owner agents. Selected file shows action bar: **Add to Agent**, **Copy Text**, **Copy File Path**, **Open Reader**, **Delete** (with confirmation).

### Artifact Reader Modal

Full-screen modal for reading generated/preset/local markdown comfortably:

- Opens over the app without resizing terminal panes
- Max width 1000px, max height 83vh
- Header: artifact title, type + source + attached status pills, file path
- Sticky action bar: all relevant actions (Add to Agent, Send Into Agent, Remove, Copy Text/Path)
- Content scrolls independently — comfortable reading width (max 760px centered)
- Inline `MarkdownArtifactReader`: headings, bullets, fenced code blocks, horizontal rules, paragraphs — no HTML rendering, no markdown dependency
- Terminal logs use full monospace; memory briefs and notes use document style

### Setup Check (Health Panel)

Startup health scan + manual refresh for provider readiness:

| Provider | Install | Version | Auth / Service |
|---|---|---|---|
| Claude | PATH lookup | `claude --version` | `claude auth status` exit code |
| Codex | PATH lookup | `codex --version` | `codex login status` exit code |
| Gemini | PATH lookup | `gemini --version` | Not verifiable without interactive call |
| Ollama | PATH lookup | `ollama --version` | Local HTTP GET `127.0.0.1:11434/api/version` |
| Custom | — | — | Always ready |

Status colors: Ready (green), Warning (yellow), Error (red) aggregated in sidebar dot.

### Activity Log (History)

Local event timeline with filter tabs (All, Terminals, Handoffs, Errors, Workspace). Records terminal start/restart/kill/exit/error/remove, file send, preset brain send, manual handoff, auto-forward, workspace save/load, agent creation/update.

### Workspace Manager (Fix & Manage section)

- **New Workspace** — clear panes and start fresh
- **Save Workspace** — write current config to `.cmdino.json`
- **Open Workspace** — selector + Open/Delete per saved file

### Settings Panel

- Dark / Light theme toggle
- Animation speed (0.6× – 1.6×)
- Dino scale (0.75× – 1.25×)
- Terminal font scale (0.85× – 1.25×)
- System health quick-access

---

## Sidebar Navigation

```
CMDino
│
├─ Start
│   ├─ Try Demo Setup
│   └─ (Add Agent — top CTA button)
│
├─ Work
│   ├─ Agent Map
│   ├─ Activity
│   └─ Start Agents
│
├─ Outputs
│   ├─ Output Shelf
│   ├─ Share Progress
│   ├─ Save Memory Brief
│   └─ Export Logs
│
└─ Fix & Manage
    ├─ Setup Check
    ├─ New Workspace
    ├─ Save Workspace
    ├─ Open Workspace (selector)
    └─ Settings
```

---

## Agent Presets

| Preset | Command | Role |
|---|---|---|
| Claude Planner | `claude` | Plans and scopes implementation |
| Codex Builder | `codex` | Implements scoped patches |
| Gemini Reviewer | `gemini` | Reviews architecture, risks, UX, tests |
| Ollama Worker | `ollama run llama3` | Local / offline assistant |
| Custom Agent | User-defined | Any shell command or CLI tool |

Presets come with default brain files and dino identities. Label, command, cwd, kind, dino, and attachments are all editable after deploy.

---

## Output Types

| Type | Group | Purpose |
|---|---|---|
| Memory Brief | Continue Later | Resume context in a future session or share with another agent |
| Terminal Log | Terminal Logs | Raw terminal output from a session |
| Share Progress | Share Progress | Combined workspace summary, agent list, workflow, session events |
| Note / Markdown | Other Notes | Generated markdown output |

All outputs are written to a local `outputs/` directory. Deletable with confirmation from Output Shelf or per-file in the drawer.

---

## Tech Stack

| Layer | Stack |
|---|---|
| Desktop runtime | Tauri v2 |
| Frontend | React 18, TypeScript, Vite |
| Terminal renderer | xterm.js + fit addon |
| Native backend | Rust |
| PTY runtime | `portable-pty` |
| File dialog | `tauri-plugin-dialog` (`.md` / `.txt` picker) |
| Health probing | Rust thread pool + `TcpStream` (no extra deps) |
| Persistence | Local `.cmdino.json` workspace files, `localStorage` settings and history |
| Markdown renderer | Custom inline renderer — no dependency, no HTML rendering |
| Assets | Dino sprite strips via `dinoManifest` + `SpriteAnimator` |

---

## Architecture Overview

```
Developer
  └─► React + TypeScript UI
        ├─► xterm.js Terminal Panes
        ├─► Workspace State (agents, links, positions)
        ├─► Tabbed Context Picker (per agent)
        ├─► Artifact Reader Modal
        ├─► Workflow Agent Map (nodes, edges, routes)
        ├─► Output Shelf Drawer
        ├─► Provider Health State
        └─► Tauri Invoke Bridge
              └─► Rust Backend
                    ├─► portable-pty sessions (spawn / write / resize / kill)
                    ├─► tauri-plugin-dialog (native file picker)
                    ├─► Readiness probes (PATH, directory)
                    ├─► Health probes (version, auth, TCP service)
                    └─► File system (workspace files, output files, preset brains)
```

**Architecture rules:**
- Dino runtime never spawns terminals.
- PTY runtime state is separate from persisted workspace config.
- Workspaces store configuration only — no live sessions, secrets, or scrollback.
- Rust owns all native capabilities; product UX stays in the frontend.
- Health probes run direct executable + args only — no shell interpolation, no installs, no logins.
- Context files are never sent automatically — user must explicitly choose Send Into Agent.

---

## Development Setup

Prerequisites:

- Node.js 18+
- Rust stable
- Tauri v2 CLI
- WebView2 Runtime (Windows)
- Microsoft C++ Build Tools (Windows)
- AI CLIs to test with: `claude`, `codex`, `gemini`, `ollama`

Install:

```powershell
npm install
```

Run desktop app (dev mode):

```powershell
npm run tauri:dev
```

Frontend-only preview (no PTY, no health probes):

```powershell
npm run dev
```

Frontend production build only:

```powershell
npm run build
```

Full desktop production build:

```powershell
npm run tauri:build
```

Windows build outputs:

```
src-tauri/target/release/cmdino.exe
src-tauri/target/release/bundle/nsis/CMDino_0.1.0_x64-setup.exe
src-tauri/target/release/bundle/msi/CMDino_0.1.0_x64_en-US.msi
```

Packaging must bundle:
- `.agents/**/*`
- `public/preset-brains/**/*`

---

## Known Limitations

- Session Activity logs events, not full terminal transcripts. Use per-pane log/copy for full output.
- Send Latest can include prompt noise from raw TUI CLIs.
- Gemini authentication cannot be verified automatically — status shows "Installed."
- PATH in the Tauri process may differ from the user's shell PATH. Setup Check shows detected commands in app context.
- No cloud sync, accounts, collaboration, public access, or payment gate.
- Windows-first. macOS and Linux may work but are not tested.

---

## Roadmap

- Stronger terminal output cleaning for handoff/forward.
- Workflow execution scheduling (not just visualization).
- Richer session memory beyond event timeline.
- Auth status improvements as CLIs expose stable status commands.
- macOS and Linux builds.
- Release/licensing path.

---

## License

No license published. All rights reserved until a license is added. Treat as private.
