# Phase 9: validate and release

Status: checks run on 15 November 2026 against the live site and the Neon `production` and `preview` branches. Changes in this phase: a Content-Security-Policy header, an updated test tool (no known vulnerabilities left), and this document. No database changes.

This is the record of what was checked, what was found, and what still needs a person. It replaces the pilot steps in `go-live.md`, which describe the move from the old Supabase code and are kept only for history.

## 1. Security review

### What was checked and held up

| Area | Result |
| --- | --- |
| **Signed-out access** | Live: `/api/account/session`, `/api/admin/*`, `/api/farms/<id>/changes` all return 401. `/api/leads` and `/api/farms/*/operations` refuse a request with a foreign or missing `Origin` (403). |
| **Every route** | All 17 API routes read: each one that changes data checks the `Origin` and that the body is JSON, each signed-in route verifies the Neon Auth session on the server, each admin route re-checks the administrator role inside the database function. |
| **Farm separation** | The server passes the verified user id to SQL functions that re-check membership (`tests/server/farm-api.test.ts`, `commercial.test.ts`: another farm's owner gets 403 on read and write). Farm identity is also checked inside every record. |
| **Plan limits** | Symptom checker and vet finder are limited on the **server** (the vets route uses `featuresFor`), not only in the screens. |
| **Database access** | Tables have no grants for anyone but the owner role, and the only roles are Neon's own plus the owner. The Neon Data API is not enabled, so nothing can reach the tables except through the app's server and its connection string. See the note below. |
| **Secrets** | Production has exactly four variables (`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `SIGNUP_INVITE_CODES`), all stored as secrets and Production-only. `NEXT_PUBLIC_SHOW_DRAFT_VET_CONTENT` is **not** set there, so draft vet content cannot show. No keys or connection strings are in the repository or its history. |
| **Neon Auth (production)** | Only `https://mylkio-dairy-ms.vercel.app` is trusted, "Allow Localhost" is off. |
| **Browser code** | No `innerHTML`, `eval` or `dangerouslySetInnerHTML` anywhere. The only outside host the app loads is the Unsplash stock photos. No `console.log` calls. Old plaintext-password accounts in a phone's storage are stripped of the password and removed on first sign-in. |
| **Errors** | Database errors are never sent to the client (connection strings are removed from logs too). `/api/health` shows technical detail only outside production. |
| **Uploads and size** | Request bodies are size-capped while reading, not just by the declared length; records over 1 MB and batches over 500 operations are refused. Enquiry form has a honeypot, strict fields and a database rate limit. |
| **CSV download** | Cells that start with `=`, `+`, `-`, `@` are defused so a farm name cannot run a formula in a spreadsheet. |

### Changed in this phase

- **Content-Security-Policy added** (`next.config.ts`). It stops the pages being framed, stops plugins, limits scripts, connections, fonts and images to this site (plus Unsplash for pictures), and upgrades insecure requests. Production allows no `eval`. Checked in a production build in a real browser: the website, the demo (every tab), the service worker, and photo shrinking (data and blob addresses) all ran with **zero** policy violations. `tests/security-headers.test.ts` guards it.
  - Limit: Next.js writes small inline scripts, so `script-src` still has `'unsafe-inline'`. That makes the policy a safety net rather than a complete defence against injected scripts. Removing it needs per-request nonces, which stops static pages from being cached; not worth it at this size.
- **Test tool updated** (`vitest` 3 to 5). `npm audit` reported 3 issues (2 critical) in the test runner. They never shipped to farmers and our tests run only our own code, but `npm audit` is now clean (0 vulnerabilities) and all tests pass.

### Accepted risks and things to know

1. **The app connects as the database owner.** Isolation rests on the server passing the right user id into functions that re-check membership; the database does not enforce it with row-level security. This is deliberate and tested, but it means a bug in a route that passed the wrong id would be a data leak, and anyone who obtained `DATABASE_URL` could read everything. Keep that string only in Vercel. A later hardening step is a separate, less-privileged database role for the app plus row-level security; it is a database change and was not made here.
2. **Anyone can create a sign-in identity** (Neon Auth sign-up is open), but with no farm that identity can read and write nothing. Creating a **farm** needs an invitation code. The code check has no attempt limit, so **use long random codes** (at least 10 random characters, for example `MYLKIO-` plus 8 to 10 from a random generator). Remove a code from `SIGNUP_INVITE_CODES` to revoke it.
3. **No password reset or email check at sign-up.** Neon Auth sends from its shared address; the production setting has email verification off. A farmer who forgets a password cannot recover it by themselves. Plan to handle it by hand until a Mylkio email sender is connected.
4. **Sign-in and sign-up rate limits belong to Neon Auth** and are not something this code can see or change. Watch the Auth logs in the first weeks.
5. **Admin screens have been tested with generated data and the server tests, not seen signed in on the live site.** Do this once yourself (step 4 below).

## 2. Privacy review

- The Privacy page states what is kept, where (Neon, Frankfurt `aws-eu-central-1`; Vercel for hosting), and that administrators see counts, not farm records. The database design matches that claim: the admin functions return account details, plan and usage figures, not farm records.
- Activity history is purged after 180 days by the database itself (migration 0004), matching the "about six months" on the Privacy page. Farm records are deleted only on request; the farmer's own copy of them is the "Download backup" file.
- **Needs a person, not code:** have a lawyer read `lib/legal.ts` (the liability limit in particular); register with the Office of the Data Protection Commissioner if required for the pilot's size; confirm the support number and email on the site are the ones you will answer; keep vet content as DRAFT until a vet's name and review date are recorded.

## 3. Load and sync checks

Run on the **preview** Neon branch with a throwaway farm (deleted afterwards; the branch holds only its earlier test data again). This measures the database functions, not the network between a phone and Vercel.

| Test | Result |
| --- | --- |
| Write 5,000 milk records in 10 batches of 500 (the largest batch the API accepts) | **about 156 ms per batch** on average, 191 ms worst |
| Replay a batch of 500 already-applied operations (a retry after a dropped connection) | all **500 recognised as repeats**; the farm held exactly 5,001 records (5,000 plus its profile) and 5,000 operation entries, so nothing doubled |
| Read the whole farm back from the start (6 pages of 1,000) | 5 ms in the database |
| Write isolation, retries, conflicts, voids, append-only records | covered by the 309 existing tests (`per-record-sync.md`) |

For scale: a farm milking twice a day makes under 1,000 milk records a year, so 5,000 is several years of one farm's milk, written in one go. Neon's free plan allows 1 GB per branch; each farm's records are small.

Not done: concurrent load from many phones at once, and a test over a real mobile network. Do a small version with the pilot farmers (step 3 below).

## 4. Backups: the weakest point

- Neon's **history window on this project is 6 hours** (free plan). Point-in-time restore cannot recover from a mistake noticed the next day. **No snapshots exist.**
- Phones hold their own copy plus a downloadable backup, and each phone can restore, which is a second safety net, but a phone that has never backed up and has gone offline is not covered.
- **Before the pilot grows:** either move to a plan with a longer history window (7 days or more), or take a Neon snapshot on a schedule (at minimum before each database change and weekly). Until then, keep this risk in mind and remind farmers to use Settings, "Download backup".
- Test one real restore from a snapshot into a new branch before relying on it.

## 5. Tests on real phones (to do by a person)

The checks above ran in a desktop browser and an emulated phone. A real phone test needs a person holding the phone. Use at least one low-cost Android (Chrome) and, if any farmer uses one, an iPhone (Safari). Use the live site, a test farm account, and mobile data, not Wi-Fi.

1. Open the site; it loads in a few seconds; nothing is cut off or overlapping on the home page.
2. Create a farm account with an invitation code; sign out and back in.
3. Add a cow with a photo taken with the phone camera (a big 8 to 12 MP photo). It saves quickly; Settings, "Backup and storage" shows the photo is small.
4. Record a milk entry; add a buyer; record a delivery and a payment.
5. **Add to home screen**, close everything, then **switch on airplane mode** and open the app from the home screen. It must open and show the records. Record a milk entry offline.
6. Switch airplane mode off. The "saved on this device" notice disappears and the entry is in the cloud (open the site on a second device or computer to see it).
7. Download a backup (Settings). Check the file saves to the phone.
8. Rotate the phone; use the keyboard in a form; nothing should be hidden behind it.
9. On an old or small phone, check scrolling and the buttons stay on one line.
10. As administrator on a computer: open the Admin screen, check accounts and enquiries appear, record a test payment on your own test farm, void it, confirm the paid-until date moves and moves back.

Write down the phone model, browser and what went wrong for each failure.

## 6. Release checklist

Everything on production already runs this code (Phases 1 to 8 are merged and live). This list is for confirming a clean state before inviting farmers and for each release after.

Before every release:
- [ ] `npm ci`, `npm run build`, `npm run typecheck`, `npm test` pass (the Validate workflow runs them on every pull request).
- [ ] Vercel preview deployment is Ready and the three checks pass (Vercel, Vercel Preview Comments, validate).
- [ ] If the release has a database migration: applied to the **preview** branch first, tested, then to **production** with the owner's go-ahead, and recorded in `public.schema_migrations`. Take a Neon snapshot first once snapshots are in use. Migrations must be additive so the previous app version still works.
- [ ] After merge: `/api/health` reads `ok` on all four lines, the home page loads, sign-in works, the Settings "Ready for offline" line still says Ready (the service worker cache name changes when cached files change).

One-off, before the first farmers:
- [ ] Backups decision made (section 4).
- [ ] Invitation codes are long and random, one per farmer or group.
- [ ] Real phone tests done (section 5).
- [ ] Administrator screen seen signed in on the live site; at least one administrator besides yourself or a recovery plan if you lose access (2 administrators exist today).
- [ ] Privacy and Terms read by a lawyer; data protection registration decided.
- [ ] Support phone and email answered by a person; WhatsApp link opens the right chat.
- [x] Sample testimonials on the website are labelled "Sample stories" (replace them with real ones when farmers agree).
- [ ] Vet content still DRAFT and hidden from farmers on production; vet directory filled with entries an administrator confirmed by phone.

## 7. Rolling back

- **App problem:** Vercel, Deployments, promote the previous production deployment (about a minute, does not touch the database). Then confirm sign-in and an existing record. The service worker cache is renamed when files change, so phones pick up the older or newer app on their next open.
- **Data problem:** pause writes if possible, keep records made since the release, and reconcile before restoring a Neon backup, because a restore discards newer valid records. With a 6-hour history window, act within hours; after that only a snapshot or a phone's own backup can help.
- **Bad invitation code:** remove it from `SIGNUP_INVITE_CODES` and redeploy.
- **Do not** delete the production Neon branch or switch Neon Auth off: that deletes every user.

## 8. Known gaps carried past release

- Automatic M-Pesa payments and reminders, a history of hand-made plan changes, Kiswahili for the newest screens, vet steps D and E, and some Phase 5 extras (suggested withdrawal from medicine, calf weights and weaning).
- Existing cow photos are shrunk only when the farmer taps "Shrink photos".
- iOS Safari can clear a site's data after weeks without opening it unless the app is on the home screen. The backup is the protection.
- Managers and workers (more than one person per farm) are not built; each farm has one owner login.
