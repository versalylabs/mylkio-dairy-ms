# Vet and illness feature: spec

Status: agreed in outline on 14 November 2026. **Steps A and B are built** (see "Step A: what exists" and "Step B: what was built, and why it differs from the plan" below); steps C to E are not. Step B changed the original plan: read that section first. This records the decisions so we can build from them in small steps.

## What it is

A **health check** a farmer starts from a cow: a photo plus a few plain-language questions. Mylkio combines that with what it already knows about the cow and farm, and returns **possible causes, how urgent it is, what to do right now and what to tell a vet**. On Farm Pro it can also **find vets near the farm and send them the case**.

It is guidance, never a diagnosis. The wording, the screen design and the tests all enforce that.

## Decisions made

| Question | Decision |
| --- | --- |
| Where do vet contacts come from? | **Curated by us**: Kenya Veterinary Board register, animal health assistants and co-op vets, starting with one or two pilot counties. Farmers can add a "this vet helped me" rating later. A map search is only a fallback. |
| How does the advice work in version one? | **AI only, with strict safety rules**, answering from a curated knowledge base. No open-web search. A vet-reviewed test set must pass before launch. |
| Tier layout | **Safety for everyone, checker on Farmer, vets on Farm Pro.** See below. |

## Tiers

| | Starter (KSh 500) | Farmer (KSh 1,000) | Farm Pro (KSh 2,500) |
| --- | --- | --- | --- |
| Red-flag guide and county reporting contacts | Yes | Yes | Yes |
| Seasonal risk calendar | Yes | Yes | Yes |
| Photo and symptom checker | No | About 10 checks a month | Higher limit (about 40) |
| Vet finder and send-case-to-vet | No | No | Yes |
| Outbreak alerts for the area | No | No | Later |

Emergency and notifiable-disease guidance is never paywalled. The checker limits are starting points; set them from real cost per check (see Cost).

## How a check works

1. **Pick the cow** (or "a cow not in the herd"). Mylkio loads her age, status, pregnancy, days since calving, recent treatments, any active milk withdrawal, and her milk output over the last 7 days.
2. **Take 1 to 3 photos.** Compressed on the phone to about 300 KB each before upload.
3. **Answer short questions**: how long, eating, temperature if known, milk drop, other cows affected, where the problem is (udder, hoof, skin, mouth, eyes, breathing, belly). Large buttons, Swahili available.
4. **Red-flag screen runs first and in plain code, not in the AI.** If the answers match an emergency (down cow, bloat, severe breathing, heavy bleeding) or a notifiable disease sign (blisters in the mouth or on the feet, skin nodules, sudden deaths), the result screen shows only: isolate, call a vet now, and the reporting contact. The AI result may follow underneath.
5. **AI analysis** (server side, with the photos, answers and cow context). It must return a fixed structure, validated before anything is shown:
   - up to 3 possible causes, each with a confidence word (more likely / possible / less likely) and why
   - urgency: **Emergency, Today, This week, Monitor**
   - what to do now (isolate, check temperature, keep the milk out of the tank, clean water, and so on)
   - what *not* to do (no guessing at antibiotics)
   - questions to ask the vet
6. **Actions**: save to the cow's health record (creates a `HealthEvent` and a follow-up reminder), mark milk as withheld, send the case to a vet (Farm Pro).

### Safety rules the AI is held to

- Never states a diagnosis as certain; always says "could be".
- Never names a drug or a dose. It may say "a vet will decide treatment".
- Never says milk is safe to sell if a treatment or withdrawal is active.
- If the photo is unclear or unrelated to a cow, it asks for a better photo rather than guessing.
- If it is unsure or confidence is low, urgency defaults **up**, not down.
- Every result carries the same short notice: guidance only, not a diagnosis, call a vet if unsure.
- The knowledge base is the only source it may state facts from. It cites which entry each cause comes from.

## Knowledge base

A reviewed, versioned set of entries for the common dairy conditions in Kenya (for example mastitis, East Coast fever and other tick-borne diseases, foot and hoof problems, milk fever, bloat, lumpy skin disease, foot-and-mouth, ringworm and other skin conditions, retained placenta, calf scours). Each entry holds signs, how it differs from look-alikes, urgency, safe first steps, whether it is notifiable, and a source. **A veterinarian signs off every entry** before it goes in. Entries live in the repository so changes are reviewed like code.

## Vet finder (Farm Pro)

- **Directory**: a table of vets and animal health providers with name, type (vet, animal health assistant, co-op vet, agrovet), county and sub-counties served, phone, WhatsApp, emergency call-outs yes/no, opening hours, species, and when it was last confirmed. Entries show "last confirmed" and are re-checked at least every six months.
- **Ranking**: same sub-county first, then county, with emergency availability and last-confirmed date as tie-breakers. Uses the farm's county and sub-county already collected at sign-up. Optional "share my location" for a call-out; never required.
- **Send the case**: one tap opens WhatsApp with a ready message (cow, symptoms, how long, the checker's urgency, farm location, a photo link). The farmer chooses to send it. Mylkio never contacts a vet on the farmer's behalf.
- **Pilot first**: one or two counties, built by hand. Expanding is data work, not code.

## Seasonal risk calendar (all tiers)

A table of month and county zone to the conditions to watch for and prevention steps, reviewed by a vet. No AI, no cost per use. This also covers the "season" part of the original idea.

## Data and storage

- **Photos** go in object storage, not in farm records and not in the browser's local storage (that is the 5 MB limit already noted for the records). Reading them needs a short-lived signed link tied to the signed-in farm.
- **Checks are server records, not offline-synced farm records**: a `health_checks` table (farm, cow, answers, photo references, model output as validated JSON, urgency, knowledge-base version, model name and version, created time) plus `vet_directory` and `vet_contact_log`. A check needs the server, so it does not go through the per-record sync. Saving to a cow's record creates an ordinary `HealthEvent` in the existing `health` bucket, so sync, export and backup work unchanged.
- **Retention**: photos are deleted after 90 days unless the farmer attaches them to a cow's record. The result text stays with the check.
- **Access**: all reads and writes go through server routes that verify the session and farm membership, in the same way as the rest of the backend.
- **Offline**: the photo and answers are kept on the device and uploaded when signal returns; the result appears when it is ready. The red-flag screen runs on the device, so emergencies never wait for a connection.

## Plan gating and limits

- Allowed features are defined once in `lib/plans.ts` (a `features` list per plan), and the server checks them: the interface hiding a button is never the only protection.
- Checks per month are counted in the database. At the limit the farmer sees how many remain and when they reset; the red-flag guide keeps working.
- Trial accounts get the Farmer allowance, so they can try it.

## Cost

Each check is one image-capable model call (the model is chosen at build time and kept behind one function so it can change). Estimate by measuring real checks in the pilot; the monthly limits above are set from that, not guessed. Photos compressed to about 300 KB keep both cost and data bills low.

## Before launch: proving it is safe enough

1. **Test set**: about 50 real cow cases, each with a vet's confirmed assessment, covering common and dangerous conditions and some healthy cows.
2. **Pass bar** (proposed, to be agreed with the vet adviser): emergencies and notifiable signs flagged **at least 95%** of the time; a dangerous case is never rated "Monitor"; the right cause appears in the top three **at least 70%** of the time. Below the bar, the feature ships as "next steps and urgency" without naming causes.
3. **Vet review of the knowledge base** and of 20 sample results.
4. **Farmer trial**: about 10 farmers in the pilot county, watching for misunderstanding (for example "it said milk is fine").

## Build order

| Step | What | Result |
| --- | --- | --- |
| A | Knowledge base, red-flag rules, seasonal calendar, plan feature flags | Free safety value on every plan; no AI yet |
| B | Photo storage, health check flow, AI analysis, save to health record, monthly limits | Farmer-tier checker, behind a switch and tested against the set |
| C | Vet directory for the pilot counties, finder, send-case-to-vet | Farm Pro vet feature |
| D | Optional paid vet review | Vets in the loop for harder cases |
| E | Anonymised county outbreak alerts | Needs many farms using it |

## Needs from you before step B

- A **veterinarian adviser** (even part-time) to review the knowledge base, the test set and the pass bar.
- The **pilot county or counties**, and who can supply real vet and animal-health contacts there.
- An **Anthropic API key** and a monthly spend limit for the checker (kept in Vercel as a secret, never in the code).
- Agreement on the **plain-language disclaimer** wording, ideally checked by someone who knows Kenyan consumer and veterinary rules.

## Step A: what exists

- **Plan features** (`lib/plans.ts`): every plan lists `illnessGuide`, `seasonalCalendar`, `healthChecker`, `healthChecksPerMonth` and `vetFinder`. `featuresFor(subscription)` is the one function that decides what an account gets: a free trial on Starter gets the Farmer features, the platform administrator gets everything, and an unknown plan gets the smallest. Tests (`tests/features.test.ts`) fail if safety information is ever put behind a paywall. The checker and vet finder have no screens yet; the flags are ready for steps B and C, and the server must check them too.
- **Red-flag screen** (`lib/vet/red-flags.ts`): 18 signs a farmer can tick and 15 red flags (10 emergencies and 5 same-day), each with why, what to do now, what not to do, and whether it must be reported. It is plain code, needs no connection and no AI. A tick list that matches nothing says so but never says the animal is well.
- **Seasonal calendar** (`lib/vet/seasonal.ts`): the usual Kenyan seasons (short dry, long rains, cool dry, short rains) and what to watch for in each.
- **Screens** (`components/herd/VetGuide.tsx`): a "Vet guide" tab on the Herd screen, also reachable from an "Emergency guide" button at the top of Herd.
- **Review gate** (`lib/vet/review.ts`): see below.

### Nothing reaches live farmers until a vet approves it

Every entry is currently `review: DRAFT`. On a live farm the guide therefore shows only the "call a vet now" banner and a note that the guide is being checked by a veterinarian; the seasonal card is hidden. Drafts appear (with a visible "Draft, for review only" banner and a "Draft" tag on each result) only where `NEXT_PUBLIC_SHOW_DRAFT_VET_CONTENT=true`:

- In Vercel, add that variable for the **Preview** environment only, never Production. It is read at build time, so the next preview build picks it up.
- Locally, put it in `.env.local` (not committed).

**To approve an entry**, the reviewing vet reads it (on a preview, or in the content files), asks for any changes, and then the entry is changed from `DRAFT` to:

```ts
review: { status: 'approved', reviewedBy: 'Dr Full Name (KVB number)', reviewedOn: '2026-12-01' }
```

in a pull request. A test refuses an approval with no named reviewer or date, and a draft that claims one. Approved entries show on live farms; edited wording must be re-approved.

### Still to decide with the vet adviser

- The wording of every entry, especially the "do now" and "do not" lines, and whether any entry is missing or wrong for Kenyan conditions.
- Which conditions are notifiable in Kenya, and the direct reporting numbers for each pilot county (the screen currently only names the sub-county or county veterinary office).
- Whether foot-and-mouth is shown as "emergency" or "today", and the urgency of every other entry.
- Seasons by region (coast, north, highlands), instead of one pattern for the whole country.
- Kiswahili wording (English only for now).

## Step B: what was built, and why it differs from the plan

The plan was "photo in, AI analysis out", limited to about 10 checks a month on Farmer. While preparing step B three facts changed the design, so the first version is different, and better suited to the situation:

1. **There is no vet adviser yet.** An AI that names causes from a photo cannot be checked without vet-confirmed cases, and a wrong answer on a sick animal is costly. A rules engine built from published veterinary sources can be read, checked and corrected line by line, which is what a vet adviser can do in an hour.
2. **Free AI photo reading has a privacy cost.** Google's free Gemini tier states that free-tier prompts and uploaded files are used to improve its products and may be read by human reviewers, and its limits are not fixed (checked 15 November 2026; see the sources in the pull request). Sending farmers' photos there for free is not a good default.
3. **A photo cannot reliably identify a disease on its own.** What it is good for is showing a vet what you see.

So step B is a **free, private, offline symptom checker**, and the photo is for the vet:

- **Checker** (`lib/vet/checker.ts`, `lib/vet/conditions.ts`): the farmer says whether it is a cow or a calf, whether she calved recently, and ticks the signs she can see (30 signs, grouped, collapsible). The engine matches them against 11 sourced descriptions: mastitis, East Coast fever, foot-and-mouth disease, lumpy skin disease, milk fever, bloat, foot rot, calf scours, pneumonia, retained afterbirth or womb infection, and abortion (including brucellosis). Results say **"Fits closely" or "Fits partly"**: how well the ticked signs match a description, never a probability and never "your cow has X". At most three are shown. Red flags still come first and set the urgency. When several signs match nothing, the guide says so, never says "all clear", and advises seeing a vet in the next day or two.
- **Every entry cites its sources** (Merck Veterinary Manual, WOAH, and the Animal Diseases Act summary), with the date each page was read, behind a "Where this comes from" link on the result. Entries say only what the sources support; one tip from the step A draft ("keep her walking" for bloat) was removed because the sources do not back it.
- **Photo (optional)**: taken or chosen on the phone, kept in memory, never uploaded or analysed. **"Send summary"** shares a short written summary with the photo through the phone's share sheet (WhatsApp and others), or opens WhatsApp with the text, or copies it. Nothing is sent unless the farmer chooses.
- **Plan gating**: emergency guidance and the season calendar are on every plan. The full "what the signs could fit" results need the Farmer plan or a trial; a Starter farm sees the red flags and a note about Farmer. There is no monthly limit, because a check costs nothing to run. The server-side check (`featuresFor`) will matter when AI photo reading or the vet finder is added; the symptom checker runs on the device, so a determined user could bypass this limit, which is acceptable because it costs us nothing.
- **Nairobi** is the pilot county (`lib/vet/contacts.ts`). The only official number found is Nairobi City County's general help line, which is **not** a direct veterinary line, so the screen labels it that way and marks it unconfirmed. Direct numbers for the county's Director of Veterinary Services and the Kabete veterinary teaching hospital are still to be added once someone has rung and confirmed them. The Kenya Veterinary Board registers link is shown so a farmer can check that anyone they hire is registered.
- **Disclaimer** (`lib/vet/disclaimer.ts`): a short line on the screen and a "read the full notice" section with four plain-language points (not a diagnosis; can be wrong; never delay calling a vet and never give or hold back treatment because of it alone; where the information comes from and that it has not been reviewed by a vet unless the entry says so). This is the product team's recommendation, not legal advice. Have a lawyer who knows Kenyan consumer and veterinary rules check it before the guide is shown to farmers.

### What is still not done, and what it needs

- **A veterinarian's review.** Every condition is still `DRAFT`, so the checker is hidden on live farms exactly like the red flags (see step A). Because every entry lists its sources, a vet can review the whole set in about an hour: ask a vet registered with the Kenya Veterinary Board, a lecturer at a veterinary faculty, or the county veterinary office. Give them the preview link (see step A for the Vercel setting), ask for corrections to wording, urgency and missing conditions, then record their name and date in a pull request.
- **A check against real cases.** Once a vet is involved, collect about 50 vet-confirmed cases (signs ticked and the vet's assessment) and run them through `assess` to see how often an emergency is missed. Add them as tests so the pass bar in "Before launch" is measured, not assumed.
- **Direct Nairobi veterinary contacts**, confirmed by phone.
- **AI photo reading** is deliberately left for later. If it is added, it should only read visible signs off a photo and tick them for the farmer to confirm (never name a disease), use a paid or privacy-respecting provider rather than a free tier that trains on the photos, and carry the per-month limit already defined in `lib/plans.ts`.
- **Kiswahili**, the vet finder (step C) and a "save to the cow's health record" button.
