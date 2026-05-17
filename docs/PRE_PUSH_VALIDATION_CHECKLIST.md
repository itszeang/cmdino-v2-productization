# Pre-Push Validation Checklist

Use this before pushing CMDino changes.

## Required Commands

Run from the repo root:

```powershell
npm.cmd run build
npm.cmd run test:unit
git status --short
```

Expected result:

- Build exits successfully.
- Unit tests exit successfully.
- `git status --short` only shows intentional changes.

## Manual Smoke Test

Run in the desktop app or Tauri dev app:

- App opens.
- Project workspace select works.
- Chat opens after project selection.
- Agent team selector works.
- Workflow run starts from a staged Chat task.
- Prompt can be copied.
- Prompt can be sent to a running agent.
- Send is blocked or clearly explained for a dormant agent.
- Result can be pasted manually.
- Result can be captured from a running agent with output.
- `CMDINO_RESULT` parser accepts a valid completed result.
- `CMDINO_RESULT` parser shows a clear error for missing or invalid blocks.
- Intervention appears for `needs_user_action`.
- Intervention appears for `failed`.
- Continue advances to the next checkpoint only after a completed result.
- Final output appears after the final checkpoint.
- Final output can be saved.
- Step artifacts can be saved.
- Build draft can be saved.
- Output Shelf shows saved workflow artifacts.
- Workflow History shows the run.
- Workflow History detail shows steps and linked artifact paths.
- Incomplete run can be resumed explicitly.
- Activity Log remains separate from Workflow History.

## Navigation Regression Test

Run this before pushing any App.tsx, AppSidebar, ProjectOpenScreen, MainTaskChat, or surface rendering change:

- Launch app.
- Select existing project → Chat appears.
- Click Agents → Agents appears immediately.
- Click Chat → Chat appears without project open prompt.
- Click Agents → Agents appears immediately.
- Repeat Chat ↔ Agents five times.
- No project open screen appears after project is already selected.
- No terminal content disappears.
- No state resets.
- Open Workflow History → return to Chat → Chat state preserved.
- Open Output Shelf → return to Chat → Chat state preserved.
- Open Setup Check → return to Chat → Chat state preserved.

## Chat / Agents Switch Regression

Run this before pushing any Chat, Agent Workspace, TerminalGrid, or TerminalPane change:

- Open Agents.
- Start an agent terminal.
- Produce visible terminal output.
- Switch to Chat.
- Switch back to Agents.
- Confirm the terminal output remains visible.
- Confirm the process is still running if it was running before the switch.
- Switch Chat -> Agents at least three more times.
- Confirm `Capture Result From Agent` still works after switching.

## Failure Fixtures

Use this completed fixture:

```txt
<CMDINO_RESULT>
{
  "status": "completed",
  "summary": "Completed the requested review and found no runtime changes needed.",
  "handoff": "Continue to the next checkpoint with the summarized findings.",
  "needs_user_action": false
}
</CMDINO_RESULT>
```

Use this intervention fixture:

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

Use this failed fixture:

```txt
<CMDINO_RESULT>
{
  "status": "failed",
  "summary": "The requested task cannot proceed because required project context is missing.",
  "handoff": "Open the correct project folder and retry.",
  "needs_user_action": false
}
</CMDINO_RESULT>
```

## Known Non-Blocking Warnings

- Vite large chunk warning after production build.
- Rust warning for `ProbeOutput.duration_ms`.
- Tauri bundle identifier warning ending with `.app`.

## Stop-The-Push Conditions

Do not push until fixed or explicitly documented:

- TypeScript build fails.
- Unit tests fail.
- App cannot open.
- Chat cannot start a workflow.
- Valid `CMDINO_RESULT` cannot parse.
- Workflow History loses an incomplete run after reload.
- Output Shelf save fails in desktop app.
- Any Rust PTY regression in spawn/write/resize/kill behavior.
