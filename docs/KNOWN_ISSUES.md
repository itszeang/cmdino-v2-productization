# CMDino Known Issues

Date: 2026-05-09
Status: Phase 1 Product Trust known issues

| Issue | Severity | User impact | Workaround / status |
| --- | --- | --- | --- |
| Gemini auth cannot be safely verified automatically. | Low | Gemini can show as installed or not fully verified even when the user is authenticated. | Start the agent and handle any CLI prompt directly. Keep as an alpha limitation. |
| CLI PATH can differ between the system shell and app environment. | Medium | A CLI that works in a user shell may be missing from the Tauri app process. | Add the CLI to the system/user PATH visible to desktop apps, then restart CMDino. |
| Transcript export is best-effort for TUI CLIs. | Medium | Spinners, redraws, and full-screen terminal UIs may still leave noisy transcript lines. | Prefer line-oriented CLI modes when exporting transcripts. |
| Output deletion does not auto-remove stale attachment references. | Low | Deleted generated files can remain listed as agent attachments until manually removed. Preview/send fails gracefully if the file is gone. | Remove stale attachment chips manually in the Context panel. |
| No cloud sync, account system, or license gate yet. | Low | Workspaces and outputs are local to one machine. Distribution remains private-alpha oriented. | Move local files manually if needed. |
| No bulk delete. | Low | Users must delete workspaces and output artifacts one at a time. | Intentional V1 safety constraint. |
| No autonomous execution. | Low | Workflow routes are visual/manual preferences, not scheduled or automatic agent execution. | Use manual Handoff or Forward controls. |
| Auto Forward works best with clean recent output. | Medium | Raw TUI or prompt-heavy output can forward noisy context. | Select exact text first or use manual handoff for editing. |
| Large Vite chunk warning remains. | Low | Build succeeds, but initial app JS is larger than Vite's default warning threshold. | Defer code splitting until load time is a real problem. |
| Tauri bundle identifier ends with `.app`. | Low | Current Windows build succeeds; Tauri warns this is not ideal for macOS distribution. | Rename before serious macOS packaging. |
| Rust dead-code warning for `ProbeOutput.duration_ms`. | Low | No runtime impact. | Remove or surface the field in a cleanup pass. |
