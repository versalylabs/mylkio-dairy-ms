# Going live with the pilot

This is the checklist for turning on real accounts on the production site. It assumes the preview already works end to end (sign-up, sign-in, saving records, a second device). Work through it in order; each step says how to confirm it.

## Before you start

- The live site at `mylkio-dairy-ms.vercel.app` currently runs the **old Supabase code** from before the Neon move, so sign-in does nothing there. Merging PR #2 replaces it with the Neon code.
- Merging with no production settings in place gives the same result as today: demo only. Merging **after** the settings below gives real accounts. Do the settings first.
- Anyone already using the old site has their records only in their own browser. Nothing in this checklist touches them, but those farmers cannot reach them from the new app until you export and import them (see `docs/release-and-migration.md`). Ask first whether anyone is relying on the live site.

## 1. Neon: production branch

1. Apply migration `db/migrations/0003_leads.sql` to the `production` branch (SQL editor, then add its name to `public.schema_migrations`), or run `npm run db:migrate` with the direct connection string.
2. Better Auth tab on the `production` branch: enable it. Check that **Sign-up with Email** is on and **Verify at Sign-up** is off (until you have your own email sender and a code screen).
3. Settings → Better Auth: add `https://mylkio-dairy-ms.vercel.app` (and your own domain, if you attach one) as a trusted domain. **Turn "Allow Localhost" off** for production.
4. Copy the production branch's Auth URL.

## 2. Vercel: production settings

In Settings → Environment Variables, add these for the **Production** environment only:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the **pooled** connection string of the `production` branch, with "Show password" on |
| `NEON_AUTH_BASE_URL` | the production branch's Auth URL |
| `NEON_AUTH_COOKIE_SECRET` | a **new** random value of 32+ characters. Never reuse the preview's. |
| `SIGNUP_INVITE_CODES` | one or more codes, separated by commas, for the farmers you invite |

Do not set these for Preview. Previews keep using the `preview` branch.

## 3. Check before merging

Production still runs the old code, so you cannot check it yet. Instead, check the **preview** once more after setting its own `SIGNUP_INVITE_CODES`:
- `/api/health` is all `ok`.
- Create Farm Account asks for an invitation code, refuses a wrong one with a clear message, and accepts a right one.
- The contact form on the home page stores a message (it appears under **Website enquiries** for an administrator).

## 4. Merge and verify

1. Merge PR #2 into `main`. Vercel builds production.
2. Open `https://mylkio-dairy-ms.vercel.app/api/health`. Everything should read `ok`. In production the technical detail of a failure is hidden; if something fails, Vercel's runtime logs show the error type.
3. Sign up with your own email and an invitation code. Promote yourself to administrator in the Neon SQL editor on the **production** branch:
   ```sql
   update public.profiles set role = 'super_admin' where email = 'you@example.com';
   ```
4. Sign out and in again to see the administrator screen with accounts and enquiries.
5. Record one milk entry and confirm it appears in Neon on the production branch only.

## 5. Rolling back

- **App problem:** in Vercel, Deployments, promote the previous production deployment (the last one built before the merge). It takes about a minute and does not touch the database.
- **Bad invitation code given out:** remove it from `SIGNUP_INVITE_CODES` and redeploy production. Farms already created are not affected.
- **Do not** delete the production Neon branch or disable Auth to "start over": disabling Auth deletes all its users.

## Inviting farmers

- Make codes long and unguessable (for example `MYLKIO-` plus 8 random characters), one per farmer or group, so any one can be revoked on its own. The code is checked on the server; anyone who guesses one can start a farm, so do not use short or obvious codes.
- Every farmer gets a 14-day trial and an owner account. Their farm and records are separate from every other farm.

## Known limits at launch

- Sign-up with email only; no password reset or email confirmation until a custom email sender is connected in Neon Auth.
- Owner-only writes. Managers and workers come later.
- Records are cached in the browser (about 5 MB). Heavy photo use will hit that limit.
- The website's testimonials are sample content and should be labelled or replaced before promotion.
