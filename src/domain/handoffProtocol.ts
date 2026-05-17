export const HANDOFF_START = "<CMDINO_HANDOFF>";
export const HANDOFF_END = "</CMDINO_HANDOFF>";

export interface HandoffExtraction {
  text: string;
  source: "handoff_marker" | "cmdino_result" | "selected_text" | "none";
}

function extractBetweenMarkers(text: string, start: string, end: string): string | null {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) return null;
  const contentStart = startIndex + start.length;
  const endIndex = text.indexOf(end, contentStart);
  if (endIndex < 0) return null;
  const content = text.slice(contentStart, endIndex).trim();
  return content || null;
}

function extractResultHandoff(text: string): string | null {
  const result = extractBetweenMarkers(text, "CMDINO_RESULT_START", "CMDINO_RESULT_END")
    ?? extractBetweenMarkers(text, "<CMDINO_RESULT>", "</CMDINO_RESULT>");
  if (!result) return null;
  try {
    const parsed = JSON.parse(result) as { handoff?: unknown };
    if (typeof parsed.handoff === "string" && parsed.handoff.trim()) {
      return parsed.handoff.trim();
    }
    if (parsed.handoff && typeof parsed.handoff === "object" && !Array.isArray(parsed.handoff)) {
      const handoff = parsed.handoff as Record<string, unknown>;
      return typeof handoff.message === "string" && handoff.message.trim()
        ? handoff.message.trim()
        : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function extractHandoffText(text: string): HandoffExtraction {
  const marked = extractBetweenMarkers(text, HANDOFF_START, HANDOFF_END);
  if (marked) return { text: marked, source: "handoff_marker" };

  const resultHandoff = extractResultHandoff(text);
  if (resultHandoff) return { text: resultHandoff, source: "cmdino_result" };

  return { text: "", source: "none" };
}

export function extractReviewSendText(input: {
  outputText: string;
  selectedText?: string;
}): HandoffExtraction {
  const fromOutput = extractHandoffText(input.outputText);
  if (fromOutput.text) return fromOutput;

  const selected = input.selectedText?.trim();
  if (selected) {
    const fromSelected = extractHandoffText(selected);
    if (fromSelected.text) return fromSelected;
    return { text: selected, source: "selected_text" };
  }

  return { text: "", source: "none" };
}

export function buildHandoffMarkerInstruction(): string {
  return [
    "For clean handoff forwarding, include exactly one CMDINO_HANDOFF instruction section:",
    "",
    HANDOFF_START,
    "Clean handoff text for the next agent. Do not include terminal banners, logs, prompts, or unrelated output.",
    HANDOFF_END,
  ].join("\n");
}
