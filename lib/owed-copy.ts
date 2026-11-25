// Wording for "Money owed" in English and Kiswahili, side by side (tests/app-copy.test.ts checks both are complete).

import { formatKsh } from './money';
import type { AgeBucket } from './money-owed';

export const OWED_COPY = {
  en: {
    tab: 'Money owed',
    heading: 'Money owed to you',
    totals: (owed: number, overdue: number) => overdue > 0 ? `${formatKsh(owed)} owed, ${formatKsh(overdue)} of it late.` : `${formatKsh(owed)} owed, none of it late.`,
    nothingOwed: 'Nobody owes you money right now.',
    owes: 'Owes',
    oldest: (date: string) => `Unpaid since ${date}`,
    late: (days: number) => (days === 1 ? '1 day late' : `${days} days late`),
    onTime: 'Not yet due',
    dueRule: 'Money is due on the payment date of a co-op statement, or by the buyer\'s payment cycle: daily, weekly, or the 15th of the next month.',
    ageingHeading: 'How late is it',
    buckets: { notDue: 'Not yet due', late1to30: '1 to 30 days late', late31to60: '31 to 60 days late', late61to90: '61 to 90 days late', late90plus: 'Over 90 days late' } satisfies Record<AgeBucket, string>,
    deductionsHeading: 'What co-ops took off your pay',
    deductionsPeriod: 'Last 12 months of co-op statements',
    deductionsTotal: (amount: number, percent: number, count: number) => `${formatKsh(amount)} deducted from ${count === 1 ? '1 statement' : `${count} statements`}, ${percent}% of your milk value.`,
    ofGross: (percent: number) => `${percent}% of milk value`,
    noDeductions: 'Add your co-op statements with their deduction lines to see what is taken off before you are paid.',
    ask: 'Not sure about a deduction? Ask your co-op for the receipt or the agreement behind it.',
  },
  sw: {
    tab: 'Madeni',
    heading: 'Pesa unazodai',
    totals: (owed: number, overdue: number) => overdue > 0 ? `Unadai ${formatKsh(owed)}, kati yake ${formatKsh(overdue)} imechelewa.` : `Unadai ${formatKsh(owed)}, hakuna iliyochelewa.`,
    nothingOwed: 'Hakuna anayekudai pesa kwa sasa.',
    owes: 'Anadaiwa',
    oldest: (date: string) => `Haijalipwa tangu ${date}`,
    late: (days: number) => (days === 1 ? 'Imechelewa siku 1' : `Imechelewa siku ${days}`),
    onTime: 'Bado haijafika wakati',
    dueRule: 'Pesa inadaiwa tarehe ya malipo iliyo kwenye taarifa ya ushirika, au kwa mzunguko wa malipo wa mnunuzi: kila siku, kila wiki, au tarehe 15 ya mwezi unaofuata.',
    ageingHeading: 'Imechelewa kiasi gani',
    buckets: { notDue: 'Bado haijafika wakati', late1to30: 'Siku 1 hadi 30', late31to60: 'Siku 31 hadi 60', late61to90: 'Siku 61 hadi 90', late90plus: 'Zaidi ya siku 90' } satisfies Record<AgeBucket, string>,
    deductionsHeading: 'Makato ya ushirika kwenye malipo yako',
    deductionsPeriod: 'Taarifa za ushirika za miezi 12 iliyopita',
    deductionsTotal: (amount: number, percent: number, count: number) => `${formatKsh(amount)} zilikatwa kwenye ${count === 1 ? 'taarifa 1' : `taarifa ${count}`}, asilimia ${percent} ya thamani ya maziwa yako.`,
    ofGross: (percent: number) => `Asilimia ${percent} ya thamani ya maziwa`,
    noDeductions: 'Ongeza taarifa za ushirika pamoja na makato yake kuona kinachokatwa kabla hujalipwa.',
    ask: 'Huna uhakika na makato fulani? Uliza ushirika wako risiti au makubaliano yake.',
  },
} as const;
