"use client";

import { useEffect, useMemo, useState } from "react";
import { cachedProfile, fetchUserProfiles } from "@/lib/reports";
import type { UserProfile } from "@/types/report";

export type ReporterMap = ReadonlyMap<string, UserProfile | null>;

/**
 * Resolves reporter uids to users/{uid} profiles. Lookups are batched (30 per
 * query) and cached for the session, so re-renders and new snapshots only
 * fetch uids the client has never seen.
 */
export function useReporters(uids: string[]) {
  const key = useMemo(() => [...new Set(uids)].sort().join("\n"), [uids]);
  const [version, setVersion] = useState(0);
  const [lookupError, setLookupError] = useState<string | null>(null);
  useEffect(() => {
    const wanted = key ? key.split("\n") : [];
    if (!wanted.some((uid) => cachedProfile(uid) === undefined)) return;
    let cancelled = false;
    fetchUserProfiles(wanted)
      .then(() => {
        if (cancelled) return;
        setLookupError(null);
        setVersion((count) => count + 1);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const code = (error as { code?: string } | null)?.code;
        setLookupError(
          code === "permission-denied"
            ? "Reporter names are hidden: Firestore denied reading the users collection."
            : "Reporter names could not be loaded right now.",
        );
        setVersion((count) => count + 1);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  const reporters = useMemo<ReporterMap>(() => {
    const map = new Map<string, UserProfile | null>();
    for (const uid of key ? key.split("\n") : []) {
      const profile = cachedProfile(uid);
      if (profile !== undefined) map.set(uid, profile);
    }
    return map;
    // `version` bumps whenever the shared cache gains new entries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
  return { reporters, lookupError };
}
