'use client';

import React from 'react';
import { planPillLabel } from '@/lib/billing';
import { formatKshPerMonth } from '@/lib/money';
import { Language, Farm, UserAccount } from '@/types';
import { translations } from '@/lib/translations';
import { ROLE_LABEL, roleOrOwner, tabsFor, type AppTab } from '@/lib/team';
import { SyncStatusBar } from '@/components/sync/SyncStatusBar';
import { 
  Home, 
  Milk, 
  Users, 
  Truck, 
  Receipt, MessagesSquare,
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
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
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
    { key: 'community', label: lang === 'sw' ? 'Jamii' : 'Community', icon: MessagesSquare },
    { key: 'settings', label: t.nav.more, icon: Settings },
  ] as const;
  const navItems = allNavItems.filter((item) => allowedTabs.includes(item.key));

  const mobileNavItems = navItems.filter((i) => i.key !== 'settings');

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#F8F8F3] flex flex-col md:flex-row text-[#26332D]">
      {/* Desktop Sidebar - Independently Scrollable */}
      <aside className="hidden md:flex flex-col w-64 bg-[#14291F] text-white p-4 shrink-0 md:h-screen md:overflow-y-auto custom-scrollbar">
        {/* Brand */}
        <div className="flex items-center space-x-3 px-3 py-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#F4DC7A] flex items-center justify-center text-[#14291F] font-bold text-xl">
            M
          </div>
          <div>
            <span className="block font-bold text-xl text-white tracking-tight">Mylkio</span>
            <p className="text-xs text-white/60 font-semibold">by Versaly</p>
          </div>
        </div>

        {/* Super Admin Impersonation Notice */}
        {isSuperAdminViewing && (
          <div className="mb-3 p-2.5 bg-[#FCF6DC] border border-[#EED98E] text-[#26332D] rounded-xl text-xs font-bold flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 text-[#7A5E0E]">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Admin Preview Mode</span>
            </div>
            {onReturnToAdmin && (
              <button
                onClick={onReturnToAdmin}
                className="w-full py-1 bg-[#14291F] text-white rounded-lg text-xs font-black hover:bg-[#0E1F17] transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to Admin Hub</span>
              </button>
            )}
          </div>
        )}

        {/* Farm Identity & Subscription Badge */}
        <div className="mb-5 px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl space-y-2">
          <div>
            <div className="text-xs font-semibold text-white/55">
              {lang === 'sw' ? 'Shamba lako' : 'Current farm'}
            </div>
            <div className="text-sm font-bold text-white truncate mt-0.5">
              {farm.name}
            </div>
            <div className="text-xs text-white/55 truncate">
              {farm.county}
            </div>
          </div>

          {user && role !== 'owner' && (
            <div className="pt-2 border-t border-white/10 text-xs">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/15 whitespace-nowrap">
                {ROLE_LABEL[role][lang === 'sw' ? 'sw' : 'en']}
              </span>
            </div>
          )}
          {user && role === 'owner' && (
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                user.subscription.status === 'active'
                  ? 'bg-white/10 text-white border border-white/15'
                  : 'bg-[#F4DC7A] text-[#14291F] border border-[#F4DC7A]'
              } whitespace-nowrap`}>
                {planPillLabel(user.subscription, lang === 'sw' ? 'sw' : 'en')}
              </span>
              <span className="font-bold text-white">
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
                    ? 'bg-[#F4DC7A] text-[#14291F] font-bold'
                    : 'text-white/70 hover:translate-x-1 hover:text-white hover:bg-white/[0.08]'
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
        <div className="pt-4 border-t border-white/10 space-y-3">
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/[0.08] hover:bg-white/15 text-white transition-colors border border-white/10"
            >
              <Download className="w-3.5 h-3.5 text-[#F4DC7A]" />
              <span>{lang === 'sw' ? 'Pakua CSV / Backup' : 'Export Data / CSV'}</span>
            </button>
          )}

          <button
            onClick={onLanguageToggle}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.08] hover:bg-white/15 text-white transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Globe className="w-3.5 h-3.5 text-[#F4DC7A]" />
              <span>{lang === 'en' ? 'English (EN)' : 'Kiswahili (SW)'}</span>
            </div>
            <span className="text-xs text-white/55 font-bold">Switch</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-white/[0.08] hover:text-rose-200 transition-colors"
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
          <div className="md:hidden bg-[#FCF6DC] border-b border-[#EED98E] text-[#26332D] px-4 py-2 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5 text-[#7A5E0E]">
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Preview</span>
            </div>
            {onReturnToAdmin && (
              <button
                onClick={onReturnToAdmin}
                className="px-2 py-0.5 bg-[#14291F] text-white rounded text-xs font-black"
              >
                Back to Admin
              </button>
            )}
          </div>
        )}

        {/* Mobile Top Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DDE2D6] px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F4DC7A] flex items-center justify-center text-[#14291F] font-bold text-sm md:hidden">
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
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE2D6] bg-[#F8F8F3] hover:bg-[#EEF0E8] text-[#26332D] transition-colors"
                title="Export Data"
                aria-label={lang === 'sw' ? 'Pakua data' : 'Export data'}
              >
                <Download className="w-4 h-4 text-[#345C4A]" />
              </button>
            )}

            <button
              onClick={onLanguageToggle}
              className="flex h-11 items-center gap-1 px-3 rounded-full border border-[#DDE2D6] bg-[#F8F8F3] hover:bg-[#EEF0E8] text-sm font-bold text-[#26332D] transition-colors"
              aria-label={lang === 'sw' ? 'Badilisha lugha: Kiswahili au Kiingereza' : 'Change language: English or Kiswahili'}
            >
              <Globe className="w-3.5 h-3.5 text-[#345C4A]" />
              <span>{lang.toUpperCase()}</span>
            </button>

            <button
              onClick={() => onTabChange('settings')}
              aria-label={lang === 'sw' ? 'Mipangilio' : 'Settings'}
              className={`flex h-11 w-11 items-center justify-center rounded-full border border-[#DDE2D6] text-[#5D7368] md:hidden ${activeTab === 'settings' ? 'bg-[#A8BFA5]/20 text-[#345C4A] border-[#A8BFA5]' : 'bg-[#F8F8F3]'}`}
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
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#DDE2D6] shadow-lg px-2 py-1.5 flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                className={`flex min-h-12 min-w-0 flex-auto flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#14291F] font-bold'
                    : 'text-[#5D7368] hover:text-[#26332D] font-semibold'
                }`}
              >
                <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? 'bg-[#F4DC7A]' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25px]' : 'stroke-[1.75px]'}`} />
                </span>
                <span className="mt-0.5 max-w-full truncate text-[11px] leading-tight tracking-tighter min-[360px]:text-xs min-[360px]:tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
