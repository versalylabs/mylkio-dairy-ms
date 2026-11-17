# Milk drop alerts and the weekly cow ranking

Built 17 November 2026 (build spec step 5, feature F3). No database change. Code: `lib/milk-drop.ts` (the rules and every threshold), `lib/alert-dismissals.ts` (dismiss and snooze), `lib/drop-copy.ts` (English and Kiswahili wording), `components/milk/CowRanking.tsx`, the alert in the "Needs your attention" feed on Home (`DashboardView`), and the ranking on the Milk screen (`MilkView`). Tests: `tests/milk-drop.test.ts`.

Farmer plan and up (a trial included). It applies **only to farms that log milk per cow**: a farm that logs farm totals sees nothing new, and no alert is ever raised from farm-total records. Workers see the alert and the ranking (they contain no money); Starter sees one calm line on the Milk screen naming the Farmer plan, only if the farm logs per cow.

## The alert

On Home, in "Needs your attention": "Zawadi's milk is down about 30% this week. Check her feed and health; call a vet if she looks unwell." with "Lately 10 L a day, earlier 15 L a day." Tapping it opens the cow's page. **Snooze 3 days** hides it for three days; **Dismiss** hides it until she has recovered (a later, new drop raises a fresh alert). These choices are kept on the phone only (per farm): they are a convenience for whoever is looking, not a farm record. The wording describes what the records show and suggests calling a vet. It never names a diagnosis or a medicine.

## Rules (all thresholds are named constants in `lib/milk-drop.ts`, to be tuned after the pilot)

- **A cow's day.** A date counts for a cow only when the farm's counted milk for that date is complete (a day total, or AM and PM) and every counted entry for it was recorded per cow. A day that is part per cow (say the morning per cow and the evening a farm total) says nothing reliable about one cow, so it is left out rather than read as a drop. For the same reason today is left out until its milk is complete.
- **Compare** her average over her last `RECENT_DAYS` (3) recorded days with her average over the up to `BASELINE_DAYS` (7) recorded days before those. She needs all 3 recent days and at least `BASELINE_MIN_DAYS` (5) baseline days.
- **Alert** when the recent average is `DROP_PERCENT` (25%) or more below the baseline.
- **Skipped:** cows that are not lactating; within `CALVING_QUIET_DAYS` (14) of calving (a live birth or a stillbirth; an abortion is not a calving); with an open dry-off reminder due within `DRY_OFF_QUIET_DAYS` (30) days or already overdue; and cows whose latest recorded day is more than `STALE_DAYS` (7) old (they are not being milked per cow any more).
- **One open alert per cow.** Once raised it stays open, even if she improves a little, until her 3-day average is back within `RECOVERY_PERCENT` (10%) of the baseline it was raised against. It then closes by itself.
- The thresholds (25%, 90 days not served and 3 services for the next feature) are the ones the spec says to confirm with a vet before the pilot.

## The ranking

On the Milk screen, "Your cows this week": each lactating cow with milk recorded per cow in the last 7 days, her average litres per recorded day, highest first, with an up, down or level mark against the 7 days before (level means within `RANK_LEVEL_PERCENT`, 5%; "new this week" if she had no days the week before). No chart and no extra screen. The marks are neutral and sage; a cow doing less is shown in amber, never red.

## The demo farm

Green Hills has 14 days of per-cow milk. Zawadi's milk dropped by a third over the last three days (the alert), Baraka is up, Amani slightly down, Neema and Cheyech level. Yesterday's farm total was replaced by the per-cow record for the same day.

## Not built

A chart of a cow's history, an alert by SMS or phone notification (a later step), and any diagnosis.
