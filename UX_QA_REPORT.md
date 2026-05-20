# CMDino UX QA Report

**Audit Date:** 2026-05-17  
**Build:** Alpha (main branch)  
**Scope:** Full first-time user journey, code-level audit of MainTaskChat, AppSidebar, TerminalPane, WorkspaceToolbar, ProjectOpenScreen, EmptyWorkspaceState, WelcomeModal, AgentDock, secondary surfaces.

---

## Overall Verdict

**CMDino has solid structural UX.** The gating logic (Project → Team → Agents → Task → Checkpoint) is sound. Secondary surfaces are well-organized. Error/warning states exist everywhere they matter.

**Main risk:** Terminology inconsistency and missing human-readable copy in key spots creates a jargon barrier for first-time users. The flow *works* but is not yet *legible* to a developer who hasn't read the docs.

**Severity breakdown:**
- 🔴 High (blocks comprehension): 4 issues
- 🟡 Medium (adds friction): 8 issues  
- 🟢 Low (polish): 6 issues

---

## Highest-Risk Friction Points

### 🔴 H1 — "+ TERMINAL" vs "Add Agent" (terminology split)

**File:** `WorkspaceToolbar.tsx` line 242  
**Problem:** The WorkspaceToolbar primary CTA says `+ TERMINAL`. The sidebar says `Add Agent`. The status counter says `agents`. The dock says `agent-dock`. Three words for the same thing in the same view.  
**Impact:** First-time user doesn't know if a "terminal" is an "agent" or something different.  
**Fix:** Change `+ TERMINAL` → `+ Add Agent` in WorkspaceToolbar.

---

### 🔴 H2 — "Open a Project Workspace" conflates two concepts

**File:** `ProjectOpenScreen.tsx` line 32  
**Problem:** The heading says "Open a Project Workspace." A workspace and a project folder are *different things* in CMDino (workspaces store agent config; project folders are where code lives). This heading makes it sound like you're loading a workspace, not a project directory.  
**Impact:** User opens the wrong thing or doesn't understand what they're selecting.  
**Fix:** Change heading to "Open a Project Folder". Also simplify the note: remove "real repo" jargon.

---

### 🔴 H3 — "dormant" lifecycle label is opaque

**Files:** `TerminalPane.tsx` (topbar kind badge), `MainTaskChat.tsx` (target select options)  
**Problem:** `dormant`, `exited`, `killed` are technical PTY lifecycle states. Developers outside terminal internals don't know what these mean. "dormant" specifically looks like an error state (is the agent broken?).  
**Impact:** Users don't know if dormant = safe to ignore or requires action.  
**Fix:** Map lifecycle → human label: dormant→"offline", exited→"stopped", killed→"stopped", spawning→"starting…"

---

### 🔴 H4 — "Parse" button has no disabled explanation

**File:** `MainTaskChat.tsx`, checkpoint result parser  
**Problem:** The "Parse" button is disabled when `resultText` is empty but has no `title` attribute. Users who haven't pasted anything yet see a greyed button with no hint.  
**Impact:** User doesn't know they need to paste or capture first.  
**Fix:** Add `title` to Parse button: `"Paste or capture the agent output first"`.

---

## Medium Friction Points

### 🟡 M1 — WelcomeModal step 3 says "handoff" without explanation

**File:** `WelcomeModal.tsx` STEPS[2]  
**Title:** "Start and handoff"  
**Problem:** "Handoff" is a CMDino-specific term. New user doesn't know what it means.  
**Fix:** Change to "Start agents and route output".

---

### 🟡 M2 — "Continue Workflow" disabled title is vague

**File:** `MainTaskChat.tsx` Continue button  
**Current title:** `"Complete this checkpoint first"`  
**Problem:** "Complete" is vague — complete *how*? The user needs to parse a valid result.  
**Fix:** `"Parse the agent result first — checkpoint needs a valid parsed output to continue"`

---

### 🟡 M3 — AppSidebar section "Work" is too generic

**File:** `AppSidebar.tsx` line 317  
**Problem:** Section label "Work" contains Agent Map, Workflow History, Activity, Start Agents. "Work" doesn't communicate this. "Workflow" would be more precise.  
**Fix:** Change section label `Work` → `Workflow`.

---

### 🟡 M4 — Readiness list "Flow" label unexplained

**File:** `MainTaskChat.tsx` ReadinessList component  
**Problem:** The readiness panel shows a "Flow" row with team step labels. New users don't know what "Flow" means.  
**Fix:** Change label `Flow` → `Workflow Steps`.

---

### 🟡 M5 — Composer hint is generic

**File:** `MainTaskChat.tsx` mc-composer-hint  
**Current:** `"CMDino runs local CLI agents. You stay in control at every checkpoint."`  
**Problem:** Doesn't tell the user *what to type* or *what happens after*.  
**Fix:** `"Describe the task. CMDino prepares a prompt for each checkpoint — you review, send to an agent, capture, and continue."`

---

### 🟡 M6 — EmptyWorkspaceState steps too brief

**File:** `EmptyWorkspaceState.tsx` lines 96–110  
**Problem:** "Start agents → Add context → Send to agent" has no explanation. Users don't know what "Add context" achieves or what "Send to agent" means.  
**Fix:** Add short hint under each step label.

---

### 🟡 M7 — ProjectOpenScreen note uses "real repo" jargon

**File:** `ProjectOpenScreen.tsx` line 37  
**Current:** `"CMDino sessions store agent layout and outputs separately. The project folder is the real repo agents start inside."`  
**Problem:** "real repo" implies other things aren't real. Also "sessions" as a concept is not explained.  
**Fix:** `"Agent configuration and outputs are saved separately from your code. The project folder is the starting directory for all terminal agents."`

---

### 🟡 M8 — Inline guidance copy inconsistent

**File:** `MainTaskChat.tsx` mc-inline-guidance  
**Problem:** When messages exist but agents not running, the guidance says "none running. Start them in Agent Workspace" but doesn't say which button to click or where to go.  
**Fix:** Be explicit: "Open Agent Workspace and start them, then return here to stage your task."

---

## Low Priority (Polish)

### 🟢 L1 — "Interventions" sidebar row disabled when 0 interventions
**File:** `AppSidebar.tsx` line 280-290  
**Current:** Row is disabled when no interventions, but onClick is `onOpenChat`. Disabled is correct but the `title` already explains it well (`"No active interventions"`). No fix needed — already handled.

### 🟢 L2 — WorkspaceToolbar "+ TERMINAL" missing `title` attribute
Already covered in H1 fix.

### 🟢 L3 — Project remove button says "x" (lowercase)
**File:** `ProjectOpenScreen.tsx` line 70  
**Fix:** Change to "✕" for visual consistency with other close buttons.

### 🟢 L4 — Empty workspace steps bar is purely labels, no sub-hints
**File:** `EmptyWorkspaceState.tsx`  
Tracked in M6. Adding hints would require minor layout change.

### 🟢 L5 — LogsPanel lifecycle badge colors are hardcoded hex
**File:** `LogsPanel.tsx`  
Minor — should use token vars. Non-urgent.

### 🟢 L6 — WelcomeModal "Start Empty" button could be "Skip for Now"
**File:** `WelcomeModal.tsx`  
"Start Empty" sounds like you lose something. "Skip for Now" is softer.

---

## First-Time User Journey Notes

```
1. Open CMDino
   → WelcomeModal appears ✓
   → Health status shown ✓
   → CTA adapts to provider state ✓ (good)
   → "Start and handoff" step confusing ← FIX

2. Dismiss welcome, see ProjectOpenScreen
   → "Open a Project Workspace" heading confusing ← FIX
   → "real repo" note confusing ← FIX
   → Select folder works ✓

3. In Agent Workspace
   → EmptyWorkspaceState shows ✓
   → "+ TERMINAL" vs "Add Agent" mismatch ← FIX
   → Deploy/Start flow clear enough ✓

4. Start agents
   → "dormant" in topbar badge confusing ← FIX
   → Status dot + color works well ✓
   → Dormant launch card is clear ✓

5. Go to Chat
   → Gate screens are clear ✓ (work from previous pass)
   → Readiness list "Flow" label unexplained ← FIX

6. Describe task, stage workflow
   → "Stage Task" is understood in context ✓
   → Composer hint text generic ← FIX

7. Send checkpoint prompt
   → Target select shows "dormant" lifecycle ← FIX
   → Warnings visible ✓
   → Send Prompt tooltip good ✓

8. Capture result
   → "Parse" disabled with no explanation ← FIX
   → CMDINO_RESULT_START format explained in placeholder ✓

9. Continue workflow
   → "Continue" disabled title vague ← FIX
   → Next step shown clearly ✓

10. Save output
    → Actions clearly labeled ✓
    → Output Shelf accessible ✓
```

---

## Error/Warning Recovery Assessment

| State | Clarity | Fix Needed? |
|---|---|---|
| Project missing | ✅ Gate screen clearly explains | No |
| Team missing | ✅ Gate screen with team selector | No |
| No agents deployed | ✅ Gate with deploy button | No |
| Agents not running | ✅ Gate + inline guidance | Minor copy fix |
| CWD mismatch | ✅ Yellow strip with Settings button | No |
| Provider missing/offline | ✅ Health Panel + Setup Check | No |
| Readiness error | ✅ Panel + Retry button | No |
| Runtime error | ✅ RuntimeErrorCard with Retry | No |
| Missing CMDINO_RESULT_START | ✅ Error message + recovery actions | No |
| Invalid JSON result | ✅ Error message | No |
| No clean capture output | ✅ Warning text visible | No |
| Parse button disabled (empty input) | ❌ No disabled title | **FIX** |
| Continue disabled (invalid result) | 🟡 Vague "Complete this checkpoint first" | **FIX** |

---

## Terminology Consistency Map (Preferred → Actual)

| Preferred Term | Where Correct | Where Wrong |
|---|---|---|
| "Project Folder" | ProjectOpenScreen (button), Chat gates | ProjectOpenScreen h1 says "Project Workspace" |
| "Agent Team" | Chat gates, deployment messages | Consistent ✓ |
| "Agent Workspace" | Sidebar, chat gates, dock | WorkspaceToolbar says "TERMINAL" |
| "Checkpoint" | Chat panel header, button labels | Consistent ✓ |
| "Send Prompt" | Chat checkpoint panel | Consistent ✓ |
| "Capture Result" | Chat checkpoint panel | Consistent ✓ |
| "Context Library" | Sidebar, pane button | Consistent ✓ |
| "Output Shelf" | Sidebar, output drawer | Consistent ✓ |
| "Workflow History" | Sidebar | Consistent ✓ |
| "Setup Check" | Sidebar | Consistent ✓ |

---

## Safe Fixes Implemented

See git diff for all changes. Summary:

1. **WorkspaceToolbar.tsx**: `+ TERMINAL` → `+ Add Agent`, added `title` attribute
2. **ProjectOpenScreen.tsx**: h1 text fix, note copy simplification, close button "x" → "✕"
3. **WelcomeModal.tsx**: Step 03 title fix ("Start and handoff" → "Start agents and route output")
4. **AppSidebar.tsx**: Section "Work" → "Workflow"
5. **MainTaskChat.tsx**: 
   - ReadinessList "Flow" → "Workflow Steps"
   - Parse button: added `title` when disabled
   - Continue button: improved disabled `title`
   - Target select: mapped lifecycle states to human-friendly labels
   - Composer hint: improved copy
   - mc-inline-guidance: improved copy
6. **TerminalPane.tsx**: kind-badge lifecycle labels mapped to human-friendly strings

---

## What Should NOT Be Changed

- Terminal lifecycle state machine (dormant/spawning/running/exited/killed/error) — internal values only, now just displayed differently
- Checkpoint panel workflow logic — gating and state transitions are correct
- Gate screen gating conditions (projectRequired, teamRequired, agentsNotReady) — logic is sound
- CMDINO_RESULT_START / CMDINO_RESULT_END format — this is the protocol, must stay
- TerminalGrid JSX structure — stable, do not touch
- All existing onClick/callback prop contracts
- Z-index hierarchy on modals/drawers

---

## Remaining Product Risks

| Risk | Severity | Recommendation |
|---|---|---|
| CMDINO_RESULT_START format is invisible until parse fails | Medium | Add a "What format?" collapsible hint near the result textarea |
| "Send Marked" in TerminalPane is still opaque | Low | Future: rename to "Auto-Forward" or add longer tooltip |
| WelcomeModal "Start Empty" sounds like you lose things | Low | Future: rename to "Skip for Now" |
| EmptyWorkspaceState 3-step flow has no sub-hints | Low | Future: add brief subtitle under each step |
| WorkflowRunHistoryPanel run list items still heavy inline styles | Low | Future styling pass |
| OutputLibraryDrawer file buttons still heavy inline | Low | Future styling pass |

---

## Recommended Next Target

**TARGET 6 — Agent Creation / Edit / Configuration UX**

Reason: AgentCreationModal and AgentEditModal are primary entry points for first-time users (called immediately after "Add Agent"). These forms set launch commands, cwd, kind, and attachments. If these are confusing, users can't get agents running at all. Worth a targeted pass after the current QA improvements land.
