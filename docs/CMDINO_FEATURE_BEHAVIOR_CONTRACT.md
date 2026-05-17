# CMDino Feature Behavior Contract

## Purpose

This document is the authoritative behavior spec for every major CMDino feature. Use it before implementing, fixing, or extending any surface or navigation behavior. It defines what each feature must do, when it must be visible, what state it must preserve, and what must never happen silently.

---

## Global Navigation Rules

- `activeSurface` is the single source of truth for which surface is shown.
- Clicking any sidebar navigation entry must change `activeSurface` immediately and deterministically.
- The project open screen may show only when `currentProject` is null AND the user has not dismissed it.
- Once dismissed (by clicking Chat, selecting a project, or choosing Continue Without Project), the project open screen must not re-appear until the user explicitly opens a new project selection.
- Switching surfaces must never reset: project, chat messages, workflow run, agent terminals, interventions, output shelf state, or workflow history state.

```ts
type ActiveSurface =
  | "chat"
  | "agents"
  | "workflow_history"
  | "outputs"
  | "activity"
  | "setup"
  | "settings";
```

---

## 1. Global App Shell

**Purpose:** Owns global navigation and surface state.

**Expected behavior:**
- Project open screen shows only when no current project and not dismissed.
- Once inside the app shell, surface switching must not reset any persistent state.
- Sidebar entries behave as deterministic navigation, not conditional setup triggers.

**Must preserve across surface switching:**
- selected project
- selected agent team
- chat messages
- current workflow run and step
- workflow result text
- interventions
- agent terminal instances and visible content
- output shelf state
- workflow history state

**Must never happen silently:**
- project reset
- workflow reset
- chat reset
- terminal remount or content clear
- agent process respawn
- workspace reopen triggered by clicking Chat

---

## 2. Project Workspace

**Purpose:** The local code folder the agent team works inside.

**Expected behavior:**
- On first launch or when no project is selected, show Project Open screen.
- User can select a folder, open a recent project, remove a recent project, or continue without project.
- Once project is selected, Chat must be accessible at all times.
- Clicking Chat must never require selecting the project again.
- Changing project must be explicit.

**UI states:**
- No project, not dismissed → show project open screen.
- No project, dismissed → show app shell with Chat as default surface.
- Project selected → show app shell with Chat as default surface.

**Acceptance tests:**
1. Launch with no project → Project Open screen appears.
2. Select project → Chat appears.
3. Click Agents → Agents appears.
4. Click Chat → Chat appears without opening Project Open screen.
5. Reload → recent project restored if expected.

---

## 3. CMDino Chat

**Purpose:** Primary user-facing task and workflow interface.

**Expected behavior:**
- Chat is accessible after project selection.
- Chat is accessible even if no agents exist.
- Chat does not require a new workspace.
- Chat shows selected project and selected agent team.
- Submitting a task creates a workflow run.
- Chat does not auto-send prompts.
- Chat does not clear messages when switching surfaces.

**Empty state:** explain that the user should open a project, choose a team, describe the task, then send prompts to agents explicitly.

**Disabled states:**
- No project selected: prompt user to open project (but Chat still visible).
- Active workflow exists: team selector may lock, but Chat remains visible.
- No agents: prompt can be generated and copied, but Send Prompt requires a running agent.

**Acceptance tests:**
1. Project selected, no agents → Chat visible.
2. Click Chat from Agents → Chat visible.
3. Submit task → workflow run created.
4. Switch Agents → Chat → messages persist.
5. Chat never opens ProjectOpenScreen unless project state is actually empty and not dismissed.

---

## 4. Agent Workspace / Terminals

**Purpose:** Live execution, debug, and intervention surface for terminals.

**Expected behavior:**
- Agent Workspace stays mounted or preserves visible terminal state across surface switches.
- Terminal content must not disappear when switching Chat ↔ Agents.
- Terminal processes must not respawn on view switches.
- Capture callbacks must remain registered after switching surfaces.

**Implementation note:** Both Chat and Agents surfaces are rendered simultaneously using CSS `data-active` visibility; only one is visible at a time but neither is unmounted.

**Acceptance tests:**
1. Start agent terminal.
2. Produce output.
3. Switch Chat ↔ Agents repeatedly.
4. Terminal content remains visible.
5. Capture Result From Agent still works after switching.

---

## 5. Agent Team Selection

**Purpose:** Defines the workflow step preset for the current run.

**Expected behavior:**
- Chat shows the current selected agent team.
- User can select a team before starting a workflow.
- Selection persists locally.
- Active workflow warns before changing team.
- Team changes future workflow steps, not already-running steps.

**Acceptance tests:**
1. Select Bug Fix Team.
2. Submit task.
3. Workflow steps match Bug Fix Team.
4. Reload app.
5. Selected team persists.

---

## 6. Workflow Run

**Purpose:** Tracks the checkpoint workflow lifecycle.

**Expected behavior:**
- Submit task creates a WorkflowRun in checkpoint mode.
- Current step prompt is generated deterministically.
- User must explicitly send prompt to agent.
- User must explicitly capture/paste result.
- User must explicitly parse result.
- User must explicitly continue to next step.
- No auto-pipe, no auto-continue, no hidden terminal writes.

**States:** `idle | queued | running | waiting_for_user | paused_for_intervention | completed | failed | cancelled`

**Acceptance tests:**
1. Submit task → run created.
2. Prompt preview visible.
3. Send prompt explicit only.
4. Parse completed result → Continue button appears.
5. Continue → next step prompt ready.
6. No prompt is sent automatically.

---

## 7. Prompt Send

**Purpose:** Send current step prompt to a selected running agent.

**Expected behavior:**
- Target agent selection is visible.
- Suggested agent can be preselected, but user can override.
- Send button is disabled unless target is running.
- Sending prompt uses `terminalBridge.write`.
- Sending marks step running and appends a chat progress message.
- No auto-send on team selection, step creation, or continue.

**Acceptance tests:**
1. No agents → Send disabled with explanation.
2. Dormant agent → Send disabled or intervention/warning.
3. Running agent → Send enabled.
4. Click Send → prompt appears in terminal.

---

## 8. Result Capture

**Purpose:** Capture output from target terminal into Chat result review box.

**Expected behavior:**
- Capture is an explicit user action.
- Capture uses selected terminal text first, else latest clean output block.
- Captured text appears in editable textarea.
- User reviews/edits before Parse Result.
- No auto-parse, no auto-complete.

**Acceptance tests:**
1. Target agent has output.
2. Click Capture Result From Agent.
3. Text appears in result box.
4. Edit text.
5. Click Parse Result.
6. Parser behavior matches manual paste.

---

## 9. CMDINO_RESULT Parser

**Purpose:** Structured handoff contract from agents.

**Expected behavior:**
- Parses valid `completed`, `needs_user_action`, `failed` blocks.
- Missing block shows recovery message.
- Invalid JSON shows recovery message.
- Invalid shape shows required fields.
- Never crashes the UI.

**Acceptance tests:** Use fixtures for completed, needs_user_action, failed, missing block, invalid JSON, invalid shape.

---

## 10. Intervention

**Purpose:** Human-in-the-loop safety surface.

**Expected behavior:**
- `needs_user_action` result creates an Intervention.
- `failed` result creates an Intervention.
- Non-running send attempts create a warning/intervention.
- Intervention appears in Chat and sidebar badge.
- Open Agents action opens Agent Workspace.
- Open Setup Check action opens setup/health panel.
- Mark Resolved / Dismiss updates the count.

**Acceptance tests:**
1. Paste needs_user_action result.
2. Chat intervention card appears.
3. Sidebar badge increments.
4. Mark Resolved removes active count.

---

## 11. Output Shelf / Artifacts

**Purpose:** Persist workflow outputs locally.

**Expected behavior:**
- Save Final Output writes local artifact through the existing output path.
- Save Step Artifacts writes summaries/handoffs.
- Save Build Draft writes a local build-in-public draft.
- Output Shelf groups workflow artifacts.
- Save and copy are separate explicit actions.

**Acceptance tests:**
1. Finish workflow.
2. Save final output.
3. Open Output Shelf.
4. Workflow artifact appears.
5. Existing Output Shelf behavior still works.

---

## 12. Workflow History

**Purpose:** Avoid losing workflow context.

**Expected behavior:**
- Run metadata saved locally.
- Current project runs prioritized.
- Detail view shows task, team, status, steps, artifacts.
- Resume incomplete run is explicit.
- Resume sends nothing automatically.
- Activity Log remains separate from Workflow History.

**Acceptance tests:**
1. Start workflow.
2. Open Workflow History.
3. Run appears.
4. Inspect details.
5. Resume incomplete run explicitly.
6. No prompt is sent automatically.

---

## 13. Sidebar / Navigation

**Purpose:** Global deterministic surface navigation.

**Expected behavior:**
- Chat button always opens Chat when app shell is active.
- Agent Workspace button always opens Agents.
- Output Shelf button opens Output Shelf.
- Workflow History button opens history surface.
- Setup Check button opens setup/health panel.
- Interventions entry opens Chat or Intervention surface.
- Navigation must not reset project or workflow state.

**Acceptance tests:**
- Click every sidebar entry repeatedly.
- No state resets.
- No project reopen prompt appears incorrectly.
- No terminal content disappears.
- Chat always returns to Chat.

---

## Navigation Regression Test (Quick Reference)

Run this before pushing any navigation, surface, or App.tsx change:

1. Launch app.
2. Select existing project → Chat appears.
3. Click Agents → Agents appears.
4. Click Chat → Chat appears without project open prompt.
5. Start terminal, produce output.
6. Switch Chat ↔ Agents multiple times → terminal content persists.
7. Open Workflow History → return to Chat.
8. Open Output Shelf → return to Chat.
9. Open Setup Check → return to Chat.
10. No global state resets throughout.
