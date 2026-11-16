import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { createInvite, listTeam, removeMember, revokeInvite, setMemberRole } from '@/lib/server/farm-api';
import { INVITE_DAYS, newInviteCode } from '@/lib/team';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ farmId: string }> };
const farmIdOf = async (context: Context) => z.uuid().parse((await context.params).farmId);
const role = z.enum(['manager', 'worker']);

// The team of one farm. Everything here is for the farm's owner: the server checks the session and the database
// checks again that the caller owns this farm, so a member (or another farm's owner) is refused.

/** Members and open invitations, and how many logins the plan allows. */
export async function GET(_request: Request, context: Context) {
  return endpoint(async () => {
    const farmId = await farmIdOf(context);
    const { db, user } = await signedIn();
    return json(await listTeam(db, user.id, farmId));
  });
}

/** A new invitation. The one-time code is returned once, here, and never stored in readable form. */
export async function POST(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const farmId = await farmIdOf(context);
    const { db, user } = await signedIn();
    const input = z.object({ role, label: z.string().trim().max(80).default('') }).strict().parse(await body(request));
    const code = newInviteCode((n) => randomBytes(n));
    await createInvite(db, user.id, farmId, input.role, input.label, code);
    return json({ code, days: INVITE_DAYS }, 201);
  });
}

/** Changes a member's role. */
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const farmId = await farmIdOf(context);
    const { db, user } = await signedIn();
    const input = z.object({ memberId: z.string().min(1).max(200), role }).strict().parse(await body(request));
    await setMemberRole(db, user.id, farmId, input.memberId, input.role);
    return json({ success: true });
  });
}

/** Takes a member off the farm, or withdraws an open invitation. */
export async function DELETE(request: Request, context: Context) {
  return endpoint(async () => {
    sameOrigin(request);
    const farmId = await farmIdOf(context);
    const { db, user } = await signedIn();
    const input = z.union([
      z.object({ memberId: z.string().min(1).max(200) }).strict(),
      z.object({ inviteId: z.uuid() }).strict(),
    ]).parse(await body(request));
    if ('memberId' in input) await removeMember(db, user.id, farmId, input.memberId);
    else await revokeInvite(db, user.id, farmId, input.inviteId);
    return json({ success: true });
  });
}
