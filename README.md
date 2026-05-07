# CMDino

<p align="center">
  <strong>Local-first desktop command center for multi-agent AI CLI workflows.</strong>
</p>

<p align="center">
  Run Claude, Codex, Gemini, Ollama, and custom shell agents as real local terminals with a visual orchestration layer around them.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.0--alpha.1-f59e0b">
  <img alt="Runtime" src="https://img.shields.io/badge/runtime-Tauri%20v2-24c8db">
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-React%2018%20%2B%20TypeScript-61dafb">
  <img alt="Backend" src="https://img.shields.io/badge/backend-Rust%20PTY-10b981">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-0078d4">
  <img alt="Status" src="https://img.shields.io/badge/status-private%20alpha-111827">
</p>

---

CMDino is a native desktop workspace for developers running multiple AI CLI agents simultaneously. It spawns real local processes, renders each in a managed terminal pane, and adds the coordination layer that raw terminals lack: agent presets, brain files, manual handoff, auto-forwarding, workflow visualization, provider health checks, readiness validation, workspace persistence, and dino-based lifecycle feedback.

CMDino does not ship Claude, Codex, Gemini, or Ollama. It orchestrates CLI tools you install and authenticate on your own machine.

---

## What It Does

| Concern | How CMDino handles it |
|---|---|
| Multi-agent isolation | Each agent gets its own PTY, label, command, working directory, and dino identity |
| Context delivery | Attach `.md`/`.txt` files; preview before send; explicit user action required |
| Agent-to-agent handoff | Capture output, edit it, send to another running terminal, record a workflow link |
| Fast forwarding | Auto Forward sends the latest clean output block to a linked or selected target |
| Workflow visibility | Draggable graph shows route edges, handoff links, and lifecycle states |
| Provider readiness | Startup health scan checks CLI installation, version, and auth for each provider |
| Workspace continuity | Save/load full workspace configs as local `.cmdino.json` files |
| Session tracking | Event timeline records terminal lifecycle, handoffs, forwards, and workspace actions |

---

## Features

### Terminal Workspace

- **Focus / Grid view modes** — Switch between single focused pane and tiled grid. Tab bar shows all agents with status dots.
- **Up to 12 agents** — Each runs an independent PTY session.
- **Single chrome row** — Orchestration controls and pane management consolidated into one row (Context, Handoff, Forward, restart, logs, copy, focus, settings, close).
- **Readiness checks** — Validates working directory and executable availability before start, restart, or Start All. Blocks launch with a clear error when not ready.
- **Lifecycle states** — dormant, spawning, running, exited, killed, error — reflected on tab dots, dino states, and workflow nodes.

### Agent Presets

| Preset | Command | Role |
|---|---|---|
| Claude Planner | `claude` | Plans and scopes implementation |
| Codex Builder | `codex` | Implements scoped patches |
| Gemini Reviewer | `gemini` | Reviews architecture, risks, UX, and tests |
| Ollama Worker | `ollama run llama3` | Local / offline assistant |
| Custom Agent | User-defined | Any shell command or CLI tool |

Presets come with default brain files and dino identities. Label, command, cwd, kind, dino, and attachments are all editable after deploy.

### Provider Health System

Runs once at startup and on manual refresh. Probes each provider independently:

| Provider | Install | Version | Auth / Service |
|---|---|---|---|
| Claude | PATH lookup | `claude --version` | `claude auth status` exit code |
| Codex | PATH lookup | `codex --version` | `codex login status` exit code |
| Gemini | PATH lookup | `gemini --version` | Not verifiable without interactive call |
| Ollama | PATH lookup | `ollama --version` | Local HTTP GET `127.0.0.1:11434/api/version` |
| Custom | — | — | Always ready |

**Status semantics:**

| Status | Meaning |
|---|---|
| Ready | Installed, authenticated, service running |
| Installed | CLI found, auth cannot be safely verified automatically |
| Auth needed | CLI found, not authenticated |
| Offline | CLI found, local service not running (Ollama) |
| Missing | CLI not found on PATH |
| Error | Probe failed unexpectedly |

**Deploy behavior:** Missing disables the Deploy button. All other statuses allow deploy with an appropriate notice. Existing per-agent readiness (cwd + executable) remains authoritative at start time.

### Preset Brains

Markdown role files stored in `.agents/` (with `public/preset-brains/` fallback). Shown as attachments after deploy. Never sent silently — user previews and sends explicitly. Keeps context transfer intentional and auditable.

### Context Attachments

- Drop `.md` or `.txt` files onto a pane.
- Preview file contents before sending.
- Send file content into a live terminal.
- Remove attachments without affecting the running process.
- Generated output files appear as sendable attachments.

### Handoff and Auto Forward

**Manual Handoff:**
1. Capture selected text or recent terminal lines.
2. Edit in the handoff modal.
3. Send to another running agent.
4. Record a directional workflow link.

**Auto Forward Lite:**
One-click forward of the latest cleaned output block to a selected or route-linked target. Works best with line-oriented CLI output.

### Workflow Builder

Visual canvas showing all deployed agents as draggable nodes:

- Drag nodes to custom positions (positions persist across sessions).
- Route edges — user-authored preferred handoff paths.
- Handoff/forward links — recorded automatically from user actions.
- Lifecycle-aware node styles (running, spawning, error, dormant).
- Canvas grid depth and edge halos for spatial clarity.
- Reset Layout returns nodes to computed default positions.

### Workspace Templates

Pre-built multi-agent workspace configs loadable from the template picker. Sets up labels, commands, agent kinds, and brain attachments. User sets working directories after loading.

### Session History

Local event timeline with filter tabs (All, Terminals, Handoffs, Errors, Workspace). Records:

- Terminal start / restart / kill / exit / error / remove
- File send, preset brain send
- Manual handoff, auto-forward
- Workspace save / load
- Agent creation and update

Does not store full terminal transcripts. Use per-pane log/copy for full output.

### Export Tools

| Tool | Output |
|---|---|
| Memory Briefs | Markdown continuity files per agent with role, recent context, and workflow links |
| Transcript Export | Markdown files of buffered terminal output per agent |
| Build-in-Public Kit | Combined workspace summary, agent list, workflow, session events, and outputs |

All exports write to a local `outputs/` directory.

### Dino Lifecycle UX

Each pane owns a dino lane. The dino is an identity marker and process state indicator.

| Dino state | Meaning |
|---|---|
| Egg (idle) | Agent dormant, terminal not started |
| Egg (hatching) | Terminal spawning |
| Patrol / dash | Active output, processing |
| Scan | Review or analysis activity |
| Jump / kick | Success signal or handoff |
| Hurt / dead | Error, exit, or kill |

### Settings

- Dark / Light theme toggle
- Animation speed (0.6× – 1.6×)
- Dino scale (0.75× – 1.25×)
- Terminal font scale (0.85× – 1.25×)
- System Health quick-access
- Show onboarding briefing

---

## Tech Stack

| Layer | Stack |
|---|---|
| Desktop runtime | Tauri v2 |
| Frontend | React 18, TypeScript, Vite |
| Terminal renderer | xterm.js + fit addon |
| Native backend | Rust |
| PTY runtime | `portable-pty` |
| Health probing | Rust thread pool + `TcpStream` (no extra deps) |
| Persistence | Local `.cmdino.json` workspace files, `localStorage` settings and history |
| Assets | Dino sprite strips via `dinoManifest` + `SpriteAnimator` |

---

## Architecture Overview

```
Developer
  └─► React + TypeScript UI
        ├─► xterm.js Terminal Panes
        ├─► Workspace State (agents, links, positions)
        ├─► Workflow Graph (nodes, edges, routes)
        ├─► Provider Health State
        └─► Tauri Invoke Bridge
              └─► Rust Backend
                    ├─► portable-pty sessions (spawn / write / resize / kill)
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

- Session History logs events, not full terminal transcripts.
- Auto Forward can include prompt noise from raw TUI CLIs.
- Gemini authentication cannot be verified automatically — status shows "Installed."
- PATH in the Tauri process may differ from the user's shell PATH. The health panel shows detected commands in app context.
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
