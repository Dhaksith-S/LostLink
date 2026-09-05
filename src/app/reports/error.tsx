"use client";
import { AlertCircle, RefreshCw } from "lucide-react";
export default function ReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="placeholder error-state">
      <span className="empty-icon danger">
        <AlertCircle size={30} />
      </span>
      <h1>Reports couldn’t load</h1>
      <p>
        {error.message ||
          "Something went wrong while rendering this page. Try again, and refresh your browser if the problem continues."}
      </p>
      <button type="button" className="button primary" onClick={reset}>
        <RefreshCw size={15} />
        Try again
      </button>
    </section>
  );
}
