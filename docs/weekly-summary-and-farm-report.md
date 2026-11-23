# Weekly owner summary and the farm report

Built 23 November 2026 (build spec step 7, features F5 and F6). No database change. Both are for the **Farm Pro and Custom** plans, for **owners and managers** only (they are built from money, so a worker never sees them and the worker's phone is never sent the records they use). Both are worked out on the phone from the local copy, so they work offline.

## F5. Weekly owner summary

Code: `lib/weekly-summary.ts` (rules), `lib/weekly-copy.ts` (English and Kiswahili wording and the share text), `components/dashboard/WeeklySummaryCard.tsx` (the card on Home). Tests: `tests/weekly-summary.test.ts`.

A card on Home, "Last week on your farm", for the last full week, **Monday to Sunday, Africa/Nairobi** (on a Monday it is the week that just ended). It lists:

- Milk produced, with the change against the week before ("down 3% on the week before").
- Milk sold and not sold (the same rules as "Produced vs sold").
- Money billed and money received, kept apart.
- Buyers owing now, with the total.
- Reminders overdue, by count.
- Who recorded what: for each person, the milk, health and breeding records they saved last week.

**Share on WhatsApp** opens WhatsApp with the same figures written out (`https://wa.me/?text=...`); the farmer chooses who receives it, and nothing is sent for them. **Dismiss** hides it for that week (remembered on the phone); the next Monday's summary replaces it. If nothing at all was recorded last week the card is not shown. On a plan without it, nothing is shown on Home (no nagging); the farm report's locked line in Settings names the plan.

The figures use the same functions as Home and Finance (counted milk, the ledger, voided records left out), and a test checks they match for the same dates.

### Who recorded what, and why it is not read from `updated_by`

The server keeps `updated_by` for every record, but the **phone's copy of a record does not carry it**, and the summary has to work offline. So each milk, health and breeding record now carries the name and id of whoever saved it (`recordedBy`), stamped on the phone that saved it (`lib/storage.ts`). A worker's phone stamps the worker, and the owner's phone receives the stamp with the record.

- Records saved **before** this existed have no name and are not counted, so a team farm's first summary may show few or no names.
- The lines appear only on a farm with a team: two or more people have saved records in the last 8 weeks. A farm with no team gets the summary without them.
- A record is counted for the Nairobi day it was saved on (late Sunday UTC is Monday in Kenya).
- Counting uses the stamp, not the server's `updated_by`, so an edit made by someone else is not credited to them. Reading `updated_by` would need the server to send it with each record: a database change, left out on purpose.

## F6. Farm report for a bank or SACCO

Code: `lib/farm-report.ts` (rules), `lib/report-copy.ts` (wording), `components/settings/FarmReportCard.tsx` (the Settings card and the report). Tests: `tests/farm-report.test.ts`.

In Settings, next to export: **Farm report**. It opens a one-page document that prints (or saves as PDF) on **A4**, and only the report prints (the existing print stylesheet, now with `@page { size: A4 }`). The owner chooses the last month; the period is the 12 months up to it.

Contents: farm name, county, owner and phone, the report date and the period; a 12-month table (litres produced, litres sold, amount billed, amount received, expenses) with totals; the herd today (total, lactating, dry, in calf, heifers, calves; groups can overlap); the number of buyers of each type (names only if the owner ticks "Include buyer names"); and the number of months in a row, back from the last month, with milk recorded. Footer: "Prepared from the farmer's own records in Mylkio. Not audited or verified by Mylkio."

Rules: a month with no records of a kind shows a **dash, never a zero**; a total is a dash when no month has figures. No health or treatment detail and no individual cow's data (a test checks the report carries none). Monthly figures match Finance and Sales for the same months.

## The demo farm

The demo is now on Farm Pro so both can be seen. It has recent deliveries and two payments (so last week has billing and cash), and the per-cow milk days are saved alternately by James (the owner) and Mary (a milker), so "who recorded what" has two names.

## Not built

Sending the summary automatically (it is shared by the owner, never sent for them), a PDF generated on the server (the browser's print dialog saves a PDF), and a verified or audited report.
