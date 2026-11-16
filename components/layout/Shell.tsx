'use client';

import React from 'react';
import { planPillLabel } from '@/lib/billing';
import { formatKshPerMonth } from '@/lib/money';
import { Language, Farm, UserAccount } from '@/types';
import { translations } from '@/lib/translations';
import { ROLE_LABEL, roleOrOwner, tabsFor } from '@/lib/team';
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
  onOpenExport: onOpenExportProp,
  farm,
  user,
  onLogout,
  onReturnToAdmin,
  isSuperAdminViewing = false,
}) => {
  const t = translations[lang];
  // A farm can have several logins: what each may open depends on their role (a worker never sees money).
  const role = roleOrOwner(user?.farmRole);
  const allowedTabs = tabsFor(role);
  // Exporting copies every record, which a worker's device does not even hold.
  const onOpenExport = role === 'worker' ? undefined : onOpenExportProp;

  const allNavItems = [
    { key: 'home', label: t.nav.home, icon: Home },
    { key: 'milk', label: t.nav.milk, icon: Milk },
    { key: 'herd', label: t.nav.herd, icon: Users },
    { key: 'sales', label: t.nav.sales, icon: Truck },
    { key: 'finance', label: lang === 'sw' ? 'Fedha' : 'Finance', icon: Receipt },
    { key: 'settings', label: t.nav.more, icon: Settings },
  ] as const;
  const navItems = allNavItems.filter((item) => allowedTabs.includes(item.key));

  const mobileNavItems = navItems.filter((i) => i.key !== 'settings');

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#FAF9F5] flex flex-col md:flex-row text-[#26332D]">
      {/* Desktop Sidebar - Independently Scrollable */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-[#E8E4D8] p-4 shrink-0 md:h-screen md:overflow-y-auto custom-scrollbar">
        {/* Brand */}
        <div className="flex items-center space-x-3 px-3 py-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#345C4A] flex items-center justify-center text-white font-black text-xl shadow-md">
            M
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg text-[#26332D] tracking-tight">Mylkio</span>
              <span className="text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#A8BFA5]/25 text-[#26332D]">
                Kenya
              </span>
            </div>
            <p className="text-xs text-[#879C91] font-medium">Dairy Farm MS</p>
          </div>
        </div>

        {/* Super Admin Impersonation Notice */}
        {isSuperAdminViewing && (
          <div className="mb-3 p-2.5 bg-[#FAF5EB] border border-[#E5D5B5] text-[#26332D] rounded-xl text-xs font-bold flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[#8e7238]">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Admin Preview Mode</span>
            </div>
            {onReturnToAdmin && (
              <button
                onClick={onReturnToAdmin}
                className="w-full py-1 bg-[#26332D] text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-[#1b2520] transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Admin Hub</span>
              </button>
            )}
          </div>
        )}

        {/* Farm Identity & Subscription Badge */}
        <div className="mb-5 px-3 py-2.5 bg-[#FAF9F5]/70 border border-[#E8E4D8] rounded-xl space-y-2">
          <div>
            <div className="text-xs font-semibold text-[#879C91] uppercase tracking-wider">
              {lang === 'sw' ? 'Shamba Lako' : 'Current Farm'}
            </div>
            <div className="text-sm font-bold text-[#26332D] truncate mt-0.5">
              {farm.name}
            </div>
            <div className="text-xs text-[#879C91] truncate">
              {farm.county}
            </div>
          </div>

          {user && role !== 'owner' && (
            <div className="pt-2 border-t border-[#E8E4D8] text-xs">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#A8BFA5]/25 text-[#26332D] border border-[#A8BFA5]/40 whitespace-nowrap">
                {ROLE_LABEL[role][lang === 'sw' ? 'sw' : 'en']}
              </span>
            </div>
          )}
          {user && role === 'owner' && (
            <div className="pt-2 border-t border-[#E8E4D8] flex items-center justify-between text-xs">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                user.subscription.status === 'active'
                  ? 'bg-[#A8BFA5]/25 text-[#26332D] border border-[#A8BFA5]/40'
                  : 'bg-[#FAF5EB] text-[#8e7238] border border-[#E5D5B5]'
              } whitespace-nowrap`}>
                {planPillLabel(user.subscription, lang === 'sw' ? 'sw' : 'en')}
              </span>
              <span className="font-extrabold text-[#26332D]">
                {formatKshPerMonth(user.subscription.monthlyPriceKsh || 0, true)}
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
                className={`nav-item group w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ease-premium ${
                  isActive
                    ? 'bg-[#345C4A] text-white shadow-sm'
                    : 'text-[#5D7368] hover:translate-x-1 hover:text-[#26332D] hover:bg-[#e4ede7]/70'
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
        <div className="pt-4 border-t border-[#E8E4D8] space-y-3">
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#A8BFA5]/20 hover:bg-[#A8BFA5]/30 text-[#26332D] transition-colors border border-[#A8BFA5]/40"
            >
              <Download className="w-3.5 h-3.5 text-[#345C4A]" />
              <span>{lang === 'sw' ? 'Pakua CSV / Backup' : 'Export Data / CSV'}</span>
            </button>
          )}

          <button
            onClick={onLanguageToggle}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#FAF9F5] hover:bg-[#F2EFE7] text-[#26332D] transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Globe className="w-3.5 h-3.5 text-[#345C4A]" />
              <span>{lang === 'en' ? 'English (EN)' : 'Kiswahili (SW)'}</span>
            </div>
            <span className="text-xs text-[#879C91] uppercase font-bold">Switch</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'sw' ? 'Ondoka (Sign Out)' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area - Independently Scrollable */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto custom-scrollbar">
        {/* Mobile Super Admin Return Notice */}
        {isSuperAdminViewing && (
          <div className="md:hidden bg-[#FAF5EB] border-b border-[#E5D5B5] text-[#26332D] px-4 py-2 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5 text-[#8e7238]">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Preview</span>
            </div>
            {onReturnToAdmin && (
              <button
                onClick={onReturnToAdmin}
                className="px-2 py-0.5 bg-[#26332D] text-white rounded text-xs uppercase font-black"
              >
                Back to Admin
              </button>
            )}
          </div>
        )}

        {/* Mobile Top Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8E4D8] px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#345C4A] flex items-center justify-center text-white font-black text-sm shadow-sm md:hidden">
              M
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-[#26332D] tracking-tight md:hidden">Mylkio</span>
                <span className="font-bold text-sm text-[#26332D] hidden md:inline">
                  {farm.name} • {farm.county}
                </span>
              </div>
              <p className="text-xs text-[#879C91] font-medium md:hidden truncate">
                {farm.name}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <SyncStatusBar lang={lang} onOpenExport={onOpenExport} />

            {onOpenExport && (
              <button
                onClick={onOpenExport}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E4D8] bg-[#FAF9F5] hover:bg-[#F2EFE7] text-[#26332D] transition-colors"
                title="Export Data"
                aria-label={lang === 'sw' ? 'Pakua data' : 'Export data'}
              >
                <Download className="w-4 h-4 text-[#345C4A]" />
              </button>
            )}

            <button
              onClick={onLanguageToggle}
              className="flex h-11 items-center gap-1 px-3 rounded-full border border-[#E8E4D8] bg-[#FAF9F5] hover:bg-[#F2EFE7] text-sm font-bold text-[#26332D] transition-colors"
              aria-label={lang === 'sw' ? 'Badilisha lugha: Kiswahili au Kiingereza' : 'Change language: English or Kiswahili'}
            >
              <Globe className="w-3.5 h-3.5 text-[#345C4A]" />
              <span>{lang.toUpperCase()}</span>
            </button>

            <button
              onClick={() => onTabChange('settings')}
              aria-label={lang === 'sw' ? 'Mipangilio' : 'Settings'}
              className={`flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E4D8] text-[#5D7368] md:hidden ${activeTab === 'settings' ? 'bg-[#A8BFA5]/20 text-[#345C4A] border-[#A8BFA5]' : 'bg-[#FAF9F5]'}`}
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E8E4D8] shadow-lg px-2 py-1.5 flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`flex min-h-12 min-w-14 flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#345C4A] font-bold'
                    : 'text-[#879C91] hover:text-[#26332D] font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] scale-105' : 'stroke-[1.75px]'}`} />
                <span className="text-xs mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
