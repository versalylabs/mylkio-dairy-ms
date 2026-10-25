'use client';

import { 
  Farm, 
  Cow, 
  Buyer, 
  MilkEntry, 
  Delivery, 
  PaymentRecord, 
  HealthEvent, 
  BreedingEvent, 
  ExpenseRecord, 
  FarmReminder, 
  Language,
  UserAccount,
  Testimonial,
  ContactLead,
  PlatformSettings,
  SubscriptionPlan
} from '@/types';
import { 
  initialFarm, 
  initialCows, 
  initialBuyers, 
  initialMilkEntries, 
  initialDeliveries, 
  initialPayments, 
  initialHealthEvents, 
  initialBreedingEvents, 
  initialExpenses, 
  initialReminders,
  initialAccounts,
  initialTestimonials,
  initialLeads,
  initialPlatformSettings
} from './mock-data';
import { SyncEngine } from './sync';

const STORAGE_KEYS = {
  ACTIVE_USER: 'mylkio_active_user',
  ACCOUNTS: 'mylkio_accounts',
  TESTIMONIALS: 'mylkio_testimonials',
  LEADS: 'mylkio_leads',
  SETTINGS: 'mylkio_platform_settings',
  LANGUAGE: 'mylkio_language',
  SYNC_STATUS: 'mylkio_sync_status',
  // Base prefixes for multi-tenant data
  FARM_PREFIX: 'mylkio_farm_',
  COWS_PREFIX: 'mylkio_cows_',
  BUYERS_PREFIX: 'mylkio_buyers_',
  MILK_PREFIX: 'mylkio_milk_',
  DELIVERIES_PREFIX: 'mylkio_deliv_',
  PAYMENTS_PREFIX: 'mylkio_pay_',
  HEALTH_PREFIX: 'mylkio_health_',
  BREEDING_PREFIX: 'mylkio_breed_',
  EXPENSES_PREFIX: 'mylkio_exp_',
  REMINDERS_PREFIX: 'mylkio_rem_',
};

export const AppStorage = {
  // ==========================================
  // AUTHENTICATION & MULTI-TENANCY MANAGEMENT
  // ==========================================

  getAccounts(): UserAccount[] {
    if (typeof window === 'undefined') return initialAccounts;
    const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(initialAccounts));
      return initialAccounts;
    }
    try {
      const parsed = JSON.parse(data);
      // Ensure master admin always exists
      const hasAdmin = parsed.some((a: UserAccount) => a.email === 'versalylabs@gmail.com');
      if (!hasAdmin) {
        parsed.unshift(initialAccounts[0]);
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return initialAccounts;
    }
  },

  saveAccounts(accounts: UserAccount[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    window.dispatchEvent(new Event('mylkio_accounts_changed'));
  },

  getActiveUser(): UserAccount | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setActiveUser(user: UserAccount | null) {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    }
    window.dispatchEvent(new Event('mylkio_auth_changed'));
  },

  login(email: string, password: string): { success: boolean; user?: UserAccount; error?: string } {
    const trimmedEmail = email.trim().toLowerCase();
    const accounts = this.getAccounts();

    // Verify Master Admin explicitly
    if (trimmedEmail === 'versalylabs@gmail.com') {
      if (password === 'labversaly-16') {
        const admin = accounts.find((a) => a.email === 'versalylabs@gmail.com') || initialAccounts[0];
        this.setActiveUser(admin);
        return { success: true, user: admin };
      }
      return { success: false, error: 'Invalid password for platform admin.' };
    }

    const found = accounts.find((a) => a.email.toLowerCase() === trimmedEmail);
    if (!found) {
      return { success: false, error: 'No account registered with this email address.' };
    }

    if (found.password && found.password !== password) {
      return { success: false, error: 'Incorrect password.' };
    }

    this.setActiveUser(found);
    return { success: true, user: found };
  },

  loginDemoUser(): UserAccount {
    const demoUser = this.getAccounts().find((a) => a.email === 'demo@mylkio.co.ke') || initialAccounts[1];
    this.setActiveUser(demoUser);
    return demoUser;
  },

  logout() {
    this.setActiveUser(null);
  },

  registerFarmer(data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    farmName: string;
    county: string;
    subCounty?: string;
    plan?: SubscriptionPlan;
  }): { success: boolean; user?: UserAccount; error?: string } {
    const accounts = this.getAccounts();
    const trimmedEmail = data.email.trim().toLowerCase();

    if (accounts.some((a) => a.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'An account with this email already exists. Please log in.' };
    }

    const newFarmId = `farm-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date();
    const renewsDate = new Date();
    renewsDate.setDate(now.getDate() + 14); // 14-day free trial

    const planPrices: Record<SubscriptionPlan, number> = {
      starter: 500,
      farmer: 1000,
      farm_pro: 2500,
      admin: 0,
    };

    const chosenPlan: SubscriptionPlan = data.plan || 'farmer';

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      email: trimmedEmail,
      password: data.password,
      role: 'farmer',
      farmId: newFarmId,
      name: data.name.trim(),
      phone: data.phone.trim(),
      subscription: {
        plan: chosenPlan,
        status: 'trial',
        monthlyPriceKsh: planPrices[chosenPlan],
        startDate: now.toISOString(),
        renewsAt: renewsDate.toISOString(),
      },
      createdAt: now.toISOString(),
    };

    const newFarm: Farm = {
      id: newFarmId,
      name: data.farmName.trim(),
      county: data.county.trim(),
      subCounty: data.subCounty?.trim() || undefined,
      ownerName: data.name.trim(),
      phone: data.phone.trim(),
      operatingStyle: 'individual',
      preferredLanguage: this.getLanguage(),
      currency: 'KSh',
      createdAt: now.toISOString(),
    };

    // Save empty tenant isolated data
    this.saveFarm(newFarm, newFarmId);
    this.saveTenantData(STORAGE_KEYS.COWS_PREFIX, newFarmId, []);
    this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, newFarmId, []);
    this.saveTenantData(STORAGE_KEYS.MILK_PREFIX, newFarmId, []);
    this.saveTenantData(STORAGE_KEYS.DELIVERIES_PREFIX, newFarmId, []);
    this.saveTenantData(STORAGE_KEYS.PAYMENTS_PREFIX, newFarmId, []);
    this.saveTenantData(STORAGE_KEYS.HEALTH_PREFIX, newFarmId, []);
    this.saveTenantData(STORAGE_KEYS.BREEDING_PREFIX, newFarmId, []);
    this.saveTenantData(STORAGE_KEYS.EXPENSES_PREFIX, newFarmId, []);
    this.saveTenantData(STORAGE_KEYS.REMINDERS_PREFIX, newFarmId, []);

    // Save account
    const updatedAccounts = [newUser, ...accounts];
    this.saveAccounts(updatedAccounts);
    this.setActiveUser(newUser);

    return { success: true, user: newUser };
  },

  updateAccountSubscription(
    accountId: string, 
    updates: { plan?: SubscriptionPlan; status?: UserAccount['subscription']['status']; renewsAt?: string }
  ) {
    const accounts = this.getAccounts();
    const idx = accounts.findIndex((a) => a.id === accountId);
    if (idx === -1) return;

    accounts[idx].subscription = {
      ...accounts[idx].subscription,
      ...updates,
    };

    this.saveAccounts(accounts);

    // If current active user updated, refresh
    const active = this.getActiveUser();
    if (active && active.id === accountId) {
      this.setActiveUser(accounts[idx]);
    }
  },

  getActiveFarmId(): string {
    const activeUser = this.getActiveUser();
    if (activeUser && activeUser.farmId && activeUser.role !== 'super_admin') {
      return activeUser.farmId;
    }
    return 'farm-green-hills'; // Default demo farm
  },

  // ==========================================
  // MULTI-TENANT LOCAL STORAGE HELPERS
  // ==========================================

  getTenantData<T>(prefix: string, farmId?: string, fallback: T = [] as unknown as T): T {
    if (typeof window === 'undefined') return fallback;
    const targetFarmId = farmId || this.getActiveFarmId();
    const key = `${prefix}${targetFarmId}`;
    const data = localStorage.getItem(key);

    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return fallback;
      }
    }

    // For demo farm, check legacy non-prefixed key or return initial mock
    if (targetFarmId === 'farm-green-hills') {
      const legacyKey = prefix.replace(/_$/, '');
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          localStorage.setItem(key, legacy);
          return parsed;
        } catch {
          // continue
        }
      }
      return fallback;
    }

    // For any new farm tenant, return empty data
    return fallback;
  },

  saveTenantData<T>(prefix: string, farmId: string | undefined, data: T) {
    if (typeof window === 'undefined') return;
    const targetFarmId = farmId || this.getActiveFarmId();
    const key = `${prefix}${targetFarmId}`;
    localStorage.setItem(key, JSON.stringify(data));
  },

  // ==========================================
  // LANGUAGE
  // ==========================================

  getLanguage(): Language {
    if (typeof window === 'undefined') return 'en';
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return (saved as Language) || 'en';
  },

  setLanguage(lang: Language) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    window.dispatchEvent(new Event('mylkio_language_changed'));
  },

  // ==========================================
  // FARM PROFILE (Tenant Scoped)
  // ==========================================

  getFarm(customFarmId?: string): Farm {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    if (targetFarmId === 'farm-green-hills') {
      return this.getTenantData<Farm>(STORAGE_KEYS.FARM_PREFIX, targetFarmId, initialFarm);
    }
    return this.getTenantData<Farm>(STORAGE_KEYS.FARM_PREFIX, targetFarmId, {
      id: targetFarmId,
      name: 'My Dairy Farm',
      county: 'Nakuru County',
      ownerName: 'Farmer',
      phone: '',
      operatingStyle: 'individual',
      preferredLanguage: this.getLanguage(),
      currency: 'KSh',
      createdAt: new Date().toISOString(),
    });
  },

  saveFarm(farm: Farm, customFarmId?: string) {
    const targetFarmId = customFarmId || farm.id || this.getActiveFarmId();
    this.saveTenantData(STORAGE_KEYS.FARM_PREFIX, targetFarmId, farm);
    window.dispatchEvent(new Event('mylkio_farm_changed'));
  },

  // ==========================================
  // COWS (Tenant Scoped)
  // ==========================================

  getCows(customFarmId?: string): Cow[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialCows : [];
    return this.getTenantData<Cow[]>(STORAGE_KEYS.COWS_PREFIX, targetFarmId, fallback);
  },

  addCow(cowData: Omit<Cow, 'id' | 'createdAt' | 'farmId'>, customFarmId?: string): Cow {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const cows = this.getCows(targetFarmId);
    const newCow: Cow = {
      ...cowData,
      id: `cow-${Date.now()}`,
      farmId: targetFarmId,
      createdAt: new Date().toISOString(),
    };
    const updated = [newCow, ...cows];
    this.saveTenantData(STORAGE_KEYS.COWS_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('cow', 'create', newCow);
    window.dispatchEvent(new Event('mylkio_cows_changed'));
    return newCow;
  },

  updateCow(id: string, updates: Partial<Cow>, customFarmId?: string): Cow | null {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const cows = this.getCows(targetFarmId);
    const index = cows.findIndex((c) => c.id === id);
    if (index === -1) return null;
    cows[index] = { ...cows[index], ...updates };
    this.saveTenantData(STORAGE_KEYS.COWS_PREFIX, targetFarmId, cows);
    SyncEngine.enqueue('cow', 'update', cows[index]);
    window.dispatchEvent(new Event('mylkio_cows_changed'));
    return cows[index];
  },

  deleteCow(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const cows = this.getCows(targetFarmId);
    const updated = cows.filter((c) => c.id !== id);
    this.saveTenantData(STORAGE_KEYS.COWS_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('cow', 'delete', { id });
    window.dispatchEvent(new Event('mylkio_cows_changed'));
  },

  // ==========================================
  // BUYERS (Tenant Scoped)
  // ==========================================

  getBuyers(customFarmId?: string): Buyer[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialBuyers : [];
    return this.getTenantData<Buyer[]>(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, fallback);
  },

  addBuyer(buyerData: Omit<Buyer, 'id' | 'createdAt' | 'farmId'>, customFarmId?: string): Buyer {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const buyers = this.getBuyers(targetFarmId);
    const newBuyer: Buyer = {
      ...buyerData,
      id: `buyer-${Date.now()}`,
      farmId: targetFarmId,
      createdAt: new Date().toISOString(),
    };
    const updated = [newBuyer, ...buyers];
    this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('buyer', 'create', newBuyer);
    window.dispatchEvent(new Event('mylkio_buyers_changed'));
    return newBuyer;
  },

  updateBuyer(id: string, updates: Partial<Buyer>, customFarmId?: string): Buyer | null {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const buyers = this.getBuyers(targetFarmId);
    const index = buyers.findIndex((b) => b.id === id);
    if (index === -1) return null;
    buyers[index] = { ...buyers[index], ...updates };
    this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, buyers);
    SyncEngine.enqueue('buyer', 'update', buyers[index]);
    window.dispatchEvent(new Event('mylkio_buyers_changed'));
    return buyers[index];
  },

  deleteBuyer(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const buyers = this.getBuyers(targetFarmId);
    const updated = buyers.filter((b) => b.id !== id);
    this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('buyer', 'delete', { id });
    window.dispatchEvent(new Event('mylkio_buyers_changed'));
  },

  // ==========================================
  // MILK ENTRIES (Tenant Scoped)
  // ==========================================

  getMilkEntries(customFarmId?: string): MilkEntry[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialMilkEntries : [];
    return this.getTenantData<MilkEntry[]>(STORAGE_KEYS.MILK_PREFIX, targetFarmId, fallback);
  },

  addMilkEntry(entryData: Omit<MilkEntry, 'id' | 'createdAt' | 'farmId' | 'synced'>, customFarmId?: string): MilkEntry {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const entries = this.getMilkEntries(targetFarmId);
    const newEntry: MilkEntry = {
      ...entryData,
      id: `milk-${Date.now()}`,
      farmId: targetFarmId,
      synced: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...entries];
    this.saveTenantData(STORAGE_KEYS.MILK_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('milk_entry', 'create', newEntry);
    window.dispatchEvent(new Event('mylkio_milk_changed'));
    return newEntry;
  },

  deleteMilkEntry(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const entries = this.getMilkEntries(targetFarmId);
    const updated = entries.filter((e) => e.id !== id);
    this.saveTenantData(STORAGE_KEYS.MILK_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('milk_entry', 'delete', { id });
    window.dispatchEvent(new Event('mylkio_milk_changed'));
  },

  // ==========================================
  // DELIVERIES & SALES (Tenant Scoped)
  // ==========================================

  getDeliveries(customFarmId?: string): Delivery[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialDeliveries : [];
    return this.getTenantData<Delivery[]>(STORAGE_KEYS.DELIVERIES_PREFIX, targetFarmId, fallback);
  },

  addDelivery(deliveryData: Omit<Delivery, 'id' | 'createdAt' | 'farmId' | 'synced'>, customFarmId?: string): Delivery {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const deliveries = this.getDeliveries(targetFarmId);
    const newDelivery: Delivery = {
      ...deliveryData,
      id: `deliv-${Date.now()}`,
      farmId: targetFarmId,
      synced: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [newDelivery, ...deliveries];
    this.saveTenantData(STORAGE_KEYS.DELIVERIES_PREFIX, targetFarmId, updated);

    // Update buyer balance
    const buyers = this.getBuyers(targetFarmId);
    const buyerIdx = buyers.findIndex((b) => b.id === deliveryData.buyerId);
    if (buyerIdx !== -1) {
      buyers[buyerIdx].currentBalance = (buyers[buyerIdx].currentBalance || 0) + deliveryData.balance;
      this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, buyers);
      window.dispatchEvent(new Event('mylkio_buyers_changed'));
    }

    SyncEngine.enqueue('delivery', 'create', newDelivery);
    window.dispatchEvent(new Event('mylkio_deliveries_changed'));
    return newDelivery;
  },

  deleteDelivery(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const deliveries = this.getDeliveries(targetFarmId);
    const deliv = deliveries.find((d) => d.id === id);
    if (deliv) {
      const buyers = this.getBuyers(targetFarmId);
      const buyerIdx = buyers.findIndex((b) => b.id === deliv.buyerId);
      if (buyerIdx !== -1) {
        buyers[buyerIdx].currentBalance = Math.max(0, (buyers[buyerIdx].currentBalance || 0) - deliv.balance);
        this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, buyers);
        window.dispatchEvent(new Event('mylkio_buyers_changed'));
      }
    }
    const updated = deliveries.filter((d) => d.id !== id);
    this.saveTenantData(STORAGE_KEYS.DELIVERIES_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('delivery', 'delete', { id });
    window.dispatchEvent(new Event('mylkio_deliveries_changed'));
  },

  // ==========================================
  // PAYMENTS RECEIVED (Tenant Scoped)
  // ==========================================

  getPayments(customFarmId?: string): PaymentRecord[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialPayments : [];
    return this.getTenantData<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS_PREFIX, targetFarmId, fallback);
  },

  addPayment(paymentData: Omit<PaymentRecord, 'id' | 'createdAt' | 'farmId' | 'synced'>, customFarmId?: string): PaymentRecord {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const payments = this.getPayments(targetFarmId);
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: `pay-${Date.now()}`,
      farmId: targetFarmId,
      synced: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [newPayment, ...payments];
    this.saveTenantData(STORAGE_KEYS.PAYMENTS_PREFIX, targetFarmId, updated);

    // Reduce buyer balance
    const buyers = this.getBuyers(targetFarmId);
    const buyerIdx = buyers.findIndex((b) => b.id === paymentData.buyerId);
    if (buyerIdx !== -1) {
      buyers[buyerIdx].currentBalance = (buyers[buyerIdx].currentBalance || 0) - paymentData.amount;
      this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, buyers);
      window.dispatchEvent(new Event('mylkio_buyers_changed'));
    }

    SyncEngine.enqueue('payment', 'create', newPayment);
    window.dispatchEvent(new Event('mylkio_payments_changed'));
    return newPayment;
  },

  deletePayment(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const payments = this.getPayments(targetFarmId);
    const pay = payments.find((p) => p.id === id);
    if (pay) {
      const buyers = this.getBuyers(targetFarmId);
      const buyerIdx = buyers.findIndex((b) => b.id === pay.buyerId);
      if (buyerIdx !== -1) {
        buyers[buyerIdx].currentBalance = (buyers[buyerIdx].currentBalance || 0) + pay.amount;
        this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, buyers);
        window.dispatchEvent(new Event('mylkio_buyers_changed'));
      }
    }
    const updated = payments.filter((p) => p.id !== id);
    this.saveTenantData(STORAGE_KEYS.PAYMENTS_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('payment', 'delete', { id });
    window.dispatchEvent(new Event('mylkio_payments_changed'));
  },

  // ==========================================
  // HEALTH & TREATMENTS (Tenant Scoped)
  // ==========================================

  getHealthEvents(customFarmId?: string): HealthEvent[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialHealthEvents : [];
    return this.getTenantData<HealthEvent[]>(STORAGE_KEYS.HEALTH_PREFIX, targetFarmId, fallback);
  },

  addHealthEvent(eventData: Omit<HealthEvent, 'id' | 'createdAt' | 'farmId'>, customFarmId?: string): HealthEvent {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const events = this.getHealthEvents(targetFarmId);
    const newEvent: HealthEvent = {
      ...eventData,
      id: `health-${Date.now()}`,
      farmId: targetFarmId,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEvent, ...events];
    this.saveTenantData(STORAGE_KEYS.HEALTH_PREFIX, targetFarmId, updated);

    // Auto-create reminder if withdrawal or next due date
    if (newEvent.withdrawalDays && newEvent.withdrawalDays > 0 && newEvent.withdrawalEndDate) {
      this.addReminder({
        type: 'withdrawal',
        title: `${newEvent.cowTag} Milk Treatment Withdrawal Active`,
        description: `${newEvent.medicineName || 'Treatment'} administered. Milk must NOT be sold until ${newEvent.withdrawalEndDate}.`,
        dueDate: newEvent.withdrawalEndDate,
        cowId: newEvent.cowId,
        cowTag: newEvent.cowTag,
        severity: 'high',
        completed: false,
      }, targetFarmId);
    }

    if (newEvent.nextDueDate) {
      this.addReminder({
        type: 'vaccination',
        title: `${newEvent.cowTag} Follow-up: ${newEvent.diagnosis || newEvent.medicineName || newEvent.type}`,
        description: `Next booster or examination due on ${newEvent.nextDueDate}.`,
        dueDate: newEvent.nextDueDate,
        cowId: newEvent.cowId,
        cowTag: newEvent.cowTag,
        severity: 'medium',
        completed: false,
      }, targetFarmId);
    }

    SyncEngine.enqueue('health_event', 'create', newEvent);
    window.dispatchEvent(new Event('mylkio_health_changed'));
    return newEvent;
  },

  deleteHealthEvent(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const events = this.getHealthEvents(targetFarmId);
    const updated = events.filter((e) => e.id !== id);
    this.saveTenantData(STORAGE_KEYS.HEALTH_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('health_event', 'delete', { id });
    window.dispatchEvent(new Event('mylkio_health_changed'));
  },

  // ==========================================
  // BREEDING & CALVING (Tenant Scoped)
  // ==========================================

  getBreedingEvents(customFarmId?: string): BreedingEvent[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialBreedingEvents : [];
    return this.getTenantData<BreedingEvent[]>(STORAGE_KEYS.BREEDING_PREFIX, targetFarmId, fallback);
  },

  addBreedingEvent(eventData: Omit<BreedingEvent, 'id' | 'createdAt' | 'farmId'>, customFarmId?: string): BreedingEvent {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const events = this.getBreedingEvents(targetFarmId);
    const newEvent: BreedingEvent = {
      ...eventData,
      id: `breed-${Date.now()}`,
      farmId: targetFarmId,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEvent, ...events];
    this.saveTenantData(STORAGE_KEYS.BREEDING_PREFIX, targetFarmId, updated);

    // If pregnancy confirmed positive or AI recorded with expected date, update Cow & create Reminder
    if (newEvent.expectedCalvingDate) {
      this.updateCow(newEvent.cowId, {
        isPregnant: newEvent.pregnancyResult !== 'negative',
        expectedCalvingDate: newEvent.expectedCalvingDate,
      }, targetFarmId);

      this.addReminder({
        type: 'calving',
        title: `${newEvent.cowTag} Projected Calving Date`,
        description: `Projected delivery date: ${newEvent.expectedCalvingDate}. Prepare clean maternity pen and transition feed.`,
        dueDate: newEvent.expectedCalvingDate,
        cowId: newEvent.cowId,
        cowTag: newEvent.cowTag,
        severity: 'high',
        completed: false,
      }, targetFarmId);
    }

    SyncEngine.enqueue('breeding_event', 'create', newEvent);
    window.dispatchEvent(new Event('mylkio_breeding_changed'));
    return newEvent;
  },

  deleteBreedingEvent(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const events = this.getBreedingEvents(targetFarmId);
    const updated = events.filter((e) => e.id !== id);
    this.saveTenantData(STORAGE_KEYS.BREEDING_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('breeding_event', 'delete', { id });
    window.dispatchEvent(new Event('mylkio_breeding_changed'));
  },

  // ==========================================
  // EXPENSES (Tenant Scoped)
  // ==========================================

  getExpenses(customFarmId?: string): ExpenseRecord[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialExpenses : [];
    return this.getTenantData<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES_PREFIX, targetFarmId, fallback);
  },

  addExpense(expenseData: Omit<ExpenseRecord, 'id' | 'createdAt' | 'farmId'>, customFarmId?: string): ExpenseRecord {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const expenses = this.getExpenses(targetFarmId);
    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      farmId: targetFarmId,
      createdAt: new Date().toISOString(),
    };
    const updated = [newExpense, ...expenses];
    this.saveTenantData(STORAGE_KEYS.EXPENSES_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('expense', 'create', newExpense);
    window.dispatchEvent(new Event('mylkio_expenses_changed'));
    return newExpense;
  },

  deleteExpense(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const expenses = this.getExpenses(targetFarmId);
    const updated = expenses.filter((e) => e.id !== id);
    this.saveTenantData(STORAGE_KEYS.EXPENSES_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('expense', 'delete', { id });
    window.dispatchEvent(new Event('mylkio_expenses_changed'));
  },

  // ==========================================
  // REMINDERS (Tenant Scoped)
  // ==========================================

  getReminders(customFarmId?: string): FarmReminder[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialReminders : [];
    return this.getTenantData<FarmReminder[]>(STORAGE_KEYS.REMINDERS_PREFIX, targetFarmId, fallback);
  },

  addReminder(remData: Omit<FarmReminder, 'id' | 'createdAt' | 'farmId'>, customFarmId?: string): FarmReminder {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const reminders = this.getReminders(targetFarmId);
    const newReminder: FarmReminder = {
      ...remData,
      id: `rem-${Date.now()}`,
      farmId: targetFarmId,
      createdAt: new Date().toISOString(),
    };
    const updated = [newReminder, ...reminders];
    this.saveTenantData(STORAGE_KEYS.REMINDERS_PREFIX, targetFarmId, updated);
    window.dispatchEvent(new Event('mylkio_reminders_changed'));
    return newReminder;
  },

  toggleReminder(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const reminders = this.getReminders(targetFarmId);
    const index = reminders.findIndex((r) => r.id === id);
    if (index === -1) return;
    reminders[index].completed = !reminders[index].completed;
    this.saveTenantData(STORAGE_KEYS.REMINDERS_PREFIX, targetFarmId, reminders);
    window.dispatchEvent(new Event('mylkio_reminders_changed'));
  },

  deleteReminder(id: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const reminders = this.getReminders(targetFarmId);
    const updated = reminders.filter((r) => r.id !== id);
    this.saveTenantData(STORAGE_KEYS.REMINDERS_PREFIX, targetFarmId, updated);
    window.dispatchEvent(new Event('mylkio_reminders_changed'));
  },

  // ==========================================
  // WEBSITE CMS & ADMIN PLATFORM TOOLS
  // ==========================================

  getTestimonials(): Testimonial[] {
    if (typeof window === 'undefined') return initialTestimonials;
    const data = localStorage.getItem(STORAGE_KEYS.TESTIMONIALS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(initialTestimonials));
      return initialTestimonials;
    }
    try {
      return JSON.parse(data);
    } catch {
      return initialTestimonials;
    }
  },

  saveTestimonials(testimonials: Testimonial[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.TESTIMONIALS, JSON.stringify(testimonials));
    window.dispatchEvent(new Event('mylkio_testimonials_changed'));
  },

  addTestimonial(data: Omit<Testimonial, 'id' | 'createdAt'>): Testimonial {
    const list = this.getTestimonials();
    const newItem: Testimonial = {
      ...data,
      id: `test-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    this.saveTestimonials(updated);
    return newItem;
  },

  updateTestimonial(id: string, updates: Partial<Testimonial>) {
    const list = this.getTestimonials();
    const idx = list.findIndex((t) => t.id === id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...updates };
    this.saveTestimonials(list);
  },

  deleteTestimonial(id: string) {
    const list = this.getTestimonials();
    this.saveTestimonials(list.filter((t) => t.id !== id));
  },

  getLeads(): ContactLead[] {
    if (typeof window === 'undefined') return initialLeads;
    const data = localStorage.getItem(STORAGE_KEYS.LEADS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(initialLeads));
      return initialLeads;
    }
    try {
      return JSON.parse(data);
    } catch {
      return initialLeads;
    }
  },

  saveLeads(leads: ContactLead[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
    window.dispatchEvent(new Event('mylkio_leads_changed'));
  },

  addLead(data: Omit<ContactLead, 'id' | 'createdAt'>): ContactLead {
    const leads = this.getLeads();
    const newLead: ContactLead = {
      ...data,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newLead, ...leads];
    this.saveLeads(updated);
    return newLead;
  },

  updateLeadStatus(id: string, status: ContactLead['status']) {
    const leads = this.getLeads();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return;
    leads[idx].status = status;
    this.saveLeads(leads);
  },

  deleteLead(id: string) {
    const leads = this.getLeads();
    this.saveLeads(leads.filter((l) => l.id !== id));
  },

  getPlatformSettings(): PlatformSettings {
    if (typeof window === 'undefined') return initialPlatformSettings;
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialPlatformSettings));
      return initialPlatformSettings;
    }
    try {
      const parsed = JSON.parse(data);
      if (parsed.supportPhone === '+254 712 345 678' || !parsed.supportPhone || parsed.supportPhone === '+254 700 123 456') {
        parsed.supportPhone = '+254 184 129145';
        parsed.supportWhatsApp = '+254 184 129145';
        parsed.supportEmail = 'versalylabs@gmail.com';
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return initialPlatformSettings;
    }
  },

  updatePlatformSettings(settings: Partial<PlatformSettings>) {
    const current = this.getPlatformSettings();
    const updated = { ...current, ...settings };
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    window.dispatchEvent(new Event('mylkio_settings_changed'));
  },

  resetToDemo() {
    if (typeof window === 'undefined') return;
    const demoFarmId = 'farm-green-hills';
    this.saveFarm(initialFarm, demoFarmId);
    this.saveTenantData(STORAGE_KEYS.COWS_PREFIX, demoFarmId, initialCows);
    this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, demoFarmId, initialBuyers);
    this.saveTenantData(STORAGE_KEYS.MILK_PREFIX, demoFarmId, initialMilkEntries);
    this.saveTenantData(STORAGE_KEYS.DELIVERIES_PREFIX, demoFarmId, initialDeliveries);
    this.saveTenantData(STORAGE_KEYS.PAYMENTS_PREFIX, demoFarmId, initialPayments);
    this.saveTenantData(STORAGE_KEYS.HEALTH_PREFIX, demoFarmId, initialHealthEvents);
    this.saveTenantData(STORAGE_KEYS.BREEDING_PREFIX, demoFarmId, initialBreedingEvents);
    this.saveTenantData(STORAGE_KEYS.EXPENSES_PREFIX, demoFarmId, initialExpenses);
    this.saveTenantData(STORAGE_KEYS.REMINDERS_PREFIX, demoFarmId, initialReminders);

    window.dispatchEvent(new Event('mylkio_farm_changed'));
    window.dispatchEvent(new Event('mylkio_cows_changed'));
    window.dispatchEvent(new Event('mylkio_buyers_changed'));
    window.dispatchEvent(new Event('mylkio_milk_changed'));
    window.dispatchEvent(new Event('mylkio_deliveries_changed'));
    window.dispatchEvent(new Event('mylkio_payments_changed'));
    window.dispatchEvent(new Event('mylkio_health_changed'));
    window.dispatchEvent(new Event('mylkio_breeding_changed'));
    window.dispatchEvent(new Event('mylkio_expenses_changed'));
    window.dispatchEvent(new Event('mylkio_reminders_changed'));
  },

  clearCurrentTenant() {
    const targetFarmId = this.getActiveFarmId();
    this.saveTenantData(STORAGE_KEYS.COWS_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.MILK_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.DELIVERIES_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.PAYMENTS_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.HEALTH_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.BREEDING_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.EXPENSES_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.REMINDERS_PREFIX, targetFarmId, []);

    window.dispatchEvent(new Event('mylkio_cows_changed'));
    window.dispatchEvent(new Event('mylkio_buyers_changed'));
    window.dispatchEvent(new Event('mylkio_milk_changed'));
    window.dispatchEvent(new Event('mylkio_deliveries_changed'));
    window.dispatchEvent(new Event('mylkio_payments_changed'));
    window.dispatchEvent(new Event('mylkio_health_changed'));
    window.dispatchEvent(new Event('mylkio_breeding_changed'));
    window.dispatchEvent(new Event('mylkio_expenses_changed'));
    window.dispatchEvent(new Event('mylkio_reminders_changed'));
  },

  clearAll() {
    this.clearCurrentTenant();
  }
};
