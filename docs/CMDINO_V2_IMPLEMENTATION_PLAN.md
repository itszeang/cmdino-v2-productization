# CMDino V2 Implementation Plan

## Sprint 1 - Scope Recovery + Domain Foundation

- Add scope recovery spec.
- Add intervention model.
- Add workflow run model.
- Add project workspace model.
- Add agent team model.
- Keep current runtime behavior unchanged.

## Sprint 2 - Project Workspace Entry

- Add open project screen.
- Add recent projects.
- Detect project framework and package manager.
- Use project root as default cwd for agents.
- Keep CMDino session/workspace config separate from the real project workspace.

## Sprint 3 - CMDino Chat Shell

- Add main task chat component.
- Add chat message types.
- Show workflow progress messages.
- Render intervention cards in chat.
- Keep Terminal Grid available as monitor/debug surface.

## Sprint 4 - Workflow Orchestrator MVP

- Implement checkpoint mode first.
- Build prompts from agent team steps and user task.
- Add a `CMDINO_RESULT` parser for step summaries.
- Track step state transitions.
- Return final output to CMDino Chat.

## Sprint 5 - Intervention Integration

- Bridge runtime errors into interventions.
- Add sidebar intervention badge.
- Add chat intervention actions.
- Support open terminal and open Setup Check actions.
- Add retry, stop, dismiss, and mark-resolved flows.

## Sprint 6 - Workflow Dashboard + Output Artifacts

- Add workflow run panel.
- Bind Agent Map to workflow run state.
- Save final output to Output Shelf.
- Generate build-in-public artifact.
- Connect Activity Log to workflow timeline.

## Deferred Until After MVP

- Full autonomous DAG execution.
- Parallel agent scheduling.
- Conditional branching.
- Automatic file patching.
- Cloud sync.
- Accounts, licensing, or payment gates.

