# Phase 5: herd-care workflows

Status: built on 15 November 2026. All the rules live in `lib/herd-care.ts` (and `lib/vet/record.ts`) as plain functions with tests in `tests/herd-care.test.ts`; the screens and `lib/storage.ts` only call them.

## What was wrong

- **Milk withdrawal never ended.** A treatment saved `isWithdrawalActive: true` once and nothing ever turned it off. Home kept showing "do not sell this milk yet", the Herd screen kept listing the cow, and the reminder count included it, until someone ticked the reminder by hand. The demo farm showed this for a withdrawal that ended on 26 October.
- **A calving changed nothing.** Logging a calving saved an event and stopped: the cow stayed "pregnant", her calving count did not go up, no calf was added, and the "calving due" reminder stayed open. The calf tag field in the data model was never filled in.
- **A symptom check could not be kept.** The vet guide result lived only on screen.

## What changed

### Withdrawal is worked out from the dates

`withdrawalState(event, today)` is `active` from the treatment date to its end date **inclusive** (milk is safe from the next day), `ended` after, `upcoming` for a future-dated treatment. Home, the Herd screen, the cow's page and the milk-recording warning all use it (the milk screen already did, through `withdrawalEndFor`, which now shares the same rule). A withdrawal reminder whose end date has passed leaves the list by itself. The saved `isWithdrawalActive` flag is still written but nothing reads it. An ended withdrawal now shows "Withdrawal ended [date]" in the history.

### Calving

`planCalving` works out the whole change before anything is saved, and the form shows it in plain words under **"When you save"**:

- **Live birth (heifer, bull, twins):** the dam becomes `lactating`, no longer pregnant, her expected date is cleared and her calving count goes up by one. A calf record is added for each live birth: tag (the farmer's, or automatic `GH-06-C1`, `-C2` if taken), sex, birth date, `status: calf`, the dam's tag, and the **sire taken from her latest insemination on or before the calving**. Twins take a tag and sex each.
- **Stillborn:** counted as a calving (she comes into milk) but no calf is added.
- **Aborted:** the pregnancy ends but it is not counted as a calving, and her milking status does not change.
- **Reminders:** the open "calving due" and "dry off" reminders for that cow are closed, and a **check on the afterbirth** is set for the next day: "The afterbirth should come away within 24 hours of calving. If it has not, call a vet." (the 24-hour point is from the Merck Veterinary Manual page on retained fetal membranes cited in the vet guide).
- **Refused, not half-saved:** a calf tag already used by another animal (compared ignoring capitals), or two calves with the same tag, is refused with a message, the form stays open and nothing is changed. The check runs before the event is stored.
- All of this happens inside one `addBreedingEvent` call, which the cloud store already uploads as one all-or-nothing group (`groupInCloud`).

### Pregnancy and dry-off

A positive or pending pregnancy with an expected date now sets the calving reminder **and a "plan to dry her off" reminder about 60 days earlier** (none if that day has already passed). Earlier calving and dry-off reminders for the same cow are closed, so correcting the date never leaves two reminders for one calving. A negative result adds none.

### Save a symptom check to the cow's record

In the vet guide, once an animal is chosen, **Save to health record** adds a `routine_check` to her history: the signs, what the guide said, and what the signs fit, worded as a check and never as a diagnosis, with **no medicine and no withdrawal**. It sets a follow-up reminder: tomorrow for "emergency" and "today", two days for "soon", three if nothing matched. It saves once per check. Health records of this type show as "Health check" instead of the raw type name.

## Not done

- Cow statuses beyond what the calving and pregnancy changes set (for example marking a cow "dry" when the dry-off reminder is done).
- A withdrawal period suggested automatically from a medicine: the farmer or vet still enters the number of days.
- Kiswahili for the new text.
- Moving cows between lots or recording calf weights and weaning.
