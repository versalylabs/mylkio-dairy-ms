# Phase 8: website and commercial administration

Status: built on 15 November 2026. Migration `0006_commercial_admin.sql`; rules in `lib/billing.ts`; tests in `tests/billing.test.ts`, `tests/server/commercial.test.ts` and `tests/legal.test.ts`.

## What was missing

- **Nothing ever ended a trial or a payment.** `renewsAt` was only a date shown in Settings ("Renews on…", even during a trial). There was no record of who paid what, the administrator changed plan and status by hand with no history, and nobody was told when a trial was about to end.
- **No Privacy notice or Terms**, although the website collects phone numbers and the app stores farm records. Kenya's Data Protection Act, 2019 expects people to be told what is collected and where it goes.
- Little for search and sharing: no sitemap, no `robots.txt`, no share picture.

## How billing works (no automatic charging)

Mylkio takes no payments by itself (a standing decision: no M-Pesa billing yet). An administrator **records each payment received** against the farm. That:

- adds a line to the farm's payment history (amount, M-Pesa or bank reference, date, months covered, plan, who recorded it);
- sets the status to *Paid* and moves **paid-until** (`renewsAt`) forward by the months paid for. A farm still in its trial or paid up keeps what it has left (the new period starts where the old one ends); a lapsed farm starts again from the day it paid;
- refuses the same M-Pesa or bank reference twice (case ignored), so a payment cannot be entered twice. Cash with no reference is fine.

A mistake is **voided with a reason**, never deleted: it stays in the list, the paid-until date moves back by the months it added, and an account that is then behind becomes *Past due*. Every payment and void writes an audit line.

## What state a farm is in

`lib/billing.ts` works the state out from the dates, the same way for Settings, Home and the administration screens: trial, trial ending (7 days or less), trial ended, paid, due soon (7 days or less), overdue, cancelled, or platform account. Nothing changes in the database by itself when a date passes.

**Policy (chosen to be safe for farmers; change it in `lib/billing.ts` if you disagree):**

- A farm's **records are never locked or hidden.** They stay readable and exportable in every state.
- When a trial has ended, a payment is more than **7 days** late (`GRACE_DAYS`), or the plan is cancelled, the paid-only extras (symptom checker, vet finder) fall back to the Starter set. The safety information (emergency signs, seasonal calendar) is always available. The server applies the same rule to the vet finder route.
- Herd limits (5, 25, unlimited) are a **guide, not a lock**: nothing stops a farm adding a cow. The administrator is shown farms over their plan so they can talk about a bigger one.

## What the administrator sees

On the administration screen, before the account list:

- **Money received** this month and last month, and the last six months.
- **Needs a call or message:** accounts that are overdue, past their trial, due within a week or ending their trial within a week, most urgent first. Each has Call and WhatsApp buttons (the WhatsApp message is pre-written with the first name, the date and the price, and always says the records are safe) and a **Record payment** button.
- **Herd larger than the plan covers.** Only a count of live cows is read, never the records (this is stated on screen).
- Each account shows its billing state, paid-until or ended date, and herd size, and opens a dialog for payments and notes. **Notes** record things like "called, will pay Friday".
- **Download list (CSV)** of the listed accounts (contact and plan details only; cells starting with `= + - @` are defused so a spreadsheet cannot run them as formulas).

## What the farmer sees

- **Settings:** the plan, its state, "Paid until 15 Dec 2026" or "Free trial: 9 days left (ends 24 Nov 2026)", the herd against what the plan covers, and a **Message Mylkio** WhatsApp button to pay, renew or change plan.
- **Home:** a calm notice only when the trial is ending (7 days), ended, a payment is due soon or late, or the plan was cancelled. It says the records are safe, and that the checker and vet finder are paused only when they really are. Nothing shows while all is well.

## Website

- **`/privacy` and `/terms`** (content in `lib/legal.ts`, one source for the pages and tests), linked from the footer, the sign-up form ("By creating an account you agree to…") and the contact form. The privacy notice names the providers (Neon, in Frankfurt; Vercel), says plainly that data is stored **outside Kenya**, lists what is collected (including the administrator's payment records and notes), what stays on the phone, retention, and the rights under the Data Protection Act. Tests fail if the notice stops naming the providers or the terms drift from the real trial length and grace period.
- **Search and sharing:** `sitemap.xml`, `robots.txt` (the API is excluded), canonical addresses, Open Graph and Twitter tags, and a generated share picture. The address is taken from `NEXT_PUBLIC_SITE_URL` (default the Vercel address); set it when a custom domain is added.
- Contact details now live in `lib/contact.ts`.

## Before this is relied on

- **Lawyer's review.** The Privacy notice and Terms were written from what the system does, in plain language. They have not been reviewed by a lawyer. The limit on liability (three months of fees) and the "not veterinary advice" wording are the parts most worth a lawyer's eye.
- **Data Protection Act registration.** A business that handles personal data in Kenya normally has to register with the Office of the Data Protection Commissioner as a data controller or processor. That is a task for Versaly, not something the code can do.
- **Cross-border transfer.** Data is held in Frankfurt (Neon, `aws-eu-central-1`). Moving a Neon project to another region means a new project and a data copy. The notice discloses this; confirm with your lawyer that it is enough.
- **The support phone number on the website** (`+254 184 129145`) does not look like a Kenyan mobile or landline format. Check it is correct: farmers are told to message it to pay.

## Not done

- No automatic or in-app payment (M-Pesa Paybill/STK push). The ledger is ready to receive payments from it later.
- No reminders sent automatically: the administrator sends them from the follow-up list.
- Subscription changes (plan and status) made by hand are not yet kept as a history of their own; payments and voids are.
- Kiswahili for the new text (deferred by request).
