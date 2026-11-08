# Phase 3: correct records and calculations

Status: implemented on `codex/phase-1-release-foundation` (8 November 2026). Not committed, deployed, or rehearsed against a real farm export yet.

## Rules now enforced

**Dates.** Every farm date is a `YYYY-MM-DD` calendar date in Africa/Nairobi (`lib/dates.ts`). `toISOString()` is no longer used to derive a farm date, so records made between 00:00 and 03:00 get the correct day. Entry forms reset to today's date each time they open.

**Milk (`lib/milk.ts`).** Each date has one counted total:
- A day-total entry covers the whole day. AM/PM entries for that date do not add to it.
- Otherwise, the total is AM + PM, with one counted entry per session. A farm-total entry and a cow-level entry for the same session describe the same milk.
- The record form detects an overlap before saving. The farmer must either choose to replace the earlier record (it is voided, linked to the replacement, and kept in history) or change the date or session. Storage refuses an unresolved overlap.
- Overlaps already in the data (from legacy records or a merge) are not added together. The newest entry counts, the date is flagged on the Milk screen, and the uncounted litres are listed.
- The 7-day average, change versus the previous 7 days, top producer, and per-cow average are calculated from counted records only. Averages are per recorded day, never per milking session. The hardcoded 62.9 L / 4.1% figures are gone.
- Only cows with status `lactating` appear in cow-level entry. Cows under a recorded withdrawal are flagged in that list.

**Money (`lib/ledger.ts`).**
- Buyer balance = opening balance + charges − receipts. It is calculated each time and never edited as a stored total. Positive means the buyer owes the farm; negative means an advance is held.
- Charge = accepted litres (delivered − rejected) × rate ± explicit adjustments. Rejected litres are never billed, and "milk sold" means accepted litres.
- Money taken at delivery becomes exactly one receipt linked to that delivery (`source: 'delivery'`), so cash-received totals include it once.
- Deliveries, payments, and milk records are voided with a reason instead of being deleted. Voiding a delivery also voids the receipt taken with it. A buyer that has ledger history cannot be deleted.
- Dashboard, Sales, and Finance show explicit periods: today, this month, last month, or all time. Billed amounts and cash received are shown separately. The hardcoded "KSh 45,000+" revenue is gone.
- The payment form warns when an M-Pesa/bank reference is already in use (case and spaces ignored) and requires confirmation. The payments list flags likely duplicates: the same reference, or the same buyer, date, and amount.

## Legacy balance migration

When existing buyers are first read, `migrateLegacyLedger` runs once. It is idempotent.
1. It creates one linked receipt for each delivery that recorded `amountPaid` but has no receipt.
2. It sets `openingBalance` so the ledger reproduces the balance the farmer last saw. That opening amount absorbs anything recorded before the ledger existed, including the old "delete delivery" clamp to zero. Review it on the buyer form; nothing is hidden.

The migration writes the buyers and payments buckets. With the current whole-bucket cloud sync, one of those writes can hit a revision conflict while the other succeeds. Phase 6 (per-record sync) removes that risk. Until then, rehearse the migration on a preview project before production.

## Tests

`npm test` runs Vitest (29 tests across `tests/dates.test.ts`, `tests/milk.test.ts`, and `tests/ledger.test.ts`). The tests cover the 30 + 20 + 50 L overlap, farm-total vs cow-level double counting, voided records, per-day cow averages, partial payments, advances, rejected milk, delivery-time payments counted once, month boundaries, duplicate references, and migration idempotency. CI runs the tests after build and typecheck.

## Not in this phase

- Cooperative statements, payment allocation to specific deliveries/settlements, household monthly bills: Phase 4.
- Pregnancy/lactation status transitions (e.g. a pending pregnancy check still marks a cow pregnant): Phase 5.
- Per-record sync and audit history of individual edits: Phase 6.
- Edit-in-place for deliveries and payments. The correction path is void + re-enter.
