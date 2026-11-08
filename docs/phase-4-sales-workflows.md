# Phase 4: cooperative and household sales workflows

Status: implemented and tested locally on `codex/phase-1-release-foundation` (8 November 2026). Checked in demo mode only; not yet run against a hosted Supabase project.

## Cooperatives

- **Buyer details:** member/supplier number and usual collection centre (buyer form, co-op buyers only).
- **Deliveries:** delivery slip number and a rejection reason when litres are rejected.
- **Monthly statement (Sales → Co-op Statements → Record statement):** enter the figures as printed:
  - statement number and period;
  - accepted litres and rate;
  - bonus;
  - each deduction as its own line (presets for transport, feed advance, AI service, share contribution, loan, vet).
- **Reconciliation:** while typing, the form compares the statement with the farm's own records. Example: "You recorded 985 L; the statement shows 970 L. Review the 15 L difference." It also shows recorded rejections and compares the farm's recorded value against the gross, deductions and net payout.
- **Ledger:** a statement is the authority for its period. In the buyer ledger, one adjustment line brings that period's recorded charges to the statement's net payout. The delivery lines stay visible. A delivery added later for that month does not change what the co-op owes. A voided statement stops counting.
- **Only one per period:** a co-op can have only one active statement for any period. This is checked on the device and on the server.

## Households and other direct customers

- **Monthly bill (Sales → Household Bills):** pick a customer and month. The panel shows the unbilled deliveries, litres and amount, and **Create bill** turns them into a numbered bill (e.g. `B202610-001`) due 7 days after the month ends.
- **No double billing:**
  - A delivery can be on only one active bill. This is enforced on the device and by the server, so it holds even when two phones bill offline.
  - Voiding a bill releases its deliveries to be billed again.
  - A delivery that is on an active bill cannot be voided until the bill is voided.
- **Balances:** bills do not change balances (the deliveries already did). They give the customer a fixed amount and show paid, partly paid and outstanding.
- **Printing:** each bill can be printed. The print stylesheet prints only the document.

## Payments and allocations

- A payment can be applied to an open statement or bill while it is recorded ("Apply to"), or later from the Payments list (**Allocate**).
- Allocations are separate records, so an existing payment can be allocated without editing it. One payment can be split across several items.
- An allocation never exceeds what the payment has left or what the item still owes. Allocations of a voided payment, or to a voided statement or bill, stop counting.
- The payments list shows what each payment was applied to and how much is unlinked. It also explains that unlinked money still reduces the buyer's balance.

## Buyer account statements

Each buyer card has **Account statement**. For any month it shows:
- the balance brought forward;
- each delivery (with rejected litres and slip number), statement adjustment and receipt, with a running balance;
- period totals and the amount due or advance held.

It can be printed.

## Server rules (`supabase/migrations/202611080002_settlements.sql`)

- Adds `statements`, `bills` and `allocations` to per-record sync. All three are append-only: they can only be voided.
- `apply_farm_operations` refuses, as conflicts:
  - a bill containing a delivery already on another active bill (`duplicate`);
  - an overlapping active statement for the same co-op (`duplicate`);
  - an allocation to a missing or voided payment, to another buyer's payment, of a non-positive amount, or beyond the payment's remaining amount (`invalid_allocation`).
- Refused changes appear in the sync review card with an explanation, and can only be discarded.

## Demo data

The demo now has a full previous month:
- daily co-op deliveries with two rejections, and the co-op's statement (15 L short, four itemised deductions);
- a household customer's daily deliveries, not yet billed, plus a part payment that isn't linked to anything yet.

The demo storage namespace moved to `mylkio_demo_v3_`, so earlier demo edits in a browser don't mix with the new data. Real farm data is not affected.

## Tests

- `tests/settlements.test.ts` (14): reconciliation, statement authority in the ledger, overlap detection, bills that can't double-bill, voided deliveries, allocation limits and statuses, voided payments and targets, open-item ordering, and buyer statements with balance brought forward.
- `tests/db/settlements.test.ts` (8): the server-side duplicate-bill, overlapping-statement, append-only and allocation rules in PGlite.
- Full suite: 80 tests.

## Not in this phase

- Household delivery calendars and skipped-delivery tracking.
- Sharing statements by SMS or WhatsApp. Printing and saving as PDF work today.
- Automatic M-Pesa matching. References are still entered by hand, with duplicate warnings.
- A screen to undo an allocation. `voidAllocation` exists in storage but has no button yet.
