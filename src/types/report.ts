import type { Timestamp } from "firebase/firestore";

export type ReportType = "lost" | "found";
export type ReportStatus = "open" | "matched" | "resolved";

/**
 * Document shape of the top-level "reports" Firestore collection, mirroring
 * the Android app's Report model (data/model/Report.kt).
 *
 * `descriptionEmbedding` (array of numbers) may also be present on documents;
 * it is deliberately not modelled or displayed anywhere in the admin UI.
 */
export interface Report {
  type: ReportType;
  category: string;
  description: string;
  location: string;
  /** Item date, stored as UTC midnight by the Android date picker. */
  date: Timestamp;
  /** Cloudinary secure delivery URL (not Firebase Storage). */
  photoUrl?: string;
  /** Firebase Auth uid of the reporter; resolve via users/{reporterId}. */
  reporterId: string;
  verifyQuestion?: string;
  verifyAnswer?: string;
  status: ReportStatus;
  highValueFlag: boolean;
  matchScore?: number;
  matchedReportId?: string;
  createdAt: Timestamp;
}

/** Firestore metadata stays outside the persisted Android data model. */
export interface ReportRecord {
  id: string;
  report: Report;
}

/** Document shape of users/{uid}, mirroring UserProfile.kt. */
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
}
