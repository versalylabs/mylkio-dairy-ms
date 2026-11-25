'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { SecureAuth } from '@/lib/auth-client';
import { RESET_COPY, checkNewPassword, readResetLink, type Lang } from '@/lib/password-reset';

const LANGUAGE_KEY = 'mylkio_language';

/**
 * Where the emailed link lands: /reset-password?token=... The token is read once and removed from the address bar,
 * so it is not left in the browser history or passed on in a Referer header. If the link is used up or expired,
 * Neon Auth sends people here with ?error=... and we explain and offer to send a new one.
 */
export function ResetPasswordScreen() {
  const [lang, setLang] = useState<Lang>('en');
  const [token, setToken] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  // The link is read exactly once: removing the token from the address bar must not make a second run of this
  // effect (React runs effects twice in development) think the link was missing.
  const linkRead = useRef(false);

  useEffect(() => {
    if (linkRead.current) return;
    linkRead.current = true;
    try { if (localStorage.getItem(LANGUAGE_KEY) === 'sw') setLang('sw'); } catch { /* English stays. */ }
    const link = readResetLink(window.location.search);
    setToken(link.token); setBroken(link.broken); setReady(true);
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const t = RESET_COPY[lang];
  const switchLanguage = () => {
    const next: Lang = lang === 'en' ? 'sw' : 'en';
    setLang(next);
    try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* Not essential. */ }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const problem = checkNewPassword(password, confirm);
    if (problem) { setError(problem === 'too_short' ? t.tooShort : t.mismatch); return; }
    setError(''); setSaving(true);
    const result = await SecureAuth.resetPassword(token, password);
    setSaving(false);
    if (result.success) { setDone(true); setPassword(''); setConfirm(''); setToken(null); return; }
    if (result.reason === 'invalid_link') { setBroken(true); setToken(null); return; }
    setError(result.reason === 'rate_limited' ? t.rateLimited : result.reason === 'unavailable' ? t.saveUnavailable : t.other);
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal">
      <header className="border-b border-ivory-border bg-white/80 backdrop-blur">
        <div className="container-page flex items-center justify-between gap-4 py-4">
          <Link href="/" className="flex items-center gap-3 whitespace-nowrap" aria-label="Mylkio home">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sage font-display text-lg font-bold text-white">M</span>
            <span className="font-display text-xl font-bold">Mylkio</span>
          </Link>
          <button type="button" onClick={switchLanguage} className="btn btn-ghost">{t.language}</button>
        </div>
      </header>

      <main className="container-page max-w-md py-10 sm:py-12">
        <div className="card p-6 sm:p-8">
          {!ready && <p className="text-sm text-charcoal-muted" aria-live="polite">…</p>}

          {ready && done && (
            <div role="status" className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-sage" aria-hidden />
              <h1 className="font-display text-2xl font-bold">{t.doneTitle}</h1>
              <p className="text-base text-charcoal-light">{t.doneBody}</p>
              <Link href="/?signin=1" className="btn btn-primary btn-lg w-full">{t.signIn}</Link>
            </div>
          )}

          {ready && !done && broken && (
            <div role="alert" className="space-y-4 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-gold-600" aria-hidden />
              <h1 className="font-display text-2xl font-bold">{t.brokenTitle}</h1>
              <p className="text-base text-charcoal-light">{t.brokenBody}</p>
              <Link href="/?forgot=1" className="btn btn-primary btn-lg w-full">{t.askAgain}</Link>
              <Link href="/" className="btn btn-ghost w-full">{t.home}</Link>
            </div>
          )}

          {ready && !done && !broken && token && (
            <form onSubmit={submit} className="space-y-5" noValidate>
              <div>
                <h1 className="font-display text-2xl font-bold">{t.newTitle}</h1>
                <p className="mt-2 text-sm text-charcoal-light">{t.newIntro}</p>
              </div>
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden /><span>{error}</span>
                </div>
              )}
              <div>
                <label htmlFor="new-password" className="field-label">{t.newPassword}</label>
                <div className="relative">
                  <Lock aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-subtle" />
                  <input id="new-password" className="field pl-10 pr-12" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" aria-label={show ? t.hide : t.show} onClick={() => setShow(!show)} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-charcoal-muted hover:bg-sage/10">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="field-label">{t.confirmPassword}</label>
                <input id="confirm-password" className="field" type={show ? 'text' : 'password'} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary btn-lg w-full">{saving ? t.saving : t.save}</button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
