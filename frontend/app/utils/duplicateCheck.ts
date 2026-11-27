// The "already taken" check while typing (issue key, issue type name): pure rules for useDuplicateCheck

// How long typing must pause before the check runs
export const DUPLICATE_CHECK_DELAY_MS = 300;
// The react-hook-form error type for a taken value, so only that error is cleared again
export const DUPLICATE_ERROR_TYPE = "duplicate";

export type DuplicateAction = "show" | "clear" | "none";

// Taken → show the error. Free again → clear it, but only if it is our error (not e.g. "required")
export const duplicateAction = (taken: boolean, currentErrorType: string | undefined): DuplicateAction =>
  taken ? "show" : currentErrorType === DUPLICATE_ERROR_TYPE ? "clear" : "none";
