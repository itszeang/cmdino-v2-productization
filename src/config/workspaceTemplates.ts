import type { AgentKind } from "../domain/agentKind";
import type { CmdinoWorkspaceFile } from "../domain/workspace";

export interface WorkspaceTemplate {
  id:         string;
  name:       string;
  tagline:    string;
  agentKinds: AgentKind[];
  workspace:  CmdinoWorkspaceFile;
}

// ── Template 1 — Fullstack App Builder ───────────────────────────────────────

const FS_CLAUDE  = "tpl-fs-claude-01";
const FS_CODEXFE = "tpl-fs-codex-fe-02";
const FS_CODEXBE = "tpl-fs-codex-be-03";
const FS_GEMINI  = "tpl-fs-gemini-04";

const FULLSTACK_APP_BUILDER: WorkspaceTemplate = {
  id:         "fullstack-app-builder",
  name:       "Fullstack App Builder",
  tagline:    "Plan → frontend → backend → review. 4-agent sprint.",
  agentKinds: ["claude", "codex", "codex", "gemini"],
  workspace: {
    schemaVersion: 3,
    workspaceName: "Fullstack App Builder",
    terminals: [
      {
        configId:      FS_CLAUDE,
        order:         0,
        label:         "Claude Architect",
        agentKind:     "claude",
        launchCommand: "claude",
        cwd:           undefined,
        dinoId:        "female-cole",
        attachments:   [{ id: "tpl-fs-att-01", path: "cmdino-preset://claude", fileName: "CLAUDE.md" }],
      },
      {
        configId:      FS_CODEXFE,
        order:         1,
        label:         "Codex Frontend",
        agentKind:     "codex",
        launchCommand: "codex",
        cwd:           undefined,
        dinoId:        "male-kira",
        attachments:   [{ id: "tpl-fs-att-02", path: "cmdino-preset://codex", fileName: "CODEX.md" }],
      },
      {
        configId:      FS_CODEXBE,
        order:         2,
        label:         "Codex Backend",
        agentKind:     "codex",
        launchCommand: "codex",
        cwd:           undefined,
        dinoId:        "male-cole",
        attachments:   [{ id: "tpl-fs-att-03", path: "cmdino-preset://codex", fileName: "CODEX.md" }],
      },
      {
        configId:      FS_GEMINI,
        order:         3,
        label:         "Gemini Reviewer",
        agentKind:     "gemini",
        launchCommand: "gemini",
        cwd:           undefined,
        dinoId:        "female-kira",
        attachments:   [{ id: "tpl-fs-att-04", path: "cmdino-preset://gemini", fileName: "GEMINI.md" }],
      },
    ],
    workflowLinks: [
      { id: "tpl-fs-link-01", sourceConfigId: FS_CLAUDE,  targetConfigId: FS_CODEXFE, kind: "route", count: 1, updatedAt: 0 },
      { id: "tpl-fs-link-02", sourceConfigId: FS_CODEXFE, targetConfigId: FS_CODEXBE, kind: "route", count: 1, updatedAt: 0 },
      { id: "tpl-fs-link-03", sourceConfigId: FS_CODEXBE, targetConfigId: FS_GEMINI,  kind: "route", count: 1, updatedAt: 0 },
    ],
    workflowNodePositions: {
      [FS_CLAUDE]:  { x:  80, y: 140 },
      [FS_CODEXFE]: { x: 280, y: 240 },
      [FS_CODEXBE]: { x: 480, y: 140 },
      [FS_GEMINI]:  { x: 660, y: 240 },
    },
  },
};

// ── Template 2 — Mobile App Builder ──────────────────────────────────────────

const MOB_CLAUDE = "tpl-mob-claude-01";
const MOB_CODEX  = "tpl-mob-codex-02";
const MOB_GEMINI = "tpl-mob-gemini-03";

const MOBILE_APP_BUILDER: WorkspaceTemplate = {
  id:         "mobile-app-builder",
  name:       "Mobile App Builder",
  tagline:    "Architecture → implementation → testing. Tight 3-agent loop.",
  agentKinds: ["claude", "codex", "gemini"],
  workspace: {
    schemaVersion: 3,
    workspaceName: "Mobile App Builder",
    terminals: [
      {
        configId:      MOB_CLAUDE,
        order:         0,
        label:         "Claude Architect",
        agentKind:     "claude",
        launchCommand: "claude",
        cwd:           undefined,
        dinoId:        "female-cole",
        attachments:   [{ id: "tpl-mob-att-01", path: "cmdino-preset://claude", fileName: "CLAUDE.md" }],
      },
      {
        configId:      MOB_CODEX,
        order:         1,
        label:         "Codex Dev",
        agentKind:     "codex",
        launchCommand: "codex",
        cwd:           undefined,
        dinoId:        "male-kira",
        attachments:   [{ id: "tpl-mob-att-02", path: "cmdino-preset://codex", fileName: "CODEX.md" }],
      },
      {
        configId:      MOB_GEMINI,
        order:         2,
        label:         "Gemini Tester",
        agentKind:     "gemini",
        launchCommand: "gemini",
        cwd:           undefined,
        dinoId:        "female-kira",
        attachments:   [{ id: "tpl-mob-att-03", path: "cmdino-preset://gemini", fileName: "GEMINI.md" }],
      },
    ],
    workflowLinks: [
      { id: "tpl-mob-link-01", sourceConfigId: MOB_CLAUDE, targetConfigId: MOB_CODEX,  kind: "route", count: 1, updatedAt: 0 },
      { id: "tpl-mob-link-02", sourceConfigId: MOB_CODEX,  targetConfigId: MOB_GEMINI, kind: "route", count: 1, updatedAt: 0 },
    ],
    workflowNodePositions: {
      [MOB_CLAUDE]: { x: 120, y: 200 },
      [MOB_CODEX]:  { x: 360, y: 200 },
      [MOB_GEMINI]: { x: 600, y: 200 },
    },
  },
};

// ── Template 3 — Bug Hunt ─────────────────────────────────────────────────────

const BUG_GEMINI = "tpl-bug-gemini-01";
const BUG_CLAUDE = "tpl-bug-claude-02";
const BUG_CODEX  = "tpl-bug-codex-03";

const BUG_HUNT: WorkspaceTemplate = {
  id:         "bug-hunt",
  name:       "Bug Hunt",
  tagline:    "Analyze the bug, plan the fix, patch it. No noise.",
  agentKinds: ["gemini", "claude", "codex"],
  workspace: {
    schemaVersion: 3,
    workspaceName: "Bug Hunt",
    terminals: [
      {
        configId:      BUG_GEMINI,
        order:         0,
        label:         "Gemini Analyzer",
        agentKind:     "gemini",
        launchCommand: "gemini",
        cwd:           undefined,
        dinoId:        "female-kira",
        attachments:   [{ id: "tpl-bug-att-01", path: "cmdino-preset://gemini", fileName: "GEMINI.md" }],
      },
      {
        configId:      BUG_CLAUDE,
        order:         1,
        label:         "Claude Fixer",
        agentKind:     "claude",
        launchCommand: "claude",
        cwd:           undefined,
        dinoId:        "female-cole",
        attachments:   [{ id: "tpl-bug-att-02", path: "cmdino-preset://claude", fileName: "CLAUDE.md" }],
      },
      {
        configId:      BUG_CODEX,
        order:         2,
        label:         "Codex Patcher",
        agentKind:     "codex",
        launchCommand: "codex",
        cwd:           undefined,
        dinoId:        "male-kira",
        attachments:   [{ id: "tpl-bug-att-03", path: "cmdino-preset://codex", fileName: "CODEX.md" }],
      },
    ],
    workflowLinks: [
      { id: "tpl-bug-link-01", sourceConfigId: BUG_GEMINI, targetConfigId: BUG_CLAUDE, kind: "route", count: 1, updatedAt: 0 },
      { id: "tpl-bug-link-02", sourceConfigId: BUG_CLAUDE, targetConfigId: BUG_CODEX,  kind: "route", count: 1, updatedAt: 0 },
    ],
    workflowNodePositions: {
      [BUG_GEMINI]: { x: 120, y: 200 },
      [BUG_CLAUDE]: { x: 360, y: 200 },
      [BUG_CODEX]:  { x: 600, y: 200 },
    },
  },
};

// ── Template 4 — Research Pipeline ────────────────────────────────────────────

const RES_CLAUDE = "tpl-res-claude-01";
const RES_GEMINI = "tpl-res-gemini-02";
const RES_OLLAMA = "tpl-res-ollama-03";

const RESEARCH_PIPELINE: WorkspaceTemplate = {
  id:         "research-pipeline",
  name:       "Research Pipeline",
  tagline:    "Gather → synthesize → summarize. Multi-model chain.",
  agentKinds: ["claude", "gemini", "ollama"],
  workspace: {
    schemaVersion: 3,
    workspaceName: "Research Pipeline",
    terminals: [
      {
        configId:      RES_CLAUDE,
        order:         0,
        label:         "Claude Researcher",
        agentKind:     "claude",
        launchCommand: "claude",
        cwd:           undefined,
        dinoId:        "female-cole",
        attachments:   [{ id: "tpl-res-att-01", path: "cmdino-preset://claude", fileName: "CLAUDE.md" }],
      },
      {
        configId:      RES_GEMINI,
        order:         1,
        label:         "Gemini Synthesizer",
        agentKind:     "gemini",
        launchCommand: "gemini",
        cwd:           undefined,
        dinoId:        "female-kira",
        attachments:   [{ id: "tpl-res-att-02", path: "cmdino-preset://gemini", fileName: "GEMINI.md" }],
      },
      {
        configId:      RES_OLLAMA,
        order:         2,
        label:         "Ollama Summarizer",
        agentKind:     "ollama",
        launchCommand: "ollama run llama3",
        cwd:           undefined,
        dinoId:        "female-loki",
        attachments:   [{ id: "tpl-res-att-03", path: "cmdino-preset://ollama", fileName: "OLLAMA.md" }],
      },
    ],
    workflowLinks: [
      { id: "tpl-res-link-01", sourceConfigId: RES_CLAUDE, targetConfigId: RES_GEMINI, kind: "route", count: 1, updatedAt: 0 },
      { id: "tpl-res-link-02", sourceConfigId: RES_GEMINI, targetConfigId: RES_OLLAMA, kind: "route", count: 1, updatedAt: 0 },
    ],
    workflowNodePositions: {
      [RES_CLAUDE]: { x: 120, y: 200 },
      [RES_GEMINI]: { x: 360, y: 200 },
      [RES_OLLAMA]: { x: 600, y: 200 },
    },
  },
};

// ── Template 5 — Build-in-Public Sprint ──────────────────────────────────────

const BIP_PLANNER = "tpl-bip-claude-pl-01";
const BIP_CODEX   = "tpl-bip-codex-02";
const BIP_GEMINI  = "tpl-bip-gemini-03";
const BIP_WRITER  = "tpl-bip-claude-rw-04";

const BUILD_IN_PUBLIC_SPRINT: WorkspaceTemplate = {
  id:         "build-in-public-sprint",
  name:       "Build-in-Public Sprint",
  tagline:    "Plan → build → QA → release notes. Ship one feature end-to-end.",
  agentKinds: ["claude", "codex", "gemini", "claude"],
  workspace: {
    schemaVersion: 3,
    workspaceName: "Build-in-Public Sprint",
    terminals: [
      {
        configId:      BIP_PLANNER,
        order:         0,
        label:         "Claude Planner",
        agentKind:     "claude",
        launchCommand: "claude",
        cwd:           undefined,
        dinoId:        "female-cole",
        attachments:   [{ id: "tpl-bip-att-01", path: "cmdino-preset://claude", fileName: "CLAUDE.md" }],
      },
      {
        configId:      BIP_CODEX,
        order:         1,
        label:         "Codex Builder",
        agentKind:     "codex",
        launchCommand: "codex",
        cwd:           undefined,
        dinoId:        "male-kira",
        attachments:   [{ id: "tpl-bip-att-02", path: "cmdino-preset://codex", fileName: "CODEX.md" }],
      },
      {
        configId:      BIP_GEMINI,
        order:         2,
        label:         "Gemini QA",
        agentKind:     "gemini",
        launchCommand: "gemini",
        cwd:           undefined,
        dinoId:        "female-kira",
        attachments:   [{ id: "tpl-bip-att-03", path: "cmdino-preset://gemini", fileName: "GEMINI.md" }],
      },
      {
        configId:      BIP_WRITER,
        order:         3,
        label:         "Claude Writer",
        agentKind:     "claude",
        launchCommand: "claude",
        cwd:           undefined,
        dinoId:        "male-cole",
        attachments:   [{ id: "tpl-bip-att-04", path: "cmdino-preset://claude", fileName: "CLAUDE.md" }],
      },
    ],
    workflowLinks: [
      { id: "tpl-bip-link-01", sourceConfigId: BIP_PLANNER, targetConfigId: BIP_CODEX,  kind: "route", count: 1, updatedAt: 0 },
      { id: "tpl-bip-link-02", sourceConfigId: BIP_CODEX,   targetConfigId: BIP_GEMINI, kind: "route", count: 1, updatedAt: 0 },
      { id: "tpl-bip-link-03", sourceConfigId: BIP_GEMINI,  targetConfigId: BIP_WRITER, kind: "route", count: 1, updatedAt: 0 },
    ],
    workflowNodePositions: {
      [BIP_PLANNER]: { x:  80, y: 200 },
      [BIP_CODEX]:   { x: 280, y: 200 },
      [BIP_GEMINI]:  { x: 480, y: 200 },
      [BIP_WRITER]:  { x: 680, y: 200 },
    },
  },
};

// ── Export ────────────────────────────────────────────────────────────────────

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
  FULLSTACK_APP_BUILDER,
  MOBILE_APP_BUILDER,
  BUG_HUNT,
  RESEARCH_PIPELINE,
  BUILD_IN_PUBLIC_SPRINT,
];
