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

async function run<T>(
  db: Db, text: string, params: unknown[],
  denied = 'You do not have access to this farm.',
  tooMany = 'Too many messages in a short time. Please try again later, or contact us on WhatsApp.',
  duplicate = 'That phone number is already listed.',
): Promise<T[]> {
  try {
    return await db.query<T>(text, params);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === '42501') throw new ApiError(403, denied);
    if (code === '22023') throw new ApiError(400, 'Some records or fields could not be accepted.');
    if (code === '23505') throw new ApiError(409, duplicate);
    if (code === 'MY429') throw new ApiError(429, tooMany);
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

/** Notes that this account just made a request. Best effort: usage figures must never break a real request. */
export async function recordActivity(db: Db, userId: string): Promise<void> {
  try {
    await db.query('select public.touch_activity($1)', [userId]);
  } catch {
    /* Activity is informational only. */
  }
}

export interface UsageSummary {
  asAt: string;
  accounts: number;
  activeNow: number;
  active24h: number;
  active7d: number;
  active30d: number;
  activeUsers: { id: string; seenAt: string }[];
  byStatus: Record<string, number>;
  byPlan: Record<string, number>;
  monthlyValueKsh: number;
  signups: { day: string; count: number }[];
}

/** Platform usage as at a moment (default now). Administrators only. */
export async function adminUsage(db: Db, actor: string, at?: string): Promise<UsageSummary> {
  const [row] = await run<{ usage: UsageSummary }>(db, 'select public.admin_usage($1, $2::timestamptz) as usage', [actor, at ?? null], 'Administrator access required.');
  return row.usage;
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

// ───────────── Vets and animal health workers ─────────────

export type VetKind = 'veterinarian' | 'animal_health_assistant' | 'co_op_vet' | 'agrovet' | 'clinic';
export type VetStatus = 'pending' | 'confirmed' | 'rejected' | 'hidden';

/** A contact a farm saved for itself. */
export interface MyVet { id: string; name: string; kind: VetKind; phone: string; notes: string | null; created_at: string }

/** A confirmed entry in the shared directory. `confirmed_on` is the day someone rang the number. */
export interface DirectoryVet {
  id: string; name: string; kind: VetKind; county: string; areas: string | null; phone: string; whatsapp: boolean;
  emergency: boolean; hours: string | null; kvb_reg_no: string | null; notes: string | null; confirmed_on: string;
}

export interface MyVetInput { name: string; kind: VetKind; phone: string; notes?: string }
export interface VetSuggestion {
  name: string; kind: VetKind; county: string; areas?: string; phone: string; whatsapp?: boolean; emergency?: boolean;
  hours?: string; kvbRegNo?: string; notes?: string;
}
export interface AdminVet extends Omit<DirectoryVet, 'confirmed_on'> { status: VetStatus; confirmed_on: string | null; source: 'admin' | 'farmer'; submitted_by_name: string | null; created_at: string }

const VET_COLUMNS = 'id, name, kind, county, areas, phone, whatsapp, emergency, hours, kvb_reg_no, notes';

export async function listMyVets(db: Db, actor: string, farmId: string): Promise<MyVet[]> {
  return run<MyVet>(db, 'select id, name, kind, phone, notes, created_at::text as created_at from public.list_my_vets($1, $2)', [actor, farmId]);
}

export async function addMyVet(db: Db, actor: string, farmId: string, vet: MyVetInput): Promise<string> {
  const [row] = await run<{ id: string }>(db, 'select public.add_my_vet($1, $2, $3, $4, $5, $6) as id', [actor, farmId, vet.name, vet.kind, vet.phone, vet.notes ?? null]);
  return row.id;
}

export async function removeMyVet(db: Db, actor: string, farmId: string, id: string): Promise<void> {
  await run(db, 'select public.remove_my_vet($1, $2, $3)', [actor, farmId, id]);
}

/** Confirmed vets in a county. The route decides who may call this (Farm Pro). */
export async function vetDirectory(db: Db, actor: string, county: string): Promise<DirectoryVet[]> {
  return run<DirectoryVet>(db, `select ${VET_COLUMNS}, confirmed_on::text as confirmed_on from public.list_vet_directory($1, $2)`, [actor, county]);
}

/** A farmer suggests a vet. It stays hidden until an administrator rings the number and confirms it. */
export async function suggestVet(db: Db, actor: string, s: VetSuggestion): Promise<string> {
  const [row] = await run<{ id: string }>(
    db, 'select public.suggest_vet($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) as id',
    [actor, s.name, s.kind, s.county, s.areas ?? null, s.phone, s.whatsapp ?? false, s.emergency ?? false, s.hours ?? null, s.kvbRegNo ?? null, s.notes ?? null],
    'A farm account is needed to suggest a vet.',
    'You have suggested several vets today. Please try again tomorrow.',
  );
  return row.id;
}

export async function adminListVets(db: Db, actor: string, status?: VetStatus): Promise<AdminVet[]> {
  return run<AdminVet>(
    db, `select ${VET_COLUMNS}, status, confirmed_on::text as confirmed_on, source, submitted_by_name, created_at::text as created_at from public.admin_list_vets($1, $2)`,
    [actor, status ?? null], 'Administrator access required.',
  );
}

export async function adminSaveVet(
  db: Db, actor: string, id: string | null, v: VetSuggestion & { status: VetStatus; confirmedOn?: string | null },
): Promise<string> {
  const [row] = await run<{ id: string }>(
    db, 'select public.admin_save_vet($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::date) as id',
    [actor, id, v.name, v.kind, v.county, v.areas ?? null, v.phone, v.whatsapp ?? false, v.emergency ?? false, v.hours ?? null, v.kvbRegNo ?? null, v.notes ?? null, v.status, v.confirmedOn ?? null],
    'Administrator access required.',
  );
  return row.id;
}

export async function adminSetVetStatus(db: Db, actor: string, id: string, status: VetStatus, confirmedOn?: string | null): Promise<void> {
  await run(db, 'select public.admin_set_vet_status($1, $2, $3, $4::date)', [actor, id, status, confirmedOn ?? null], 'Administrator access required.');
}

// ---- Commercial administration (migration 0006). Administrators only; the database re-checks. ----

const ADMIN_ONLY = 'Administrator access required.';

export type PaymentMethod = 'mpesa' | 'cash' | 'bank' | 'other';

export interface SubscriptionPayment {
  id: string; amount_ksh: number; method: PaymentMethod; reference: string; paid_on: string; months: number; plan: string;
  period_from: string; period_to: string; recorded_by_name: string | null; created_at: string; voided_at: string | null; void_reason: string | null;
}
export interface AccountNote { id: string; body: string; author_name: string | null; created_at: string }
export interface Collections { months: { month: string; amountKsh: number; payments: number }[] }

export async function adminRecordPayment(
  db: Db, actor: string, farmId: string,
  input: { amountKsh: number; method: PaymentMethod; reference: string; paidOn: string; months: number },
): Promise<{ id: string; periodFrom: string; periodTo: string }> {
  const [row] = await run<{ result: { id: string; periodFrom: string; periodTo: string } }>(
    db, 'select public.admin_record_payment($1, $2, $3, $4, $5, $6::date, $7) as result',
    [actor, farmId, input.amountKsh, input.method, input.reference, input.paidOn, input.months],
    ADMIN_ONLY, undefined, 'That M-Pesa or bank reference has already been recorded.',
  );
  return row.result;
}

export async function adminVoidPayment(db: Db, actor: string, paymentId: string, reason: string): Promise<void> {
  await run(db, 'select public.admin_void_payment($1, $2, $3)', [actor, paymentId, reason], ADMIN_ONLY);
}

export async function adminListPayments(db: Db, actor: string, farmId: string): Promise<SubscriptionPayment[]> {
  return run<SubscriptionPayment>(db, 'select id, amount_ksh, method, reference, paid_on::text, months, plan, period_from::text, period_to::text, recorded_by_name, created_at, voided_at, void_reason from public.admin_list_payments($1, $2)', [actor, farmId], ADMIN_ONLY);
}

export async function adminAddNote(db: Db, actor: string, farmId: string, body: string): Promise<string> {
  const [row] = await run<{ id: string }>(db, 'select public.admin_add_note($1, $2, $3) as id', [actor, farmId, body], ADMIN_ONLY);
  return row.id;
}

export async function adminListNotes(db: Db, actor: string, farmId: string): Promise<AccountNote[]> {
  return run<AccountNote>(db, 'select * from public.admin_list_notes($1, $2)', [actor, farmId], ADMIN_ONLY);
}

export async function adminCollections(db: Db, actor: string): Promise<Collections> {
  const [row] = await run<{ result: Collections }>(db, 'select public.admin_collections($1) as result', [actor], ADMIN_ONLY);
  return row.result;
}
