# Money owed

A "Money owed" tab in Sales. It shows who owes the farm money, since when, and how late it is. It also shows what co-ops take off before they pay.

Why: co-ops pay monthly in arrears and arrears build up (New KCC owed Rift farmers about KSh 300m in 2025). Deductions arrive as lines on a statement, and about half of milk income is cash or credit to local buyers. A farmer needs one place that says who is late, and by how much.

## What each plan sees

- **Every plan:**
  - each buyer who owes money, with the amount;
  - since when it has been unpaid;
  - how many days late the oldest amount is;
  - a farm total with how much of it is late.
- **Farmer and up** (`paymentAgeing` in `lib/plans.ts`):
  - the lateness split into bars: not yet due, 1–30, 31–60, 61–90 and over 90 days, for the farm and for each buyer;
  - the deductions breakdown: what co-op statements of the last 12 months deducted, grouped by name, as a share of the milk value.

## How it is worked out (`lib/money-owed.ts`)

- It is built only from the buyer ledger (`buyerAccount` in `lib/ledger.ts`), so the amount owed always equals the buyer balance shown elsewhere.
- Money received, and credits (a statement paying less than the farmer recorded, an advance), clear the oldest amounts first. The amounts still unpaid add up to the balance.
- **Due dates:**
  - A delivery covered by a co-op statement is due on the statement's payment date, or 15 days after its period if no date was entered.
  - Otherwise, the buyer's payment cycle decides: daily or advance means the same day; weekly means 7 days later; monthly (the default) means the 15th of the next month.
  - An opening balance was already due when the ledger started.
- **Deductions** are grouped by name ignoring case and spaces, so "Transport" and "transport " count as one. Voided statements are ignored.

No new data is stored and there is no database change.

Tests: `tests/money-owed.test.ts`.
