# Phone reminders

Built 24 November 2026 on branch `codex/phone-reminders`. Migration `db/migrations/0015_phone_reminders.sql`. Every plan has it (`reminderPush` in `lib/plans.ts`); it is no longer marked "coming soon".

## What a farmer sees

- **Settings → Phone reminders → Turn on for this phone.** The browser asks for permission once. Each person turns it on per phone (up to 5 phones each); a worker can too. "Turn off" stops it for that phone.
- **One notification each morning, about 6:30 Nairobi time**, only on a day with something due: "Mylkio: 3 reminders today (1 overdue)" and the first three reminder titles, "and 2 more". Tapping it opens Mylkio on Home. The words follow the farm's language (English or Kiswahili).
- It includes the farm's reminders that are not done and are **due today or overdue**. A withdrawal reminder whose date has passed is over, as on Home. **A worker is never sent payment or co-op statement reminders.**
- **iPhone:** notifications work only when Mylkio is added to the Home Screen and opened from there (an Apple rule). The card says so. Android Chrome works in the browser or installed.

## How it works

1. The phone subscribes with the browser's push service using the site's public key, and the subscription (an address plus two keys) is saved by `POST /api/push` (`save_push_subscription`). Turning off deletes it.
2. **Vercel Cron** calls `GET /api/cron/reminders` daily at 03:30 UTC (`vercel.json`). The route accepts only `Authorization: Bearer $CRON_SECRET`.
3. `push_digest_due(today)` returns every phone not yet sent today's summary whose farm has something due, with the reminders. `sendMorningReminders` (`lib/server/push.ts`) sends each with `web-push` (12-hour time to live), marks them sent, and forgets phones the push service reports gone (404/410). Other failures are left for the next day.
4. `public/sw.js` shows the notification (`push`) and opens the app when it is tapped (`notificationclick`).

## Settings (Vercel, Production and Preview)

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the public key; part of the built app), `VAPID_PRIVATE_KEY` (secret), `CRON_SECRET` (secret, 16+ characters). Set 24 November 2026; the private values are stored as Vercel "sensitive" and were never written to this repository. **Changing the key pair turns every phone off** (people must turn reminders on again), so do not rotate it casually. Without the keys, the Settings card says reminders are not available and the job does nothing.

## Limits and things to know

- **Vercel Cron timing:** on the Hobby plan a daily job can run any time within its hour, so "about 6:30" may be up to 7:30.
- The job sends one by one in a single run (a `shortcut:` comment in `lib/server/push.ts`); fine for a pilot's few hundred phones.
- A notification shows the titles of reminders, which can include a cow's name and a payment: visible on a locked phone's screen if the phone shows notification text.
- The reminders sent are those saved to the cloud; one created on a phone with no signal is included once it has synced.
- Not built: a chosen time per farm, SMS reminders (needs a paid SMS provider).

## Tests

`tests/server/push.test.ts` (against the real migrations): saving and removing phones, the 5-phone limit, which reminders each phone gets (worker without payments), nothing on an empty day, once a day, forgetting gone phones, the cron secret, and the wording.

## Community alerts as notifications (migration 0016)

Built 25 November 2026 on branch `codex/alert-notifications`. Uses the same phones and keys as the reminders; nothing to set up.

- **Official alert:** as soon as staff post one, every phone (owner, manager or worker) of every farm in a group of that county gets "Official alert: <title>" with the source. Each alert is its own notification. A withdrawn or expired alert reaches nobody.
- **Outbreak report:** the phones of the group's *other* farms in the *same county* as the report get "Outbreak alert: <area>" with the group, the sign, and "Guidance from neighbours, not a diagnosis. Call a vet if you are worried." Only for a sign **new in that area this week**: later reports of the same thing change the count in the app but do not ring every phone again. The reporting farm is never notified. (Reporting stays closed on live farms until a vet approves the guide, so in practice only official alerts are sent on production for now.)
- Sent right after the request with Next.js `after()`, so posting is never slowed or failed by a phone; a failure is logged. Phones reported gone are forgotten, as for reminders.
- Tests: `tests/server/alert-notifications.test.ts`.
