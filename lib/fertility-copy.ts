// Wording for the fertility flags and the two lines on the cow page, in English and Kiswahili, side by side
// (tests/app-copy.test.ts checks both are complete). It describes what the records show and suggests watching for heat,
// asking the inseminator, or asking a vet to examine the cow; it never names a diagnosis or a medicine.

import { SNOOZE_DAYS } from './alert-dismissals';

export const FERTILITY_COPY = {
  en: {
    notServedTag: 'Not served',
    repeatTag: 'Repeat service',
    notServed: (name: string, days: number) => `${name} calved ${days} days ago and has not been served. Watch for heat or ask your inseminator.`,
    repeat: (name: string, times: number) => `${name} has been served ${times} times without holding. Ask a vet to examine her.`,
    open: (name: string) => `Open ${name}'s page`,
    snooze: `Snooze ${SNOOZE_DAYS} days`,
    dismiss: 'Dismiss',
    daysOpen: (days: number) => `Days open: ${days}`,
    interval: (days: number) => `Last calving interval: ${days} days`,
  },
  sw: {
    notServedTag: 'Hajapandishwa',
    repeatTag: 'Kupandishwa mara kwa mara',
    notServed: (name: string, days: number) => `${name} alizaa siku ${days} zilizopita na hajapandishwa. Angalia dalili za joto au muulize mpandishaji wako.`,
    repeat: (name: string, times: number) => `${name} amepandishwa mara ${times} bila kushika mimba. Mwombe daktari wa mifugo amchunguze.`,
    open: (name: string) => `Fungua ukurasa wa ${name}`,
    snooze: `Ahirisha siku ${SNOOZE_DAYS}`,
    dismiss: 'Ondoa',
    daysOpen: (days: number) => `Siku bila mimba: ${days}`,
    interval: (days: number) => `Kipindi cha mwisho kati ya kuzaa: siku ${days}`,
  },
} as const;
