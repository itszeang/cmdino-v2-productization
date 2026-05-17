import { describe, expect, it } from "vitest";
import {
  HEALTH_STATUS_LABELS,
  healthStatusIsBlocker,
  healthStatusIsUsable,
  type HealthStatus,
} from "./health";

const ALL_STATUSES: HealthStatus[] = [
  "ready",
  "missing",
  "auth_required",
  "auth_check_inconclusive",
  "offline",
  "error",
  "unknown",
  "installed",
];

describe("HEALTH_STATUS_LABELS", () => {
  it("has a label for every defined status", () => {
    for (const status of ALL_STATUSES) {
      expect(HEALTH_STATUS_LABELS[status], `missing label for "${status}"`).toBeTruthy();
    }
  });

  it("auth_check_inconclusive is not labeled Auth needed", () => {
    expect(HEALTH_STATUS_LABELS["auth_check_inconclusive"]).not.toBe("Auth needed");
    expect(HEALTH_STATUS_LABELS["auth_check_inconclusive"]).not.toContain("Auth needed");
  });

  it("auth_required is labeled Auth needed", () => {
    expect(HEALTH_STATUS_LABELS["auth_required"]).toBe("Auth needed");
  });
});

describe("healthStatusIsBlocker", () => {
  it("treats missing, auth_required, and error as blockers", () => {
    expect(healthStatusIsBlocker("missing")).toBe(true);
    expect(healthStatusIsBlocker("auth_required")).toBe(true);
    expect(healthStatusIsBlocker("error")).toBe(true);
  });

  it("does not treat auth_check_inconclusive as a blocker", () => {
    expect(healthStatusIsBlocker("auth_check_inconclusive")).toBe(false);
  });

  it("does not treat installed, unknown, or offline as blockers", () => {
    expect(healthStatusIsBlocker("installed")).toBe(false);
    expect(healthStatusIsBlocker("unknown")).toBe(false);
    expect(healthStatusIsBlocker("offline")).toBe(false);
  });
});

describe("healthStatusIsUsable", () => {
  it("ready, installed, and auth_check_inconclusive are usable", () => {
    expect(healthStatusIsUsable("ready")).toBe(true);
    expect(healthStatusIsUsable("installed")).toBe(true);
    expect(healthStatusIsUsable("auth_check_inconclusive")).toBe(true);
  });

  it("missing, auth_required, error are not usable", () => {
    expect(healthStatusIsUsable("missing")).toBe(false);
    expect(healthStatusIsUsable("auth_required")).toBe(false);
    expect(healthStatusIsUsable("error")).toBe(false);
  });

  it("unknown and offline are not usable", () => {
    expect(healthStatusIsUsable("unknown")).toBe(false);
    expect(healthStatusIsUsable("offline")).toBe(false);
  });
});
