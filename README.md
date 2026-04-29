# CMDino

> Run Claude, Codex, Gemini, Ollama, and custom AI coding agents inside one living desktop command center.

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-alpha-f59e0b">
  <img alt="Desktop" src="https://img.shields.io/badge/runtime-Tauri%20Desktop-24c8db">
  <img alt="Frontend" src="https://img.shields.io/badge/frontend-React%20%2B%20TypeScript-61dafb">
  <img alt="Terminal" src="https://img.shields.io/badge/terminal-xterm.js-111827">
  <img alt="PTY" src="https://img.shields.io/badge/backend-Rust%20PTY-10b981">
  <img alt="Storage" src="https://img.shields.io/badge/storage-local%20JSON-64748b">
  <img alt="Version" src="https://img.shields.io/badge/version-v0.5%20alpha-71717a">
</p>

---

## At a Glance

CMDino is a **local-first native desktop orchestration workspace** for developers running multiple AI CLI agents in parallel.

Instead of juggling disconnected terminal tabs, CMDino gives every AI agent:

- a persistent PTY-backed terminal session,
- a visual identity,
- manual and rapid handoff controls,
- workflow relationship tracking,
- preset role brains,
- and real-time lifecycle feedback.

This is **not** another chatbot wrapper.

This is a **multi-agent AI command center**.

---

## Preview

> Replace with latest captures / GIFs as the alpha evolves.

### Main Workspace
![CMDino Workspace](./docs/screenshots/workspace-main.png)

### Workflow View
![CMDino Workflow](./docs/screenshots/workflow-view.png)

### Deploy Agent
![CMDino Deploy Agent](./docs/screenshots/deploy-agent.png)

### Dino Terminal Lifecycle
![CMDino Dino Lifecycle](./docs/screenshots/dino-lifecycle.png)

---

## Why CMDino Exists

Modern AI coding workflows are no longer:

> one assistant, one chat, one prompt.

They are becoming:

- Claude planning architecture,
- Codex implementing patches,
- Gemini reviewing edge cases,
- Ollama handling local/offline tasks,
- plus custom project-specific shell workers.

The default experience today is chaos:

- too many loose terminals,
- no visible orchestration,
- context constantly lost,
- no structured handoff path,
- no fast understanding of who is working, blocked, idle, or done.

CMDino exists to solve that terminal fragmentation.

It keeps every AI CLI local, real, and independently runnable — while adding an orchestration layer around them.

---

## Core Capabilities

CMDino currently ships with:

- Native **Tauri desktop shell**
- Real **Rust PTY-backed terminal processes**
- **Claude / Codex / Gemini / Ollama / Custom** agent presets
- **Preset Brain Files** for role-specific startup context
- **Deploy Agent** modal for fast terminal provisioning
- Manual `.md` / `.txt` **attachment preview + send pipeline**
- Manual **Handoff Modal**
- **Auto Forward Lite** for rapid selected-output forwarding
- **Workflow graph visualization** with directional links and counts
- **Focus / Grid** responsive monitoring modes
- **Workspace save/load** via local `.cmdino.json`
- Built-in **Demo Workspace**
- **Dark / Light themes**
- Dino-based **terminal lifecycle intelligence**
- Left sidebar **native command shell UX**

---

## Feature Breakdown

| Area | Implementation |
|------|----------------|
| Desktop Runtime | Tauri v2 native desktop application |
| Native Process Layer | Rust + portable-pty |
| Terminal Rendering | xterm.js + fit addon |
| Agent Creation | Deploy Agent preset-first modal |
| Agent Presets | Claude Planner / Codex Builder / Gemini Reviewer / Ollama Worker / Custom |
| Preset Brains | Role-specific markdown brain attachments |
| Attachments | Add, preview, remove, explicit send |
| Manual Handoff | Capture → edit → send to running target PTY |
| Auto Forward Lite | Selected text or cleaned recent output forwarding |
| Workflow Map | Recorded directional handoff graph |
| Layout Modes | Focus mode / Grid mode / per-pane maximize |
| Persistence | Local JSON workspace schema |
| Settings | Theme, dino scale, font scale, animation speed |
| Dino Intelligence | Lifecycle + output-based animated state mapping |

---

## How CMDino Works

CMDino does **not** replace your AI CLIs.

It launches the same tools you already use manually:

- `claude`
- `codex`
- `gemini`
- `ollama run llama3`
- any custom shell command

Each deployed agent becomes:

- a named PTY session,
- a visible Dino Terminal,
- an addressable orchestration node,
- a persistent workspace participant.

You are still working with real local terminals.

CMDino adds:

> structure, visibility, and agent-to-agent flow.

---

## Architecture Overview

```mermaid
flowchart LR
    User[Developer] --> UI[React + TypeScript UI]
    UI --> Xterm[xterm.js Terminal Panes]
    UI --> State[Workspace + Agent State]
    UI --> Dino[Dino Lifecycle Runtime]

    Xterm --> Bridge[terminalBridge]
    Bridge --> Tauri[Tauri Invoke/Event Layer]
    Tauri --> Rust[Rust PTY Manager]
    Rust --> PTY[portable-pty Sessions]
    PTY --> CLI[Claude / Codex / Gemini / Ollama / Custom CLI]

    Rust -- terminal:data --> Tauri
    Tauri -- events --> Bridge
    Bridge --> Xterm
    Bridge --> Intelligence[Terminal Intelligence]

    Intelligence --> Dino
    State --> Workspace[Local .cmdino.json Files]

Runtime Flow
User deploys an AI agent preset or custom shell worker.
CMDino creates a PTY-backed terminal config.
Tauri invokes Rust PTY spawn.
The local CLI launches inside a real shell.
Output streams into xterm.js.
Terminal intelligence classifies activity.
Dino runtime reflects live terminal state.
Handoffs and forwards move work between agents.
Preset Agent System

CMDino ships with five deployable agent types:

Preset	Default Command	Role
Claude Planner	claude	Breaks requests into implementation plans
Codex Builder	codex	Implements scoped patches
Gemini Reviewer	gemini	Reviews architecture, QA, UX, regressions
Ollama Worker	ollama run llama3	Local/offline lightweight worker
Custom Agent	user-defined	Any shell process

Preset agents can include attached Brain Files:

claude-planner.md
codex-builder.md
gemini-reviewer.md
ollama-worker.md

These are visible BRAIN attachments — never silently injected.

The user previews and explicitly sends them when needed.

Handoff & Workflow System

CMDino currently favors human-controlled orchestration over blind autonomous automation.

Manual Handoff

Capture terminal output → optionally edit → send to another running agent.

Auto Forward Lite

Quickly forward:

selected output, or
recent cleaned AI response

to a linked or chosen target terminal.

Every successful transfer records a directional workflow edge.

This creates a persistent visual graph of:

who passed work to whom.

Dino Lifecycle Intelligence

The dinosaur layer is not cosmetic decoration.

It is a process visibility system.

Each agent terminal has:

a Dino identity,
an animation set,
and a state machine driven by runtime output.
Terminal Signal	Dino State
Dormant	Egg idle
Starting	Hatch
Normal output	Patrol
Heavy output burst	Dash
Review/scanning	Scan
Handoff event	Kick
Success	Jump
Fatal error	Hurt
Exited/Killed	Dead

This allows the user to scan the workspace before reading text logs.

Technology Stack
Layer	Technology
Desktop Shell	Tauri v2
Native Backend	Rust
PTY Engine	portable-pty
Frontend	React 18
Language	TypeScript
Build Tool	Vite
Terminal Renderer	xterm.js
Workflow Rendering	Custom SVG/HTML
Persistence	Local JSON workspace files
Settings	localStorage
Styling	Custom CSS shell UI
Installation
Prerequisites

Install:

Node.js 18+
npm
Rust stable
Tauri v2 prerequisites
AI CLI tools you want to orchestrate (claude, codex, gemini, ollama, etc.)

Windows users should also have:

WebView2 Runtime
Microsoft C++ Build Tools
Clone & Install
git clone <repo-url>
cd cmdino-build
npm install
Development
Frontend only
npm run dev
Full desktop PTY runtime
npm run tauri:dev
Production frontend build
npm run build
Desktop bundle build
npm run tauri:build
Workspace Usage

CMDino workspaces store:

agent labels
commands
dino identities
preset brain attachments
workflow links
layout order

Saved workspaces do not store live PTY state.

When loaded, agents return in a dormant configuration and can be started intentionally.

Repository Structure
.
├── src/
│   ├── components/        # UI panels, modals, panes, sidebar
│   ├── config/            # presets, brains, demo workspace, themes
│   ├── dino/              # sprite animation runtime
│   ├── domain/            # types and domain helpers
│   ├── orchestration/     # file preview / orchestration bridge
│   ├── state/             # React agent/settings hooks
│   ├── terminal/          # xterm lifecycle + PTY intelligence
│   └── workspace/         # workspace persistence bridge
│
├── src-tauri/
│   └── src/               # Rust PTY manager + Tauri commands
│
├── public/
│   └── preset-brains/     # default agent brain markdown files
│
├── docs/                  # architecture and product specs
└── .agents/               # external AI workflow role files
Current Roadmap
V0.5 Alpha (current)
PTY orchestration
agent presets
preset brains
handoff system
workflow graph
workspace persistence
V1 Alpha
onboarding polish
stronger logs/history
richer workflow editing
installer QA
safer file UX
V1.x+
reusable workflow templates
deeper agent configuration
improved local model support
stronger session intelligence
Contributing

CMDino is still in active alpha.

Architecture rule:

preserve the local-first PTY orchestration spine.

Please avoid broad rewrites, cloud assumptions, or provider SDK coupling unless explicitly aligned with roadmap goals.

Read:

docs/ARCHITECTURE_RULES.md

before major changes.

License

No license file has been published yet.

Until then, all code and assets should be considered all rights reserved.
