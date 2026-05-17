# CMDino Dogfood Workflow QA

## Test Goal

Use CMDino to run a real workflow against the CMDino project itself.

The core question for this pass is:

> Can a vibe coder open a real project, give a task to an AI agent team, manage the workflow safely, and preserve the results without losing context?

## Test Environment

Recorded on: 2026-05-11

- OS: Microsoft Windows NT 10.0.26200.0
- Node version: v24.13.1
- npm version: 11.8.0
- Rust/Tauri availability: `rustc 1.95.0` is available; full Tauri desktop smoke was not launched in this Codex session.
- AI CLIs installed: `claude`, `codex`, `gemini`, and `ollama` were not detected on PATH from this non-interactive PowerShell session.
- Project path: `C:\Users\burak\Desktop\cmdino-build`
- Validation mode: source review plus automated build/unit validation. Full desktop dogfood with live CLI agents still needs to be run in the packaged or Tauri dev app.

## Dogfood Task

Suggested task for the in-app dogfood run:

```txt
Review CMDino's new Chat workflow and suggest 3 UX copy improvements without changing runtime behavior.
```

Source-level dogfood task attempted in this session:

```txt
Review CMDino's new Chat workflow copy for stale or misleading instructions after Sprints 6-11.
```

## Happy Path Test

1. Open CMDino project workspace.
2. Choose Vibe App Builder or a relevant team.
3. Submit a real task in CMDino Chat.
4. Review the generated checkpoint prompt.
5. Copy or send prompt to target agent.
6. Capture result from agent.
7. Parse `CMDINO_RESULT`.
8. Continue to next checkpoint.
9. Finish workflow.
10. Save final output.
11. Save build draft.
12. Inspect Output Shelf.
13. Inspect Workflow History.
14. Resume an incomplete run if applicable.

### Happy Path Status

| Step | Status | Notes |
| --- | --- | --- |
| Project workspace source path identified | Passed | Repo path is available locally. |
| Agent team and chat code reviewed | Passed | Team selector and checkpoint surfaces are present in source. |
| Prompt/send/capture/parse flow source reviewed | Passed | Flow remains explicit and manual. |
| Artifact and Workflow History source reviewed | Passed | Artifact paths are linked to local workflow history after save. |
| Automated build | Passed | `npm.cmd run build` passes with the known Vite large chunk warning. |
| Unit tests | Passed | `npm.cmd run test:unit` passes. |
| Full desktop live-agent workflow | Not run | Requires launching the app and live CLI agents outside this Codex-only session. |

## Failure/Intervention Test

Run these in the app:

1. Paste a `needs_user_action` result:

   ```txt
   <CMDINO_RESULT>
   {
     "status": "needs_user_action",
     "summary": "Need user confirmation before changing files.",
     "handoff": "Ask the user whether docs-only edits are allowed.",
     "needs_user_action": true,
     "userActionReason": "Permission required before editing."
   }
   </CMDINO_RESULT>
   ```

2. Paste a failed result:

   ```txt
   <CMDINO_RESULT>
   {
     "status": "failed",
     "summary": "The requested task cannot proceed because the project is missing required files.",
     "handoff": "Open the correct project folder and retry.",
     "needs_user_action": false
   }
   </CMDINO_RESULT>
   ```

3. Try sending to a dormant agent.
4. Try capturing with no output.
5. Cancel or leave an incomplete run, open Workflow History, and resume it explicitly.

### Failure/Intervention Status

| Step | Status | Notes |
| --- | --- | --- |
| Parser fixtures reviewed | Passed via tests | Existing parser and workflow tests cover valid/invalid result flows. |
| Dormant-agent send guard reviewed | Passed via source review | Chat blocks send to non-running selected target and shows an inline warning. |
| No-output capture guard reviewed | Passed via source review | Capture helper returns a user-facing failure message. |
| Resume guard reviewed | Passed via source review | Resume requires explicit user action and matching project when a run has project context. |
| Manual UI execution | Not run | Needs desktop app session with at least one agent. |

## Navigation Regression Test

Run before any desktop dogfood pass:

| Check | Expected |
| --- | --- |
| Click Chat after project selected | Chat appears, no project open screen |
| Click Agents from Chat | Agents appears immediately |
| Click Chat from Agents | Chat appears immediately, no project reopen |
| Repeat Chat ↔ Agents 5× | No state resets, no terminal content lost |
| Open Workflow History, return to Chat | Chat state preserved |
| Open Output Shelf, return to Chat | Chat state preserved |
| Open Setup Check, return to Chat | Chat state preserved |
| Fresh launch, click Chat before selecting project | Chat gate dismissed, Chat appears or project screen dismissed |

## Findings

| Area | Issue | Severity | Repro Steps | Proposed Fix |
| --- | --- | --- | --- | --- |
| Chat copy | Hero copy still described workflow routing as future work, even though manual checkpoint routing now exists. | Medium | Open Chat and read the hero subtitle after Sprint 11. | Fixed in Sprint 12: copy now describes explicit send/capture/artifact workflow. |
| Chat empty state | Empty state said nothing will run in terminals from Chat yet, which is misleading after explicit prompt send was added. | Medium | Open Chat with no messages. | Fixed in Sprint 12: copy now says CMDino prepares a checkpoint and waits for explicit send. |
| Chat / Agents switching | Terminal panes were conditionally unmounted when switching to Chat, which could drop visible xterm content. | High | Start an agent, produce output, switch Chat -> Agents. | Fixed in blocker pass: Chat and Agents surfaces now stay mounted and are hidden with CSS. |
| Full live dogfood | The current Codex session cannot launch and inspect the full desktop workflow with live AI CLIs. | Medium | Attempt to complete end-to-end app dogfood from this non-interactive shell-only context. | Defer to a local desktop pass using this checklist. |
| Clean-machine confidence | Clean Windows installer QA is still not complete. | High | Review release readiness checklist. | Run `docs/CLEAN_MACHINE_QA.md` before closed alpha. |

## Fixed In This Pass

- Updated Chat hero copy to reflect the real human-in-the-loop workflow.
- Updated Chat empty-state copy to remove stale "future workflow" wording.
- Kept Chat and Agent Workspace surfaces mounted across navigation so terminal panes are not destroyed by view switching.
- Added this dogfood QA document.
- Added `docs/PRE_PUSH_VALIDATION_CHECKLIST.md`.

## Deferred Issues

- Run the full in-app dogfood workflow with a live CLI agent.
- Record screenshots or video proof for release readiness.
- Execute clean-machine installer QA.
- Keep Vite chunk warning as non-blocking until load time becomes a real issue.

## Manual Smoke Test Status

Manual smoke test status for this Codex session: partial.

Automated validation passed, and source-level checks covered the intended workflow state transitions. A full manual desktop smoke test remains required because this session did not launch the GUI app or live AI agents.
