# Deployment status

Hosting is **live and verified** as of 2026-09-06.

- Production URL: https://lostlink-admin-theta.vercel.app
- Dashboard: https://lostlink-admin-theta.vercel.app/reports
- Vercel project: `dhaksith/lostlink-admin`
- Deployment ID: `dpl_idPtnUEgVfimyoKqWarZqDUscutZ`
- Status: `READY`, production
- Inspector: https://vercel.com/dhaksith/lostlink-admin/idPtnUEgVfimyoKqWarZqDUscutZ
- Remote build: passed, approximately 29 seconds.
- Public HTTP checks: `/reports`, `/login`, `/import`, and `/reports/LL-1048` each returned 200 with the expected page content.
- Initial error-log scan: no error logs returned. This is an initial smoke check, not ongoing monitoring.

CLI device login succeeded as `dhaksith-s`; the directory is linked to the Dhaksith team's project. The normal remote deployment completed successfully.

## Attempts on 2026-09-05

1. Submitted the four-page scaffold through the connected Vercel app before building out the dashboard. The app returned deployment ID `dpl_BAh3Lc4GR1F9ofU55UZ91s9Q6FvX`, but its status API returned 404 and could not provide an authenticated fetch. The returned URL redirects to Vercel sign-in; this is not evidence of a working deployment.
2. Submitted the completed dashboard under the discovered team (`sn13032006-1964s-projects`). Both production and preview creation returned HTTP 403: the connected account does not have permission to create deployments for `lostlink-admin`.
3. Tried Vercel CLI 59.11.7 temporary deployment. Next.js production build and function tracing succeeded. Local packaging failed with Windows `EPERM` while creating a serverless function symlink. No temporary URL was issued.
4. Started Vercel CLI device sign-in and supplied the authorization link in the conversation. Sign-in is required to continue with a normal remote build, which avoids the local Windows packaging problem.

## Future deployments

From this directory, run:

```sh
npx vercel --prod --scope dhaksith
```

The gitignored `.vercel/project.json` now contains the completed project link. No Firebase configuration or application environment variables are required to deploy this sample-data scaffold.

No Git remote or CI deployment pipeline has been configured.

## Local verification

- Production build: passed (all four routes plus root redirect and not-found).
- ESLint: passed.
- Unit tests: 6 passed.
- Browser: desktop workflow passed; mobile workflow passed after fixing horizontal overflow. Covers search, combined filters, pagination reset, sorting, CSV download, detail navigation, placeholder routes, and missing reports.
- Firebase Auth, Firestore, and Storage: installed with placeholder configuration; no live service calls, authentication, or report writes implemented.
