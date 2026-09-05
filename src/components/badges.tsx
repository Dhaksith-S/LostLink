import { Check, Star } from "lucide-react";
import type { ReportStatus, ReportType } from "@/types/report";

const statusLabels: Record<ReportStatus, string> = {
  open: "Open",
  matched: "Matched",
  resolved: "Resolved",
};

/** Solid pill, white text: same look as StatusBadge in the Android app. */
export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`pill status ${status}`}>
      {status === "resolved" && <Check size={11} strokeWidth={3} />}
      {statusLabels[status]}
    </span>
  );
}

/** Uppercase solid pill: LOST is red, FOUND is green, as in TypeBadge. */
export function TypeBadge({ type }: { type: ReportType }) {
  return (
    <span className={`pill type ${type}`}>
      {type === "lost" ? "LOST" : "FOUND"}
    </span>
  );
}

/** Amber-light pill with a star, matching HighValueBadge. */
export function HighValueBadge() {
  return (
    <span className="pill high-value">
      <Star size={11} fill="currentColor" />
      High value
    </span>
  );
}
