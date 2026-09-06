# LostLink Admin

Next.js App Router + React + TypeScript admin console for the LostLink campus lost & found system. It shares the `lostlink-b1e1a` Firebase project with the Android app.

## Local development

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. `/` redirects to `/reports`, which redirects to `/login` until you sign in.

## Pages

- `/login`: Firebase Authentication, email/password only. Admin accounts are created in the Firebase console (Authentication → Users); there is no signup form. Signed-in visitors are sent to `/reports`.
- `/reports`: live table over the `reports` collection (real-time `onSnapshot` listener) with search, type/status/category/location/date/high-value filters, sorting, pagination, filtered CSV export, loading skeletons, an empty state, a Firestore error banner with retry, and a per-row "Resolve" action.
- `/reports/[id]`: live report detail with the Cloudinary photo, reporter, match link, verification question/answer, and the resolve action.
- `/import`: backlog import placeholder; no uploads or writes yet.

Every page route except `/login` is protected by a client-side auth guard in `src/components/app-shell.tsx`. The `/api/notify` route is a machine endpoint and is deliberately outside that guard (see below).

## Push notifications

`POST /api/notify` lets the Android app trigger real FCM pushes without Cloud Functions or the Blaze plan. The app calls it fire-and-forget from `data/notify/NotifyApi.kt`.

It accepts two JSON bodies:

- `{ "type": "new_report", "reportType": "lost"|"found", "category": "Keys" }` broadcasts to the `all_reports` topic that every device subscribes to.
- `{ "type": "claim_request", "targetUid": "<uid>", "result": "correct"|"incorrect", "itemCategory": "Keys" }` reads `users/{targetUid}.fcmToken` with the Admin SDK and sends to that one device. If the user has no token stored, it is a no-op, not an error.

The endpoint **always returns HTTP 200**, even on failure, so the app never blocks or retries; failures are logged to the Vercel runtime logs instead. `GET /api/notify` is a liveness probe that reports whether credentials are configured without sending anything.

The notification wording lives in `src/lib/notify-messages.ts` and is unit-tested; the route handler only does I/O.

**Security:** this endpoint has no authentication or rate limiting. That is an accepted hackathon simplification, noted in a comment at the top of the route: the body carries no personal data and the copy is fixed server-side, so a caller cannot choose the text that gets sent. Anyone who learns the URL can still trigger a broadcast. Add a shared secret header or Firebase App Check plus rate limiting before treating this as production.

### Required environment variable

`FIREBASE_SERVICE_ACCOUNT_JSON` must hold the full contents of a Firebase service account key (Firebase Console -> Project Settings -> Service Accounts -> Generate new private key). Set it in the Vercel dashboard under Settings -> Environment Variables; it is read only server-side via `src/lib/firebase-admin.ts` and must never be committed. Without it the endpoint still answers 200 but logs that it is unconfigured.

To run the endpoint locally, put the key in `.env.local` (already gitignored):

```sh
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account", ... }'
```

## Firebase and Android contract

`src/lib/firebase.ts` holds the web app config. Only Auth and Firestore are initialised; photos are Cloudinary URLs, so Firebase Storage is not used.

`src/types/report.ts` mirrors the Android `Report` model (`data/model/Report.kt`): `type`, `category`, `description`, `location`, `date`, `photoUrl`, `reporterId`, `verifyQuestion`, `verifyAnswer`, `status`, `highValueFlag`, `matchScore`, `matchedReportId`, `createdAt`. `date` and `createdAt` are Firestore `Timestamp`s. A `descriptionEmbedding` array may exist on documents and is ignored. `src/lib/reports.ts` converts snapshots with the same fallbacks as `Report.fromDocument`.

Reports store only `reporterId`. The dashboard resolves names and emails from `users/{uid}` (`uid`, `name`, `email`) with batched `documentId() in [...]` queries (30 per request) and a session-wide client cache, so each uid is fetched once.

The only write is `resolveReport(id)`, which sets `status: "resolved"`. Firestore security rules must allow the admin account to read `reports` and `users` and update `reports`.

## Checks

```sh
npm run lint
npm test
npm run build
npm run test:e2e
```

Unit tests cover the schema key contract, Timestamp fields, combined filters, reporter-name search, UTC date boundaries, immutable sorting, CSV escaping, pick-list merging, Cloudinary URL transforms and the push notification copy. Playwright covers the auth redirect, login validation and the mobile login layout without credentials; set `LOSTLINK_E2E_EMAIL` and `LOSTLINK_E2E_PASSWORD` to also run the signed-in dashboard workflow. Install its browser once with `npx playwright install chromium`. Browser tests use a production build (`npm run build` first).

## Deploy

Live dashboard: https://lostlink-admin-theta.vercel.app/reports

This directory is linked to `dhaksith/lostlink-admin` on Vercel. The dashboard needs no environment variables; `/api/notify` needs `FIREBASE_SERVICE_ACCOUNT_JSON` (see above). See `DEPLOYMENT.md`.

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Firebase modular setup](https://firebase.google.com/docs/web/setup).
