# Kiswahili in Mylkio

Updated 16 November 2026. The farmer's screens can be read in English or Kiswahili (the **EN / SW** button in the header, and now also on the sign-in box so a person can switch before they have an account). The choice is saved on the phone and applies everywhere at once.

## What is translated

All farmer-facing screens now have Kiswahili. The screens that were added after the first translation pass, and were English only until now, are:

| Screen | Where the wording lives |
| --- | --- |
| Plan and payment notice on Home; the subscription card, sidebar plan pill and "message Mylkio to pay" message | `BILLING_COPY` in `lib/app-copy.ts`, with `describeBilling`, `planPillLabel`, `stateLabel` in `lib/billing.ts` |
| Backup and storage card (backup reminders, space, "opens without internet", shrink photos) | `STORAGE_COPY`, `backupMessage` (`lib/app-copy.ts`), `backupAdvice` (`lib/backup.ts`) |
| Saving to the cloud (the "N changes saved on this device" bar, review and conflict choices) | `SYNC_COPY` |
| Finding a vet (my vets, the directory, suggesting a vet) | `VET_COPY` |
| Sign in and create account | `AUTH_COPY` |
| Team: your team, invitations, "Join a farm" | `lib/team-copy.ts` |
| Forgot password and reset password | `lib/password-reset.ts` |
| Leftover labels in the Settings farm profile form, and the dialog "Close" button | in place |

Messages that come from deep in the system (cloud save failed, the phone is full, sign-in failed and so on) are translated by `translateMessage`, which knows the exact sentences. A test checks every sentence on that list still exists in the code, so rewording one cannot silently drop its translation. An unknown message is shown as it is, in English.

## Not translated, on purpose

- **The website** (home page, pricing, FAQ, Privacy and Terms) is English. The Kiswahili work is for the app. Translating the public pages and the legal text needs a decision and, for the legal text, a lawyer.
- **The administration screens** are for Mylkio staff and stay English.
- **The vet symptom checker and illness guide content** (`lib/vet/*`). Its buttons and chrome are not what a farmer acts on; its clinical advice is draft until a vet reviews it, and a Kiswahili version of medical advice must be reviewed by a vet too. Only the "Finding a vet" screen (phone numbers and contacts) is translated.
- Server messages from some older routes stay English if they are not on the known list above.

## Please have a native speaker read it

The Kiswahili is written in plain, everyday words (it is read on a phone in a milking shed), but **it has not yet been reviewed by a native speaker**, and a few terms are judgement calls:

- *Nakala rudufu* for "backup", *wingu* for "the cloud", *kikagua dalili* for "symptom checker", *kitafuta daktari wa mifugo* for "vet finder", *mpango* for "plan", *mwaliko* for "invitation".
- Dates use the Kiswahili month names (Ago, Des, ...).

To correct a word, edit it in the files above; the tests will tell you if an entry goes missing in either language. Where English and Kiswahili sentences are built from pieces (days left, counts), both are functions with the same inputs, so word order can differ.

## Adding a new screen

Put its wording in a `*_COPY` object with `en` and `sw` side by side, read the language with `useLanguage()` (screens that are not given `lang` by their parent), and add the object to the list in `tests/app-copy.test.ts` so a missing entry fails the build.
