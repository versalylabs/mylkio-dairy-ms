# Fertility flags, days open and the calving interval

Built 23 November 2026 (build spec step 6, feature F4). No database change. Code: `lib/fertility.ts` (the rules and both thresholds), `lib/fertility-copy.ts` (English and Kiswahili wording), the two kinds of item in "Needs your attention" on Home (`DashboardView`), and two lines in the Breeding tab of a cow's page (`CowDetailModal`). Tests: `tests/fertility.test.ts`.

Farmer plan and up (a trial included). Built from the breeding records the farmer already enters, so there is nothing new to type. Workers see the flags and the cow-page lines (they contain no money). On Starter, a cow that has calved shows one calm line in her Breeding tab naming the Farmer plan.

## What the farmer sees

In "Needs your attention", at most one item of each kind per cow (tap to open her page; snooze 3 days or dismiss, kept on the phone):

- **Not served:** "Malkia calved 104 days ago and has not been served. Watch for heat or ask your inseminator."
- **Repeat service:** "Malkia has been served 3 times without holding. Ask a vet to examine her."

In the Breeding tab of the cow's page, each shown only when the records allow it:

- "Days open: 104"
- "Last calving interval: 412 days"

The wording describes what the records show and suggests watching for heat, asking the inseminator, or asking a vet to examine her. It never names a diagnosis or a medicine.

## Rules (named constants in `lib/fertility.ts`, to be confirmed with a vet before the pilot)

- **Not served:** she calved `NOT_SERVED_DAYS` (90) or more days ago, is not recorded as pregnant, and has no insemination since that calving. A new insemination closes it.
- **Repeat service:** she has had `REPEAT_SERVICE_COUNT` (3) or more inseminations since her last calving and no positive pregnancy check. A positive pregnancy check closes it. A negative check does not.
- **Pregnant** means her profile says so, or a positive result (on a pregnancy check, or on the insemination itself) after her last calving that no later abortion cancels.
- **Left out:** a heifer that has never calved (and a cow whose calvings were never entered: there is nothing to count from), calves, bulls, and animals that are sold, dead or archived.
- **Days open** = days from her last calving to the insemination that led to a positive pregnancy check (the latest insemination before the check), or to today if she is not pregnant. Not shown when she is marked pregnant but no record says which insemination.
- **Calving interval** = days between her two most recent calvings. A stillbirth counts as a calving and an abortion does not, matching `planCalving`. Not shown with fewer than two calvings.
- Records dated after today are ignored.
- Flags are worked out from the records, so they close by themselves when the records change. There is no separate reminder to deduplicate against: the app has no heat or insemination follow-up reminders (its reminder kinds are vaccination, deworming, calving, dry-off, withdrawal, payments and statements).

## The demo farm

Cheyech calved 104 days ago and has not been served (not served). Amani calved 150 days ago and has been served three times without holding (repeat service). Neema, confirmed in calf, shows days open (78) and a calving interval (380 days) on her page.

## Not built

A reminder for the next heat, sending a flag by SMS or phone notification (a later step), and any diagnosis.
