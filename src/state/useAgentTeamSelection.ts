import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_AGENT_TEAMS } from "../domain/agentTeam";

const STORAGE_KEY = "cmdino.v2.selected_agent_team";

export function useAgentTeamSelection() {
  const [selectedTeamId, setSelectedTeamId] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return DEFAULT_AGENT_TEAMS.some((team) => team.id === saved) ? saved : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!selectedTeamId || DEFAULT_AGENT_TEAMS.some((team) => team.id === selectedTeamId)) return;
    setSelectedTeamId(null);
  }, [selectedTeamId]);

  const selectTeam = useCallback((teamId: string | null) => {
    const next = teamId && DEFAULT_AGENT_TEAMS.some((team) => team.id === teamId) ? teamId : null;
    setSelectedTeamId(next);
    try {
      if (next) {
        window.localStorage.setItem(STORAGE_KEY, next);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Local storage is optional; selection still works for the current session.
    }
  }, []);

  const clearSelectedTeam = useCallback(() => {
    selectTeam(null);
  }, [selectTeam]);

  const selectedTeam = useMemo(
    () => DEFAULT_AGENT_TEAMS.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId],
  );

  return {
    teams: DEFAULT_AGENT_TEAMS,
    selectedTeam,
    selectedTeamId,
    selectTeam,
    clearSelectedTeam,
  };
}
