# Pre-Push Validation Checklist

Use this before pushing CMDino changes.

## Required Commands

Run from the repo root:

```powershell
npm.cmd run build
npm.cmd run test:unit
cargo check --manifest-path src-tauri\Cargo.toml
git status --short
```

Expected result:

- Build exits successfully with no TypeScript errors.
- Unit tests exit successfully (all 152 tests pass).
- `cargo check` exits successfully (one known warning for `ProbeOutput.duration_ms` is acceptable).
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
- Memory brief can be generated from the workflow final panel.
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

## Result Fixtures

Use the current `CMDINO_RESULT_START` / `CMDINO_RESULT_END` format. Required fields: `status`, `summary`, `artifacts` (array), `handoff` (object with `target` and `message`), `next` (string array).

Use this completed fixture:

```txt
CMDINO_RESULT_START
{
  "status": "success",
  "summary": "Completed the requested review and found no runtime changes needed.",
  "artifacts": [],
  "handoff": {
    "target": "next agent or user",
    "message": "Continue to the next checkpoint with the summarized findings."
  },
  "next": []
}
CMDINO_RESULT_END
```

Use this intervention fixture:

```txt
CMDINO_RESULT_START
{
  "status": "needs_user_action",
  "summary": "Need user confirmation before changing files.",
  "artifacts": [],
  "handoff": {
    "target": "user",
    "message": "Ask the user whether docs-only edits are allowed."
  },
  "next": ["Confirm with user before proceeding."]
}
CMDINO_RESULT_END
```

Use this failed fixture:

```txt
CMDINO_RESULT_START
{
  "status": "failed",
  "summary": "The requested task cannot proceed because required project context is missing.",
  "artifacts": [],
  "handoff": {
    "target": "user",
    "message": "Open the correct project folder and retry."
  },
  "next": []
}
CMDINO_RESULT_END
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
