'use client';

import React, { useState } from 'react';
import { AppStorage } from '@/lib/storage';
import { SecureAuth } from '@/lib/auth-client';
import { PLANS, PLAN_ORDER, TRIAL_DAYS, formatKsh } from '@/lib/plans';
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
  initialMode?: 'login' | 'signup';
  initialPlan?: SubscriptionPlan;
  onSuccess: (user: UserAccount) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialPlan = 'farmer',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  // Login form fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

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
        setError(res.error || 'Invalid credentials. Please verify your email and password.');
      }
    } catch {
      setError('An unexpected error occurred during login.');
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
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }

      if (signupPassword.length < 12) {
        setError('Password must be at least 12 characters.');
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
        setNotice('Check your email to confirm your account, then sign in.');
      } else if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      } else {
        setError(res.error || 'Failed to create your farm account.');
      }
    } catch (error) {
      console.error('Account creation failed unexpectedly', error);
      setError('An error occurred while creating your account.');
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
              aria-label="Close"
              className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white font-display text-xl font-medium text-sage">M</span>
              <div>
                <h2 id="auth-title" className="font-display text-2xl font-medium leading-tight">Mylkio</h2>
                <p className="text-sm text-sage-200">Dairy farm management</p>
              </div>
            </div>

            <div role="tablist" aria-label="Sign in or create an account" className="relative mt-6 flex rounded-full bg-sage-900/40 p-1">
              {([['login', 'Sign in'], ['signup', 'Create account']] as const).map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={mode === key}
                  onClick={() => { setMode(key); setError(null); }}
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
                <IconField id="login-email" label="Email address" icon={Mail} type="email" required autoComplete="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="farmer@dairy.co.ke" />
                <IconField id="login-password" label="Password" icon={Lock} type="password" required autoComplete="current-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Your password" />

                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                  <span>{loading ? 'Verifying…' : 'Sign in to your farm'}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-ivory-border" /></div>
                  <p className="relative mx-auto w-fit bg-white px-3 text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Or try sample data</p>
                </div>

                <button type="button" onClick={handleDemoLogin} className="btn btn-secondary btn-lg w-full">
                  <Tractor className="h-5 w-5 text-sage" />
                  <span>Explore the demo farm</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-5">
                <p className="flex items-start gap-2.5 rounded-xl border border-gold-200 bg-gold-50 p-3.5 text-sm font-medium text-charcoal">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                  <span>Includes a {TRIAL_DAYS}-day full free trial. Your farm starts clean, with no demo data.</span>
                </p>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <IconField id="su-name" label="Your name *" icon={User} type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Peter Chege" />
                  <IconField id="su-phone" label="Phone (M-Pesa)" icon={Phone} type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
                </div>

                <IconField id="su-farm" label="Farm name *" type="text" required value={farmName} onChange={(e) => setFarmName(e.target.value)} placeholder="e.g. Rongai Pride Dairy" />

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <IconField id="su-county" label="County *" icon={MapPin} type="text" required value={county} onChange={(e) => setCounty(e.target.value)} placeholder="e.g. Nakuru, Kiambu" />
                  <IconField id="su-subcounty" label="Sub-county" type="text" value={subCounty} onChange={(e) => setSubCounty(e.target.value)} placeholder="e.g. Rongai, Limuru" />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <IconField id="su-email" label="Email address *" icon={Mail} type="email" required autoComplete="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="you@email.com" />
                  <IconField id="su-password" label="Set password *" icon={Lock} type="password" required minLength={12} autoComplete="new-password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="At least 12 characters" />
                </div>

                {SecureAuth.inviteRequired() && (
                  <div>
                    <IconField id="signup-invite" label="Invitation code *" type="text" required autoComplete="off" autoCapitalize="characters" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="The code you were given" className="uppercase tracking-wide" />
                    <p className="mt-1.5 text-sm text-charcoal-muted">Mylkio is invitation-only during the pilot. No code? Use the contact form to request one.</p>
                  </div>
                )}

                <fieldset>
                  <legend className="field-label">Choose a monthly plan ({TRIAL_DAYS} days free)</legend>
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
                        <span className="block whitespace-nowrap text-sm font-bold tabular-nums text-sage">{formatKsh(PLANS[id].priceKsh)}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                  <span>{loading ? 'Setting up your farm…' : `Start ${TRIAL_DAYS}-day free trial`}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                <p className="flex items-center justify-center gap-1.5 text-sm text-charcoal-muted">
                  <ShieldCheck className="h-4 w-4 text-sage" />
                  <span>No M-Pesa charge today. Cancel anytime.</span>
                </p>

                <p className="text-center text-xs text-charcoal-muted">
                  By creating an account you agree to our{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-sage underline">Terms of use</a> and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-sage underline">Privacy notice</a>.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
