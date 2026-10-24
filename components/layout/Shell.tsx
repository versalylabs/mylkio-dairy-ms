'use client';

import React from 'react';
import { Language, Farm, UserAccount } from '@/types';
import { translations } from '@/lib/translations';
import { SyncStatusBar } from '@/components/sync/SyncStatusBar';
import { 
  Home, 
  Milk, 
  Users, 
  Truck, 
  Receipt,
  Settings, 
  Globe, 
  Download,
  ChevronRight,
  LogOut,
  Shield,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface ShellProps {
  children: React.ReactNode;
  activeTab: 'home' | 'milk' | 'herd' | 'sales' | 'finance' | 'settings';
  onTabChange: (tab: 'home' | 'milk' | 'herd' | 'sales' | 'finance' | 'settings') => void;
  lang: Language;
  onLanguageToggle: () => void;
  onOpenExport?: () => void;
  farm: Farm;
  user: UserAccount | null;
  onLogout: () => void;
  onReturnToAdmin?: () => void;
  isSuperAdminViewing?: boolean;
}

export const Shell: React.FC<ShellProps> = ({
  children,
  activeTab,
  onTabChange,
  lang,
  onLanguageToggle,
  onOpenExport,
  farm,
  user,
  onLogout,
  onReturnToAdmin,
  isSuperAdminViewing = false,
}) => {
  const t = translations[lang];

  const navItems = [
    { key: 'home', label: t.nav.home, icon: Home },
    { key: 'milk', label: t.nav.milk, icon: Milk },
    { key: 'herd', label: t.nav.herd, icon: Users },
    { key: 'sales', label: t.nav.sales, icon: Truck },
    { key: 'finance', label: lang === 'sw' ? 'Fedha' : 'Finance', icon: Receipt },
    { key: 'settings', label: t.nav.more, icon: Settings },
  ] as const;

  const mobileNavItems = navItems.filter((i) => i.key !== 'settings');

  return (
    <div className="min-h-screen bg-[#F7F4EA] flex flex-col md:flex-row text-[#2D3327]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#e5e1d3] p-4 shrink-0">
        {/* Brand */}
        <div className="flex items-center space-x-3 px-3 py-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#48563A] flex items-center justify-center text-white font-black text-xl shadow-md">
            M
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-[#2D3327] tracking-tight">Mylkio</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#A9B392]/25 text-[#2D3327]">
                Kenya
              </span>
            </div>
            <p className="text-[11px] text-[#798375] font-medium">Dairy Farm MS</p>
          </div>
        </div>

        {/* Super Admin Impersonation Notice */}
        {isSuperAdminViewing && (
          <div className="mb-3 p-2.5 bg-[#D6B46D] text-[#2D3327] rounded-xl text-xs font-bold flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Admin Preview Mode</span>
            </div>
            {onReturnToAdmin && (
              <button
                onClick={onReturnToAdmin}
                className="w-full py-1 bg-[#2D3327] text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#20251c] transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Admin Hub</span>
              </button>
            )}
          </div>
        )}

        {/* Farm Identity & Subscription Badge */}
        <div className="mb-5 px-3 py-2.5 bg-[#F7F4EA]/70 border border-[#e5e1d3] rounded-xl space-y-2">
          <div>
            <div className="text-[10px] font-semibold text-[#798375] uppercase tracking-wider">
              {lang === 'sw' ? 'Shamba Lako' : 'Current Farm'}
            </div>
            <div className="text-sm font-bold text-[#2D3327] truncate mt-0.5">
              {farm.name}
            </div>
            <div className="text-[11px] text-[#798375] truncate">
              {farm.county}
            </div>
          </div>

          {user && (
            <div className="pt-2 border-t border-[#e5e1d3] flex items-center justify-between text-[11px]">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                user.subscription.status === 'active'
                  ? 'bg-[#A9B392]/25 text-[#2D3327] border border-[#A9B392]/40'
                  : 'bg-[#D6B46D]/25 text-[#6e531c] border border-[#D6B46D]/40'
              }`}>
                {user.subscription.status === 'trial' ? '14-Day Free Trial' : `${user.subscription.plan.toUpperCase()} Plan`}
              </span>
              <span className="font-extrabold text-[#2D3327]">
                KSh {user.subscription.monthlyPriceKsh || 0}/mo
              </span>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#48563A] text-white shadow-sm'
                    : 'text-[#596455] hover:text-[#2D3327] hover:bg-[#F7F4EA]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
              </button>
            );
          })}
        </nav>

        {/* Desktop Sidebar Footer */}
        <div className="pt-4 border-t border-[#e5e1d3] space-y-3">
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#A9B392]/20 hover:bg-[#A9B392]/30 text-[#2D3327] transition-colors border border-[#A9B392]/40"
            >
              <Download className="w-3.5 h-3.5 text-[#48563A]" />
              <span>{lang === 'sw' ? 'Pakua CSV / Backup' : 'Export Data / CSV'}</span>
            </button>
          )}

          <button
            onClick={onLanguageToggle}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F7F4EA] hover:bg-[#ede7d6] text-[#2D3327] transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Globe className="w-3.5 h-3.5 text-[#48563A]" />
              <span>{lang === 'en' ? 'English (EN)' : 'Kiswahili (SW)'}</span>
            </div>
            <span className="text-[10px] text-[#798375] uppercase font-bold">Switch</span>
          </button>

          <div className="px-1">
            <SyncStatusBar lang={lang} onOpenExport={onOpenExport} />
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'sw' ? 'Ondoka (Sign Out)' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Super Admin Return Notice */}
        {isSuperAdminViewing && (
          <div className="md:hidden bg-[#D6B46D] text-[#2D3327] px-4 py-2 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Preview</span>
            </div>
            {onReturnToAdmin && (
              <button
                onClick={onReturnToAdmin}
                className="px-2 py-0.5 bg-[#2D3327] text-white rounded text-[10px] uppercase font-black"
              >
                Back to Admin
              </button>
            )}
          </div>
        )}

        {/* Mobile Top Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e5e1d3] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#48563A] flex items-center justify-center text-white font-black text-sm shadow-sm md:hidden">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-[#2D3327] tracking-tight md:hidden">Mylkio</span>
                <span className="font-bold text-sm text-[#2D3327] hidden md:inline">
                  {farm.name} • {farm.county}
                </span>
              </div>
              <p className="text-[11px] text-[#798375] font-medium md:hidden truncate max-w-[170px]">
                {farm.name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <SyncStatusBar lang={lang} onOpenExport={onOpenExport} />

            {onOpenExport && (
              <button
                onClick={onOpenExport}
                className="p-1.5 rounded-full border border-[#e5e1d3] bg-[#F7F4EA] hover:bg-[#ede7d6] text-[#2D3327] transition-colors shadow-2xs"
                title="Export Data"
              >
                <Download className="w-4 h-4 text-[#48563A]" />
              </button>
            )}

            <button
              onClick={onLanguageToggle}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full border border-[#e5e1d3] bg-[#F7F4EA] hover:bg-[#ede7d6] text-xs font-bold text-[#2D3327] transition-colors shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5 text-[#48563A]" />
              <span>{lang.toUpperCase()}</span>
            </button>

            <button
              onClick={() => onTabChange('settings')}
              className={`p-1.5 rounded-full border border-[#e5e1d3] text-[#596455] md:hidden ${activeTab === 'settings' ? 'bg-[#A9B392]/20 text-[#48563A] border-[#A9B392]' : 'bg-[#F7F4EA]'}`}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e5e1d3] shadow-lg px-2 py-1.5 flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#48563A] font-bold'
                    : 'text-[#798375] hover:text-[#2D3327] font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
