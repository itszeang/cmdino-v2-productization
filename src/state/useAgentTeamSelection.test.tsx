import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_AGENT_TEAMS } from "../domain/agentTeam";
import { useAgentTeamSelection } from "./useAgentTeamSelection";

const STORAGE_KEY = "cmdino.v2.selected_agent_team";

describe("useAgentTeamSelection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("exposes the default team presets from the domain model", () => {
    const { result } = renderHook(() => useAgentTeamSelection());

    expect(result.current.teams).toBe(DEFAULT_AGENT_TEAMS);
    expect(result.current.teams.map((team) => team.id)).toEqual([
      "vibe-app-builder",
      "bug-fix-team",
      "ui-polish-team",
      "architecture-team",
    ]);
  });

  it("persists selected team id and restores it on the next hook instance", () => {
    const { result, unmount } = renderHook(() => useAgentTeamSelection());

    act(() => {
      result.current.selectTeam("bug-fix-team");
    });

    expect(result.current.selectedTeamId).toBe("bug-fix-team");
    expect(result.current.selectedTeam?.name).toBe("Bug Fix Team");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("bug-fix-team");

    unmount();

    const restored = renderHook(() => useAgentTeamSelection());
    expect(restored.result.current.selectedTeamId).toBe("bug-fix-team");
    expect(restored.result.current.selectedTeam?.name).toBe("Bug Fix Team");
  });

  it("rejects unknown team ids and clears persisted selection", () => {
    const { result } = renderHook(() => useAgentTeamSelection());

    act(() => {
      result.current.selectTeam("missing-team");
    });

    expect(result.current.selectedTeamId).toBeNull();
    expect(result.current.selectedTeam).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
