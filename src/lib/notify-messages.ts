/**
 * Pure builders for the push copy sent by /api/notify. Kept separate from the
 * route handler so the wording is unit-testable without Firebase credentials.
 */

/** Broadcast topic the Android app subscribes every device to (PushRegistrar.kt). */
export const TOPIC_ALL_REPORTS = "all_reports";

export const asString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

/** Falls back to a neutral noun so copy never reads "New found item posted: ". */
export const categoryLabel = (value: unknown) => asString(value) || "item";

export interface PushCopy {
  title: string;
  body: string;
}

/** Broadcast copy for a newly submitted report. Unknown types read as "found". */
export function newReportCopy(payload: {
  reportType?: unknown;
  category?: unknown;
}): PushCopy {
  const isLost = asString(payload.reportType).toLowerCase() === "lost";
  const category = categoryLabel(payload.category);
  return {
    title: isLost ? "New lost item reported" : "New found item posted",
    body: `${isLost ? "Lost" : "Found"}: ${category}. Tap to see if it matches yours.`,
  };
}

/**
 * Copy for a claim attempt on someone's report. Only an explicit "correct"
 * result produces the positive wording; anything else stays non-committal.
 */
export function claimRequestCopy(payload: {
  result?: unknown;
  itemCategory?: unknown;
}): PushCopy {
  const isCorrect = asString(payload.result).toLowerCase() === "correct";
  const category = categoryLabel(payload.itemCategory);
  return {
    title: isCorrect
      ? "Your item was verified"
      : "Someone tried to claim your item",
    body: isCorrect
      ? `Someone verified your ${category} report!`
      : `Someone attempted to claim your ${category} report`,
  };
}
