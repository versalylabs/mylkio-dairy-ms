// Wording for the weekly owner summary, in English and Kiswahili, side by side (tests/app-copy.test.ts checks both are
// complete). The share text is the same figures as the card, written to be pasted into a WhatsApp message.

import { formatKsh } from './money';
import type { WeeklySummary } from './weekly-summary';

const litres = (n: number) => `${n.toLocaleString('en-KE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`;

export const WEEKLY_COPY = {
  en: {
    title: 'Last week on your farm',
    weekOf: (from: string, to: string) => `${from} to ${to}`,
    produced: 'Milk produced',
    change: (percent: number | null) => (percent === null ? '' : percent === 0 ? 'level with the week before' : `${percent > 0 ? 'up' : 'down'} ${Math.abs(percent)}% on the week before`),
    sold: 'Milk sold',
    notSold: 'not sold',
    soldMore: 'Sold more than recorded. Check the milk records.',
    billed: 'Billed',
    received: 'Received',
    owing: 'Buyers owing',
    owingNone: 'No buyer owes you anything',
    owingValue: (total: number, count: number) => `${formatKsh(total)} (${count} ${count === 1 ? 'buyer' : 'buyers'})`,
    overdue: 'Reminders overdue',
    overdueNone: 'None',
    who: 'Who recorded what',
    recorded: (milk: number, health: number, breeding: number) => `${milk} milk, ${health} health, ${breeding} breeding`,
    share: 'Share on WhatsApp',
    dismiss: 'Dismiss',
    shareText: (farm: string, range: string, s: WeeklySummary) => [
      `Last week on ${farm} (${range})`,
      `Milk produced: ${litres(s.produced)}${s.changePercent === null ? '' : ` (${s.changePercent === 0 ? 'level with' : `${s.changePercent > 0 ? 'up' : 'down'} ${Math.abs(s.changePercent)}% on`} the week before)`}`,
      s.soldState === 'ok' && s.notSold !== null ? `Milk sold: ${litres(s.sold)}, not sold: ${litres(s.notSold)}` : `Milk sold: ${litres(s.sold)}`,
      `Billed: ${formatKsh(s.billed)}. Received: ${formatKsh(s.received)}`,
      s.buyersOwing > 0 ? `Buyers owing: ${formatKsh(s.owedTotal)} (${s.buyersOwing} ${s.buyersOwing === 1 ? 'buyer' : 'buyers'})` : 'No buyer owes anything',
      s.overdueReminders > 0 ? `Reminders overdue: ${s.overdueReminders}` : 'No reminders overdue',
      ...(s.recorders && s.recorders.length ? ['Recorded by: ' + s.recorders.map((r) => `${r.name} ${r.total}`).join(', ')] : []),
      'From Mylkio',
    ].join('\n'),
  },
  sw: {
    title: 'Wiki iliyopita shambani kwako',
    weekOf: (from: string, to: string) => `${from} hadi ${to}`,
    produced: 'Maziwa yaliyozalishwa',
    change: (percent: number | null) => (percent === null ? '' : percent === 0 ? 'sawa na wiki iliyotangulia' : `${percent > 0 ? 'juu' : 'chini'} asilimia ${Math.abs(percent)} kuliko wiki iliyotangulia`),
    sold: 'Maziwa yaliyouzwa',
    notSold: 'hayajauzwa',
    soldMore: 'Yaliyouzwa ni zaidi ya yaliyorekodiwa. Kagua rekodi za maziwa.',
    billed: 'Yaliyodaiwa',
    received: 'Yaliyopokelewa',
    owing: 'Wanunuzi wanaodaiwa',
    owingNone: 'Hakuna mnunuzi anayekudai',
    owingValue: (total: number, count: number) => `${formatKsh(total)} (wanunuzi ${count})`,
    overdue: 'Vikumbusho vilivyochelewa',
    overdueNone: 'Hakuna',
    who: 'Nani alirekodi nini',
    recorded: (milk: number, health: number, breeding: number) => `maziwa ${milk}, afya ${health}, uzazi ${breeding}`,
    share: 'Tuma kwa WhatsApp',
    dismiss: 'Ondoa',
    shareText: (farm: string, range: string, s: WeeklySummary) => [
      `Wiki iliyopita ${farm} (${range})`,
      `Maziwa yaliyozalishwa: ${litres(s.produced)}${s.changePercent === null ? '' : ` (${s.changePercent === 0 ? 'sawa na' : `${s.changePercent > 0 ? 'juu' : 'chini'} asilimia ${Math.abs(s.changePercent)} kuliko`} wiki iliyotangulia)`}`,
      s.soldState === 'ok' && s.notSold !== null ? `Maziwa yaliyouzwa: ${litres(s.sold)}, hayajauzwa: ${litres(s.notSold)}` : `Maziwa yaliyouzwa: ${litres(s.sold)}`,
      `Yaliyodaiwa: ${formatKsh(s.billed)}. Yaliyopokelewa: ${formatKsh(s.received)}`,
      s.buyersOwing > 0 ? `Wanunuzi wanaodaiwa: ${formatKsh(s.owedTotal)} (wanunuzi ${s.buyersOwing})` : 'Hakuna mnunuzi anayedaiwa',
      s.overdueReminders > 0 ? `Vikumbusho vilivyochelewa: ${s.overdueReminders}` : 'Hakuna vikumbusho vilivyochelewa',
      ...(s.recorders && s.recorders.length ? ['Walirekodi: ' + s.recorders.map((r) => `${r.name} ${r.total}`).join(', ')] : []),
      'Kutoka Mylkio',
    ].join('\n'),
  },
} as const;
