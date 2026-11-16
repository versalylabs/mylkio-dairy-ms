import { NextResponse } from 'next/server';
import { database } from '@/lib/server/db';
import { getSiteContent } from '@/lib/server/farm-api';
import { describeError } from '@/lib/server/http';
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from '@/lib/site-content';

export const dynamic = 'force-dynamic';

/**
 * The public website's editable content (contact details, plan prices, testimonials, FAQ). Open to everyone and
 * safe to share: it holds nothing private. A short shared cache keeps a busy day from hitting the database for
 * every visitor, yet an edit shows within about a minute. If the database cannot be reached the built-in wording
 * is returned, so the website never shows an error for this.
 */
export async function GET() {
  try {
    const content = mergeSiteContent(await getSiteContent(database()));
    return NextResponse.json(content, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('Mylkio site content could not be read, using the built-in wording:', describeError(error));
    return NextResponse.json(DEFAULT_SITE_CONTENT, { headers: { 'Cache-Control': 'public, s-maxage=10' } });
  }
}
