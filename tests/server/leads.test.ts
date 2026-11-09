import { beforeAll, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { freshDatabase } from '../db/harness';
import { adminListLeads, adminSetLeadStatus, submitLead, type Db, type LeadInput } from '@/lib/server/farm-api';

const asDb = (pg: PGlite): Db => ({ query: async (text, params) => (await pg.query(text, params as never)).rows as never });
const lead = (over: Partial<LeadInput> = {}): LeadInput => ({
  name: 'Mary Wanjiku', phone: '0712 345 678', county: 'Nakuru', cowsCount: 8, preferredContact: 'whatsapp',
  message: 'I would like a demo', source: 'Website Contact Section', ...over,
});

let pg: PGlite;
let db: Db;

beforeAll(async () => {
  pg = await freshDatabase();
  db = asDb(pg);
  await pg.query(`insert into public.profiles(id, email, name, role) values ('admin_1','admin@example.test','Admin','super_admin'), ('farmer_1','f@example.test','Farmer','farmer')`);
}, 60_000);

describe('website leads', () => {
  it('stores an enquiry from a visitor who is not signed in', async () => {
    await submitLead(db, lead());
    const { rows } = await pg.query<{ name: string; phone: string; status: string; preferred_contact: string }>('select * from public.leads');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Mary Wanjiku', phone: '0712 345 678', status: 'new', preferred_contact: 'whatsapp' });
  });

  it('refuses a name or phone number that is not usable', async () => {
    await expect(submitLead(db, lead({ name: '   ' }))).rejects.toMatchObject({ status: 400 });
    await expect(submitLead(db, lead({ phone: '12' }))).rejects.toMatchObject({ status: 400 });
    await expect(submitLead(db, lead({ phone: 'no digits here' }))).rejects.toMatchObject({ status: 400 });
  });

  it('limits one number to three enquiries an hour, however it is written', async () => {
    const phone = '0799 000 111';
    await submitLead(db, lead({ phone }));
    await submitLead(db, lead({ phone: '0799000111' }));
    await submitLead(db, lead({ phone: '+254 799-000-111'.replace('+254 ', '0') }));
    await expect(submitLead(db, lead({ phone: '0799000111' }))).rejects.toMatchObject({ status: 429 });
    // Another number is unaffected.
    await submitLead(db, lead({ phone: '0733 222 111' }));
  });

  it('shows leads only to administrators', async () => {
    await expect(adminListLeads(db, 'farmer_1')).rejects.toMatchObject({ status: 403 });
    await expect(adminListLeads(db, 'nobody')).rejects.toMatchObject({ status: 403 });
    const leads = await adminListLeads(db, 'admin_1');
    expect(leads.length).toBeGreaterThanOrEqual(5);
  });

  it('lets an administrator update a lead and refuses others or bad statuses', async () => {
    const [first] = (await adminListLeads(db, 'admin_1')) as { id: string }[];
    await adminSetLeadStatus(db, 'admin_1', first.id, 'contacted');
    const { rows } = await pg.query<{ status: string }>('select status from public.leads where id = $1', [first.id]);
    expect(rows[0].status).toBe('contacted');
    await expect(adminSetLeadStatus(db, 'farmer_1', first.id, 'archived')).rejects.toMatchObject({ status: 403 });
    await expect(adminSetLeadStatus(db, 'admin_1', first.id, 'deleted')).rejects.toMatchObject({ status: 400 });
    await expect(adminSetLeadStatus(db, 'admin_1', '00000000-0000-4000-8000-000000000000', 'new')).rejects.toMatchObject({ status: 400 });
  });
});
