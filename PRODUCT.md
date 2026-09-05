# LostLink Admin

## Platform

Web; responsive Next.js admin dashboard, laptop-first.

## Product

Campus lost & found system with an existing Android app. Administrators sign in, scan, filter and inspect live lost and found reports, and mark reports as resolved. The reports schema matches the Android `Report` model exactly and both clients share one Firebase project (`lostlink-b1e1a`).

## Scope

Four routes: Login (Firebase email/password), Reports Dashboard (real-time Firestore), Report Detail (real-time), Backlog Import (placeholder). All routes except Login require a signed-in admin. Admin accounts are created manually in the Firebase console; there is no signup on the site.

## Working assumptions

Staff use the table primarily on a laptop during daytime office work. A light cream interface with the app's amber accent prioritises scanning. All reports are the initial view unless the user chooses otherwise. Reporter identity is resolved from `users/{reporterId}` and never stored on the report.
