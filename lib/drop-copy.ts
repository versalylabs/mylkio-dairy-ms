// Wording for milk drop alerts and the weekly cow ranking, in English and Kiswahili, side by side
// (tests/app-copy.test.ts checks both are complete). The alert describes what the records show and suggests calling a
// vet; it never names a diagnosis or a medicine.

import { SNOOZE_DAYS } from './alert-dismissals';

const l = (n: number) => `${n.toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;

export const DROP_COPY = {
  en: {
    tag: 'Milk drop',
    alert: (name: string, percent: number) => `${name}'s milk is down about ${percent}% this week. Check her feed and health; call a vet if she looks unwell.`,
    detail: (recent: number, earlier: number) => `Lately ${l(recent)} a day, earlier ${l(earlier)} a day.`,
    open: (name: string) => `Open ${name}'s page`,
    snooze: `Snooze ${SNOOZE_DAYS} days`,
    dismiss: 'Dismiss',
    heading: 'Your cows this week',
    sub: 'Average litres per day, against the week before.',
    perDay: 'a day',
    trend: { up: 'up on last week', down: 'down on last week', level: 'level with last week', new: 'new this week' },
  },
  sw: {
    tag: 'Maziwa kushuka',
    alert: (name: string, percent: number) => `Maziwa ya ${name} yameshuka takriban asilimia ${percent} wiki hii. Angalia chakula na afya yake; mwite daktari wa mifugo akionekana mgonjwa.`,
    detail: (recent: number, earlier: number) => `Siku hizi ${l(recent)} kwa siku, awali ${l(earlier)} kwa siku.`,
    open: (name: string) => `Fungua ukurasa wa ${name}`,
    snooze: `Ahirisha siku ${SNOOZE_DAYS}`,
    dismiss: 'Ondoa',
    heading: 'Ng’ombe wako wiki hii',
    sub: 'Wastani wa lita kwa siku, ukilinganishwa na wiki iliyopita.',
    perDay: 'kwa siku',
    trend: { up: 'juu kuliko wiki iliyopita', down: 'chini kuliko wiki iliyopita', level: 'sawa na wiki iliyopita', new: 'mpya wiki hii' },
  },
} as const;
