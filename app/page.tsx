'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Cow, 
  Buyer, 
  Farm, 
  MilkEntry, 
  Delivery, 
  PaymentRecord, 
  HealthEvent, 
  BreedingEvent, 
  ExpenseRecord, 
  FarmReminder, 
  Language,
  UserAccount,
  SubscriptionPlan,
  Testimonial,
  PlatformSettings,
  CoopStatement,
  CustomerBill,
  PaymentAllocation,
} from '@/types';
import type { OpenTarget } from '@/lib/settlements';
import { AppStorage } from '@/lib/storage';
import { SecureAuth } from '@/lib/auth-client';
import { withLedgerBalances } from '@/lib/ledger';
import { sessionLabel } from '@/lib/milk';
import { formatFarmDate, farmToday } from '@/lib/dates';
import { CloudSaveNotice } from '@/components/sync/CloudSaveNotice';
import { Shell } from '@/components/layout/Shell';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { HerdView } from '@/components/herd/HerdView';
import { CowModal } from '@/components/herd/CowModal';
import { HealthModal } from '@/components/herd/HealthModal';
import { BreedingModal } from '@/components/herd/BreedingModal';
import { MilkView } from '@/components/milk/MilkView';
import { RecordMilkModal } from '@/components/milk/RecordMilkModal';
import { SalesView } from '@/components/sales/SalesView';
import { RecordDeliveryModal } from '@/components/sales/RecordDeliveryModal';
import { RecordPaymentModal } from '@/components/sales/RecordPaymentModal';
import { BuyerModal } from '@/components/buyers/BuyerModal';
import { FinanceView } from '@/components/finance/FinanceView';
import { ExpenseModal } from '@/components/finance/ExpenseModal';
import { ExportModal } from '@/components/export/ExportModal';
import { SettingsView } from '@/components/settings/SettingsView';
import { PlatformAdminView } from '@/components/admin/PlatformAdminView';
import { MarketingLandingPage } from '@/components/marketing/MarketingLandingPage';
import { AuthModal } from '@/components/auth/AuthModal';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [impersonatedFarmId, setImpersonatedFarmId] = useState<string | null>(null);

  // Marketing & Auth state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [authModalPlan, setAuthModalPlan] = useState<SubscriptionPlan>('farmer');
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(AppStorage.getPlatformSettings());

  // Farm data states
  const [activeTab, setActiveTab] = useState<'home' | 'milk' | 'herd' | 'sales' | 'finance' | 'settings'>('home');
  const [lang, setLang] = useState<Language>('en');
  const [farm, setFarm] = useState<Farm>(AppStorage.getFarm());
  const [cows, setCows] = useState<Cow[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [milkEntries, setMilkEntries] = useState<MilkEntry[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [breedingEvents, setBreedingEvents] = useState<BreedingEvent[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [reminders, setReminders] = useState<FarmReminder[]>([]);
  const [statements, setStatements] = useState<CoopStatement[]>([]);
  const [bills, setBills] = useState<CustomerBill[]>([]);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);

  // Modals state
  const [isCowModalOpen, setIsCowModalOpen] = useState(false);
  const [cowToEdit, setCowToEdit] = useState<Cow | null>(null);

  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [buyerToEdit, setBuyerToEdit] = useState<Buyer | null>(null);

  const [isRecordMilkModalOpen, setIsRecordMilkModalOpen] = useState(false);
  const [isRecordDeliveryModalOpen, setIsRecordDeliveryModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isBreedingModalOpen, setIsBreedingModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Buyer balances are always derived from the ledger, never from a stored total.
  const ledgerBuyers = useMemo(() => withLedgerBalances(buyers, deliveries, payments, statements), [buyers, deliveries, payments, statements]);

  const currentTargetFarmId = impersonatedFarmId || (currentUser?.farmId) || 'farm-green-hills';

  const refreshData = () => {
    const user = AppStorage.getActiveUser();
    setCurrentUser(user);

    const activeFarmId = impersonatedFarmId || (user?.role === 'super_admin' ? 'farm-green-hills' : user?.farmId) || 'farm-green-hills';

    setFarm(AppStorage.getFarm(activeFarmId));
    setCows(AppStorage.getCows(activeFarmId));
    setBuyers(AppStorage.getBuyers(activeFarmId));
    setMilkEntries(AppStorage.getMilkEntries(activeFarmId));
    setDeliveries(AppStorage.getDeliveries(activeFarmId));
    setPayments(AppStorage.getPayments(activeFarmId));
    setHealthEvents(AppStorage.getHealthEvents(activeFarmId));
    setBreedingEvents(AppStorage.getBreedingEvents(activeFarmId));
    setExpenses(AppStorage.getExpenses(activeFarmId));
    setReminders(AppStorage.getReminders(activeFarmId));
    setStatements(AppStorage.getStatements(activeFarmId));
    setBills(AppStorage.getBills(activeFarmId));
    setAllocations(AppStorage.getAllocations(activeFarmId));
    setLang(AppStorage.getLanguage());
    setTestimonials(AppStorage.getTestimonials());
    setPlatformSettings(AppStorage.getPlatformSettings());
  };

  useEffect(() => {
    let cancelled = false;
    void SecureAuth.initialize().then(() => {
      if (!cancelled) refreshData();
    }).catch((error) => {
      if (!cancelled) setAccountError(error instanceof Error ? error.message : 'Could not load account.');
    }).finally(() => { if (!cancelled) setMounted(true); });

    // Service worker for PWA offline readiness. Not used in development, where chunk names
    // change on every start; any worker left over from an earlier session is removed.
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      } else {
        void navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => void r.unregister()));
        void caches.keys().then((keys) => keys.filter((k) => k.startsWith('mylkio-cache-')).forEach((k) => void caches.delete(k)));
      }
    }

    const handleStorageChange = () => refreshData();
    window.addEventListener('mylkio_auth_changed', handleStorageChange);
    window.addEventListener('mylkio_cows_changed', handleStorageChange);
    window.addEventListener('mylkio_buyers_changed', handleStorageChange);
    window.addEventListener('mylkio_farm_changed', handleStorageChange);
    window.addEventListener('mylkio_language_changed', handleStorageChange);
    window.addEventListener('mylkio_milk_changed', handleStorageChange);
    window.addEventListener('mylkio_deliveries_changed', handleStorageChange);
    window.addEventListener('mylkio_payments_changed', handleStorageChange);
    window.addEventListener('mylkio_health_changed', handleStorageChange);
    window.addEventListener('mylkio_breeding_changed', handleStorageChange);
    window.addEventListener('mylkio_expenses_changed', handleStorageChange);
    window.addEventListener('mylkio_reminders_changed', handleStorageChange);
    window.addEventListener('mylkio_testimonials_changed', handleStorageChange);
    window.addEventListener('mylkio_settings_changed', handleStorageChange);
    window.addEventListener('mylkio_farm_data_synced', handleStorageChange);
    window.addEventListener('mylkio_settlements_changed', handleStorageChange);

    return () => {
      cancelled = true;
      window.removeEventListener('mylkio_auth_changed', handleStorageChange);
      window.removeEventListener('mylkio_cows_changed', handleStorageChange);
      window.removeEventListener('mylkio_buyers_changed', handleStorageChange);
      window.removeEventListener('mylkio_farm_changed', handleStorageChange);
      window.removeEventListener('mylkio_language_changed', handleStorageChange);
      window.removeEventListener('mylkio_milk_changed', handleStorageChange);
      window.removeEventListener('mylkio_deliveries_changed', handleStorageChange);
      window.removeEventListener('mylkio_payments_changed', handleStorageChange);
      window.removeEventListener('mylkio_health_changed', handleStorageChange);
      window.removeEventListener('mylkio_breeding_changed', handleStorageChange);
      window.removeEventListener('mylkio_expenses_changed', handleStorageChange);
      window.removeEventListener('mylkio_reminders_changed', handleStorageChange);
      window.removeEventListener('mylkio_testimonials_changed', handleStorageChange);
      window.removeEventListener('mylkio_settings_changed', handleStorageChange);
      window.removeEventListener('mylkio_farm_data_synced', handleStorageChange);
      window.removeEventListener('mylkio_settlements_changed', handleStorageChange);
    };
  }, [impersonatedFarmId]);

  const run = (action: () => void, success?: string) => {
    try {
      action();
      if (success) setNotice({ kind: 'success', text: success });
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not save this record.' });
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-dairy-700 text-white font-black text-2xl flex items-center justify-center animate-pulse">
            M
          </div>
          <span className="text-sm font-semibold text-slate-500">Loading Mylkio Dairy MS...</span>
        </div>
      </div>
    );
  }

  const handleDemoLoginClick = () => {
    const demo = AppStorage.loginDemoUser();
    setCurrentUser(demo);
    setImpersonatedFarmId(null);
    refreshData();
  };

  const handleLogout = async () => {
    try {
      await AppStorage.logout();
      setCurrentUser(null);
      setImpersonatedFarmId(null);
      setAccountError('');
    } catch (error) { setAccountError(error instanceof Error ? error.message : 'Could not sign out.'); }
  };

  const handleLanguageToggle = () => {
    const nextLang: Language = lang === 'en' ? 'sw' : 'en';
    setLang(nextLang);
    AppStorage.setLanguage(nextLang);
  };

  // Cow actions
  const handleSaveCow = (cowData: Omit<Cow, 'id' | 'createdAt' | 'farmId'>) => {
    if (cowToEdit) {
      AppStorage.updateCow(cowToEdit.id, cowData, currentTargetFarmId);
    } else {
      AppStorage.addCow(cowData, currentTargetFarmId);
    }
    setCowToEdit(null);
  };

  const handleOpenAddCow = () => {
    setCowToEdit(null);
    setIsCowModalOpen(true);
  };

  const handleEditCow = (cow: Cow) => {
    setCowToEdit(cow);
    setIsCowModalOpen(true);
  };

  const handleDeleteCow = (id: string) => {
    AppStorage.deleteCow(id, currentTargetFarmId);
  };

  // Buyer actions
  const handleSaveBuyer = (buyerData: Omit<Buyer, 'id' | 'createdAt' | 'farmId'>) => {
    if (buyerToEdit) {
      AppStorage.updateBuyer(buyerToEdit.id, buyerData, currentTargetFarmId);
    } else {
      AppStorage.addBuyer(buyerData, currentTargetFarmId);
    }
    setBuyerToEdit(null);
  };

  const handleOpenAddBuyer = () => {
    setBuyerToEdit(null);
    setIsBuyerModalOpen(true);
  };

  const handleEditBuyer = (buyer: Buyer) => {
    setBuyerToEdit(buyer);
    setIsBuyerModalOpen(true);
  };

  const handleDeleteBuyer = (id: string) => {
    const result = AppStorage.deleteBuyer(id, currentTargetFarmId);
    if (!result.deleted) setNotice({ kind: 'error', text: result.reason || 'This buyer cannot be deleted.' });
  };

  // Milk Entry actions
  const handleSaveMilkEntry = (entry: Omit<MilkEntry, 'id' | 'createdAt' | 'farmId' | 'synced'>, replaceIds: string[] = []) => {
    const isToday = entry.date === farmToday();
    const sessionName = entry.session === 'total' ? (lang === 'sw' ? 'jumla ya siku' : 'day total') : entry.session;
    const when = isToday
      ? (lang === 'sw' ? sessionLabel(entry.session, 'sw') : `for ${sessionLabel(entry.session)}`)
      : `(${sessionName}, ${formatFarmDate(entry.date, lang)})`;
    const replaced = replaceIds.length
      ? (lang === 'sw' ? ' — rekodi ya awali imebadilishwa' : ` and replaced ${replaceIds.length} earlier record${replaceIds.length > 1 ? 's' : ''}`)
      : '';
    const text = lang === 'sw' ? `Lita ${entry.totalLitres} zimehifadhiwa ${when}${replaced}` : `Saved ${entry.totalLitres} L ${when}${replaced}`;
    run(() => AppStorage.addMilkEntry(entry, currentTargetFarmId, { replaceIds }), text);
  };

  const handleVoidMilkEntry = (id: string, reason: string) => {
    run(() => AppStorage.voidMilkEntry(id, reason, currentTargetFarmId), lang === 'sw' ? 'Rekodi imebatilishwa. Inabaki kwenye historia lakini haihesabiwi.' : 'Milk record voided. It stays in history but is no longer counted.');
  };

  // Delivery actions
  const handleSaveDelivery = (deliv: Omit<Delivery, 'id' | 'createdAt' | 'farmId' | 'synced'>, paymentMethod: PaymentRecord['paymentMethod']) => {
    const accepted = Math.max(0, deliv.litres - deliv.rejectedLitres);
    run(() => AppStorage.addDelivery(deliv, currentTargetFarmId, paymentMethod), lang === 'sw'
      ? `Utoaji umehifadhiwa: lita ${accepted} zimekubaliwa na ${deliv.buyerName}`
      : `Saved delivery: ${accepted} L accepted by ${deliv.buyerName}`);
  };

  const handleVoidDelivery = (id: string, reason: string) => {
    run(() => AppStorage.voidDelivery(id, reason, currentTargetFarmId), lang === 'sw' ? 'Utoaji umebatilishwa. Unabaki kwenye historia lakini haudaiwi.' : 'Delivery voided. It stays in history but is no longer billed.');
  };

  // Payment actions
  const handleSavePayment = (pay: Omit<PaymentRecord, 'id' | 'createdAt' | 'farmId' | 'synced'>, allocateTo?: { kind: 'statement' | 'bill'; id: string }) => {
    run(() => AppStorage.addPayment(pay, currentTargetFarmId, allocateTo), lang === 'sw'
      ? `Malipo ya KSh ${pay.amount.toLocaleString()} kutoka kwa ${pay.buyerName} yamehifadhiwa`
      : `Saved KSh ${pay.amount.toLocaleString()} received from ${pay.buyerName}`);
  };

  const handleVoidPayment = (id: string, reason: string) => {
    run(() => AppStorage.voidPayment(id, reason, currentTargetFarmId), lang === 'sw' ? 'Malipo yamebatilishwa. Yanabaki kwenye historia lakini hayahesabiwi.' : 'Payment voided. It stays in history but is no longer counted.');
  };

  // Settlements: co-op statements, customer bills, payment allocations
  const tryRun = (action: () => void, success: string) => {
    try {
      action();
      setNotice({ kind: 'success', text: success });
      return true;
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'Could not save this record.' });
      return false;
    }
  };

  const handleSaveStatement = (st: Omit<CoopStatement, 'id' | 'farmId' | 'synced' | 'createdAt'>) =>
    tryRun(() => AppStorage.addStatement(st, currentTargetFarmId),
      lang === 'sw' ? `Taarifa ya ${st.buyerName} imehifadhiwa` : `Saved ${st.buyerName} statement for ${st.periodFrom} to ${st.periodTo}`);

  const handleCreateBill = (buyerId: string, range: { from: string; to: string }, dueDate?: string) =>
    tryRun(() => { AppStorage.createBill(buyerId, range, dueDate, currentTargetFarmId); },
      lang === 'sw' ? 'Bili imetengenezwa' : 'Bill created. Its deliveries cannot be billed again.');

  const handleAllocate = (paymentId: string, target: OpenTarget, amount: number) =>
    tryRun(() => { AppStorage.allocatePayment(paymentId, target, amount, currentTargetFarmId); },
      lang === 'sw' ? `KSh ${amount.toLocaleString()} imeunganishwa` : `Applied KSh ${amount.toLocaleString()} to ${target.label}`);

  // Health actions
  const handleSaveHealth = (event: Omit<HealthEvent, 'id' | 'createdAt' | 'farmId'>) => {
    AppStorage.addHealthEvent(event, currentTargetFarmId);
  };

  const handleDeleteHealth = (id: string) => {
    AppStorage.deleteHealthEvent(id, currentTargetFarmId);
  };

  // Breeding actions
  const handleSaveBreeding = (event: Omit<BreedingEvent, 'id' | 'createdAt' | 'farmId'>) => {
    AppStorage.addBreedingEvent(event, currentTargetFarmId);
  };

  const handleDeleteBreeding = (id: string) => {
    AppStorage.deleteBreedingEvent(id, currentTargetFarmId);
  };

  // Expense actions
  const handleSaveExpense = (exp: Omit<ExpenseRecord, 'id' | 'createdAt' | 'farmId'>) => {
    AppStorage.addExpense(exp, currentTargetFarmId);
  };

  const handleDeleteExpense = (id: string) => {
    AppStorage.deleteExpense(id, currentTargetFarmId);
  };

  // ========================================================
  // 1. NOT LOGGED IN -> MARKETING LANDING PAGE + AUTH MODAL
  // ========================================================
  if (!currentUser) {
    return (
      <>
        {accountError && <div role="alert" className="bg-amber-50 p-4 text-center text-sm text-amber-950">{accountError}<button className="ml-3 underline" onClick={() => window.location.reload()}>Retry</button></div>}
        <MarketingLandingPage
          onOpenAuth={(mode, plan) => {
            setAuthModalMode(mode);
            if (plan) setAuthModalPlan(plan);
            setIsAuthModalOpen(true);
          }}
          onExploreDemo={handleDemoLoginClick}
          testimonials={testimonials}
          settings={platformSettings}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          initialPlan={authModalPlan}
          onSuccess={(user) => {
            setCurrentUser(user);
            setImpersonatedFarmId(null);
            refreshData();
          }}
        />
      </>
    );
  }

  // ========================================================
  // 2. LOGGED IN AS SUPER ADMIN -> PLATFORM MASTER PORTAL
  // ========================================================
  if (currentUser.role === 'super_admin' && !impersonatedFarmId) {
    return (
      <PlatformAdminView
        onLogout={handleLogout}
        onImpersonateFarm={() => {}}
      />
    );
  }

  // ========================================================
  // 3. LOGGED IN AS FARMER (OR ADMIN INSPECTING FARM)
  // ========================================================
  return (
    <Shell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      lang={lang}
      onLanguageToggle={handleLanguageToggle}
      onOpenExport={() => setIsExportModalOpen(true)}
      farm={farm}
      user={currentUser}
      onLogout={handleLogout}
      isSuperAdminViewing={Boolean(impersonatedFarmId && currentUser.role === 'super_admin')}
      onReturnToAdmin={() => {
        setImpersonatedFarmId(null);
        refreshData();
      }}
    >
      <CloudSaveNotice />
      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold flex items-center justify-between gap-3 ${notice.kind === 'error' ? 'bg-rose-700 text-white' : 'bg-[#26332D] text-white'}`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline text-xs opacity-80 shrink-0" aria-label="Dismiss message">OK</button>
        </div>
      )}
      {accountError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm">{accountError}</p>}
      {activeTab === 'home' && (
        <DashboardView
          cows={cows}
          buyers={ledgerBuyers}
          milkEntries={milkEntries}
          deliveries={deliveries}
          payments={payments}
          expenses={expenses}
          reminders={reminders}
          onToggleReminder={(id) => AppStorage.toggleReminder(id, currentTargetFarmId)}
          onNavigate={setActiveTab}
          onOpenRecordMilk={() => setIsRecordMilkModalOpen(true)}
          onOpenRecordDelivery={() => setIsRecordDeliveryModalOpen(true)}
          onOpenRecordPayment={() => setIsRecordPaymentModalOpen(true)}
          onOpenAddCow={handleOpenAddCow}
          onOpenAddBuyer={handleOpenAddBuyer}
          lang={lang}
          farm={farm}
          user={currentUser}
        />
      )}

      {activeTab === 'milk' && (
        <MilkView
          entries={milkEntries}
          cows={cows}
          onOpenRecordModal={() => setIsRecordMilkModalOpen(true)}
          onVoidEntry={handleVoidMilkEntry}
          lang={lang}
        />
      )}

      {activeTab === 'herd' && (
        <HerdView
          cows={cows}
          healthEvents={healthEvents}
          breedingEvents={breedingEvents}
          milkEntries={milkEntries}
          onAddCow={handleOpenAddCow}
          onEditCow={handleEditCow}
          onDeleteCow={handleDeleteCow}
          onOpenRecordHealth={() => setIsHealthModalOpen(true)}
          onDeleteHealth={handleDeleteHealth}
          onOpenRecordBreeding={() => setIsBreedingModalOpen(true)}
          onDeleteBreeding={handleDeleteBreeding}
          lang={lang}
        />
      )}

      {activeTab === 'sales' && (
        <SalesView
          buyers={ledgerBuyers}
          deliveries={deliveries}
          payments={payments}
          onOpenAddBuyer={handleOpenAddBuyer}
          onEditBuyer={handleEditBuyer}
          onDeleteBuyer={handleDeleteBuyer}
          onOpenRecordDelivery={() => setIsRecordDeliveryModalOpen(true)}
          onVoidDelivery={handleVoidDelivery}
          onOpenRecordPayment={() => setIsRecordPaymentModalOpen(true)}
          onVoidPayment={handleVoidPayment}
          statements={statements}
          bills={bills}
          allocations={allocations}
          farm={farm}
          onSaveStatement={handleSaveStatement}
          onVoidStatement={(id, reason) => run(() => AppStorage.voidStatement(id, reason, currentTargetFarmId), lang === 'sw' ? 'Taarifa imebatilishwa' : 'Statement voided.')}
          onCreateBill={handleCreateBill}
          onVoidBill={(id, reason) => run(() => AppStorage.voidBill(id, reason, currentTargetFarmId), lang === 'sw' ? 'Bili imebatilishwa' : 'Bill voided. Its deliveries can be billed again.')}
          onAllocate={handleAllocate}
          lang={lang}
        />
      )}

      {activeTab === 'finance' && (
        <FinanceView
          expenses={expenses}
          deliveries={deliveries}
          payments={payments}
          onOpenRecordExpense={() => setIsExpenseModalOpen(true)}
          onDeleteExpense={handleDeleteExpense}
          lang={lang}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsView
          farm={farm}
          onUpdateFarm={(updated) => AppStorage.saveFarm(updated, currentTargetFarmId)}
          lang={lang}
          onLanguageChange={(l) => {
            setLang(l);
            AppStorage.setLanguage(l);
          }}
          user={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Modals */}
      <CowModal
        isOpen={isCowModalOpen}
        onClose={() => {
          setIsCowModalOpen(false);
          setCowToEdit(null);
        }}
        onSave={handleSaveCow}
        cowToEdit={cowToEdit}
        lang={lang}
      />

      <BuyerModal
        isOpen={isBuyerModalOpen}
        onClose={() => {
          setIsBuyerModalOpen(false);
          setBuyerToEdit(null);
        }}
        onSave={handleSaveBuyer}
        buyerToEdit={buyerToEdit}
        lang={lang}
      />

      <RecordMilkModal
        isOpen={isRecordMilkModalOpen}
        onClose={() => setIsRecordMilkModalOpen(false)}
        onSave={handleSaveMilkEntry}
        cows={cows}
        entries={milkEntries}
        healthEvents={healthEvents}
        lang={lang}
      />

      <RecordDeliveryModal
        isOpen={isRecordDeliveryModalOpen}
        onClose={() => setIsRecordDeliveryModalOpen(false)}
        onSave={handleSaveDelivery}
        buyers={ledgerBuyers}
        lang={lang}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        onSave={handleSavePayment}
        buyers={ledgerBuyers}
        payments={payments}
        openTargetsFor={(buyerId) => AppStorage.getOpenTargets(buyerId, currentTargetFarmId)}
        lang={lang}
      />

      <HealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        onSave={handleSaveHealth}
        cows={cows}
        lang={lang}
      />

      <BreedingModal
        isOpen={isBreedingModalOpen}
        onClose={() => setIsBreedingModalOpen(false)}
        onSave={handleSaveBreeding}
        cows={cows}
        lang={lang}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSave={handleSaveExpense}
        lang={lang}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        farm={farm}
        cows={cows}
        buyers={buyers}
        milk={milkEntries}
        deliveries={deliveries}
        payments={payments}
        health={healthEvents}
        breeding={breedingEvents}
        expenses={expenses}
        reminders={reminders}
        statements={statements}
        bills={bills}
        allocations={allocations}
        lang={lang}
      />
    </Shell>
  );
}
