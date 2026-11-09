// Reading DATABASE_URL tolerantly. Neon's console offers a "Copy snippet" button that
// copies a whole `psql '...'` command, and shows the password masked, so what ends up in an
// environment variable is not always a bare connection string. Free of Next.js imports so
// tests can cover it.

const URL_PATTERN = /postgres(?:ql)?:\/\/[^\s'"`]+/i;

/** The postgresql:// URL inside whatever was pasted (a bare URL, a psql command, quoted text), or null. */
export function extractConnectionString(raw: string | undefined | null): string | null {
  return raw?.match(URL_PATTERN)?.[0] ?? null;
}

/** A plain-language reason the value cannot be used, or null if it looks usable. Never includes the value. */
export function connectionProblem(raw: string | undefined | null): string | null {
  if (!raw || !raw.trim()) return 'not set';
  const url = extractConnectionString(raw);
  if (!url) return 'does not contain a postgresql:// connection string';
  if (/\*{3,}|•{3,}/.test(url)) return 'the password is masked; copy the string with "Show password" turned on';
  try {
    const parsed = new URL(url);
    if (!parsed.hostname || !parsed.username || !parsed.password || parsed.pathname.length < 2) {
      return 'is missing the host, user, password or database name';
    }
  } catch {
    return 'is not a valid connection string';
  }
  return null;
}
