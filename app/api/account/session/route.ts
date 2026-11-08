import { endpoint, json } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { getAccount } from '@/lib/server/farm-api';

export const dynamic = 'force-dynamic';

/**
 * The signed-in user's account. A user who has signed up with Neon Auth but has not yet
 * created a farm gets `needsOnboarding` so the app can finish setting them up.
 */
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    const account = await getAccount(db, user.id);
    if (!account) return json({ needsOnboarding: true, email: user.email, name: user.name });
    return json({ user: account });
  });
}
