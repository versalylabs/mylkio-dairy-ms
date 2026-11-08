import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError } from './supabase';

export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
}

export async function endpoint(action: () => Promise<NextResponse>) {
  try { return await action(); }
  catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError) return json({ error: 'Please check the submitted fields.' }, 400);
    // Do not echo database errors, tokens, credentials, or submitted records.
    console.error('Mylkio API operation failed');
    return json({ error: 'The operation could not be completed. Please try again.' }, 500);
  }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) throw new ApiError(403, 'Request origin rejected.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415, 'JSON required.');
}

export async function body(request: Request, maximum = 64 * 1024) {
  if (Number(request.headers.get('content-length')) > maximum) throw new ApiError(413, 'Request too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Request body required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) { await reader.cancel(); throw new ApiError(413, 'Request too large.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'Invalid JSON.'); }
}
