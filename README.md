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

Every route except `/login` is protected by a client-side auth guard in `src/components/app-shell.tsx`.

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

Unit tests cover the schema key contract, Timestamp fields, combined filters, reporter-name search, UTC date boundaries, immutable sorting, CSV escaping, pick-list merging and Cloudinary URL transforms. Playwright covers the auth redirect, login validation and the mobile login layout without credentials; set `LOSTLINK_E2E_EMAIL` and `LOSTLINK_E2E_PASSWORD` to also run the signed-in dashboard workflow. Install its browser once with `npx playwright install chromium`. Browser tests use a production build (`npm run build` first).

## Deploy

Live dashboard: https://lostlink-admin-theta.vercel.app/reports

This directory is linked to `dhaksith/lostlink-admin` on Vercel. No application environment variables are required. See `DEPLOYMENT.md`.

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Firebase modular setup](https://firebase.google.com/docs/web/setup).
