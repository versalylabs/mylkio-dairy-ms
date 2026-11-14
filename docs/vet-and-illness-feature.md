# Vet and illness feature: spec

Status: **proposal**, agreed in outline on 14 November 2026. Nothing is built yet. This records the decisions so we can build from them in small steps.

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
