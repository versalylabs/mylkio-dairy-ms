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
