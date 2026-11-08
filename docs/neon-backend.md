# Neon backend

Status: implemented on branch `codex/neon-backend` (8 November 2026). It replaces the Supabase backend from Phase 2.

Set up on 9 November 2026: the Neon project (Frankfurt, Postgres 18) has a `production` branch and a `preview` branch (never auto-deleted). Both migrations were applied to `production` through the console SQL editor and recorded in `public.schema_migrations`, and `preview` was branched from it afterwards, so it has the same schema. A throwaway-farm smoke test on Postgres 18.6 passed: farm creation, owner download, a stranger refused (SQLSTATE 42501) and a record write, all rolled back. Neon Auth is enabled on `preview` only, with the Vercel preview address as a trusted domain, email sign-up on and "Verify at Sign-up" off. Still to do: set the three environment variables in Vercel for the preview, redeploy, and test sign-up end to end. Production has no Auth enabled and no Vercel variables yet.

## How it fits together

- **Sign-in and sessions: Neon Auth** (managed Better Auth). Users and sessions live in the `neon_auth` schema of your Neon database. The browser talks to this site's own `/api/auth/*` route, which proxies to Neon Auth, so the session cookie belongs to your own domain.
- **Farm data: Neon Postgres**, reached only from the server through `DATABASE_URL` (the `@neondatabase/serverless` driver). Browsers never connect to the database.
- **Who is calling:** each API route asks Neon Auth to verify the session cookie, then passes the user's id to a SQL function. The function re-checks that the user owns the farm. A bug in a route therefore cannot expose another farm's records.
- **Next.js 16:** `@neon/auth` requires it, so the project was upgraded from Next 15.

| Route | Purpose |
| --- | --- |
| `/api/auth/*` | Neon Auth: sign-up, sign-in, sign-out, session refresh |
| `GET /api/account/session` | The signed-in user's account, or `needsOnboarding` before their farm exists |
| `POST /api/account/onboard` | Creates the user's farm, trial subscription and farm profile (repeating it returns the existing farm) |
| `POST /api/farms/:id/operations` | Uploads queued record changes (see [per-record-sync.md](per-record-sync.md)) |
| `GET /api/farms/:id/changes?since=N` | Downloads records changed since a device's last sync |
| `/api/admin/accounts` | Administrator account list and subscription changes |

The database schema is in `db/migrations/`:
- `0001_accounts_and_farms.sql`: profiles, farms, memberships, subscriptions, audit log, the record store, farm creation, account lookup and admin functions.
- `0002_record_sync.sql`: idempotent operations and downloads. Milk, delivery, payment, statement, bill and allocation records are append-only.

## Setting it up

You need a Neon account. **Use one Neon project for production and a separate branch for previews**, so a preview deployment can never touch real farm data.

1. **Create the project** in the Neon console. Pick any AWS region; Frankfurt (`aws-eu-central-1`) is the closest to Kenya.
2. **Enable Auth** on the branch (Auth tab) and copy its Auth URL. In Auth settings, keep **Verify email at signup** off for the pilot (see Limits). Add your site as a trusted domain: `https://mylkio-dairy-ms.vercel.app` and `http://localhost:3005` for local work.
3. **Apply the schema.** Either paste `db/migrations/0001_*.sql` then `0002_*.sql` into the Neon SQL editor (no connection string needed; add the two rows to `public.schema_migrations` yourself), or run it from your own machine with the *direct* (non-pooled) connection string:
   ```bash
   DATABASE_URL_UNPOOLED="postgres://…" npm run db:migrate
   ```
   It applies each file once, in order, each in its own transaction, and records it in `public.schema_migrations`. `npm run db:migrate -- --list` shows the files without connecting.
4. **Set the environment variables** in Vercel (Production and Preview use different values; see `.env.example`):
   - `DATABASE_URL`: the *pooled* connection string.
   - `NEON_AUTH_BASE_URL`: the branch's Auth URL.
   - `NEON_AUTH_COOKIE_SECRET`: at least 32 random characters (`openssl rand -base64 32`). Generate it yourself; do not reuse one across environments.
5. **Redeploy.** Until all three variables are set, the app stays in demo mode and `/api/backend-status` reports `{"configured": false}`.

## First administrator

No public route can create an administrator. After the person has signed up and created their farm, promote them directly in the Neon SQL editor:

```sql
update public.profiles set role = 'super_admin' where email = 'person@example.com';
```

## Security notes

- Only the server holds `DATABASE_URL`, and every function that touches farm data takes the verified user id and checks membership. There is no browser-facing database API.
- **There is no row-level security.** Supabase's database enforced farm separation on its own; here, separation rests on the membership check inside the SQL functions plus the server verifying the session. Tests cover both (`tests/server/farm-api.test.ts`, `tests/db/*`). Do not add a second, ad-hoc route that queries farm tables directly.
- Same-origin and JSON-only checks remain on every write route. Neon Auth applies its own protections to `/api/auth/*`.
- Records and the audit log keep the Neon Auth user id as plain text, with no foreign key into `neon_auth`, so this schema does not depend on how Neon Auth lays out its tables.

## Limits and open questions

- **Not run against a real project.** Unit and database tests run on in-memory Postgres. The Neon Auth calls (`signIn.email`, `signUp.email`, `getSession`, the cookie handling) follow Neon's published types and docs but have never talked to a Neon Auth server. Expect to fix small things on the first preview.
- **Email confirmation.** Neon's shared email sender supports confirmation *codes*, not confirmation *links*, and production needs your own SMTP provider. This app has no screen for entering a code, so keep "Verify email at signup" off for the pilot. Add custom SMTP and a code screen before opening sign-up widely. Password reset needs email too.
- **Phone sign-up.** Neon Auth has no phone-first sign-up: a user links a phone number after signing up. Sign-up stays email and password. The phone number is collected as a contact detail.
- **Farm setup after sign-up.** Sign-up details are kept on the device until the account has a session, then the farm is created. If someone signs up on one device and signs in on another before that happens, the app asks them to repeat "Create account" with the same email and password to finish. That path resumes setup rather than failing.
- **Sign-up is open to anyone.** Neon Auth currently has no restricted-sign-up option, so anyone who finds the site can create an account and a trial farm. Fine for a pilot with a few farms; plan a gate (invite code or admin approval) before promoting the site widely.
- **Owner-only writes.** Manager and worker roles are in the schema but not yet permitted to write.
- **Local storage.** Records are still cached in `localStorage` (about 5 MB). IndexedDB is the next offline step.
