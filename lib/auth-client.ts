'use client';

import type { UserAccount, SubscriptionPlan } from '@/types';
import { initialAccounts } from './mock-data';
import { CloudStore } from './cloud-store';

let activeUser: UserAccount | null = null;
const demoKey = 'mylkio_demo_session_v2';
const cachedAccountKey = 'mylkio_last_secure_account_v2';
const backendKey = 'mylkio_secure_backend_enabled_v1';
let secureBackend = false;
export type AuthResult = { success: boolean; user?: UserAccount; error?: string; confirmationRequired?: boolean };
async function post(action: string, data: unknown): Promise<AuthResult> {
  const response = await fetch(`/api/auth/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) return { success: false, error: result.error || 'Account service unavailable.' };
  if (result.user) await activate(result.user);
  return result;
}
async function activate(user: UserAccount) {
  if (user.role !== 'super_admin') await CloudStore.load(user.id, user.farmId);
  else CloudStore.clear();
  localStorage.setItem(cachedAccountKey, JSON.stringify({ id: user.id, email: user.email, role: user.role, farmId: user.farmId, name: user.name, phone: user.phone, createdAt: user.createdAt, subscription: user.subscription }));
  sessionStorage.removeItem(demoKey);
  activeUser = user;
  window.dispatchEvent(new Event('mylkio_auth_changed'));
}

export const SecureAuth = {
  user: () => activeUser,
  async initialize() {
    // Preserve the legacy profile mapping for import; never keep its plaintext passwords.
    let backendStatus: { configured: boolean };
    try {
      const response = await fetch('/api/backend-status', { cache: 'no-store' });
      backendStatus = response.ok ? await response.json() : { configured: false };
      if (backendStatus.configured) localStorage.setItem(backendKey, 'true');
      else localStorage.removeItem(backendKey);
    } catch {
      backendStatus = { configured: localStorage.getItem(backendKey) === 'true' };
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
    let response: Response;
    try { response = await fetch('/api/auth/session', { cache: 'no-store' }); }
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
    if (response.ok) { await activate((await response.json()).user); return; }
    if (response.status !== 401 && response.status !== 503) throw new Error('Could not check your session. Please retry.');
    activeUser = null;
    if (sessionStorage.getItem(demoKey) === 'true') this.demo();
  },
  async login(email: string, password: string) {
    if (!secureBackend) return { success: false, error: 'Farmer accounts are not set up yet. Explore the demo farm while cloud accounts are configured.' };
    return post('login', { email, password });
  },
  async register(input: { name: string; email: string; password: string; phone: string; farmName: string; county: string; subCounty?: string; plan?: SubscriptionPlan; language?: string }) {
    if (!secureBackend) return { success: false, error: 'Farmer accounts are not set up yet. Explore the demo farm while cloud accounts are configured.' };
    return post('signup', input);
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
    const result = secureBackend ? await post('logout', {}) : { success: true };
    if (!result.success && activeUser?.id !== 'usr-demo-01') throw new Error(result.error || 'Could not sign out.');
    sessionStorage.removeItem(demoKey);
    localStorage.removeItem(cachedAccountKey);
    activeUser = null; CloudStore.clear();
    window.dispatchEvent(new Event('mylkio_auth_changed'));
  },
};
