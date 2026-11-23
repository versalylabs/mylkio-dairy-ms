# Phase 8: four fixes (build spec issues 9 to 12)

Built 23 November 2026. Migration `db/migrations/0011_subscription_history_and_attempt_limits.sql` (additive). Tests: `tests/server/subscription-history.test.ts`, `tests/server/attempts.test.ts`, `tests/farm-start.test.ts`.

## Issue 9: a history of plan, price and status changes

Until now a hand-made change was kept nowhere: the audit log only said "a subscription was updated". Now every change is written to `subscription_changes` (what it was, what it became, who did it, when) and shown on the account in the administration screen ("Plan, price and status history", under the payments and notes). It cannot be edited or deleted from the app: the only function that reads it is `admin_subscription_history`, administrators only.

What is tracked: plan, status, monthly price, the Custom note and team size, and the paid-until date. A call that changes none of them writes nothing. Three sources are logged: a change made **by hand**, a **payment recorded** (it moves the status to paid and the paid-until date) and a **payment voided** (it moves the date back and may make the account past due), so the account tells the whole story. Changes made before this existed are not in the list.

### A gap from the Custom plan, fixed here

While reading the payment functions for this change I found that **a payment could not be recorded for a Custom farm**: the payment ledger (`admin_record_payment` and the plan check on `subscription_payments`) only knew Starter, Farmer and Farm Pro. The spec said Custom must record payments like any other plan, at its own agreed price; the Custom work in Phase 1 missed this. Migration 0011 allows `custom` in both and a test now records a payment for a Custom farm. Until 0011 is on production, the administration screen refuses to record a payment for a Custom farm (no Custom farm exists there yet).

## Issue 10: a limit on wrong invitation codes

Applies to the pilot's farm-start codes (`POST /api/account/onboard`, only while `SIGNUP_INVITE_CODES` is set) and to team invitation codes (`POST /api/account/join`). After **8** wrong tries from one account, or **30** from one network address, within **15** minutes, the server answers "Too many attempts. Please wait a few minutes and try again." (HTTP 429), without running the check, so the answer is the same whether or not the next code was right.

- Only **wrong** codes count; a right code, or any other failure, never does.
- The count lives in `code_attempts`, so it holds across servers. Rows older than a day are removed as new ones are written.
- The network address (from `x-forwarded-for`, first entry) is stored only as a hash, never the address itself.
- The limit is a safety net: if the count cannot be read or written, the code check simply goes ahead rather than locking a real person out.
- The numbers are named constants in `lib/server/attempts.ts` (`ACCOUNT_MAX_ATTEMPTS`, `IP_MAX_ATTEMPTS`, `ATTEMPT_WINDOW_MINUTES`).

## Issue 11: old cow photos shrink by themselves

The first time the app is opened on a phone after this release, photos saved before shrinking existed are shrunk once, in the background (when the phone is idle). It is skipped for the demo, for a worker (who cannot change cows), and once it has been done for that farm on that phone (`mylkio_photos_auto_shrunk_<farm>`). Each cow is saved through the normal path, so the change syncs like any edit. The "Shrink photos" button in Settings stays.

A bug caught while checking this in the browser: the hook was first placed after the early returns in `app/page.tsx`, which breaks React's rules of hooks and blanked the app. It now sits with the other hooks above them, with a comment saying why.

## Issue 12: a start for a brand-new farm

Home no longer says "Nothing needs your attention today" to a farm with no cows, no milk and nothing to attend to. It shows three first steps instead: **Record milk** (no cow needed), **Add a cow**, **Add a buyer**, each with a button that opens the form, and a tick when done. A step the person may not take is left out (a worker can record milk but not add a cow or a buyer). As soon as there is a cow or any milk, Home is the normal Home. Both languages.
