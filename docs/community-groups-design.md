# Community: SACCO and area groups (design; steps 1 and 2 built)

Status: designed 23 November 2026 with the owner. **Steps 1 and 2 are built** (groups, invitation links, discussion; outbreak reports; see [community-groups.md](community-groups.md)); step 3 is not. Build order is at the end.

## The idea

Farm Pro and Custom farms can belong to groups for their milk or dairy SACCO or their area, to discuss things that affect them all, above all **outbreaks**: a farmer who sees mouth blisters, or lumpy skin, or a run of mastitis can tell the people around them early, and others can say "we have it too" or "not here".

## Decisions made (23 November 2026)

| Question | Decision |
| --- | --- |
| Who creates a group | **Mylkio staff only.** You create a group for a real SACCO or area and send its members an invite link. Every group is verified. |
| Where it lives | A **new top-level menu item, "Community"** (an exception to the build spec's "no new navigation item", on purpose). |
| Who sees which farm reported an outbreak | **Area only.** Members see the sub-county and the signs, not the farm. Only the group admin can see which farm, for follow-up. |
| Plans | Farm Pro and Custom (checked on the server, not only hidden on screen). Starter and Farmer see one calm line naming the plan. |

## Why this is more than a chat room

A plain group chat would be the cheapest thing to build and the most likely to cause harm: rumours spread as fact, a farm named in a post is shunned or has its milk refused, and nobody knows what to do next. So the design has four parts that a chat does not.

1. **Outbreak reports are structured, not free text.** A report is: the signs seen (ticked from the vet guide's own sign list, so wording is consistent and sourced), how many animals, how long, the date, whether a vet has seen it, and the sub-county. The report page shows the reporting contacts from the vet guide (Directorate of Veterinary Services, county office) and says plainly that a notifiable disease **must be reported to the county veterinary office**; the group is not a reporting channel.
2. **The group sees a count, not a name.** "3 farms in Rongai report mouth blisters this week" is an early warning that a rumour is not. Members can answer a report with one tap: **"We see this too"** or **"Not here"** (counted, never named to other members). Reporting by area keeps farms willing to report early, which is the whole point.
3. **Every alert says what it is.** A fixed notice on every outbreak thread: guidance from neighbours, not a diagnosis, call a vet, never give or withhold treatment because of a post. Signs that match the vet guide's red flags (blisters on the mouth or feet, skin nodules, sudden deaths) show the emergency steps first, the same as the guide.
4. **There is always someone responsible.** Each group has one or more group admins (people the SACCO trusts) who can remove a post, mute or remove a member, and see which farm made a report. Anyone can report a post to Mylkio staff, who see it in the administration screen. Staff do not read groups otherwise.

## Official alerts (the part that makes it trusted)

Mylkio staff can post an **official alert** to every group in a county, written from what the county or national veterinary office has published (always with its source and date). It is pinned above the discussion and marked "official". Farmers hear from a trusted source in the place they already look, instead of from a forwarded message.

## What a farmer sees

- **Community** in the menu: their groups, each with an unread count; inside a group, a pinned area (official alerts, then open outbreak reports with their counts) above a plain discussion list.
- **Home** shows one item in "Needs your attention" when a group they belong to has a new outbreak report or an official alert in their area.
- **Posting:** a discussion post is text (short, with a visible length limit); an outbreak report is the structured form above. A "report this post" button on everything.
- **Offline:** the last things read are kept on the phone and still show; posting and replying need a connection and say so plainly (they are not queued, because an old alert posted hours late is worse than none).

## Privacy and safety rules

- Group content is stored on the server (it must reach other farms), unlike a farm's own records, and the Privacy notice is updated to say so, what is kept, for how long, and who can see it (members; the group admin sees the farm behind an outbreak report; staff only see what is reported to them). A lawyer should read it (the same open item as the rest of the notice).
- A farm's records are never shared: a post can say what the farmer chooses to type, nothing is attached automatically.
- A member can leave at any time and can delete their own posts. Posts and replies are removed by the database when a farm is removed.
- Limits: post length, posts per hour per farm, replies per hour, members per group, so a stuck button or an abusive account cannot flood a group.
- Joining is by an invitation link from staff (a one-time or limited-use code kept only as a hash, with the same wrong-try limit as team invitations).
- Photos are **not** in the first version (storage, abuse and a person's face in a photo are all harder). They are the first thing worth adding once the groups are used.

## How it is built (small and the same as the rest of the system)

- A migration adds `community_groups`, `group_members` (farm, role admin or member, joined date), `group_posts` (kind discussion, outbreak or official; text; the structured report as JSON; the area; the author farm, never sent to members for outbreak reports), `group_replies` and `group_reports` (abuse reports to staff). Every function takes the verified user and checks membership and the plan in SQL, like team logins.
- Routes under `/api/community/*`, owner and manager only (a worker has no money, but community posts are not money; **decision for the owner: may workers read?**), plan checked on the server.
- No real-time sockets: the open group refreshes every minute or so, and on return to the app. Phone push notifications arrive with the push feature (build step 9) and are not needed to start.
- Staff screens in Administration: create a group, make an invitation link, post an official alert, see reports.

## Build order (one pull request each, each releasable alone)

1. **Groups and discussion.** Staff create a group and invite members; members join with the link; discussion posts and replies; the Community menu item; plan gate; the Privacy notice paragraph; limits. (Migration 0012.)
2. **Outbreak reports.** The structured report with the vet guide's signs, area-only privacy with the group admin able to see the farm, the farm count, "we see this too" and "not here", the safety notice, the reporting contacts, and the Home alert. (Migration 0013.)
3. **Moderation and official alerts.** Report a post, group admin tools, the staff review queue, official alerts to every group in a county, and unread counts. (Migration 0014.)

## Decided for step 1 (23 November 2026, the recommended defaults)

- Workers may read the groups, read only; posting is for the owner and managers.
- A group holds up to 300 farms, and a farm may be in up to 5 groups.

## Still to decide

- Who the first group admins are, and who in your team answers reports.
- Wording of the Privacy paragraph and of the group rules members agree to on joining (a lawyer's review).
