# Community groups, step 1 (as built)

Built 23 November 2026 on branch `codex/community-groups-step-1`. Migration `db/migrations/0012_community_groups.sql`. The design and the reasons are in [community-groups-design.md](community-groups-design.md); this file is what was actually built and how to run it.

**Status:** code and migration written and tested (581 tests, build and typecheck pass). **Migration 0012 has not been applied to the Neon `preview` or `production` branch.** Apply it to `preview`, try it with a real staff login and two Farm Pro farms, then apply it to `production` with the owner's go-ahead, **before** the code is merged (the Community screens call functions that do not exist until it runs). See "Going live" below.

## What a farmer sees

- A **Community** item in the menu (a worker has it too). A farm without Farm Pro or Custom sees one calm line, "Community is part of the Farm Pro plan", with a link to Settings. The demo farm says groups need a signed-in account.
- **Your groups**: each group's name, kind (SACCO or area), county, number of farms, and when it was last written in. A farm that looks after a group is marked.
- **Join a group**: the owner or a manager types the invitation code, or opens the link (`/?community=CODE`), which takes them to Community with the code filled in (signing in first if needed). The whole farm joins; its worker logins can read.
- **A group**: a safety note ("guidance from neighbours, not a vet", no naming a farm or person as having a disease, no medicine doses, call a vet), a box to write (600 characters, with a counter), and the discussion, newest first, in pages of 30. Each post shows the person's name, their farm and how long ago. Tap a post for its replies (400 characters). A farm can delete its own posts and replies, and can leave the group, choosing whether to delete what it wrote there.
- The open group looks for new posts every 60 seconds and when the app returns to the front (there are no live connections). The last thing read is kept on the phone and shown with "No connection. Showing what you last read." Posting and replying need a connection and say so; they are **not queued**. What was kept is removed on sign-out.
- English and Kiswahili (the Kiswahili is a first draft for a native speaker, like the rest).

## What staff see (Administration, tab "Community")

Create or edit a group (name, kind, county, a line about it, archive); make an invitation link for members or for a group admin, with how many farms may use it (1 to 300) and how many days it is valid (1 to 60); share it on WhatsApp or copy the message; withdraw an invitation; see the farms in a group (names and places, never posts) and take one out. The code is shown **once**; only a hash is kept. Staff cannot read what members write.

## The rules, and where they live

| Rule | SQL (0012) | App |
| --- | --- | --- |
| Farm Pro and Custom only; paused when a trial has ended, a payment is over 7 days late or the plan is cancelled | `community_allowed()` | `featuresFor().community` in `lib/plans.ts` (a test runs both over 32 subscriptions) |
| Owner and manager write, worker reads, advisor nothing | `community_farm(actor, write)` | `lib/team.ts` (`tabsFor`) and the screens |
| 300 farms a group, 5 groups a farm | `join_group` (codes `MY431`, `MY432`) | `COMMUNITY_LIMITS` in `lib/community.ts` (a test reads the SQL for the same numbers) |
| 10 posts and 30 replies an hour per farm | `create_group_post`, `create_group_reply` (`MY429`) | same |
| 600 characters a post, 400 a reply | table checks | `lib/server/community-schemas.ts` |
| A wrong code counts against the same limit as team invitations (8 per account, 30 per address, 15 minutes) | `code_attempts` (kind `join`, from 0011) | `withAttemptLimit` in `app/api/community/join/route.ts` |
| Posts and replies are deleted with the farm | `on delete cascade` | tested |

Every SQL function takes the verified user and works out the farm from the membership itself: the browser never says which farm it is. A farm can only read a group it belongs to; a thread of another group is refused.

## Decisions taken for this step (the owner's three questions)

The recommended defaults were used: **workers may read** (not write), **up to 300 farms** in a group, **a farm may be in up to 5 groups**. Change them by editing the numbers in 0012 and `COMMUNITY_LIMITS` together (a test fails if they disagree).

Choices made while building, to confirm: a post shows the writer's **name and farm** (outbreak reports in step 2 will show the area only); invitation codes can be limited-use (not just one-time) because a SACCO has many members; leaving a group keeps the farm's posts unless it ticks "also delete"; staff can archive a group (members stop seeing it, nothing is deleted) and take a farm out.

## Privacy notice and Terms

`lib/legal.ts` has a new "Community groups" section, a line in "What we collect", and a Terms line about not posting abuse, private details, medicine doses or rumours. The notice date is now 23 November 2026. **A lawyer should read this wording** (the same open item as the rest of the notice). When step 3 lets farms report posts to staff, the notice must say staff then see what is reported.

## Going live

1. On the Neon `preview` branch: `DATABASE_URL_UNPOOLED=... npm run db:migrate` (it applies only 0012). Check `/api/health` on the preview deployment.
2. With a staff login create a group and an invitation; with two Farm Pro test farms (an owner and a worker on one) join, post, reply, delete, leave; check a Farmer-plan farm sees the calm line.
3. Take a Neon snapshot or note the time first (history is only 6 hours, see `docs/release-and-migration.md`). The migration is additive and can be undone by dropping the new tables and functions.
4. Apply 0012 to `production` with the owner's go-ahead, **then** merge the pull request.
5. Tell the owner who the first group admins are and who answers reports (still open from the design).

## Not in step 1

Outbreak reports and their counts (step 2, migration 0013); moderation by group admins, "report this post" to staff, official alerts to every group in a county, unread counts and the Home alert (step 3, migration 0014); photos; push notifications.

---

# Step 2: outbreak reports (as built)

Built 23 November 2026 on branch `codex/community-outbreak-reports`. Migration `db/migrations/0013_outbreak_reports.sql`. **Migration 0013 has not been applied to `preview` or `production`.** Reporting is also **closed on live farms** until a veterinarian approves the vet guide (see "Why reporting is closed" below), so even after the migration the form stays shut on production until then.

## What a farmer sees

- In a group, above the discussion: **Outbreak alerts**, counted by area for the last 7 days: "3 farms in Rongai report this week: *Blisters or sores in the mouth…*". No farm is ever named.
- **Every alert carries the safety notice**: guidance from neighbours, not a diagnosis and not a vet, call a vet, never give or hold back treatment because of a report.
- **A sign that sets off one of the guide's red flags shows the emergency steps first** (the guide's own "do now" list, with its urgency), before the counts, then the line that a notifiable disease must be reported to the county veterinary office, not only to the group, and a note when it can infect people.
- One tap to answer, **"We see this too"** or **"Not here"** (tap again to take it back). Answers are counted and never named, and a farm that reported the same thing cannot answer it. Workers read the counts but cannot answer.
- **Report signs on my farm** (owner and manager): tick signs from the guide's own list (up to 8), how many animals, for how many days, the date seen (up to 14 days back) and whether a vet has seen them. There is **no free text**, so a report cannot name a farm or a person. The form repeats "call a vet now", shows the emergency steps for what is ticked, and shows **who to call** (the guide's county contacts where it has them, otherwise its general reporting note) with the plain line that this group is not a reporting channel. The area is never typed: the database takes it from the farm's own profile (sub-county, else county).
- **Your reports this week**, each with Withdraw (a false alarm stops counting at once).
- **Home**: one item in "Needs your attention" when a group the farm belongs to has an open alert in the farm's own county that it did not report itself ("3 farms in Rongai report signs in Rongai Dairy SACCO"), with Snooze and Dismiss like the other alerts. It opens Community. Counts only.
- **Group admin only**: "Reports for follow-up" lists the farm, the person's name and phone, the signs, animals, days, date and vet status for the last 30 days. It is the one place a farm is named; the database refuses anyone who is not an owner or manager of a farm that is an admin of that group, and **each look is written to the audit log** (`community.reporters.view`).

## Rules and limits (database in 0013, app in `lib/community-outbreak.ts`; a test reads the SQL for the same numbers)

1 to 8 signs, 1 to 500 animals, 0 to 60 days, seen in the last 14 days, 5 reports per farm per day. An alert counts the last 7 days; reports are deleted after 90 days and answers after 30. A farm counts once per area and sign however many reports it makes. Four 0012 functions were replaced so a report never appears as a discussion post, cannot be replied to, and does not count as the group's "last post".

## Why reporting is closed on live farms

The signs and the emergency steps are the vet guide's DRAFT content, and the project rule is that health wording is not shown to farmers until a named vet has approved it (`lib/vet/review.ts`, `docs/vet-and-illness-feature.md`). `outbreakReportsOpen()` is true only when an entry is approved or drafts are allowed (previews and local work, `NEXT_PUBLIC_SHOW_DRAFT_VET_CONTENT=true`). The report route checks it on the server too, and answers 403. So on production the group shows "Outbreak reports open once a veterinarian has checked the health guide" and no report can be made; the discussion works as before. When the first red-flag entry is approved the form opens by itself, with no code change.

## Privacy

`lib/legal.ts` has a new paragraph (what a report holds, who sees the farm, the audit of admin looks, 90 and 30 day retention, and that a report does not replace reporting to the authorities). **A lawyer should read it.** A count of one in a small area can point at a farm; the area is a sub-county, and a group admin can see the farm for follow-up, as agreed in the design.

## Going live

1. Apply 0013 to Neon `preview` (`npm run db:migrate`), then to `production` with a snapshot first and the owner's go-ahead, **before** merging the pull request.
2. With drafts on (a preview deployment) try it: two farms in one group in one sub-county report, a third answers, the group admin sees who, a farm in another county sees nothing on Home.
3. Reporting opens on live farms only after a veterinarian approves red-flag entries (named reviewer and date, in a pull request).

## Not in step 2

Moderation and "report this post", official alerts to every group in a county, unread counts (step 3, migration 0014); reporting to more than one group at once; photos; push notifications. Signs and emergency steps are English only until a vet has reviewed them, so those lines stay English in the Kiswahili screens.

---

# Step 3: moderation, official alerts and unread counts (as built)

Built 24 November 2026 on branch `codex/community-moderation`. Migration `db/migrations/0014_community_moderation.sql`. **Not yet applied to `preview` or `production`.**

## What it does

- **Report a post.** Under any post or reply from another farm, anyone in the group (workers too) can tap **Report**, pick a reason (a rumour that a farm or person has a disease, abusive, someone's private details, spam, something else) and send it to Mylkio. One report per farm per item, at most 20 a day per farm. The writer is not told who reported it.
- **Staff review queue** (Administration, Community tab, "Reported posts"): the reported text, the group, who wrote it, how many farms reported it and why. **Remove** deletes it for everyone; **Keep** closes the reports. This is the only place staff read what members write. Each decision is audited.
- **The group admin** (owner or manager of a farm whose role in the group is admin) sees **Remove** under other farms' posts and replies, and a **Farms in this group** list with **Take out** for members (not their own farm, not another admin). Each is audited.
- **Official alerts** (Administration, Community tab, "Official alerts"): staff post a title, the text, the source, the date it was published (up to a year back), an optional https link, and how many days to show it (1 to 90). It is pinned at the top of every group in that county, including groups created later, marked **Official** with its source, and shown on members' Home with Dismiss. Staff can withdraw it at once.
- **Unread counts** on each group in the list: discussion posts from other farms, and official alerts, since this person last opened the group. Opening a group resets it. Each person on a farm has their own count.

## Decisions

"Mute a member" from the design was left out: the brief was "group admins can remove posts and members". Outbreak reports cannot be reported to staff (they hold no text); a farm withdraws its own, and the group admin can follow up with the farm. Official alerts are their own table, matched to groups by county, so one alert reaches every group there and no copies are made.

## Going live

Apply 0014 to `preview`, try it (report a post as one farm, settle it as staff; remove a post and a member as the group admin; post an official alert to the group's county; watch the unread badge), then apply to `production` with the owner's go-ahead and merge.
