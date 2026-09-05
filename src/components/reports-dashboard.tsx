"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileStack,
  ImageOff,
  Inbox,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { HighValueBadge, StatusBadge, TypeBadge } from "@/components/badges";
import { ResolveButton } from "@/components/resolve-button";
import { useReporters } from "@/hooks/use-reporters";
import { useReports } from "@/hooks/use-reports";
import { thumbnailUrl } from "@/lib/cloudinary";
import {
  emptyFilters,
  filterReports,
  reportsToCsv,
  sortReports,
  type ReportFilters,
  type SortKey,
} from "@/lib/report-filters";
import {
  mergeOptions,
  reportCategories,
  reportLocations,
} from "@/lib/report-options";
import type { ReportRecord } from "@/types/report";

/** Same "MMM d, yyyy" in UTC as DateFormats.kt. */
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function ReportsDashboard() {
  const { records, loading, error, retry } = useReports();
  const reporterIds = useMemo(
    () => records.map(({ report }) => report.reporterId).filter(Boolean),
    [records],
  );
  const { reporters, lookupError } = useReporters(reporterIds);

  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [expanded, setExpanded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [requestedPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      mergeOptions(
        reportCategories,
        records.map(({ report }) => report.category),
      ),
    [records],
  );
  const locations = useMemo(
    () =>
      mergeOptions(
        reportLocations,
        records.map(({ report }) => report.location),
      ),
    [records],
  );
  const filtered = useMemo(
    () =>
      sortReports(
        filterReports(records, filters, reporters),
        sortKey,
        direction,
      ),
    [records, filters, reporters, sortKey, direction],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Live snapshots can shrink the list; clamp instead of syncing via effect.
  const page = Math.min(requestedPage, pages);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = Object.entries(filters).filter(
    ([key, value]) => value !== emptyFilters[key as keyof ReportFilters],
  ).length;
  const totals = useMemo(
    () => ({
      open: records.filter((r) => r.report.status === "open").length,
      matched: records.filter((r) => r.report.status === "matched").length,
      resolved: records.filter((r) => r.report.status === "resolved").length,
      lost: records.filter((r) => r.report.type === "lost").length,
      found: records.filter((r) => r.report.type === "found").length,
    }),
    [records],
  );

  function update<K extends keyof ReportFilters>(
    key: K,
    value: ReportFilters[K],
  ) {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
    setNotice("");
  }
  function clear() {
    setFilters(emptyFilters);
    setPage(1);
    setNotice("");
  }
  function sort(key: SortKey) {
    setSortKey(key);
    setDirection(key === sortKey && direction === "desc" ? "asc" : "desc");
    setPage(1);
  }
  function exportCsv() {
    const url = URL.createObjectURL(
      new Blob(["﻿", reportsToCsv(filtered, reporters)], {
        type: "text/csv;charset=utf-8;",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `lostlink-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${filtered.length} reports.`);
  }
  function sortLabel(key: SortKey, label: string) {
    return (
      <button type="button" className="table-sort" onClick={() => sort(key)}>
        {label}
        {sortKey === key ? (
          direction === "desc" ? (
            <ArrowDown size={13} />
          ) : (
            <ArrowUp size={13} />
          )
        ) : (
          <ArrowDown size={13} className="muted-icon" />
        )}
      </button>
    );
  }
  function ariaSort(key: SortKey) {
    return sortKey === key
      ? direction === "asc"
        ? "ascending"
        : "descending"
      : "none";
  }
  function reporterCell(reporterId: string) {
    if (!reporterId)
      return <span className="reporter-missing">No reporter</span>;
    const profile = reporters.get(reporterId);
    if (profile === undefined) {
      return (
        <>
          <span className="skeleton text" style={{ width: 96 }} />
          <span className="reporter-id">{reporterId}</span>
        </>
      );
    }
    if (profile === null || (!profile.name && !profile.email)) {
      return (
        <>
          <span className="reporter-name reporter-missing">
            Unknown reporter
          </span>
          <span className="reporter-id" title={reporterId}>
            {reporterId}
          </span>
        </>
      );
    }
    return (
      <>
        <span className="reporter-name">{profile.name || profile.email}</span>
        {profile.name && profile.email && (
          <span className="reporter-email" title={profile.email}>
            {profile.email}
          </span>
        )}
      </>
    );
  }

  const noReportsAtAll = !loading && !error && records.length === 0;
  const noMatches = !loading && !error && records.length > 0 && !rows.length;

  return (
    <>
      <section className="page-heading">
        <div>
          <h1>Reports</h1>
          <p>
            Everything lost. Everything found. One place to bring them together.
          </p>
        </div>
        <Link className="button" href="/import">
          <FileStack size={16} />
          Import backlog
          <ArrowUpRight size={15} />
        </Link>
      </section>

      {error && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Firestore request failed</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="button small" onClick={retry}>
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <div className="error-banner" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>Update failed</strong>
            <p>{actionError}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Dismiss"
            onClick={() => setActionError(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {lookupError && !error && (
        <div className="warning-banner" role="status">
          <AlertCircle size={16} />
          <p>{lookupError}</p>
        </div>
      )}

      <section className="stat-strip" aria-label="Report summary">
        <div className="stat-intro">
          <span className="stat-icon">
            <FileStack size={22} />
          </span>
          <div>
            <strong>
              {loading ? (
                <span className="skeleton text" style={{ width: 60 }} />
              ) : (
                `${records.length} ${records.length === 1 ? "report" : "reports"}`
              )}
            </strong>
            <span>
              {loading
                ? "Connecting to Firestore…"
                : `${totals.lost} lost · ${totals.found} found`}
            </span>
          </div>
        </div>
        {(["open", "matched", "resolved"] as const).map((status) => (
          <button
            type="button"
            key={status}
            className={`stat ${status} ${filters.status === status ? "active" : ""}`}
            aria-pressed={filters.status === status}
            onClick={() =>
              update("status", filters.status === status ? "all" : status)
            }
          >
            <span className={`status-dot ${status}`} />
            <span className="stat-label">
              {status === "open"
                ? "Open"
                : status === "matched"
                  ? "Matched"
                  : "Resolved"}
            </span>
            <strong>
              {loading ? (
                <span className="skeleton text" style={{ width: 28 }} />
              ) : (
                totals[status]
              )}
            </strong>
            <ChevronRight size={16} />
          </button>
        ))}
      </section>

      <section className="reports-panel" aria-label="Reports table">
        <div className="panel-heading">
          <div className="type-tabs" role="group" aria-label="Report type">
            {(["all", "lost", "found"] as const).map((type) => (
              <button
                type="button"
                key={type}
                aria-pressed={filters.type === type}
                onClick={() => update("type", type)}
              >
                {type === "all"
                  ? "All reports"
                  : type === "lost"
                    ? "Lost"
                    : "Found"}
                <span>{type === "all" ? records.length : totals[type]}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="button export-button"
            onClick={exportCsv}
            disabled={!filtered.length}
          >
            <ArrowDownToLine size={16} />
            Export CSV
          </button>
        </div>
        <div className="filter-bar">
          <label className="search-field">
            <Search size={17} />
            <span className="sr-only">Search reports</span>
            <input
              placeholder="Search items, locations, reporters, or report IDs…"
              value={filters.search}
              onChange={(event) => update("search", event.target.value)}
            />
            {filters.search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => update("search", "")}
              >
                <X size={15} />
              </button>
            )}
          </label>
          <label className="filter-select">
            <span className="sr-only">Status</span>
            <select
              aria-label="Status"
              value={filters.status}
              onChange={(event) => update("status", event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="matched">Matched</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <label className="filter-select">
            <span className="sr-only">Category</span>
            <select
              aria-label="Category"
              value={filters.category}
              onChange={(event) => update("category", event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`button ${expanded ? "filter-active" : ""}`}
            aria-expanded={expanded}
            aria-controls="more-filters"
            onClick={() => setExpanded(!expanded)}
          >
            <SlidersHorizontal size={16} />
            Filters
            {activeCount > 0 && (
              <span className="filter-count">{activeCount}</span>
            )}
          </button>
        </div>
        {expanded && (
          <div id="more-filters" className="more-filters">
            <label>
              Location
              <select
                value={filters.location}
                onChange={(event) => update("location", event.target.value)}
              >
                <option value="all">All locations</option>
                {locations.map((location) => (
                  <option key={location}>{location}</option>
                ))}
              </select>
            </label>
            <label>
              Item date from (UTC)
              <input
                type="date"
                value={filters.from}
                onChange={(event) => update("from", event.target.value)}
              />
            </label>
            <label>
              Item date to (UTC)
              <input
                type="date"
                value={filters.to}
                onChange={(event) => update("to", event.target.value)}
              />
            </label>
            <label className="check-filter">
              <input
                type="checkbox"
                checked={filters.highValueOnly}
                onChange={(event) =>
                  update("highValueOnly", event.target.checked)
                }
              />
              <Star size={14} />
              High value only
            </label>
          </div>
        )}
        {activeCount > 0 && (
          <div className="active-filters">
            <span>
              {activeCount} active {activeCount === 1 ? "filter" : "filters"}
            </span>
            <button type="button" onClick={clear}>
              Clear all <X size={13} />
            </button>
            {filters.from && filters.to && filters.from > filters.to && (
              <span role="alert">
                The start date must be on or before the end date.
              </span>
            )}
          </div>
        )}
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable reports"
          aria-busy={loading}
        >
          <table>
            <caption className="sr-only">
              Live lost and found reports from Firestore. Item dates shown in
              UTC. Select an item to see report details.
            </caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Type</th>
                <th scope="col" aria-sort={ariaSort("category")}>
                  {sortLabel("category", "Category")}
                </th>
                <th scope="col" aria-sort={ariaSort("date")}>
                  {sortLabel("date", "Location · item date")}
                </th>
                <th scope="col">Reported by</th>
                <th scope="col" aria-sort={ariaSort("status")}>
                  {sortLabel("status", "Status")}
                </th>
                <th scope="col" className="actions-col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }, (_, index) => (
                  <tr key={`skeleton-${index}`} className="skeleton-row">
                    <td>
                      <div className="item-cell">
                        <span className="skeleton thumb" />
                        <div>
                          <span
                            className="skeleton text"
                            style={{ width: 200 }}
                          />
                          <span
                            className="skeleton text"
                            style={{ width: 110 }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="skeleton pill-shape" />
                    </td>
                    <td>
                      <span className="skeleton text" style={{ width: 80 }} />
                    </td>
                    <td>
                      <span className="skeleton text" style={{ width: 90 }} />
                      <span className="skeleton text" style={{ width: 70 }} />
                    </td>
                    <td>
                      <span className="skeleton text" style={{ width: 120 }} />
                    </td>
                    <td>
                      <span className="skeleton pill-shape" />
                    </td>
                    <td>
                      <span className="skeleton text" style={{ width: 70 }} />
                    </td>
                  </tr>
                ))}
              {!loading &&
                rows.map(({ id, report }: ReportRecord) => (
                  <tr key={id}>
                    <td>
                      <div className="item-cell">
                        {report.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="item-thumb"
                            src={thumbnailUrl(report.photoUrl)}
                            alt=""
                            loading="lazy"
                            width={48}
                            height={48}
                          />
                        ) : (
                          <span
                            className="item-thumb no-photo"
                            aria-hidden="true"
                          >
                            <ImageOff size={16} />
                          </span>
                        )}
                        <div>
                          <Link className="item-link" href={`/reports/${id}`}>
                            {report.description || "(No description)"}
                          </Link>
                          <div className="item-meta">
                            <span
                              title={`Reported ${timeFormat.format(report.createdAt.toDate())}`}
                            >
                              {timeFormat.format(report.createdAt.toDate())}
                            </span>
                            {report.highValueFlag && <HighValueBadge />}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <TypeBadge type={report.type} />
                    </td>
                    <td className="category-cell">{report.category || "—"}</td>
                    <td className="where-cell">
                      <span className="where">{report.location || "—"}</span>
                      <span className="date-cell">
                        {dateFormat.format(report.date.toDate())}
                      </span>
                    </td>
                    <td className="reporter-cell">
                      {reporterCell(report.reporterId)}
                    </td>
                    <td>
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="actions-cell">
                      <div className="row-actions">
                        {report.status !== "resolved" ? (
                          <ResolveButton
                            reportId={id}
                            compact
                            onError={setActionError}
                            onResolved={() =>
                              setNotice(`Marked ${id} as resolved.`)
                            }
                          />
                        ) : (
                          <span className="resolved-note">Resolved</span>
                        )}
                        <Link
                          className="row-open"
                          href={`/reports/${id}`}
                          aria-label={`Open report ${id}`}
                          title="Open report"
                        >
                          <ArrowUpRight size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {loading && (
            <p className="sr-only" role="status">
              Loading reports from Firestore…
            </p>
          )}
          {error && !loading && (
            <div className="empty-state">
              <span className="empty-icon">
                <AlertCircle size={30} />
              </span>
              <h2>Reports couldn’t be loaded</h2>
              <p>{error}</p>
              <button type="button" className="button primary" onClick={retry}>
                <RefreshCw size={15} />
                Try again
              </button>
            </div>
          )}
          {noReportsAtAll && (
            <div className="empty-state">
              <span className="empty-icon">
                <Inbox size={30} />
              </span>
              <h2>No reports yet</h2>
              <p>
                Reports submitted from the LostLink app will appear here the
                moment they are saved.
              </p>
            </div>
          )}
          {noMatches && (
            <div className="empty-state">
              <span className="empty-icon">
                <Search size={30} />
              </span>
              <h2>No reports match these filters</h2>
              <p>
                Try a different search or clear your filters to see all reports.
              </p>
              <button type="button" className="button" onClick={clear}>
                Clear filters
              </button>
            </div>
          )}
        </div>
        <div className="table-footer">
          <span role="status">
            Showing{" "}
            <strong>
              {filtered.length ? (page - 1) * pageSize + 1 : 0}–
              {Math.min(page * pageSize, filtered.length)}
            </strong>{" "}
            of <strong>{filtered.length}</strong> reports
          </span>
          <div className="pagination">
            <label>
              Rows per page
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button
              type="button"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {page} / {pages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      <div className="table-note">
        <span>
          <Star size={13} />
          Electronics and ID cards are flagged high value and may need extra
          verification before handover.
        </span>
        <button
          type="button"
          onClick={() => {
            setSortKey("createdAt");
            setDirection("desc");
            setPage(1);
          }}
        >
          Sort by newest reported <ArrowDown size={12} />
        </button>
      </div>
      <p className="export-notice" role="status">
        {notice}
      </p>
    </>
  );
}
