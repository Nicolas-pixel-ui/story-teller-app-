export const INSUFFICIENT_CREDITS_PATH = "/insufficient-credits";

export const CREDIT_DEBIT_FAILED_MESSAGE =
  "Could not use credits right now. Please try again.";

export const CREDIT_REASON_LABELS: Record<string, string> = {
  story_generate: "Create story",
  story_draft_generate: "Generate AI draft",
  scene_generate: "Generate scene draft",
  archetype_suggest: "Archetype suggestion",
  hook_preview: "Generate hooks",
  hook_refine: "Refine hook",
  structure_beat_draft: "Generate AI draft",
  structure_outline: "Structure outline",
  structure_recommend: "Structure recommendation",
  map_analyze: "Map analysis",
  daily_refill: "Daily refill",
  admin_grant: "Admin grant",
  admin_reset_daily_quota: "Reset daily credits",
};

export function creditReasonLabel(reason: string): string {
  return CREDIT_REASON_LABELS[reason] ?? reason.replaceAll("_", " ");
}

export type InsufficientCreditsResponse = { insufficientCredits: true };

export function insufficientCreditsResponse(): InsufficientCreditsResponse {
  return { insufficientCredits: true };
}

export function isInsufficientCreditsPayload(
  value: unknown
): value is InsufficientCreditsResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "insufficientCredits" in value &&
    (value as InsufficientCreditsResponse).insufficientCredits === true
  );
}
