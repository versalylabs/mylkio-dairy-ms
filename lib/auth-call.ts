// Neon's browser auth client reports a failed request (an email that already exists, a wrong
// password, a rate limit) by THROWING, not by returning `{ error }` as Better Auth normally does.
// Code written for the returned form never saw those failures and fell into a generic catch-all.
// `attempt` turns either form into `{ error }` so callers can handle both the same way.

export interface AuthFailure {
  message?: string;
  status?: number;
}

export async function attempt(call: () => Promise<unknown>): Promise<{ error: AuthFailure | null }> {
  try {
    const result = (await call()) as { error?: AuthFailure | null } | null | undefined;
    return { error: result?.error ?? null };
  } catch (thrown) {
    const e = thrown as { message?: unknown; status?: unknown; statusCode?: unknown } | null;
    const status = typeof e?.status === 'number' ? e.status : typeof e?.statusCode === 'number' ? e.statusCode : undefined;
    return { error: { message: typeof e?.message === 'string' ? e.message : 'Request failed', status } };
  }
}
