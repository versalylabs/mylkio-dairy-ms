# Phase 2 — backend and security foundation

## Current state

The application now supports Supabase Auth through server-only Next.js handlers, HttpOnly cookie sessions, same-origin write requests, Zod input checks, and verified-user lookups. Farm requests check current membership; PostgreSQL Row Level Security independently scopes each farm's records. Writes pass through a revision-checked Postgres function and leave an audit entry. Cloud records are stored in separate farm-scoped tables for cows, buyers, milk entries, deliveries, payments, health events, breeding, expenses, and reminders.

Authenticated devices keep an account/farm scoped localStorage cache and retain pending changes until the server acknowledges them. A revision conflict is preserved locally and shown for review. Online updates skip service-worker caching. Existing local farm keys and exports are left in place for the later importer; they are not silently adopted into a new account.

Without Supabase configuration, registration and sign-in remain unavailable and the public demo continues to work from local sample data. This avoids suggesting that a local browser account is a secure cloud identity. A previously authenticated farm can reopen its cached data offline on the same browser. It must authenticate once online before that cache is created.

## External setup required

The connected Vercel project had no environment variables when checked. No project URL or key was provided, and no migration has been applied to a Supabase project. Therefore secure signup, production cloud sync, cross-device sync, server farm authorization, and administration are not active on the public site yet.

Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `APP_URL` using the private Vercel environment settings. Apply every file in `supabase/migrations/` to the chosen Supabase project, in filename order (`202610270001_security_foundation.sql`, `202611080001_per_record_sync.sql`, then `202611080002_settlements.sql`). Enable email confirmation and set the callback URL to `/auth/callback` on each intended app origin. Keep preview data and Auth projects separate from production. Never put a service role/secret key in the app environment.

After the first administrator signs up and confirms their email, a trusted Supabase project owner must grant that account `super_admin` in `profiles` through a private administrative channel. No public API creates or elevates administrators.

## Deliberate limits

- The main application still uses the lightweight local demo until Supabase is configured.
- Operational records use separate tables with stable IDs and farm foreign keys; each app record's detailed fields currently remain in a JSON payload while the relational ledger and normalized fields are delivered in Phase 3.
- Membership roles are represented in the schema. Operational writes are owner-only until worker/manager permissions and interfaces are implemented.
- Legacy exports are preserved but not imported. Do not ask farmers to switch accounts until the importer is delivered and checked against actual exports.
- The marketing site's local lead/testimonial administration has not been migrated as part of this phase.

## Phase 2b — legacy data import and rehearsal tooling

Settings detects old farm keys on the current browser and accepts a versioned JSON backup. It remaps each record's `farmId`, merges records by stable IDs, retains cloud data on mismatched IDs, and reports those conflicts. Before the explicit import confirmation it checks IDs, basic cow/buyer relationships, buyer balance differences, and payload sizes. The JSON export now includes reminders and a schema version. The old keys and source export remain unchanged. Re-running the import is safe for already-matching records.

This remains a client-side import; records from another device must be exported and reviewed before import. Balance differences are warnings for human review, not automatic corrections. Large embedded attachments that exceed the request size limit are blocked for separate handling. No staging Supabase project is configured yet, so cloud conflict and offline reconciliation still require rehearsal before production.
