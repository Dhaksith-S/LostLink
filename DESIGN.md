# LostLink Admin visual system

The site shares the Android app's fixed identity (see `ui/theme/Color.kt` in the app): **amber** `#E67E22` is the single accent for primary buttons, active navigation, active filters and highlights; **charcoal** `#1A1A2E` is the dark surface for the sidebar and the sign-in screen; **cream** `#FFF8F0` is the page ground with `#FFFDFA` cards bordered in `#DDD2C2`. Ink `#1F1B16` / muted `#6B6259` carry text on cream; `#BDB5AA` carries muted text on charcoal. Corner radii follow the app's 8 / 12 / 16 / 24 scale.

Status and type badges are solid pills with white bold text, exactly as `Badges.kt` draws them: open `#2E86DE` (blue), matched `#F39C12` (amber), resolved `#27AE60` (green); LOST `#E74C3C` (red), FOUND `#27AE60` (green). High value is an amber-light pill with a star.

Layout is a laptop-first internal tool: a persistent charcoal rail with the amber brand mark, a cream working area, a divided stat strip, then the report ledger. Search is the first control; secondary filters expand inline. Rows carry a Cloudinary thumbnail, two-line description, submission time, type pill, category, location, UTC item date, resolved reporter name and email, status pill, and a two-step "Resolve" action. Loading uses shimmer skeletons, empty and error states use the app's circular amber icon treatment, and Firestore errors surface in a red banner with a retry.

Typography is DM Sans; headings are extra-bold with tight tracking like the app's headline styles. Counts and dates use tabular figures. The desktop rail becomes top navigation on phones and the table scrolls inside its own labelled region. Focus rings, a skip link, and reduced-motion support are kept.

Source of truth: `src/app/globals.css`. Product and scope: `PRODUCT.md`.
