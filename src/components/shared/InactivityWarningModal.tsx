import React from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, ShieldAlert, LogOut } from 'lucide-react';

export const InactivityWarningModal: React.FC = () => {
  const {
    showInactivityWarning,
    inactivitySecondsRemaining,
    resetInactivityTimer,
    logout,
  } = useApp();

  if (!showInactivityWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 text-center space-y-4 shadow-amber-950/40">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-md">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-amber-300 uppercase tracking-wide">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Session Timeout Warning</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-2">
            Are you still working?
          </h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            You have been inactive for some time. To protect church roster data and administrative credentials, your session will automatically close in:
          </p>
        </div>

        {/* Big countdown display */}
        <div className="py-2">
          <span className="font-mono text-4xl font-extrabold text-amber-400 tabular-nums">
            {inactivitySecondsRemaining}
          </span>
          <span className="text-xs text-slate-400 block mt-0.5">seconds remaining</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={resetInactivityTimer}
            className="w-full sm:flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            I&apos;m Still Here (Stay Logged In)
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full sm:w-auto py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
