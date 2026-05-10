# CMDino Alpha Known Issues

These are expected limitations for the closed alpha. Please still report crashes, unclear messages, or anything that blocks the basic test flow.

## Installer / Packaging

- The installer is unsigned and may trigger Windows SmartScreen.
- Final app icon assets are not done yet.

## CLI Detection

- Gemini auth cannot be safely verified automatically. It may show as installed/not verified even when usable.
- CLI PATH may differ between your normal terminal and the CMDino desktop app environment. If a CLI works in PowerShell but not CMDino, restart CMDino after updating the user/system PATH.

## Output / Context

- Transcript export is best-effort for TUI-style CLIs. Full-screen redraws and spinners can produce noisy logs.
- Output deletion does not remove stale attachment references from agents. Removed output files should fail gracefully if previewed or sent later.
- Artifact Reader modal attached-state refresh still needs polish after Add to Agent.

## Product Scope

- No cloud sync.
- No account system.
- No payment/license gate.
- No autonomous workflow execution. Agent routes are visual/manual preferences.
