export type Language = 'en' | 'sw';

export type OperatingStyle = 'individual' | 'managed' | 'multi_farm';

export interface Farm {
  id: string;
  name: string;
  county: string;
  subCounty?: string;
  ownerName: string;
  phone: string;
  operatingStyle: OperatingStyle;
  preferredLanguage: Language;
  currency: string; // Default: 'KSh'
  createdAt: string;
}

export type CowStatus = 
  | 'lactating'
  | 'dry'
  | 'pregnant_heifer'
  | 'calf'
  | 'sick'
  | 'sold'
  | 'deceased'
  | 'archived';

export type Breed = 
  | 'Friesian'
  | 'Ayrshire'
  | 'Jersey'
  | 'Guernsey'
  | 'Sahiwal'
  | 'Boran'
  | 'Crossbreed'
  | 'Other';

export interface Cow {
  id: string;
  farmId: string;
  tag: string;
  name?: string;
  breed: Breed;
  sex: 'female' | 'male';
  dob?: string;
  approxAgeMonths?: number;
  status: CowStatus;
  isPregnant: boolean;
  expectedCalvingDate?: string;
  parity: number; // calving count
  damId?: string; // Mother tag
  sire?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
}

export type BuyerType = 'cooperative' | 'household' | 'trader';

export interface Buyer {
  id: string;
  farmId: string;
  name: string;
  type: BuyerType;
  phone?: string;
  ratePerLitre: number;
  deliverySchedule?: 'daily' | 'twice_daily' | 'on_demand';
  paymentCycle?: 'monthly' | 'weekly' | 'daily' | 'advance';
  currentBalance: number; // Positive = buyer owes farmer, Negative = advance
  notes?: string;
  createdAt: string;
}

export interface MilkAllocation {
  soldLitres: number;
  householdLitres: number;
  calvesLitres: number;
  wasteLitres: number;
}

export interface MilkEntry {
  id: string;
  farmId: string;
  date: string; // YYYY-MM-DD
  session: 'AM' | 'PM' | 'total';
  mode: 'farm_total' | 'cow_level';
  totalLitres: number;
  cowBreakdown?: {
    cowId: string;
    cowTag: string;
    cowName?: string;
    litres: number;
  }[];
  allocation?: MilkAllocation;
  notes?: string;
  synced: boolean;
  createdAt: string;
}

export interface Delivery {
  id: string;
  farmId: string;
  buyerId: string;
  buyerName: string;
  buyerType: BuyerType;
  date: string;
  litres: number;
  ratePerLitre: number;
  rejectedLitres: number;
  adjustmentKSh: number; // e.g. deductions or transport
  expectedAmount: number; // (litres - rejectedLitres) * rate + adjustment
  amountPaid: number;
  balance: number;
  synced: boolean;
  notes?: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  farmId: string;
  buyerId: string;
  buyerName: string;
  date: string;
  amount: number;
  paymentMethod: 'cash' | 'mpesa' | 'bank' | 'other';
  referenceNo?: string;
  notes?: string;
  synced: boolean;
  createdAt: string;
}

export type HealthEventType = 'vaccination' | 'treatment' | 'deworming' | 'routine_check';

export interface HealthEvent {
  id: string;
  farmId: string;
  cowId: string;
  cowTag: string;
  cowName?: string;
  date: string;
  type: HealthEventType;
  diagnosis?: string;
  medicineName?: string;
  administeredBy?: string; // Vet or farmer name
  costKSh?: number;
  nextDueDate?: string;
  withdrawalDays?: number; // Milk withdrawal days
  withdrawalEndDate?: string;
  isWithdrawalActive?: boolean;
  notes?: string;
  createdAt: string;
}

export type BreedingEventType = 
  | 'heat_observation'
  | 'insemination'
  | 'pregnancy_check'
  | 'calving'
  | 'dry_off';

export interface BreedingEvent {
  id: string;
  farmId: string;
  cowId: string;
  cowTag: string;
  cowName?: string;
  date: string;
  type: BreedingEventType;
  sireOrProvider?: string;
  pregnancyResult?: 'positive' | 'negative' | 'pending';
  expectedCalvingDate?: string;
  calvingOutcome?: 'heifer_calf' | 'bull_calf' | 'twins' | 'stillborn' | 'aborted';
  calfTag?: string;
  notes?: string;
  createdAt: string;
}

export type ExpenseCategory = 
  | 'feed'
  | 'veterinary'
  | 'labor'
  | 'transport'
  | 'maintenance'
  | 'other';

export interface ExpenseRecord {
  id: string;
  farmId: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'mpesa' | 'bank';
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface FarmReminder {
  id: string;
  farmId: string;
  type: 'vaccination' | 'deworming' | 'calving' | 'dry_off' | 'withdrawal' | 'payment_due' | 'coop_statement';
  title: string;
  description: string;
  dueDate: string;
  cowId?: string;
  cowTag?: string;
  severity: 'high' | 'medium' | 'info';
  completed: boolean;
  createdAt: string;
}

// Multi-tenant & Subscription Types
export type UserRole = 'super_admin' | 'farmer';
export type SubscriptionPlan = 'starter' | 'farmer' | 'farm_pro' | 'admin';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled';

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  monthlyPriceKsh: number;
  startDate: string;
  renewsAt: string;
  isAnnual?: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  role: UserRole;
  farmId: string;
  name: string;
  phone?: string;
  subscription: Subscription;
  createdAt: string;
}

// Platform CMS & Website Management Types
export interface Testimonial {
  id: string;
  farmerName: string;
  farmName: string;
  county: string;
  cowsCount: number;
  quote: string;
  quoteSw?: string;
  rating: number; // 1-5
  photoUrl?: string;
  isApproved: boolean;
  featured: boolean;
  createdAt: string;
}

export interface ContactLead {
  id: string;
  name: string;
  phone: string;
  county?: string;
  cowsCount?: number;
  preferredContact: 'whatsapp' | 'call' | 'sms';
  message?: string;
  source?: string;
  status: 'new' | 'contacted' | 'converted' | 'archived';
  createdAt: string;
}

export interface PlatformSettings {
  supportPhone: string;
  supportWhatsApp: string;
  supportEmail: string;
  starterPriceKsh: number;
  farmerPriceKsh: number;
  proPriceKsh: number;
  trialDays: number;
}


