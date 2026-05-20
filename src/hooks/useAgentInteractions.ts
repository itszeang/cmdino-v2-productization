import { useState, useCallback } from "react";
import { createAgentInteraction } from "../domain/agentInteraction";
import type {
  AgentInteraction,
  InteractionDetectedPayload,
} from "../domain/agentInteraction";

const MAX_INTERACTIONS = 60;

export function useAgentInteractions() {
  const [interactions, setInteractions] = useState<AgentInteraction[]>([]);

  const addInteraction = useCallback((params: InteractionDetectedPayload) => {
    setInteractions((prev) => {
      // Deduplicate: same agent + same excerpt already pending → skip
      const hasSimilar = prev.some(
        (existing) =>
          existing.status === "pending" &&
          existing.agentId === params.agentId &&
          existing.promptExcerpt === params.promptExcerpt,
      );
      if (hasSimilar) return prev;
      const next = [...prev, createAgentInteraction(params)];
      return next.length > MAX_INTERACTIONS ? next.slice(-MAX_INTERACTIONS) : next;
    });
  }, []);

  const markResponded = useCallback((interactionId: string) => {
    setInteractions((prev) =>
      prev.map((i) =>
        i.interactionId === interactionId ? { ...i, status: "responded" as const } : i,
      ),
    );
  }, []);

  const dismissInteraction = useCallback((interactionId: string) => {
    setInteractions((prev) =>
      prev.map((i) =>
        i.interactionId === interactionId ? { ...i, status: "dismissed" as const } : i,
      ),
    );
  }, []);

  const clearForAgent = useCallback((agentId: string) => {
    setInteractions((prev) => prev.filter((i) => i.agentId !== agentId));
  }, []);

  const pendingInteractions = interactions.filter((i) => i.status === "pending");

  return {
    interactions,
    pendingInteractions,
    pendingCount: pendingInteractions.length,
    addInteraction,
    markResponded,
    dismissInteraction,
    clearForAgent,
  };
}
