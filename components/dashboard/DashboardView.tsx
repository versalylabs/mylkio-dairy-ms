'use client';

import React from 'react';
import { Cow, Buyer, MilkEntry, Delivery, PaymentRecord, FarmReminder, ExpenseRecord, Language, Farm, UserAccount } from '@/types';
import { translations } from '@/lib/translations';
import { farmToday, monthRange } from '@/lib/dates';
import { dailyProduction } from '@/lib/milk';
import { cashReceived, expensesInRange, salesInRange, summariseBalances } from '@/lib/ledger';
import { 
  Milk, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
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

  const displayName = farm?.ownerName || user?.name || 'Farmer';
  const farmLocation = farm ? `${farm.name} • ${farm.county}` : 'My Dairy Farm';

  // Active withdrawal reminders
  const withdrawalReminders = reminders.filter((r) => r.type === 'withdrawal' && !r.completed);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#345C4A] via-[#274537] to-[#26332D] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-[#FAF9F5] mb-3 border border-white/20">
            <span className="w-2 h-2 rounded-full bg-[#C6A76A] animate-pulse"></span>
            <span>{farmLocation}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {lang === 'sw' ? `Habari, ${displayName}!` : `Welcome Back, ${displayName}!`}
          </h1>
          <p className="text-sm text-[#e4ede7] mt-2 font-normal leading-relaxed">
            {lang === 'sw'
              ? 'Simamia maziwa, ng\'ombe wako, na malipo ya ushirika kwa urahisi.'
              : 'Know your cows, your milk production, and who owes you without complicated software.'}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={onOpenRecordMilk}
              className="px-4 py-2.5 bg-[#FAF9F5] text-[#26332D] hover:bg-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center space-x-2"
            >
              <Milk className="w-4 h-4 text-[#345C4A]" />
              <span>{t.quickActions.recordMilk}</span>
            </button>
            <button
              onClick={() => onNavigate('sales')}
              className="px-4 py-2.5 bg-[#345C4A]/80 hover:bg-[#345C4A] text-white border border-[#A8BFA5]/30 rounded-xl font-semibold text-xs transition-all flex items-center space-x-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Rekodi Mauzo' : 'Log Delivery'}</span>
            </button>
          </div>
        </div>

        {/* Decorative background blob */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Critical Milk Withdrawal Safety Banner */}
      {withdrawalReminders.length > 0 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-400 rounded-3xl shadow-sm space-y-2 animate-fade-in">
          <div className="flex items-center space-x-2 text-rose-900 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{lang === 'sw' ? 'Kizuizi cha Dawa Kinafanya Kazi (Milk Withdrawal Active)' : 'Active Milk Treatment Withdrawal Notice'}</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            {withdrawalReminders.map((w) => w.title).join(' • ')}.
            Do <strong>NOT</strong> mix this milk with saleable milk destined for cooperatives or customers.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Milk */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t.dashboard.todayMilk}
            </span>
            <div className="p-2 bg-[#A8BFA5]/20 rounded-xl text-[#345C4A]">
              <Milk className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              {todayLitres.toFixed(1)} <span className="text-sm font-normal text-gray-500">{t.common.lShort}</span>
            </div>
            <div className="text-[11px] font-medium text-[#345C4A] flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>{sessionsText}{todayMilk.needsReview ? (sw ? ' · kagua' : ' · needs review') : ''}</span>
            </div>
          </div>
        </div>

        {/* Milk Sold */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t.dashboard.milkSold}
            </span>
            <div className="p-2 bg-[#A8BFA5]/20 rounded-xl text-[#345C4A]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              {todaySales.acceptedLitres.toFixed(1)} <span className="text-sm font-normal text-gray-500">{t.common.lShort}</span>
            </div>
            <div className="text-xs font-medium text-gray-600 mt-0.5">
              {sw ? 'Zilizokubaliwa leo' : 'Accepted today'} · KSh {todaySales.billed.toLocaleString()}
              {todaySales.rejectedLitres > 0 && (sw ? ` · ${todaySales.rejectedLitres} L zilikataliwa` : ` · ${todaySales.rejectedLitres} L rejected`)}
            </div>
          </div>
        </div>

        {/* Cash Received */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t.dashboard.cashReceived}
            </span>
            <div className="p-2 bg-[#FAF5EB] rounded-xl text-[#C6A76A] border border-[#E5D5B5]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              KSh {cashToday.amount.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-[#5D7368] mt-0.5">
              {sw ? 'Leo' : 'Today'} · {sw ? `${monthName}: KSh ${cashMonth.amount.toLocaleString()}` : `${monthName}: KSh ${cashMonth.amount.toLocaleString()}`}
            </div>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t.dashboard.outstandingBalances}
            </span>
            <div className="p-2 bg-[#FAF5EB] rounded-xl text-[#b39252] border border-[#E5D5B5]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#b39252] tracking-tight">
              KSh {owed.owedToFarm.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-gray-600 mt-0.5">
              {sw ? `Wanunuzi ${owed.buyersOwing} wanadaiwa` : `${owed.buyersOwing} buyer${owed.buyersOwing === 1 ? '' : 's'} owing`}
              {owed.advancesHeld > 0 && (sw ? ` · mapema KSh ${owed.advancesHeld.toLocaleString()}` : ` · KSh ${owed.advancesHeld.toLocaleString()} advances`)}
            </div>
          </div>
        </div>
      </div>

      {/* Date-Based Alerts / Reminders (Consequential MVP Digest) */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {lang === 'sw' ? 'Vikumbusho vya Leo (Daily Action Feed)' : 'Consequential Action Reminders'}
              </h2>
              <p className="text-xs text-gray-500">
                Calving countdowns, veterinary dates & settlement deadlines
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            {reminders.filter((r) => !r.completed).length} active
          </span>
        </div>

        <div className="space-y-2 pt-1">
          {reminders.map((rem) => (
            <div
              key={rem.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                rem.completed
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : rem.severity === 'high'
                  ? 'bg-rose-50/60 border-rose-200'
                  : 'bg-amber-50/50 border-amber-200/70'
              }`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => onToggleReminder(rem.id)}
                  className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                    rem.completed
                      ? 'bg-[#345C4A] border-[#345C4A] text-white'
                      : 'border-gray-300 bg-white hover:border-dairy-500'
                  }`}
                >
                  {rem.completed && <Check className="w-3.5 h-3.5" />}
                </button>
                <div>
                  <div className={`text-xs font-bold ${rem.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {rem.title}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {rem.description}
                  </p>
                  <span className="text-[10px] font-semibold text-gray-400 mt-1 block">
                    Due: {rem.dueDate}
                  </span>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                rem.severity === 'high'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {rem.type.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

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
            className="text-xs font-semibold text-[#C6A76A] hover:text-[#d8be85] flex items-center gap-1"
          >
            <span>{lang === 'sw' ? 'Tazama Leja ya Fedha' : 'Open Finance Ledger'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 bg-white/10 rounded-2xl">
            <span className="text-xs text-[#cbdbcf] block">{sw ? 'Mauzo yaliyodaiwa' : 'Milk billed'}</span>
            <span className="text-lg font-black text-[#C6A76A]">KSh {monthSales.billed.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <span className="text-xs text-[#cbdbcf] block">{sw ? 'Gharama' : 'Expenses'}</span>
            <span className="text-lg font-black text-rose-300">KSh {monthExpenses.amount.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-xs text-[#cbdbcf] block">{sw ? 'Ziada (mauzo − gharama)' : 'Surplus (billed − expenses)'}</span>
            <span className={`text-lg font-black ${monthSurplus >= 0 ? 'text-[#A8BFA5]' : 'text-rose-300'}`}>
              {monthSurplus >= 0 ? '+' : '−'}KSh {Math.abs(monthSurplus).toLocaleString()}
            </span>
          </div>
          <p className="col-span-2 sm:col-span-3 text-xs text-[#cbdbcf]">
            {sw
              ? `Pesa iliyopokelewa mwezi huu: KSh ${cashMonth.amount.toLocaleString()}. Mauzo yaliyodaiwa si sawa na pesa iliyopokelewa.`
              : `Cash actually received this month: KSh ${cashMonth.amount.toLocaleString()}. Billed sales are not the same as cash received.`}
          </p>
        </div>
      </div>

      {/* Herd Snapshot */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t.dashboard.quickSummary}
            </h2>
            <p className="text-xs text-gray-500">
              {cows.length} {lang === 'sw' ? 'ng\'ombe waliosajiliwa kwenye shamba' : 'total cattle on farm'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('herd')}
            className="text-xs font-bold text-dairy-600 hover:text-dairy-700 flex items-center space-x-1"
          >
            <span>{lang === 'sw' ? 'Orodha Kamili' : 'See All'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#A8BFA5]/20 rounded-xl border border-[#A8BFA5]/40 flex items-center space-x-3">
            <span className="text-2xl font-black text-[#345C4A]">{lactatingCount}</span>
            <div className="text-xs font-semibold text-[#26332D]">
              {t.dashboard.lactating}
            </div>
          </div>
          <div className="p-3 bg-[#FAF5EB] rounded-xl border border-[#E5D5B5] flex items-center space-x-3">
            <span className="text-2xl font-black text-[#C6A76A]">{dryCount}</span>
            <div className="text-xs font-semibold text-[#26332D]">
              {t.dashboard.dry}
            </div>
          </div>
          <div className="p-3 bg-[#F2EFE7] rounded-xl border border-[#E8E4D8] flex items-center space-x-3">
            <span className="text-2xl font-black text-[#26332D]">{pregnantCount}</span>
            <div className="text-xs font-semibold text-[#26332D]">
              {t.dashboard.pregnant}
            </div>
          </div>
          <div className="p-3 bg-[#FAF9F5] rounded-xl border border-[#E8E4D8] flex items-center space-x-3">
            <span className="text-2xl font-black text-[#26332D]">{calvesCount}</span>
            <div className="text-xs font-semibold text-[#26332D]">
              {t.dashboard.calves}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
        <h2 className="text-base font-bold text-gray-900 mb-3">
          {t.quickActions.title}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={onOpenRecordMilk}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-200 hover:border-[#345C4A] hover:bg-[#FAF9F5] transition-all text-center group"
          >
            <div className="p-2.5 bg-[#A8BFA5]/20 text-[#345C4A] rounded-xl group-hover:bg-[#345C4A] group-hover:text-white transition-colors">
              <Milk className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 mt-2">{t.quickActions.recordMilk}</span>
          </button>

          <button
            onClick={onOpenRecordDelivery}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-200 hover:border-[#345C4A] hover:bg-[#FAF9F5] transition-all text-center group"
          >
            <div className="p-2.5 bg-[#FAF9F5] text-[#345C4A] border border-gray-200 rounded-xl group-hover:bg-[#345C4A] group-hover:text-white transition-colors">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 mt-2">{lang === 'sw' ? 'Rekodi Utoaji' : 'Log Delivery'}</span>
          </button>

          <button
            onClick={onOpenRecordPayment}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-200 hover:border-[#C6A76A] hover:bg-[#FAF5EB] transition-all text-center group"
          >
            <div className="p-2.5 bg-[#FAF5EB] text-[#C6A76A] border border-[#E5D5B5] rounded-xl group-hover:bg-[#C6A76A] group-hover:text-white transition-colors">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 mt-2">{t.quickActions.receivePayment}</span>
          </button>

          <button
            onClick={onOpenAddCow}
            className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-gray-200 hover:border-[#345C4A] hover:bg-[#FAF9F5] transition-all text-center group"
          >
            <div className="p-2.5 bg-[#A8BFA5]/20 text-[#345C4A] rounded-xl group-hover:bg-[#345C4A] group-hover:text-white transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-gray-800 mt-2">{t.quickActions.addCow}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
