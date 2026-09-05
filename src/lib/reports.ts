import {
  collection,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
  type FirestoreError,
} from "firebase/firestore";
import { getFirebaseServices } from "@/lib/firebase";
import type {
  Report,
  ReportRecord,
  ReportStatus,
  ReportType,
  UserProfile,
} from "@/types/report";

export const REPORTS_COLLECTION = "reports";
export const USERS_COLLECTION = "users";

const statuses: ReportStatus[] = ["open", "matched", "resolved"];
const types: ReportType[] = ["lost", "found"];

function asTimestamp(value: unknown): Timestamp | undefined {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === "number") return Timestamp.fromMillis(value);
  if (typeof value === "string" && value) {
    const millis = Date.parse(value);
    if (!Number.isNaN(millis)) return Timestamp.fromMillis(millis);
  }
  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    const { seconds, nanoseconds } = value as {
      seconds: number;
      nanoseconds?: number;
    };
    return new Timestamp(seconds, nanoseconds ?? 0);
  }
  return undefined;
}
const asString = (value: unknown) =>
  typeof value === "string" ? value : undefined;
const asNonBlank = (value: unknown) => asString(value)?.trim() || undefined;

/**
 * Converts a Firestore document into a Report, applying the same fallbacks
 * as Report.fromDocument in the Android app (unknown type -> lost, unknown
 * status -> open, missing timestamps -> now). `descriptionEmbedding` is
 * ignored on purpose.
 */
export function reportFromSnapshot(
  snapshot: DocumentSnapshot,
): ReportRecord | null {
  const data = snapshot.data({ serverTimestamps: "estimate" });
  if (!data) return null;
  const type = asString(data.type) as ReportType;
  const status = asString(data.status) as ReportStatus;
  const report: Report = {
    type: types.includes(type) ? type : "lost",
    category: asString(data.category) ?? "",
    description: asString(data.description) ?? "",
    location: asString(data.location) ?? "",
    date: asTimestamp(data.date) ?? Timestamp.now(),
    reporterId: asString(data.reporterId) ?? "",
    status: statuses.includes(status) ? status : "open",
    highValueFlag: data.highValueFlag === true,
    createdAt: asTimestamp(data.createdAt) ?? Timestamp.now(),
  };
  const photoUrl = asNonBlank(data.photoUrl);
  if (photoUrl) report.photoUrl = photoUrl;
  const verifyQuestion = asNonBlank(data.verifyQuestion);
  if (verifyQuestion) report.verifyQuestion = verifyQuestion;
  const verifyAnswer = asNonBlank(data.verifyAnswer);
  if (verifyAnswer) report.verifyAnswer = verifyAnswer;
  if (typeof data.matchScore === "number") report.matchScore = data.matchScore;
  const matchedReportId = asNonBlank(data.matchedReportId);
  if (matchedReportId) report.matchedReportId = matchedReportId;
  return { id: snapshot.id, report };
}

/** Real-time listener over the whole reports collection. */
export function subscribeToReports(
  onData: (records: ReportRecord[]) => void,
  onError: (error: FirestoreError) => void,
) {
  const { db } = getFirebaseServices();
  return onSnapshot(
    collection(db, REPORTS_COLLECTION),
    (snapshot) => {
      const records: ReportRecord[] = [];
      for (const document of snapshot.docs) {
        const record = reportFromSnapshot(document);
        if (record) records.push(record);
      }
      onData(records);
    },
    onError,
  );
}

/** Real-time listener over one report; `null` means it does not exist. */
export function subscribeToReport(
  id: string,
  onData: (record: ReportRecord | null) => void,
  onError: (error: FirestoreError) => void,
) {
  const { db } = getFirebaseServices();
  return onSnapshot(
    doc(db, REPORTS_COLLECTION, id),
    (snapshot) =>
      onData(snapshot.exists() ? reportFromSnapshot(snapshot) : null),
    onError,
  );
}

/** The only admin write for now: mark a report as resolved. */
export function resolveReport(id: string) {
  const { db } = getFirebaseServices();
  return updateDoc(doc(db, REPORTS_COLLECTION, id), {
    status: "resolved" satisfies ReportStatus,
  });
}

/* ---------- Reporter profile lookups (users/{uid}) ---------- */

/** Firestore allows at most 30 values in an `in` filter. */
const IN_LIMIT = 30;
/** Client-side cache: uid -> profile (null when the document is missing). */
const profileCache = new Map<string, UserProfile | null>();
const inFlight = new Map<string, Promise<void>>();

export function cachedProfile(uid: string) {
  return profileCache.get(uid);
}

/**
 * Fetches the users/{uid} documents for every uid not already cached, in
 * batches of 30 using a single `documentId() in [...]` query per batch.
 * Concurrent calls for the same uid share one request.
 */
export async function fetchUserProfiles(uids: Iterable<string>) {
  const unique = [...new Set(uids)].filter(Boolean);
  const wanted = unique.filter(
    (uid) => !profileCache.has(uid) && !inFlight.has(uid),
  );
  const pending = new Set<Promise<void>>();
  for (const uid of unique) {
    const existing = inFlight.get(uid);
    if (existing) pending.add(existing);
  }
  if (wanted.length) {
    const { db } = getFirebaseServices();
    for (let start = 0; start < wanted.length; start += IN_LIMIT) {
      const batch = wanted.slice(start, start + IN_LIMIT);
      const request = getDocs(
        query(
          collection(db, USERS_COLLECTION),
          where(documentId(), "in", batch),
        ),
      )
        .then((snapshot) => {
          const found = new Set<string>();
          for (const document of snapshot.docs) {
            const data = document.data();
            found.add(document.id);
            profileCache.set(document.id, {
              uid: asString(data.uid) ?? document.id,
              name: asString(data.name)?.trim() ?? "",
              email: asString(data.email)?.trim() ?? "",
            });
          }
          for (const uid of batch) {
            if (!found.has(uid)) profileCache.set(uid, null);
          }
        })
        .finally(() => {
          for (const uid of batch) inFlight.delete(uid);
        });
      for (const uid of batch) inFlight.set(uid, request);
      pending.add(request);
    }
  }
  await Promise.all(pending);
  const result = new Map<string, UserProfile | null>();
  for (const uid of unique) result.set(uid, profileCache.get(uid) ?? null);
  return result;
}

/* ---------- Error messages ---------- */

/** Mirrors ErrorMessages.kt so the app and site speak the same language. */
export function describeFirestoreError(error: unknown, fallback: string) {
  const code = (error as { code?: string } | null)?.code ?? "";
  if (code === "permission-denied")
    return "Firestore denied the request. Check the security rules in your Firebase console and make sure this admin account may read and update reports.";
  if (code === "unavailable")
    return "Firestore is unreachable right now. Check your connection and try again.";
  if (code === "unauthenticated")
    return "Your session has expired. Sign in again to keep working.";
  if (code === "failed-precondition")
    return "Firestore needs an index for this query. Open the Firebase console to create it.";
  const message = (error as { message?: string } | null)?.message;
  return message?.trim() || fallback;
}
