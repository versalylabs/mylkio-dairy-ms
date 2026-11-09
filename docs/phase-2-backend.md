# Phase 2 — backend and security foundation

## Current state

The Phase 2 backend was first built on Supabase and moved to **Neon on 8 November 2026**; see [neon-backend.md](neon-backend.md) for the current design and setup. What carried over: server-only API routes, same-origin write checks, Zod input validation, farm membership checked on every request, an audit entry for every change, and account/farm-scoped device caches that keep pending changes until the server acknowledges them. A revision conflict is preserved locally and shown for review. Online updates skip service-worker caching. Existing local farm keys and exports are left in place for the importer; they are not silently adopted into a new account.

Without the Neon environment variables, registration and sign-in remain unavailable and the public demo continues to work from local sample data. This avoids suggesting that a local browser account is a secure cloud identity. A previously authenticated farm can reopen its cached data offline on the same browser. It must authenticate once online before that cache is created.

## External setup required

No Neon project exists yet, no migration has been applied, and the Vercel project has no environment variables. Secure signup, cloud sync, cross-device sync, server farm authorization and administration are therefore not active on the public site. Follow the setup steps in [neon-backend.md](neon-backend.md).

## Deliberate limits

- The main application still uses the lightweight local demo until Neon is configured.
- Operational records use separate tables with stable IDs and farm foreign keys; each app record's detailed fields currently remain in a JSON payload while the relational ledger and normalized fields are delivered in Phase 3.
- Membership roles are represented in the schema. Operational writes are owner-only until worker/manager permissions and interfaces are implemented.
- Legacy exports are preserved but not imported. Do not ask farmers to switch accounts until the importer is delivered and checked against actual exports.
- The marketing site's local lead/testimonial administration has not been migrated as part of this phase.

## Phase 2b — legacy data import and rehearsal tooling

Settings detects old farm keys on the current browser and accepts a versioned JSON backup. It remaps each record's `farmId`, merges records by stable IDs, retains cloud data on mismatched IDs, and reports those conflicts. Before the explicit import confirmation it checks IDs, basic cow/buyer relationships, buyer balance differences, and payload sizes. The JSON export now includes reminders and a schema version. The old keys and source export remain unchanged. Re-running the import is safe for already-matching records.

This remains a client-side import; records from another device must be exported and reviewed before import. Balance differences are warnings for human review, not automatic corrections. Large embedded attachments that exceed the request size limit are blocked for separate handling. No Neon preview branch is configured yet, so cloud conflict and offline reconciliation still require rehearsal before production.
