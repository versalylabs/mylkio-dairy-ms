# Per-record cloud sync

Status: implemented and tested locally on `codex/phase-1-release-foundation` (8 November 2026). Not yet run against a hosted Neon project.

This replaces the bucket-level sync from Phase 2. Under that design, every save uploaded a whole category (for example, all milk entries), and the server deleted and re-inserted every row. That had four problems:
- It stopped working once a category exceeded 10,000 records or 4 MB.
- Two devices recording on the same day blocked each other.
- A delivery and its receipt could be half-saved.
- The audit log could not say which record changed.

## How it works

**Server (`db/migrations/0002_record_sync.sql`)**
- `farm_records` holds one row per record: farm, bucket, id, `version`, `change_seq`, `deleted`, and data. Deletes are kept as tombstones so other devices learn about them.
- `apply_farm_operations(farm, ops)` checks owner membership and serialises writers per farm. It applies each group of operations all-or-nothing:
  - A record that changed since the device's `baseVersion` is reported as a `changed` conflict, together with the server's copy.
  - `sync_operations` stores every applied `opId`. A retried request returns the original result and is never applied twice.
  - Milk, delivery and payment records are append-only. After creation, the only change accepted is a void (`voidedAt`, `voidReason`, `replacedById`). Other edits, deletes and un-voids are refused as `immutable`.
  - Each changed record gets one `audit_logs` row (`record.create`, `record.update`, `record.void`, `record.delete`).
- The database has no browser-facing API: only the server connects, and `apply_farm_operations` and `farm_changes` both check that the verified user owns the farm.
- Rows from the old per-bucket tables are copied into `farm_records`, and the old tables and `write_farm_bucket` are dropped.

**API**
- `POST /api/farms/:farmId/operations`: up to 500 operations or 4 MB, same-origin only, validated with Zod. Each record must belong to the farm in the URL.
- `GET /api/farms/:farmId/changes?since=N`: records changed after change number N, in pages of 1,000.

**Device (`lib/cloud-store.ts`, `lib/sync-core.ts`)**
- Every save goes to this device first. The record-level difference is then queued in an outbox with a new `opId`.
- Actions that touch several kinds of record are uploaded as one group: recording or voiding a delivery (with its receipt), the legacy-ledger migration, and health/breeding events that create reminders or update a cow.
- An operation leaves the outbox only when the server reports it applied. After an acknowledgement, later edits of the same record are rebased onto the new version.
- After uploading, the device downloads only what changed since its last cursor. It never overwrites a record that still has unsent local changes.
- Sync runs after each save, when the connection returns, and when the app comes back to the foreground.
- A record over 1 MB (usually a large embedded photo) is set aside with an explanation, so it cannot block the queue. A group the server refuses is also set aside, and the rest continues.
- Conflicts appear in a review card. **Keep this device's version** re-sends the change on top of the cloud version. **Use the cloud version** discards it. Refused (immutable) changes can only be discarded.
- The cache key includes the account and the farm, so one account's queue is never sent under another account.

## Tests

`npm test` now also runs:
- `tests/sync-core.test.ts`: diffing, batching, acknowledgement and rebasing, downloads that preserve unsent edits, and conflict resolution.
- `tests/db/sync.test.ts`: both migrations run in PGlite (real Postgres compiled to WebAssembly), unmodified. Covers provisioning, versions, retries applied only once, conflicts, all-or-nothing groups, append-only ledger records, tombstones, per-record audit, farm isolation, and row-level security reads.
- `tests/db/two-devices.test.ts`: two simulated devices against the real function. Covers offline entry reaching the other device, a lost response retried without duplication, simultaneous additions, a same-cow conflict resolved in favour of the tablet, and a delivery and receipt saved together or not at all.

## Not covered yet

- No hosted Neon project has run these migrations. PGlite is real Postgres but is not a rehearsal on Neon; do one on a preview branch.
- The browser flow (`CloudStore` with `localStorage`, `fetch` and the review card) was checked only in demo mode, which does not use the cloud. Test it on a preview deployment: record offline, close and reopen offline, reconnect, open on a second device, then edit the same cow on both.
- Local storage is still `localStorage` (about 5 MB per site). Moving to IndexedDB and storing photos outside the record JSON is the next offline step.
- Device caches from the bucket-level design (`mylkio_offline_v2_*`) are left in place and not converted. No production farm used that design, because the backend was never configured on Vercel.
- Writes are owner-only. Manager and worker roles need their own permission rules.
