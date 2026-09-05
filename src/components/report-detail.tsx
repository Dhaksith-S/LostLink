"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Eye,
  EyeOff,
  FileSearch,
  ImageOff,
  Link2,
  MapPin,
  RefreshCw,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { HighValueBadge, StatusBadge, TypeBadge } from "@/components/badges";
import { ResolveButton } from "@/components/resolve-button";
import { useReporters } from "@/hooks/use-reporters";
import { useReport } from "@/hooks/use-reports";
import { detailUrl } from "@/lib/cloudinary";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ReportDetail({ id }: { id: string }) {
  const { record, loading, error, retry } = useReport(id);
  const reporterId = record?.report.reporterId ?? "";
  const reporterIds = useMemo(
    () => (reporterId ? [reporterId] : []),
    [reporterId],
  );
  const { reporters } = useReporters(reporterIds);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [notice, setNotice] = useState("");

  const back = (
    <Link className="back-link" href="/reports">
      <ArrowLeft size={14} />
      Back to reports
    </Link>
  );

  if (loading) {
    return (
      <>
        {back}
        <section className="detail-card" aria-busy="true">
          <span className="skeleton text" style={{ width: 120 }} />
          <span className="skeleton text" style={{ width: 360, height: 28 }} />
          <div className="detail-grid" style={{ marginTop: 28 }}>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index}>
                <span className="skeleton text" style={{ width: 90 }} />
                <span className="skeleton text" style={{ width: 160 }} />
              </div>
            ))}
          </div>
          <p className="sr-only" role="status">
            Loading report…
          </p>
        </section>
      </>
    );
  }

  if (error) {
    return (
      <>
        {back}
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
      </>
    );
  }

  if (!record) {
    return (
      <>
        {back}
        <section className="detail-card empty-state">
          <span className="empty-icon">
            <FileSearch size={30} />
          </span>
          <h2>Report not found</h2>
          <p>
            No report with id <code>{id}</code> exists in Firestore. It may have
            been deleted.
          </p>
          <Link className="button primary" href="/reports">
            Back to reports
          </Link>
        </section>
      </>
    );
  }

  const { report } = record;
  const reporter = reporters.get(report.reporterId);

  return (
    <>
      {back}
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
      <section className="detail-card" aria-labelledby="detail-title">
        <div className="detail-header">
          <div>
            <div className="detail-badges">
              <TypeBadge type={report.type} />
              <StatusBadge status={report.status} />
              {report.highValueFlag && <HighValueBadge />}
            </div>
            <h1 id="detail-title">
              {report.description || "(No description)"}
            </h1>
            <p className="detail-subtitle">
              <span>{report.category || "Uncategorised"}</span>
              <span className="dot" />
              <span>
                Report <code>{id}</code>
              </span>
            </p>
          </div>
          <div className="detail-actions">
            {report.status !== "resolved" ? (
              <ResolveButton
                reportId={id}
                onError={setActionError}
                onResolved={() => setNotice("Report marked as resolved.")}
              />
            ) : (
              <span className="resolved-note large">Resolved</span>
            )}
          </div>
        </div>

        <div className="detail-body">
          <div className="detail-photo">
            {report.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detailUrl(report.photoUrl)}
                alt={`Photo of ${report.category || "item"}`}
              />
            ) : (
              <div className="photo-placeholder">
                <ImageOff size={28} />
                <span>No photo attached</span>
              </div>
            )}
          </div>
          <dl className="detail-grid">
            <div>
              <dt>
                <MapPin size={13} /> Location
              </dt>
              <dd>{report.location || "—"}</dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={13} /> Item date (UTC)
              </dt>
              <dd>{dateFormat.format(report.date.toDate())}</dd>
            </div>
            <div>
              <dt>
                <User size={13} /> Reported by
              </dt>
              <dd>
                {reporter === undefined && report.reporterId ? (
                  <span className="skeleton text" style={{ width: 120 }} />
                ) : reporter ? (
                  <>
                    <strong>{reporter.name || "Unnamed"}</strong>
                    {reporter.email && (
                      <span className="detail-sub">{reporter.email}</span>
                    )}
                  </>
                ) : (
                  <span className="reporter-missing">Unknown reporter</span>
                )}
                {report.reporterId && (
                  <span className="detail-sub mono" title="Firebase uid">
                    {report.reporterId}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>
                <CalendarDays size={13} /> Submitted
              </dt>
              <dd>{timeFormat.format(report.createdAt.toDate())}</dd>
            </div>
            {report.matchedReportId && (
              <div>
                <dt>
                  <Link2 size={13} /> Matched with
                </dt>
                <dd>
                  <Link
                    className="inline-link"
                    href={`/reports/${report.matchedReportId}`}
                  >
                    {report.matchedReportId}
                    <ArrowUpRight size={13} />
                  </Link>
                  {typeof report.matchScore === "number" && (
                    <span className="pill match">
                      <Sparkles size={11} />
                      {report.matchScore}% match
                    </span>
                  )}
                </dd>
              </div>
            )}
            {report.verifyQuestion && (
              <div className="span-2">
                <dt>Verification question</dt>
                <dd>{report.verifyQuestion}</dd>
              </div>
            )}
            {report.verifyAnswer && (
              <div className="span-2">
                <dt>Expected answer</dt>
                <dd className="secret-row">
                  <span className={showAnswer ? "" : "redacted"}>
                    {showAnswer ? report.verifyAnswer : "••••••••••"}
                  </span>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => setShowAnswer((value) => !value)}
                  >
                    {showAnswer ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showAnswer ? "Hide" : "Reveal"}
                  </button>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </section>
      <p className="export-notice" role="status">
        {notice}
      </p>
    </>
  );
}
