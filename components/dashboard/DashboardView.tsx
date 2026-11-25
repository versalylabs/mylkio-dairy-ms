'use client';

import React, { useEffect, useState } from 'react';
import { Cow, Buyer, MilkEntry, Delivery, PaymentRecord, FarmReminder, ExpenseRecord, Language, Farm, UserAccount, MilkUse, BreedingEvent, HealthEvent } from '@/types';
import { WeeklySummaryCard } from './WeeklySummaryCard';
import { FarmStart, isNewFarm } from './FarmStart';
import { weeklySummary } from '@/lib/weekly-summary';
import { canUse } from '@/lib/plans';
import type { AppTab } from '@/lib/team';
import { OUTBREAK_COPY } from '@/lib/outbreak-copy';
import { communityCall, keep, readKept } from '@/lib/community-client';
import { signLabel, type HomeAlert } from '@/lib/community-outbreak';
import type { OfficialAlert } from '@/lib/community';
import { COMMUNITY_COPY } from '@/lib/community-copy';
import { milkDropAlerts } from '@/lib/milk-drop';
import { fertilityFlags } from '@/lib/fertility';
import { FERTILITY_COPY } from '@/lib/fertility-copy';
import { DROP_COPY } from '@/lib/drop-copy';
import { dismissAlert, isHidden, prune, snoozeAlert, type Dismissals } from '@/lib/alert-dismissals';
import { ProducedSoldLine } from '@/components/milk/ProducedSoldLine';
import { producedVsSold, splitInRange } from '@/lib/produced-sold';
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
  milkUse?: MilkUse[];
  /** For milk drop alerts: a cow that has just calved is left alone. */
  breedingEvents?: BreedingEvent[];
  /** For the weekly summary's "who recorded what". */
  healthEvents?: HealthEvent[];
  /** Opens a cow's page (from a milk drop alert). */
  onOpenCow?: (cowId: string) => void;
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  reminders: FarmReminder[];
  onOpenMilkUse?: (date: string) => void;
  onToggleReminder: (id: string) => void;
  onNavigate: (tab: AppTab) => void;
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
  milkUse = [],
  breedingEvents = [],
  healthEvents = [],
  onOpenCow,
  payments,
  expenses,
  reminders,
  onOpenMilkUse,
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
  const [hiddenAlerts, setHiddenAlerts] = useState<Dismissals>({});
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
  const todayFigures = producedVsSold(milkEntries, deliveries, today);
  const todaySplit = splitInRange(milkUse, milkEntries, today, todayFigures.notSold);
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

  // Milk drop alerts (Farmer plan and up; only for farms that log milk per cow). Worked out from the records, so they
  // close by themselves when the cow recovers. A worker sees them too: they contain no money.
  const dropText = DROP_COPY[lang];
  const farmKey = farm?.id ?? 'farm';
  const drops = canUse(user?.subscription, 'milkDrop') ? milkDropAlerts({ cows, milk: milkEntries, breeding: breedingEvents, reminders, today: todayStr }) : [];
  // Fertility flags (Farmer plan and up): a cow not served, or served again and again without holding. Worked out from
  // her breeding records, so a new insemination or a positive pregnancy check closes them by itself.
  const fertText = FERTILITY_COPY[lang];
  const flags = canUse(user?.subscription, 'fertility') ? fertilityFlags({ cows, breeding: breedingEvents, today: todayStr }) : [];
  // Community (Farm Pro and Custom): one item when a group this farm belongs to has an open outbreak alert in its own county
  // that it did not report itself. Counts only, never a farm. The last answer is kept so it still shows without signal.
  const outText = OUTBREAK_COPY[lang];
  const communityOn = !!user && user.id !== 'usr-demo-01' && canUse(user.subscription, 'community');
  const [communityAlerts, setCommunityAlerts] = useState<HomeAlert[]>([]);
  const [officialAlerts, setOfficialAlerts] = useState<OfficialAlert[]>([]);
  useEffect(() => {
    if (!communityOn || !user) { setCommunityAlerts([]); setOfficialAlerts([]); return; }
    setCommunityAlerts(readKept<HomeAlert[]>(user.id, 'home_alerts') ?? []);
    setOfficialAlerts(readKept<OfficialAlert[]>(user.id, 'home_official') ?? []);
    let cancelled = false;
    const refresh = () => {
      communityCall<{ alerts: HomeAlert[]; official?: OfficialAlert[] }>('/api/community/alerts')
        .then((result) => {
          if (cancelled) return;
          setCommunityAlerts(result.alerts); keep(user.id, 'home_alerts', result.alerts);
          setOfficialAlerts(result.official ?? []); keep(user.id, 'home_official', result.official ?? []);
        })
        .catch(() => { /* no signal, or no groups: keep what is shown */ });
    };
    refresh();
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVisible); };
  }, [communityOn, user?.id]);
  // The farm count is in the id: dismissing "3 farms" does not hide it when it becomes 9.
  const communityId = (a: HomeAlert) => `community-${a.groupId}-${a.sign}-${a.area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${a.farms}`;
  const alertKey = [...drops.map((d) => d.cowId), ...flags.map((f) => f.id), ...communityAlerts.map(communityId), ...officialAlerts.map((a) => `official-${a.id}`)].join(',');
  useEffect(() => { setHiddenAlerts(prune(farmKey, alertKey ? alertKey.split(',') : [])); }, [farmKey, alertKey]);
  const shownDrops = drops.filter((d) => !isHidden(hiddenAlerts[d.cowId], todayStr));
  const shownFlags = flags.filter((f) => !isHidden(hiddenAlerts[f.id], todayStr));
  // One item for Community, the alert with the most farms behind it.
  const topCommunity = communityAlerts.find((a) => !isHidden(hiddenAlerts[communityId(a)], todayStr));
  const topOfficial = [...officialAlerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).find((a) => !isHidden(hiddenAlerts[`official-${a.id}`], todayStr));
  const offText = COMMUNITY_COPY[lang];
  const weekly = money && canUse(user?.subscription, 'weeklySummary')
    ? weeklySummary({ milk: milkEntries, deliveries, payments, health: healthEvents, breeding: breedingEvents, reminders, buyerBalances: buyers.map((b) => b.currentBalance), today: todayStr })
    : null;

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
          <button onClick={onOpenRecordPayment} className="min-h-[88px] flex flex-col items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-gray-200 bg-white px-2 py-4 text-charcoal shadow-soft hover:border-[#E9C94F] tile-hover">
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
            <span className="text-xs font-semibold text-gray-600">
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
            <span className="text-xs font-semibold text-gray-600">
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
            <ProducedSoldLine
              className="mt-2 border-t border-gray-100 pt-2"
              figures={todayFigures}
              split={todaySplit}
              lang={lang}
              isToday
              onOpenSplit={onOpenMilkUse && todayFigures.state === 'ok' && canWrite(role, 'milkUse') ? () => onOpenMilkUse(todayStr) : undefined}
            />
          </div>
        </div>

        {/* Cash Received */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">
              {t.dashboard.cashReceived}
            </span>
            <div className="p-2 bg-[#FCF6DC] rounded-xl text-[#8A6A10] border border-[#EED98E]">
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
            <span className="text-xs font-semibold text-gray-600">
              {t.dashboard.outstandingBalances}
            </span>
            <div className="p-2 bg-[#FCF6DC] rounded-xl text-[#8A6A10] border border-[#EED98E]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#8A6A10] tracking-tight whitespace-nowrap">
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

      {/* Last week on your farm: Farm Pro and up, owners and managers (it is built from money) */}
      {money && weekly && weekly.hasActivity && <WeeklySummaryCard summary={weekly} farmId={farmKey} farmName={farm?.name ?? ''} lang={lang} />}

      {/* A farm with no cows and no milk yet gets three first steps instead of an empty list. */}
      {isNewFarm({ cows: cows.length, milk: milkEntries.length, openReminders: openReminders.length }) ? (
        <FarmStart
          lang={lang}
          steps={([
            canWrite(role, 'milk') && { id: 'milk' as const, done: false, onStart: onOpenRecordMilk },
            canWrite(role, 'cows') && { id: 'cow' as const, done: false, onStart: onOpenAddCow },
            canWrite(role, 'buyers') && { id: 'buyer' as const, done: buyers.length > 0, onStart: onOpenAddBuyer },
          ] as const).filter((step): step is Exclude<typeof step, false> => step !== false)}
        />
      ) : (
      <>
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
            {openReminders.length + shownDrops.length + shownFlags.length + (topCommunity ? 1 : 0) + (topOfficial ? 1 : 0)} {sw ? 'wazi' : 'open'}
          </span>
        </div>

        {openReminders.length === 0 && shownDrops.length === 0 && shownFlags.length === 0 && !topCommunity && !topOfficial && (
          <p className="rounded-2xl bg-[#EEF4EC] p-4 text-sm font-medium text-[#2B4A3B]">
            {sw ? 'Hakuna kinachohitaji umakini leo.' : 'Nothing needs your attention today.'}
          </p>
        )}

        <div className="space-y-2 pt-1">
          {topOfficial && (
            <div className="rounded-2xl border border-sage-300 bg-sage/10 p-3">
              <button type="button" onClick={() => onNavigate('community')} aria-label={offText.officialRead} className="block w-full text-left">
                <span className="mb-1 inline-block rounded-full bg-sage px-2 py-0.5 text-xs font-bold text-white">{offText.officialBadge.toUpperCase()}</span>
                <span className="block text-sm font-bold text-gray-900">{topOfficial.title}</span>
                <span className="mt-0.5 block text-xs text-gray-600">{offText.officialSource(topOfficial.sourceName, topOfficial.sourceDate)}</span>
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="chip-btn" onClick={() => onNavigate('community')}>{offText.officialRead}</button>
                <button type="button" className="chip-btn" onClick={() => setHiddenAlerts(dismissAlert(farmKey, `official-${topOfficial.id}`))}>{dropText.dismiss}</button>
              </div>
            </div>
          )}
          {topCommunity && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3">
              <button type="button" onClick={() => onNavigate('community')} aria-label={outText.homeOpen} className="block w-full text-left">
                <span className="mb-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-900">{outText.homeTag}</span>
                <span className="block text-sm font-bold text-gray-900">{outText.homeItem(topCommunity.farms, topCommunity.area, topCommunity.groupName)}</span>
                <span className="mt-0.5 block text-sm text-gray-700">{signLabel(topCommunity.sign)}</span>
                <span className="mt-0.5 block text-xs text-gray-600">{outText.homeSafety}</span>
              </button>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="chip-btn" onClick={() => onNavigate('community')}>{outText.homeOpen}</button>
                <button type="button" className="chip-btn" onClick={() => setHiddenAlerts(snoozeAlert(farmKey, communityId(topCommunity), todayStr))}>{dropText.snooze}</button>
                <button type="button" className="chip-btn" onClick={() => setHiddenAlerts(dismissAlert(farmKey, communityId(topCommunity)))}>{dropText.dismiss}</button>
              </div>
            </div>
          )}
          {shownDrops.map((alert) => {
            const name = alert.cowName ?? alert.cowTag;
            return (
              <div key={`drop-${alert.cowId}`} className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3">
                <button type="button" onClick={() => onOpenCow?.(alert.cowId)} aria-label={dropText.open(name)} className="block w-full text-left">
                  <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">{dropText.tag.toUpperCase()}</span>
                  <span className="block text-sm font-bold text-gray-900">{dropText.alert(name, alert.percent)}</span>
                  <span className="mt-0.5 block text-sm text-gray-700">{dropText.detail(alert.recentAverage, alert.baselineAverage)}</span>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="chip-btn" onClick={() => setHiddenAlerts(snoozeAlert(farmKey, alert.cowId, todayStr))}>{dropText.snooze}</button>
                  <button type="button" className="chip-btn" onClick={() => setHiddenAlerts(dismissAlert(farmKey, alert.cowId))}>{dropText.dismiss}</button>
                </div>
              </div>
            );
          })}
          {shownFlags.map((flag) => {
            const name = flag.cowName ?? flag.cowTag;
            return (
              <div key={flag.id} className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-3">
                <button type="button" onClick={() => onOpenCow?.(flag.cowId)} aria-label={fertText.open(name)} className="block w-full text-left">
                  <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">{(flag.kind === 'not_served' ? fertText.notServedTag : fertText.repeatTag).toUpperCase()}</span>
                  <span className="block text-sm font-bold text-gray-900">{flag.kind === 'not_served' ? fertText.notServed(name, flag.daysSinceCalving) : fertText.repeat(name, flag.services)}</span>
                </button>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="chip-btn" onClick={() => setHiddenAlerts(snoozeAlert(farmKey, flag.id, todayStr))}>{fertText.snooze}</button>
                  <button type="button" className="chip-btn" onClick={() => setHiddenAlerts(dismissAlert(farmKey, flag.id))}>{fertText.dismiss}</button>
                </div>
              </div>
            );
          })}
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
            className="min-h-11 w-full rounded-xl border border-gray-200 text-sm font-semibold text-[#345C4A] hover:bg-[#F8F8F3]"
          >
            {showAllReminders
              ? (sw ? 'Onyesha chache' : 'Show fewer')
              : (sw ? `Onyesha zote (${sortedReminders.length})` : `Show all (${sortedReminders.length})`)}
          </button>
        )}
      </section>
      </>
      )}

      {money && <>
      {/* Financial Health Snapshot */}
      <div className="bg-[#14291F] text-white rounded-3xl p-5 shadow-sm space-y-3 border border-[#345C4A]/40">
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
            <span className="text-lg font-black text-[#8A6A10]">KSh {monthSales.billed.toLocaleString()}</span>
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
          <div className="p-3 bg-[#FCF6DC] rounded-xl border border-[#EED98E] flex items-center space-x-3">
            <span className="text-2xl font-black text-[#8A6A10] whitespace-nowrap">{dryCount}</span>
            <div className="text-sm font-semibold text-[#26332D]">
              {t.dashboard.dry}
            </div>
          </div>
          <div className="p-3 bg-[#EEF0E8] rounded-xl border border-[#DDE2D6] flex items-center space-x-3">
            <span className="text-2xl font-black text-[#26332D] whitespace-nowrap">{pregnantCount}</span>
            <div className="text-sm font-semibold text-[#26332D]">
              {t.dashboard.pregnant}
            </div>
          </div>
          <div className="p-3 bg-[#F8F8F3] rounded-xl border border-[#DDE2D6] flex items-center space-x-3">
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
