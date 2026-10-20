import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PortalType } from '../../types';
import { AccountSwitcherModal } from '../auth/AccountSwitcherModal';
import { PWAInstallButton } from '../shared/PWAInstallButton';
import { RotateCcw, User, Shield, Radio, ChevronDown, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentAccount,
    currentMember,
    activePortal,
    switchPortal,
    resetToDefaults,
    logout,
    isSuperAdmin,
    isLeader,
  } = useApp();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const hasLeadership =
    isSuperAdmin ||
    isLeader ||
    currentAccount.allowedPortals.includes('leadership') ||
    Boolean(currentMember?.isLeader);

  const portals: { id: PortalType; label: string; icon: React.ReactNode }[] = [
    { id: 'team', label: 'Team', icon: <User className="w-3.5 h-3.5" /> },
    ...(hasLeadership
      ? [{ id: 'leadership' as PortalType, label: 'Leadership', icon: <Radio className="w-3.5 h-3.5" /> }]
      : []),
    ...(isSuperAdmin
      ? [{ id: 'admin' as PortalType, label: 'Admin', icon: <Shield className="w-3.5 h-3.5" /> }]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3 space-y-2 md:space-y-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo / Wordmark on top */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              MediaServe
            </span>
            <span className="hidden lg:inline-block text-xs text-slate-500 font-medium">
              · COP Akweteyman Worship Center
            </span>
          </div>

          {/* Desktop Portal Navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {portals.map((p) => {
              const isActive = activePortal === p.id;
              const hasAccess =
                p.id === 'admin'
                  ? isSuperAdmin
                  : p.id === 'leadership'
                  ? hasLeadership
                  : true;

              return (
                <button
                  key={p.id}
                  onClick={() => switchPortal(p.id)}
                  disabled={!hasAccess}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : hasAccess
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      : 'text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  title={!hasAccess ? `Your account lacks ${p.label} privileges` : ''}
                >
                  {p.icon}
                  <span>{p.label} Portal</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton />
            </div>

            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-200 transition-colors cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-[10px]">
                {currentMember.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <span className="hidden sm:inline font-medium truncate max-w-[90px]">{currentMember.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            <button
              onClick={logout}
              title="Sign out of MediaServe"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Portal Navigation Row (Stacked cleanly below MediaServe logo on smaller screens) */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
          {portals.map((p) => {
            const isActive = activePortal === p.id;
            const hasAccess =
              p.id === 'admin'
                ? isSuperAdmin
                : p.id === 'leadership'
                ? hasLeadership
                : true;

            return (
              <button
                key={p.id}
                onClick={() => switchPortal(p.id)}
                disabled={!hasAccess}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : hasAccess
                    ? 'bg-slate-900 text-slate-300 border border-slate-800'
                    : 'bg-slate-950 text-slate-600 border border-slate-900 opacity-50 cursor-not-allowed'
                }`}
              >
                {p.icon}
                <span>{p.label} Portal</span>
              </button>
            );
          })}
        </div>
      </header>

      <AccountSwitcherModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  );
};
