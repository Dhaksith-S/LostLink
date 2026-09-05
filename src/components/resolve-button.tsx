"use client";

import { useState } from "react";
import { Check, CheckCheck, X } from "lucide-react";
import { describeFirestoreError, resolveReport } from "@/lib/reports";

interface ResolveButtonProps {
  reportId: string;
  /** Short label for table rows; the detail page uses the longer default. */
  compact?: boolean;
  onError: (message: string) => void;
  onResolved?: () => void;
}

/**
 * Two-step "mark as resolved" control so a stray click during a live demo
 * never resolves a report by accident. Writes `status: "resolved"`.
 */
export function ResolveButton({
  reportId,
  compact = false,
  onError,
  onResolved,
}: ResolveButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    try {
      await resolveReport(reportId);
      setConfirming(false);
      onResolved?.();
    } catch (error) {
      onError(
        describeFirestoreError(error, "The report could not be updated."),
      );
    } finally {
      setPending(false);
    }
  }

  if (confirming) {
    return (
      <span
        className="resolve-confirm"
        role="group"
        aria-label="Confirm resolve"
      >
        <button
          type="button"
          className="button primary small"
          onClick={() => void confirm()}
          disabled={pending}
        >
          {pending ? (
            <span className="spinner small" aria-hidden="true" />
          ) : (
            <CheckCheck size={14} />
          )}
          {pending ? "Saving…" : "Confirm"}
        </button>
        <button
          type="button"
          className="button small"
          onClick={() => setConfirming(false)}
          disabled={pending}
          aria-label="Cancel"
        >
          <X size={14} />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`button small resolve ${compact ? "" : "wide"}`}
      onClick={() => setConfirming(true)}
    >
      <Check size={14} />
      {compact ? "Resolve" : "Mark as resolved"}
    </button>
  );
}
