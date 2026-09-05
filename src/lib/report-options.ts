/**
 * Fixed pick-lists shared with the Android Report Form
 * (data/model/ReportOptions.kt). The dashboard merges these with whatever
 * values actually appear in Firestore so older or free-text entries still
 * show up as filter options.
 */
export const reportCategories = [
  "Wallet",
  "ID Card",
  "Electronics",
  "Bag",
  "Keys",
  "Books",
  "Water Bottle",
  "Other",
] as const;

export const reportLocations = [
  "Library",
  "Canteen",
  "Main Gate",
  "Auditorium",
  "Lab Block",
  "Hostel",
  "Parking",
  "Sports Ground",
  "Other",
] as const;

/** Merge a fixed list with observed values, keeping the fixed order first. */
export function mergeOptions(fixed: readonly string[], observed: string[]) {
  const seen = new Set(fixed);
  const extras = [...new Set(observed)]
    .filter((value) => value && !seen.has(value))
    .sort((a, b) => a.localeCompare(b));
  return [...fixed, ...extras];
}
