# Managing the live website from the administration screen

Built 16 November 2026. Migration `db/migrations/0007_site_content.sql`. Code: `lib/site-content.ts`, `components/admin/WebsiteContentAdmin.tsx`, `components/site/SiteContentProvider.tsx`, `app/api/site-content/route.ts` (public), `app/api/admin/site-content/route.ts` (administrators). Tests: `tests/server/site-content.test.ts`.

## What an administrator can now change

The administration screen has tabs: **Overview**, **Accounts and billing**, **Enquiries**, **Vet directory** and **Website**. The Website tab edits four things, each with Save and "Go back to the built-in wording":

| Part | Controls |
| --- | --- |
| **Contact details** | Phone, WhatsApp and support email: the website's contact section and footer, the free checklist download, every "Message Mylkio" button inside the app. |
| **Subscription prices** | Starter, Farmer and Farm Pro monthly prices: pricing cards, sign-up form, the cost FAQ, and the price recorded on **new** subscriptions and plan changes. |
| **Testimonials** | Farmer stories on the home page: add, edit, reorder, hide, delete. Each is marked "an example" or real. |
| **FAQs** | The questions at the bottom of the home page: add, edit, reorder, delete. |

Subscriptions themselves (who is on which plan, payments, trials, follow-ups) were already managed in the Accounts and billing tab.

Not editable here, on purpose: trial length (14 days) and each plan's cow limit and features (they are enforced by the system), the Privacy notice and Terms (they need a lawyer), and the rest of the page wording.

## How it works

- One table, `site_content` (key and JSON value), plus `site_content_history`, which keeps the previous value of a key each time it is saved or reset.
- The website asks `/api/site-content` once per visit. The answer is shared-cached for 60 seconds, so an edit shows within about a minute (immediately on the administrator's own screen). The last copy is kept on the phone, so the website still shows it offline. If the database cannot be reached the built-in wording is shown, never an error.
- Only a platform administrator can change anything: the server checks the session, and the database function checks the administrator role again. Every value is validated (lengths, phone and email shape, whole prices) on the server before it is stored; a stored value of the wrong shape is ignored in favour of the built-in one.

## Rules worth knowing

- **A price change never re-bills anyone.** Farms that already have a subscription keep the price recorded when it was set. The new price applies to new sign-ups and to plan changes made from the Accounts tab. (Payments are still recorded by hand.)
- **Testimonials are honest by default.** Until a list is saved the website shows the built-in invented examples, labelled "Example, not a real review". Add a real story only with the farmer's agreement and untick "An example". When every shown story is real the section is headed "What dairy farmers say about Mylkio".
- **FAQs:** once saved, the list replaces the built-in one, so later price changes no longer rewrite the cost answer. Reset to the built-in list to get that back.
- **The support email in the Privacy notice and Terms is written into their text** and does not follow the Website tab. Change it in `lib/contact.ts` and `lib/legal.ts` when the address changes.

## Releasing

Migration 0007 replaces two existing functions (`provision_farm` and `admin_update_subscription`) with copies that read the price from `plan_price()` instead of a fixed number. Apply it to the preview database branch first (done 16 November 2026), then production with the owner's go-ahead. Merging the code before the migration is safe: the public endpoint falls back to the built-in wording when the table is missing, and only the administrator's Website tab reports an error until the migration is applied.
