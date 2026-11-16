import { z } from 'zod';
import { ApiError } from '@/lib/server/errors';
import { body, endpoint, json, sameOrigin } from '@/lib/server/http';
import { signedIn } from '@/lib/server/neon-auth';
import { adminResetSiteContent, adminSetSiteContent, adminSiteContentMeta, getSiteContent } from '@/lib/server/farm-api';
import { SITE_CONTENT_KEYS, mergeSiteContent, siteContentSchemas, type SiteContentKey } from '@/lib/site-content';

export const dynamic = 'force-dynamic';

const keyInput = z.enum(SITE_CONTENT_KEYS);

/** What is saved now (with built-in defaults filled in), and when each part was last changed and by whom. */
export async function GET() {
  return endpoint(async () => {
    const { db, user } = await signedIn();
    // The meta call is the administrator check: it refuses anyone else before anything is returned.
    const meta = await adminSiteContentMeta(db, user.id);
    const stored = await getSiteContent(db);
    return json({ content: mergeSiteContent(stored), saved: Object.keys(stored), meta });
  });
}

/** Saves one part of the content, after checking it is the right shape. */
export async function PUT(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const input = z.object({ key: keyInput, value: z.unknown() }).strict().parse(await body(request, 128 * 1024));
    const parsed = siteContentSchemas[input.key as SiteContentKey].safeParse(input.value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const item = typeof issue?.path[0] === 'number' ? ` in item ${issue.path[0] + 1}` : '';
      const field = issue?.path.filter((p) => typeof p === 'string').pop();
      // zod's own wording is technical ("Too small: expected string to have >=10 characters"); say it plainly.
      const detail = issue?.code === 'too_small' && 'minimum' in issue && issue.origin === 'string' ? `it needs at least ${issue.minimum} characters`
        : issue?.code === 'too_big' && 'maximum' in issue && issue.origin === 'string' ? `it can be at most ${issue.maximum} characters`
        : issue?.message;
      throw new ApiError(400, issue ? `Please check${field ? ` “${String(field)}”` : ' the fields'}${item}: ${detail}.` : 'Please check the fields and try again.');
    }
    await adminSetSiteContent(db, user.id, input.key, parsed.data);
    return json({ success: true });
  });
}

/** Removes a saved part, so the website goes back to the built-in wording and prices. */
export async function DELETE(request: Request) {
  return endpoint(async () => {
    sameOrigin(request);
    const { db, user } = await signedIn();
    const { key } = z.object({ key: keyInput }).strict().parse(await body(request));
    await adminResetSiteContent(db, user.id, key);
    return json({ success: true });
  });
}
