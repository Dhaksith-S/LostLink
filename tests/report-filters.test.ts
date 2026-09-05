import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";
import {
  emptyFilters,
  filterReports,
  reportsToCsv,
  sortReports,
} from "../src/lib/report-filters";
import { mergeOptions, reportCategories } from "../src/lib/report-options";
import { thumbnailUrl, withTransformation } from "../src/lib/cloudinary";
import type { Report, ReportRecord, UserProfile } from "../src/types/report";

/** Local fixtures shaped exactly like Android's Report.toFirestoreMap(). */
function record(
  id: string,
  overrides: Partial<Report> & { day: string; created: string },
): ReportRecord {
  const { day, created, ...rest } = overrides;
  return {
    id,
    report: {
      type: "lost",
      category: "Wallet",
      description: "Brown leather wallet",
      location: "Library",
      date: Timestamp.fromDate(new Date(`${day}T00:00:00.000Z`)),
      reporterId: "uid-a",
      status: "open",
      highValueFlag: false,
      createdAt: Timestamp.fromDate(new Date(created)),
      ...rest,
    },
  };
}
const fixtures: ReportRecord[] = [
  record("r1", {
    day: "2026-09-05",
    created: "2026-09-05T10:00:00Z",
    type: "found",
    category: "Electronics",
    description: "Silver laptop in a green sleeve",
    highValueFlag: true,
    verifyQuestion: "What sticker is on the lid?",
    verifyAnswer: "a moon",
    photoUrl: "https://res.cloudinary.com/demo/image/upload/v1/abc.jpg",
  }),
  record("r2", {
    day: "2026-09-04",
    created: "2026-09-04T09:00:00Z",
    reporterId: "uid-b",
    status: "matched",
    matchScore: 82,
    matchedReportId: "r1",
  }),
  record("r3", {
    day: "2026-09-05",
    created: "2026-09-05T12:00:00Z",
    category: "Keys",
    location: "Canteen",
    status: "resolved",
    reporterId: "uid-missing",
  }),
];
const reporters = new Map<string, UserProfile | null>([
  ["uid-a", { uid: "uid-a", name: "Dhaksith", email: "dhaksith@example.com" }],
  ["uid-b", { uid: "uid-b", name: "Priya Nair", email: "priya@example.com" }],
  ["uid-missing", null],
]);

test("the report contract retains exactly the Android fields", () => {
  type ExpectedKeys =
    | "type"
    | "category"
    | "description"
    | "location"
    | "date"
    | "photoUrl"
    | "reporterId"
    | "verifyQuestion"
    | "verifyAnswer"
    | "status"
    | "highValueFlag"
    | "matchScore"
    | "matchedReportId"
    | "createdAt";
  const exactKeys: Exclude<keyof Report, ExpectedKeys> extends never
    ? Exclude<ExpectedKeys, keyof Report> extends never
      ? true
      : never
    : never = true;
  assert.equal(exactKeys, true);
  for (const { report } of fixtures) {
    assert.ok(report.date instanceof Timestamp);
    assert.ok(report.createdAt instanceof Timestamp);
    assert.ok(!("id" in report));
    assert.ok(!("reporterRole" in report));
  }
});
test("all reports are present by default; search is trimmed, case insensitive and matches reporter names", () => {
  assert.equal(filterReports(fixtures, emptyFilters).length, 3);
  assert.deepEqual(
    filterReports(fixtures, { ...emptyFilters, search: "  LAPTOP  " }).map(
      (r) => r.id,
    ),
    ["r1"],
  );
  assert.deepEqual(
    filterReports(fixtures, { ...emptyFilters, search: "r2" }).map((r) => r.id),
    ["r2"],
  );
  assert.deepEqual(
    filterReports(
      fixtures,
      { ...emptyFilters, search: "priya" },
      reporters,
    ).map((r) => r.id),
    ["r2"],
  );
  assert.deepEqual(
    filterReports(fixtures, { ...emptyFilters, search: "priya" }).map(
      (r) => r.id,
    ),
    [],
    "reporter name search requires the lookup map",
  );
});
test("type, status, category, location and high-value filters combine", () => {
  assert.deepEqual(
    filterReports(fixtures, {
      ...emptyFilters,
      type: "found",
      status: "open",
      category: "Electronics",
      location: "Library",
      highValueOnly: true,
    }).map((r) => r.id),
    ["r1"],
  );
  assert.deepEqual(
    filterReports(fixtures, { ...emptyFilters, status: "resolved" }).map(
      (r) => r.id,
    ),
    ["r3"],
  );
  assert.ok(!("role" in emptyFilters), "no dead reporter-role filter");
});
test("date boundaries include the entire UTC day and invalid ranges match nothing", () => {
  const results = filterReports(fixtures, {
    ...emptyFilters,
    from: "2026-09-05",
    to: "2026-09-05",
  });
  assert.deepEqual(results.map((r) => r.id).sort(), ["r1", "r3"]);
  assert.equal(
    filterReports(fixtures, {
      ...emptyFilters,
      from: "2026-09-06",
      to: "2026-09-05",
    }).length,
    0,
  );
});
test("sorting handles Timestamp chronology without mutating source", () => {
  const ids = fixtures.map((r) => r.id);
  const result = sortReports(fixtures, "createdAt", "asc");
  assert.deepEqual(
    result.map((r) => r.id),
    ["r2", "r1", "r3"],
  );
  assert.deepEqual(
    fixtures.map((r) => r.id),
    ids,
  );
  assert.equal(sortReports(fixtures, "createdAt", "desc")[0].id, "r3");
  assert.deepEqual(
    sortReports(fixtures, "status", "asc").map((r) => r.report.status),
    ["matched", "open", "resolved"],
  );
});
test("CSV includes id and reporter columns, omits verifyAnswer, escapes quotes and neutralizes formulas", () => {
  const source: ReportRecord[] = [
    {
      id: "example",
      report: {
        ...fixtures[0].report,
        description: '=HYPERLINK("https://example.com")',
        matchScore: 0,
        highValueFlag: false,
      },
    },
  ];
  const csv = reportsToCsv(source, reporters);
  const header = csv.split("\r\n")[0];
  assert.ok(header.startsWith("id,type,category,description,"));
  assert.ok(header.includes("reporterName,reporterEmail"));
  assert.ok(!header.includes("verifyAnswer"));
  assert.ok(!header.includes("reporterRole"));
  assert.ok(csv.includes(`"'=HYPERLINK(""https://example.com"")"`));
  assert.ok(csv.includes('"Dhaksith","dhaksith@example.com"'));
  assert.ok(csv.includes('"false","0"'));
  assert.ok(csv.includes("2026-09-05T10:00:00.000Z"));
  assert.ok(!csv.includes("a moon"));
  assert.equal(reportsToCsv([]).split("\r\n").length, 1);
});
test("pick-list options merge Android defaults with observed values", () => {
  const merged = mergeOptions(reportCategories, [
    "Umbrella",
    "Keys",
    "",
    "Bag",
  ]);
  assert.equal(merged.length, reportCategories.length + 1);
  assert.equal(merged.at(-1), "Umbrella");
  assert.deepEqual(merged.slice(0, 3), ["Wallet", "ID Card", "Electronics"]);
});
test("Cloudinary transformations insert after /upload/ and never double-apply", () => {
  const url = "https://res.cloudinary.com/demo/image/upload/v1/abc.jpg";
  const thumb = thumbnailUrl(url);
  assert.ok(thumb.includes("/upload/w_200,"));
  assert.equal(thumbnailUrl(thumb), thumb);
  assert.equal(
    withTransformation("https://example.com/photo.jpg", "w_200"),
    "https://example.com/photo.jpg",
  );
});
