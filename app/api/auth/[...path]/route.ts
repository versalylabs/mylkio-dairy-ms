import { ApiError } from '@/lib/server/errors';
import { neonAuth } from '@/lib/server/neon-auth';

// Sign-up, sign-in, sign-out and session refresh are handled by Neon Auth. This route
// proxies them so the session cookie is set on this site's own origin.
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path: string[] }> };
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

const forward = (method: Method) => async (request: Request, context: Context) => {
  try {
    return await neonAuth().handler()[method](request, context);
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    throw error;
  }
};

export const GET = forward('GET');
export const POST = forward('POST');
export const PUT = forward('PUT');
export const DELETE = forward('DELETE');
export const PATCH = forward('PATCH');
