import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLastSession,
  loadLastSession,
  saveLastSession,
  type LastSessionRecord,
} from "./lastSession";

const STORAGE_KEY = "cmdino.v1.last_session";

function validRecord(): LastSessionRecord {
  return {
    workspaceName: "QA Workspace",
    workspaceSlug: "qa-workspace",
    savedAt: 1_777_777_777,
    agentCount: 2,
    agentLabels: ["Planner", "Builder"],
    outputCount: 3,
    lastEventType: "agent_created",
    lastEventLabel: "Builder",
    lastEventAt: 1_777_777_778,
  };
}

describe("lastSession", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and loads a valid record", () => {
    const record = validRecord();

    saveLastSession(record);

    expect(loadLastSession()).toEqual(record);
  });

  it("returns null for invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not-json");

    expect(loadLastSession()).toBeNull();
  });

  it("returns null when required workspace fields are missing", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        savedAt: 1_777_777_777,
        agentCount: 1,
        agentLabels: ["Planner"],
        outputCount: 0,
      }),
    );

    expect(loadLastSession()).toBeNull();
  });

  it("clears the stored record", () => {
    saveLastSession(validRecord());

    clearLastSession();

    expect(loadLastSession()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
