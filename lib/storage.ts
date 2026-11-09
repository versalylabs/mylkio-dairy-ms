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
  SubscriptionPlan,
  CoopStatement,
  CustomerBill,
  PaymentAllocation,
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
  initialStatements,
  initialBills,
  initialAllocations,
  initialAccounts,
  initialTestimonials,
  initialLeads,
  initialPlatformSettings
} from './mock-data';
import { SyncEngine } from './sync';
import { SecureAuth } from './auth-client';
import { CloudStore } from './cloud-store';
import type { BucketName } from './backend-contract';
import { farmToday } from './dates';
import { findMilkOverlaps } from './milk';
import { LEDGER_VERSION, deliveryCharge, migrateLegacyLedger, receiptForDelivery, roundMoney } from './ledger';
import type { DateRange } from './dates';
import { allowedAllocation, assertBillable, billedDeliveryIds, draftBill, openTargets, overlappingStatement, type OpenTarget } from './settlements';

const bucketForPrefix: Record<string, BucketName> = {
  mylkio_farm_: 'farm', mylkio_cows_: 'cows', mylkio_buyers_: 'buyers', mylkio_milk_: 'milk',
  mylkio_deliv_: 'deliveries', mylkio_pay_: 'payments', mylkio_health_: 'health',
  mylkio_breed_: 'breeding', mylkio_exp_: 'expenses', mylkio_rem_: 'reminders',
  mylkio_stmt_: 'statements', mylkio_bill_: 'bills', mylkio_alloc_: 'allocations',
};

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
  STATEMENTS_PREFIX: 'mylkio_stmt_',
  BILLS_PREFIX: 'mylkio_bill_',
  ALLOCATIONS_PREFIX: 'mylkio_alloc_',
};

export const AppStorage = {
  // ==========================================
  // AUTHENTICATION & MULTI-TENANCY MANAGEMENT
  // ==========================================

  // Legacy account lists are not an identity or authorization source.
  getAccounts(): UserAccount[] { return []; },
  saveAccounts(_accounts: UserAccount[]) { throw new Error('Use the protected administration API.'); },
  getActiveUser(): UserAccount | null { return SecureAuth.user(); },
  login: SecureAuth.login,
  loginDemoUser: () => SecureAuth.demo(),
  logout: () => SecureAuth.logout(),
  registerFarmer(data: { name: string; email: string; password: string; phone: string; farmName: string; county: string; subCounty?: string; plan?: SubscriptionPlan; inviteCode?: string }) {
    return SecureAuth.register({ ...data, language: this.getLanguage() });
  },
  updateAccountSubscription(_accountId: string, _updates: unknown) {
    throw new Error('Use the protected administration API.');
  },

  getActiveFarmId(): string {
    const activeUser = this.getActiveUser();
    if (activeUser && activeUser.farmId && activeUser.role !== 'super_admin') {
      return activeUser.farmId;
    }
    return SecureAuth.user()?.farmId || 'farm-green-hills'; // Demo context only; protected accounts come from a verified session.
  },

  // ==========================================
  // MULTI-TENANT LOCAL STORAGE HELPERS
  // ==========================================

  getTenantData<T>(prefix: string, farmId?: string, fallback: T = [] as unknown as T): T {
    if (typeof window === 'undefined') return fallback;
    const targetFarmId = farmId || this.getActiveFarmId();
    if (targetFarmId !== 'farm-green-hills') {
      return CloudStore.read(targetFarmId, bucketForPrefix[prefix], fallback);
    }
    // Demo writes use their own namespace (v3: Phase 4 demo data); never read or overwrite legacy farmer records.
    const data = localStorage.getItem(`mylkio_demo_v3_${prefix}`);
    if (!data) return structuredClone(fallback);
    try { return JSON.parse(data); } catch { return structuredClone(fallback); }
  },

  saveTenantData<T>(prefix: string, farmId: string | undefined, data: T) {
    if (typeof window === 'undefined') return;
    const targetFarmId = farmId || this.getActiveFarmId();
    if (targetFarmId === 'farm-green-hills') {
      if (SecureAuth.user()?.id !== 'usr-demo-01') throw new Error('Open the demo before changing demo records.');
      localStorage.setItem(`mylkio_demo_v3_${prefix}`, JSON.stringify(data));
      return;
    }
    CloudStore.write(targetFarmId, bucketForPrefix[prefix], data);
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
      id: crypto.randomUUID(),
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
    const buyers = this.getTenantData<Buyer[]>(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, fallback);
    if (buyers.every((b) => b.ledgerVersion === LEDGER_VERSION)) return buyers;
    // One-time move from legacy running balances to the ledger (see lib/ledger.ts).
    const migrated = migrateLegacyLedger(buyers, this.getDeliveries(targetFarmId), this.getPayments(targetFarmId), new Date().toISOString());
    try {
      this.saveTenantData(STORAGE_KEYS.PAYMENTS_PREFIX, targetFarmId, migrated.payments);
      this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, migrated.buyers);
    } catch {
      // Not writable yet (e.g. demo not opened). The in-memory result stays consistent.
    }
    return migrated.buyers;
  },

  addBuyer(buyerData: Omit<Buyer, 'id' | 'createdAt' | 'farmId'>, customFarmId?: string): Buyer {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const buyers = this.getBuyers(targetFarmId);
    const opening = roundMoney(buyerData.openingBalance ?? 0);
    const newBuyer: Buyer = {
      ...buyerData,
      openingBalance: opening,
      openingBalanceDate: buyerData.openingBalanceDate ?? farmToday(),
      currentBalance: opening,
      ledgerVersion: LEDGER_VERSION,
      id: crypto.randomUUID(),
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
    // The balance is derived from the ledger; only the opening balance is editable.
    const { currentBalance: _ignored, ledgerVersion: _version, ...editable } = updates;
    buyers[index] = { ...buyers[index], ...editable };
    this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, buyers);
    SyncEngine.enqueue('buyer', 'update', buyers[index]);
    window.dispatchEvent(new Event('mylkio_buyers_changed'));
    return buyers[index];
  },

  /** Removes a buyer only when it has no ledger history; otherwise history must be kept. */
  deleteBuyer(id: string, customFarmId?: string): { deleted: boolean; reason?: string } {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const hasHistory =
      this.getDeliveries(targetFarmId).some((d) => d.buyerId === id) ||
      this.getPayments(targetFarmId).some((p) => p.buyerId === id);
    if (hasHistory) {
      return { deleted: false, reason: 'This buyer has deliveries or payments on record. Their history must be kept, so the buyer cannot be deleted.' };
    }
    const buyers = this.getBuyers(targetFarmId);
    const updated = buyers.filter((b) => b.id !== id);
    this.saveTenantData(STORAGE_KEYS.BUYERS_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('buyer', 'delete', { id });
    window.dispatchEvent(new Event('mylkio_buyers_changed'));
    return { deleted: true };
  },

  // ==========================================
  // MILK ENTRIES (Tenant Scoped)
  // ==========================================

  getMilkEntries(customFarmId?: string): MilkEntry[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialMilkEntries : [];
    return this.getTenantData<MilkEntry[]>(STORAGE_KEYS.MILK_PREFIX, targetFarmId, fallback);
  },

  /**
   * Adds a milk record. `replaceIds` are overlapping entries the farmer chose to
   * replace; they are voided (kept for history), never deleted. Any other overlap
   * is refused so the same milk is never counted twice.
   */
  addMilkEntry(
    entryData: Omit<MilkEntry, 'id' | 'createdAt' | 'farmId' | 'synced'>,
    customFarmId?: string,
    options: { replaceIds?: string[] } = {},
  ): MilkEntry {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const entries = this.getMilkEntries(targetFarmId);
    const now = new Date().toISOString();
    const replace = new Set(options.replaceIds ?? []);
    const unresolved = findMilkOverlaps(entries, entryData.date, entryData.session).filter((e) => !replace.has(e.id));
    if (unresolved.length > 0) {
      throw new Error('This milk is already recorded for that date and session. Choose to replace the existing record.');
    }
    const newEntry: MilkEntry = {
      ...entryData,
      id: crypto.randomUUID(),
      farmId: targetFarmId,
      synced: false,
      createdAt: now,
    };
    const label = entryData.session === 'total' ? 'day total' : entryData.session;
    const updated = [
      newEntry,
      ...entries.map((e) =>
        replace.has(e.id) && !e.voidedAt
          ? { ...e, voidedAt: now, voidReason: `Replaced by ${entryData.totalLitres} L ${label} entry`, replacedById: newEntry.id }
          : e,
      ),
    ];
    this.saveTenantData(STORAGE_KEYS.MILK_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('milk_entry', 'create', newEntry);
    window.dispatchEvent(new Event('mylkio_milk_changed'));
    return newEntry;
  },

  voidMilkEntry(id: string, reason: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const entries = this.getMilkEntries(targetFarmId);
    const updated = entries.map((e) => (e.id === id && !e.voidedAt ? { ...e, voidedAt: new Date().toISOString(), voidReason: reason } : e));
    this.saveTenantData(STORAGE_KEYS.MILK_PREFIX, targetFarmId, updated);
    SyncEngine.enqueue('milk_entry', 'update', { id });
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

  /**
   * Records a delivery. Money paid on the spot becomes one linked receipt; buyer
   * balances are derived from the ledger, so no balance is edited here.
   */
  addDelivery(
    deliveryData: Omit<Delivery, 'id' | 'createdAt' | 'farmId' | 'synced'>,
    customFarmId?: string,
    paymentMethod: PaymentRecord['paymentMethod'] = 'cash',
  ): Delivery {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    this.getBuyers(targetFarmId); // the ledger migration must run before new records
    if (deliveryData.rejectedLitres > deliveryData.litres) throw new Error('Rejected litres cannot exceed delivered litres.');
    const deliveries = this.getDeliveries(targetFarmId);
    const createdAt = new Date().toISOString();
    const charge = deliveryCharge(deliveryData);
    const paid = roundMoney(Math.max(0, deliveryData.amountPaid || 0));
    const newDelivery: Delivery = {
      ...deliveryData,
      expectedAmount: charge,
      amountPaid: paid,
      balance: roundMoney(charge - paid),
      id: crypto.randomUUID(),
      farmId: targetFarmId,
      synced: false,
      createdAt,
    };
    this.saveTenantData(STORAGE_KEYS.DELIVERIES_PREFIX, targetFarmId, [newDelivery, ...deliveries]);
    const receipt = receiptForDelivery(newDelivery, createdAt);
    if (receipt) {
      this.saveTenantData(STORAGE_KEYS.PAYMENTS_PREFIX, targetFarmId, [{ ...receipt, paymentMethod }, ...this.getPayments(targetFarmId)]);
      window.dispatchEvent(new Event('mylkio_payments_changed'));
    }
    SyncEngine.enqueue('delivery', 'create', newDelivery);
    window.dispatchEvent(new Event('mylkio_deliveries_changed'));
    return newDelivery;
  },

  /** Voids a delivery and the receipt taken with it. Both remain in history. */
  voidDelivery(id: string, reason: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    if (billedDeliveryIds(this.getBills(targetFarmId)).has(id)) {
      throw new Error('This delivery is on a customer bill. Void the bill first, then void the delivery.');
    }
    const now = new Date().toISOString();
    const deliveries = this.getDeliveries(targetFarmId);
    this.saveTenantData(
      STORAGE_KEYS.DELIVERIES_PREFIX,
      targetFarmId,
      deliveries.map((d) => (d.id === id && !d.voidedAt ? { ...d, voidedAt: now, voidReason: reason } : d)),
    );
    const payments = this.getPayments(targetFarmId);
    if (payments.some((p) => p.deliveryId === id && !p.voidedAt)) {
      this.saveTenantData(
        STORAGE_KEYS.PAYMENTS_PREFIX,
        targetFarmId,
        payments.map((p) => (p.deliveryId === id && !p.voidedAt ? { ...p, voidedAt: now, voidReason: `Delivery voided: ${reason}` } : p)),
      );
      window.dispatchEvent(new Event('mylkio_payments_changed'));
    }
    SyncEngine.enqueue('delivery', 'update', { id });
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

  addPayment(
    paymentData: Omit<PaymentRecord, 'id' | 'createdAt' | 'farmId' | 'synced'>,
    customFarmId?: string,
    allocateTo?: { kind: 'statement' | 'bill'; id: string },
  ): PaymentRecord {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    this.getBuyers(targetFarmId); // the ledger migration must run before new records
    const payments = this.getPayments(targetFarmId);
    const newPayment: PaymentRecord = {
      ...paymentData,
      amount: roundMoney(paymentData.amount),
      source: 'receipt',
      id: crypto.randomUUID(),
      farmId: targetFarmId,
      synced: false,
      createdAt: new Date().toISOString(),
    };
    this.saveTenantData(STORAGE_KEYS.PAYMENTS_PREFIX, targetFarmId, [newPayment, ...payments]);
    if (allocateTo) {
      const target = this.getOpenTargets(newPayment.buyerId, targetFarmId).find((t) => t.kind === allocateTo.kind && t.id === allocateTo.id);
      if (target) this.allocatePayment(newPayment.id, target, newPayment.amount, targetFarmId);
    }
    SyncEngine.enqueue('payment', 'create', newPayment);
    window.dispatchEvent(new Event('mylkio_payments_changed'));
    return newPayment;
  },

  voidPayment(id: string, reason: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const payments = this.getPayments(targetFarmId);
    this.saveTenantData(
      STORAGE_KEYS.PAYMENTS_PREFIX,
      targetFarmId,
      payments.map((p) => (p.id === id && !p.voidedAt ? { ...p, voidedAt: new Date().toISOString(), voidReason: reason } : p)),
    );
    SyncEngine.enqueue('payment', 'update', { id });
    window.dispatchEvent(new Event('mylkio_payments_changed'));
  },

  // ==========================================
  // CO-OP STATEMENTS, CUSTOMER BILLS, ALLOCATIONS (Tenant Scoped)
  // ==========================================

  getStatements(customFarmId?: string): CoopStatement[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialStatements : [];
    return this.getTenantData<CoopStatement[]>(STORAGE_KEYS.STATEMENTS_PREFIX, targetFarmId, fallback);
  },

  addStatement(data: Omit<CoopStatement, 'id' | 'farmId' | 'synced' | 'createdAt'>, customFarmId?: string): CoopStatement {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const statements = this.getStatements(targetFarmId);
    if (data.periodFrom > data.periodTo) throw new Error('The statement period ends before it starts.');
    if (data.statementLitres < 0 || data.ratePerLitre <= 0) throw new Error('Enter the statement litres and rate per litre.');
    const clash = overlappingStatement(statements, data.buyerId, { from: data.periodFrom, to: data.periodTo });
    if (clash) throw new Error(`${data.buyerName} already has a statement for ${clash.periodFrom} to ${clash.periodTo}. Void it first if it was wrong.`);
    const statement: CoopStatement = { ...data, id: crypto.randomUUID(), farmId: targetFarmId, synced: false, createdAt: new Date().toISOString() };
    this.saveTenantData(STORAGE_KEYS.STATEMENTS_PREFIX, targetFarmId, [statement, ...statements]);
    window.dispatchEvent(new Event('mylkio_settlements_changed'));
    return statement;
  },

  voidStatement(id: string, reason: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const now = new Date().toISOString();
    this.saveTenantData(STORAGE_KEYS.STATEMENTS_PREFIX, targetFarmId,
      this.getStatements(targetFarmId).map((s) => (s.id === id && !s.voidedAt ? { ...s, voidedAt: now, voidReason: reason } : s)));
    window.dispatchEvent(new Event('mylkio_settlements_changed'));
  },

  getBills(customFarmId?: string): CustomerBill[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialBills : [];
    return this.getTenantData<CustomerBill[]>(STORAGE_KEYS.BILLS_PREFIX, targetFarmId, fallback);
  },

  /** Bills every unbilled delivery of a buyer in the period. A delivery can only be billed once. */
  createBill(buyerId: string, range: DateRange, dueDate?: string, customFarmId?: string): CustomerBill {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const buyer = this.getBuyers(targetFarmId).find((b) => b.id === buyerId);
    if (!buyer) throw new Error('Choose a customer to bill.');
    const bills = this.getBills(targetFarmId);
    const draft = draftBill(buyer, this.getDeliveries(targetFarmId), bills, range, dueDate);
    assertBillable(draft, bills);
    const bill: CustomerBill = { ...draft, id: crypto.randomUUID(), farmId: targetFarmId, synced: false, createdAt: new Date().toISOString() };
    this.saveTenantData(STORAGE_KEYS.BILLS_PREFIX, targetFarmId, [bill, ...bills]);
    window.dispatchEvent(new Event('mylkio_settlements_changed'));
    return bill;
  },

  voidBill(id: string, reason: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const now = new Date().toISOString();
    this.saveTenantData(STORAGE_KEYS.BILLS_PREFIX, targetFarmId,
      this.getBills(targetFarmId).map((b) => (b.id === id && !b.voidedAt ? { ...b, voidedAt: now, voidReason: reason } : b)));
    window.dispatchEvent(new Event('mylkio_settlements_changed'));
  },

  getAllocations(customFarmId?: string): PaymentAllocation[] {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const fallback = targetFarmId === 'farm-green-hills' ? initialAllocations : [];
    return this.getTenantData<PaymentAllocation[]>(STORAGE_KEYS.ALLOCATIONS_PREFIX, targetFarmId, fallback);
  },

  allocationContext(customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    return {
      payments: this.getPayments(targetFarmId),
      allocations: this.getAllocations(targetFarmId),
      statements: this.getStatements(targetFarmId),
      bills: this.getBills(targetFarmId),
    };
  },

  getOpenTargets(buyerId: string, customFarmId?: string): OpenTarget[] {
    return openTargets(buyerId, this.allocationContext(customFarmId));
  },

  /** Applies up to `amount` of a payment to a statement or bill (never more than either has left). */
  allocatePayment(paymentId: string, target: OpenTarget, amount: number, customFarmId?: string): PaymentAllocation {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const ctx = this.allocationContext(targetFarmId);
    const payment = ctx.payments.find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment not found.');
    const allocation: PaymentAllocation = {
      id: crypto.randomUUID(),
      farmId: targetFarmId,
      paymentId,
      buyerId: payment.buyerId,
      targetKind: target.kind,
      targetId: target.id,
      amount: allowedAllocation(payment, target, amount, ctx),
      synced: false,
      createdAt: new Date().toISOString(),
    };
    this.saveTenantData(STORAGE_KEYS.ALLOCATIONS_PREFIX, targetFarmId, [allocation, ...ctx.allocations]);
    window.dispatchEvent(new Event('mylkio_settlements_changed'));
    return allocation;
  },

  voidAllocation(id: string, reason: string, customFarmId?: string) {
    const targetFarmId = customFarmId || this.getActiveFarmId();
    const now = new Date().toISOString();
    this.saveTenantData(STORAGE_KEYS.ALLOCATIONS_PREFIX, targetFarmId,
      this.getAllocations(targetFarmId).map((a) => (a.id === id && !a.voidedAt ? { ...a, voidedAt: now, voidReason: reason } : a)));
    window.dispatchEvent(new Event('mylkio_settlements_changed'));
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
    if (SecureAuth.user()?.id !== 'usr-demo-01') throw new Error('Demo reset is only available in demo mode.');
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
    this.saveTenantData(STORAGE_KEYS.STATEMENTS_PREFIX, demoFarmId, initialStatements);
    this.saveTenantData(STORAGE_KEYS.BILLS_PREFIX, demoFarmId, initialBills);
    this.saveTenantData(STORAGE_KEYS.ALLOCATIONS_PREFIX, demoFarmId, initialAllocations);
    window.dispatchEvent(new Event('mylkio_settlements_changed'));

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
    if (SecureAuth.user()?.id !== 'usr-demo-01') throw new Error('Bulk deletion of real farm data is disabled.');
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
    this.saveTenantData(STORAGE_KEYS.STATEMENTS_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.BILLS_PREFIX, targetFarmId, []);
    this.saveTenantData(STORAGE_KEYS.ALLOCATIONS_PREFIX, targetFarmId, []);
    window.dispatchEvent(new Event('mylkio_settlements_changed'));

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

// Actions that change several kinds of record at once are uploaded as one group, so
// the cloud never holds half of them (e.g. a delivery without the receipt taken with
// it, or migrated buyer balances without their payments).
function groupInCloud<T extends object>(target: T, names: (keyof T)[]) {
  for (const name of names) {
    const original = target[name] as unknown as (...args: unknown[]) => unknown;
    (target as Record<keyof T, unknown>)[name] = function (this: T, ...args: unknown[]) {
      return CloudStore.group(() => original.apply(this, args));
    };
  }
}
groupInCloud(AppStorage, ['getBuyers', 'addDelivery', 'voidDelivery', 'addPayment', 'addHealthEvent', 'addBreedingEvent']);
