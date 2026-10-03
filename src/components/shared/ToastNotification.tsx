import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2 } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/60 text-slate-100 text-sm max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
      <span className="leading-snug">{toastMessage}</span>
    </div>
  );
};
