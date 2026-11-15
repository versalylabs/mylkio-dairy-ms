import { z } from 'zod';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { getAccount, suggestVet, vetDirectory } from '@/lib/server/farm-api';
import { ApiError } from '@/lib/server/errors';
import { featuresFor } from '@/lib/plans';
import { vetSuggestionInput } from '@/lib/server/vet-schemas';

export const dynamic = 'force-dynamic';

// The shared directory of vets that an administrator has confirmed by phone. Listing it is a Farm Pro
// feature, and the plan is checked here on the server, not only in the interface.
export async function GET(request: Request) {
  return endpoint(async () => {
    const county = z.string().trim().min(2).max(80).parse(new URL(request.url).searchParams.get('county') ?? '');
    const { db, user } = await signedIn();
    const account = await getAccount(db, user.id);
    if (!account || !featuresFor(account.subscription).vetFinder) throw new ApiError(403, 'The vet finder is part of the Farm Pro plan.');
    return json({ vets: await vetDirectory(db, user.id, county) });
  });
}

// Any farm account may suggest a vet. It stays hidden until an administrator rings the number and confirms it.
export async function POST(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    await suggestVet(db, user.id, vetSuggestionInput.parse(await body(request)));
    return json({ success: true });
  });
}
