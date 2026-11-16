# Team logins: more than one person per farm

Built 16 November 2026. Migration `db/migrations/0008_team_logins.sql`. Code: `lib/team.ts` (roles, rules, invitation code), `lib/team-copy.ts` (English and Kiswahili wording), `lib/server/farm-api.ts` (team functions), `app/api/farms/[farmId]/team/route.ts` and `app/api/account/join/route.ts`, `components/settings/TeamCard.tsx`, the "Join a farm" step in `components/auth/AuthModal.tsx`, and role-aware screens (`Shell`, `DashboardView`, `HerdView`, `SettingsView`). Tests: `tests/server/team.test.ts` (26 tests, run against the real migrations).

## Who can do what

| | Owner | Manager | Worker |
| --- | --- | --- | --- |
| Milk, cow health, breeding, reminders | read and write | read and write | read and write |
| Cows (add, edit, remove) | yes | yes | **look only** |
| Buyers, deliveries, bills, statements, payments, expenses (all the money) | yes | yes | **never sees them** |
| Farm profile | yes | yes | look only |
| Plan, payments to Mylkio, the team | yes | no | no |
| Backup and export | yes | yes | no |

The **server decides**, not the screens. A worker's phone is never sent money records at all (`farm_changes` filters by role), and a write to anything outside a worker's list is refused by the database even if a screen were wrong. A refused batch writes nothing. A test checks that the screens' rules (`lib/team.ts`) and the database's (`role_can_read` / `role_can_write`) agree for every role and kind of record.

## How someone joins

1. The owner opens **Settings, Your team**, picks a role, optionally types a name ("Mary, milker"), and taps **Create invitation**.
2. The screen shows a one-time code (like `K7M2P-9XQ4T`) and a link, with **Share on WhatsApp** and **Copy message** buttons. The code is shown **only then**; the database keeps just a hash of it.
3. The invited person opens the link (or taps "Have a team invitation?" on the sign-in box and types the code), enters their name, phone, email and a password (12 or more characters), and is added to the owner's farm in the role chosen. They do not get a farm of their own and do not need a Mylkio invitation code.
4. The code works **once** and for **7 days**. The owner can withdraw it at any time. A wrong, used, expired or withdrawn code all give the same message, so it tells a guesser nothing.

The owner can change a person's role (effective at once) or remove them (they lose access at once; what they recorded stays). The owner cannot be removed or demoted.

## Plans

Only **Farm Pro** has a team: the owner plus **five** others (six logins). Starter and Farmer have the owner's login only; their Settings shows an upgrade note with a WhatsApp button instead. Open invitations count towards the limit. The limit is one line in the database (`team_limit()`) and one in `lib/team.ts` (`TEAM_LOGINS`); change both together to change it.

## Administration

Members are not farm accounts. The administration screen lists and counts **owners** only, so a farm with four logins is still one account in usage, plan and billing figures.

## Limits and things to know

- **A removed person's phone keeps what it already downloaded** until they sign out or clear it. The farm's cloud copy is protected at once; the copy on their phone is not wiped remotely.
- **A role change shows on the person's screen the next time they open the app** (the server applies it immediately).
- **Invitation codes are not attempt-limited.** Each is about 49 bits and expires in 7 days, and guessing one needs a signed-in identity, so this is not practical to attack, but it is the same trade-off as the pilot invitation codes.
- A person who already belongs to a farm cannot join another until the owner removes them.
- The "advisor" role exists in the database for later and has no access.
- Not built: leaving a farm yourself, transferring ownership, and per-person activity reports (each record's `updated_by` is kept, so a report can be added).
