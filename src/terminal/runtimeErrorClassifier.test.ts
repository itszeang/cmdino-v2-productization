import { describe, expect, it } from "vitest";
import {
  classifyOutputAfterExit,
  classifyOutputWhileRunning,
} from "./runtimeErrorClassifier";

describe("runtime error classifier", () => {
  it("classifies Windows CMD command-not-found output", () => {
    const error = classifyOutputAfterExit(
      "'fakecommand' is not recognized as an internal or external command,\r\n" +
      "operable program or batch file.",
    );

    expect(error).toBeTruthy();
    expect(error?.kind).toBe("command_not_found");
    expect(["high", "medium"]).toContain(error?.confidence);
    expect(error?.title.toLowerCase()).toContain("command not found");
  });

  it("classifies Ollama local API EOF as local service unavailable", () => {
    const error = classifyOutputWhileRunning(
      'Error: Post "http://127.0.0.1:11434/api/generate": EOF',
    );

    expect(error).toBeTruthy();
    expect(error?.kind).toBe("service_unavailable");
    expect(`${error?.title} ${error?.message}`.toLowerCase()).toMatch(/ollama|local service/);
    expect(error?.nextAction.toLowerCase()).toContain("health");
  });

  it("does not classify harmless generic error text as a high-confidence runtime error", () => {
    const error = classifyOutputAfterExit("please fix this error in the docs");

    expect(error?.confidence).not.toBe("high");
    expect(error).toBeNull();
  });

  it("classifies permission denied output", () => {
    const error = classifyOutputAfterExit("Access is denied.");

    expect(error).toBeTruthy();
    expect(error?.kind).toBe("permission_denied");
  });

  it("does not classify generic EOF as a service outage", () => {
    const error = classifyOutputAfterExit("EOF");

    expect(error?.kind).not.toBe("service_unavailable");
    expect(error).toBeNull();
  });
});
