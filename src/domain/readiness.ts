export type ReadinessFailureKind = "cwd_missing" | "command_missing";

export interface ReadinessFailure {
  kind:    ReadinessFailureKind;
  message: string;
}

export type ReadinessResult =
  | { ok: true }
  | { ok: false; failure: ReadinessFailure };
