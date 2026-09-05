"use client";

import { useCallback, useEffect, useState } from "react";
import {
  describeFirestoreError,
  subscribeToReport,
  subscribeToReports,
} from "@/lib/reports";
import type { ReportRecord } from "@/types/report";

/**
 * Snapshot state is tagged with the subscription "generation" it came from,
 * so a retry (or a new id) shows the loading state without a synchronous
 * setState inside the effect.
 */
interface ReportsState {
  generation: number;
  records: ReportRecord[];
  error: string | null;
}

/** Live view of the whole reports collection with loading and error states. */
export function useReports() {
  const [generation, setGeneration] = useState(0);
  const [state, setState] = useState<ReportsState>({
    generation: -1,
    records: [],
    error: null,
  });
  useEffect(() => {
    const fail = (error: unknown) =>
      setState((previous) => ({
        generation,
        records: previous.generation === generation ? previous.records : [],
        error: describeFirestoreError(error, "Reports could not load."),
      }));
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToReports(
        (records) => setState({ generation, records, error: null }),
        fail,
      );
    } catch (error) {
      // Initialisation failures (e.g. missing config) are reported like
      // listener errors, outside the synchronous effect body.
      queueMicrotask(() => fail(error));
    }
    return () => unsubscribe?.();
  }, [generation]);
  const retry = useCallback(() => setGeneration((count) => count + 1), []);
  const current = state.generation === generation;
  return {
    records: current ? state.records : [],
    loading: !current,
    error: current ? state.error : null,
    retry,
  };
}

interface ReportState {
  key: string;
  record: ReportRecord | null;
  error: string | null;
}

/** Live view of one report; `record` is `null` once known to be missing. */
export function useReport(id: string) {
  const [generation, setGeneration] = useState(0);
  const key = `${generation}:${id}`;
  const [state, setState] = useState<ReportState>({
    key: "",
    record: null,
    error: null,
  });
  useEffect(() => {
    const fail = (error: unknown) =>
      setState({
        key,
        record: null,
        error: describeFirestoreError(error, "This report could not load."),
      });
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToReport(
        id,
        (record) => setState({ key, record, error: null }),
        fail,
      );
    } catch (error) {
      queueMicrotask(() => fail(error));
    }
    return () => unsubscribe?.();
  }, [id, key]);
  const retry = useCallback(() => setGeneration((count) => count + 1), []);
  const current = state.key === key;
  return {
    /** `undefined` while loading, `null` when the document does not exist. */
    record: current ? state.record : undefined,
    loading: !current,
    error: current ? state.error : null,
    retry,
  };
}
