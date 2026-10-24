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
  Phone, 
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
  Receipt
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
    // Generate simple printable text/markdown checklist
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
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-dairy-200">
      
      {/* ======================================================== */}
      {/* 1. STICKY NAVIGATION BAR */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-dairy-700 flex items-center justify-center text-white font-black text-xl shadow-md">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl text-slate-900 tracking-tight">Mylkio</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-dairy-100 text-dairy-800">
                  Kenya
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">A product by Versaly</p>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-dairy-700 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-dairy-700 transition-colors">How It Works</a>
            <a href="#payments" className="hover:text-dairy-700 transition-colors">Milk Sales</a>
            <a href="#pricing" className="hover:text-dairy-700 transition-colors">Pricing</a>
            <a href="#faqs" className="hover:text-dairy-700 transition-colors">FAQs</a>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-dairy-700 transition-colors"
            >
              Sign In
            </button>

            <button
              onClick={onExploreDemo}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 hover:border-dairy-500 hover:bg-dairy-50 text-slate-700 transition-all flex items-center gap-1.5"
            >
              <Tractor className="w-3.5 h-3.5 text-dairy-600" />
              <span>Explore Demo</span>
            </button>

            <button
              onClick={() => onOpenAuth('signup')}
              className="px-5 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-bold text-xs shadow-md shadow-dairy-600/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <span>Start Managing Farm</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-3 py-1.5 text-xs font-bold text-dairy-800 bg-dairy-50 rounded-lg"
            >
              Sign In
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-5 py-4 space-y-3 animate-fade-in">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-700 py-1"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-700 py-1"
            >
              How It Works
            </a>
            <a 
              href="#payments" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-700 py-1"
            >
              Milk Payments
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-700 py-1"
            >
              Pricing
            </a>
            <a 
              href="#faqs" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-slate-700 py-1"
            >
              FAQs
            </a>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onExploreDemo();
                }}
                className="w-full py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 flex items-center justify-center gap-2"
              >
                <Tractor className="w-4 h-4 text-dairy-600" />
                <span>Explore Nakuru Demo Farm</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('signup');
                }}
                className="w-full py-2.5 rounded-xl bg-dairy-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Start Managing Your Farm</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SECTION */}
      {/* ======================================================== */}
      <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 overflow-hidden bg-gradient-to-b from-dairy-50/50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dairy-100/80 border border-dairy-200 text-dairy-800 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-dairy-700" />
                <span>Made for Kenyan Dairy Farmers</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Your Dairy Farm. <br />
                <span className="text-dairy-700">Under Control.</span>
              </h1>

              <p className="text-base sm:text-lg text-slate-700 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Track every litre of milk, manage your cows, and know where your farm income goes — all from your phone.
              </p>

              <p className="text-sm text-slate-500 max-w-lg mx-auto lg:mx-0">
                Mylkio brings your milk records, cow health, breeding activities, sales, and farm expenses into one simple system built for everyday dairy farming. No complicated paperwork. No scattered notebooks.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-dairy-600 hover:bg-dairy-700 text-white font-extrabold text-sm shadow-xl shadow-dairy-600/25 transition-all flex items-center justify-center gap-2.5 active:scale-95"
                >
                  <span>Start Managing Your Farm</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={onExploreDemo}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Tractor className="w-4 h-4 text-dairy-600" />
                  <span>See How Mylkio Works (Demo)</span>
                </button>
              </div>

              {/* Trust Subtext */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs font-semibold text-slate-500 pt-3">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-dairy-600" />
                  14-Day Full Free Trial
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-dairy-600" />
                  100% Offline Capability
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-dairy-600" />
                  English & Kiswahili
                </span>
              </div>
            </div>

            {/* Right Hero Visual Mockup */}
            <div className="lg:col-span-5 relative flex justify-center">
              {/* Phone Frame Mockup */}
              <div className="w-full max-w-[340px] sm:max-w-[370px] bg-slate-900 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50 relative">
                {/* Speaker Notch */}
                <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-2" />

                {/* Inner Screen */}
                <div className="bg-slate-50 rounded-[34px] overflow-hidden border border-slate-200/80 p-4 space-y-3.5 text-slate-800">
                  
                  {/* Top Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">Green Hills Dairy</div>
                      <div className="text-sm font-black text-slate-900">Nakuru County</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-dairy-100 text-dairy-800 text-[10px] font-black uppercase">
                      Live
                    </span>
                  </div>

                  {/* High Alert Banner */}
                  <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl flex items-center gap-2 shadow-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <div className="text-[11px] font-bold leading-tight">
                      Amani (GH-04) Milk Withdrawal Active (3 days left)
                    </div>
                  </div>

                  {/* Real Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Today's Milk</div>
                      <div className="text-xl font-black text-dairy-700 mt-0.5">42 Litres</div>
                      <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Morning 24L • Evening 18L</div>
                    </div>

                    <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Active Cows</div>
                      <div className="text-xl font-black text-slate-900 mt-0.5">6 Milking</div>
                      <div className="text-[9px] text-emerald-600 font-bold mt-0.5">8 Total Herd</div>
                    </div>
                  </div>

                  {/* Monthly Income Card */}
                  <div className="p-3.5 bg-dairy-900 text-white rounded-2xl shadow-sm space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-dairy-200 font-semibold">
                      <span>October Co-op Milk Sales</span>
                      <span className="text-dairy-300 font-bold">Baraka Co-op</span>
                    </div>
                    <div className="text-2xl font-black text-white tracking-tight">
                      KSh 38,500
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-dairy-300 pt-1 border-t border-dairy-800">
                      <span>Deductions: KSh 2,100</span>
                      <span className="font-bold text-emerald-300">Net: KSh 36,400</span>
                    </div>
                  </div>

                  {/* Next Activity */}
                  <div className="p-2.5 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        AI
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-900">Malkia (GH-06) Calving</div>
                        <div className="text-[9px] text-slate-500">Projected Nov 20 (~26 days)</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. PROBLEM AWARENESS (SOUND FAMILIAR?) */}
      {/* ======================================================== */}
      <section className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-dairy-700 bg-dairy-50 px-3 py-1 rounded-full border border-dairy-200">
              Sound Familiar?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              Running a Dairy Farm Is Hard Enough. Your Records Shouldn't Make It Harder.
            </h2>
            <p className="text-sm text-slate-600 mt-3">
              Most Kenyan dairy farmers lose money not from bad cows, but from missing records and unreconciled deliveries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Milk Records Everywhere</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You record milk in notebooks, on torn paper chits, or try to remember morning and evening totals in your head. Papers get lost or smudged with milk.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center font-black mb-4">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Confusing Co-op Payments</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                At the end of the month, you receive a cooperative payout slip with unexpected deductions. You cannot tell whether every single delivered litre was paid for.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-black mb-4">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Missed Farm Activities</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Important dates like repeat heat cycles, AI pregnancy checks, vaccinations, and antibiotic milk withdrawal dates are easily forgotten until it's too late.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black mb-4">
                <DollarSign className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Unclear Farm Profits</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You sell milk every day and buy feed regularly, but calculating whether your dairy herd actually made a profit this month feels like pure guesswork.
              </p>
            </div>

          </div>

          <div className="mt-12 text-center">
            <p className="text-sm font-bold text-slate-700">
              There is a simpler, faster way to manage it all.
            </p>
            <div className="w-12 h-1 bg-dairy-600 mx-auto mt-2 rounded-full" />
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. THE SOLUTION & FEATURE SHOWCASE */}
      {/* ======================================================== */}
      <section id="features" className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-dairy-700 bg-dairy-100/70 px-3 py-1 rounded-full">
              The Complete Solution
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              Everything You Need to Run Your Dairy Farm. In One Place.
            </h2>
            <p className="text-sm text-slate-600 mt-3">
              Built from the ground up for the everyday rhythms of Kenyan smallholder and medium commercial dairy farmers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-dairy-50 text-dairy-700 flex items-center justify-center font-bold">
                <Milk className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Know Exactly How Much Milk Your Farm Produces
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fast morning and evening logging in under 20 seconds. Enter a quick farm total, or optionally break down yield per cow to see your highest producers.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>Morning & evening shift tallies</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>Calf and household milk allocation</span>
                </li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Every Cow Has a Story. Keep Track of It.
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Digital cow profiles with ear-tag number, breed (Friesian, Ayrshire, Jersey, Sahiwal), lactation status, parity count, and photo uploads.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>Photo snapshot directly from phone camera</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>Tag tracking & lineage notes</span>
                </li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Stay Ahead of Important Health & Breeding Events
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Log artificial insemination (AI) bulls, pregnancy exams, and treatments. Automatic projected calving countdowns and milk withdrawal alerts.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>Red alert banners for active withdrawals</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>283-day gestation projections</span>
                </li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Every Litre Sold Should Be Accounted For
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Log deliveries to cooperatives, local hotels, or household customers. Record transport deductions and maintain precise balances owed.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>Buyer rate per litre (e.g. KSh 48–55/L)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>M-Pesa reference and cash payment tracking</span>
                </li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Know Where Your Farm Money Goes
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Categorized expenses for dairy meal, fodder, silage, veterinary fees, worker wages, and transport. Automatic calculation of net operating margin.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>Operating expenses breakdown</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>Net farm profit calculation in KES</span>
                </li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Export Data & Complete Farm Backup
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Download your production records, co-op sales, and expenses into CSV spreadsheets anytime for bank loans, SACCO appraisals, or tax records.
              </p>
              <ul className="text-xs text-slate-700 space-y-1.5 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
                  <span>One-click CSV exports for Excel / Google Sheets</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-dairy-600 shrink-0" />
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
      <section id="how-it-works" className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-dairy-700 bg-dairy-50 px-3 py-1 rounded-full border border-dairy-200">
              Simple & Rapid
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              From Notebook to Organized Farm in Three Simple Steps
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              You do not need IT skills or days of training to get started.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/90 text-center space-y-3 relative">
              <div className="w-12 h-12 rounded-2xl bg-dairy-700 text-white flex items-center justify-center font-black text-lg mx-auto shadow-sm">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Set Up Your Farm</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter your farm name and county. Add your cows with their ear tags or start with a clean slate. Takes less than 2 minutes.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/90 text-center space-y-3 relative">
              <div className="w-12 h-12 rounded-2xl bg-dairy-700 text-white flex items-center justify-center font-black text-lg mx-auto shadow-sm">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Record Daily Activities</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Log morning milk totals right after milking. Record milk delivered to your buyer and enter feed expenses when purchased.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200/90 text-center space-y-3 relative">
              <div className="w-12 h-12 rounded-2xl bg-dairy-700 text-white flex items-center justify-center font-black text-lg mx-auto shadow-sm">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">Understand Your Farm</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                View your dashboard to see total litres sold, upcoming calving dates, outstanding payments, and your true monthly net profit.
              </p>
            </div>

          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => onOpenAuth('signup')}
              className="px-8 py-3.5 rounded-2xl bg-dairy-600 hover:bg-dairy-700 text-white font-extrabold text-sm shadow-md transition-all inline-flex items-center gap-2"
            >
              <span>Get Started with Mylkio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. MILK PAYMENTS FEATURE (HIGH CONVERSION SPOTLIGHT) */}
      {/* ======================================================== */}
      <section id="payments" className="py-16 sm:py-24 bg-dairy-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-dairy-300 bg-dairy-900 px-3 py-1 rounded-full border border-dairy-800">
                Co-op & Buyer Reconciliation
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Delivered the Milk? Keep Track of Every Shilling You&apos;re Owed.
              </h2>

              <p className="text-sm sm:text-base text-dairy-100 leading-relaxed font-medium">
                Whether you sell to a dairy cooperative (like New KCC, Brookside, or local societies) or individual hotels, Mylkio maintains an indisputable record of litres delivered, transport deductions, and expected payouts.
              </p>

              <div className="p-4 bg-dairy-900/80 rounded-2xl border border-dairy-800 space-y-2">
                <div className="text-xs font-bold text-dairy-200">Why Kenyan Farmers Value This:</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  No more arguing over lost driver chits at month-end. You know the exact gross amount owed and the exact net payout after deductions.
                </p>
              </div>
            </div>

            {/* Illustrative Monthly Statement Card */}
            <div className="lg:col-span-5">
              <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Monthly Co-op Statement</span>
                    <h3 className="text-base font-extrabold text-slate-900">Baraka Dairy Farmers Co-op</h3>
                  </div>
                  <span className="text-xs font-bold text-dairy-700 bg-dairy-50 px-2.5 py-1 rounded-full">
                    Reconciled
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Milk Delivered:</span>
                    <span className="font-extrabold text-slate-900">850 Litres</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Agreed Price:</span>
                    <span className="font-extrabold text-slate-900">KSh 50 per Litre</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Gross Value:</span>
                    <span className="font-black text-slate-900">KSh 42,500</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 text-red-600">
                    <span>Recorded Deductions (Transport/Feed):</span>
                    <span className="font-bold">- KSh 2,500</span>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-sm">
                    <span className="font-black text-slate-900">Expected Net Payout:</span>
                    <span className="font-black text-lg text-dairy-700">KSh 40,000</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-[10px] text-slate-400 italic text-center">
                    *Illustrative statement calculated automatically from daily logged deliveries.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. WHY FARMERS LOVE MYLKIO (BENEFITS GRID) */}
      {/* ======================================================== */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-dairy-700 bg-dairy-50 px-3 py-1 rounded-full border border-dairy-200">
              Why Mylkio
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              Built Around Your Farm. Not the Other Way Around.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="text-sm font-black text-dairy-700 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                <span>Made for Your Phone</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                No computer needed. Manage all cattle, milk yields, and buyers directly on your Android phone with big touch targets.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="text-sm font-black text-dairy-700 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>Works 100% Offline</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rural network drops won&apos;t slow you down. The system saves records instantly on your device and syncs silently when reconnected.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="text-sm font-black text-dairy-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Designed for Kenya</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Uses Kenyan Shillings (KSh), local cow breeds, M-Pesa reference codes, cooperative structures, and supports Kiswahili.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="text-sm font-black text-dairy-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Grow at Your Own Pace</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Start with simple milk totals. Add cow tagging, breeding dates, and financial tracking whenever you are ready.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="text-sm font-black text-dairy-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Your Data Stays Yours</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                We never sell or share your milk records. You can download a complete CSV copy or full backup anytime for free.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-2">
              <div className="text-sm font-black text-dairy-700 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>Local WhatsApp Support</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Got a question or need help setting up your first cow? Message our Kenyan support desk directly on WhatsApp.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 8. INTERACTIVE PRODUCT PREVIEW */}
      {/* ======================================================== */}
      <section className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-dairy-700 bg-dairy-100 px-3 py-1 rounded-full">
              Interactive Preview
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              See What a More Organized Dairy Farm Looks Like
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Explore the screens Kenyan dairy farmers use every single day.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <button
              onClick={() => setActivePreviewTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePreviewTab === 'dashboard'
                  ? 'bg-dairy-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Dashboard Overview
            </button>

            <button
              onClick={() => setActivePreviewTab('milk')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePreviewTab === 'milk'
                  ? 'bg-dairy-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Milk Yield Logging
            </button>

            <button
              onClick={() => setActivePreviewTab('herd')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePreviewTab === 'herd'
                  ? 'bg-dairy-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Herd & Withdrawal Alerts
            </button>

            <button
              onClick={() => setActivePreviewTab('sales')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePreviewTab === 'sales'
                  ? 'bg-dairy-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Co-op Deliveries & Sales
            </button>

            <button
              onClick={() => setActivePreviewTab('finance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activePreviewTab === 'finance'
                  ? 'bg-dairy-600 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Operating Net Margin
            </button>
          </div>

          {/* Preview Container */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl max-w-4xl mx-auto">
            {activePreviewTab === 'dashboard' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm">Real-time Farm Health & Performance</h4>
                  <span className="text-xs text-dairy-600 font-semibold">Green Hills Dairy, Nakuru</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Today&apos;s Output</div>
                    <div className="text-xl font-black text-dairy-800">42 L</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Month Deliveries</div>
                    <div className="text-xl font-black text-slate-900">850 L</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Month Revenue</div>
                    <div className="text-xl font-black text-emerald-700">KSh 38,500</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Active Herd</div>
                    <div className="text-xl font-black text-slate-900">8 Cattle</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 pt-2">
                  At a glance: Today&apos;s milk shifts, high priority reminders, active withdrawal warnings, and pending payments due.
                </p>
              </div>
            )}

            {activePreviewTab === 'milk' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm">Rapid Morning / Evening Milk Entry</h4>
                  <span className="text-xs text-emerald-700 font-bold">Under 20 seconds</span>
                </div>
                <div className="p-4 bg-dairy-50/60 rounded-2xl border border-dairy-100 space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-dairy-950">
                    <span>Morning Milking (Today)</span>
                    <span className="text-dairy-700">24.0 Litres</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Allocation: 18L to Baraka Co-op • 4L direct to Green Garden Hotel • 2L household & calves
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Easily toggle between simple farm totals and detailed per-cow yields without complex forms.
                </p>
              </div>
            )}

            {activePreviewTab === 'herd' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm">Herd Registry & Antibiotic Withdrawal Protection</h4>
                  <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">Active Warning</span>
                </div>
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>Amani (GH-04) — Milk Withdrawal Active until Oct 26</span>
                  </div>
                  <div className="text-[11px] text-red-700">
                    PenStrep administered Oct 22. Milk must NOT be delivered to cooperative collection center.
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Protects you from cooperative rejection penalties, milk dumping fines, and customer complaints.
                </p>
              </div>
            )}

            {activePreviewTab === 'sales' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm">Co-op Deliveries & Individual Buyer Balances</h4>
                  <span className="text-xs text-dairy-700 font-bold">Auto-Tallying</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <div className="font-bold text-slate-900">Baraka Dairy Co-op</div>
                    <div className="text-slate-500 text-[11px]">Daily pickup • KSh 50/L</div>
                    <div className="text-dairy-700 font-extrabold mt-1">Pending: KSh 40,000</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl">
                    <div className="font-bold text-slate-900">Green Garden Hotel</div>
                    <div className="text-slate-500 text-[11px]">Direct household • KSh 60/L</div>
                    <div className="text-emerald-700 font-extrabold mt-1">Paid: KSh 7,200 via M-Pesa</div>
                  </div>
                </div>
              </div>
            )}

            {activePreviewTab === 'finance' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-bold text-slate-900 text-sm">Monthly Operating Profit & Loss</h4>
                  <span className="text-xs text-emerald-700 font-bold">Net Positive</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Milk Sales Revenue:</span>
                    <span className="font-extrabold text-slate-900">KSh 47,200</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Operating Expenses (Feed, Vet, Labor):</span>
                    <span className="font-extrabold">- KSh 16,800</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-dairy-800">
                    <span>Net Operating Farm Profit:</span>
                    <span>KSh 30,400</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 9. TRANSPARENT PRICING */}
      {/* ======================================================== */}
      <section id="pricing" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-dairy-700 bg-dairy-50 px-3 py-1 rounded-full border border-dairy-200">
              Honest Kenyan Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              Simple Pricing for Farms of Every Size
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Every plan includes a 14-day free trial. No credit card or upfront M-Pesa required.
            </p>
            <div className="mt-3 inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              Pay 10 months, get 12 months with our Annual Plan (2 Months Free)
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            
            {/* Starter Plan */}
            <div className="p-7 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-6">
              <div>
                <div className="text-xs font-bold uppercase text-slate-500">Starter</div>
                <h3 className="text-xl font-black text-slate-900 mt-1">For New Digital Farms</h3>
                <p className="text-xs text-slate-500 mt-1">Farmers beginning to digitize their daily milk records.</p>

                <div className="mt-5 pb-5 border-b border-slate-200">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">KSh {settings.starterPriceKsh}</span>
                    <span className="text-xs text-slate-500 font-semibold">/ month</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Or KSh 5,000 billed annually</div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-600 shrink-0" />
                    <span>Up to 5 cows</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-600 shrink-0" />
                    <span>Daily milk production tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-600 shrink-0" />
                    <span>Co-op & buyer sales logging</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-600 shrink-0" />
                    <span>100% Offline mobile support</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenAuth('signup', 'starter')}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all text-center"
              >
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Farmer Plan (Popular) */}
            <div className="p-7 sm:p-8 rounded-3xl bg-dairy-900 text-white border-2 border-dairy-600 flex flex-col justify-between space-y-6 relative shadow-2xl">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-dairy-500 text-slate-950 text-[10px] uppercase tracking-wider font-black px-3 py-1 rounded-full shadow-sm">
                Most Popular for Kenyan Farms
              </span>

              <div>
                <div className="text-xs font-bold uppercase text-dairy-300">Farmer</div>
                <h3 className="text-xl font-black text-white mt-1">For Growing Dairy Farms</h3>
                <p className="text-xs text-dairy-200 mt-1">Everything needed to optimize milk yield, breeding, and sales.</p>

                <div className="mt-5 pb-5 border-b border-dairy-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">KSh {settings.farmerPriceKsh}</span>
                    <span className="text-xs text-dairy-300 font-semibold">/ month</span>
                  </div>
                  <div className="text-[11px] text-dairy-300 mt-0.5">Or KSh 10,000 billed annually (2 Mos Free)</div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-dairy-100">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-400 shrink-0" />
                    <span>Up to 25 cows</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-400 shrink-0" />
                    <span>Individual cow tracking & breed photos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-400 shrink-0" />
                    <span>AI breeding, calving projections & reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-400 shrink-0" />
                    <span>Antibiotic milk withdrawal alert banners</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-400 shrink-0" />
                    <span>Full CSV export & database backups</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenAuth('signup', 'farmer')}
                className="w-full py-3.5 rounded-xl bg-dairy-500 hover:bg-dairy-400 text-slate-950 font-black text-xs shadow-lg transition-all text-center"
              >
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Farm Pro Plan */}
            <div className="p-7 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-6">
              <div>
                <div className="text-xs font-bold uppercase text-slate-500">Farm Pro</div>
                <h3 className="text-xl font-black text-slate-900 mt-1">For Commercial Herds</h3>
                <p className="text-xs text-slate-500 mt-1">Large dairy operations requiring multi-worker access and full audit logs.</p>

                <div className="mt-5 pb-5 border-b border-slate-200">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-slate-900">KSh {settings.proPriceKsh}</span>
                    <span className="text-xs text-slate-500 font-semibold">/ month</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Or KSh 25,000 billed annually</div>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-600 shrink-0" />
                    <span>Unlimited cattle</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-600 shrink-0" />
                    <span>Multi-farm or farm worker access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-600 shrink-0" />
                    <span>Direct priority WhatsApp phone support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-dairy-600 shrink-0" />
                    <span>Full financial profit & loss ledger</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenAuth('signup', 'farm_pro')}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all text-center"
              >
                Start 14-Day Free Trial
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 10. AUTHENTIC TESTIMONIALS (LIVE FROM ADMIN CMS) */}
      {/* ======================================================== */}
      {approvedTestimonials.length > 0 && (
        <section className="py-16 sm:py-24 bg-slate-50 border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-wider text-dairy-700 bg-dairy-100 px-3 py-1 rounded-full">
                Farmer Experiences
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
                Built with Kenyan Dairy Farmers in Mind
              </h2>
              <p className="text-sm text-slate-600 mt-2">
                Real feedback from farmers managing their herds and milk sales with Mylkio.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {approvedTestimonials.map((t) => (
                <div key={t.id} className="p-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="text-amber-400 font-bold text-sm tracking-wide">
                      {'★'.repeat(t.rating)}
                    </div>
                    <blockquote className="text-xs text-slate-700 leading-relaxed italic border-l-2 border-dairy-500 pl-3">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <div className="font-extrabold text-slate-900 text-sm">{t.farmerName}</div>
                    <div className="text-[11px] text-dairy-700 font-semibold">{t.farmName} • {t.county}</div>
                    <div className="text-[10px] text-slate-400">{t.cowsCount} cows managed</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 11. LEAD MAGNET (FREE FARM CHECKLIST) */}
      {/* ======================================================== */}
      <section className="py-16 sm:py-20 bg-dairy-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="text-xs font-bold uppercase tracking-wider text-dairy-200 bg-dairy-800 px-3 py-1 rounded-full">
            Free Practical Resource
          </span>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Not Ready for Software Yet? Start with Better Farm Records.
          </h2>

          <p className="text-sm sm:text-base text-dairy-100 max-w-2xl mx-auto leading-relaxed">
            Download our free <strong>Dairy Farm Record-Keeping Checklist</strong> covering daily milk logs, cooperative delivery chits, cow health dates, breeding follow-ups, and monthly profit reconciliation.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setIsChecklistModalOpen(true)}
              className="px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-dairy-900 font-extrabold text-sm shadow-xl transition-all inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-dairy-700" />
              <span>Get the Free Checklist (Instant Download)</span>
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 12. FREQUENTLY ASKED QUESTIONS */}
      {/* ======================================================== */}
      <section id="faqs" className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-dairy-700 bg-dairy-50 px-3 py-1 rounded-full border border-dairy-200">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Everything you need to know about getting your farm started on Mylkio.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl border border-slate-200/90 overflow-hidden bg-slate-50/50"
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-bold text-sm text-slate-900 flex items-center justify-between gap-4"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-dairy-700 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
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
      {/* 13. FINAL CTA SECTION */}
      {/* ======================================================== */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-900 to-slate-950 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Your Farm Deserves Better Than Guesswork.
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-medium">
            Bring your cows, milk records, co-op deliveries, and farm expenses into one simple place with Mylkio.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => onOpenAuth('signup')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-dairy-500 hover:bg-dairy-400 text-slate-950 font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span>Start Managing Your Farm</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Talk to Our Kenyan Team</span>
            </a>
          </div>

          <div className="pt-2 text-xs text-slate-400">
            14-day free trial • Cancel anytime • Direct WhatsApp support: {settings.supportWhatsApp}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 14. FOOTER */}
      {/* ======================================================== */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-dairy-700 flex items-center justify-center text-white font-black text-sm">
              M
            </div>
            <div>
              <span className="font-extrabold text-white text-sm">Mylkio</span>
              <p className="text-[11px] text-slate-400">Smarter Dairy Farming. Made Simple.</p>
            </div>
          </div>

          <div className="text-center sm:text-right space-y-1">
            <p className="text-slate-300 font-semibold">
              A product developed by <span className="text-white font-black">Versaly</span>.
            </p>
            <p className="text-[11px] text-slate-400">
              Built for Kenyan industries. &copy; {new Date().getFullYear()} Versaly. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* MODAL: FREE CHECKLIST LEAD MAGNET */}
      {/* ======================================================== */}
      {isChecklistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => {
                setIsChecklistModalOpen(false);
                setLeadSubmitted(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {!leadSubmitted ? (
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-dairy-50 text-dairy-700 flex items-center justify-center font-bold mb-1">
                  <FileText className="w-5 h-5" />
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Get the Free Record-Keeping Checklist
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter where to send your checklist and instant download link.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="e.g. David Mwangi"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-dairy-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Phone / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-dairy-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">County</label>
                    <input
                      type="text"
                      value={leadCounty}
                      onChange={(e) => setLeadCounty(e.target.value)}
                      placeholder="e.g. Nakuru, Kiambu"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-dairy-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">Number of Cows</label>
                    <input
                      type="number"
                      value={leadCows}
                      onChange={(e) => setLeadCows(e.target.value)}
                      placeholder="e.g. 6"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-dairy-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Free Checklist</span>
                </button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4 animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Your Checklist is Ready!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Thank you, {leadName}. Click the button below to download your printable file immediately.
                  </p>
                </div>

                <button
                  onClick={handleDownloadChecklistDirectly}
                  className="w-full py-3 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
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
