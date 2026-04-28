# CMDino — Architecture Rules
Version: 1.0
Status: Binding Engineering Guide

---

## 1. Purpose

This document defines how CMDino code should stay organized as the product grows.

All AI agents and human contributors must follow these rules.

CMDino must remain modular, local-first, and easy to extend.

---

## 2. Current Product Direction

CMDino is a desktop command center for multi-agent CLI workflows.

It is built around:

- real local terminal processes
- dinosaur-based process state visualization
- dynamic Dino Terminal creation
- local workspace configuration
- manual orchestration before automation

CMDino is not currently:

- a cloud SaaS backend
- an IDE replacement
- an autonomous AI workflow engine
- a billing platform
- a team collaboration product

---

## 3. Main Architecture Layers

### 3.1 Domain Layer

Path:

```text
src/domain/

Purpose:

product-level types
TerminalAgent models
workspace config models
business concepts

Allowed:

TypeScript types
pure helper functions
schema definitions

Not allowed:

React components
Tauri invoke calls
DOM logic
xterm logic
3.2 Config Layer

Path:

src/config/

Purpose:

static product configuration
dino manifest
state-to-animation mapping
agent presets
dino options

Allowed:

constants
manifests
preset maps

Not allowed:

runtime state
filesystem operations
terminal process logic
3.3 Dino Runtime Layer

Path:

src/dino/

Purpose:

sprite loading
sprite rendering
DinoLane movement
animation runtime

Allowed:

SpriteAnimator
DinoLane
asset loading helpers
frame calculation

Not allowed:

terminal spawning
workflow logic
workspace persistence
skill attachment logic
3.4 Terminal Runtime Layer

Path:

src/terminal/

Purpose:

xterm lifecycle
PTY frontend bridge
terminal stdout parsing
terminal-to-dino state transitions

Allowed:

useTerminalProcess
terminalBridge
stdoutVibeParser
dinoStateMachine

Not allowed:

React layout components except hooks
workspace save/load
workflow canvas logic
skill file management
3.5 UI Components Layer

Path:

src/components/

Purpose:

visual components
modals
grids
panes
controls

Allowed:

React components
component-specific UI state
callbacks passed from App/state hooks

Not allowed:

direct Rust/Tauri process management unless delegated through hooks/services
direct file persistence
duplicated domain types
3.6 State Layer

Path:

src/state/

Purpose:

local React state hooks
terminal list state
workspace state
UI-level state orchestration

Allowed:

useTerminalAgents
useWorkspaceConfig
temporary runtime state

Not allowed:

low-level terminal process spawning
sprite rendering
direct canvas drawing
3.7 Tauri Backend Layer

Path:

src-tauri/src/

Purpose:

PTY management
OS shell process control
filesystem access
secure native commands

Allowed:

Rust Tauri commands
PTY session maps
file read/write commands
process lifecycle cleanup

Not allowed:

product UX logic
frontend state decisions
dino animation logic
4. Critical Separation Rules
Rule 1 — Terminal runtime and Dino runtime must stay separate

Terminal output may trigger Dino state changes.

But Dino components must never spawn terminals or call Tauri commands.

Correct flow:

PTY output → stdout parser → dino state machine → DinoLane

Wrong flow:

DinoLane → terminalBridge
Rule 2 — Runtime state and persisted config must stay separate

A saved workspace should store:

terminal label
agent type
launch command
working directory
dino identity
pane order
workflow graph later

It should not store:

live process handle
xterm instance
scrollback buffer
temporary Dino x-position
active PTY session state
Rule 3 — Backend only manages native capabilities

Rust/Tauri backend should handle:

PTY spawn/write/resize/kill
filesystem read/write
native dialogs if needed

Rust should not decide:

which dino is selected
what UI layout is used
how workflows look
what animation means
Rule 4 — No feature should bypass the existing bridge

Terminal input/output must go through:

useTerminalProcess → terminalBridge → Tauri command

Do not add direct invoke calls inside random components.

Rule 5 — Prefer patching over rebuilding

CMDino already has a working spine.

Future agents should patch existing modules unless a rewrite is explicitly approved.

5. Naming Rules
Dino IDs

Format:

gender-character

Examples:

female-cole
male-kira
Terminal Agent IDs

Use generated stable IDs:

agent-{uuid}

or fallback:

agent-{timestamp}
Component Names

Use product nouns:

TerminalPane
TerminalGrid
DinoLane
SpriteAnimator
AgentCreationModal

Avoid vague names:

Box
Panel
Thing
ManagerView
State Names

Use existing DinoState names from the asset spec:

idle_center
patrol_running
heavy_processing
review_scan
success_signal
terminal_error
terminal_dead

Do not invent casual state names like:

happy
sad
busy
sleepy

unless formally added to the spec.

6. Version Scope Rules
V0.3

Allowed:

remove terminal
kill PTY
restart terminal
clear terminal
copy terminal output
lifecycle safety

Not allowed:

persistence
workflow canvas
skills
handoff automation
V0.4

Allowed:

local JSON workspace save/load
config schema
recent workspaces
stopped restored terminals
editable terminal config

Not allowed:

cloud sync
SQLite
terminal output persistence
automatic process resurrection
V0.5

Allowed:

skill.md attachment
attachment preview
manual send-to-terminal
output capture
manual handoff
visual workflow canvas

Not allowed:

autonomous workflows
marketplace
built-in LLM provider logic
scheduled handoffs
V1

Allowed:

alpha polish
installers
onboarding
error handling
settings
README
QA pass

Not allowed:

billing
teams
cloud sync
plugin marketplace
autonomous orchestration
7. Dependency Rules

Current frontend stack:

React
TypeScript
Vite
xterm.js
Tauri API

Current backend stack:

Tauri v2
Rust
portable-pty

Do not add major new dependencies unless they directly unlock a planned version feature.

Allowed later:

React Flow for V0.5 workflow canvas

Avoid for now:

Redux
backend servers
database layers
auth libraries
cloud SDKs
AI provider SDKs
8. Error Handling Rules

User-facing errors should be clear and actionable.

Examples:

Failed to start terminal. Check command or working directory.
Working directory does not exist.
PTY session ended unexpectedly.

Do not show raw Rust panic messages directly as the only user feedback.

Developer logs may contain raw details.

9. Performance Rules

CMDino may support up to 12 terminal panes.

Therefore:

inactive Dino animations should eventually reduce FPS
terminal cleanup must be reliable
pane removal must kill or release PTY sessions
avoid duplicated event listeners
avoid global animation loops per dino if shared loop becomes necessary later

For now, correctness is more important than micro-optimization.

10. AI Agent Instruction

When an AI agent modifies CMDino, it must answer these before coding:

Which version scope is this change for?
Which files are allowed to change?
Which files must not be rewritten?
Does this preserve the existing terminal-dino bridge?
Does this introduce any forbidden future feature?

If uncertain, choose the smaller patch.