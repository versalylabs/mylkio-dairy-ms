# Produced vs sold

Built 17 November 2026 (build spec step 3, feature F1). Migration `db/migrations/0010_milk_use.sql`. Code: `lib/produced-sold.ts` (the rules), `lib/produced-copy.ts` (English and Kiswahili wording), `components/milk/ProducedSoldLine.tsx`, `components/milk/MilkUseModal.tsx`, and the figures on Home (`DashboardView`) and the Milk screen (`MilkView`). Tests: `tests/produced-sold.test.ts`, `tests/server/milk-use.test.ts`.

## What the farmer sees

- **Home**, under "Milk sold today": "Produced 120 L · Sold 96 L · 24 L not sold".
- **Milk screen**, a "Produced vs sold" card with Today, This month and Last month.
- Tapping the **not sold** figure opens an optional form: where did that milk go? Home use, calves, spoiled, other. It can stay empty, and a total larger than the unsold milk only gets a gentle note. It never blocks saving and never changes produced or sold. The split is saved for one day (today, or for a month the latest day that has milk recorded) and shown under the figures ("Home use 4 L · Calves 3 L · 2.5 L not accounted for").

## Rules

- **Produced** = the counted milk for the period (the one-counted-total rule in `lib/milk.ts`; voided milk never counts).
- **Sold** = litres delivered to buyers in the period, accepted plus rejected, from deliveries that are not voided. For a month this is every delivery in the month, so it matches Sales.
- **Not sold** = produced minus sold, only when the period has a milk record. With no milk recorded the card says so and shows no "not sold" figure.
- If more was sold than was recorded (more than 0.05 L, for rounding), no negative number is shown: "Sold more than recorded. Check today's milk record."
- Everything is worked out on the phone from the local copy, so it works offline.
- **Workers never see it.** The figures use deliveries, which a worker's phone is never sent, so the card is hidden for the worker role (Home and Milk). The split record itself holds litres only, so the server lets workers read and write it.

## The split record

A new kind of record, `milkUse`, one per date (id `milkuse-YYYY-MM-DD`, so two phones saving the same day land on the same record). It is editable and removable (unlike milk and money, which can only be voided). Saving all zeros removes it. Sync, backup and restore carry it like any other kind of record.

Migration 0010 is additive: it adds `milkUse` to the list of kinds the database accepts (the table check, `apply_farm_operations`, `role_can_read`, `role_can_write`). **Apply it before deploying the app version that uploads `milkUse` records**, or those uploads are refused until it is applied (the rest of the app keeps working, and the refused changes wait in the outbox for review).

## The demo farm

Green Hills shows today (64.5 L produced, 55 L sold, 9.5 L not sold, with 4 L home use and 3 L for the calves accounted for) and last month (a day total each day, a little more than the co-op and household took).

## Not built

A per-period split view (the split is per day), a chart, and any change to how milk or deliveries are recorded.
