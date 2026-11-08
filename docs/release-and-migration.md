# Release and migration plan

## Phase 1 baseline — 27 October 2026

- Repository: https://github.com/versalylabs/mylkio-dairy-ms
- Public deployment: https://mylkio-dairy-ms.vercel.app/
- Baseline commit: `4d4aec2c9b1f4ebe9bf68698ad51dcbb0a2f14b9`.
- Local `main` and remote `main` matched at inspection; working tree was clean.
- Upgrade branch: `codex/phase-1-release-foundation`.
- Local Vercel metadata links project `mylkio-dairy-ms`; configuration specifies Next.js.
- Vercel CLI inspection confirmed production deployment `dpl_2ModeoEwXyjBSgWuQr6JZvDiKgdt` was Ready, created 27 October 2026 at 10:36 EAT. Deployment URL: https://mylkio-dairy-ivmj1t8jw-versaly.vercel.app . The public URL and a `git-main` alias point to it. The CLI emitted an updater-worker timeout but subsequently returned deployment details successfully.
- The Vercel production branch, automatic deployment rules, branch protection, and production deployment commit still require dashboard/API verification. Do not assume the public deployment matches local main.

## Release policy

Local baseline validation passed: `npm run build`, `npm run typecheck`, and `git diff --check`. Build generated five static pages successfully (home route first-load JavaScript: 173 kB). The new GitHub workflow has not run remotely. No push, production deployment, farmer-data backup, or migration was performed in this phase.

Work on upgrade branches. Validate a preview before merging to the production branch. Never run `vercel --prod` as part of routine development. Keep preview data, credentials, and database separate from production. Confirm the configured production branch before the first push that could deploy.

Run `npm ci`, `npm run build`, and `npm run typecheck` before release. The GitHub workflow performs these checks; it does not establish branch protection. Build runs before typecheck because Next.js generates types during the build. The existing `lint` command has no configured ESLint installation; lint setup remains follow-up work and is not represented as a passing check.

## Preserve existing browser records

Records live in localStorage on each device/browser under the live site's origin. They are not stored in GitHub or recovered by a Vercel rollback. Preview URLs have separate browser storage. Do not clear browser storage, change domains, reset demo data, or clear a farm during migration.

Before any migration:

1. Inventory farms and devices used for real records; identify the authoritative copy and any overlapping copies.
2. Use the existing full JSON export on each relevant farm/device. Keep files privately, outside this repository. Existing exports include farm, cows, buyers, milk, deliveries, payments, health, breeding, and expenses.
3. Capture reminders and pending sync operations separately in a controlled local recovery snapshot. The current exporter omits both. Do not include account/session storage: it contains plaintext passwords. Do not upload raw browser storage to GitHub or support tickets.
4. Record entity counts, date ranges, production totals, opening balances, delivery charges, and cash receipts. Check representative records and attachments. Backup existence alone is not proof that restoration works.

No records have been exported from farmers' browsers as part of Phase 1. No migration or restoration has been executed.

## Migration implementation requirements

Implement and test a versioned farm-scoped export and validated importer before changing persistence. Include reminders and attachment handling. Preserve unknown legacy fields in a private migration snapshot rather than silently discarding data.

Import only after authenticating the owner and confirming destination farm membership. Never trust a legacy role, account password, or farm ID as authorization. Require fresh secure account setup; do not migrate plaintext passwords into the new identity system.

Offer a dry-run summary and explicit confirmation. Preserve legacy IDs through an import mapping, validate relationships, and use an import batch ID plus unique legacy identifiers to make retries idempotent. Handle multiple devices with duplicate detection and review instead of blindly merging. Import in a transaction where possible, with recoverable batch state for attachments.

Reconcile financial records before declaring success: legacy buyer balances may contain opening amounts and may disagree with delivery balances or receipts. Delivery-time payments must be represented exactly once. Surface discrepancies for review; do not silently replace balances.

Retain the legacy local copy until counts, totals, links, and sample attachments match and the owner verifies the result. Migration failure must leave the source untouched. Record migration version and batch results without logging personal data or credentials.

## Rollback

Before release, record the current production deployment URL/ID and database schema version, verify a restorable database backup, and identify who can promote the previous deployment in Vercel.

For a UI regression, promote the verified previous deployment using Vercel rollback controls. Verify sign-in, record entry, and existing records afterwards. Service-worker caches can retain old assets: test upgrade and rollback with an already-installed PWA, not just a fresh tab. Avoid deleting localStorage when repairing caches.

Database and browser migrations are separate from application rollback. Use additive schema changes until the previous app can no longer be needed. Do not deploy an older client against incompatible new data. If writes are suspect, pause affected writes, preserve records created since release, and reconcile before restoring a backup. A restore can otherwise discard valid new records.

## Release acceptance scenarios

- Existing live-origin browser data survives upgrade and rollback.
- New account starts empty; demo data remains clearly separate.
- Farm A cannot read/write Farm B through direct server requests.
- Repeated import/sync does not duplicate milk, charges, or receipts.
- Offline entry survives closing/reopening and reconnects safely.
- Account switching cannot send another farm's queued operations.
- Daily and monthly totals use Africa/Nairobi dates and distinguish billed from received.
- Preview checks pass on a small Android layout and an installed PWA.

## Phase 2 status — backend and security foundation

Phase 2 is implemented on the upgrade branch. It adds Supabase Auth routes, RLS-protected farm membership and operational tables, revision-checked writes, and account-scoped local caches. The Vercel project had no environment variables at inspection, so this backend is not active in production.

Before connecting the production domain, apply the schema migration to the intended Supabase project, configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `APP_URL` in private Vercel settings, and confirm Supabase Auth email redirect settings. Use a separate Supabase project and callback origin for preview deployments. Never set a service-role key in the app; this implementation uses the user's cookie-authenticated client and RLS.

The first platform administrator must be promoted out-of-band by a trusted project owner after registering and confirming their account, with a narrowly scoped SQL update to `profiles.role`. Public signup cannot create administrators.

## Phase 2b status — local legacy import and sync preparation

The signed-in farm settings detect legacy tenant keys in the current browser and accept the versioned JSON export. A farmer sees a dry-run summary, basic relationship checks, likely buyer-balance gaps, attachment/request-size warnings, and cloud ID collisions before confirming an ID-based merge. The JSON export includes reminders. The old local copy is retained. Balance differences require human review, and large embedded attachments must be handled separately.

No Supabase migration, cloud import, or production deployment has been performed. The import UI can only exercise real cloud reconciliation after the project schema and Vercel environment are configured. Do not ask farmers to switch accounts or treat the importer as production-ready until a private copy of a real farm export has passed count, relationship, milk-total, delivery, payment, and balance checks.

**Recommended next phase:** configure an isolated Supabase preview project and Vercel preview environment, then rehearse multi-device duplicate review, financial reconciliation, and offline/conflict scenarios with representative farm data. Only after those checks pass should production activation be planned.
