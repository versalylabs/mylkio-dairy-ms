'use client';

import React, { useState } from 'react';
import { Cow, Buyer, MilkEntry, Delivery, PaymentRecord, FarmReminder, ExpenseRecord, Language, Farm, UserAccount } from '@/types';
import { translations } from '@/lib/translations';
import { farmToday, monthRange } from '@/lib/dates';
import { dailyProduction } from '@/lib/milk';
import { isReminderDone } from '@/lib/herd-care';
import { PlanNotice } from '@/components/billing/PlanNotice';
import { canSeeBilling, canSeeMoney, canWrite, roleOrOwner } from '@/lib/team';
import { cashReceived, expensesInRange, salesInRange, summariseBalances } from '@/lib/ledger';
import { 
  Milk, 
  TrendingUp, 
  TrendingDown,
  Banknote, 
  Clock, 
  Plus, 
  Truck,
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Check,
  Receipt
} from 'lucide-react';

interface DashboardViewProps {
  cows: Cow[];
  buyers: Buyer[];
  milkEntries: MilkEntry[];
  deliveries: Delivery[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  reminders: FarmReminder[];
  onToggleReminder: (id: string) => void;
  onNavigate: (tab: 'home' | 'milk' | 'herd' | 'sales' | 'finance' | 'settings') => void;
  onOpenRecordMilk: () => void;
  onOpenRecordDelivery: () => void;
  onOpenRecordPayment: () => void;
  onOpenAddCow: () => void;
  onOpenAddBuyer: () => void;
  lang: Language;
  farm?: Farm;
  user?: UserAccount | null;
}

const REMINDERS_SHOWN = 4;

/** "20 Nov 2026" from a YYYY-MM-DD date; anything else is shown as it was stored. */
function friendlyDate(value: string, sw: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  return new Intl.DateTimeFormat(sw ? 'sw-KE' : 'en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cows,
  buyers,
  milkEntries,
  deliveries,
  payments,
  expenses,
  reminders,
  onToggleReminder,
  onNavigate,
  onOpenRecordMilk,
  onOpenRecordDelivery,
  onOpenRecordPayment,
  onOpenAddCow,
  onOpenAddBuyer,
  lang,
  farm,
  user,
}) => {
  const t = translations[lang];
  const sw = lang === 'sw';
  const [showAllReminders, setShowAllReminders] = useState(false);
  const todayStr = farmToday();
  const today = { from: todayStr, to: todayStr };
  const month = monthRange(todayStr);
  const monthName = new Intl.DateTimeFormat(sw ? 'sw-KE' : 'en-KE', { month: 'long', timeZone: 'UTC' }).format(new Date(`${month.from}T00:00:00Z`));

  const lactatingCount = cows.filter((c) => c.status === 'lactating').length;
  const dryCount = cows.filter((c) => c.status === 'dry').length;
  const pregnantCount = cows.filter((c) => c.isPregnant || c.status === 'pregnant_heifer').length;
  const calvesCount = cows.filter((c) => c.status === 'calf').length;

  // `buyers` arrive with ledger-derived balances (see app/page.tsx).
  const owed = summariseBalances(buyers.map((b) => b.currentBalance));

  // Every figure below is calculated from records for an explicit period.
  const todayMilk = dailyProduction(milkEntries, todayStr);
  const todayLitres = todayMilk.litres;
  const todaySales = salesInRange(deliveries, today);
  const cashToday = cashReceived(payments, today);
  const cashMonth = cashReceived(payments, month);
  const monthSales = salesInRange(deliveries, month);
  const monthExpenses = expensesInRange(expenses, month);
  const monthSurplus = monthSales.billed - monthExpenses.amount;
  const sessionsText = todayMilk.dayTotal !== null
    ? (sw ? 'Jumla ya siku nzima' : 'Whole-day total')
    : todayMilk.countedIds.length === 0
    ? (sw ? 'Bado haijarekodiwa' : 'Not recorded yet')
    : [todayMilk.am !== null ? 'AM' : null, todayMilk.pm !== null ? 'PM' : null].filter(Boolean).join(' + ') + (sw ? ' imerekodiwa' : ' recorded');

  // What this login may see: a worker gets the daily work (milk, cows, health) and never the money.
  const role = roleOrOwner(user?.farmRole);
  const money = canSeeMoney(role);
  const displayName = (role === 'owner' ? farm?.ownerName : undefined) || user?.name || 'Farmer';
  const farmLocation = farm ? `${farm.name} • ${farm.county}` : 'My Dairy Farm';

  // A withdrawal reminder whose end date has passed is over, so it leaves the list by itself.
  const currentReminders = reminders.filter((r) => r.completed || !isReminderDone(r, todayStr));

  // Active withdrawal reminders
  const withdrawalReminders = currentReminders.filter((r) => r.type === 'withdrawal' && !r.completed);

  // Open items first, the most severe first among them.
  const openReminders = currentReminders.filter((r) => !r.completed);
  const sortedReminders = [...currentReminders].sort((a, b) => Number(a.completed) - Number(b.completed) || Number(b.severity === 'high') - Number(a.severity === 'high'));
  const shownReminders = showAllReminders ? sortedReminders : sortedReminders.slice(0, REMINDERS_SHOWN);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Greeting and the everyday actions come first: this is what a farmer opens the app to do. */}
      <header>
        <p className="text-sm font-medium text-[#4B5A52]">{farmLocation}</p>
        <h1 className="page-title">
          {sw ? `Habari, ${displayName}!` : `Hello, ${displayName}`}
        </h1>
      </header>

      {canSeeBilling(role) && <PlanNotice subscription={user?.subscription} farmName={farm?.name ?? 'My farm'} />}

      <section aria-label={sw ? 'Vitendo vya haraka' : 'Quick actions'} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button onClick={onOpenRecordMilk} className="min-h-[88px] flex flex-col items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-[#345C4A] px-2 py-4 text-white shadow-soft hover:bg-[#274537] hover:shadow-glow tile-hover">
          <Milk className="w-6 h-6" />
          <span className="text-sm font-bold sm:text-base">{t.quickActions.recordMilk}</span>
        </button>
        {money && (
          <button onClick={onOpenRecordDelivery} className="min-h-[88px] flex flex-col items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-2 py-4 text-charcoal shadow-soft hover:border-[#345C4A] tile-hover">
          <Truck className="w-6 h-6 text-[#345C4A]" />
          <span className="text-sm font-bold sm:text-base">{sw ? 'Rekodi Utoaji' : 'Log Delivery'}</span>
        </button>
        )}
        {money && (
          <button onClick={onOpenRecordPayment} className="min-h-[88px] flex flex-col items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-2 py-4 text-charcoal shadow-soft hover:border-[#C6A76A] tile-hover">
          <Banknote className="w-6 h-6 text-[#9A7B35]" />
          <span className="text-sm font-bold sm:text-base">{t.quickActions.receivePayment}</span>
        </button>
        )}
        {canWrite(role, 'cows') && (
          <button onClick={onOpenAddCow} className="min-h-[88px] flex flex-col items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-2 py-4 text-charcoal shadow-soft hover:border-[#345C4A] tile-hover">
          <Plus className="w-6 h-6 text-[#345C4A]" />
          <span className="text-sm font-bold sm:text-base">{t.quickActions.addCow}</span>
        </button>
        )}
      </section>

      {/* Critical Milk Withdrawal Safety Banner */}
      {withdrawalReminders.length > 0 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-3xl shadow-sm space-y-2 animate-fade-in">
          <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{sw ? 'Maziwa ya ng\'ombe aliyetibiwa hayafai kuuzwa' : 'Treated cow: do not sell this milk yet'}</span>
          </div>
          <p className="text-sm text-rose-800 leading-relaxed">
            {withdrawalReminders.map((w) => w.title).join(' • ')}.{' '}
            {sw ? <>Usichanganye maziwa haya na maziwa ya kuuza kwa ushirika au wateja. <strong>USIUZE</strong>.</> : <>Do <strong>NOT</strong> mix this milk with saleable milk destined for cooperatives or customers.</>}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {/* Today's Milk */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {t.dashboard.todayMilk}
            </span>
            <div className="p-2 bg-[#A8BFA5]/20 rounded-xl text-[#345C4A]">
              <Milk className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">
              {todayLitres.toFixed(1)} <span className="text-sm font-normal text-gray-500">{t.common.lShort}</span>
            </div>
            <div className="text-sm font-medium text-[#345C4A] flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>{sessionsText}{todayMilk.needsReview ? (sw ? ' · kagua' : ' · needs review') : ''}</span>
            </div>
          </div>
        </div>

        {money && <>
        {/* Milk Sold */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {t.dashboard.milkSold}
            </span>
            <div className="p-2 bg-[#A8BFA5]/20 rounded-xl text-[#345C4A]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">
              {todaySales.acceptedLitres.toFixed(1)} <span className="text-sm font-normal text-gray-500">{t.common.lShort}</span>
            </div>
            <div className="text-sm font-medium text-gray-600 mt-0.5">
              {sw ? 'Zilizokubaliwa leo' : 'Accepted today'} · KSh {todaySales.billed.toLocaleString()}
              {todaySales.rejectedLitres > 0 && (sw ? ` · ${todaySales.rejectedLitres} L zilikataliwa` : ` · ${todaySales.rejectedLitres} L rejected`)}
            </div>
          </div>
        </div>

        {/* Cash Received */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {t.dashboard.cashReceived}
            </span>
            <div className="p-2 bg-[#FAF5EB] rounded-xl text-[#C6A76A] border border-[#E5D5B5]">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">
              KSh {cashToday.amount.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-[#5D7368] mt-0.5">
              {sw ? 'Leo' : 'Today'} · {sw ? `${monthName}: KSh ${cashMonth.amount.toLocaleString()}` : `${monthName}: KSh ${cashMonth.amount.toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              {t.dashboard.outstandingBalances}
            </span>
            <div className="p-2 bg-[#FAF5EB] rounded-xl text-[#b39252] border border-[#E5D5B5]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#b39252] tracking-tight whitespace-nowrap">
              KSh {owed.owedToFarm.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-gray-600 mt-0.5">
              {sw ? `Wanunuzi ${owed.buyersOwing} wanadaiwa` : `${owed.buyersOwing} buyer${owed.buyersOwing === 1 ? '' : 's'} owing`}
              {owed.advancesHeld > 0 && (sw ? ` · mapema KSh ${owed.advancesHeld.toLocaleString()}` : ` · KSh ${owed.advancesHeld.toLocaleString()} advances`)}
            </div>
          </div>
        </div>
        </>}
      </div>

      {/* What needs attention: open items first, a short list by default. */}
      <section aria-labelledby="attention-heading" className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 id="attention-heading" className="text-base font-bold text-gray-900">
                {sw ? 'Vinavyohitaji Umakini' : 'Needs your attention'}
              </h2>
              <p className="text-sm text-gray-600">
                {sw ? 'Tarehe za ndama, daktari wa mifugo na malipo' : 'Calving dates, vet visits and payment deadlines'}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
            {openReminders.length} {sw ? 'wazi' : 'open'}
          </span>
        </div>

        {openReminders.length === 0 && (
          <p className="rounded-2xl bg-[#EEF4EC] p-4 text-sm font-medium text-[#2B4A3B]">
            {sw ? 'Hakuna kinachohitaji umakini leo.' : 'Nothing needs your attention today.'}
          </p>
        )}

        <div className="space-y-2 pt-1">
          {shownReminders.map((rem) => (
            <div
              key={rem.id}
              className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                rem.completed
                  ? 'bg-gray-50 border-gray-200 opacity-70'
                  : rem.severity === 'high'
                  ? 'bg-rose-50/60 border-rose-200'
                  : 'bg-amber-50/50 border-amber-200/70'
              }`}
            >
              <div className="flex items-start gap-1">
                <button
                  onClick={() => onToggleReminder(rem.id)}
                  aria-label={`${rem.completed ? (sw ? 'Weka wazi tena' : 'Mark as not done') : (sw ? 'Weka kama imefanywa' : 'Mark as done')}: ${rem.title}`}
                  aria-pressed={rem.completed}
                  className="-ml-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center"
                >
                  <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    rem.completed
                      ? 'bg-[#345C4A] border-[#345C4A] text-white'
                      : 'border-gray-400 bg-white'
                  }`}>
                    {rem.completed && <Check className="w-4 h-4" />}
                  </span>
                </button>
                <div className="min-w-0">
                  <span className={`mb-1 inline-block text-xs font-bold px-2 py-0.5 rounded-full ${
                    rem.severity === 'high'
                      ? 'bg-rose-100 text-rose-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {rem.type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <div className={`text-sm font-bold ${rem.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {rem.title}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">
                    {rem.description}
                  </p>
                  <span className="text-sm font-semibold text-gray-600 mt-1 block">
                    {sw ? 'Tarehe' : 'Due'}: {friendlyDate(rem.dueDate, sw)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedReminders.length > REMINDERS_SHOWN && (
          <button
            onClick={() => setShowAllReminders((v) => !v)}
            className="min-h-11 w-full rounded-xl border border-gray-200 text-sm font-semibold text-[#345C4A] hover:bg-[#FAF9F5]"
          >
            {showAllReminders
              ? (sw ? 'Onyesha chache' : 'Show fewer')
              : (sw ? `Onyesha zote (${sortedReminders.length})` : `Show all (${sortedReminders.length})`)}
          </button>
        )}
      </section>

      {money && <>
      {/* Financial Health Snapshot */}
      <div className="bg-[#26332D] text-white rounded-3xl p-5 shadow-sm space-y-3 border border-[#345C4A]/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-[#A8BFA5]" />
            <h2 className="text-sm font-bold">
              {sw ? `Fedha za ${monthName}` : `${monthName} so far`}
            </h2>
          </div>
          <button
            onClick={() => onNavigate('finance')}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap text-sm font-semibold text-gold-600 hover:text-sage"
          >
            <span>{lang === 'sw' ? 'Tazama Leja ya Fedha' : 'Open Finance Ledger'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-1 min-[360px]:grid-cols-2 sm:grid-cols-3">
          <div className="p-3 bg-white/10 rounded-2xl">
            <span className="text-sm text-[#cbdbcf] block">{sw ? 'Mauzo yaliyodaiwa' : 'Milk billed'}</span>
            <span className="text-lg font-black text-[#C6A76A]">KSh {monthSales.billed.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <span className="text-sm text-[#cbdbcf] block">{sw ? 'Gharama' : 'Expenses'}</span>
            <span className="text-lg font-black text-rose-300">KSh {monthExpenses.amount.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-sm text-[#cbdbcf] block">{sw ? 'Ziada (mauzo − gharama)' : 'Surplus (billed − expenses)'}</span>
            <span className={`text-lg font-black ${monthSurplus >= 0 ? 'text-[#A8BFA5]' : 'text-rose-300'}`}>
              {monthSurplus >= 0 ? '+' : '−'}KSh {Math.abs(monthSurplus).toLocaleString()}
            </span>
          </div>
          <p className="col-span-2 sm:col-span-3 text-sm text-[#cbdbcf]">
            {sw
              ? `Pesa iliyopokelewa mwezi huu: KSh ${cashMonth.amount.toLocaleString()}. Mauzo yaliyodaiwa si sawa na pesa iliyopokelewa.`
              : `Cash actually received this month: KSh ${cashMonth.amount.toLocaleString()}. Billed sales are not the same as cash received.`}
          </p>
        </div>
      </div>
      </>}

      {/* Herd Snapshot */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t.dashboard.quickSummary}
            </h2>
            <p className="text-sm text-gray-500">
              {cows.length} {lang === 'sw' ? 'ng\'ombe waliosajiliwa kwenye shamba' : 'total cattle on farm'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('herd')}
            className="text-sm font-bold text-dairy-600 hover:text-dairy-700 flex items-center space-x-1"
          >
            <span>{lang === 'sw' ? 'Orodha Kamili' : 'See All'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#A8BFA5]/20 rounded-xl border border-[#A8BFA5]/40 flex items-center space-x-3">
            <span className="text-2xl font-black text-[#345C4A] whitespace-nowrap">{lactatingCount}</span>
            <div className="text-sm font-semibold text-[#26332D]">
              {t.dashboard.lactating}
            </div>
          </div>
          <div className="p-3 bg-[#FAF5EB] rounded-xl border border-[#E5D5B5] flex items-center space-x-3">
            <span className="text-2xl font-black text-[#C6A76A] whitespace-nowrap">{dryCount}</span>
            <div className="text-sm font-semibold text-[#26332D]">
              {t.dashboard.dry}
            </div>
          </div>
          <div className="p-3 bg-[#F2EFE7] rounded-xl border border-[#E8E4D8] flex items-center space-x-3">
            <span className="text-2xl font-black text-[#26332D] whitespace-nowrap">{pregnantCount}</span>
            <div className="text-sm font-semibold text-[#26332D]">
              {t.dashboard.pregnant}
            </div>
          </div>
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E4D8] flex items-center space-x-3">
            <span className="text-2xl font-black text-[#26332D] whitespace-nowrap">{calvesCount}</span>
            <div className="text-sm font-semibold text-[#26332D]">
              {t.dashboard.calves}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
