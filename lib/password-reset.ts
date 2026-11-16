// Rules and wording for forgetting and resetting a password. No browser or Next.js imports, so tests can cover it.
//
// How it works: the farmer asks for a link (Neon Auth emails it; the link is good for 15 minutes), opens it, and Neon
// Auth sends them back to /reset-password with `?token=...` (or `?error=INVALID_TOKEN` if the link is used up or
// expired). They choose a new password there. The screen never says whether an email has an account.

export const MIN_PASSWORD_LENGTH = 12;
export const RESET_LINK_MINUTES = 15;

export type Lang = 'en' | 'sw';

export type PasswordProblem = 'too_short' | 'mismatch' | null;

/** The same rule as sign-up (12 or more characters), and the two entries must match. */
export function checkNewPassword(password: string, confirm: string): PasswordProblem {
  if (password.length < MIN_PASSWORD_LENGTH) return 'too_short';
  if (password !== confirm) return 'mismatch';
  return null;
}

export type ResetFailure = 'rate_limited' | 'invalid_link' | 'bad_email' | 'unavailable' | 'other';

/** What went wrong, from whatever the auth service answered. */
export function classifyResetFailure(failure: { message?: string; status?: number; code?: string } | null | undefined): ResetFailure {
  if (!failure) return 'other';
  if (failure.status === 429) return 'rate_limited';
  const text = `${failure.code ?? ''} ${failure.message ?? ''}`.toLowerCase();
  if (/invalid[ _]token|token.*(expired|invalid)|expired/.test(text)) return 'invalid_link';
  if (/invalid[ _]email|email/.test(text) && failure.status === 400) return 'bad_email';
  if (failure.status === undefined || failure.status >= 500) return 'unavailable';
  return 'other';
}

/** What the reset page was opened with: a token to use, or a sign that the link is no good. */
export function readResetLink(search: string): { token: string | null; broken: boolean } {
  const params = new URLSearchParams(search);
  const token = params.get('token')?.trim() || null;
  const broken = Boolean(params.get('error')) || !token;
  return { token: broken ? null : token, broken };
}

export const RESET_COPY: Record<Lang, {
  forgotLink: string; forgotTitle: string; forgotIntro: string; send: string; sending: string; back: string;
  sentTitle: string; sentBody: (minutes: number) => string; noEmail: string; whatsapp: string;
  rateLimited: string; badEmail: string; unavailable: string; saveUnavailable: string; other: string;
  newTitle: string; newIntro: string; newPassword: string; confirmPassword: string; save: string; saving: string;
  tooShort: string; mismatch: string; show: string; hide: string;
  doneTitle: string; doneBody: string; signIn: string;
  brokenTitle: string; brokenBody: string; askAgain: string; home: string; language: string;
}> = {
  en: {
    forgotLink: 'Forgot your password?',
    forgotTitle: 'Reset your password',
    forgotIntro: 'Enter the email address you signed up with. We will send you a link to choose a new password.',
    send: 'Send reset link', sending: 'Sending…', back: 'Back to sign in',
    sentTitle: 'Check your email',
    sentBody: (minutes) => `If an account exists for that address, a link is on its way. It works for ${minutes} minutes and can be used once. Look in your spam folder too.`,
    noEmail: 'No email after a few minutes? Message us and we will help you get back in.',
    whatsapp: 'Message us on WhatsApp',
    rateLimited: 'Too many attempts. Please wait a few minutes and try again.',
    badEmail: 'Please check the email address and try again.',
    unavailable: 'We could not send the email just now. Please try again shortly, or message us.',
    saveUnavailable: 'We could not save your new password just now. Please try again shortly.',
    other: 'Something went wrong. Please try again.',
    newTitle: 'Choose a new password',
    newIntro: `Use at least ${MIN_PASSWORD_LENGTH} characters. A few words you will remember is easier than symbols.`,
    newPassword: 'New password', confirmPassword: 'Type it again', save: 'Save new password', saving: 'Saving…',
    tooShort: `Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`, mismatch: 'The two passwords do not match.',
    show: 'Show', hide: 'Hide',
    doneTitle: 'Password changed', doneBody: 'You can now sign in with your new password.', signIn: 'Sign in',
    brokenTitle: 'This link has expired or was already used',
    brokenBody: `Reset links work once, for ${RESET_LINK_MINUTES} minutes. Ask for a new one and use the newest email.`,
    askAgain: 'Ask for a new link', home: 'Back to Mylkio', language: 'Kiswahili',
  },
  sw: {
    forgotLink: 'Umesahau nenosiri lako?',
    forgotTitle: 'Weka nenosiri jipya',
    forgotIntro: 'Andika barua pepe uliyotumia kujisajili. Tutakutumia kiungo cha kuchagua nenosiri jipya.',
    send: 'Tuma kiungo', sending: 'Inatuma…', back: 'Rudi kuingia',
    sentTitle: 'Angalia barua pepe yako',
    sentBody: (minutes) => `Kama kuna akaunti ya anwani hiyo, kiungo kiko njiani. Kinafanya kazi kwa dakika ${minutes} na kinatumika mara moja tu. Angalia pia kwenye folda ya barua taka (spam).`,
    noEmail: 'Hujapata barua pepe baada ya dakika chache? Tuandikie tukusaidie kuingia tena.',
    whatsapp: 'Tuandikie WhatsApp',
    rateLimited: 'Majaribio mengi mno. Tafadhali subiri dakika chache kisha ujaribu tena.',
    badEmail: 'Tafadhali hakikisha anwani ya barua pepe kisha ujaribu tena.',
    unavailable: 'Hatukuweza kutuma barua pepe sasa hivi. Jaribu tena baadaye kidogo, au tuandikie.',
    saveUnavailable: 'Hatukuweza kuhifadhi nenosiri lako jipya sasa hivi. Tafadhali jaribu tena baadaye kidogo.',
    other: 'Kuna tatizo. Tafadhali jaribu tena.',
    newTitle: 'Chagua nenosiri jipya',
    newIntro: `Tumia angalau herufi ${MIN_PASSWORD_LENGTH}. Maneno machache utakayokumbuka ni rahisi kuliko alama.`,
    newPassword: 'Nenosiri jipya', confirmPassword: 'Liandike tena', save: 'Hifadhi nenosiri jipya', saving: 'Inahifadhi…',
    tooShort: `Nenosiri lako linahitaji angalau herufi ${MIN_PASSWORD_LENGTH}.`, mismatch: 'Manenosiri mawili hayafanani.',
    show: 'Onyesha', hide: 'Ficha',
    doneTitle: 'Nenosiri limebadilishwa', doneBody: 'Sasa unaweza kuingia kwa nenosiri lako jipya.', signIn: 'Ingia',
    brokenTitle: 'Kiungo hiki kimeisha muda au kimeshatumika',
    brokenBody: `Viungo vya kuweka nenosiri upya hufanya kazi mara moja, kwa dakika ${RESET_LINK_MINUTES}. Omba kiungo kipya na utumie barua pepe ya karibuni zaidi.`,
    askAgain: 'Omba kiungo kipya', home: 'Rudi Mylkio', language: 'English',
  },
};
