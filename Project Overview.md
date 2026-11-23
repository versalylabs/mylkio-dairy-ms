# Mylkio — Dairy Farm Management System

| | |
| --- | --- |
| Product | Mylkio |
| Company | Versaly |
| Document | Project Overview, Product Specification and As-Built Record |
| Version | 2.0 — 16 November 2026 |
| Primary market | Kenya |
| Tagline (working) | Smarter Dairy Farming. Made Simple. |
| Live site | https://mylkio-dairy-ms.vercel.app |
| Code | https://github.com/versalylabs/mylkio-dairy-ms (branch `main` deploys to production on Vercel) |

**Revision note (v2.0).** v1.2 (24 October 2026) was a specification written before the build. All nine roadmap phases have since been built and released, plus three follow-ups (team logins, password reset by email, Kiswahili for the newest screens). This version keeps the product specification (sections 1–19, with an **As built** note under each module and a status mark where reality differs from the plan) and adds the as-built record of the system (sections 20–31): architecture, data and sync, accounts and roles, plans and billing, administration, website, vet guide, security, testing, operations, known gaps and a map of the detailed documents in `docs/`. When this document and a file in `docs/` disagree, the `docs/` file and the code are right; please correct this document.

---

## At a glance (16 November 2026)

| Area | State |
| --- | --- |
| Product | Live, in pilot-readiness. Invitation-only sign-up. No paying farmers are recorded in this document. |
| Roadmap | Phases 1–9 complete and merged to `main`. Follow-ups complete: team logins (migration 0008), password reset by email, Kiswahili for the newest screens. |
| Stack | Next.js 16, React 19, TypeScript, Tailwind CSS 3, Neon Postgres 18 and Neon Auth (managed Better Auth), Vercel hosting, installable offline-first PWA. |
| Database | 10 migrations (0001–0010) applied on both the Neon `production` and `preview` branches (0010, produced vs sold, on 17 November 2026). Region Frankfurt (`aws-eu-central-1`). |
| Tests | 517 automated tests in 42 files (Vitest, with in-memory Postgres via PGlite running the real migrations). `npm run build` and `npm run typecheck` pass. CI ("Validate") runs build, typecheck and tests on every pull request. |
| Languages | English and Kiswahili for the farmer's app screens. The website, Privacy/Terms, administration screens and the vet guide's clinical content are English only. |
| Needs a person, not code | Real-phone tests; lawyer review of Privacy and Terms; Data Protection registration; a veterinarian's review of the vet guide (still DRAFT and hidden from farmers); native-speaker review of Kiswahili; backups decision (Neon history is only 6 hours, no snapshots); Neon Auth production email settings (own sender, application name, sign-out-on-reset); a real password-reset email and a real team invite tried end to end. |

---

## 1. Executive Summary

Mylkio is a mobile-first dairy farm management system for Kenyan dairy farmers who keep cows and sell milk to cooperatives, collection centres, traders, or individual customers. It replaces scattered notebooks, memory, and spreadsheets with simple daily records and useful reminders.

The product helps farmers answer five practical questions:
1. How much milk did my cows produce today, and which cows are producing more or less?
2. Which cows need attention—vaccination, treatment, pregnancy check, expected calving, or breeding?
3. How much milk have I sold, to whom, and what payments are still outstanding?
4. What does it cost to run the farm, and is the dairy operation profitable?
5. What should I do next?

**Core promise:** Know your cows, your milk, and your money—without complicated software.

**As built:** all five questions are answered in the app (Home, Milk, Herd, Sales, Finance). It works without internet, in English or Kiswahili, and a farm can give a manager or worker their own login with limited access.

## 2. Target Users and Jobs to Be Done

**Primary: small and medium dairy farmers**
- Own or manage approximately 1–50 dairy cattle, with the system able to support larger herds.
- Sell milk daily to one or more cooperatives/collection centres or to individual buyers, sometimes on credit or monthly settlement.
- Need simple, fast record entry on a phone, in English or Kiswahili.

**Secondary users**
- **Farm workers:** enter milk, health, breeding and reminders under controlled permissions. *Built* (Farm Pro, section 22).
- **Farm managers/owners:** review herd performance, sales, costs, and overdue actions. *Built.*
- **Veterinary professionals:** a farm can save its own vets (call, WhatsApp, send a symptom summary) and Farm Pro farms can see confirmed vets for their county. Vets have no login and no access to farm data. *Built as contacts, not as a vet portal.*
- **Mylkio staff (platform administrators):** manage accounts, payments, enquiries, the vet directory and website content. They see counts and account details, not farm records. *Built.*
- **Cooperatives and milk buyers:** potential future partner portal. *Not built, not required.*

**Problems to solve**
- Incomplete or inaccurate milk production records.
- Missed animal health, vaccination, breeding, or calving follow-ups.
- Confusion over deliveries, cooperative deductions, buyer balances, and delayed payments.
- Poor visibility into feed costs, other expenses, and actual earnings.
- Software that is too complex, data-hungry, or desktop-centric for daily farm use.

## 3. Product Principles

1. **Mobile-first and farmer-friendly:** large tap targets (44 px), clear labels, minimal typing, and a simple home screen.
2. **Daily tasks before complex analytics:** log milk in seconds; show what needs attention today.
3. **Kenyan context:** KSh, litres, Africa/Nairobi dates, cooperative settlements, cash/M-Pesa/bank/manual payment records, and English/Kiswahili.
4. **Works with weak connectivity:** offline capture and later sync, with visible sync status and conflict handling.
5. **Trustworthy numbers:** distinguish recorded amounts from estimates; balances are calculated from ledger records, never from an editable total; mistakes are voided with a reason, not deleted.
6. **Privacy by default:** separate farms and users, least-privilege permissions, and consent for sharing.
7. **Progressive complexity:** simple setup for one farmer, optional advanced tools as the farm grows.

## 4. Product Scope and Priorities

### MVP (six non-negotiable jobs): all built

1. Add cows quickly, without requiring the entire herd before first use.
2. Log total farm milk by default, with optional cow-level logging on the same screen.
3. See important cow-care dates: vaccinations, deworming, treatment/withdrawal, pregnancy checks, calving, and dry-off.
4. Record cooperative deliveries, adjustments, expected settlements, receipts, and balances.
5. Record household deliveries, monthly bills, receipts, and outstanding balances.
6. Run all daily workflows offline and synchronize reliably later.

MVP essentials: bilingual English/Kiswahili daily UI; dashboard; farm/cow registry; two lightweight sales ledgers; consolidated date-based reminders; manual payment recording; mobile-first PWA; core reports; secure farm separation. A milk record never requires a cow profile.

### Original "Phase 2 (after farmer validation)" list: status

| Item | Status |
| --- | --- |
| Expenses and profitability view | **Built** (Finance screen, expense categories, period switch, billed vs received kept separate) |
| Worker/team management | **Built** (Farm Pro: owner plus five managers/workers, invitations, roles) |
| Richer reporting and exports | **Built in part**: CSV for milk, deliveries, expenses and herd; JSON full backup and restore; printable statements and bills. PDF is "print, then save as PDF". |
| Advanced invoices, recurring billing automation | Household monthly bills with numbering are built; recurring automation is not |
| Feed stock/planning; calf growth and detailed lactation analytics | Not built |
| Cooperative bulk admin dashboard, branded group onboarding | Not built (waits for partner demand) |
| SMS/WhatsApp delivery | Not automated. Share buttons open WhatsApp with a pre-written message; nothing is sent on the farmer's behalf |

### Future/optional (still not built)

Cooperative data integrations, automated M-Pesa collection/reconciliation (the manual ledger is ready to receive it), route optimization, advanced genetics, sensors/IoT, loans, insurance, AI insights (including AI photo reading for the vet guide), and full accounting. No promise of financial services, automatic payments, or custom cooperative software in v1.

## 5. Functional Modules

### 5.1 Farm Setup and Onboarding
- Create farm: name, county, optional sub-county, contact details, preferred language, and currency (KSh).
- Add first cows, buyers, and opening balances. Quick-start with herd totals is supported; milk can be logged before any cow exists.
- Demo/sample data and contextual help.

**As built:**
- **Sign-up is invitation-only during the pilot.** A farm can be created only with a code from the `SIGNUP_INVITE_CODES` setting (remove a code to revoke it). Codes should be long and random; they are not attempt-limited.
- Sign-up form: name, phone (M-Pesa), farm name, county, sub-county, email, password (12 or more characters), plan choice, agreement to Terms and Privacy. Every new farm gets a **14-day free trial** with the full Farmer feature set, and starts clean with no demo data.
- **"Explore the demo farm"** on the sign-in box opens a local-only sample farm (Green Hills Dairy Farm, Nakuru) with a full previous month of deliveries, a statement and bills. Demo data never leaves the phone.
- **Language switch (EN / SW)** is on the sign-in box and in the app header.
- Email verification at sign-up is **off** for the pilot (Neon's shared sender supports codes, not links, and the app has no code-entry screen). Password reset by email is on (section 21).
- Setup is resumable: sign-up details are kept on the device until the account has a session, then the farm is created. A person who joins a team skips farm creation (section 22).

### 5.2 Herd / Cow Registry
Each cow profile includes ear tag/name, photo(s), breed, sex, date of birth or approximate age, acquisition, status (lactating, dry, heifer, calf, pregnant, sick, sold, deceased, archived; attributes may overlap), parentage, calving count, notes, and a timeline of milk, health and breeding events. A cow can be archived or sold without losing history.

**As built:**
- Herd screen with search, status filters (all, lactating, dry, pregnant, sick, calves) and four tabs (Registry, Health, Breeding, Vet guide); cow detail with a production chart, health and breeding history.
- **Photos are shrunk on the phone** before saving (longest edge 960 px, JPEG, about 90 KB, camera rotation respected, up to 6 per cow). A "Shrink photos" button handles photos saved before this existed.
- Worker logins can look at cows but not add, edit or remove them (section 22).
- Herd size against the plan (5 / 25 / unlimited cows) is a guide, not a lock; administrators see farms over their plan.

### 5.3 Milk Production
- Single entry screen: log total farm milk (default) or by cow. Date defaults to today (Africa/Nairobi); AM/PM optional. After 10 cows are added the app gently suggests per-cow logging.
- Never double counts: farm-total and cow-level entries for the same milk are reconciled.

**As built (`lib/milk.ts`):**
- Each date has **one counted total**. A day-total entry covers the whole day; otherwise AM + PM with one counted entry per session. Saving into an overlap forces a choice: replace the earlier record (it is voided, linked to its replacement, and kept in history) or change the date/session. Storage refuses an unresolved overlap.
- Overlaps already in data (legacy or merges) are not added together: the newest counts, the date is flagged and the uncounted litres listed.
- 7-day average, change vs the previous 7 days, top producer and per-cow average use counted records only, averaged per recorded day. Only lactating cows appear in cow-level entry; cows under a milk withdrawal are flagged there.
- Milk records are append-only: the only change after saving is a void.
- **Milk drop alerts and the weekly cow ranking** (Farmer plan and up; only for farms that log milk per cow; workers see them). A "Needs your attention" item when a lactating cow's last 3 recorded days are 25% or more below her 7 recorded days before (never from farm-total records; skipped within 14 days of calving or with a dry-off reminder due within 30 days; it closes by itself when she is back within 10%; snooze and dismiss are kept on the phone). The Milk screen lists "Your cows this week" with an up, down or level mark. Thresholds are named constants to confirm with a vet before the pilot. See `docs/milk-drop.md`.
- **Produced vs sold** (all plans; owner and manager): Home shows "Produced 120 L · Sold 96 L · 24 L not sold" under Milk sold today, and the Milk screen shows the same for today, this month and last month. Sold is litres delivered (accepted plus rejected) from deliveries that are not voided; not sold is shown only where milk is recorded; more sold than recorded asks the farmer to check the milk record. Tapping the not-sold figure opens an optional split (home use, calves, spoiled, other), stored as a `milkUse` record per day that never changes produced or sold. See `docs/produced-vs-sold.md`.

### 5.4 Buyers, Sales, and Deliveries
Two lightweight ledgers: **cooperative deliveries** and **household customers**.

**As built:**
- **Buyers:** cooperatives and households (and other direct customers). Co-op buyers carry a member/supplier number and collection centre. A buyer with ledger history cannot be deleted.
- **Deliveries:** litres delivered, litres rejected (with reason), rate (historical rates preserved on each record), slip number. Charge = accepted litres × rate ± explicit adjustments. Rejected litres are never billed. Money taken at delivery becomes exactly one linked receipt.
- **Cooperative monthly statements:** entered as printed: statement number and period, accepted litres, rate, bonus, and each deduction as its own line (transport, feed advance, AI service, share contribution, loan, vet). The form **reconciles against the farm's own records** ("You recorded 985 L; the statement shows 970 L"). A statement is the authority for its period (one adjustment line brings recorded charges to the net payout); one active statement per co-op per period, enforced on the phone and on the server.
- **Household monthly bills:** pick customer and month; unbilled deliveries become a numbered bill (for example `B202610-001`) due 7 days after month end. A delivery can sit on only one active bill (enforced on the phone and by the server, so two phones billing offline cannot double bill). Voiding a bill releases its deliveries.
- **Payment allocations:** a payment can be applied to open statements/bills when recorded or later ("Allocate"), split across several items, never beyond what the payment has left or the item still owes. Unlinked money still reduces the buyer's balance.
- **Buyer account statements** for any month: balance brought forward, each delivery/adjustment/receipt with a running balance, totals. Bills and statements are printable (print stylesheet prints only the document).
- Not built: household delivery calendars/skip tracking, sharing statements by SMS, an undo button for an allocation.

### 5.5 Payments and Financial Records
- Manual receipt recording; cash, M-Pesa (manual reference only), bank, other. Partial and advance payments. Billed/expected amounts are kept apart from cash received.

**As built (`lib/ledger.ts`):**
- **Buyer balance = opening balance + charges − receipts**, always calculated, never a stored editable total. Positive means the buyer owes the farm; negative means an advance is held.
- Deliveries, payments, bills, statements and milk records are **voided with a reason**, never deleted; voiding a delivery also voids the receipt taken with it.
- Duplicate-reference warnings (same M-Pesa/bank reference, ignoring case and spaces) and likely-duplicate flags (same buyer, date and amount).
- Explicit reporting periods (today, this month, last month, all time) on Home, Sales and Finance. A one-time **legacy ledger migration** reproduced old balances through an opening balance.
- No M-Pesa API, no STK push, no storage of PINs.

### 5.6 Health, Vaccination, and Treatment
- Record symptoms, illness, vet visits, diagnoses (as entered), treatments, medicines, cost, outcome; vaccinations with next due dates; withdrawal periods as entered by a vet or product label. Mylkio is a record-keeping tool, not veterinary advice.

**As built (`lib/herd-care.ts`):**
- **Milk withdrawal is worked out from dates**: active from the treatment date through its end date inclusive, then ended. Home, Herd, the cow page and the milk-entry warning all use the same rule; a passed withdrawal reminder leaves the list by itself.
- **Save a symptom check to the cow's record** adds a "Health check" entry (signs, guide result, what the signs fit, worded as a check, never a diagnosis; no medicine, no withdrawal) and a follow-up reminder.
- Not built: suggesting a withdrawal period from a medicine (the farmer or vet enters the days).
- **Fertility flags** (Farmer plan and up): "Not served" (calved 90 or more days ago, not recorded as pregnant, no insemination since) and "Repeat service" (3 or more inseminations since the last calving, no positive pregnancy check) appear in "Needs your attention"; a new insemination or a positive pregnancy check closes them. The Breeding tab of a cow's page shows "Days open" and "Last calving interval" where the records allow. Built from existing breeding records, never a diagnosis; thresholds are named constants to confirm with a vet before the pilot. See `docs/fertility-flags.md`.

### 5.7 Breeding, Pregnancy, and Calving
**As built:**
- Heat/insemination, pregnancy checks, calving outcomes. **`planCalving` shows "When you save" before anything is stored.** Live birth: dam becomes lactating, calving count +1, expected date cleared, a calf record is created per live birth (tag automatic or typed, sex, dam, sire taken from her latest insemination); twins supported. Stillbirth counts as a calving but adds no calf; abortion ends the pregnancy without counting a calving.
- A calf tag already in use is refused before anything is saved (the whole calving is one all-or-nothing sync group).
- A positive/pending pregnancy with an expected date sets a **calving reminder and a "plan to dry her off" reminder about 60 days earlier**; earlier ones for that cow are closed so a corrected date never leaves two. After a calving, a retained-afterbirth check is set for the next day.
- Dates are estimates with the assumption shown, not guarantees.

### 5.8 Tasks and Notifications
- Consequential, date-based reminders only: vaccination, deworming, calving, dry-off, heat/insemination follow-up, withdrawal ending, household payment due, expected cooperative statement/payment. FMD, LSD and deworming intervals are editable examples, never automatic medical schedules.
- One consolidated in-app Today feed with dismiss/snooze; no generic nudges.

**As built:** reminders live on Home and in the cow timeline, deduplicated per event. **No push, SMS or WhatsApp notifications are sent** (post-MVP). Administrators send billing follow-ups themselves from a prepared list (section 23).

### 5.9 Reporting and Analytics
**As built:** Home dashboard (today's milk, sold, cash received, outstanding balances, reminders, recent activity), Milk history and totals, Sales and buyer statements, Finance (revenue, expenses, surplus by period), Herd lists. CSV exports (milk, deliveries, expenses, herd; formula-injection safe), a full JSON backup and restore, and printable statements and bills. Estimates are never labelled as actuals. **Weekly owner summary and farm report** (Farm Pro and Custom; owner and manager): a Home card "Last week on your farm" (Monday to Sunday, Nairobi) with milk produced and its change, sold and not sold, billed and received, buyers owing, overdue reminders and who recorded what, shared by the owner on WhatsApp (never sent for them); and in Settings a one-page A4 farm report with a 12-month table (a dash for months with no records), the herd today, buyers by type and months of continuous milk records, footed "Not audited or verified by Mylkio" (`docs/weekly-summary-and-farm-report.md`). "Who recorded what" uses a name stamped on each milk, health and breeding record when it is saved (the phone's copy does not carry the server's `updated_by`), so it counts only records saved from now on. **Cost per litre** (Farmer plan and up; owner and manager) sits at the top of Finance for this month or last month: expenses divided by counted litres produced, set against the price billed for accepted litres and the feed share of costs, shown only with at least 14 days of milk and an expense, and worded "about" (`docs/cost-per-litre.md`).

## 6. Main Application Pages / Navigation

**As built:** bottom navigation on phones, sidebar on larger screens: **Home, Milk, Herd, Sales, Finance, Settings**. Platform administrators additionally see an **Admin** screen. Navigation is role-aware: a worker sees only what the server lets them read (no Sales or Finance).

| Page | Purpose / key UI |
| --- | --- |
| Home | Today's milk, sales, cash received, plan/payment notice, reminders, quick actions |
| Milk | Fast entry (farm total or by cow), history, corrections, reconciliation flags, CSV |
| Herd | Searchable animals, cow profile, health and breeding events, Vet guide, finding a vet |
| Sales | Co-op deliveries, statements, household bills, payments and allocations, buyer account statements |
| Finance | Expenses by category, period summary, billed vs received |
| Settings | Farm profile, language, plan and payment status, Your team (owner), backup and storage, export/restore, legacy import |
| Admin (staff only) | Overview, Accounts and billing, Enquiries, Vet directory, Website (section 23) |
| `/reset-password` | Page opened by the emailed reset link |
| `/privacy`, `/terms` | Legal pages, linked from the footer, sign-up and contact form |
| `/` (signed out) | Marketing website |

Home has quick-action tiles (Record milk, Receive payment, Add cow); the other entry forms (delivery, health event, breeding event, expense) open from their own screens.

## 7. Dashboard Specification

Top cards: today's milk (and change vs recent average where data exists), milk sold today (litres and KSh), payments received, outstanding buyer balances. Secondary widgets: milk trend, top producers and notable drops (cow-level logging only), upcoming health/vaccination/calving reminders, recent deliveries and receipts, empty-state guidance.

**As built:** the cards use explicit periods and counted records only (the old hard-coded figures were removed in Phase 3). The paid plan notice shows only when something needs attention (trial ending, ended, payment due or late, cancelled) and always says the records are safe.

## 8. Key User Workflows

- **A. First-time farmer:** sign up with an invitation code, choose a plan (14-day trial), land on Home, record the first farm-total milk without adding cows.
- **B. Daily milk recording:** Milk, enter litres by farm total or cow, saved on the device at once, uploaded when a connection exists.
- **C. Cooperative payment cycle:** daily deliveries, then at statement time enter the co-op's figures; the form compares them with the farm's records and shows discrepancies; record the payment and allocate it.
- **D. Vaccination follow-up:** log it, enter the vet's next due date, get the reminder, complete it and keep history.
- **E. Direct customer monthly billing:** record daily deliveries, create the monthly bill, print or share it, record partial/full payment.
- **F. Adding a team member (new):** owner creates an invitation, shares the link on WhatsApp; the person signs up with the code and joins the farm in the chosen role.
- **G. Forgotten password (new):** Forgot your password, enter email, open the emailed link (one use, 15 minutes), set a new password.

## 9. Roles and Permissions

| Role | Capabilities (as built) |
| --- | --- |
| **Owner** | Everything: money, cows, plan and payments to Mylkio, the team, backup and export. One owner per farm (cannot be removed or demoted). |
| **Manager** | Everything operational including money; farm profile; backup and export. Cannot manage the plan, payments to Mylkio or the team. |
| **Worker** | Reads and writes milk, cow health, breeding and reminders. Looks at cows and the farm profile only. **Never sees money** (buyers, deliveries, bills, statements, payments, expenses). No backup/export. |
| **Advisor** | Reserved in the database, no access, not offered in the app. |
| **Platform administrator** | Mylkio staff. Separate from farm roles. See section 23. |

Each farm's data is isolated; access to one farm never implies access to another. The **server and database decide** permissions; screens only mirror them (section 22).

## 10. Data Model (as built)

The final design differs from the original suggestion: farm records are stored one row per record in a generic store rather than one table per entity, and the detailed fields live in a JSON payload that the server validates.

- **Identity and farms:** `profiles` (with role `super_admin` for staff), `farms`, `farm_memberships` (owner/manager/worker/advisor), `farm_invites` (hashed codes), `subscriptions`, `audit_logs`.
- **Farm records:** `farm_records` — farm, bucket (cows, milk, milkUse, buyers, deliveries, payments, statements, bills, allocations, health, breeding, expenses, reminders, farm), record id, `version`, `change_seq`, `deleted` (tombstone), `updated_by`, data. `sync_operations` stores every applied operation id.
- **Commercial:** `subscription_payments` (manual ledger with voids), `account_notes`, `leads` (website enquiries), `account_activity`.
- **Vets:** `farm_vet_contacts`, `vet_providers` (shared directory with a confirm-by-phone queue).
- **Website:** `site_content` and `site_content_history`.
- **Migrations:** `schema_migrations`. Neon Auth keeps users and sessions in its own `neon_auth` schema; farm tables hold the auth user id as plain text with no foreign key into it.

Design rules kept: stable client-generated ids; farm id on every record; creator/editor and timestamps; decimal-safe money; soft deletion by void or tombstone; historical price snapshots on transactions; cash receipts are never counted as new sales.

## 11. Nonfunctional Requirements (and how they are met)

**UX and accessibility**
- Responsive from small Android phones (checked at 320 px) to desktop. Pop-ups open as bottom sheets on phones. 16 px inputs so phones do not zoom. Buttons never wrap. One warm ivory/charcoal/sage colour family across website and app, with one shared easing for hover motion; effects apply only to real pointers and respect reduced-motion settings.
- English and Kiswahili for the farmer's screens (section 24).

**Offline and synchronization** — see section 20. Visible states: "saved on this device", syncing, synced, needs attention, with a waiting count; a red notice if the phone cannot save.

**Security and privacy** — see section 25.

**Reliability and testing** — see section 27.

## 12. Example Demo Farm

Green Hills Dairy Farm, Nakuru County (fictional). Eight cows with overlapping statuses; Baraka Dairy Cooperative, two household buyers and a café; a full previous month of daily deliveries with two rejections, a co-op statement with itemised deductions, a household customer's unbilled deliveries and an unlinked part-payment; a missed vaccination, upcoming calving and an expired withdrawal. The demo runs entirely on the phone (storage namespace `mylkio_demo_v3_`).

## 13. Development Roadmap: what was planned vs what was built

The v1.2 roadmap (Phases 0–5) was replaced during the build by a nine-phase delivery plan. Both are shown so the history is clear.

| # | Built phase | What it delivered | Detail |
| --- | --- | --- | --- |
| 0 | Validation | Not done in the product. Farmer interviews and the pilot remain a business task. | — |
| 1 | Release foundation | Baseline, CI, branch-per-change releases, Vercel preview checks | `docs/release-and-migration.md` |
| 2 | Backend and security | Server-only API, same-origin checks, Zod validation, membership checks, audit log; moved from Supabase to **Neon** (8 Nov 2026); per-record cloud sync with an outbox, idempotent retries and conflict review; legacy-data import | `docs/phase-2-backend.md`, `docs/neon-backend.md`, `docs/per-record-sync.md` |
| 3 | Correct records and calculations | Nairobi dates, one-counted-total milk rule, ledger-based balances, voids, duplicate warnings, legacy balance migration | `docs/phase-3-records-and-calculations.md` |
| 4 | Sales workflows | Co-op statements with reconciliation, household bills, allocations, buyer statements, printing | `docs/phase-4-sales-workflows.md` |
| 5 | Herd-care workflows | Date-based withdrawal, planned calving, calf records, dry-off reminders, saving symptom checks | `docs/phase-5-herd-care.md`; vet guide: `docs/vet-and-illness-feature.md` |
| 6 | Offline reliability | IndexedDB storage, photo shrinking, backup/restore fixes, "Backup and storage" card, offline-open guarantee | `docs/phase-6-offline.md` |
| 7 | Interface refinement | One colour family, shared styles, bottom-sheet forms, no wrapping, tablet layout | `docs/phase-7-interface.md` |
| 8 | Website and commercial administration | Manual payment ledger, billing states, administrator follow-up board, Privacy and Terms, SEO and share picture | `docs/phase-8-commercial.md` |
| 9 | Validate and release | Security and privacy review, Content-Security-Policy, load test, backups finding, phone test script, release checklist and rollback | `docs/phase-9-release.md` |
| + | Website manager | Administrators edit contact details, prices, testimonials and FAQs (migration 0007) | `docs/site-content.md` |
| + | Team logins | Several logins per farm with roles and invitations (migration 0008) | `docs/team-logins.md` |
| + | Password reset | Forgot-password flow by email | `docs/password-reset.md` |
| + | Kiswahili for newest screens | Plan and payment, storage, cloud saving, vet contacts, sign-in, team, reset | `docs/kiswahili.md` |
| + | Visual polish | Holstein homepage photo, larger hero heading, premium hover motion, consistent section spacing | in this document, section 26 |

## 14. Commercialization Strategy

Positioning: “Know your cows, your milk, and who owes you—in one simple place, even offline.” Initial customer: independent Kenyan dairy farmers who sell to cooperatives, households, or both. Distribution: referrals, cooperatives, vets, agrovets, farmer groups, on-farm demos and WhatsApp.

**Pricing as built (monthly, KSh; changed 16 November 2026; administrators can change the amounts, section 23):**

| Plan | Price | Herd guide | Includes |
| --- | --- | --- | --- |
| Starter | 700 | up to 5 cows | Everything in the core app, emergency-signs guide, seasonal calendar |
| Farmer | 1,300 | up to 25 cows | Starter plus the symptom checker (hidden until a vet approves the guide) |
| Farm Pro | 2,800 | no limit | Farmer plus the vet finder and **team logins** (owner plus five managers/workers) |
| Custom | quoted per farm | no limit | Every Farm Pro feature; price, note and team size agreed per farm and set by an administrator. Never chosen at sign-up: the website and sign-up box show "Talk to us" |

**Plan features (as built, `lib/plans.ts`; one flag per feature).** Starter records, Farmer explains, Farm Pro oversees.

| Feature | Starter | Farmer | Farm Pro and Custom | Built? |
| --- | --- | --- | --- | --- |
| Core app: herd, milk, sales, payments, finance, reminders, offline, export | Yes | Yes | Yes | Yes |
| Emergency-signs guide, seasonal calendar, My vets | Yes | Yes | Yes | Yes |
| Produced vs sold | Yes | Yes | Yes | Yes (migration 0010) |
| Reminders as phone notifications | Yes | Yes | Yes | Not yet |
| Symptom checker | No | Yes | Yes | Built; hidden until a vet approves it |
| Cost per litre | No | Yes | Yes | Yes |
| Milk drop alert and cow ranking | No | Yes | Yes | Yes |
| Fertility flags | No | Yes | Yes | Yes |
| Reminders by SMS | No | Yes | Yes | Not yet |
| Vets near you, team logins | No | No | Yes | Yes |
| Weekly owner summary | No | No | Yes | Yes |
| Farm report for a bank or SACCO | No | No | Yes | Yes |

The trial keeps the Farmer set. When a trial has ended, a payment is over 7 days late or the plan is cancelled, every paid extra pauses and the farm falls back to the Starter set; records stay readable and exportable. A feature the plan lacks shows one calm line where it would appear ("Cost per litre is part of the Farmer plan." with a link to Settings), never a pop-up. Plan descriptions on the website, sign-up box and Settings are generated from the same table and mark a feature "coming soon" until its screen is built (`FEATURES_COMING_SOON`, removed one by one as each ships), and the symptom checker "coming after vet review" until a vet approves it.

A **14-day free trial** gives every new farm the Farmer features. Annual (10 months' price for 12) and quarterly options from the original hypothesis are **not built**: billing is monthly and recorded by hand. Pricing remains a validation hypothesis, not a validated willingness to pay. A saved price applies only to new subscriptions and plan changes; nobody is re-billed.

Cooperative partnership ideas (group onboarding days, co-branding, referral reward, aggregate dashboard, volume pricing after about 50 paying farmers) are **not built** and stay conditional on partner demand and farmer consent. Do not promise guaranteed yield or profits.

## 15. Launch Metrics

Onboarding completion, time to first milk record, weekly active farms and milk-recording days, farmers logging milk on at least 5 days a week, sales/payment records per farm, reminder completion, support requests and resolution time, trial-to-paid conversion, churn, referrals, revenue per farm, sync failure and duplicate rates.

**As built:** the administrator **usage screen** reports who is using the app now and active in 24 hours, 7 days and 30 days (as at any chosen moment), accounts by plan and status, sign-ups per day, monthly value, and money received per month. Activity records only that an account made a request (at most one row per five minutes), never what it did, and is deleted after about six months. Product analytics beyond this (time to first milk, reminder completion) are not collected.

## 16. Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Farmers find entry tedious | Bulk entry, defaults, simple onboarding, field usability tests |
| Inconsistent connectivity | Offline-first logging, explicit sync status, retries |
| Incorrect balances undermine trust | Ledger-calculated balances, voids not deletes, audit trail, reconciliation, tests |
| Health information read as medical advice | Sourced, plain-language "fits" wording, disclaimers, DRAFT gate until a vet approves, no medicines or doses |
| Limited willingness to pay | Pilot interviews, tier testing, clear ROI |
| Too many features at launch | Strict MVP scope, defer cooperative portal and AI |
| Shared devices and privacy | Session controls, per-role access, minimal personal data |
| **Data loss (new)** | Phones keep their own copy and a downloadable backup; Neon history is only 6 hours and there are no snapshots (section 28) |
| **Database owner connection (new)** | Isolation rests on server checks plus SQL membership checks, not row-level security; keep `DATABASE_URL` only in Vercel (section 25) |

## 17. MVP Acceptance Checklist: build status

"Built" means the behaviour exists and is covered by automated tests and/or a browser check. **No item is signed off by a real pilot farmer yet**; that is the next step.

| # | Criterion | Build status |
| --- | --- | --- |
| 1 | New farmer can choose English/Kiswahili at login/onboarding and log first farm-total milk without cows | Built |
| 2 | Milk screen defaults to farm-total, optional per-cow toggle, gentle per-cow prompt after 10 cows | Built |
| 3 | Farm totals and cow breakdown never double count; corrections auditable | Built (tests) |
| 4 | Co-op deliveries, rejections/adjustments, monthly settlement, receipts, balance | Built (tests) |
| 5 | Household deliveries, monthly bills, advances/partial receipts, balance | Built (tests) |
| 6 | Both ledger flows under 30 seconds on a small Android screen | Needs pilot timing |
| 7 | Vaccination, deworming, calving, dry-off, pregnancy follow-up, withdrawal and payment reminders date-based, consolidated, deduplicated | Built |
| 8 | No vet schedule presented as a universal prescription; withdrawal never "automatically safe" | Built (wording and rules; vet content DRAFT) |
| 9 | Dashboard, cow list, due dates, milk/health events, deliveries and payments work offline | Built; verified in a real browser with the server off |
| 10 | Offline operations sync with no silent loss, duplicate charges or overwritten balances; waiting count visible | Built (tests, load check of 5,000 records, retries recognised) |
| 11 | Core reports and daily UI in English and Kiswahili | Daily UI built in both; Kiswahili awaits a native speaker; website, admin and vet clinical content English only |
| 12 | Farm data isolated; shared-phone sessions and buyer personal data protected | Built; see accepted risks in section 25 |
| 13 | Pilot farmers can finish all six jobs with minimal assistance | **Not yet tested** |
| 14 | Deferred features are not blockers | Met (expenses were in fact built) |

## 18. Resolved Product Decisions

**From 24 October 2026**

| Topic | Final MVP decision |
| --- | --- |
| Milk entry | Farm-total default; cow-level optional; nudge after 10 cows |
| Sales channels | Both cooperative settlement and household billing in v1, lightweight |
| Reminders | High-consequence dates only; one consolidated feed; no generic nudges |
| Offline | Entire daily workflow offline; automatic later sync |
| Language | English + Kiswahili for core workflows |
| Billing cadence | Monthly default (annual 10-for-12 and quarterly **not built**) |
| Cooperative go-to-market | Group onboarding and training; no automatic discount; later aggregate dashboard (**not built**) |

**Decisions made during the build**

| Topic | Decision |
| --- | --- |
| Backend | Neon Postgres and Neon Auth (replaced Supabase on 8 November 2026) |
| Sync | One record at a time with an outbox, not whole categories; append-only money and milk records |
| Billing | Manual: administrator records each payment received; no M-Pesa API; trial 14 days; 7-day grace |
| Records during non-payment | **Never locked or hidden.** Only paid extras (symptom checker, vet finder) pause |
| Sign-up | Invitation-only farm creation during the pilot |
| Vet guide | Rules-based, sourced, offline symptom checker (not AI); photo is for the vet, never analysed; hidden on production until a vet approves |
| Team logins | Farm Pro only; owner plus five; server enforces roles |
| Site content | Contact, prices, testimonials, FAQs editable by administrators; trial length, plan limits, legal text and other wording are not |
| Testimonials | Invented examples are labelled "Example, not a real review" until real ones replace them |

**Remaining implementation choices (not scope questions)**
- Field-test Kiswahili terminology and the 30-second entry target with Kenyan farmers.
- Validate veterinary content with qualified local professionals; obtain consent for any cooperative-level aggregate data sharing.
- Verify brand/trademark/domain availability, and test the pricing in pilot interviews.

**Background references** (planning only; clinical schedules, pricing and adoption assumptions still need local validation)
1. FAO, Dairy marketing in Kenya: https://www.fao.org/4/x5661e/x5661e0t.htm
2. Casaburi & Macchiavello, dairy payment frequency: https://www.econ.uzh.ch/dam/jcr:d8a1b5bb-ff58-4a32-8409-9110cbe11d8d/casaburi_macchiavello_dairy_AER%202019.pdf
3. IPA, Dairy Market Responses to Saving Constraints in Kenya: https://poverty-action.org/study/dairy-market-responses-saving-constraints-kenya
4. Dairy cattle herd health management manual: https://cgspace.cgiar.org/server/api/core/bitstreams/66052ba2-ff96-46b7-8a4a-145595e0f83b/content
5. IFPRI Africa, digital adoption barriers: https://africa.ifpri.info/2026/07/16/a-phone-in-every-pocket-a-farming-app-in-almost-none-kenyas-hidden-digital-divide/
6. Mercy Corps AgriFin, Kenyan Farmers Go Digital: https://mercycorpsagrifin.org/kenyan-farmers-go-digital/
7. IFPRI, dairy farmer finances: https://www.ifpri.org/blog/world-milk-day-how-kenyan-dairy-farmers-manage-their-money/

Product owner: Versaly. Brand note: verify “Mylkio” trademark, domain, and app-store availability before commercial launch.

## 19. Implementation Guardrails (still in force)

- Onboarding must not require registering a cow before recording the first farm-total milk entry.
- Farm-total and cow-level milk must not double-count production.
- Record milk production separately from delivered/sold quantities; spoilage, home use and unsold milk are optional adjustments.
- Keep payment records append-only or auditable; calculate balances from ledger transactions.
- Offline operations have stable client-generated ids, retry-safe sync and clear conflict resolution.
- Reminder schedules are configurable by a qualified vet or the farmer; vaccination and withdrawal guidance is not veterinary advice.
- Cooperative-branded onboarding must never expose an individual farmer's records to a cooperative without explicit permission.
- Pricing is a validation hypothesis, not a guaranteed market rate.
- **New:** farm separation is enforced on the server and in SQL, never only in a screen. A hidden button is never the only protection.
- **New:** database changes must be additive so the previous app version keeps working; apply to the Neon `preview` branch first, then `production` with the owner's go-ahead.
- **New:** health content stays DRAFT and hidden from farmers on production until a named vet has reviewed it.

---

# As-Built Record

## 20. Architecture and technology

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 3, `lucide-react` icons, Zod 4 for request validation, `@neondatabase/serverless` for Postgres, `@neon/auth` (managed Better Auth). Tests: Vitest 5 with `@electric-sql/pglite`. Hosting: Vercel (production deploys from `main`; every pull request gets a preview deployment).

**How a request flows**
1. The browser holds the farm on the phone (IndexedDB) and works from that copy.
2. Changes are queued in an **outbox** and sent to `POST /api/farms/:id/operations`.
3. The route checks same-origin and JSON, asks Neon Auth to verify the session cookie (the cookie belongs to this site; `/api/auth/*` proxies to Neon Auth), validates with Zod, then calls a SQL function with the verified user id.
4. The SQL function **re-checks membership and role**, applies the batch all-or-nothing and writes an audit row per changed record.
5. The phone downloads what changed since its cursor (`GET /api/farms/:id/changes?since=N`, pages of 1,000). Browsers never connect to the database; there is no browser-facing database API (Neon Data API is not enabled).

**Without the Neon settings** the site stays in demo mode (sample data on the phone) and sign-in is unavailable. `/api/backend-status` reports whether the backend is configured.

**API routes (all under `/api`)**

| Route | Who | Purpose |
| --- | --- | --- |
| `auth/*` | public | Neon Auth sign-up, sign-in, sign-out, session refresh, password reset |
| `account/session` | signed in | Account, role, subscription, or `needsOnboarding` |
| `account/onboard` | signed in | Create farm, trial subscription (needs an invitation code while codes are set) |
| `account/join` | signed in | Join a farm with a team invitation code |
| `farms/:id/operations`, `farms/:id/changes` | farm members (role-filtered) | Record sync |
| `farms/:id/team` | owner | List team, create/withdraw invitation, change role, remove |
| `farms/:id/vets` | farm members | The farm's own saved vets |
| `vets` | signed in | Vet directory (Farm Pro, checked on the server), suggest a vet |
| `leads` | public | Website enquiry form (honeypot, strict fields, database rate limit) |
| `site-content` | public | Contact, prices, testimonials, FAQs (cached 60 seconds, falls back to built-in wording) |
| `health`, `backend-status` | public | Deployment checks |
| `admin/accounts`, `admin/usage`, `admin/payments`, `admin/notes`, `admin/collections`, `admin/leads`, `admin/vets`, `admin/site-content` | platform administrators | Section 23 |

**Environment variables (Vercel; never in git):** `DATABASE_URL` (pooled), `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (32+ characters), `SIGNUP_INVITE_CODES` (optional), `NEXT_PUBLIC_SITE_URL` (optional, custom domain), `NEXT_PUBLIC_SHOW_DRAFT_VET_CONTENT` (Preview and local only, **never Production**); `DATABASE_URL_UNPOOLED` only on a developer machine for `npm run db:migrate`. Production has exactly four secrets set today.

**Project layout:** `app/` (pages, API routes, `/privacy`, `/terms`, `/reset-password`, sitemap, robots, share picture), `components/` (admin, auth, billing, buyers, dashboard, export, finance, herd, layout, marketing, milk, sales, settings, site, sync, ui), `lib/` (rules and storage; `lib/server/` for server-only code; `lib/vet/` for the health guide), `db/migrations/` (SQL), `docs/`, `tests/`, `public/` (manifest, service worker `sw.js`, images).

## 21. Accounts, sign-in and password reset

- **Neon Auth** holds users and sessions. Anyone can create a sign-in identity, but an identity with no farm can read and write nothing. A farm is created only with an invitation code while `SIGNUP_INVITE_CODES` is set.
- Passwords: 12 or more characters. Sign-in and sign-up rate limits belong to Neon Auth. Old plaintext-password accounts from the earliest local prototype are stripped and removed on first sign-in.
- **Password reset by email:** Forgot your password, enter email, "if an account exists, a link is on its way" (same answer whether or not the address exists). The link is one-use and valid 15 minutes, opens `/reset-password` (the token is read once and removed from the address bar; the page is `noindex`), and a used or expired link offers a new request. The redirect target is restricted to this site. English or Kiswahili follows the farmer's choice.
- **Still to do in the Neon console (not code):** connect Mylkio's own email sender (the shared sender is rate-limited and for development), set the application name to "Mylkio", turn on "revoke sessions on password reset". An administrator cannot set a farmer's password from the app.
- Trusted domain in production: only `https://mylkio-dairy-ms.vercel.app`; "Allow Localhost" is off.
- The first administrator is created by promoting a profile directly in the Neon SQL editor (`role = 'super_admin'`); no public route can create one. Two administrators exist today.

## 22. Team logins and roles

- Built 16 November 2026 (migration 0008, `lib/team.ts`, `lib/team-copy.ts`, `components/settings/TeamCard.tsx`). Permissions per role are in section 9.
- **Server decides.** `role_can_read` / `role_can_write` in SQL are mirrored by `lib/team.ts` for the screens; a test checks they agree for every role and kind of record. `farm_changes` filters what a worker's phone is ever sent (money records never leave the server for a worker); `apply_farm_operations` refuses a batch containing a forbidden kind and writes nothing.
- **Joining:** the owner (Settings, Your team) picks a role, optionally a name, and creates an invitation. A one-time code like `K7M2P-9XQ4T` (10 characters, no look-alike letters) and a link are shown **once** with Share on WhatsApp and Copy message; the database stores only a hash. The person opens the link or taps "Have a team invitation?" on the sign-in box, enters name, phone, email and password, and joins in that role without a farm of their own and without a Mylkio invitation code. A code works once, for 7 days, can be withdrawn, and wrong/used/expired/withdrawn all give the same message.
- The owner can change a role (effective immediately on the server) or remove a person (access ends immediately; what they recorded stays). A person already on a farm cannot join another until removed.
- **Plan limit:** Farm Pro and Custom, owner plus five (six logins) by default; a Custom farm can have its own number, set by an administrator. Open invitations count. Starter and Farmer see an upgrade note. The limit lives in `team_limit()` / `team_limit_for_farm()` (SQL) and `TEAM_LOGINS` / `teamLoginsFor()` (`lib/team.ts`); change both together. Error code `MY402` means "plan full" (HTTP 409).
- Administration lists and counts **owners only**, so a farm with four logins is one account in usage and billing.
- **Limits:** a removed person's phone keeps what it already downloaded until they sign out; a role change shows on a person's screen the next time they open the app; invitation codes are not attempt-limited (about 49 bits, 7 days, needs a signed-in identity); not built: leaving a farm yourself, transferring ownership, per-person activity reports (`updated_by` is already kept).

## 23. Plans, billing and administration

**Billing is manual.** An administrator records each payment received (amount, M-Pesa or bank reference, date, months covered, plan, recorded-by). It marks the farm Paid and moves **paid-until** forward by the months paid (an unexpired period carries on from where it ends; a lapsed farm starts from the payment day). The same M-Pesa/bank reference cannot be entered twice (case ignored). A mistake is **voided with a reason** (it stays listed, paid-until moves back); every payment and void is audited.

**States** (`lib/billing.ts`, worked out from dates, the same for Settings, Home and Admin): trial, trial ending (7 days or less), trial ended, paid, due soon (7 days or less), overdue, cancelled, platform account. `GRACE_DAYS = 7`.

**Policy:** records are **never locked or hidden** and stay readable and exportable. When a trial has ended, a payment is more than 7 days late or the plan is cancelled, the paid extras (symptom checker and vet finder) fall back to the Starter set; the server applies the same rule to the vet finder. Herd limits are a guide, not a lock.

**Administration screen** (platform administrators only), tabs: **Overview**, **Accounts and billing**, **Enquiries**, **Vet directory**, **Website**.
- Overview: usage figures (section 15), accounts by plan and status, money received this month, last month and the last six months.
- Accounts and billing: a "needs a call or message" follow-up list (overdue, past trial, due within a week, trial ending within a week; most urgent first) with Call, WhatsApp (pre-written with first name, date and price; always says the records are safe) and Record payment buttons; farms over their plan's herd size (only a count of live cows is read); account notes; a CSV download of the listed accounts (contact and plan details only). Plan and status changes made by hand are not yet kept as a history of their own.
- Enquiries: website contact-form submissions.
- Vet directory: the "waiting to be confirmed" queue (Confirm needs the day the number was rung and rejects a future day; Reject; Hide; Add; Edit).
- Website: edit contact details, subscription prices, testimonials and FAQs, each with Save and "go back to the built-in wording"; previous values are kept in `site_content_history`. A price change never re-bills anyone.
- Administrators see account details, plan and usage counts, not farm records; the database functions are built that way to match the Privacy notice. Administrators are not counted in usage.

**Farmer-side billing:** Settings shows plan, state, "Paid until …" or "Free trial: N days left", herd against plan and a **Message Mylkio** WhatsApp button; Home shows a calm notice only when something needs attention.

## 24. Language support (English and Kiswahili)

- `useLanguage()` (saved on the phone as `mylkio_language`) drives the whole app; `EN / SW` button in the header and on the sign-in box. Wording lives in `lib/app-copy.ts` (billing, storage, cloud saving, vets, sign-in), `lib/team-copy.ts`, `lib/password-reset.ts` and `lib/translations.ts`, English and Kiswahili side by side; `translateMessage` translates known system sentences and leaves unknown ones in English; Kiswahili dates use Kiswahili month names.
- `tests/app-copy.test.ts` fails if either language misses an entry or a known sentence disappears from the code.
- **English only on purpose:** the public website, Privacy and Terms (a lawyer's decision), administration screens, the vet symptom checker and illness guide content (clinical, awaits vet review), and some older server messages.
- **Needs a native speaker:** several terms are judgement calls (*nakala rudufu* for backup, *wingu* for cloud, *kikagua dalili* for symptom checker, *mpango* for plan, *mwaliko* for invitation). See `docs/kiswahili.md`.

## 25. Security and privacy

**Held up under review (Phase 9):** all signed-out data routes return 401; every write route checks Origin and JSON; every signed-in route verifies the session server-side; every admin route re-checks the administrator role in SQL; farm separation is tested (another farm's owner gets 403); plan limits for the vet finder are enforced on the server; database tables grant nothing to anyone but the owner role; request bodies are size-capped while read (records over 1 MB and batches over 500 operations refused); database errors and connection strings never reach the client; no `eval`, `innerHTML` or `dangerouslySetInnerHTML` in browser code; CSV cells starting `= + - @` are defused; the website enquiry form has a honeypot, strict fields and a database rate limit.

**Content-Security-Policy** (`next.config.ts`, guarded by `tests/security-headers.test.ts`): framing refused, plugins refused, scripts/connections/fonts limited to this site, images limited to this site, data/blob addresses and Unsplash stock photos, insecure requests upgraded, no `eval` in production. Limit: Next.js inline scripts require `'unsafe-inline'`, so it is a safety net, not complete protection against injected scripts. Checked with zero violations on the website, the demo (every tab), the service worker and photo shrinking. `npm audit` shows 0 vulnerabilities (test runner updated to Vitest 5).

**Accepted risks**
1. The app connects to Postgres as the database owner; there is no row-level security. Separation depends on server checks plus SQL membership checks. A bug that passed the wrong id would leak data, and anyone with `DATABASE_URL` could read everything: keep it only in Vercel. A later hardening step is a less-privileged database role plus row-level security.
2. Pilot invitation codes and team invitation codes are not attempt-limited; use long random codes.
3. No email check at sign-up yet; sign-in/sign-up rate limits are Neon Auth's, not visible to this code.
4. Admin screens and the team screen have been tested with generated data and server tests, not yet seen on a real signed-in live account.

**Privacy:** the Privacy notice (`lib/legal.ts`, one source for the page and tests) names the providers (Neon in Frankfurt, Vercel), states plainly that data is stored **outside Kenya**, lists what is collected (including administrators' payment records and notes) and what stays on the phone, retention and rights under the Data Protection Act, 2019. Account activity is purged after 180 days by the database; farm records are deleted only on request. Tests fail if the notice stops naming the providers or the terms drift from the real trial length and grace period. **Not yet done:** a lawyer's review (especially the three-months-of-fees liability limit and the "not veterinary advice" wording), registration with the Office of the Data Protection Commissioner, confirming the support number and email on the site are the ones that will be answered. The support email is written into the Privacy and Terms text and does not follow the Website tab; change it in `lib/contact.ts` and `lib/legal.ts`.

## 26. Offline, sync and the website

**On the phone**
- **IndexedDB** holds the farm and the outbox (with `localStorage` as a fallback); saves are coalesced and a failed write never crashes the app. The old `localStorage` copy is moved across and removed only after the new copy reads back identically. The app asks the browser to keep the data.
- A red notice appears if the phone cannot save, with how many changes are not yet in the cloud.
- The **service worker** (`public/sw.js`, cache `mylkio-cache-v4`) saves the app's files so it opens with no internet after the first visit; Settings, "Backup and storage" shows "Ready for offline". Stale-while-revalidate for the home page, so a returning visitor may see the previous version once. Online data requests skip the cache.
- **Backup and storage card:** Download backup (reminder after 30 days, or if a farm with 20+ records has never backed up), space used and whether the browser protects it, offline readiness, Shrink photos. **Restore** accepts the app's own backups (refuses a newer version with a reason), never overwrites existing records, shrinks big photos as it restores. iOS Safari can clear a site's data after weeks unopened unless the app is on the home screen; the backup is the protection.

**Sync rules (`db/migrations/0002_record_sync.sql`, `lib/cloud-store.ts`, `lib/sync-core.ts`)**
- Every save goes to the phone first; the record-level difference is queued with a new operation id. Actions touching several kinds of record (a delivery with its receipt, a calving with its calf and reminders) upload as one all-or-nothing group.
- An operation leaves the outbox only when the server reports it applied; retries return the original result and are never applied twice. Sync runs after each save, on reconnect and when the app returns to the foreground.
- A record changed elsewhere since the phone's base version is reported as a **conflict** with the server's copy and shown in a review card: keep this phone's version or use the cloud version. Refused (immutable) changes can only be discarded. A record over 1 MB, or a group the server refuses, is set aside with an explanation so it cannot block the queue.
- Milk, delivery, payment, statement, bill and allocation records are append-only (void only). Deletes are kept as tombstones. Each changed record writes one audit row.
- The cache key includes account and farm, so one account's queue is never sent under another.
- Measured on the preview database: 500-operation batches about 156 ms each (5,000 milk records in 10 batches); replaying 500 applied operations recognised all 500 as repeats; reading a 5,000-record farm back took 5 ms in the database. Concurrent load from many phones and a real mobile network have not been tested.

**Website (signed-out `/`)**
- Hero with the Holstein photo (`public/images/hero-dairy.jpg`), large heading, no badge; features, how it works, pricing, testimonials, FAQs, contact form and footer. **Pricing, contact details, testimonials and FAQs come from the administrator's Website tab** and fall back to built-in wording if the database cannot be reached.
- Sitemap, `robots.txt` (API and `/reset-password` excluded), canonical addresses, Open Graph/Twitter tags and a generated share picture. The address comes from `NEXT_PUBLIC_SITE_URL` (default the Vercel address; set it when a custom domain is added).
- **Visual system:** one warm ivory/charcoal/sage/gold family. Premium hover motion uses a single easing (`--ease-premium`) and only on real pointers: lifted and shining buttons, lifted cards and tiles, sliding underline links, nudging arrows, soft row highlights; reduced-motion is respected. Consistent spacing (`.section` classes) across website and app.
- Sample testimonials are labelled "Example, not a real review" (headed "Sample stories") until real ones are added.

## 27. Vet guide, finding a vet and the health content gate

- **Always shown (every plan, never paywalled):** emergency-signs guide (18 signs, 15 red flags: 10 emergencies and 5 same-day; each with why, what to do, what not to do, whether reportable) and the seasonal risk calendar for Kenya's four seasons.
- **Symptom checker (Farmer, Farm Pro, trials):** runs on the device with no AI and no connection. The farmer ticks signs (30 grouped signs); it matches against 11 sourced condition descriptions (mastitis, East Coast fever, foot-and-mouth, lumpy skin disease, milk fever, bloat, foot rot, calf scours, pneumonia, retained afterbirth or womb infection, abortion including brucellosis) and shows up to three as **"Fits closely" or "Fits partly"**, never a probability and never "your cow has X". Red flags come first and set urgency; matching nothing never says "all clear". Every entry cites its sources (Merck Veterinary Manual, WOAH, Animal Diseases Act summary) behind "Where this comes from". An optional photo stays in memory (never uploaded or analysed); "Send summary" shares the text and photo via the phone's share sheet or WhatsApp.
- **Finding a vet:** *My vets* (every plan): up to 10 saved vets with Call, WhatsApp and Send my check, saved on the account and cached on the phone. *Vets near you* (Farm Pro, enforced on the server): confirmed directory entries for the farm's county, emergency call-outs first, each marked "Number confirmed by phone on [date]"; unconfirmed entries never appear. *Suggest a vet* (any account): stored pending and hidden, 5 per account per day, duplicates detected by the last nine digits. Administrators confirm by ringing the number. Official contacts (Directorate of Veterinary Services, Kenya Veterinary Board) are shown labelled "not yet confirmed by phone"; the Board is a regulator, and its registers are linked, not copied.
- **Review gate (`lib/vet/review.ts`):** every entry is `DRAFT`. On production the farmer sees only the "call a vet now" banner and a note that the guide is being checked; drafts appear (with a visible banner) only where `NEXT_PUBLIC_SHOW_DRAFT_VET_CONTENT=true` (Preview/local). To approve an entry a named reviewer and a date are recorded in a pull request; a test refuses an approval without them.
- **Not built:** AI photo reading (the plan flag `healthChecksPerMonth` is reserved), paid vet review of a case (step D), anonymised county outbreak alerts (step E), vets signing themselves up, location sharing and distance sorting, vet ratings. Nairobi is the pilot county; direct numbers still need confirming by phone.

## 28. Quality, testing and releases

- **Tests (517):** dates, milk rules, ledger, settlements, herd care, billing, plans and features, legal text, backup, photos, local store, sync core, password reset, app copy (language parity), vet checker/phone/review, security headers; **server tests** against the real migrations in PGlite (farm API, commercial, leads, usage, invites, site content, team: 26) ; **database tests** for sync, two-device scenarios, settlements. Each "known" system sentence and the screen-vs-database role rules have a test that fails if they drift.
- **CI:** the GitHub "Validate" workflow runs `npm ci`, `npm run build`, `npm run typecheck`, `npm test` on every pull request and on `main`.
- **Release routine:** work on a branch; open a pull request; wait for **all three checks** (Vercel, Vercel Preview Comments, validate) to read SUCCESS; merge; confirm `/api/health` reads `ok` on all four lines and sign-in works. Never run `vercel --prod` as routine.
- **Database changes:** additive migrations in `db/migrations/`, applied to the Neon `preview` branch, tested, then to `production` with the owner's go-ahead, recorded in `public.schema_migrations`. Apply a migration **before** deploying code that reads it (merging code first is safe for 0007 only because the endpoint falls back). `npm run db:migrate` (direct connection string) or the Neon SQL editor. Ten migrations: 0001 accounts and farms; 0002 record sync; 0003 leads; 0004 usage; 0005 vet directory; 0006 commercial admin; 0007 site content; 0008 team logins; 0009 new prices and the Custom plan; 0010 the split of unsold milk (`milkUse`).
- **Checking a deployment:** `/api/health` verifies settings, the database connection, the schema and Neon Auth, never returns environment values, and hides technical detail in production.
- **Rolling back:** an app problem is fixed by promoting the previous Vercel deployment (about a minute, no database change). A data problem needs care: a Neon restore discards newer valid records; with a 6-hour history window act within hours. A bad invitation code is removed from `SIGNUP_INVITE_CODES` and redeployed. Never delete the production Neon branch or switch Neon Auth off (that deletes every user).

## 29. Operations: admin tasks

- **Weekly:** work the follow-up list (calls and WhatsApp messages), record payments as they arrive, confirm vets by phone, answer enquiries.
- **Per farmer:** give one long random invitation code (add to `SIGNUP_INVITE_CODES`, redeploy); after sign-up the farm shows in Accounts.
- **Change prices, contact details, testimonials, FAQs:** Admin, Website tab (about a minute to show for visitors).
- **Backups:** remind farmers to use Settings, Download backup; see the gap in section 30.
- **Admin access:** promote or demote administrators in the Neon SQL editor; keep at least two.

## 30. Known gaps and open items

**Needs a person (not code)**
1. **Backups.** Neon's history window on this project is 6 hours (free plan) and there are no snapshots, so a mistake noticed the next day cannot be restored from Neon. Move to a plan with 7+ days, or take snapshots on a schedule (at least before each database change and weekly), and test one real restore into a new branch.
2. **Real-phone test** on a low-cost Android (and an iPhone if used) over mobile data: install to home screen, airplane-mode open, offline entry then reconnect, camera photo, backup download, keyboard and rotation (script in `docs/phase-9-release.md`).
3. **Neon Auth production settings:** own email sender, application name "Mylkio", revoke sessions on password reset; then try a real reset email and a real team invitation end to end on live accounts.
4. **Lawyer review** of Privacy and Terms; Data Protection registration; ring the support phone number once to be sure it is answered (`+254 184 129145`, given by the owner on 16 November 2026; its "018" start is not a usual Kenyan prefix; change it in `lib/contact.ts` or Admin > Website; with no number, phone and WhatsApp buttons are hidden and "message Mylkio" falls back to email) and confirm the email.
5. **Veterinarian review** of the guide; direct vet numbers confirmed by phone; fill the vet directory.
6. **Native-speaker review** of Kiswahili.
7. Replace sample testimonials with real ones (with the farmer's agreement).
8. Seen-on-live check of the admin screens, the Website tab and the Team card by a real administrator/owner login.
9. Test Farm Pro team behaviour with a worker account: no money visible, cannot add cows.

**Product and engineering backlog**
- Automatic M-Pesa payment, reminders sent by SMS/WhatsApp, annual and quarterly billing, a history of hand-made plan changes.
- Household delivery calendars and skipped-delivery tracking; undo-allocation button; calf weights and weaning; moving cows between lots; automatic cow status changes when a dry-off reminder is done; suggesting a withdrawal period from a medicine.
- Leaving a farm yourself, transferring ownership, per-person activity reports; an attempt limit on invitation codes.
- Less-privileged database role with row-level security.
- Existing cow photos are shrunk only when the farmer taps "Shrink photos".
- Kiswahili for the website, administration screens and (after vet review) the vet guide content.
- Concurrent multi-phone load test; test over a real mobile network.
- Cooperative portal and group onboarding (only if partner demand is validated).

## 31. Where the detail lives

| Document | Topic |
| --- | --- |
| `docs/neon-backend.md` | Backend design, setup, environment variables, `/api/health`, first administrator, usage data |
| `docs/per-record-sync.md` | The sync protocol, tests and limits |
| `docs/phase-2-backend.md` | Phase 2 history and legacy data import |
| `docs/phase-3-records-and-calculations.md` | Milk and money rules, legacy balance migration |
| `docs/phase-4-sales-workflows.md` | Statements, bills, allocations, buyer statements |
| `docs/phase-5-herd-care.md` | Withdrawal, calving, dry-off, saving checks |
| `docs/phase-6-offline.md` | IndexedDB, photos, backup, offline opening |
| `docs/phase-7-interface.md` | Interface standards |
| `docs/phase-8-commercial.md` | Billing, administration, Privacy and Terms |
| `docs/phase-9-release.md` | Security and privacy review, load check, backups, phone test script, release checklist, rollback |
| `docs/site-content.md` | Website manager |
| `docs/produced-vs-sold.md` | Produced vs sold and the optional split of unsold milk |
| `docs/cost-per-litre.md` | Cost per litre on the Finance screen |
| `docs/milk-drop.md` | Milk drop alerts and the weekly cow ranking |
| `docs/fertility-flags.md` | Fertility flags, days open and the calving interval |
| `docs/weekly-summary-and-farm-report.md` | Weekly owner summary and the farm report for a bank or SACCO |
| `docs/team-logins.md` | Roles and invitations |
| `docs/password-reset.md` | Reset flow and Neon settings |
| `docs/kiswahili.md` | What is translated and what is not |
| `docs/vet-and-illness-feature.md` | Vet guide, checker, directory, review gate |
| `docs/release-and-migration.md`, `docs/go-live.md` | Release policy; `go-live.md` is historical (Supabase era) |

Status: live and ready for a supervised pilot once the "needs a person" items in section 30 are cleared. Update this document with every release: the status table, the roadmap table, the migration list and the known-gaps list.
