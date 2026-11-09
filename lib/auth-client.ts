'use client';

import { createAuthClient } from '@neon/auth/next';
import type { UserAccount, SubscriptionPlan } from '@/types';
import { initialAccounts } from './mock-data';
import { CloudStore } from './cloud-store';
import { attempt } from './auth-call';

// Identity (sign-up, sign-in, sign-out, session cookie) is handled by Neon Auth through
// this site's /api/auth route. The farm, plan and permissions come from /api/account/*,
// which the server answers only for a verified session.

let activeUser: UserAccount | null = null;
const demoKey = 'mylkio_demo_session_v2';
const cachedAccountKey = 'mylkio_last_secure_account_v2';
const backendKey = 'mylkio_secure_backend_enabled_v1';
const pendingKey = 'mylkio_pending_onboarding_v1';
let secureBackend = false;
let inviteNeeded = false;
let backendProblem = 'not checked yet';
const unavailable = () =>
  `Farmer accounts are not available on this site yet (${location.host}: ${backendProblem}). Explore the demo farm meanwhile.`;
let client: ReturnType<typeof createAuthClient> | null = null;
// Created on first use: this module is also evaluated while the page is server-rendered.
const neonClient = () => (client ??= createAuthClient());

export type AuthResult = { success: boolean; user?: UserAccount; error?: string; confirmationRequired?: boolean; needsOnboarding?: boolean };

type SignUpDetails = { name: string; email: string; password: string; phone: string; farmName: string; county: string; subCounty?: string; plan?: SubscriptionPlan; language?: string; inviteCode?: string };
type Onboarding = Omit<SignUpDetails, 'email' | 'password'>;
type AccountResponse =
  | { state: 'account'; user: UserAccount }
  | { state: 'onboarding' }
  | { state: 'signed_out' }
  | { state: 'unavailable' };

async function activate(user: UserAccount) {
  if (user.role !== 'super_admin') await CloudStore.load(user.id, user.farmId);
  else CloudStore.clear();
  localStorage.setItem(cachedAccountKey, JSON.stringify({ id: user.id, email: user.email, role: user.role, farmId: user.farmId, name: user.name, phone: user.phone, createdAt: user.createdAt, subscription: user.subscription }));
  sessionStorage.removeItem(demoKey);
  activeUser = user;
  window.dispatchEvent(new Event('mylkio_auth_changed'));
}

async function fetchAccount(): Promise<AccountResponse> {
  const response = await fetch('/api/account/session', { cache: 'no-store' });
  if (response.status === 401) return { state: 'signed_out' };
  if (!response.ok) return { state: 'unavailable' };
  const result = await response.json();
  return result.needsOnboarding ? { state: 'onboarding' } : { state: 'account', user: result.user };
}

function readPending(): Onboarding | null {
  try {
    const raw = localStorage.getItem(pendingKey);
    return raw ? (JSON.parse(raw) as Onboarding) : null;
  } catch {
    return null;
  }
}

async function completeOnboarding(details: Onboarding): Promise<AuthResult> {
  const response = await fetch('/api/account/onboard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: details.name, phone: details.phone, farmName: details.farmName, county: details.county,
      subCounty: details.subCounty || undefined, plan: details.plan ?? 'farmer', language: details.language === 'sw' ? 'sw' : 'en',
      inviteCode: details.inviteCode?.trim() || undefined,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 403) {
    // A wrong code: forget it so the next attempt asks again, but keep the rest of the form details.
    localStorage.setItem(pendingKey, JSON.stringify({ ...details, inviteCode: undefined }));
    return { success: false, error: result.error || 'That invitation code is not valid.' };
  }
  if (!response.ok) return { success: false, error: result.error || 'Your farm could not be set up. Please try again.' };
  localStorage.removeItem(pendingKey);
  await activate(result.user);
  return { success: true, user: result.user };
}

/** After Neon Auth has signed the user in: load their farm, or create it if this is their first sign-in. */
async function finishSession(): Promise<AuthResult> {
  const account = await fetchAccount();
  if (account.state === 'account') { localStorage.removeItem(pendingKey); await activate(account.user); return { success: true, user: account.user }; }
  if (account.state === 'onboarding') {
    const pending = readPending();
    if (pending) return completeOnboarding(pending);
    return {
      success: false,
      needsOnboarding: true,
      error: 'Your account does not have a farm yet. Choose "Create account", enter your farm details and use the same email and password to finish setting up.',
    };
  }
  if (account.state === 'signed_out') return { success: false, confirmationRequired: true };
  return { success: false, error: 'Account service unavailable. Please try again.' };
}

const friendly = (error: { message?: string; status?: number } | null | undefined, fallback: string) =>
  error?.status === 429 ? 'Too many attempts. Please wait a few minutes and try again.' : fallback;

export const SecureAuth = {
  user: () => activeUser,
  inviteRequired: () => inviteNeeded,
  async initialize() {
    // Preserve the legacy profile mapping for import; never keep its plaintext passwords.
    let backendStatus: { configured: boolean };
    try {
      const response = await fetch('/api/backend-status', { cache: 'no-store' });
      const body = response.ok ? await response.json() : null;
      backendStatus = body ?? { configured: false };
      inviteNeeded = Boolean(body?.inviteRequired);
      backendProblem = !response.ok
        ? `the status check returned HTTP ${response.status}`
        : body?.configured ? 'configured' : `the server reports it is not configured${body?.missing?.length ? `, missing ${body.missing.join(', ')}` : ''}`;
      if (backendStatus.configured) localStorage.setItem(backendKey, 'true');
      else localStorage.removeItem(backendKey);
    } catch {
      backendStatus = { configured: localStorage.getItem(backendKey) === 'true' };
      backendProblem = 'the status check could not reach the server';
    }
    secureBackend = backendStatus.configured;
    CloudStore.configure(secureBackend);
    if (!secureBackend) {
      activeUser = null;
      if (sessionStorage.getItem(demoKey) === 'true') this.demo();
      return;
    }
    const legacy = localStorage.getItem('mylkio_accounts');
    if (legacy) {
      try {
        const accounts = JSON.parse(legacy);
        if (Array.isArray(accounts)) localStorage.setItem('mylkio_legacy_profiles_v1', JSON.stringify(accounts.map(({ password: _discard, ...profile }) => profile)));
      } catch { /* Preserve invalid migration data for manual recovery. */ }
      localStorage.removeItem('mylkio_accounts');
    }
    // Only the demo session is local. A saved farmer/admin object is never trusted.
    localStorage.removeItem('mylkio_active_user');
    let account: AccountResponse;
    try { account = await fetchAccount(); }
    catch {
      const cached = localStorage.getItem(cachedAccountKey);
      if (!cached) throw new Error('Connect once to confirm your account on this device.');
      try {
        const user = JSON.parse(cached) as UserAccount;
        if (!user.id || !user.farmId || user.role === 'super_admin') throw new Error('Invalid cached account');
        await CloudStore.load(user.id, user.farmId);
        activeUser = user;
        window.dispatchEvent(new Event('mylkio_auth_changed'));
        return;
      } catch (error) {
        if (error instanceof Error) throw error;
        throw new Error('Could not open the saved offline farm.');
      }
    }
    if (account.state === 'account') { await activate(account.user); return; }
    if (account.state === 'onboarding') {
      const pending = readPending();
      if (pending) { const done = await completeOnboarding(pending); if (done.success) return; }
    } else if (account.state === 'unavailable') {
      throw new Error('Could not check your session. Please retry.');
    }
    activeUser = null;
    if (sessionStorage.getItem(demoKey) === 'true') this.demo();
  },
  async login(email: string, password: string): Promise<AuthResult> {
    if (!secureBackend) return { success: false, error: unavailable() };
    const { error } = await attempt(() => neonClient().signIn.email({ email, password }));
    if (error) return { success: false, error: friendly(error, 'Sign-in failed. Check your email and password.') };
    const result = await finishSession();
    if (result.confirmationRequired) return { success: false, error: 'Please confirm your email address first, then sign in.' };
    return result;
  },
  async register(input: SignUpDetails): Promise<AuthResult> {
    if (!secureBackend) return { success: false, error: unavailable() };
    const { email, password, ...details } = input;
    if (inviteNeeded && !details.inviteCode?.trim()) return { success: false, error: 'Enter the invitation code you were given.' };
    // Kept on this device (no password) so the farm is created as soon as the account has a session.
    localStorage.setItem(pendingKey, JSON.stringify(details));
    const created = await attempt(() => neonClient().signUp.email({ email, password, name: input.name }));
    if (created.error) {
      // The account may already exist from an earlier attempt that never finished setting up its farm.
      const resumed = await attempt(() => neonClient().signIn.email({ email, password }));
      if (resumed.error) {
        localStorage.removeItem(pendingKey);
        return { success: false, error: friendly(created.error, 'Could not create the account. If you already have one, sign in instead.') };
      }
    }
    return finishSession();
  },
  demo() {
    CloudStore.clear();
    activeUser = structuredClone(initialAccounts.find(a => a.id === 'usr-demo-01')!);
    activeUser.farmId = 'farm-green-hills';
    sessionStorage.setItem(demoKey, 'true');
    window.dispatchEvent(new Event('mylkio_auth_changed'));
    return activeUser;
  },
  async logout() {
    // A demo may have been opened while a real server session still exists.
    if (secureBackend) {
      const { error } = await attempt(() => neonClient().signOut());
      if (error && activeUser?.id !== 'usr-demo-01') throw new Error('Could not sign out. Please retry.');
    }
    sessionStorage.removeItem(demoKey);
    localStorage.removeItem(cachedAccountKey);
    activeUser = null; CloudStore.clear();
    window.dispatchEvent(new Event('mylkio_auth_changed'));
  },
};
