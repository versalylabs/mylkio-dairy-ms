'use client';

import React, { useState, useEffect } from 'react';
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
  PlatformSettings
} from '@/types';
import { AppStorage } from '@/lib/storage';
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
    setLang(AppStorage.getLanguage());
    setTestimonials(AppStorage.getTestimonials());
    setPlatformSettings(AppStorage.getPlatformSettings());
  };

  useEffect(() => {
    setMounted(true);
    refreshData();

    // Register Service Worker for PWA offline readiness
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
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

    return () => {
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
    };
  }, [impersonatedFarmId]);

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

  const handleLogout = () => {
    AppStorage.logout();
    setCurrentUser(null);
    setImpersonatedFarmId(null);
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
    AppStorage.deleteBuyer(id, currentTargetFarmId);
  };

  // Milk Entry actions
  const handleSaveMilkEntry = (entry: Omit<MilkEntry, 'id' | 'createdAt' | 'farmId' | 'synced'>) => {
    AppStorage.addMilkEntry(entry, currentTargetFarmId);
  };

  const handleDeleteMilkEntry = (id: string) => {
    AppStorage.deleteMilkEntry(id, currentTargetFarmId);
  };

  // Delivery actions
  const handleSaveDelivery = (deliv: Omit<Delivery, 'id' | 'createdAt' | 'farmId' | 'synced'>) => {
    AppStorage.addDelivery(deliv, currentTargetFarmId);
  };

  const handleDeleteDelivery = (id: string) => {
    AppStorage.deleteDelivery(id, currentTargetFarmId);
  };

  // Payment actions
  const handleSavePayment = (pay: Omit<PaymentRecord, 'id' | 'createdAt' | 'farmId' | 'synced'>) => {
    AppStorage.addPayment(pay, currentTargetFarmId);
  };

  const handleDeletePayment = (id: string) => {
    AppStorage.deletePayment(id, currentTargetFarmId);
  };

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
        onImpersonateFarm={(farmId) => {
          setImpersonatedFarmId(farmId);
          refreshData();
        }}
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
      {activeTab === 'home' && (
        <DashboardView
          cows={cows}
          buyers={buyers}
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
          onDeleteEntry={handleDeleteMilkEntry}
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
          buyers={buyers}
          deliveries={deliveries}
          payments={payments}
          onOpenAddBuyer={handleOpenAddBuyer}
          onEditBuyer={handleEditBuyer}
          onDeleteBuyer={handleDeleteBuyer}
          onOpenRecordDelivery={() => setIsRecordDeliveryModalOpen(true)}
          onDeleteDelivery={handleDeleteDelivery}
          onOpenRecordPayment={() => setIsRecordPaymentModalOpen(true)}
          onDeletePayment={handleDeletePayment}
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
        lang={lang}
      />

      <RecordDeliveryModal
        isOpen={isRecordDeliveryModalOpen}
        onClose={() => setIsRecordDeliveryModalOpen(false)}
        onSave={handleSaveDelivery}
        buyers={buyers}
        lang={lang}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        onSave={handleSavePayment}
        buyers={buyers}
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
        lang={lang}
      />
    </Shell>
  );
}
