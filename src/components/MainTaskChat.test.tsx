import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkflowRun } from "../domain/workflowRun";
import { MainTaskChat } from "./MainTaskChat";

function run(): WorkflowRun {
  return {
    id: "run-1",
    userTask: "Build the structured result contract.",
    mode: "checkpoint",
    status: "waiting_for_user",
    currentStepId: "step-1",
    createdAt: 1,
    startedAt: 1,
    steps: [
      {
        id: "step-1",
        label: "Builder",
        agentRole: "builder",
        status: "waiting_for_approval",
      },
    ],
  };
}

describe("MainTaskChat prompt preview", () => {
  it("shows the CMDINO_RESULT contract in the prompt preview", () => {
    render(
      <MainTaskChat
        projectName="cmdino-build"
        projectPath="C:\\Users\\burak\\Desktop\\cmdino-build"
        messages={[]}
        currentRun={run()}
        currentStepPrompt={{
          title: "Builder: builder",
          body: [
            "CMDino execution directive",
            "CMDINO_RESULT_START",
            '{"status":"success","summary":"Done","artifacts":[],"handoff":{"target":"Reviewer","message":"Review this."},"next":[]}',
            "CMDINO_RESULT_END",
          ].join("\n"),
        }}
        onSubmitTask={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview Prompt" }));

    expect(screen.getByText(/CMDINO_RESULT_START/)).toBeTruthy();
    expect(screen.getByText(/CMDINO_RESULT_END/)).toBeTruthy();
    expect(screen.getByText(/"handoff"/)).toBeTruthy();
    expect(screen.getByText(/"next"/)).toBeTruthy();
  });
});
