// Wording for "Cost per litre" in English and Kiswahili, side by side (tests/app-copy.test.ts checks both are complete).

import { formatKsh } from './money';

export const COST_COPY = {
  en: {
    heading: 'Cost per litre',
    periods: { thisMonth: 'This month', lastMonth: 'Last month' },
    cost: (amount: number) => `Milk cost you about ${formatKsh(amount)} per litre to produce.`,
    price: (amount: number) => `Buyers paid you about ${formatKsh(amount)} per litre.`,
    feed: (percent: number) => `Feed was ${percent}% of your costs.`,
    higher: (amount: number) => `Your costs were about ${formatKsh(amount)} per litre more than the price you were billed.`,
    note: 'Based on the expenses you have recorded. These are estimates, not accounts.',
    notEnough: 'Record milk and expenses for two weeks to see your cost per litre.',
  },
  sw: {
    heading: 'Gharama kwa lita',
    periods: { thisMonth: 'Mwezi huu', lastMonth: 'Mwezi uliopita' },
    cost: (amount: number) => `Kuzalisha lita moja ya maziwa kulikugharimu takriban ${formatKsh(amount)}.`,
    price: (amount: number) => `Wanunuzi walikulipa takriban ${formatKsh(amount)} kwa lita.`,
    feed: (percent: number) => `Chakula kilikuwa asilimia ${percent} ya gharama zako.`,
    higher: (amount: number) => `Gharama zako zilikuwa takriban ${formatKsh(amount)} kwa lita zaidi ya bei uliyodaiwa.`,
    note: 'Inategemea gharama ulizorekodi. Ni makadirio, si hesabu kamili.',
    notEnough: 'Rekodi maziwa na gharama kwa wiki mbili kuona gharama yako kwa lita.',
  },
} as const;
