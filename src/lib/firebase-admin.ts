import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

/**
 * Server-side Firebase Admin access for the /api/notify endpoint.
 *
 * The service account is read only from the FIREBASE_SERVICE_ACCOUNT_JSON
 * environment variable (set in the Vercel dashboard). The key is never
 * committed to the repository and never reaches the browser: this module is
 * imported only by the /api/notify route handler, which runs server-side.
 */
const ADMIN_APP_NAME = "lostlink-admin-sdk";

/** Parses the service account JSON, tolerating the \n-escaped private keys that copy/paste produces. */
function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw?.trim()) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not set. Add the service account key as an environment variable.",
    );
  }
  let parsed: {
    project_id?: string;
    client_email?: string;
    private_key?: string;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the whole downloaded key file, unmodified.",
    );
  }
  const {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  } = parsed;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON is missing project_id, client_email or private_key.",
    );
  }
  return {
    projectId,
    clientEmail,
    // Vercel's UI stores newlines literally when a value is pasted as one line.
    privateKey: privateKey.replace(/\n/g, "\n"),
  };
}

/** Initializes the admin app once per serverless instance and reuses it across invocations. */
export function getAdminServices(): {
  app: App;
  db: Firestore;
  messaging: Messaging;
} {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  const account = existing ? null : readServiceAccount();
  const app =
    existing ??
    initializeApp(
      { credential: cert(account!), projectId: account!.projectId },
      ADMIN_APP_NAME,
    );
  return { app, db: getFirestore(app), messaging: getMessaging(app) };
}
