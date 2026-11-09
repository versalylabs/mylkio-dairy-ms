// Database operations behind the API routes. Deliberately free of Next.js and Neon Auth
// imports so tests can run them against an in-memory Postgres.
//
// Authorization model: the route verifies the Neon Auth session and passes the user id
// as `actor`. These functions hand it to SQL functions that re-check farm membership, so
// a bug in a route cannot expose another farm's records.

import type { UserAccount } from '@/types';
import { CHANGES_PAGE_SIZE, type BucketName, type GroupResult, type RecordChange, type RecordOperation } from '@/lib/backend-contract';
import { ApiError } from './errors';

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface OnboardingInput {
  name: string;
  phone: string;
  farmName: string;
  county: string;
  subCounty?: string;
  plan: 'starter' | 'farmer' | 'farm_pro';
  language: 'en' | 'sw';
}

async function run<T>(db: Db, text: string, params: unknown[], denied = 'You do not have access to this farm.'): Promise<T[]> {
  try {
    return await db.query<T>(text, params);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === '42501') throw new ApiError(403, denied);
    if (code === '22023') throw new ApiError(400, 'Some records or fields could not be accepted.');
    if (code === 'MY429') throw new ApiError(429, 'Too many messages in a short time. Please try again later, or contact us on WhatsApp.');
    throw error;
  }
}

export async function getAccount(db: Db, userId: string): Promise<UserAccount | null> {
  const [row] = await run<{ account: Record<string, unknown> | null }>(db, 'select public.get_account($1) as account', [userId]);
  const a = row?.account;
  if (!a) return null;
  return {
    id: String(a.id),
    email: String(a.email),
    role: a.role as UserAccount['role'],
    farmId: a.farmId ? String(a.farmId) : '',
    name: String(a.name),
    phone: String(a.phone ?? ''),
    createdAt: String(a.createdAt),
    subscription: (a.subscription as UserAccount['subscription'] | null) ?? {
      plan: 'admin', status: 'active', monthlyPriceKsh: 0, startDate: String(a.createdAt), renewsAt: String(a.createdAt),
    },
  };
}

/** Creates the user's farm on first sign-in. Safe to repeat: an existing farm is returned. */
export async function onboard(db: Db, user: SessionUser, input: OnboardingInput): Promise<UserAccount> {
  if (!user.email) throw new ApiError(400, 'Your account has no email address.');
  await run(db, 'select public.provision_farm($1, $2, $3, $4, $5, $6, $7, $8, $9)', [
    user.id, user.email, input.name, input.phone, input.farmName, input.county, input.subCounty ?? null, input.plan, input.language,
  ]);
  const account = await getAccount(db, user.id);
  if (!account) throw new ApiError(503, 'Your farm account could not be prepared. Please contact support.');
  return account;
}

export async function applyOperations(db: Db, actor: string, farmId: string, operations: RecordOperation[]): Promise<GroupResult[]> {
  const [row] = await run<{ result: GroupResult[] }>(
    db, 'select public.apply_farm_operations($1, $2, $3::jsonb) as result',
    [farmId, actor, JSON.stringify(operations)],
    'You do not have permission to change this farm.',
  );
  return row.result;
}

export async function farmChanges(db: Db, actor: string, farmId: string, since: number) {
  const rows = await run<{ bucket: BucketName; id: string; version: string | number; change_seq: string | number; deleted: boolean; data: Record<string, unknown> }>(
    db, 'select * from public.farm_changes($1, $2, $3, $4)', [farmId, actor, since, CHANGES_PAGE_SIZE],
  );
  const changes: RecordChange[] = rows.map((r) => ({
    bucket: r.bucket, id: r.id, version: Number(r.version), seq: Number(r.change_seq), deleted: r.deleted, data: r.data,
  }));
  return {
    changes,
    cursor: changes.length ? changes[changes.length - 1].seq : since,
    more: changes.length === CHANGES_PAGE_SIZE,
  };
}

export async function adminListAccounts(db: Db, actor: string) {
  return run(db, 'select * from public.admin_list_accounts($1)', [actor], 'Administrator access required.');
}

export async function adminUpdateSubscription(db: Db, actor: string, farmId: string, plan: string, status: string) {
  await run(db, 'select public.admin_update_subscription($1, $2, $3, $4)', [actor, farmId, plan, status], 'Administrator access required.');
}

export interface LeadInput {
  name: string;
  phone: string;
  county?: string;
  cowsCount?: number;
  preferredContact: 'whatsapp' | 'call' | 'sms';
  message?: string;
  source: string;
}

/** A website enquiry from a visitor who is not signed in. Rate-limited in SQL. */
export async function submitLead(db: Db, lead: LeadInput): Promise<void> {
  await run(db, 'select public.submit_lead($1, $2, $3, $4, $5, $6, $7)', [
    lead.name, lead.phone, lead.county ?? null, lead.cowsCount ?? null, lead.preferredContact, lead.message ?? null, lead.source,
  ]);
}

export async function adminListLeads(db: Db, actor: string) {
  return run(db, 'select * from public.admin_list_leads($1)', [actor], 'Administrator access required.');
}

export async function adminSetLeadStatus(db: Db, actor: string, leadId: string, status: string) {
  await run(db, 'select public.admin_set_lead_status($1, $2, $3)', [actor, leadId, status], 'Administrator access required.');
}
