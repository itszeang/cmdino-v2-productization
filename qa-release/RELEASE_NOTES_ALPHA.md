# CMDino Alpha Release Notes

## What Works

- Multi-agent terminal workspace with focus/grid modes.
- Custom command agents, including `cmd` on Windows.
- Agent Dock navigation and lifecycle status.
- Setup Check for Claude, Codex, Gemini, Ollama, and Custom Agent readiness.
- Workspace templates and Agent Map routes.
- Add Context with Starter Context, Local File, Output Shelf, preview, attach, send, remove, and copy path flows.
- Save Memory Brief, Export Logs, Share Progress, and Output Shelf preview/copy/delete.
- Local workspace save/open/delete.
- Session continuity through Continue Work.

## What To Test

- Install and first launch on a clean Windows machine.
- Custom Agent using `cmd`, then run `echo hello`.
- Template load and Agent Map.
- Adding and sending a `.md` or `.txt` context file.
- Output generation and Output Shelf actions.
- Workspace save, reopen, and delete.
- Clear error messages when CLIs are missing or not authenticated.

## Known Limitations

- Unsigned installer may trigger SmartScreen.
- Gemini auth cannot be safely verified automatically.
- CLI PATH can differ between your shell and the desktop app.
- Transcript export is best-effort for TUI CLIs.
- No cloud sync, account system, payment gate, or autonomous execution.
- Output deletion does not remove stale agent attachment references.
- Final app icon assets are not done yet.

## Feedback We Need

- Any install or launch failure.
- Any crash during normal use.
- Any place where wording is too technical.
- Any confusing attach-vs-send moment in Add Context.
- Any provider health status that seems wrong.
- One screenshot or short video of anything surprising.
