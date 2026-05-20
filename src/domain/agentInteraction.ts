export type AgentInteractionType =
  | "approval"
  | "yes_no"
  | "selection"
  | "enter_to_continue"
  | "free_text"
  | "unknown";

export type AgentInteractionStatus = "pending" | "responded" | "dismissed";

export interface SuggestedInteractionAction {
  label: string;
  value: string;
}

export interface AgentInteraction {
  interactionId:   string;
  agentId:         string;
  agentLabel:      string;
  detectedAt:      number;
  interactionType: AgentInteractionType;
  promptExcerpt:   string;
  suggestedActions: SuggestedInteractionAction[];
  status:          AgentInteractionStatus;
}

export interface InteractionDetectedPayload {
  agentId:          string;
  agentLabel:       string;
  interactionType:  AgentInteractionType;
  promptExcerpt:    string;
  suggestedActions: SuggestedInteractionAction[];
}

export function createAgentInteraction(params: InteractionDetectedPayload): AgentInteraction {
  return {
    interactionId:   crypto.randomUUID(),
    agentId:         params.agentId,
    agentLabel:      params.agentLabel,
    detectedAt:      Date.now(),
    interactionType: params.interactionType,
    promptExcerpt:   params.promptExcerpt,
    suggestedActions: params.suggestedActions,
    status:          "pending",
  };
}
