'use client';

import React, { useState } from 'react';
import { AppStorage } from '@/lib/storage';
import { SecureAuth } from '@/lib/auth-client';
import { PLANS, PLAN_ORDER, TRIAL_DAYS, formatKsh } from '@/lib/plans';
import { useSiteContent } from '@/components/site/SiteContentProvider';
import { priceOf } from '@/lib/site-content';
import { RESET_COPY, RESET_LINK_MINUTES } from '@/lib/password-reset';
import { TEAM_COPY } from '@/lib/team-copy';
import { AUTH_COPY, translateMessage } from '@/lib/app-copy';
import { planFeatureLines } from '@/lib/plan-copy';
import { useLanguage } from '@/lib/use-language';
import { looksLikeInviteCode, normaliseInviteCode } from '@/lib/team';
import { hasDialableNumber, whatsappLink } from '@/lib/contact';
import { SubscriptionPlan, UserAccount } from '@/types';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  MapPin, 
  Sparkles, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Tractor,
  type LucideIcon,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'forgot' | 'join';
  /** The code from an invitation link (?join=CODE), filled in for the person. */
  initialJoinCode?: string;
  initialPlan?: SubscriptionPlan;
  onSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialJoinCode = '',
  initialPlan = 'farmer',
  onSuccess,
}) => {
  const { prices } = useSiteContent();
  const [lang, chooseLang] = useLanguage();
  const t = AUTH_COPY[lang];
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'join'>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Joining a farm with an invitation
  const [joinCode, setJoinCode] = useState(initialJoinCode);

  // Forgot password
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Signup form fields
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [farmName, setFarmName] = useState('');
  const [county, setCounty] = useState('');
  const [subCounty, setSubCounty] = useState('');
  const [plan, setPlan] = useState<SubscriptionPlan>(initialPlan);
  const [inviteCode, setInviteCode] = useState('');

  React.useEffect(() => { if (initialJoinCode) setJoinCode(initialJoinCode); }, [initialJoinCode]);

  React.useEffect(() => {
    setMode(initialMode);
    if (initialPlan) setPlan(initialPlan);
  }, [initialMode, initialPlan]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await AppStorage.login(loginEmail, loginPassword);
      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      } else {
        setError(res.error ? translateMessage(res.error, lang) : 'Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setError(translateMessage('An unexpected error occurred during login.', lang));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const copy = RESET_COPY[lang];
    try {
      const result = await SecureAuth.requestPasswordReset(resetEmail);
      if (result.success) { setResetSent(true); return; }
      setError(result.reason === 'rate_limited' ? copy.rateLimited : result.reason === 'bad_email' ? copy.badEmail : copy.unavailable);
    } catch {
      setError(copy.other);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const copy = TEAM_COPY[lang];
    if (!looksLikeInviteCode(joinCode)) { setError(copy.joinNeedsCode); return; }
    if (!name.trim() || !signupEmail.trim()) { setError(translateMessage('Please fill in all required fields.', lang)); return; }
    if (signupPassword.length < 12) { setError(copy.passwordShort); return; }
    setLoading(true);
    try {
      const res = await SecureAuth.joinFarm({ name, email: signupEmail, password: signupPassword, phone, code: normaliseInviteCode(joinCode) });
      if (res.success && res.user) { onSuccess(res.user); onClose(); }
      else if (res.confirmationRequired) { setSignupPassword(''); setNotice('Check your email to confirm your account, then sign in and enter your invitation again.'); }
      else setError(res.error || copy.invalidCode);
    } catch {
      setError(copy.invalidCode);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setError(null);
    const demoUser = AppStorage.loginDemoUser();
    onSuccess(demoUser);
    onClose();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!name.trim() || !signupEmail.trim() || !signupPassword.trim() || !farmName.trim() || !county.trim()) {
        setError(translateMessage('Please fill in all required fields.', lang));
        setLoading(false);
        return;
      }

      if (signupPassword.length < 12) {
        setError(translateMessage('Password must be at least 12 characters.', lang));
        setLoading(false);
        return;
      }

      const res = await AppStorage.registerFarmer({
        name,
        email: signupEmail,
        password: signupPassword,
        phone,
        farmName,
        county,
        subCounty,
        plan,
        inviteCode,
      });

      if (res.confirmationRequired) {
        setSignupPassword('');
        setNotice(translateMessage('Check your email to confirm your account, then sign in.', lang));
      } else if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      } else {
        setError(translateMessage(res.error || 'Failed to create your farm account.', lang));
      }
    } catch (error) {
      console.error('Account creation failed unexpectedly', error);
      setError(translateMessage('An error occurred while creating your account.', lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in overflow-y-auto bg-charcoal/60 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
          onClick={(e) => e.stopPropagation()}
          className="relative my-0 w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-lift sm:my-8 sm:rounded-3xl"
        >
          {/* Header */}
          <div className="relative bg-sage px-6 pb-6 pt-7 text-white sm:px-8">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
            <button
              onClick={onClose}
              aria-label={t.close}
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white font-display text-xl font-medium text-sage">M</span>
              <div>
                <h2 id="auth-title" className="font-display text-2xl font-medium leading-tight">Mylkio</h2>
                <p className="text-sm text-sage-200">{t.tagline}</p>
              </div>
            </div>

            <button type="button" onClick={() => chooseLang(lang === 'en' ? 'sw' : 'en')} className="absolute right-16 top-3 flex h-11 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/20">{t.language}</button>

            <div role="tablist" aria-label={t.tablist} className="relative mt-6 flex rounded-full bg-sage-900/40 p-1">
              {([['login', t.signIn], ['signup', t.createAccount]] as const).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={mode === key}
                  onClick={() => { setMode(key); setError(null); setResetSent(false); }}
                  className={`min-h-11 flex-1 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-all ${mode === key ? 'bg-white text-sage shadow-soft' : 'text-sage-200 hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div role="alert" className="mx-6 mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800 sm:mx-8">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}
          {notice && <p role="status" className="mx-6 mt-5 rounded-xl border border-sage-300 bg-sage/10 p-3.5 text-sm font-medium text-charcoal sm:mx-8">{notice}</p>}

          <div className="p-6 sm:p-8">
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <IconField id="login-email" label={t.email} icon={Mail} type="email" required autoComplete="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="farmer@dairy.co.ke" />
                <div>
                  <IconField id="login-password" label={t.password} icon={Lock} type="password" required autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder={t.yourPassword} />
                  <button type="button" onClick={() => { setResetEmail(loginEmail); setResetSent(false); setError(null); setMode('forgot'); }} className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-sage hover:underline">
                    {RESET_COPY[lang].forgotLink}
                  </button>
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                  <span>{loading ? t.verifying : t.signInButton}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                <button type="button" onClick={() => { setError(null); setMode('join'); }} className="mx-auto flex min-h-10 items-center text-sm font-semibold text-sage hover:underline">
                  {TEAM_COPY[lang].joinLink}
                </button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ivory-border" /></div>
                  <p className="relative mx-auto w-fit bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">{t.orSample}</p>
                </div>

                <button type="button" onClick={handleDemoLogin} className="btn btn-secondary btn-lg w-full">
                  <Tractor className="h-5 w-5 text-sage" />
                  <span>{t.demo}</span>
                </button>
              </form>
            ) : mode === 'join' ? (
              <JoinFarm
                code={joinCode} onCode={setJoinCode} name={name} onName={setName} phone={phone} onPhone={setPhone}
                email={signupEmail} onEmail={setSignupEmail} password={signupPassword} onPassword={setSignupPassword}
                loading={loading} onSubmit={handleJoin} onBack={() => { setMode('login'); setError(null); }}
              />
            ) : mode === 'forgot' ? (
              <ForgotPassword email={resetEmail} onEmail={setResetEmail} sent={resetSent} loading={loading} onSubmit={handleForgot} onBack={() => { setMode('login'); setError(null); setResetSent(false); }} />
            ) : (
              <form onSubmit={handleSignup} className="space-y-5">
                <p className="flex items-start gap-2.5 rounded-xl border border-gold-200 bg-gold-50 p-3.5 text-sm font-medium text-charcoal">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                  <span>{t.trialNote(TRIAL_DAYS)}</span>
                </p>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <IconField id="su-name" label={t.yourName} icon={User} type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Peter Chege" />
                  <IconField id="su-phone" label={t.phoneMpesa} icon={Phone} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
                </div>

                <IconField id="su-farm" label={t.farmName} type="text" required value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="e.g. Rongai Pride Dairy" />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <IconField id="su-county" label={t.county} icon={MapPin} type="text" required value={county} onChange={(e) => setCounty(e.target.value)} placeholder="e.g. Nakuru, Kiambu" />
                  <IconField id="su-subcounty" label={t.subCounty} type="text" value={subCounty} onChange={(e) => setSubCounty(e.target.value)} placeholder="e.g. Rongai, Limuru" />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <IconField id="su-email" label={t.email + ' *'} icon={Mail} type="email" required autoComplete="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@email.com" />
                  <IconField id="su-password" label={t.setPassword} icon={Lock} type="password" required minLength={12} autoComplete="new-password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder={t.atLeast12} />
                </div>

                {SecureAuth.inviteRequired() && (
                  <div>
                    <IconField id="signup-invite" label={t.invitation} type="text" required autoComplete="off" autoCapitalize="characters" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder={t.invitationPlaceholder} className="uppercase tracking-wide" />
                    <p className="mt-1.5 text-sm text-charcoal-muted">{t.invitationHint}</p>
                  </div>
                )}

                <fieldset>
                  <legend className="field-label">{t.choosePlan(TRIAL_DAYS)}</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {PLAN_ORDER.map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={plan === id}
                        onClick={() => setPlan(id)}
                        className={`min-h-16 rounded-xl border px-1.5 py-2 text-center transition-all ${plan === id ? 'border-sage bg-sage/10 ring-2 ring-sage/25' : 'border-ivory-border bg-white hover:border-sage-300'}`}
                      >
                        <span className="block whitespace-nowrap text-sm font-semibold text-charcoal">{PLANS[id].name}</span>
                        <span className="block whitespace-nowrap text-sm font-bold tabular-nums text-sage">{formatKsh(priceOf(prices, id))}</span>
                      </button>
                    ))}
                  </div>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-charcoal-light marker:text-sage" aria-label={PLANS[plan === 'admin' ? 'farmer' : plan].name}>
                    {planFeatureLines(plan === 'admin' ? 'farmer' : plan, lang).map((line) => <li key={line}>{line}</li>)}
                  </ul>
                  {/* Custom cannot be chosen here: it is agreed with the Mylkio team. */}
                  <a href="#custom-plan" onClick={onClose} className="mt-2 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-dashed border-ivory-border bg-white px-3 py-2 text-left transition-colors hover:border-sage-300">
                    <span className="min-w-0"><span className="block text-sm font-semibold text-charcoal">{PLANS.custom.name}</span><span className="block text-xs text-charcoal-muted">{t.customHint}</span></span>
                    <span className="whitespace-nowrap text-sm font-bold text-sage">{t.customTalk}</span>
                  </a>
                </fieldset>

                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                  <span>{loading ? t.settingUp : t.startTrial(TRIAL_DAYS)}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                <p className="flex items-center justify-center gap-1.5 text-sm text-charcoal-muted">
                  <ShieldCheck className="h-4 w-4 text-sage" />
                  <span>{t.noCharge}</span>
                </p>

                <p className="text-center text-xs text-charcoal-muted">
                  {t.agree(t.terms, t.privacy).before}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-sage underline">{t.terms}</a>{t.agree(t.terms, t.privacy).and}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-sage underline">{t.privacy}</a>.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** An invited person creates their own login and joins the owner's farm with the one-time code. */
function JoinFarm({ code, onCode, name, onName, phone, onPhone, email, onEmail, password, onPassword, loading, onSubmit, onBack }: {
  code: string; onCode: (v: string) => void; name: string; onName: (v: string) => void; phone: string; onPhone: (v: string) => void;
  email: string; onEmail: (v: string) => void; password: string; onPassword: (v: string) => void; loading: boolean;
  onSubmit: (e: React.FormEvent) => void; onBack: () => void;
}) {
  const [lang] = useLanguage();
  const t = TEAM_COPY[lang];
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h3 className="font-display text-xl font-medium">{t.joinTitle}</h3>
        <p className="mt-2 text-sm text-charcoal-light">{t.joinIntro}</p>
      </div>
      <div>
        <IconField id="join-code" label={t.joinCode} type="text" required autoComplete="off" autoCapitalize="characters" value={code} onChange={(e) => onCode(e.target.value)} placeholder="ABCDE-FGHJK" className="uppercase tracking-widest" />
        <p className="mt-1.5 text-sm text-charcoal-muted">{t.joinCodeHint}</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <IconField id="join-name" label={t.yourName} icon={User} type="text" required autoComplete="name" value={name} onChange={(e) => onName(e.target.value)} />
        <IconField id="join-phone" label={t.yourPhone} icon={Phone} type="tel" autoComplete="tel" value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="0712 345 678" />
      </div>
      <IconField id="join-email" label={t.email} icon={Mail} type="email" required autoComplete="email" value={email} onChange={(e) => onEmail(e.target.value)} />
      <div>
        <IconField id="join-password" label={t.password} icon={Lock} type="password" required minLength={12} autoComplete="new-password" value={password} onChange={(e) => onPassword(e.target.value)} />
        <p className="mt-1.5 text-sm text-charcoal-muted">{t.passwordHint}</p>
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full"><span>{loading ? t.joining : t.joinButton}</span><ArrowRight className="h-5 w-5" /></button>
      <button type="button" onClick={onBack} className="btn btn-ghost w-full">{t.joinBack}</button>
    </form>
  );
}

/** Asks for the email address and sends the reset link. Says the same thing whether or not the address has an account. */
function ForgotPassword({ email, onEmail, sent, loading, onSubmit, onBack }: {
  email: string; onEmail: (value: string) => void; sent: boolean; loading: boolean; onSubmit: (e: React.FormEvent) => void; onBack: () => void;
}) {
  const [lang] = useLanguage();
  const { contact } = useSiteContent();
  const t = RESET_COPY[lang];
  if (sent) {
    return (
      <div role="status" className="space-y-4">
        <h3 className="font-display text-xl font-medium">{t.sentTitle}</h3>
        <p className="text-base text-charcoal-light">{t.sentBody(RESET_LINK_MINUTES)}</p>
        <p className="text-sm text-charcoal-muted">{t.noEmail}</p>
        {hasDialableNumber(contact.whatsapp) && <a className="btn btn-secondary w-full" href={whatsappLink(contact.whatsapp, 'Hello Mylkio, I cannot reset my password.')} target="_blank" rel="noopener noreferrer">{t.whatsapp}</a>}
        <button type="button" onClick={onBack} className="btn btn-ghost w-full">{t.back}</button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h3 className="font-display text-xl font-medium">{t.forgotTitle}</h3>
        <p className="mt-2 text-sm text-charcoal-light">{t.forgotIntro}</p>
      </div>
      <IconField id="forgot-email" label="Email" icon={Mail} type="email" required autoComplete="email" value={email} onChange={(e) => onEmail(e.target.value)} placeholder="farmer@dairy.co.ke" />
      <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full"><span>{loading ? t.sending : t.send}</span><ArrowRight className="h-5 w-5" /></button>
      <button type="button" onClick={onBack} className="btn btn-ghost w-full">{t.back}</button>
    </form>
  );
}

/** A labelled input, with an optional icon, in the shared field style (16px so phones do not zoom in). */
function IconField({ id, label, icon: Icon, className = '', ...input }: { id: string; label: string; icon?: LucideIcon } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        {Icon && <Icon aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-subtle" />}
        <input id={id} {...input} className={`field ${Icon ? 'pl-10' : ''} ${className}`} />
      </div>
    </div>
  );
}
