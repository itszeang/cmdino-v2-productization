import { useCallback, useState } from "react";
import {
  createPlaceholderProgressMessages,
  createUserTaskMessage,
  type CmdinoChatMessage,
} from "../domain/cmdinoChat";

export function useCmdinoChat(): {
  messages: CmdinoChatMessage[];
  submitTask: (input: {
    text: string;
    projectWorkspaceId?: string;
    agentTeamId?: string;
  }) => void;
  appendMessage: (message: CmdinoChatMessage) => void;
  clearMessages: () => void;
} {
  const [messages, setMessages] = useState<CmdinoChatMessage[]>([]);

  const submitTask = useCallback((input: {
    text: string;
    projectWorkspaceId?: string;
    agentTeamId?: string;
  }) => {
    const trimmed = input.text.trim();
    if (!trimmed) return;
    const userTask = createUserTaskMessage({
      text: trimmed,
      projectWorkspaceId: input.projectWorkspaceId,
      agentTeamId: input.agentTeamId,
    });
    setMessages((prev) => [
      ...prev,
      userTask,
      ...createPlaceholderProgressMessages(),
    ]);
  }, []);

  const appendMessage = useCallback((message: CmdinoChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    submitTask,
    appendMessage,
    clearMessages,
  };
}

