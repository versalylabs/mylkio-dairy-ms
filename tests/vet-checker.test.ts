import { describe, expect, it } from 'vitest';
import { CONDITIONS, GENERAL_SOURCES } from '@/lib/vet/conditions';
import { RED_FLAGS, SIGNS } from '@/lib/vet/red-flags';
import { MAX_CONDITIONS_SHOWN, assess, summaryText, type CheckInput } from '@/lib/vet/checker';
import { COUNTY_CONTACTS, KVB_CONTACT, KVB_REGISTERS_URL, contactsFor } from '@/lib/vet/contacts';
import { DISCLAIMER_FULL, DISCLAIMER_SHORT } from '@/lib/vet/disclaimer';

const check = (signs: string[], extra: Partial<CheckInput> = {}) => assess({ signs, animal: 'adult', calved: 'no', ...extra });
const names = (signs: string[], extra: Partial<CheckInput> = {}) => check(signs, extra).conditions.map((m) => m.condition.id);

const conditionText = (c: (typeof CONDITIONS)[number]) => [c.name, c.summary, ...c.doNow, ...c.doNot, ...c.tellTheVet, c.lookAlikes ?? ''].join(' ');

describe('knowledge base content', () => {
  it('has unique ids and only uses real signs', () => {
    expect(new Set(CONDITIONS.map((c) => c.id)).size).toBe(CONDITIONS.length);
    const known = new Set(SIGNS.map((s) => s.id));
    for (const c of CONDITIONS) {
      for (const [sign, weight] of Object.entries(c.signs)) {
        expect(known.has(sign), `${c.id}: ${sign}`).toBe(true);
        expect([1, 2, 3], `${c.id}: ${sign}`).toContain(weight);
      }
      expect(c.keySigns.length, c.id).toBeGreaterThan(0);
      for (const key of c.keySigns) expect(Object.keys(c.signs), `${c.id} key ${key}`).toContain(key);
    }
  });

  it('cites a published source for every entry', () => {
    for (const c of CONDITIONS) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      for (const s of c.sources) {
        expect(s.publisher.length, c.id).toBeGreaterThan(2);
        expect(s.title.length, c.id).toBeGreaterThan(2);
        expect(s.url, c.id).toMatch(/^https:\/\/[^\s]+$/);
        expect(s.checkedOn, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
    for (const s of GENERAL_SOURCES) expect(s.url).toMatch(/^https:\/\//);
  });

  it('tells the farmer what to do and what to say to the vet, and to call a vet', () => {
    for (const c of CONDITIONS) {
      expect(c.doNow.length, c.id).toBeGreaterThan(0);
      expect(c.doNot.length, c.id).toBeGreaterThan(0);
      expect(c.tellTheVet.length, c.id).toBeGreaterThan(0);
      expect(c.doNow.join(' '), c.id).toMatch(/call (a|your) vet/i);
    }
  });

  it('never names a drug or a dose, and never calls milk safe', () => {
    const drugs = /\b(penicillin|penstrep|oxytetracycline|tetracycline|amoxicillin|streptomycin|ivermectin|albendazole|diclofenac|dexamethasone|flunixin|calcium borogluconate|oxytocin|buparvaquone|parvaquone|\d+\s?(ml|mg|cc|iu|litres?|g|kg)\b)/i;
    for (const c of CONDITIONS) {
      expect(conditionText(c), c.id).not.toMatch(drugs);
      expect(conditionText(c), c.id).not.toMatch(/milk (is|are|remains?) (safe|fine|ok)/i);
    }
  });

  it('never states a diagnosis as fact', () => {
    for (const c of CONDITIONS) {
      expect(conditionText(c), c.id).not.toMatch(/\b(she|he|it|the animal|your (cow|calf)) (has|have|is suffering from) (mastitis|bloat|east coast|foot-and-mouth|lumpy|pneumonia|milk fever|scours|brucellosis)/i);
    }
  });

  it('marks foot-and-mouth and lumpy skin disease as reportable, and abortion as a danger to people', () => {
    const byId = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]));
    expect(byId.fmd.notifiable).toBe(true);
    expect(byId.lsd.notifiable).toBe(true);
    expect(byId.abortion.humanRisk).toBe(true);
    expect(byId.abortion.doNow.join(' ')).toMatch(/gloves/i);
    expect(byId.abortion.doNot.join(' ')).toMatch(/unboiled milk/i);
    // The lumpy skin disease sources say it is not passed to people, and foot-and-mouth is not a danger to people.
    expect(byId.lsd.humanRisk).toBeUndefined();
    expect(byId.fmd.humanRisk).toBeUndefined();
  });

  it('does not contradict the red flags about urgency for the same disease', () => {
    const fmdFlag = RED_FLAGS.find((f) => f.id === 'fmd')!;
    const fmd = CONDITIONS.find((c) => c.id === 'fmd')!;
    expect(fmd.urgency).toBe(fmdFlag.urgency);
    const bloatFlag = RED_FLAGS.find((f) => f.id === 'bloat')!;
    expect(CONDITIONS.find((c) => c.id === 'bloat')!.urgency).toBe(bloatFlag.urgency);
  });
});

describe('the symptom checker', () => {
  it('gives nothing, and no all-clear, when nothing is ticked', () => {
    expect(check([])).toEqual({ redFlags: [], conditions: [], urgency: null, noClearMatch: false });
  });

  it('can reach every entry by ticking all of its signs', () => {
    for (const c of CONDITIONS) {
      const animal = c.animal === 'calf' ? 'calf' : 'adult';
      const result = check(Object.keys(c.signs), { animal, calved: 'within_3_days' });
      const found = result.conditions.find((m) => m.condition.id === c.id);
      // The most closely fitting entries are shown first, so very full tick lists can push one off the page.
      if (!found) expect(result.conditions.length, c.id).toBe(MAX_CONDITIONS_SHOWN);
      else expect(found.fit, c.id).toBe('close');
    }
  });

  it('matches mastitis from a hot hard udder and changed milk', () => {
    const both = check(['hot_hard_udder', 'abnormal_milk']);
    expect(both.conditions[0]).toMatchObject({ fit: 'close' });
    expect(both.conditions[0].condition.id).toBe('mastitis');
    expect(both.urgency).toBe('today');
    expect(check(['hot_hard_udder']).conditions[0]).toMatchObject({ fit: 'partial' });
  });

  it('matches a tick-borne disease from fever, swollen lumps and ticks', () => {
    const result = check(['swollen_nodes', 'high_fever_dull', 'ticks_many']);
    expect(result.conditions.map((m) => m.condition.id)).toContain('ecf');
    expect(result.urgency).toBe('today');
  });

  it('treats skin lumps as reportable lumpy skin disease and says so in the red flags too', () => {
    const result = check(['skin_nodules']);
    expect(result.redFlags.map((f) => f.id)).toContain('lsd');
    expect(result.conditions[0].condition).toMatchObject({ id: 'lsd', notifiable: true });
  });

  it('only suggests milk fever for a cow that calved recently, and only fits it closely within three days', () => {
    expect(names(['down_cannot_rise'], { calved: 'no' })).not.toContain('milk_fever');
    expect(check(['down_cannot_rise'], { calved: 'within_3_days' }).conditions.find((m) => m.condition.id === 'milk_fever')?.fit).toBe('close');
    expect(check(['down_cannot_rise'], { calved: 'within_2_weeks' }).conditions.find((m) => m.condition.id === 'milk_fever')?.fit).toBe('partial');
    // A down cow is an emergency whatever the cause.
    expect(check(['down_cannot_rise'], { calved: 'no' }).urgency).toBe('emergency');
  });

  it('flags bloat as an emergency', () => {
    const result = check(['swollen_left_flank']);
    expect(result.conditions[0].condition.id).toBe('bloat');
    expect(result.urgency).toBe('emergency');
  });

  it('treats sudden limping with swelling as a vet visit within a day or two', () => {
    const result = check(['lameness', 'swelling_above_hoof']);
    expect(result.conditions[0]).toMatchObject({ fit: 'close' });
    expect(result.conditions[0].condition.id).toBe('foot_rot');
    expect(result.urgency).toBe('soon');
  });

  it('keeps foot-and-mouth an emergency even when limping also fits foot rot', () => {
    const result = check(['blisters_feet', 'lameness']);
    expect(result.urgency).toBe('emergency');
    expect(result.redFlags.map((f) => f.id)).toContain('fmd');
    expect(result.conditions.map((m) => m.condition.id)).toEqual(expect.arrayContaining(['fmd', 'foot_rot']));
  });

  it('keeps calf problems for calves and adult problems for adults', () => {
    const signs = ['calf_diarrhoea', 'calf_weak'];
    expect(names(signs, { animal: 'calf' })).toContain('calf_scours');
    expect(names(signs, { animal: 'adult' })).not.toContain('calf_scours');
    expect(names(['hot_hard_udder', 'abnormal_milk'], { animal: 'calf' })).not.toContain('mastitis');
  });

  it('matches pneumonia from cough and discharge, and notes lumpy skin disease as a look-alike', () => {
    const result = check(['cough', 'eye_nose_discharge']);
    expect(result.conditions[0].condition.id).toBe('pneumonia');
    expect(result.conditions[0].fit).toBe('close');
    expect(result.conditions[0].condition.lookAlikes).toMatch(/lumpy skin/i);
  });

  it('only suggests afterbirth problems after calving', () => {
    expect(names(['afterbirth_retained'], { calved: 'no' })).not.toContain('retained_afterbirth');
    expect(names(['afterbirth_retained'], { calved: 'within_3_days' })).toContain('retained_afterbirth');
  });

  it('warns about people when a cow has aborted', () => {
    const result = check(['aborted']);
    expect(result.conditions[0].condition).toMatchObject({ id: 'abortion', humanRisk: true });
  });

  it('never reads "no match" as all clear, and raises the urgency when several signs match nothing', () => {
    const one = check(['milk_dropped']);
    expect(one).toMatchObject({ conditions: [], redFlags: [], noClearMatch: true, urgency: null });
    // Not eating together with a milk drop is itself a same-day red flag, so use signs that match nothing.
    const several = check(['milk_dropped', 'stopped_chewing_cud', 'calf_weak']);
    expect(several).toMatchObject({ noClearMatch: true, urgency: 'soon', redFlags: [], conditions: [] });
  });

  it('ignores unknown and repeated signs', () => {
    expect(check(['not_a_sign']).noClearMatch).toBe(false);
    expect(check(['swollen_left_flank', 'swollen_left_flank']).conditions).toHaveLength(1);
  });

  it('shows at most three entries, best fit first', () => {
    const everything = SIGNS.map((s) => s.id);
    const result = check(everything, { calved: 'within_3_days' });
    expect(result.conditions.length).toBeLessThanOrEqual(MAX_CONDITIONS_SHOWN);
    const scores = result.conditions.map((m) => m.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('uses only the entries it is given, so hidden drafts cannot leak', () => {
    const none = assess({ signs: ['swollen_left_flank'], animal: 'adult', calved: 'no' }, { flags: [], conditions: [] });
    expect(none).toMatchObject({ redFlags: [], conditions: [], urgency: null, noClearMatch: true });
  });
});

describe('the summary a farmer can send to a vet', () => {
  it('lists the signs, the guide’s urgency and the disclaimer, without stating a diagnosis', () => {
    const input: CheckInput = { signs: ['swollen_nodes', 'high_fever_dull', 'ticks_many'], animal: 'adult', calved: 'no' };
    const text = summaryText({ input, assessment: assess(input), farmName: 'Green Hills', cowLabel: 'GH-04 Amani', date: '2026-11-15' });
    expect(text).toContain('Farm: Green Hills');
    expect(text).toContain('Animal: GH-04 Amani');
    expect(text).toContain('Many ticks on the animal');
    expect(text).toContain('See a vet today');
    expect(text).toContain('not a diagnosis');
    expect(text).toContain(DISCLAIMER_SHORT);
    expect(text).not.toMatch(/diagnosed with|she has /i);
  });

  it('mentions recent calving and leaves out unknown signs', () => {
    const input: CheckInput = { signs: ['down_cannot_rise', 'nonsense'], animal: 'adult', calved: 'within_3_days' };
    const text = summaryText({ input, assessment: assess(input), date: '2026-11-15' });
    expect(text).toContain('Calved: in the last 3 days');
    expect(text).not.toContain('nonsense');
    expect(text).toContain('EMERGENCY');
  });
});

describe('county contacts', () => {
  it('finds Nairobi however the county is written, and nowhere else yet', () => {
    for (const written of ['Nairobi', 'Nairobi County', 'nairobi city county', ' NAIROBI ']) expect(contactsFor(written)?.county, written).toBe('Nairobi');
    for (const written of ['Nakuru County', '', null, undefined]) expect(contactsFor(written as string)).toBeNull();
  });

  it('labels every number with where it came from, and as unconfirmed until someone has rung it', () => {
    for (const county of COUNTY_CONTACTS) {
      for (const contact of county.reporting) {
        expect(contact.source).toMatch(/^https:\/\/(nairobi\.go\.ke|dvs\.ecitizen\.go\.ke)\//);
        expect(contact.phone.length).toBeGreaterThan(0);
        for (const phone of contact.phone) expect(phone).toMatch(/^[0-9 ]{9,14}$/);
        if (contact.confirmedOn === null) expect(contact.note.length).toBeGreaterThan(20);
        else expect(contact.confirmedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
    // The general county line must keep saying that it is not a direct veterinary number.
    const general = COUNTY_CONTACTS[0].reporting.find((c) => c.name.includes('help line'));
    expect(general?.note).toMatch(/not a direct/i);
    expect(KVB_REGISTERS_URL).toBe('https://kenyavetboard.or.ke/en/registers');
    expect(KVB_CONTACT.source).toBe('https://kenyavetboard.or.ke/en/contact');
    for (const phone of KVB_CONTACT.phone) expect(phone).toMatch(/^[0-9 ]{9,14}$/);
  });
});

describe('the disclaimer', () => {
  it('says the three things that matter', () => {
    const all = DISCLAIMER_FULL.join(' ');
    expect(all).toMatch(/not a diagnosis/i);
    expect(all).toMatch(/never delay calling a vet/i);
    expect(all).toMatch(/never give, or hold back, treatment/i);
    expect(DISCLAIMER_SHORT).toMatch(/call a vet/i);
  });
});
