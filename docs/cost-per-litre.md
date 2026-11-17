# Cost per litre

Built 17 November 2026 (build spec step 4, feature F2). No database change. Code: `lib/cost-per-litre.ts` (the rules), `lib/cost-copy.ts` (English and Kiswahili wording), `components/finance/CostPerLitreCard.tsx`, shown at the top of the Finance screen. Tests: `tests/cost-per-litre.test.ts`.

## What the farmer sees

One card on Finance, for **this month** or **last month** (it opens on this month once it has enough, otherwise on last month):

> Milk cost you about KSh 38 per litre to produce. Buyers paid you about KSh 52 per litre. Feed was 61% of your costs.
> Based on the expenses you have recorded. These are estimates, not accounts.

If it cost more than the price, one more calm line says so ("Your costs were about KSh 10 per litre more than the price you were billed."), in the same plain style: no red, no alarm.

With too little to go on, the card says: "Record milk and expenses for two weeks to see your cost per litre."

## Rules

- **Cost per litre** = the period's expenses divided by the counted litres produced in the period (the one-counted-total rule in `lib/milk.ts`; voided milk never counts). Rounded to whole shillings.
- **Price per litre** = the period's charges for accepted litres divided by the accepted litres, from the ledger (`salesInRange`, the same "Milk billed" figure as Finance). It uses what was **billed**, not what was received in cash; rejected litres and voided deliveries are left out. It is left out of the card when nothing was billed.
- **Feed share** = feed expenses divided by all the period's expenses, as a whole percent.
- **Shown only when** the period has at least 14 days with a milk record (`MIN_MILK_DAYS`, a named constant to tune after the pilot) and at least one expense. A day counts once however many records it has.
- Worked out on the phone from the local copy, so it works offline. Figures say "about" and rest on the expenses the farmer recorded.

## Who gets it

- **Farmer plan and up** (and trials, which get the Farmer set). On Starter, the card is replaced by one calm line, "Cost per litre is part of the Farmer plan.", with a link to Settings. It pauses with the other paid extras when a trial ends, a payment is over 7 days late or the plan is cancelled.
- **Owners and managers only.** It is built from expenses and billing, and it lives on the Finance screen, which a worker never has: their phone is not even sent those records.

## The demo farm

The demo's expenses now follow the calendar (last month) like the rest of the demo, so the card shows sensible figures: about KSh 45 to produce a litre, KSh 49 billed, feed three quarters of the costs. This month it asks for two weeks of milk, because the demo has only one day of milk this month.

## Not built

A longer period than a month, a per-cow cost, and splitting costs other than feed (the card shows the feed share only, as specified).
