// Wording for "Feed cost" in English and Kiswahili, side by side (tests/app-copy.test.ts checks both are complete).

import type { FeedType, FeedUnit } from '@/types';
import { formatKsh } from './money';

export const FEED_COPY = {
  en: {
    heading: 'Feed cost',
    periods: { thisMonth: 'This month', lastMonth: 'Last month' },
    perLitre: (amount: number) => `Feed cost you about ${formatKsh(amount)} for every litre of milk.`,
    margin: (perLitre: number, total: number) => perLitre >= 0
      ? `After feed, each litre left you about ${formatKsh(perLitre)}: about ${formatKsh(total)} for the period.`
      : `Feed cost about ${formatKsh(-perLitre)} a litre more than the milk was billed for.`,
    noPrice: 'Record deliveries to see what is left after feed.',
    change: (diff: number) => diff > 0 ? `That is ${formatKsh(diff)} a litre more than the month before.` : `That is ${formatKsh(-diff)} a litre less than the month before.`,
    same: 'The same as the month before.',
    whereHeading: 'Where the feed money went',
    unitPrice: (price: number, unit: FeedUnit) => `${formatKsh(price)} a ${FEED_UNIT_NAMES.en[unit]}`,
    note: 'Based on the feed you recorded as expenses. These are estimates, not advice on what to feed.',
    notEnough: 'Record milk for two weeks and your feed purchases as expenses to see your feed cost per litre.',
    tip: 'Tip: pick the feed type and quantity when you record a feed expense to see the price per bag or bale.',
    types: { dairy_meal: 'Dairy meal', hay: 'Hay', silage: 'Silage', fodder: 'Napier and fodder', minerals: 'Minerals and salt', other: 'Other feed' } satisfies Record<FeedType, string>,
    form: { type: 'What feed', quantity: 'Quantity', unit: 'Unit', optional: 'optional' },
  },
  sw: {
    heading: 'Gharama ya chakula',
    periods: { thisMonth: 'Mwezi huu', lastMonth: 'Mwezi uliopita' },
    perLitre: (amount: number) => `Chakula kilikugharimu takriban ${formatKsh(amount)} kwa kila lita ya maziwa.`,
    margin: (perLitre: number, total: number) => perLitre >= 0
      ? `Baada ya chakula, kila lita ilikuachia takriban ${formatKsh(perLitre)}: takriban ${formatKsh(total)} kwa kipindi hiki.`
      : `Chakula kiligharimu takriban ${formatKsh(-perLitre)} kwa lita zaidi ya bei ya maziwa.`,
    noPrice: 'Rekodi mauzo ya maziwa kuona kinachobaki baada ya chakula.',
    change: (diff: number) => diff > 0 ? `Hiyo ni ${formatKsh(diff)} kwa lita zaidi ya mwezi uliotangulia.` : `Hiyo ni ${formatKsh(-diff)} kwa lita pungufu ya mwezi uliotangulia.`,
    same: 'Sawa na mwezi uliotangulia.',
    whereHeading: 'Pesa za chakula zilienda wapi',
    unitPrice: (price: number, unit: FeedUnit) => `${formatKsh(price)} kwa ${FEED_UNIT_NAMES.sw[unit]}`,
    note: 'Inategemea chakula ulichorekodi kama gharama. Ni makadirio, si ushauri wa nini cha kulisha.',
    notEnough: 'Rekodi maziwa kwa wiki mbili na ununuzi wa chakula kama gharama kuona gharama ya chakula kwa lita.',
    tip: 'Kidokezo: chagua aina ya chakula na kiasi unaporekodi gharama ya chakula kuona bei kwa gunia au robota.',
    types: { dairy_meal: 'Dairy meal', hay: 'Nyasi kavu (hay)', silage: 'Sileji', fodder: 'Napier na malisho', minerals: 'Madini na chumvi', other: 'Chakula kingine' } satisfies Record<FeedType, string>,
    form: { type: 'Aina ya chakula', quantity: 'Kiasi', unit: 'Kipimo', optional: 'si lazima' },
  },
} as const;

export const FEED_UNIT_NAMES = {
  en: { bag: 'bag', bale: 'bale', kg: 'kg', tonne: 'tonne', load: 'load' },
  sw: { bag: 'gunia', bale: 'robota', kg: 'kilo', tonne: 'tani', load: 'mzigo' },
} as const satisfies Record<'en' | 'sw', Record<FeedUnit, string>>;
