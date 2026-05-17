import type { AgentTeam } from "../domain/agentTeam";

export function AgentTeamSelector({
  teams,
  selectedTeamId,
  disabled = false,
  onSelectTeam,
}: {
  teams: AgentTeam[];
  selectedTeamId?: string | null;
  disabled?: boolean;
  onSelectTeam: (teamId: string | null) => void;
}) {
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

  return (
    <details className="agent-team-selector">
      <summary className="agent-team-selector-summary">
        <div>
          <span>Shared Agent Workspace team</span>
          <em>{selectedTeam?.name ?? "No team selected"}</em>
        </div>
      </summary>
      <div className="agent-team-selector-body">
        <label htmlFor="workflow-template-select">Workspace team</label>
        <select
          id="workflow-template-select"
          value={selectedTeam?.id ?? ""}
          onChange={(event) => onSelectTeam(event.target.value || null)}
          disabled={disabled}
        >
          <option value="">Choose an Agent Workspace team...</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <p>
          This is the single selected team for Chat and Agent Workspace. Selecting it does not create running agents until you deploy it.
        </p>
        {selectedTeam && (
          <small>{selectedTeam.steps.map((step) => step.label).join(" -> ")}</small>
        )}
        {disabled && <em>Finish or cancel the active workflow to change the template.</em>}
      </div>
    </details>
  );
}
