'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserAccount, 
  Testimonial, 
  ContactLead, 
  PlatformSettings,
  SubscriptionPlan,
  SubscriptionStatus 
} from '@/types';
import { AppStorage } from '@/lib/storage';
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  PhoneCall, 
  Settings, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  ExternalLink, 
  DollarSign, 
  ShieldAlert, 
  RefreshCw, 
  Check, 
  LogOut,
  Building2,
  Calendar,
  Search,
  MessageCircle
} from 'lucide-react';

interface PlatformAdminViewProps {
  onLogout: () => void;
  onImpersonateFarm: (farmId: string) => void;
}

export const PlatformAdminView: React.FC<PlatformAdminViewProps> = ({
  onLogout,
  onImpersonateFarm,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'testimonials' | 'leads' | 'settings'>('overview');
  
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>(AppStorage.getPlatformSettings());

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Add testimonial modal / inline state
  const [isAddingTestimonial, setIsAddingTestimonial] = useState(false);
  const [testFarmerName, setTestFarmerName] = useState('');
  const [testFarmName, setTestFarmName] = useState('');
  const [testCounty, setTestCounty] = useState('');
  const [testCows, setTestCows] = useState(10);
  const [testQuote, setTestQuote] = useState('');
  const [testQuoteSw, setTestQuoteSw] = useState('');
  const [testRating, setTestRating] = useState(5);
  const [testFeatured, setTestFeatured] = useState(true);

  // Settings form
  const [savedSettingsSuccess, setSavedSettingsSuccess] = useState(false);

  const loadData = () => {
    setAccounts(AppStorage.getAccounts());
    setTestimonials(AppStorage.getTestimonials());
    setLeads(AppStorage.getLeads());
    setSettings(AppStorage.getPlatformSettings());
  };

  useEffect(() => {
    loadData();

    const handleAccounts = () => setAccounts(AppStorage.getAccounts());
    const handleTestimonials = () => setTestimonials(AppStorage.getTestimonials());
    const handleLeads = () => setLeads(AppStorage.getLeads());
    const handleSettings = () => setSettings(AppStorage.getPlatformSettings());

    window.addEventListener('mylkio_accounts_changed', handleAccounts);
    window.addEventListener('mylkio_testimonials_changed', handleTestimonials);
    window.addEventListener('mylkio_leads_changed', handleLeads);
    window.addEventListener('mylkio_settings_changed', handleSettings);

    return () => {
      window.removeEventListener('mylkio_accounts_changed', handleAccounts);
      window.removeEventListener('mylkio_testimonials_changed', handleTestimonials);
      window.removeEventListener('mylkio_leads_changed', handleLeads);
      window.removeEventListener('mylkio_settings_changed', handleSettings);
    };
  }, []);

  // Compute Platform KPIs
  const farmerAccounts = accounts.filter((a) => a.role === 'farmer');
  const activeSubscriptions = farmerAccounts.filter((a) => a.subscription.status === 'active');
  const trialSubscriptions = farmerAccounts.filter((a) => a.subscription.status === 'trial');
  const pastDueSubscriptions = farmerAccounts.filter((a) => a.subscription.status === 'past_due');
  
  const totalMrr = activeSubscriptions.reduce((acc, curr) => acc + (curr.subscription.monthlyPriceKsh || 0), 0);
  const newLeadsCount = leads.filter((l) => l.status === 'new').length;

  const handleUpdateStatus = (accountId: string, newStatus: SubscriptionStatus) => {
    AppStorage.updateAccountSubscription(accountId, { status: newStatus });
    loadData();
  };

  const handleUpdatePlan = (accountId: string, newPlan: SubscriptionPlan) => {
    const prices: Record<SubscriptionPlan, number> = {
      starter: 500,
      farmer: 1000,
      farm_pro: 2500,
      admin: 0,
    };
    AppStorage.updateAccountSubscription(accountId, { 
      plan: newPlan,
      status: 'active'
    });
    const accs = AppStorage.getAccounts();
    const target = accs.find((a) => a.id === accountId);
    if (target) {
      target.subscription.monthlyPriceKsh = prices[newPlan];
      AppStorage.saveAccounts(accs);
    }
    loadData();
  };

  const handleCreateTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testFarmerName || !testFarmName || !testQuote) return;

    AppStorage.addTestimonial({
      farmerName: testFarmerName.trim(),
      farmName: testFarmName.trim(),
      county: testCounty.trim(),
      cowsCount: Number(testCows) || 1,
      quote: testQuote.trim(),
      quoteSw: testQuoteSw.trim() || undefined,
      rating: Number(testRating) || 5,
      isApproved: true,
      featured: testFeatured,
    });

    setTestFarmerName('');
    setTestFarmName('');
    setTestCounty('');
    setTestQuote('');
    setTestQuoteSw('');
    setIsAddingTestimonial(false);
    loadData();
  };

  const handleToggleTestimonial = (id: string, current: boolean) => {
    AppStorage.updateTestimonial(id, { isApproved: !current });
    loadData();
  };

  const handleDeleteTestimonial = (id: string) => {
    if (confirm('Delete this testimonial permanently?')) {
      AppStorage.deleteTestimonial(id);
      loadData();
    }
  };

  const handleLeadStatus = (id: string, status: ContactLead['status']) => {
    AppStorage.updateLeadStatus(id, status);
    loadData();
  };

  const handleDeleteLead = (id: string) => {
    if (confirm('Delete this contact lead?')) {
      AppStorage.deleteLead(id);
      loadData();
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    AppStorage.updatePlatformSettings(settings);
    setSavedSettingsSuccess(true);
    setTimeout(() => setSavedSettingsSuccess(false), 3000);
  };

  const filteredAccounts = farmerAccounts.filter((a) => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#1c2621] text-slate-100 flex flex-col font-sans">
      {/* Top Admin Navigation Header */}
      <header className="bg-[#121915] border-b border-[#2d3b35] px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#345C4A] flex items-center justify-center text-white font-black text-lg shadow-sm">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">Mylkio Super Admin</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#345C4A]/40 text-[#A8BFA5] border border-[#A8BFA5]/30">
                Versaly Labs
              </span>
            </div>
            <p className="text-[11px] text-[#A8BFA5]/80">Master Platform Operations & Tenant Hub</p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onImpersonateFarm('farm-green-hills')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#26332D] hover:bg-[#32433b] text-slate-200 text-xs font-semibold border border-[#394943] transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-[#C6A76A]" />
            <span className="hidden sm:inline">Inspect Green Hills Demo</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-800 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 border-b border-[#2d3b35] pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-dairy-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Platform Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'accounts'
                ? 'bg-dairy-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tenant Accounts ({farmerAccounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('testimonials')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'testimonials'
                ? 'bg-dairy-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Website Testimonials ({testimonials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeTab === 'leads'
                ? 'bg-dairy-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Website Inquiries & Leads ({leads.length})</span>
            {newLeadsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-dairy-400 animate-ping absolute top-2 right-2" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-dairy-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>System Settings</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* OVERVIEW TAB */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#26332D] border border-[#394943] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-[#A8BFA5] mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Monthly Run-Rate (MRR)</span>
                  <DollarSign className="w-4 h-4 text-[#C6A76A]" />
                </div>
                <div className="text-2xl font-black text-[#C6A76A]">
                  KSh {totalMrr.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#A8BFA5]/80 mt-1">
                  From {activeSubscriptions.length} active paying farms
                </p>
              </div>

              <div className="bg-[#26332D] border border-[#394943] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-[#A8BFA5] mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Paid Subs</span>
                  <CreditCard className="w-4 h-4 text-[#A8BFA5]" />
                </div>
                <div className="text-2xl font-black text-white">
                  {activeSubscriptions.length}
                </div>
                <p className="text-[11px] text-[#A8BFA5]/80 mt-1">
                  {pastDueSubscriptions.length} account(s) past due
                </p>
              </div>

              <div className="bg-[#26332D] border border-[#394943] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-[#A8BFA5] mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">14-Day Free Trials</span>
                  <Calendar className="w-4 h-4 text-[#C6A76A]" />
                </div>
                <div className="text-2xl font-black text-white">
                  {trialSubscriptions.length}
                </div>
                <p className="text-[11px] text-[#A8BFA5]/80 mt-1">
                  Converting within next 2 weeks
                </p>
              </div>

              <div className="bg-[#26332D] border border-[#394943] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-[#A8BFA5] mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Farms</span>
                  <Users className="w-4 h-4 text-[#A8BFA5]" />
                </div>
                <div className="text-2xl font-black text-white">
                  {farmerAccounts.length}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Registered dairy tenants in Kenya
                </p>
              </div>
            </div>

            {/* Quick Action Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Recent Inquiries */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-dairy-400" />
                    <span>Recent Website Leads</span>
                  </h3>
                  <button 
                    onClick={() => setActiveTab('leads')}
                    className="text-xs text-dairy-400 hover:underline"
                  >
                    View all ({leads.length})
                  </button>
                </div>

                <div className="space-y-2.5">
                  {leads.slice(0, 3).map((lead) => (
                    <div key={lead.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{lead.name} • {lead.county || 'Kenya'}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{lead.phone} • {lead.cowsCount || 0} cows</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lead.status === 'new' ? 'bg-amber-900/70 text-amber-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {lead.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {leads.length === 0 && (
                    <p className="text-xs text-slate-500 py-3 text-center">No leads recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Subscribed Farmers Distribution */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Active Tenant Summary</span>
                  </h3>
                  <button 
                    onClick={() => setActiveTab('accounts')}
                    className="text-xs text-dairy-400 hover:underline"
                  >
                    Manage tenants
                  </button>
                </div>

                <div className="space-y-2.5">
                  {farmerAccounts.slice(0, 3).map((acc) => (
                    <div key={acc.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{acc.name}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{acc.email} • {acc.subscription.plan.toUpperCase()}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          acc.subscription.status === 'active' 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {acc.subscription.status.toUpperCase()}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">KSh {acc.subscription.monthlyPriceKsh}/mo</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ACCOUNTS & TENANTS TAB */}
        {/* ======================================================== */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Registered Farm Tenants</h2>
                <p className="text-xs text-slate-400">Manage farm subscriptions, renewal dates, and tenant access.</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search farmers..."
                  className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-dairy-500 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Farmer & Email</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Monthly Price</th>
                      <th className="px-4 py-3 font-semibold">Renews</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-200">
                    {filteredAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-white">{acc.name}</div>
                          <div className="text-[11px] text-slate-400">{acc.email}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-300">
                          {acc.phone || '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={acc.subscription.plan}
                            onChange={(e) => handleUpdatePlan(acc.id, e.target.value as SubscriptionPlan)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:ring-1 focus:ring-dairy-500"
                          >
                            <option value="starter">Starter (KSh 500)</option>
                            <option value="farmer">Farmer (KSh 1,000)</option>
                            <option value="farm_pro">Farm Pro (KSh 2,500)</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5">
                          <select
                            value={acc.subscription.status}
                            onChange={(e) => handleUpdateStatus(acc.id, e.target.value as SubscriptionStatus)}
                            className={`border rounded-lg px-2 py-1 text-xs font-semibold ${
                              acc.subscription.status === 'active'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : acc.subscription.status === 'trial'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : 'bg-red-950 text-red-300 border-red-800'
                            }`}
                          >
                            <option value="trial">Trial (14 Days)</option>
                            <option value="active">Active (Paid)</option>
                            <option value="past_due">Past Due</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-white">
                          KSh {acc.subscription.monthlyPriceKsh?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-[11px] text-slate-400">
                          {new Date(acc.subscription.renewsAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => onImpersonateFarm(acc.farmId)}
                            className="px-2.5 py-1 bg-dairy-700/80 hover:bg-dairy-600 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="Inspect this farm's records"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TESTIMONIALS CMS TAB */}
        {/* ======================================================== */}
        {activeTab === 'testimonials' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Website Testimonial Manager</h2>
                <p className="text-xs text-slate-400">Add, edit, approve, and curate authentic farmer stories for the marketing landing page.</p>
              </div>

              <button
                onClick={() => setIsAddingTestimonial(!isAddingTestimonial)}
                className="px-3.5 py-2 bg-dairy-600 hover:bg-dairy-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingTestimonial ? 'Close Form' : 'Add Testimonial'}</span>
              </button>
            </div>

            {/* Testimonial Creation Form */}
            {isAddingTestimonial && (
              <form onSubmit={handleCreateTestimonial} className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 space-y-4 animate-fade-in">
                <h3 className="text-xs font-bold uppercase tracking-wider text-dairy-400">New Farmer Testimonial</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">Farmer Name *</label>
                    <input
                      type="text"
                      required
                      value={testFarmerName}
                      onChange={(e) => setTestFarmerName(e.target.value)}
                      placeholder="e.g. Samuel K. Ndegwa"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">Farm Name *</label>
                    <input
                      type="text"
                      required
                      value={testFarmName}
                      onChange={(e) => setTestFarmName(e.target.value)}
                      placeholder="e.g. Menengai Vista Dairy"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">County *</label>
                    <input
                      type="text"
                      required
                      value={testCounty}
                      onChange={(e) => setTestCounty(e.target.value)}
                      placeholder="e.g. Nakuru County"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">English Quote *</label>
                    <textarea
                      required
                      rows={3}
                      value={testQuote}
                      onChange={(e) => setTestQuote(e.target.value)}
                      placeholder="What did the farmer achieve with Mylkio?"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">Kiswahili Quote (Optional)</label>
                    <textarea
                      rows={3}
                      value={testQuoteSw}
                      onChange={(e) => setTestQuoteSw(e.target.value)}
                      placeholder="Toleo la Kiswahili..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">Number of Cows</label>
                    <input
                      type="number"
                      value={testCows}
                      onChange={(e) => setTestCows(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">Star Rating (1-5)</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={testRating}
                      onChange={(e) => setTestRating(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id="featCheck"
                      checked={testFeatured}
                      onChange={(e) => setTestFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-dairy-600 bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="featCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                      Feature on Homepage
                    </label>
                  </div>

                  <div className="pt-4 ml-auto">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-dairy-600 hover:bg-dairy-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Publish Testimonial
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Testimonials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testimonials.map((test) => (
                <div 
                  key={test.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    test.isApproved 
                      ? 'bg-slate-800/80 border-slate-700/80' 
                      : 'bg-slate-900/60 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-white text-sm">{test.farmerName}</h4>
                      <p className="text-[11px] text-dairy-400 font-medium">{test.farmName} • {test.county} ({test.cowsCount} cows)</p>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleToggleTestimonial(test.id, test.isApproved)}
                        className={`p-1.5 rounded-lg text-xs font-semibold ${
                          test.isApproved 
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                            : 'bg-slate-800 text-slate-400'
                        }`}
                        title={test.isApproved ? 'Unpublish' : 'Approve for website'}
                      >
                        {test.isApproved ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDeleteTestimonial(test.id)}
                        className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs transition-colors"
                        title="Delete testimonial"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <blockquote className="mt-3 text-xs text-slate-300 italic border-l-2 border-dairy-500 pl-3">
                    &ldquo;{test.quote}&rdquo;
                  </blockquote>

                  {test.quoteSw && (
                    <blockquote className="mt-2 text-[11px] text-slate-400 italic border-l-2 border-slate-600 pl-3">
                      &ldquo;{test.quoteSw}&rdquo;
                    </blockquote>
                  )}

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-700/50">
                    <span className="text-amber-400 font-bold">★ {test.rating}.0 Rating</span>
                    {test.featured && (
                      <span className="px-2 py-0.5 rounded-full bg-dairy-950 text-dairy-300 text-[10px] font-bold border border-dairy-800">
                        Featured on Hero
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* LEADS & INQUIRIES TAB */}
        {/* ======================================================== */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Farmer Inquiries & Demo Leads</h2>
                <p className="text-xs text-slate-400">Captured automatically from the marketing landing page and checklist downloads.</p>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Farmer Name</th>
                      <th className="px-4 py-3 font-semibold">Phone / WhatsApp</th>
                      <th className="px-4 py-3 font-semibold">County & Cows</th>
                      <th className="px-4 py-3 font-semibold">Preferred Channel</th>
                      <th className="px-4 py-3 font-semibold">Message / Need</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-200">
                    {leads.map((lead) => {
                      const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
                      const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(lead.name)},%20thank%20you%20for%20contacting%20Mylkio%20Dairy%20MS!`;

                      return (
                        <tr key={lead.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-white">
                            {lead.name}
                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-dairy-300">{lead.phone}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div>{lead.county || 'Not specified'}</div>
                            <div className="text-[10px] text-slate-400">{lead.cowsCount ? `${lead.cowsCount} cows` : 'Count unknown'}</div>
                          </td>
                          <td className="px-4 py-3.5 uppercase text-[10px] font-bold text-slate-300">
                            {lead.preferredContact}
                          </td>
                          <td className="px-4 py-3.5 max-w-xs truncate text-slate-300 text-[11px]" title={lead.message}>
                            {lead.message || 'General inquiry'}
                          </td>
                          <td className="px-4 py-3.5">
                            <select
                              value={lead.status}
                              onChange={(e) => handleLeadStatus(lead.id, e.target.value as ContactLead['status'])}
                              className={`border rounded-lg px-2 py-1 text-xs font-semibold ${
                                lead.status === 'new'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : lead.status === 'contacted'
                                  ? 'bg-blue-950 text-blue-300 border-blue-800'
                                  : lead.status === 'converted'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              <option value="new">New Lead</option>
                              <option value="contacted">Contacted</option>
                              <option value="converted">Converted to Paying</option>
                              <option value="archived">Archived</option>
                            </select>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 text-xs inline-flex items-center gap-1 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>

                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-xs transition-colors inline-block"
                              title="Delete lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No inquiries received yet. When farmers submit the website contact or demo form, they will appear here!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PLATFORM SETTINGS TAB */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 max-w-2xl space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">Platform Commercial Settings</h2>
              <p className="text-xs text-slate-400">Configure global pricing tiers, customer care WhatsApp, and trial durations.</p>
            </div>

            {savedSettingsSuccess && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Platform settings updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1">Support WhatsApp Number</label>
                  <input
                    type="text"
                    value={settings.supportWhatsApp}
                    onChange={(e) => setSettings({ ...settings, supportWhatsApp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1">Starter Plan (KSh/mo)</label>
                  <input
                    type="number"
                    value={settings.starterPriceKsh}
                    onChange={(e) => setSettings({ ...settings, starterPriceKsh: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1">Farmer Plan (KSh/mo)</label>
                  <input
                    type="number"
                    value={settings.farmerPriceKsh}
                    onChange={(e) => setSettings({ ...settings, farmerPriceKsh: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase text-slate-300 mb-1">Pro Plan (KSh/mo)</label>
                  <input
                    type="number"
                    value={settings.proPriceKsh}
                    onChange={(e) => setSettings({ ...settings, proPriceKsh: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-300 mb-1">Free Trial Duration (Days)</label>
                <input
                  type="number"
                  value={settings.trialDays}
                  onChange={(e) => setSettings({ ...settings, trialDays: Number(e.target.value) })}
                  className="w-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-medium"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-dairy-600 hover:bg-dairy-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Platform Settings</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
