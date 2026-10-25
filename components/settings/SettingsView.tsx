'use client';

import React, { useState } from 'react';
import { Farm, Language, UserAccount } from '@/types';
import { translations } from '@/lib/translations';
import { AppStorage } from '@/lib/storage';
import { Globe, Building, Database, RefreshCw, Check, Smartphone, CreditCard, LogOut } from 'lucide-react';

interface SettingsViewProps {
  farm: Farm;
  onUpdateFarm: (updated: Farm) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  user?: UserAccount | null;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  farm,
  onUpdateFarm,
  lang,
  onLanguageChange,
  user,
  onLogout,
}) => {
  const t = translations[lang];

  const [farmName, setFarmName] = useState(farm.name);
  const [county, setCounty] = useState(farm.county);
  const [subCounty, setSubCounty] = useState(farm.subCounty || '');
  const [ownerName, setOwnerName] = useState(farm.ownerName);
  const [phone, setPhone] = useState(farm.phone);
  const [currency, setCurrency] = useState(farm.currency || 'KSh');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveFarm = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Farm = {
      ...farm,
      name: farmName.trim(),
      county: county.trim(),
      subCounty: subCounty.trim() || undefined,
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      currency,
    };
    onUpdateFarm(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLoadDemo = () => {
    if (confirm(lang === 'sw' ? 'Je, ungependa kupakia data ya mfano ya Nakuru (ng\'ombe 8, wanunuzi 3)?' : 'Load sample Nakuru demo farm records (8 cattle, 3 buyers)?')) {
      AppStorage.resetToDemo();
    }
  };

  const handleClearData = () => {
    if (confirm(lang === 'sw' ? 'Una uhakika unataka kufuta taarifa zote za shamba hili?' : 'Are you sure you want to clear all data for this farm?')) {
      AppStorage.clearCurrentTenant();
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {t.settings.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {lang === 'sw' ? 'Badilisha lugha, taarifa za shamba na nakala za data' : 'Configure language, farm identity, and local storage demo data'}
        </p>
      </div>

      {/* Language Selection Card */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-dairy-50 text-dairy-600 rounded-xl">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t.settings.language}
            </h2>
            <p className="text-xs text-gray-500">
              {lang === 'sw' ? 'Chagua lugha unayopendelea kwa ajili ya mfumo' : 'Select your primary operational language'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              lang === 'en'
                ? 'border-dairy-600 bg-dairy-50/70 ring-2 ring-dairy-500/20'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="font-bold text-sm text-gray-900">English</span>
            <span className="text-xs text-gray-500 mt-1">Default English UI</span>
          </button>

          <button
            type="button"
            onClick={() => onLanguageChange('sw')}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all ${
              lang === 'sw'
                ? 'border-dairy-600 bg-dairy-50/70 ring-2 ring-dairy-500/20'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="font-bold text-sm text-gray-900">Kiswahili</span>
            <span className="text-xs text-gray-500 mt-1">Lugha ya Kiswahili</span>
          </button>
        </div>
      </div>

      {/* Subscription & Account Status */}
      {user && (
        <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#A8BFA5]/20 text-[#345C4A] rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {lang === 'sw' ? 'Hali ya Usajili wa Kila Mwezi' : 'Monthly Subscription'}
              </h2>
              <p className="text-xs text-gray-500">
                {lang === 'sw' ? 'Mpango wako wa sasa na tarehe ya kurejesha' : 'Your current plan and renewal details'}
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#FAF9F5]/70 border border-[#E8E4D8] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-[#26332D] uppercase">
                  {user.subscription.plan.replace('_', ' ')} Plan
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  user.subscription.status === 'active'
                    ? 'bg-[#A8BFA5]/25 text-[#26332D] border border-[#A8BFA5]/40'
                    : 'bg-[#FAF5EB] text-[#8e7238] border border-[#E5D5B5]'
                }`}>
                  {user.subscription.status === 'trial' ? '14-Day Free Trial' : user.subscription.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Renews on {new Date(user.subscription.renewsAt).toLocaleDateString()} • {user.email}
              </p>
            </div>

            <div className="text-right">
              <div className="text-lg font-black text-[#345C4A]">
                KSh {user.subscription.monthlyPriceKsh?.toLocaleString()}/mo
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">Billed monthly via M-Pesa</span>
            </div>
          </div>

          {onLogout && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Toka kwenye Akaunti' : 'Sign Out of Farm'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Farm Profile Form */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm">
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-2.5 bg-[#A8BFA5]/20 text-[#345C4A] rounded-xl">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t.settings.farmProfile}
            </h2>
            <p className="text-xs text-gray-500">
              {lang === 'sw' ? 'Maelezo ya shamba na eneo la kijiografia' : 'Manage your dairy farm details and location in Kenya'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveFarm} className="space-y-4">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{lang === 'sw' ? 'Taarifa za shamba zimehifadhiwa!' : 'Farm profile saved successfully!'}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.settings.farmName}
              </label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.settings.county}
              </label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g. Nakuru County, Kiambu, Uasin Gishu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.settings.owner}
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Sub-County / Area
              </label>
              <input
                type="text"
                value={subCounty}
                onChange={(e) => setSubCounty(e.target.value)}
                placeholder="e.g. Rongai, Njoro, Limuru"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                {t.settings.currency}
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-dairy-500 text-sm bg-gray-50"
                readOnly
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-dairy-600 hover:bg-dairy-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>{lang === 'sw' ? 'Hifadhi Wasifu wa Shamba' : 'Save Farm Profile'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Offline Status & Demo Data Control */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#FAF5EB] text-[#C6A76A] border border-[#E5D5B5] rounded-xl">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {t.settings.demoDataTitle}
            </h2>
            <p className="text-xs text-gray-500">
              {t.settings.demoDataDesc}
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center space-x-3 text-xs text-emerald-800 font-medium">
          <Smartphone className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{t.settings.offlineStatus}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleLoadDemo}
            className="flex items-center space-x-2 px-4 py-2.5 bg-dairy-50 border border-dairy-200 text-dairy-800 rounded-xl font-semibold text-xs hover:bg-dairy-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-dairy-600" />
            <span>{t.settings.loadDemoBtn}</span>
          </button>

          <button
            onClick={handleClearData}
            className="px-4 py-2.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl border border-red-200 transition-colors"
          >
            {t.settings.clearDataBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
