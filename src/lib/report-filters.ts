import type { ReportRecord, UserProfile } from "@/types/report";

/**
 * Dashboard filters. Every key maps to a real field on the Firestore report
 * document (see src/types/report.ts); reporter search also matches the
 * name/email resolved from users/{reporterId}.
 */
export interface ReportFilters {
  search: string;
  type: string;
  status: string;
  category: string;
  location: string;
  highValueOnly: boolean;
  from: string;
  to: string;
}
export const emptyFilters: ReportFilters = {
  search: "",
  type: "all",
  status: "all",
  category: "all",
  location: "all",
  highValueOnly: false,
  from: "",
  to: "",
};
export type SortKey = "createdAt" | "date" | "category" | "status";

export type ReporterLookup = ReadonlyMap<string, UserProfile | null>;

export function filterReports(
  records: ReportRecord[],
  filters: ReportFilters,
  reporters: ReporterLookup = new Map(),
) {
  const search = filters.search.trim().toLowerCase();
  return records.filter(({ id, report: r }) => {
    const day = r.date.toDate().toISOString().slice(0, 10);
    const reporter = reporters.get(r.reporterId);
    return (
      (!search ||
        [
          id,
          r.description,
          r.category,
          r.location,
          r.reporterId,
          reporter?.name ?? "",
          reporter?.email ?? "",
        ].some((value) => value.toLowerCase().includes(search))) &&
      (filters.type === "all" || r.type === filters.type) &&
      (filters.status === "all" || r.status === filters.status) &&
      (filters.category === "all" || r.category === filters.category) &&
      (filters.location === "all" || r.location === filters.location) &&
      (!filters.highValueOnly || r.highValueFlag) &&
      (!filters.from || day >= filters.from) &&
      (!filters.to || day <= filters.to)
    );
  });
}

export function sortReports(
  records: ReportRecord[],
  key: SortKey,
  direction: "asc" | "desc",
) {
  return [...records].sort((a, b) => {
    const left = a.report[key],
      right = b.report[key];
    const result =
      typeof left === "string" && typeof right === "string"
        ? left.localeCompare(right)
        : (left as typeof a.report.date).toMillis() -
          (right as typeof b.report.date).toMillis();
    return (direction === "asc" ? result : -result) || a.id.localeCompare(b.id);
  });
}

/**
 * CSV columns: the report fields (minus `verifyAnswer`, which is the secret a
 * claimant is checked against, and `descriptionEmbedding`), plus the document
 * id and the resolved reporter name/email.
 */
const columns = [
  "id",
  "type",
  "category",
  "description",
  "location",
  "date",
  "photoUrl",
  "reporterId",
  "reporterName",
  "reporterEmail",
  "verifyQuestion",
  "status",
  "highValueFlag",
  "matchScore",
  "matchedReportId",
  "createdAt",
] as const;
function csvCell(value: unknown) {
  let text = String(value ?? "");
  // Neutralize spreadsheet formulas, including those preceded by whitespace.
  if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reportsToCsv(
  records: ReportRecord[],
  reporters: ReporterLookup = new Map(),
) {
  return [
    columns.join(","),
    ...records.map(({ id, report }) =>
      columns
        .map((key) => {
          if (key === "id") return csvCell(id);
          if (key === "reporterName")
            return csvCell(reporters.get(report.reporterId)?.name);
          if (key === "reporterEmail")
            return csvCell(reporters.get(report.reporterId)?.email);
          if (key === "date" || key === "createdAt")
            return csvCell(report[key].toDate().toISOString());
          return csvCell(report[key]);
        })
        .join(","),
    ),
  ].join("\r\n");
}
