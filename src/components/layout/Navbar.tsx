import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PortalType } from '../../types';
import { AccountSwitcherModal } from '../auth/AccountSwitcherModal';
import { PWAInstallButton } from '../shared/PWAInstallButton';
import { RotateCcw, User, Shield, Users, Radio, ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentAccount,
    currentMember,
    activePortal,
    switchPortal,
    resetToDefaults,
  } = useApp();

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const portals: { id: PortalType; label: string; icon: React.ReactNode }[] = [
    { id: 'team', label: 'Team Portal', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'leadership', label: 'Leadership Portal', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'admin', label: 'Admin Portal', icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              MediaServe
            </span>
            <span className="hidden sm:inline-block text-xs text-slate-500 font-medium">
              · COP Akweteyman Worship Center
            </span>
          </div>

          {/* Zone 2: 3 Portal links/segmented controls */}
          <nav className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            {portals.map((p) => {
              const isActive = activePortal === p.id;
              const hasAccess = currentAccount.allowedPortals.includes(p.id);

              return (
                <button
                  key={p.id}
                  onClick={() => switchPortal(p.id)}
                  disabled={!hasAccess}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                      : hasAccess
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      : 'text-slate-600 cursor-not-allowed opacity-50'
                  }`}
                  title={!hasAccess ? `Your account (${currentAccount.email}) lacks ${p.label} privileges` : ''}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <PWAInstallButton />

            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-200 transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-[10px]">
                {currentMember.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <span className="hidden md:inline font-medium">{currentMember.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            <button
              onClick={resetToDefaults}
              title="Reset sample data to initial AKWC state"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <AccountSwitcherModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  );
};
