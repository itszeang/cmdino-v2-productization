# CMDino — Master Product Brief
Version: 1.0
Status: Core Product Constitution

---

## 1. Product Name

CMDino

---

## 2. Product Category

CMDino is a desktop productivity application.

It is a visual command center for managing multi-agent CLI coding workflows.

CMDino is NOT:

- a terminal emulator replacement
- a generic AI chatbot
- a cloud SaaS dashboard
- an IDE plugin
- a code editor

CMDino sits between:

AI CLI agents <-> developer workspace management

---

## 3. Core Product Thesis

Modern AI-assisted developers often run multiple coding agents simultaneously:

- Claude Code
- Codex CLI
- Gemini CLI
- Ollama
- custom shell agents

The current workflow pain points are:

- terminal tab chaos
- manual prompt handoffs
- output file confusion
- no visual process visibility
- no agent identity clarity

CMDino exists to solve this orchestration pain.

CMDino allows users to:

- create visual Dino Terminals
- assign commands and working directories
- run multiple AI agents in one workspace
- observe live dinosaur-based terminal state feedback
- attach skill/prompt files
- visually connect workflows
- manually pass outputs between agents

---

## 4. Core Product Promise

CMDino makes chaotic multi-agent coding workflows:

- visible
- manageable
- intuitive
- enjoyable

without changing the user's preferred CLI tools.

---

## 5. Primary User Type

CMDino is built for:

- indie hackers
- AI-assisted solo developers
- vibe coders
- local LLM users
- AI automation builders

CMDino is not initially built for enterprise teams.

---

## 6. Product Identity Layer

Each AI terminal session is represented by a living pixel dinosaur.

Dinosaurs are not decorative mascots.

They function as:

- terminal state indicators
- agent identity markers
- motion-based feedback units

Users should understand the rough condition of each agent visually before reading text logs.

---

## 7. V0 Product Goal (Internal Proof)

V0 is an internal working prototype.

The purpose of V0 is:

to prove that CMDino can function as a usable visual multi-agent workspace.

V0 must demonstrate:

- multiple terminal panes
- selectable dinosaur identities
- dinosaur lane movement
- state-based dinosaur animation switching
- agent creation/config
- skill attachment
- manual output handoff
- basic workflow graph persistence

V0 does NOT need:

- cloud sync
- user accounts
- billing
- team collaboration
- plugin marketplace
- smart automation engine

---

## 8. V1 Product Goal (Shareable Alpha)

V1 is the first public downloadable alpha.

Goal:

outside users can install CMDino, create agents, run commands, and understand the visual orchestration concept.

Primary focus:

stability + cleaner UX.

---

## 9. V2 Product Goal (Paid Indie Tool)

V2 is the first monetizable version.

Goal:

CMDino becomes a daily-use desktop orchestration tool worth paying for.

Will later include:

- workflow presets
- better handoff controls
- session logs
- onboarding
- pro settings

---

## 10. Mandatory V0 Engineering Principles

All engineering agents must follow these rules:

### Rule 1 — Build the software spine first

Do not overfocus on polish before the architecture exists.

### Rule 2 — Keep all systems modular

CMDino must be built as reusable isolated modules.

### Rule 3 — Avoid future-feature contamination

Do not prematurely implement V1/V2 ideas inside V0.

### Rule 4 — Prioritize terminal clarity over decorative visuals

Dinosaurs support usability, not the reverse.

### Rule 5 — Prefer local JSON/simple persistence over complex backend systems

V0 must stay lightweight.

---

## 11. Mandatory Tech Direction

Target stack:

- Tauri
- React
- TypeScript
- xterm.js
- React Flow
- local JSON persistence
- optional SQLite later

No backend server should be introduced in V0.

---

## 12. Core V0 Modules

The V0 prototype is built from these mandatory systems:

- Workspace Config Manager
- Multi Terminal Pane System
- Dino Runtime Engine
- Dino Lane Renderer
- Agent Config Modal
- Skill File Manager
- Prompt Bridge
- Basic Workflow Canvas

These modules define the software spine.

---

## 13. Product Philosophy

CMDino should feel like:

a living mission control center for AI coding agents.

Not a toy.

Not a gimmick.

Not just cute dinosaurs.

Visual delight is important, but orchestration usability is the real product.

---

## 14. Non-Goals For Current Development

The following must be ignored for now:

- user auth
- cloud sync
- billing
- team workspaces
- online storage
- remote execution
- plugin marketplace
- built-in LLM provider logic
- SaaS backend

---

## 15. Binding Instruction To All AI Agents

When uncertain, every planning or implementation decision must ask:

"Does this improve CMDino's V0 software spine?"

If not, do not build it.