Mylkio — Dairy Farm Management System
Product: Mylkio
Company: Versaly
Document: Project Overview & Product Specification
Version: 1.2 — 24 October 2026
Primary market: Kenya
Tagline (working): Smarter Dairy Farming. Made Simple.
Revision note (v1.2): Consolidates the seven approved MVP decisions and clarifies the offline, billing, reminders, and cooperative partnership boundaries.
1. Executive Summary
Mylkio is a mobile-first dairy farm management system for Kenyan dairy farmers who keep cows and sell milk to cooperatives, collection centres, traders, or individual customers. It replaces scattered notebooks, memory, and spreadsheets with simple daily records and useful reminders.
The product helps farmers answer five practical questions:
1. How much milk did my cows produce today, and which cows are producing more or less?
2. Which cows need attention—vaccination, treatment, pregnancy check, expected calving, or breeding?
3. How much milk have I sold, to whom, and what payments are still outstanding?
4. What does it cost to run the farm, and is the dairy operation profitable?
5. What should I do next?
Core promise: Know your cows, your milk, and your money—without complicated software.
2. Target Users and Jobs to Be Done
Primary: Small and medium dairy farmers
- Own or manage approximately 1–50 dairy cattle, with the system able to support larger herds.
- Sell milk daily to one or more cooperatives/collection centres or to individual buyers, sometimes on credit or monthly settlement.
- Need simple, fast record entry on a phone, in English or Kiswahili.
Secondary users
- Farm workers: enter milk yields, feed, and routine tasks under controlled permissions.
- Farm managers/owners: review herd performance, sales, costs, and overdue actions.
- Veterinary professionals: optionally receive/export animal history; no default access to private farm data.
- Cooperatives and milk buyers: potential future partner portal, not required for MVP.
Problems to solve
- Incomplete or inaccurate milk production records.
- Missed animal health, vaccination, breeding, or calving follow-ups.
- Confusion over deliveries, cooperative deductions, buyer balances, and delayed payments.
- Poor visibility into feed costs, other expenses, and actual earnings.
- Software that is too complex, data-hungry, or desktop-centric for daily farm use.
3. Product Principles
1. Mobile-first and farmer-friendly: large tap targets, clear labels, minimal typing, and a simple home screen.
2. Daily tasks before complex analytics: log milk in seconds; show what needs attention today.
3. Kenyan context: KSh, litres, local date formats, cooperative settlements, cash/M-Pesa/bank/manual payment records, and English/Kiswahili core workflow support.
4. Works with weak connectivity: support offline capture and later sync, with visible sync status and conflict handling.
5. Trustworthy numbers: distinguish recorded amounts from estimates; provide edit history for important transactions.
6. Privacy by default: separate farms and users, least-privilege permissions, and consent for sharing.
7. Progressive complexity: simple setup for one farmer, optional advanced tools as the farm grows.
4. Product Scope and Priorities
MVP (six non-negotiable jobs)
1. Add cows quickly, without requiring the entire herd before first use.
2. Log total farm milk by default, with optional cow-level logging on the same screen.
3. See important cow-care dates: vaccinations, deworming, treatment/withdrawal, pregnancy checks, calving, and dry-off.
4. Record cooperative deliveries, adjustments, expected settlements, receipts, and balances.
5. Record household deliveries, monthly bills, receipts, and outstanding balances.
6. Run all daily workflows offline and synchronize reliably later.
MVP essentials: simple bilingual English/Kiswahili onboarding and daily UI; dashboard; farm/cow registry; two lightweight sales ledgers; consolidated date-based reminders; manual payment recording; mobile-first PWA; basic core reports; secure farm separation. A milk record must not require a cow profile. The first-week experience takes priority over comprehensive setup.
Phase 2 (after farmer validation)
- Feed stock/planning, expenses and deeper profitability analysis; calf growth and detailed lactation analytics.
- Advanced invoices, recurring billing automation, worker/team management, richer reporting and exports.
- Cooperative bulk admin dashboard, branded group onboarding, aggregate activity/deliveries, and training toolkit only after partner demand is validated.
- Optional SMS/WhatsApp delivery, subject to opt-in and economics.
Future/optional
- Cooperative data integrations, automated M-Pesa collection/reconciliation, route optimization, advanced genetics, sensors/IoT, loans, insurance, AI insights, and full accounting.
- No promise of financial services, automatic payments, or custom cooperative software in v1.
5. Functional Modules
5.1 Farm Setup and Onboarding
- Create farm: name, county, optional location, herd size, contact details, preferred language, and currency (default KSh).
- Choose operating style: individual farmer, managed farm, or multi-farm owner (multi-farm later).
- Add first cows, buyers, and opening balances via guided setup.
- Allow quick-start with herd totals only if farmer is not ready to register every cow.
- Provide demo/sample data, a short walkthrough, and contextual help.
5.2 Herd / Cow Registry
Each cow profile should include:
- Unique internal ID; ear tag/name; photo (optional).
- Breed, sex, date of birth or approximate age, acquisition date/source.
- Current status: lactating, dry, heifer, calf, pregnant, sick, sold, deceased, or archived. Use independent attributes where appropriate (e.g., a lactating cow may also be pregnant) rather than one mutually exclusive status.
- Parentage (optional), parity/calving history, notes, and attachments.
- Timeline of milk, health, breeding, and other events.
- Ability to archive/sell/deactivate an animal without deleting history.
Useful views: all animals, lactating, pregnant, due soon, sick/under treatment, dry, calves, and archived.
5.3 Milk Production
- Single entry screen with default toggle: Log total farm milk / Log by cow. Quick entry example: “Today: 42 litres total.” Date defaults to today; session (AM/PM) is optional, not required for a daily total.
- Cow-level entry is optional; offer fast batch entry and optional sessions for advanced farmers. After 10 cows are added, gently prompt: “Want to see which cows produce the most? Start logging by cow.” Never force conversion.
- Clearly label each milk record's mode (farm_total or cow_level). For a given date/session, do not double count farm-total and cow-level entries: present one authoritative total and show breakdown only if it reconciles. Allow switching modes with an explicit replace/merge confirmation and audit history.
- Track milk sold, household use, calves, waste and balance as optional later detail; do not block initial logging.
- Show daily/weekly/monthly totals; per-cow analytics only where individual records exist, with no invented allocations.
- Validate litres and warn about potential duplicates; quick logging target under 30 seconds.
5.4 Buyers, Sales, and Deliveries
Two distinct, lightweight MVP ledgers, both usable in under 30 seconds per entry:
Ledger	Required MVP fields	Behavior
Cooperative deliveries	Date, litres delivered, rate/litre, rejection or adjustment, expected amount, amount received, balance	Daily deliveries; simple configurable monthly statement/payment cycle; preserve adjustments separately
Household customers	Customer name, phone, monthly litres or delivery schedule, price/litre, amount billed, amount paid, balance	Monthly advance payment or pay-on-delivery; manual bills and partial receipts


- Buyers may include cooperatives and households; preserve historical rates on transactions. Additional buyer categories can use a simple generic sale flow.
- Calculate cooperative expected amount from accepted litres × recorded rate plus/minus explicitly entered adjustments; show gross, adjustments, receipts, and outstanding separately. Rejected litres must not be billed unless explicitly overridden.
- Allow household delivery records and simple monthly bill generation or manual billed amount; prevent counting the same delivery twice.
- No full accounting, complex contracts, delivery route optimization, automatic payment collection, or cooperative back-office system in MVP.
5.5 Payments and Financial Records
- Manual receipt recording against cooperative settlements or household bills; support partial and advance payments and show amount due/paid/balance.
- Payment method: cash, M-Pesa (manual reference only), bank, other. No M-Pesa API or collection in v1.
- Distinguish billed/expected amounts from actual cash received. Maintain correction history and avoid duplicate receipts during sync.
- Basic MVP financial view: cooperative receivables, household receivables, and total received. Farm expense tracking and profit/margin calculations are Phase 2, not required for the six MVP jobs.
5.6 Health, Vaccination, and Treatment
- Record symptoms, illness, vet visits, diagnoses (as entered by user/vet), treatments, medicines, cost, and outcome.
- Record vaccinations: name, date administered, provider, batch/notes (optional), and next due date when supplied.
- Reminders for follow-ups and next vaccination dates; configurable schedules based on a vet's recommendation, not automatic medical prescriptions.
- Track medicine/milk withdrawal periods when explicitly provided by a veterinarian or approved product instructions; flag milk as restricted and warn before logging it as saleable.
- Store animal treatment history and optional documents/photos.
- Mylkio is a record-keeping tool, not a substitute for veterinary advice.
5.7 Breeding, Pregnancy, and Calving
- Record heat observation, insemination/mating, sire or AI provider, pregnancy check and result.
- Record confirmed pregnancy, estimated due date, calving outcome, calf linkage, and post-calving follow-up.
- Display projected calving dates as estimates, with configurable species/breed/vet assumptions rather than guaranteed dates.
- Show upcoming pregnancy checks, dry-off planning, and calving preparation reminders.
5.8 Tasks and Notifications
MVP: only consequential, date-based reminders:
- Vaccination due/overdue; deworming due; expected calving; dry-off; heat/insemination follow-up when pregnancy has not been confirmed; milk treatment withdrawal ending; household payment due; expected cooperative statement/payment.
- Use user/vet-entered due dates and configurable schedules. FMD six-month, LSD annual, and calf deworming three-month intervals may be shown as editable educational examples only, never as universal automatic medical schedules; local vet and official guidance control.
- For calving/dry-off, show estimated dates and the assumption used. For withdrawal, record the product/vet-prescribed interval and prevent a misleading 'safe to sell' claim without confirmation.
- Show a single consolidated daily digest and in-app Today feed, e.g. “2 vaccinations due this week, 1 cow due to calve in 9 days, KES 3,200 owed by 3 customers.” Deduplicate related events and offer dismiss/snooze.
- Do not include daily milk-logging pushes, generic cow checks, marketing tips, feed/weather alerts, or multiple notifications for one event. External push/SMS/WhatsApp is post-MVP.
5.9 Reporting and Analytics
MVP core reports: daily/weekly/monthly farm milk totals; per-cow production only when recorded; cooperative deliveries and expected vs received settlements; household bills, payments, balances; upcoming herd-care dates. All daily dashboards and balances remain accessible offline.
Later: expenses, feed costs, margin/litre, sophisticated forecasts, full CSV/PDF exports, multi-farm benchmarking and accounting-grade reports. Never label estimates as actuals.
6. Main Application Pages / Navigation
Recommended mobile bottom navigation: Home, Milk, Herd, Sales, More.
Page	Purpose / Key UI
Home / Dashboard	Today's milk, sales, cash received, alerts, quick actions
Record Milk	Fast AM/PM entry, cow selection, batch or total-only entry
Milk History	Daily log, filters, corrections, reconciliation
Herd	Searchable animal list, status filters, add cow
Cow Profile	Details, production chart, health, breeding, activity timeline
Health & Vaccinations	Treatment history, vaccination log, upcoming due dates
Breeding & Calving	Heat/AI, pregnancy, calving records, calendar
Buyers	Cooperative and customer profiles, terms, balances
Sales & Deliveries	Record milk deliveries/sales, history, buyer statements
Settlements & Payments	Cooperative statements, deductions, receipts, overdue balances
Expenses	Record and categorize farm spending
Reports	Milk, herd, sales, costs, trends, export
Tasks & Calendar	Upcoming care, payments, and daily chores
Settings	Farm profile, language, preferences, users, backups, exports
Help / Tutorials	Short guides, sample records, support contact


Quick-add action available throughout MVP: Milk, Co-op Delivery, Household Delivery, Payment, Health Event. Expenses follow in Phase 2.
7. Dashboard Specification
Top cards
1. Today's Milk: litres logged; change vs recent average where data exists.
2. Milk Sold Today: litres and KSh sales value.
3. Payments Received: KSh received today or this month, clearly labelled.
4. Outstanding Buyer Balances: KSh owed to the farm.
Secondary widgets
- AM vs PM milk chart (last 7/30 days).
- Top producing cows and cows with notable drops (only if cow-level logging is used).
- Milk allocation: sold, home use, calves, discarded, unallocated.
- Upcoming health, vaccination, and calving reminders.
- Recent deliveries and receipts.
- This month's milk revenue, operating expenses, and estimated surplus.
- Empty-state guidance for farmers with little data.
8. Key User Workflows
Workflow A: First-time farmer
1. Sign up with phone/email; verify account.
2. Create farm and select preferred language.
3. Choose cow-by-cow tracking or quick farm-total mode.
4. Add cows (or skip), main cooperative, and default milk price.
5. Record first milk session; see dashboard immediately.
Workflow B: Daily milk recording
1. Tap Record Milk.
2. Select AM/PM and enter litres by cow or farm total.
3. Save locally if offline; sync when connected.
4. Optionally allocate milk to sales, calf feed, home use, and losses.
5. Review daily totals and any discrepancy warning.
Workflow C: Cooperative payment cycle
1. Record deliveries each day against a cooperative.
2. At statement time, enter cooperative's accepted litres, rates, deductions, and payout.
3. Match statement to deliveries and highlight discrepancies.
4. Record actual payment received and remaining balance.
5. Export a simple monthly statement.
Workflow D: Vaccination follow-up
1. Open a cow's health profile and log a vaccination.
2. Enter next due date recommended by a vet.
3. Receive a due-soon reminder.
4. Mark the next administration complete and retain history.
Workflow E: Direct customer monthly billing
1. Create household/shop buyer and set price/terms.
2. Record daily deliveries.
3. View monthly quantity and amount owed.
4. Share/print a statement; record partial/full payment.
9. Roles and Permissions
Role	Capabilities
Farm Owner	Full farm access, billing, exports, users, and settings
Farm Manager (Phase 2)	Manage operational records and staff; restricted billing settings
Farm Worker (Phase 2)	Enter assigned milk and animal events; limited financial visibility
Read-only Advisor (Future)	Explicitly shared animal reports only


Each farm's data must be isolated. Access to one farm must never imply access to another.
10. Suggested Data Model
- users, farms, farm_memberships
- animals, animal_status_events, animal_relationships
- milk_sessions, milk_entries, milk_allocations
- buyers, buyer_price_history, milk_deliveries
- cooperative_settlements, settlement_deductions
- payments, payment_allocations
- expenses, expense_categories
- health_events, vaccinations, treatments, withdrawal_periods
- breeding_events, pregnancy_checks, calvings
- tasks, notifications, attachments, audit_logs
- sync_operations / idempotency keys for offline records
Design rules: use stable UUIDs; include farm_id on tenant-scoped entities; preserve timestamps and creator/editor metadata; use decimal-safe money and quantity handling; soft-delete important records; maintain historical price snapshots; avoid double-counting cash receipts as new sales.
11. Nonfunctional Requirements
UX and accessibility
- Responsive from low-cost Android screens to desktop.
- Fast initial load and quick data entry, even with limited connectivity.
- Clear plain-language labels, icons with text, accessible contrast, and helpful validation.
- English and Kiswahili available at launch for onboarding, dashboard, milk entry, cow status, reminders, co-op/household entry, and core reports; language switch visible at login/onboarding. Advanced veterinary/accounting terms may initially remain in English with clear explanations.
Offline and synchronization
- Offline-first PWA with persistent local database and queued writes for cow create/edit; milk; vaccination, treatment, insemination and calving events; cooperative deliveries; household deliveries and payments; balances, due dates, cow lists and dashboard. Do not require connectivity for daily workflows.
- Visible Saved on device / Syncing / Synced / Needs attention states.
- Idempotent server writes to prevent duplicate milk/sales entries on retry.
- Conflict resolution for edits to the same record; never silently overwrite financial data.
- Automatic background/foreground sync on reconnection with local unique operation IDs, retry/backoff, per-record sync status and conflict handling. Display non-alarming count, e.g. “3 records waiting to sync.” Never clear unsynced data silently. Cloud backup management, team administration, export and integrations may require internet.
Security and privacy
- Secure authentication, authorization checks on every farm-scoped operation, and encrypted connections.
- Farm-level tenancy isolation; no public buyer/animal data by default.
- Regular backups, restore testing, audit trails, and reasonable retention/deletion policies.
- Design and operate in line with applicable Kenyan data protection requirements; obtain legal review before launch.
- Never store M-Pesa PINs or sensitive payment credentials.
Reliability and testing
- Test phone-sized layouts, slow connections, offline/online transitions, sync retries, and data recovery.
- Validate milk and money reconciliation, monthly boundaries, edits, and partial payments.
- Automated unit/integration tests for balances, role permissions, and tenant isolation.
12. Example Demo Farm and Data
Demo farm: Green Hills Dairy Farm, Nakuru County (fictional)
Animals: 8 cows: 5 lactating, 1 dry, 1 pregnant heifer, 1 calf (statuses may overlap).
Buyers: Baraka Dairy Cooperative; two household buyers; one local café.
Example daily production: 64.5 L (AM 37.0 L, PM 27.5 L).
Example allocation: 55 L sold, 4 L household use, 3 L calf feeding, 2.5 L discarded.
Example cooperative rate: KSh 48/L (illustrative, not a market quote).
Example monthly cooperative payout: milk value less clearly itemized transport and feed-advance deductions.
Include demo scenarios for missed vaccination, upcoming calving, buyer arrears, partial payments, low yield, and offline sync conflicts.
13. Proposed Development Roadmap
Phase 0 — Validate before building deeply
- Interview 10–15 dairy farmers and 2–3 cooperative/collection staff.
- Observe how farmers currently record milk, cow events, and payments.
- Confirm their phone/connectivity conditions, preferred language, and willingness to pay.
- Prioritize top three daily pains and confirm an MVP pilot group.
Phase 1 — Foundation
- Authentication, farm onboarding, tenant isolation, settings, and responsive navigation.
- Cow registry, buyer registry, and basic demo data.
- Acceptance: farmer can register, add a cow and buyer, and navigate easily on mobile.
Phase 2 — Core daily operations
- Milk entry, milk history, deliveries, buyer balances, payments, and basic reconciliation.
- Acceptance: complete daily milk-to-sale-to-payment workflow with correct totals.
Phase 3 — Herd care and finance
- Vaccinations, treatments, breeding, calving reminders, expenses, and dashboard reports.
- Acceptance: reminders work and financial summaries distinguish billed from paid.
Phase 4 — Offline readiness and pilot
- Offline queues, retry protection, conflict handling, CSV export, language polish.
- Pilot with 5–10 farms for 2–4 weeks; fix issues from observed usage.
- Acceptance: reliable daily entry on typical Android phones and weak networks.
Phase 5 — Commercial launch
- Subscription and license management, support, onboarding materials, billing and renewal workflow.
- Launch only after pilot evidence supports retention, usability, and data reliability.
14. Commercialization Strategy (Decisions + Validation)
Positioning: “Know your cows, your milk, and who owes you—in one simple place, even offline.” Sell a clear outcome, fast setup and low daily effort, not a long feature list.
Initial customer: independent Kenyan dairy farmers who sell to cooperatives, households, or both. Distribution: referrals, cooperatives, vets, agrovets, farmer groups, on-farm demos and WhatsApp.
Pricing hypothesis, not validated willingness to pay: default KES 500–1,000/month for smallholders; optional annual at 10 months' price for 12 months (“Pay for 10 months, use Mylkio for 12”). Quarterly only on demonstrated demand. Larger farms/cooperatives: custom monthly or annual Farm Pro terms. Test with real farmers before fixing tiers or entitlements.
Cooperative partnerships: optional paid group onboarding days, branded onboarding (“Mylkio powered by [Cooperative Name]”), training guides/videos/posters, referral reward of one free month for a referred paying farmer, and optional aggregate admin dashboard later with farmer consent and privacy controls. Consider volume pricing only after a threshold such as 50+ paying farmers; no automatic cooperative discount, free access for all members, premature custom builds, or payment-processing promises.
Pilot success: a farmer can get first value in the first session, record milk in under 30 seconds, and understand expected/received amounts without training. Do not promise guaranteed yield or profits.
15. Launch Metrics
- Onboarding completion rate.
- Time to first milk record.
- Weekly active farms and milk-recording days per active farm.
- Percentage of pilot farmers logging milk on at least 5 days per week.
- Number of sales/payment records per active farm.
- Reminder completion rate.
- Support requests and average resolution time.
- Trial-to-paid conversion, churn, referrals, and revenue per farm.
- Sync failure and duplicate-record rates.
16. Risks and Mitigations
Risk	Mitigation
Farmers find entry tedious	Bulk entry, defaults, simple onboarding, field usability tests
Inconsistent connectivity	Offline-first logging, explicit sync status, retries
Incorrect balances undermine trust	Transaction ledger, audit trail, reconciliation, tests
Health reminders interpreted as medical advice	Vet-entered schedules, disclaimers, no unsupervised prescriptions
Limited willingness to pay	Pilot interviews, tier testing, clear ROI from saved time/records
Too many features at launch	Strict MVP scope, defer cooperative portal and AI
Shared devices and privacy risks	Session controls, access permissions, minimal personal data


17. MVP Acceptance Checklist
- [ ] New farmer can choose English/Kiswahili at login/onboarding and log first farm-total milk without adding cows.
- [ ] Milk screen defaults to farm-total, offers optional per-cow toggle, and gently prompts per-cow logging after 10 cows are added.
- [ ] Farm totals and cow breakdown never double count the same milk; corrections are auditable.
- [ ] Co-op deliveries, rejections/adjustments, expected monthly settlement, receipts, and balance calculate correctly.
- [ ] Household deliveries, monthly bills, advances/partial receipts, and balance calculate correctly.
- [ ] Both ledger entry flows target under 30 seconds on a small Android screen.
- [ ] Vaccination, deworming, calving, dry-off, pregnancy follow-up, withdrawal, and payment reminders are date-based, consolidated and deduplicated.
- [ ] No veterinary schedule is presented as a universal prescription or milk withdrawal as automatically safe.
- [ ] Daily dashboard, cow list, due dates, milk and health events, deliveries and payments work offline.
- [ ] Offline queued operations sync automatically without silent data loss, duplicate charges or overwritten balances; waiting count is visible.
- [ ] Core reports and daily UI work in English and Kiswahili.
- [ ] Farm data is isolated; shared-phone sessions and buyer personal information are protected.
- [ ] Pilot farmers can finish all six MVP jobs with minimal assistance.
- [ ] Deferred features (expenses/full accounting, automated M-Pesa, advanced feeds/genetics, cooperative admin portal) are not blockers to MVP release.
18. Resolved Product Decisions (24 October 2026)
Topic	Final MVP decision
Milk entry	Farm-total default; cow-level optional; nudge after 10 cows
Sales channels	Both cooperative settlement and household billing in v1, lightweight
Reminders	High-consequence dates only; one consolidated digest; no generic nudges
Offline	Entire daily workflow offline; automatic later sync
Language	English + Kiswahili for core workflows from launch
Billing cadence	Monthly default; annual at 10-for-12; quarterly only if requested
Cooperative go-to-market	Group onboarding and training; no automatic discount; later aggregate dashboard


Remaining implementation choices (not scope questions)
- Decide exact PWA local database/sync stack and conflict UI during technical design.
- Field-test Kiswahili terminology and the 30-second entry target with Kenyan farmers.
- Validate veterinary reminder defaults with qualified local professionals; obtain consent for any cooperative-level aggregate data sharing.
- Verify brand/trademark/domain availability, and test the KES 500–1,000 pricing range in pilot interviews.
Evidence and background references provided for these decisions
1. FAO, Dairy marketing in Kenya: https://www.fao.org/4/x5661e/x5661e0t.htm
2. Casaburi & Macchiavello, dairy payment frequency: https://www.econ.uzh.ch/dam/jcr:d8a1b5bb-ff58-4a32-8409-9110cbe11d8d/casaburi_macchiavello_dairy_AER%202019.pdf
3. IPA, Dairy Market Responses to Saving Constraints in Kenya: https://poverty-action.org/study/dairy-market-responses-saving-constraints-kenya
4. Dairy cattle herd health management manual: https://cgspace.cgiar.org/server/api/core/bitstreams/66052ba2-ff96-46b7-8a4a-145595e0f83b/content
5. IFPRI Africa, digital adoption barriers: https://africa.ifpri.info/2026/07/16/a-phone-in-every-pocket-a-farming-app-in-almost-none-kenyas-hidden-digital-divide/
6. Mercy Corps AgriFin, Kenyan Farmers Go Digital: https://mercycorpsagrifin.org/kenyan-farmers-go-digital/
7. IFPRI, dairy farmer finances: https://www.ifpri.org/blog/world-milk-day-how-kenyan-dairy-farmers-manage-their-money/
These are background references supplied during product planning; clinical schedules, pricing and adoption assumptions still require local validation.
Product owner: Versaly
Status: Concept / specification for validation and phased implementation.
Brand note: Verify “Mylkio” trademark, domain, and app-store availability before commercial launch.
19. Implementation Guardrails (v1.2)
- Onboarding must not require registering a cow before recording the first farm-total milk entry.
- Farm-total and cow-level milk entries must not double-count production; model them as mutually exclusive modes for a given entry/session or provide explicit reconciliation.
- Record milk production separately from delivered/sold quantities, including spoilage, home use, and unsold milk only as optional adjustments.
- Keep payment records append-only or auditable; calculate balances from ledger transactions rather than editable summary totals.
- Offline operations must have stable client-generated IDs, retry-safe synchronization, and clear conflict resolution for edits to the same record.
- Reminder schedules must be configurable by a qualified veterinary professional or farmer; vaccination and withdrawal guidance is not a substitute for veterinary advice.
- Cooperative-branded onboarding must never expose an individual farmer’s records to a cooperative without explicit permission.
- Pricing is a validation hypothesis, not a guaranteed market rate.