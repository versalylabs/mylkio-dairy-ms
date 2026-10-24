'use client';

import React, { useState } from 'react';
import { Testimonial, PlatformSettings } from '@/types';
import { AppStorage } from '@/lib/storage';
import { 
  CheckCircle2, 
  ArrowRight, 
  Tractor, 
  Milk, 
  Users, 
  Truck, 
  ShieldCheck, 
  Calendar, 
  DollarSign, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  MessageCircle, 
  FileText, 
  Activity, 
  AlertTriangle, 
  Check, 
  Layers, 
  Smartphone, 
  Menu, 
  X,
  TrendingUp,
  Receipt,
  ChevronRight
} from 'lucide-react';

interface MarketingLandingPageProps {
  onOpenAuth: (mode: 'login' | 'signup', plan?: 'starter' | 'farmer' | 'farm_pro') => void;
  onExploreDemo: () => void;
  testimonials: Testimonial[];
  settings: PlatformSettings;
}

export const MarketingLandingPage: React.FC<MarketingLandingPageProps> = ({
  onOpenAuth,
  onExploreDemo,
  testimonials,
  settings,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'dashboard' | 'milk' | 'herd' | 'sales' | 'finance'>('dashboard');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Lead magnet modal
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadCounty, setLeadCounty] = useState('');
  const [leadCows, setLeadCows] = useState<string>('5');
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const approvedTestimonials = testimonials.filter((t) => t.isApproved);

  const cleanPhone = settings.supportWhatsApp.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hello%20Versaly,%20I'm%20interested%20in%20Mylkio%20Dairy%20Management%20System%20for%20my%20farm.`;

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadPhone.trim()) return;

    AppStorage.addLead({
      name: leadName.trim(),
      phone: leadPhone.trim(),
      county: leadCounty.trim() || undefined,
      cowsCount: Number(leadCows) || undefined,
      preferredContact: 'whatsapp',
      message: 'Downloaded Free Dairy Farm Record-Keeping Checklist',
      source: 'Lead Magnet Modal',
      status: 'new',
    });

    setLeadSubmitted(true);
  };

  const handleDownloadChecklistDirectly = () => {
    const content = `MYLKIO FREE DAIRY FARM RECORD-KEEPING CHECKLIST
Developed by Versaly Labs for Kenyan Dairy Farmers
==================================================

DAILY OPERATIONS:
[ ] 1. Morning Yield Recorded (Farm Total or Cow-by-Cow)
[ ] 2. Evening Yield Recorded
[ ] 3. Milk Allocation Logged (Co-op Delivery, Direct Buyers, Calf feeding, Household)
[ ] 4. Co-op Delivery Chit verified (recorded litres vs driver slip)

WEEKLY HEALTH & HYGIENE:
[ ] 5. Teat dipping & mastitis California Mastitis Test (CMT) check
[ ] 6. Milk withdrawal inspection (cows receiving PenStrep or other antibiotics)
[ ] 7. Feed stock audit (Dairy meal, silage, Rhodes grass, mineral salts)

MONTHLY RECONCILIATION:
[ ] 8. Co-op payout statement reconciled against delivery log
[ ] 9. Feed & vet operating expenses tallied against milk income
[ ] 10. AI pregnancy check due dates verified (60-90 days post-insemination)

Get full digital automation with Mylkio: https://mylkio.co.ke
Support WhatsApp: ${settings.supportWhatsApp}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Mylkio_Dairy_Record_Checklist_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const faqs = [
    {
      q: 'Do I need computer skills to use Mylkio?',
      a: 'Not at all. Mylkio is built specifically for smartphones with big touch buttons, clear Kenyan farming terms (like chits, morning/evening milking, and cooperatives), and simple screens that take less than 20 seconds to fill out.',
    },
    {
      q: 'Can I use Mylkio on my Android phone when offline?',
      a: 'Yes! Mylkio is a Progressive Web App (PWA) with built-in offline synchronization. You can record milk and deliveries in the cowshed even with zero internet signal. All records are saved securely on your phone and automatically sync when connectivity returns.',
    },
    {
      q: 'Can I record farm milk totals without entering each cow individually?',
      a: 'Yes. Most Kenyan farmers record a single morning and evening farm total. Mylkio defaults to farm-total entry for speed (<20s), while also giving you a one-click toggle to log individual cows when you want to see top performers.',
    },
    {
      q: 'How does Mylkio prevent cooperative payment disputes?',
      a: 'Every delivery to your co-op or collection centre is saved with the date, shift, delivered litres, and driver deductions. At month-end, you have an exact delivery tally to compare against the cooperative payment slip, ensuring you are paid for every single drop.',
    },
    {
      q: 'How does the milk withdrawal period warning work?',
      a: 'When you log a veterinary treatment (e.g. PenStrep for mastitis), Mylkio calculates the withdrawal period and displays a prominent warning banner on your dashboard and milk screen every morning until the withdrawal expires, preventing costly cooperative milk rejection penalties.',
    },
    {
      q: 'How much does Mylkio cost?',
      a: 'Plans start at just KSh 500/month for small herds, KSh 1,000/month for growing farms (up to 25 cows), and KSh 2,500/month for larger commercial herds. Every new account begins with a 14-day free trial with no payment required upfront.',
    },
    {
      q: 'Is my farm data private and safe?',
      a: 'Yes. Your farm records are isolated in your own private tenant account. You can export complete backups in CSV or JSON anytime with one click for safekeeping.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F4EA] text-[#2D3327] font-sans antialiased selection:bg-[#e4ebd9] selection:text-[#2D3327]">
      
      {/* ======================================================== */}
      {/* 1. TOP NAVIGATION BAR (AIRY, MINIMAL, REVENUECAT STYLE) */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#dedbc9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Brand Wordmark */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#2D3327] flex items-center justify-center text-white font-bold text-base shadow-sm">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-lg text-[#2D3327] tracking-tight">Mylkio</span>
                <span className="text-[10px] uppercase font-medium tracking-wider px-2 py-0.5 rounded-full bg-[#dedbc9] text-[#596455]">
                  Kenya
                </span>
              </div>
              <p className="text-[11px] text-[#626c59] font-normal">A product by Versaly</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-normal text-[#2D3327]">
            <a href="#features" className="hover:text-[#48563A] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#48563A] transition-colors">How It Works</a>
            <a href="#payments" className="hover:text-[#48563A] transition-colors">Milk Sales</a>
            <a href="#pricing" className="hover:text-[#48563A] transition-colors">Pricing</a>
            <a href="#faqs" className="hover:text-[#48563A] transition-colors">FAQs</a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={() => onOpenAuth('login')}
              className="text-sm font-medium text-[#48563A] hover:text-[#3a462e] transition-colors flex items-center gap-1"
            >
              <span>Sign In</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onExploreDemo}
              className="px-4 py-2 rounded-full text-xs font-medium border border-[#dedbc9] bg-white hover:border-[#A9B392] text-[#2D3327] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Tractor className="w-3.5 h-3.5 text-[#48563A]" />
              <span>Explore Demo</span>
            </button>

            <button
              onClick={() => onOpenAuth('signup')}
              className="px-5 py-2.5 rounded-full bg-[#48563A] hover:bg-[#3a462e] active:scale-[0.98] text-white font-medium text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <span>Start Managing Farm</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-3 py-1.5 text-xs font-medium text-[#48563A] bg-white border border-[#dedbc9] rounded-full"
            >
              Sign In
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full text-[#2D3327] hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#dedbc9] px-5 py-5 space-y-3.5 animate-fade-in shadow-md">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#2D3327] py-1"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#2D3327] py-1"
            >
              How It Works
            </a>
            <a 
              href="#payments" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#2D3327] py-1"
            >
              Milk Sales
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#2D3327] py-1"
            >
              Pricing
            </a>
            <a 
              href="#faqs" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[#2D3327] py-1"
            >
              FAQs
            </a>

            <div className="pt-3 border-t border-[#dedbc9] flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onExploreDemo();
                }}
                className="w-full py-2.5 rounded-full border border-[#dedbc9] text-xs font-medium text-[#2D3327] flex items-center justify-center gap-2"
              >
                <Tractor className="w-4 h-4 text-[#48563A]" />
                <span>Explore Nakuru Demo Farm</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signup');
                }}
                className="w-full py-2.5 rounded-full bg-[#48563A] text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Start Managing Your Farm</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SECTION (WHISPER HEADLINE ON CLOUD CANVAS) */}
      {/* ======================================================== */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 overflow-hidden bg-[#F7F4EA]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#dedbc9] text-[#48563A] text-xs font-medium shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#D6B46D]" />
                <span>Made for Kenyan Dairy Farmers</span>
              </div>

              {/* Signature Whisper-of-Authority Voice: weight 300 with negative tracking */}
              <h1 className="font-light text-4xl sm:text-6xl lg:text-[70px] text-[#2D3327] tracking-[-0.04em] leading-[1.06]">
                Your Dairy Farm. <br />
                <span className="font-normal text-[#48563A]">Under Control.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#454f41] font-light max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Track every litre of milk, manage your cows, and know where your farm income goes — all from your phone.
              </p>

              <p className="text-sm text-[#626c59] font-normal max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Mylkio brings your milk records, cow health, breeding activities, sales, and farm expenses into one simple system built for everyday dairy farming. No complicated paperwork. No scattered records. Just a clearer picture of your farm.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#48563A] hover:bg-[#3a462e] text-white font-medium text-sm shadow-[0_3px_16px_rgba(45,51,39,0.08)] transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>Start Managing Your Farm</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onExploreDemo}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-[#dedbc9] text-[#2D3327] font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Tractor className="w-4 h-4 text-[#48563A]" />
                  <span>See How Mylkio Works</span>
                </button>
              </div>

              {/* Trust Subtext */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-[#626c59] pt-4">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#48563A]" />
                  14-Day Full Free Trial
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#48563A]" />
                  100% Offline Capability
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#48563A]" />
                  English & Kiswahili
                </span>
              </div>
            </div>

            {/* Right Hero Visual Mockup: Dual-layer ambient shadow on floating white cards */}
            <div className="lg:col-span-5 relative flex justify-center">
              <div className="w-full max-w-[340px] sm:max-w-[370px] bg-white rounded-[24px] p-5 border border-[#dedbc9] shadow-[0_4px_20px_rgba(45,51,39,0.12),0_30px_60px_rgba(72,86,58,0.06)] space-y-3.5 text-[#2D3327]">
                
                {/* Top Farm Identity */}
                <div className="flex items-center justify-between pb-3 border-b border-[#dedbc9]">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-[#626c59]">Current Farm</div>
                    <div className="text-sm font-medium text-[#2D3327]">Green Hills Dairy • Nakuru</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#dbe3d3] text-[#48563A] text-[10px] font-medium">
                    Live Demo
                  </span>
                </div>

                {/* Milk Withdrawal Safety Alert */}
                <div className="p-3 bg-[#f7d4d4] text-[#2D3327] rounded-xl border border-[#dedbc9] flex items-center gap-2.5 text-xs">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#f25a5a] shrink-0 font-bold">
                    !
                  </div>
                  <div className="text-[11px] font-medium leading-tight text-[#2D3327]">
                    Amani (GH-04) Milk Withdrawal Active (Safe after Oct 26)
                  </div>
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 bg-[#F7F4EA] rounded-xl border border-[#dedbc9]">
                    <div className="text-[10px] uppercase font-medium text-[#626c59]">Today&apos;s Milk</div>
                    <div className="text-2xl font-light text-[#2D3327] mt-0.5 tracking-tight">42 L</div>
                    <div className="text-[10px] text-[#626c59] mt-0.5">Morning 24L • Evening 18L</div>
                  </div>

                  <div className="p-3.5 bg-[#F7F4EA] rounded-xl border border-[#dedbc9]">
                    <div className="text-[10px] uppercase font-medium text-[#626c59]">Active Cows</div>
                    <div className="text-2xl font-light text-[#2D3327] mt-0.5 tracking-tight">6 Milking</div>
                    <div className="text-[10px] text-[#48563A] font-medium mt-0.5">8 Total Herd</div>
                  </div>
                </div>

                {/* Monthly Income Card */}
                <div className="p-4 bg-white rounded-xl border border-[#dedbc9] shadow-sm space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#626c59]">
                    <span>Milk Sales This Month</span>
                    <span className="font-medium text-[#48563A]">Baraka Co-op</span>
                  </div>
                  <div className="text-2xl font-light text-[#2D3327] tracking-tight">
                    KSh 38,500
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#626c59] pt-1.5 border-t border-[#dedbc9]">
                    <span>Deductions: KSh 2,100</span>
                    <span className="font-medium text-[#48563A]">Expected: KSh 36,400</span>
                  </div>
                </div>

                {/* Upcoming Activity Item */}
                <div className="p-3 bg-[#F7F4EA] rounded-xl border border-[#dedbc9] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#A9B392] text-[#48563A] flex items-center justify-center font-medium text-xs">
                      AI
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[#2D3327]">Malkia (GH-06) Pregnancy Check</div>
                      <div className="text-[10px] text-[#626c59]">Projected Calving: Nov 20</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-[#48563A] bg-white px-2 py-0.5 rounded-full border border-[#dedbc9]">
                    Upcoming
                  </span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. PROBLEM AWARENESS (SOUND FAMILIAR?) */}
      {/* ======================================================== */}
      <section className="py-20 sm:py-28 bg-[#F7F4EA] border-t border-[#dedbc9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
            <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-white px-3.5 py-1 rounded-full border border-[#dedbc9] shadow-sm">
              Sound Familiar?
            </span>
            <h2 className="font-light text-3xl sm:text-4xl text-[#2D3327] tracking-[-0.03em] mt-4 leading-tight">
              Running a Dairy Farm Is Hard Enough. Your Records Shouldn&apos;t Make It Harder.
            </h2>
            <p className="text-sm text-[#626c59] mt-3 leading-relaxed">
              Most Kenyan dairy farmers lose money not from bad cows, but from missing records and unreconciled deliveries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Pastel Lilac Circle */}
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-4 hover:border-[#A9B392] transition-all">
              <div className="w-10 h-10 rounded-full bg-[#e4ebd9] text-[#48563A] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Milk Records Everywhere</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                You record milk in notebooks, on paper, or sometimes just try to remember the numbers. Papers get lost or smudged with milk.
              </p>
            </div>

            {/* Card 2: Pastel Coral Circle */}
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-4 hover:border-[#A9B392] transition-all">
              <div className="w-10 h-10 rounded-full bg-[#f7d4d4] text-[#f25a5a] flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Confusing Payments</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                At the end of the month, you&apos;re unsure whether every litre delivered has been accounted for. Unrecorded transport deductions reduce your earnings.
              </p>
            </div>

            {/* Card 3: Pastel Periwinkle Circle */}
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-4 hover:border-[#A9B392] transition-all">
              <div className="w-10 h-10 rounded-full bg-[#A9B392] text-[#2D3327] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Missed Farm Activities</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Important dates like pregnancy checks, treatments, and vaccinations are easy to forget when they are written on separate slips.
              </p>
            </div>

            {/* Card 4: Pastel Mint Circle */}
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-4 hover:border-[#A9B392] transition-all">
              <div className="w-10 h-10 rounded-full bg-[#dbe3d3] text-[#48563A] flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Unclear Farm Profits</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                You sell milk regularly, but calculating what your farm actually earns is another story once feed and veterinary bills arrive.
              </p>
            </div>

          </div>

          <div className="mt-14 text-center">
            <p className="text-sm font-medium text-[#2D3327]">
              There&apos;s a simpler way to manage it all.
            </p>
            <div className="w-10 h-0.5 bg-[#48563A] mx-auto mt-2 rounded-full" />
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. THE SOLUTION & FEATURE SHOWCASE */}
      {/* ======================================================== */}
      <section id="features" className="py-20 sm:py-28 bg-[#F7F4EA] border-t border-[#dedbc9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-white px-3.5 py-1 rounded-full border border-[#dedbc9] shadow-sm">
              The Complete Solution
            </span>
            <h2 className="font-light text-3xl sm:text-5xl text-[#2D3327] tracking-[-0.03em] mt-4 leading-tight">
              Everything You Need to Run Your Dairy Farm. In One Place.
            </h2>
            <p className="text-sm text-[#626c59] mt-3 leading-relaxed">
              From your first milk record to your monthly payments, Mylkio helps you stay organized and make more informed farming decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-[#dedbc9] hover:border-[#A9B392] transition-all space-y-3.5">
              <div className="w-10 h-10 rounded-full bg-[#e4ebd9] text-[#48563A] flex items-center justify-center">
                <Milk className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">
                Know Exactly How Much Milk Your Farm Produces
              </h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Record daily milk output, compare production over time, and understand how your farm is performing without tedious calculations.
              </p>
              <ul className="text-xs text-[#596455] space-y-2 pt-2 border-t border-[#dedbc9]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>Quick farm-total recording (&lt;20 seconds)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>Optional cow-by-cow recording & shift tallies</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-[#dedbc9] hover:border-[#A9B392] transition-all space-y-3.5">
              <div className="w-10 h-10 rounded-full bg-[#A9B392] text-[#2D3327] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">
                Every Cow Has a Story. Keep Track of It.
              </h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Manage cow profiles, important dates, health records, parity counts, and production history with smartphone photo attachments.
              </p>
              <ul className="text-xs text-[#596455] space-y-2 pt-2 border-t border-[#dedbc9]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>Ear-tag identification & breed registry</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>Pregnancy status & lactation tracking</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-[#dedbc9] hover:border-[#A9B392] transition-all space-y-3.5">
              <div className="w-10 h-10 rounded-full bg-[#f7d4d4] text-[#f25a5a] flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">
                Stay Ahead of Important Farm Activities
              </h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Keep track of upcoming veterinary activities, breeding events, and expected calving dates with automated withdrawal alert banners.
              </p>
              <ul className="text-xs text-[#596455] space-y-2 pt-2 border-t border-[#dedbc9]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>Milk withdrawal warnings protect co-op sales</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>AI sire records & gestation projections</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-2xl border border-[#dedbc9] hover:border-[#A9B392] transition-all space-y-3.5">
              <div className="w-10 h-10 rounded-full bg-[#dbe3d3] text-[#48563A] flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">
                Every Litre Sold Should Be Accounted For
              </h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Record deliveries to cooperatives, collection centres, and individual customers. Track prices per litre, transport deductions, and balances.
              </p>
              <ul className="text-xs text-[#596455] space-y-2 pt-2 border-t border-[#dedbc9]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>Delivery history & monthly co-op tallies</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>M-Pesa and cash payment receipts</span>
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-2xl border border-[#dedbc9] hover:border-[#A9B392] transition-all space-y-3.5">
              <div className="w-10 h-10 rounded-full bg-[#e4ebd9] text-[#2D3327] flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">
                Know Where Your Farm Money Goes
              </h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Track dairy meal, silage, fodder, veterinary fees, worker wages, transport, and maintenance costs against your milk receipts.
              </p>
              <ul className="text-xs text-[#596455] space-y-2 pt-2 border-t border-[#dedbc9]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>Categorized expenses in Kenyan Shillings</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>Real net profit margin calculation</span>
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-2xl border border-[#dedbc9] hover:border-[#A9B392] transition-all space-y-3.5">
              <div className="w-10 h-10 rounded-full bg-[#dedbc9] text-[#596455] flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">
                Understand Your Farm at a Glance
              </h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                View useful summaries of milk production, sales, expenses, and farm activity. Export full CSV spreadsheets or complete database backups.
              </p>
              <ul className="text-xs text-[#596455] space-y-2 pt-2 border-t border-[#dedbc9]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>One-click CSV exports for bank/SACCO records</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                  <span>Instant full JSON database backup</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. HOW IT WORKS (3 SIMPLE STEPS) */}
      {/* ======================================================== */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-[#F7F4EA] border-t border-[#dedbc9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-white px-3.5 py-1 rounded-full border border-[#dedbc9] shadow-sm">
              How It Works
            </span>
            <h2 className="font-light text-3xl sm:text-5xl text-[#2D3327] tracking-[-0.03em] mt-4 leading-tight">
              From Notebook to Organized Farm Records in Three Simple Steps.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 */}
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[#e4ebd9] text-[#48563A] flex items-center justify-center font-medium text-sm mx-auto">
                1
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Set Up Your Farm</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Create your farm profile and add your cows. Enter their ear tags or start with a clean slate.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[#e4ebd9] text-[#48563A] flex items-center justify-center font-medium text-sm mx-auto">
                2
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Record Daily Activities</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Log milk production, sales, expenses, and important cow activities with touch buttons on your phone.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-4 text-center">
              <div className="w-10 h-10 rounded-full bg-[#e4ebd9] text-[#48563A] flex items-center justify-center font-medium text-sm mx-auto">
                3
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Understand Your Farm</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Use your dashboard and reports to see what&apos;s happening, who owes you, and what needs attention.
              </p>
            </div>

          </div>

          <div className="mt-14 text-center">
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-8 py-3.5 rounded-full bg-[#48563A] hover:bg-[#3a462e] text-white font-medium text-sm shadow-[0_3px_16px_rgba(45,51,39,0.08)] transition-all inline-flex items-center gap-2"
            >
              <span>Get Started with Mylkio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. MILK PAYMENTS FEATURE (ELEVATED PANEL ON CANVAS) */}
      {/* ======================================================== */}
      <section id="payments" className="py-20 sm:py-28 bg-[#F7F4EA] border-t border-[#dedbc9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-white rounded-[32px] border border-[#dedbc9] p-8 sm:p-12 lg:p-16 shadow-[0_3px_16px_rgba(45,51,39,0.08)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              
              <div className="lg:col-span-7 space-y-5">
                <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-[#F7F4EA] px-3.5 py-1 rounded-full border border-[#dedbc9]">
                  The Milk Payments Feature
                </span>

                <h2 className="font-light text-3xl sm:text-5xl text-[#2D3327] tracking-[-0.03em] leading-tight">
                  Delivered the Milk? Keep Track of Every Shilling You&apos;re Owed.
                </h2>

                <p className="text-sm sm:text-base text-[#454f41] font-light leading-relaxed">
                  Whether you sell to a cooperative or individual customers, Mylkio helps you maintain a clear record of milk delivered, payments received, and outstanding balances.
                </p>

                <div className="pt-2">
                  <div className="p-4 bg-[#F7F4EA] rounded-xl border border-[#dedbc9] text-xs text-[#596455] leading-relaxed">
                    <strong className="text-[#2D3327]">No more relying on memory to reconcile your milk sales.</strong> At month-end, simply pull up your logged deliveries against the cooperative slip to confirm accuracy before payment is finalized.
                  </div>
                </div>
              </div>

              {/* Illustrative Monthly Statement Card */}
              <div className="lg:col-span-5">
                <div className="bg-[#F7F4EA] rounded-2xl p-6 sm:p-7 border border-[#dedbc9] space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-[#dedbc9]">
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#626c59]">Monthly Statement (Example)</span>
                      <h3 className="text-sm font-medium text-[#2D3327]">Baraka Dairy Farmers Co-op</h3>
                    </div>
                    <span className="text-xs font-medium text-[#48563A] bg-[#dbe3d3] px-2.5 py-0.5 rounded-full">
                      Reconciled
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-[#dedbc9]">
                      <span className="text-[#596455]">Milk Delivered:</span>
                      <span className="font-medium text-[#2D3327]">850 litres</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#dedbc9]">
                      <span className="text-[#596455]">Agreed Price:</span>
                      <span className="font-medium text-[#2D3327]">KSh 50 per litre</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#dedbc9]">
                      <span className="text-[#596455]">Gross Value:</span>
                      <span className="font-medium text-[#2D3327]">KSh 42,500</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-[#dedbc9] text-[#f25a5a]">
                      <span>Recorded Deductions:</span>
                      <span className="font-medium">- KSh 2,500</span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-[#2D3327]">Expected Net Payment:</span>
                      <span className="font-medium text-lg text-[#48563A]">KSh 40,000</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="p-2.5 bg-white rounded-xl text-[10px] text-[#626c59] italic text-center border border-[#dedbc9]">
                      *Illustrative monthly reconciliation example calculated from logged deliveries.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. WHY FARMERS WILL LOVE MYLKIO (BENEFITS GRID) */}
      {/* ======================================================== */}
      <section className="py-20 sm:py-28 bg-[#F7F4EA] border-t border-[#dedbc9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-white px-3.5 py-1 rounded-full border border-[#dedbc9] shadow-sm">
              Benefits
            </span>
            <h2 className="font-light text-3xl sm:text-5xl text-[#2D3327] tracking-[-0.03em] mt-4 leading-tight">
              Built Around Your Farm. Not the Other Way Around.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#e4ebd9] text-[#48563A] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Simple to Learn</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Easy-to-understand screens designed for everyday farm activities without complicated menus.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#A9B392] text-[#2D3327] flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Made for Your Phone</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Manage your farm from your smartphone without needing a desktop computer or special hardware.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#dbe3d3] text-[#48563A] flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Designed for Kenyan Farmers</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Support local currency, common dairy sales workflows, and familiar farming terminology in English and Kiswahili.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#e4ebd9] text-[#48563A] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Your Records in One Place</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Find your cow information, milk history, and payment records without searching through notebooks.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#f7d4d4] text-[#f25a5a] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Grow at Your Own Pace</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                Start with basic records and use more detailed features when you need them as your herd expands.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#A9B392] text-[#48563A] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-medium text-[#2D3327]">Stay Informed</h3>
              <p className="text-xs text-[#454f41] leading-relaxed">
                See upcoming farm activities, pregnancy milestones, and useful milk production summaries every morning.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. INTERACTIVE PRODUCT PREVIEW */}
      {/* ======================================================== */}
      <section className="py-20 sm:py-28 bg-[#F7F4EA] border-t border-[#dedbc9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-white px-3.5 py-1 rounded-full border border-[#dedbc9] shadow-sm">
              Product Preview
            </span>
            <h2 className="font-light text-3xl sm:text-5xl text-[#2D3327] tracking-[-0.03em] mt-4 leading-tight">
              See What a More Organized Dairy Farm Looks Like.
            </h2>
          </div>

          {/* Tab Selector (Pill Container) */}
          <div className="flex flex-wrap justify-center gap-1.5 p-1 bg-[#dedbc9] rounded-full max-w-2xl mx-auto mb-10">
            {[
              { key: 'dashboard', label: 'Dashboard' },
              { key: 'milk', label: 'Milk Records' },
              { key: 'herd', label: 'My Cows' },
              { key: 'sales', label: 'Milk Sales' },
              { key: 'finance', label: 'Farm Finances' },
            ].map((tab) => {
              const isActive = activePreviewTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActivePreviewTab(tab.key as any)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-white text-[#2D3327] shadow-sm'
                      : 'text-[#596455] hover:text-[#2D3327]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Preview Container Card */}
          <div className="bg-white rounded-[24px] border border-[#dedbc9] p-6 sm:p-10 shadow-[0_3px_16px_rgba(45,51,39,0.08)] max-w-4xl mx-auto">
            {activePreviewTab === 'dashboard' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#dedbc9]">
                  <h4 className="font-medium text-[#2D3327] text-sm">Dashboard Overview</h4>
                  <span className="text-xs text-[#48563A] font-medium">Green Hills Dairy, Nakuru</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-4 bg-[#F7F4EA] rounded-xl border border-[#dedbc9]">
                    <div className="text-[#626c59] text-[10px] uppercase font-medium">Today&apos;s Milk</div>
                    <div className="text-2xl font-light text-[#2D3327] mt-0.5">42 L</div>
                  </div>
                  <div className="p-4 bg-[#F7F4EA] rounded-xl border border-[#dedbc9]">
                    <div className="text-[#626c59] text-[10px] uppercase font-medium">Active Cows</div>
                    <div className="text-2xl font-light text-[#2D3327] mt-0.5">6 Milking</div>
                  </div>
                  <div className="p-4 bg-[#F7F4EA] rounded-xl border border-[#dedbc9]">
                    <div className="text-[#626c59] text-[10px] uppercase font-medium">Month Sales</div>
                    <div className="text-2xl font-light text-[#48563A] mt-0.5">KSh 38,500</div>
                  </div>
                  <div className="p-4 bg-[#F7F4EA] rounded-xl border border-[#dedbc9]">
                    <div className="text-[#626c59] text-[10px] uppercase font-medium">Upcoming Activity</div>
                    <div className="text-sm font-medium text-[#2D3327] mt-1.5">Pregnancy Check</div>
                  </div>
                </div>
                <p className="text-xs text-[#626c59] pt-2">
                  At a glance: Today&apos;s milk totals, active cow counts, co-op deliveries, and upcoming veterinary follow-ups.
                </p>
              </div>
            )}

            {activePreviewTab === 'milk' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#dedbc9]">
                  <h4 className="font-medium text-[#2D3327] text-sm">Daily Milk Production Logging</h4>
                  <span className="text-xs text-[#48563A] font-medium">Fast entry under 20s</span>
                </div>
                <div className="p-4 bg-[#F7F4EA] rounded-xl border border-[#dedbc9] space-y-2 text-xs">
                  <div className="flex justify-between font-medium text-[#2D3327]">
                    <span>Morning Shift Milking</span>
                    <span className="text-[#48563A]">24.0 Litres</span>
                  </div>
                  <div className="text-[#596455] text-[11px]">
                    Allocation: 18L to Baraka Co-op • 4L direct to Green Garden Hotel • 2L household & calves
                  </div>
                </div>
                <p className="text-xs text-[#626c59]">
                  Quick farm-total recording or cow-by-cow logging with morning and evening summaries.
                </p>
              </div>
            )}

            {activePreviewTab === 'herd' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#dedbc9]">
                  <h4 className="font-medium text-[#2D3327] text-sm">Cow Profiles & Antibiotic Withdrawal Safety</h4>
                  <span className="text-xs text-[#f25a5a] font-medium bg-[#f7d4d4] px-2.5 py-0.5 rounded-full">Active Warning</span>
                </div>
                <div className="p-4 bg-[#f7d4d4] rounded-xl text-xs text-[#2D3327] space-y-1">
                  <div className="font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#f25a5a]" />
                    <span>Amani (GH-04) — Milk Withdrawal Active until Oct 26</span>
                  </div>
                  <div className="text-[11px] text-[#454f41]">
                    PenStrep administered Oct 22. Milk must NOT be sold to cooperative collection center.
                  </div>
                </div>
                <p className="text-xs text-[#626c59]">
                  Ear-tag identification, breed, pregnancy status, lactation count, and safety warnings.
                </p>
              </div>
            )}

            {activePreviewTab === 'sales' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#dedbc9]">
                  <h4 className="font-medium text-[#2D3327] text-sm">Milk Deliveries & Buyer Records</h4>
                  <span className="text-xs text-[#48563A] font-medium">Reconciled</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-4 bg-[#F7F4EA] rounded-xl border border-[#dedbc9]">
                    <div className="font-medium text-[#2D3327]">Baraka Dairy Co-op</div>
                    <div className="text-[#626c59] text-[11px]">Daily pickup • KSh 50/L</div>
                    <div className="text-[#48563A] font-medium mt-1">Pending: KSh 40,000</div>
                  </div>
                  <div className="p-4 bg-[#F7F4EA] rounded-xl border border-[#dedbc9]">
                    <div className="font-medium text-[#2D3327]">Green Garden Hotel</div>
                    <div className="text-[#626c59] text-[11px]">Direct customer • KSh 60/L</div>
                    <div className="text-[#48563A] font-medium mt-1">Paid: KSh 7,200 (M-Pesa)</div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'finance' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-[#dedbc9]">
                  <h4 className="font-medium text-[#2D3327] text-sm">Farm Finances & Operating Net Margin</h4>
                  <span className="text-xs text-[#48563A] font-medium">Profitable</span>
                </div>
                <div className="p-4 bg-[#F7F4EA] rounded-xl border border-[#dedbc9] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#596455]">Total Milk Sales Revenue:</span>
                    <span className="font-medium text-[#2D3327]">KSh 47,200</span>
                  </div>
                  <div className="flex justify-between text-[#f25a5a]">
                    <span>Operating Expenses (Feed, Vet, Labor):</span>
                    <span className="font-medium">- KSh 16,800</span>
                  </div>
                  <div className="pt-2 border-t border-[#dedbc9] flex justify-between font-medium text-sm text-[#2D3327]">
                    <span>Net Farm Operating Profit:</span>
                    <span className="text-[#48563A]">KSh 30,400</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. PRICING (AIRY WHITE CARDS WITH PERIWINKLE HIGHLIGHT) */}
      {/* ======================================================== */}
      <section id="pricing" className="py-20 sm:py-28 bg-[#F7F4EA] border-t border-[#dedbc9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-white px-3.5 py-1 rounded-full border border-[#dedbc9] shadow-sm">
              Pricing
            </span>
            <h2 className="font-light text-3xl sm:text-5xl text-[#2D3327] tracking-[-0.03em] mt-4 leading-tight">
              Simple Pricing for Farms of Every Size.
            </h2>
            <p className="text-sm text-[#626c59] mt-3">
              Whether you&apos;re managing a few cows or a growing dairy farm, Mylkio has a suitable option.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Starter Plan */}
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] flex flex-col justify-between space-y-6 hover:border-[#A9B392] transition-all">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-[#626c59]">Starter</div>
                <h3 className="text-lg font-medium text-[#2D3327] mt-1">For Digitize-First Farmers</h3>
                <p className="text-xs text-[#626c59] mt-1">For farmers beginning to digitize their farm records.</p>

                <div className="mt-5 pb-5 border-b border-[#dedbc9]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-light text-[#2D3327]">KSh {settings.starterPriceKsh}</span>
                    <span className="text-xs text-[#626c59]">/ month</span>
                  </div>
                  <div className="text-[11px] text-[#626c59] mt-1">Billed monthly via M-Pesa</div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-[#454f41]">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Up to 5 cows</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Daily milk production tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Co-op & buyer sales logging</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>100% Offline smartphone capability</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenAuth('signup', 'starter')}
                className="w-full py-3 rounded-full bg-white hover:bg-slate-50 border border-[#dedbc9] text-[#2D3327] font-medium text-xs transition-all text-center"
              >
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Farmer Plan (Single Chromatic Accent per Style Guide) */}
            <div className="p-8 rounded-2xl bg-white border-2 border-[#48563A] flex flex-col justify-between space-y-6 relative shadow-[0_4px_20px_rgba(45,51,39,0.10)]">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D6B46D] text-[#2D3327] text-[10px] uppercase tracking-wider font-bold px-3.5 py-1 rounded-full shadow-sm">
                Recommended for Growing Farms
              </span>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#48563A]">Farmer</div>
                <h3 className="text-lg font-medium text-[#2D3327] mt-1">For Growing Dairy Farms</h3>
                <p className="text-xs text-[#626c59] mt-1">For growing dairy farms needing additional tracking and reporting.</p>

                <div className="mt-5 pb-5 border-b border-[#dedbc9]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-light text-[#2D3327]">KSh {settings.farmerPriceKsh}</span>
                    <span className="text-xs text-[#626c59]">/ month</span>
                  </div>
                  <div className="text-[11px] text-[#9e7737] font-semibold mt-1">Pay for 10 months, get 12 months (Annual plan)</div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-[#454f41]">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Up to 25 cows</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Cow identification, photos & pedigree</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>AI breeding, calving dates & reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Antibiotic milk withdrawal alert notices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>CSV export & full database backup</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenAuth('signup', 'farmer')}
                className="w-full py-3.5 rounded-full bg-[#48563A] hover:bg-[#3a462e] text-white font-medium text-xs shadow-sm transition-all text-center"
              >
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Farm Pro Plan */}
            <div className="p-8 rounded-2xl bg-white border border-[#dedbc9] flex flex-col justify-between space-y-6 hover:border-[#A9B392] transition-all">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-[#626c59]">Farm Pro</div>
                <h3 className="text-lg font-medium text-[#2D3327] mt-1">For Commercial Herds</h3>
                <p className="text-xs text-[#626c59] mt-1">For larger operations requiring advanced features.</p>

                <div className="mt-5 pb-5 border-b border-[#dedbc9]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-light text-[#2D3327]">KSh {settings.proPriceKsh}</span>
                    <span className="text-xs text-[#626c59]">/ month</span>
                  </div>
                  <div className="text-[11px] text-[#626c59] mt-1">Annual plan available</div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-[#454f41]">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Unlimited herd capacity</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Multiple farm worker logins</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Priority WhatsApp & phone assistance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#48563A]"></span>
                    <span>Operating profit & net margin ledger</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenAuth('signup', 'farm_pro')}
                className="w-full py-3 rounded-full bg-white hover:bg-slate-50 border border-[#dedbc9] text-[#2D3327] font-medium text-xs transition-all text-center"
              >
                Start 14-Day Free Trial
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 10. TRUST & CREDIBILITY (AUTHENTIC TESTIMONIALS) */}
      {/* ======================================================== */}
      {approvedTestimonials.length > 0 && (
        <section className="py-20 sm:py-28 bg-[#F7F4EA] border-t border-[#dedbc9]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-white px-3.5 py-1 rounded-full border border-[#dedbc9] shadow-sm">
                Trust &amp; Credibility
              </span>
              <h2 className="font-light text-3xl sm:text-5xl text-[#2D3327] tracking-[-0.03em] mt-4 leading-tight">
                Built with Kenyan Dairy Farmers in Mind.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {approvedTestimonials.map((t) => (
                <div 
                  key={t.id} 
                  className="p-8 rounded-2xl bg-white border border-[#dedbc9] shadow-[0_3px_16px_rgba(45,51,39,0.08)] flex flex-col justify-between space-y-5"
                >
                  <blockquote className="text-xs text-[#454f41] leading-relaxed italic border-l-2 border-[#48563A] pl-3.5">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>

                  <div className="pt-3 border-t border-[#dedbc9] flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#2D3327] text-xs">{t.farmerName}</div>
                      <div className="text-[11px] text-[#48563A] font-normal">{t.farmName} • {t.county}</div>
                      <div className="text-[10px] text-[#626c59]">{t.cowsCount} cows</div>
                    </div>
                    <div className="text-[#D6B46D] text-xs">
                      {'★'.repeat(t.rating)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 11. LEAD MAGNET (FREE CHECKLIST) */}
      {/* ======================================================== */}
      <section className="py-20 sm:py-24 bg-[#F7F4EA] border-t border-[#dedbc9]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="bg-white rounded-[32px] border border-[#dedbc9] p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-5 shadow-[0_3px_16px_rgba(73,46,107,0.1)]">
            <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-[#F7F4EA] px-3.5 py-1 rounded-full border border-[#dedbc9]">
              Free Resource
            </span>

            <h2 className="font-light text-2xl sm:text-4xl text-[#2D3327] tracking-[-0.03em]">
              Not Ready for Software Yet? Start with Better Farm Records.
            </h2>

            <p className="text-xs sm:text-sm text-[#454f41] max-w-xl mx-auto leading-relaxed">
              Get Our Free Dairy Farm Record-Keeping Checklist covering daily milk production, milk deliveries, cow health dates, breeding activities, farm expenses, and customer payments.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setIsChecklistModalOpen(true)}
                className="px-7 py-3.5 rounded-full bg-[#48563A] hover:bg-[#3a462e] text-white font-medium text-xs shadow-sm transition-all inline-flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Get the Free Checklist</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 12. FREQUENTLY ASKED QUESTIONS */}
      {/* ======================================================== */}
      <section id="faqs" className="py-20 sm:py-28 bg-[#F7F4EA] border-t border-[#dedbc9]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-14">
            <span className="text-xs font-medium uppercase tracking-wider text-[#48563A] bg-white px-3.5 py-1 rounded-full border border-[#dedbc9] shadow-sm">
              FAQs
            </span>
            <h2 className="font-light text-3xl sm:text-5xl text-[#2D3327] tracking-[-0.03em] mt-4 leading-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl border border-[#dedbc9] overflow-hidden bg-white shadow-2xs"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-medium text-sm text-[#2D3327] flex items-center justify-between gap-4"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#48563A] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#626c59] shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-[#454f41] leading-relaxed border-t border-[#dedbc9] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 13. FINAL CTA (WHISPER VOICE ON CLOUD CANVAS) */}
      {/* ======================================================== */}
      <section className="py-20 sm:py-32 bg-[#F7F4EA] border-t border-[#dedbc9] text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="font-light text-3xl sm:text-5xl lg:text-6xl text-[#2D3327] tracking-[-0.04em] leading-tight">
            Your Farm Deserves Better Than Guesswork.
          </h2>

          <p className="text-sm sm:text-base text-[#454f41] font-light max-w-lg mx-auto leading-relaxed">
            Bring your cows, milk records, farm activities, and payments into one simple place with Mylkio.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#48563A] hover:bg-[#3a462e] text-white font-medium text-sm shadow-[0_3px_16px_rgba(45,51,39,0.08)] transition-all flex items-center justify-center gap-2"
            >
              <span>Start Managing Your Farm</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 text-[#2D3327] font-medium text-sm border border-[#dedbc9] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageCircle className="w-4 h-4 text-[#48563A]" />
              <span>Talk to Our Team</span>
            </a>
          </div>

          <p className="text-xs text-[#626c59] pt-2">
            Mylkio is developed by Versaly, a software company building practical business solutions for Kenyan industries.
          </p>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 14. FOOTER */}
      {/* ======================================================== */}
      <footer className="bg-white text-[#626c59] py-12 border-t border-[#dedbc9] text-xs">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-[#2D3327] flex items-center justify-center text-white font-bold text-xs">
              M
            </div>
            <div>
              <span className="font-medium text-[#2D3327] text-sm">Mylkio — Smarter Dairy Farming, Made Simple.</span>
              <p className="text-[11px] text-[#626c59]">A product by Versaly.</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-[#596455]">
            <a href="#features" className="hover:text-[#48563A]">Features</a>
            <a href="#how-it-works" className="hover:text-[#48563A]">How It Works</a>
            <a href="#pricing" className="hover:text-[#48563A]">Pricing</a>
            <a href="#faqs" className="hover:text-[#48563A]">FAQs</a>
          </div>

          <div className="text-center sm:text-right text-[11px] text-[#798375]">
            &copy; {new Date().getFullYear()} Versaly. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* MODAL: FREE CHECKLIST LEAD MAGNET */}
      {/* ======================================================== */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-[0_4px_20px_rgba(45,51,39,0.12)] border border-[#dedbc9] relative">
            <button
              onClick={() => {
                setIsChecklistModalOpen(false);
                setLeadSubmitted(false);
              }}
              className="absolute top-4 right-4 p-2 text-[#798375] hover:text-[#2D3327] rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {!leadSubmitted ? (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="w-10 h-10 rounded-full bg-[#e4ebd9] text-[#48563A] flex items-center justify-center mb-1">
                  <FileText className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-lg font-medium text-[#2D3327] tracking-tight">
                    Get Our Free Dairy Farm Record-Keeping Checklist
                  </h3>
                  <p className="text-xs text-[#626c59] mt-1">
                    Enter where to send your checklist and instant download link.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase text-[#596455] mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="e.g. David Mwangi"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dedbc9] focus:border-[#48563A] focus:ring-1 focus:ring-[#48563A] text-[#2D3327] bg-[#F7F4EA]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase text-[#596455] mb-1">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dedbc9] focus:border-[#48563A] focus:ring-1 focus:ring-[#48563A] text-[#2D3327] bg-[#F7F4EA]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium uppercase text-[#596455] mb-1">County</label>
                    <input
                      type="text"
                      value={leadCounty}
                      onChange={(e) => setLeadCounty(e.target.value)}
                      placeholder="e.g. Nakuru, Kiambu"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dedbc9] focus:border-[#48563A] text-[#2D3327] bg-[#F7F4EA]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium uppercase text-[#596455] mb-1">Number of Cows</label>
                    <input
                      type="number"
                      value={leadCows}
                      onChange={(e) => setLeadCows(e.target.value)}
                      placeholder="e.g. 6"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#dedbc9] focus:border-[#48563A] text-[#2D3327] bg-[#F7F4EA]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#48563A] hover:bg-[#3a462e] text-white font-medium text-xs shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Get the Free Checklist</span>
                </button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-[#dbe3d3] text-[#48563A] flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#2D3327]">Your Checklist is Ready!</h3>
                  <p className="text-xs text-[#626c59] mt-1">
                    Thank you, {leadName}. Click the button below to download your printable file immediately.
                  </p>
                </div>

                <button
                  onClick={handleDownloadChecklistDirectly}
                  className="w-full py-3 rounded-full bg-[#48563A] hover:bg-[#3a462e] text-white font-medium text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Checklist File (.txt)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
