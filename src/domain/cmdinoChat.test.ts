import { describe, expect, it } from "vitest";
import {
  createInterventionRequiredMessage,
  createPlaceholderProgressMessages,
  createSystemStatusMessage,
  createUserTaskMessage,
} from "./cmdinoChat";

describe("cmdinoChat", () => {
  it("creates a user task message", () => {
    const message = createUserTaskMessage({
      text: "  Build a habit tracker  ",
      projectWorkspaceId: "project-1",
      agentTeamId: "vibe-app-builder",
    });

    expect(message.kind).toBe("user_task");
    expect(message.text).toBe("Build a habit tracker");
    expect(message.projectWorkspaceId).toBe("project-1");
    expect(message.agentTeamId).toBe("vibe-app-builder");
    expect(message.createdAt).toBeGreaterThan(0);
  });

  it("creates a system status message", () => {
    const message = createSystemStatusMessage("Workflow shell ready.");

    expect(message.kind).toBe("system_status");
    expect(message.text).toBe("Workflow shell ready.");
  });

  it("creates placeholder progress messages", () => {
    const messages = createPlaceholderProgressMessages();

    expect(messages.map((message) => message.kind)).toEqual([
      "system_status",
      "workflow_progress",
    ]);
  });

  it("creates an intervention message shape", () => {
    const message = createInterventionRequiredMessage({
      interventionId: "intervention-1",
      title: "Codex Builder needs your input",
      message: "Permission prompt detected in terminal.",
      targetAgentId: "agent-1",
    });

    expect(message.kind).toBe("intervention_required");
    expect(message.interventionId).toBe("intervention-1");
    expect(message.targetAgentId).toBe("agent-1");
  });
});

