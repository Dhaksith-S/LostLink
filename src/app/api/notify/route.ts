import { NextResponse } from "next/server";
import { getAdminServices } from "@/lib/firebase-admin";
import {
  asString,
  claimRequestCopy,
  newReportCopy,
  TOPIC_ALL_REPORTS,
} from "@/lib/notify-messages";
import { USERS_COLLECTION } from "@/lib/reports";

/**
 * POST /api/notify — fans an app event out as a Firebase Cloud Messaging push.
 *
 * Called fire-and-forget by the Android app (data/notify/NotifyApi.kt) so that
 * pushes work without Cloud Functions or the Blaze plan.
 *
 * SECURITY NOTE: this endpoint deliberately has NO authentication or rate
 * limiting. That is an accepted hackathon simplification, safe only because the
 * request body carries no personal data (a report type, a category, and a uid
 * that is already a document id the app knows) and because the endpoint can
 * only emit fixed, templated copy — a caller cannot choose the text that is
 * sent. It is NOT a hardened production endpoint: anyone who learns the URL can
 * broadcast a "new report" push or ping a uid they already know. Before any
 * real deployment, add a shared secret header or Firebase App Check, plus rate
 * limiting.
 */

// firebase-admin needs Node APIs, so this route must not run on the Edge runtime.
export const runtime = "nodejs";
// Never prerender or cache: every call sends a push.
export const dynamic = "force-dynamic";

/** Always 200: the app must never block or retry on notification delivery. */
const ok = (body: Record<string, unknown>) =>
  NextResponse.json(body, { status: 200 });

/** Broadcasts to every device subscribed to the all_reports topic. */
async function sendNewReport(payload: Record<string, unknown>) {
  const { messaging } = getAdminServices();
  await messaging.send({
    topic: TOPIC_ALL_REPORTS,
    notification: newReportCopy(payload),
  });
  return { sent: true };
}

/** Sends to one user's device, looked up from users/{targetUid}.fcmToken. */
async function sendClaimRequest(payload: Record<string, unknown>) {
  const targetUid = asString(payload.targetUid);
  if (!targetUid) return { sent: false, reason: "missing targetUid" };

  const { db, messaging } = getAdminServices();
  const snapshot = await db.collection(USERS_COLLECTION).doc(targetUid).get();
  const fcmToken = asString(snapshot.data()?.fcmToken);
  // A user who never granted notification permission has no token: not an error.
  if (!fcmToken) return { sent: false, reason: "no fcmToken for user" };

  await messaging.send({
    token: fcmToken,
    notification: claimRequestCopy(payload),
  });
  return { sent: true };
}

export async function POST(request: Request) {
  let type = "";
  try {
    const payload: Record<string, unknown> = await request.json();
    type = asString(payload.type);

    if (type === "new_report") {
      return ok({ ok: true, type, ...(await sendNewReport(payload)) });
    }
    if (type === "claim_request") {
      return ok({ ok: true, type, ...(await sendClaimRequest(payload)) });
    }

    console.warn(`[notify] ignoring unknown type: ${JSON.stringify(type)}`);
    return ok({ ok: false, reason: "unknown type" });
  } catch (error) {
    // Logged to the Vercel runtime logs, but still a 200 so the app never blocks.
    console.error(`[notify] ${type || "request"} failed:`, error);
    return ok({ ok: false, reason: "send failed" });
  }
}

/** Liveness probe; confirms the route is deployed without sending a push. */
export function GET() {
  return ok({
    ok: true,
    endpoint: "notify",
    configured: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()),
  });
}
