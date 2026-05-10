import type { CmdinoWorkspaceFile } from "../domain/workspace";

// Stable configIds so workflow links survive load/reload of the demo
const CLAUDE_ID  = "demo-cfg-claude-planner-01";
const CODEX_ID   = "demo-cfg-codex-builder-02";
const GEMINI_ID  = "demo-cfg-gemini-reviewer-03";

export const DEMO_WORKSPACE: CmdinoWorkspaceFile = {
  schemaVersion: 3,
  workspaceName: "CMDino Demo Setup",
  terminals: [
    {
      configId:      CLAUDE_ID,
      order:         0,
      label:         "Claude Planner",
      agentKind:     "claude",
      launchCommand: "claude",
      cwd:           undefined,
      dinoId:        "female-cole",
      attachments: [
        {
          id:       "demo-att-claude-01",
          path:     "cmdino-preset://claude",
          fileName: "CLAUDE.md",
        },
      ],
    },
    {
      configId:      CODEX_ID,
      order:         1,
      label:         "Codex Builder",
      agentKind:     "codex",
      launchCommand: "codex",
      cwd:           undefined,
      dinoId:        "male-kira",
      attachments: [
        {
          id:       "demo-att-codex-01",
          path:     "cmdino-preset://codex",
          fileName: "CODEX.md",
        },
      ],
    },
    {
      configId:      GEMINI_ID,
      order:         2,
      label:         "Gemini Reviewer",
      agentKind:     "gemini",
      launchCommand: "gemini",
      cwd:           undefined,
      dinoId:        "female-kira",
      attachments: [
        {
          id:       "demo-att-gemini-01",
          path:     "cmdino-preset://gemini",
          fileName: "GEMINI.md",
        },
      ],
    },
  ],
  workflowLinks: [
    {
      id:             "demo-link-claude-codex",
      sourceConfigId: CLAUDE_ID,
      targetConfigId: CODEX_ID,
      kind:           "handoff",
      count:          1,
      updatedAt:      0,
    },
    {
      id:             "demo-link-codex-gemini",
      sourceConfigId: CODEX_ID,
      targetConfigId: GEMINI_ID,
      kind:           "handoff",
      count:          1,
      updatedAt:      0,
    },
    {
      id:             "demo-link-gemini-claude",
      sourceConfigId: GEMINI_ID,
      targetConfigId: CLAUDE_ID,
      kind:           "handoff",
      count:          1,
      updatedAt:      0,
    },
  ],
  workflowNodePositions: {
    [CLAUDE_ID]: { x: 120, y: 120 },
    [CODEX_ID]:  { x: 350, y: 250 },
    [GEMINI_ID]: { x: 590, y: 120 },
  },
};
