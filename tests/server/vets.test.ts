import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { freshDatabase, signUp } from '../db/harness';
import {
  addMyVet, adminListVets, adminSaveVet, adminSetVetStatus, listMyVets, removeMyVet, suggestVet, vetDirectory,
  type Db, type VetSuggestion,
} from '@/lib/server/farm-api';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });

const suggestion = (over: Partial<VetSuggestion> = {}): VetSuggestion => ({
  name: 'Dr Wanjiru Njoroge', kind: 'veterinarian', county: 'Nairobi', areas: 'Kabete, Dagoretti, Kangemi',
  phone: '0712 345 678', whatsapp: true, emergency: true, hours: 'Daily 6am to 8pm', kvbRegNo: 'V-1234', ...over,
});
const today = () => new Date().toISOString().slice(0, 10);
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

let pg: PGlite;
let db: Db;
let aminaFarm: string;
let barakaFarm: string;

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  aminaFarm = await signUp(pg, 'amina', 'Green Hills');
  barakaFarm = await signUp(pg, 'baraka', 'Baraka Farm');
  await pg.query(`insert into public.profiles(id, email, name, role) values ('admin_1', 'admin@example.test', 'Admin', 'super_admin'), ('no_farm', 'nf@example.test', 'No Farm', 'farmer')`);
}, 60_000);

describe("a farm's own vets", () => {
  it('saves a vet and lists it for that farm only', async () => {
    const id = await addMyVet(db, 'amina', aminaFarm, { name: 'Dr Otieno', kind: 'veterinarian', phone: '0722 111 222', notes: 'Treated Amani last year' });
    const mine = await listMyVets(db, 'amina', aminaFarm);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id, name: 'Dr Otieno', kind: 'veterinarian', phone: '0722 111 222', notes: 'Treated Amani last year' });
    expect(await listMyVets(db, 'baraka', barakaFarm)).toEqual([]);
  });

  it('refuses anyone who is not a member of the farm', async () => {
    await expect(listMyVets(db, 'baraka', aminaFarm)).rejects.toMatchObject({ status: 403 });
    await expect(addMyVet(db, 'baraka', aminaFarm, { name: 'Intruder', kind: 'agrovet', phone: '0700 000 000' })).rejects.toMatchObject({ status: 403 });
    await expect(removeMyVet(db, 'baraka', aminaFarm, '00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({ status: 403 });
    await expect(listMyVets(db, 'nobody', aminaFarm)).rejects.toMatchObject({ status: 403 });
  });

  it('treats the same number written differently as the same contact', async () => {
    const first = await addMyVet(db, 'amina', aminaFarm, { name: 'Co-op vet', kind: 'co_op_vet', phone: '0733 444 555' });
    const again = await addMyVet(db, 'amina', aminaFarm, { name: 'Co-op vet (again)', kind: 'co_op_vet', phone: '+254 733-444-555' });
    expect(again).toBe(first);
    expect((await listMyVets(db, 'amina', aminaFarm)).filter((v) => v.phone.replace(/\D/g, '').endsWith('733444555'))).toHaveLength(1);
  });

  it('refuses a name, kind or phone that is not usable', async () => {
    await expect(addMyVet(db, 'amina', aminaFarm, { name: ' ', kind: 'veterinarian', phone: '0722 000 111' })).rejects.toMatchObject({ status: 400 });
    await expect(addMyVet(db, 'amina', aminaFarm, { name: 'Dr X', kind: 'wizard' as never, phone: '0722 000 111' })).rejects.toMatchObject({ status: 400 });
    await expect(addMyVet(db, 'amina', aminaFarm, { name: 'Dr X', kind: 'veterinarian', phone: '123' })).rejects.toMatchObject({ status: 400 });
  });

  it('allows ten contacts and no more', async () => {
    const have = (await listMyVets(db, 'baraka', barakaFarm)).length;
    for (let i = have; i < 10; i++) await addMyVet(db, 'baraka', barakaFarm, { name: `Vet ${i}`, kind: 'agrovet', phone: `07${String(10000000 + i)}` });
    await expect(addMyVet(db, 'baraka', barakaFarm, { name: 'One too many', kind: 'agrovet', phone: '0799 999 999' })).rejects.toMatchObject({ status: 400 });
  });

  it('removes a contact, and removing it twice is harmless', async () => {
    const id = await addMyVet(db, 'amina', aminaFarm, { name: 'Temporary', kind: 'clinic', phone: '0744 555 666' });
    await removeMyVet(db, 'amina', aminaFarm, id);
    await removeMyVet(db, 'amina', aminaFarm, id);
    expect((await listMyVets(db, 'amina', aminaFarm)).map((v) => v.id)).not.toContain(id);
  });

  it('does not let another farm remove a contact by guessing its id', async () => {
    const id = await addMyVet(db, 'amina', aminaFarm, { name: 'Keep me', kind: 'clinic', phone: '0755 666 777' });
    await removeMyVet(db, 'baraka', barakaFarm, id); // their own farm: no effect on Amina's row
    expect((await listMyVets(db, 'amina', aminaFarm)).map((v) => v.id)).toContain(id);
  });
});

describe('suggesting a vet for the shared directory', () => {
  it('keeps a suggestion hidden until an administrator confirms it', async () => {
    const id = await suggestVet(db, 'amina', suggestion());
    expect(await vetDirectory(db, 'baraka', 'Nairobi')).toEqual([]);
    const pending = await adminListVets(db, 'admin_1', 'pending');
    expect(pending.find((v) => v.id === id)).toMatchObject({ status: 'pending', source: 'farmer', submitted_by_name: 'Test Farmer', confirmed_on: null });
  });

  it('returns the existing entry when the same number is suggested again', async () => {
    const first = await suggestVet(db, 'amina', suggestion({ phone: '0788 000 111', name: 'Dr Mwangi' }));
    const second = await suggestVet(db, 'baraka', suggestion({ phone: '+254 788 000 111', name: 'Dr Mwangi (again)' }));
    expect(second).toBe(first);
  });

  it('refuses an account with no farm, and details that are not usable', async () => {
    await expect(suggestVet(db, 'no_farm', suggestion({ phone: '0701 000 001' }))).rejects.toMatchObject({ status: 403 });
    await expect(suggestVet(db, 'nobody', suggestion({ phone: '0701 000 002' }))).rejects.toMatchObject({ status: 403 });
    await expect(suggestVet(db, 'amina', suggestion({ name: 'x', phone: '0701 000 003' }))).rejects.toMatchObject({ status: 400 });
    await expect(suggestVet(db, 'amina', suggestion({ county: '', phone: '0701 000 004' }))).rejects.toMatchObject({ status: 400 });
    await expect(suggestVet(db, 'amina', suggestion({ phone: '12', name: 'Dr Short' }))).rejects.toMatchObject({ status: 400 });
    await expect(suggestVet(db, 'amina', suggestion({ kind: 'wizard' as never, phone: '0701 000 005' }))).rejects.toMatchObject({ status: 400 });
  });

  it('allows five new suggestions a day from one account', async () => {
    await pg.query(`delete from public.vet_providers where submitted_by = 'baraka'`);
    for (let i = 0; i < 5; i++) await suggestVet(db, 'baraka', suggestion({ phone: `0710 000 10${i}`, name: `Dr Number ${i}` }));
    await expect(suggestVet(db, 'baraka', suggestion({ phone: '0710 000 199', name: 'Dr Too Many' }))).rejects.toMatchObject({ status: 429 });
    // A repeat of an existing number is not a new suggestion, so it still answers.
    await expect(suggestVet(db, 'baraka', suggestion({ phone: '0710 000 100', name: 'Dr Number 0' }))).resolves.toBeTruthy();
  });
});

describe('the administrator confirms entries', () => {
  // These tests make many suggestions from one account; move earlier ones out of the 24-hour window.
  beforeEach(async () => {
    await pg.query(`update public.vet_providers set created_at = now() - interval '3 days' where submitted_by is not null`);
  });

  it('is for administrators only', async () => {
    await expect(adminListVets(db, 'amina')).rejects.toMatchObject({ status: 403 });
    await expect(adminSaveVet(db, 'amina', null, { ...suggestion({ phone: '0720 000 001' }), status: 'confirmed', confirmedOn: today() })).rejects.toMatchObject({ status: 403 });
    await expect(adminSetVetStatus(db, 'amina', '00000000-0000-0000-0000-000000000000', 'hidden')).rejects.toMatchObject({ status: 403 });
  });

  it('needs the day the number was rung, and not a future day', async () => {
    const id = await suggestVet(db, 'amina', suggestion({ phone: '0720 000 002', name: 'Dr Confirmable' }));
    await expect(adminSetVetStatus(db, 'admin_1', id, 'confirmed')).rejects.toMatchObject({ status: 400 });
    await expect(adminSetVetStatus(db, 'admin_1', id, 'confirmed', tomorrow())).rejects.toMatchObject({ status: 400 });
    await expect(adminSetVetStatus(db, 'admin_1', id, 'nonsense' as never, today())).rejects.toMatchObject({ status: 400 });
  });

  it('shows a confirmed entry in its county only, with the day it was confirmed', async () => {
    const id = await suggestVet(db, 'amina', suggestion({ phone: '0720 000 003', name: 'Dr Shown', emergency: false }));
    await adminSetVetStatus(db, 'admin_1', id, 'confirmed', today());
    const nairobi = await vetDirectory(db, 'baraka', ' nairobi ');
    const shown = nairobi.find((v) => v.id === id);
    expect(shown).toMatchObject({ name: 'Dr Shown', county: 'Nairobi', confirmed_on: today(), kvb_reg_no: 'V-1234' });
    expect(shown).not.toHaveProperty('submitted_by');
    expect(await vetDirectory(db, 'baraka', 'Nakuru')).toEqual([]);
  });

  it('lists emergency call-outs first', async () => {
    const calm = await suggestVet(db, 'amina', suggestion({ phone: '0720 000 004', name: 'Aaa Not Emergency', emergency: false }));
    const urgent = await suggestVet(db, 'amina', suggestion({ phone: '0720 000 005', name: 'Zzz Emergency', emergency: true }));
    await adminSetVetStatus(db, 'admin_1', calm, 'confirmed', today());
    await adminSetVetStatus(db, 'admin_1', urgent, 'confirmed', today());
    const names = (await vetDirectory(db, 'baraka', 'Nairobi')).map((v) => v.name);
    expect(names.indexOf('Zzz Emergency')).toBeLessThan(names.indexOf('Aaa Not Emergency'));
  });

  it('stops showing an entry once it is rejected or hidden, and lets the number be suggested again after a rejection', async () => {
    const id = await suggestVet(db, 'amina', suggestion({ phone: '0720 000 006', name: 'Dr Rejected' }));
    await adminSetVetStatus(db, 'admin_1', id, 'confirmed', today());
    expect((await vetDirectory(db, 'baraka', 'Nairobi')).map((v) => v.id)).toContain(id);
    await adminSetVetStatus(db, 'admin_1', id, 'hidden');
    expect((await vetDirectory(db, 'baraka', 'Nairobi')).map((v) => v.id)).not.toContain(id);
    await adminSetVetStatus(db, 'admin_1', id, 'rejected');
    const again = await suggestVet(db, 'amina', suggestion({ phone: '0720 000 006', name: 'Dr Rejected, resubmitted' }));
    expect(again).not.toBe(id);
  });

  it('adds an entry directly, confirmed, and can edit it', async () => {
    const id = await adminSaveVet(db, 'admin_1', null, { ...suggestion({ phone: '0730 000 001', name: 'Dr Added By Admin' }), status: 'confirmed', confirmedOn: today() });
    expect((await vetDirectory(db, 'amina', 'Nairobi')).find((v) => v.id === id)).toMatchObject({ name: 'Dr Added By Admin' });
    await adminSaveVet(db, 'admin_1', id, { ...suggestion({ phone: '0730 000 001', name: 'Dr Renamed' }), status: 'confirmed', confirmedOn: today() });
    expect((await vetDirectory(db, 'amina', 'Nairobi')).find((v) => v.id === id)?.name).toBe('Dr Renamed');
    expect((await adminListVets(db, 'admin_1')).find((v) => v.id === id)).toMatchObject({ source: 'admin', submitted_by_name: null });
    await expect(adminSaveVet(db, 'admin_1', '00000000-0000-0000-0000-000000000000', { ...suggestion({ phone: '0730 000 002' }), status: 'pending' })).rejects.toMatchObject({ status: 400 });
  });

  it('refuses a second live entry for the same number', async () => {
    await adminSaveVet(db, 'admin_1', null, { ...suggestion({ phone: '0730 000 003', name: 'Dr First' }), status: 'confirmed', confirmedOn: today() });
    await expect(adminSaveVet(db, 'admin_1', null, { ...suggestion({ phone: '+254 730 000 003', name: 'Dr Second' }), status: 'pending' })).rejects.toMatchObject({ status: 409 });
  });

  it('shows the directory to any signed-in account but not to a stranger', async () => {
    await expect(vetDirectory(db, 'nobody', 'Nairobi')).rejects.toMatchObject({ status: 403 });
    await expect(vetDirectory(db, 'amina', 'Nairobi')).resolves.toBeInstanceOf(Array);
  });
});
