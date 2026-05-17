import { useCallback, useState } from "react";
import type { WorkflowRun, WorkflowRunStep } from "../domain/workflowRun";
import { markCurrentWorkflowStepPromptSent } from "../domain/workflowPromptSend";
import { buildWorkflowFinalSummary } from "../domain/workflowSummary";
import { parseCmdinoResult, type CmdinoResultParseResult } from "./cmdinoResultParser";
import { buildStepPrompt, type BuiltStepPrompt } from "./stepPromptBuilder";
import type { ContextReferenceGroups } from "../domain/contextLibrary";

interface StartRunInput {
  userTask: string;
  projectWorkspaceId?: string;
  agentTeamId?: string;
  steps: Array<{
    id: string;
    label: string;
    agentRole: string;
    preferredProvider?: string;
    agentId?: string;
  }>;
}

export function useWorkflowOrchestrator(): {
  currentRun: WorkflowRun | null;
  startRun: (input: StartRunInput) => WorkflowRun;
  buildPromptForCurrentStep: (input: {
    projectName?: string;
    projectPath?: string;
    agentTeamName?: string;
    contextReferences?: ContextReferenceGroups;
  }) => BuiltStepPrompt | null;
  markCurrentStepPromptSent: (input: { agentId: string; prompt: string }) => void;
  completeCurrentStepFromText: (text: string) => CmdinoResultParseResult;
  continueToNextStep: () => void;
  cancelRun: () => void;
  clearRun: () => void;
  restoreRun: (run: WorkflowRun) => void;
} {
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);

  const startRun = useCallback((input: StartRunInput): WorkflowRun => {
    const now = Date.now();
    const steps: WorkflowRunStep[] = input.steps.map((step, index) => ({
      id: step.id,
      label: step.label,
      agentRole: step.agentRole,
      preferredProvider: step.preferredProvider,
      agentId: step.agentId,
      status: index === 0 ? "waiting_for_approval" : "pending",
    }));
    const firstStep = steps[0];
    const run: WorkflowRun = {
      id: crypto.randomUUID(),
      projectWorkspaceId: input.projectWorkspaceId,
      agentTeamId: input.agentTeamId,
      userTask: input.userTask,
      mode: "checkpoint",
      status: firstStep ? "waiting_for_user" : "completed",
      currentStepId: firstStep?.id,
      steps,
      createdAt: now,
      startedAt: now,
      completedAt: firstStep ? undefined : now,
      finalOutput: firstStep ? undefined : "No workflow steps were configured.",
    };
    setCurrentRun(run);
    return run;
  }, []);

  const buildPromptForCurrentStep = useCallback((input: {
    projectName?: string;
    projectPath?: string;
    agentTeamName?: string;
    contextReferences?: ContextReferenceGroups;
  }): BuiltStepPrompt | null => {
    if (!currentRun?.currentStepId) return null;
    const step = currentRun.steps.find((item) => item.id === currentRun.currentStepId);
    if (!step) return null;
    const completedSteps = currentRun.steps.filter((item) => item.status === "completed");
    return buildStepPrompt({
      projectName: input.projectName,
      projectPath: input.projectPath,
      userTask: currentRun.userTask,
      stepLabel: step.label,
      agentRole: step.agentRole,
      agentTeamName: input.agentTeamName,
      contextReferences: input.contextReferences,
      previousSummaries: completedSteps.map((item) => item.summary ?? "").filter(Boolean),
      previousHandoffs: completedSteps.map((item) => {
        const parsed = item.parsedOutput as { handoff?: unknown } | undefined;
        return typeof parsed?.handoff === "string" ? parsed.handoff : "";
      }).filter(Boolean),
    });
  }, [currentRun]);

  const completeCurrentStepFromText = useCallback((text: string): CmdinoResultParseResult => {
    const parsed = parseCmdinoResult(text);
    if (!parsed.ok) return parsed;

    setCurrentRun((run) => {
      if (!run?.currentStepId) return run;
      const currentStepId = run.currentStepId;
      const now = Date.now();
      const result = parsed.result;
      const nextSteps = run.steps.map((step) => {
        if (step.id !== currentStepId) return step;
        if (result.status === "completed") {
          return {
            ...step,
            status: "completed" as const,
            rawOutput: text,
            parsedOutput: result,
            summary: result.summary,
            completedAt: now,
          };
        }
        if (result.status === "needs_user_action") {
          return {
            ...step,
            status: "needs_intervention" as const,
            rawOutput: text,
            parsedOutput: result,
            summary: result.summary,
            interventionIds: [`manual-${currentStepId}-${now}`],
          };
        }
        return {
          ...step,
          status: "failed" as const,
          rawOutput: text,
          parsedOutput: result,
          summary: result.summary,
          completedAt: now,
        };
      });

      if (result.status === "completed") {
        return {
          ...run,
          status: "waiting_for_user",
          steps: nextSteps,
        };
      }

      if (result.status === "needs_user_action") {
        return {
          ...run,
          status: "paused_for_intervention",
          steps: nextSteps,
        };
      }

      return {
        ...run,
        status: "failed",
        steps: nextSteps,
        completedAt: now,
        finalOutput: result.summary,
      };
    });

    return parsed;
  }, []);

  const markCurrentStepPromptSent = useCallback((input: { agentId: string; prompt: string }) => {
    setCurrentRun((run) => run
      ? markCurrentWorkflowStepPromptSent(run, input)
      : run);
  }, []);

  const continueToNextStep = useCallback(() => {
    setCurrentRun((run) => {
      if (!run?.currentStepId) return run;
      const currentIndex = run.steps.findIndex((step) => step.id === run.currentStepId);
      if (currentIndex < 0) return run;
      const currentStep = run.steps[currentIndex];
      if (currentStep.status !== "completed") return run;

      const nextStep = run.steps.slice(currentIndex + 1).find((step) => step.status === "pending");
      if (!nextStep) {
        const now = Date.now();
        return {
          ...run,
          status: "completed",
          currentStepId: undefined,
          completedAt: now,
          finalOutput: buildWorkflowFinalSummary(run),
        };
      }

      return {
        ...run,
        status: "waiting_for_user",
        currentStepId: nextStep.id,
        steps: run.steps.map((step) => step.id === nextStep.id
          ? { ...step, status: "waiting_for_approval" as const }
          : step),
      };
    });
  }, []);

  const cancelRun = useCallback(() => {
    setCurrentRun((run) => run
      ? { ...run, status: "cancelled", completedAt: Date.now() }
      : run);
  }, []);

  const clearRun = useCallback(() => {
    setCurrentRun(null);
  }, []);

  const restoreRun = useCallback((run: WorkflowRun) => {
    setCurrentRun(run);
  }, []);

  return {
    currentRun,
    startRun,
    buildPromptForCurrentStep,
    markCurrentStepPromptSent,
    completeCurrentStepFromText,
    continueToNextStep,
    cancelRun,
    clearRun,
    restoreRun,
  };
}
