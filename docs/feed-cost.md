# Feed cost

A "Feed cost" card in Finance, on the Farmer plan and above (`feedCost` in `lib/plans.ts`).

Why: feed is 55–70% of a Kenyan dairy farm's costs, and a farm keeps only about KSh 10–14 a litre. Saving KSh 2–3 a litre on feed pays for the Farmer plan several times over.

## What it shows (this month or last month)

- Feed cost per litre: feed spend divided by the litres produced. It is compared with the month before.
- What each litre left after feed: the price billed per litre minus feed per litre, and that margin for all the milk produced.
- Where the feed money went, by feed type: dairy meal, hay, silage, Napier and fodder, minerals and salt, other. Each shows its share. When quantities were entered in one unit, it also shows the price per unit ("KSh 3,500 a bag").

It needs 14 days of milk records in the month and at least one feed expense, the same threshold as Cost per litre. Starter farms see the one-line locked notice.

## Recording feed

The expense form shows three optional fields when the category is Feed:
- what feed;
- quantity;
- unit (bag, bale, kg, tonne, load).

These are stored on the expense record as `feedType`, `quantity` and `unit`. There is no database change, because records are stored as JSON. Older feed expenses with no type are read from their description ("dairy meal", "Rhodes hay", "silage", "napier", "mineral lick"), else counted as "Other feed". The fields are also in the expenses CSV export.

## Not included

- No per-cow margin over feed: the farm's feed is not recorded per cow.
- No ration advice: Mylkio records and compares; it does not tell farmers what to feed.

Code: `lib/feed-cost.ts`, `components/finance/FeedCostCard.tsx`. Tests: `tests/feed-cost.test.ts`.
