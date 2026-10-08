import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  User,
  ShieldCheck,
} from 'lucide-react';

export const DirectConfirmationModal: React.FC = () => {
  const { directConfirmData, closeDirectConfirmModal, confirmAttendance, declineAttendance, showToast } =
    useApp();

  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [error, setError] = useState('');

  if (!directConfirmData) return null;

  const { asg, prog, role, member } = directConfirmData;

  const handleConfirm = async () => {
    await confirmAttendance(asg.id);
    showToast(`Attendance confirmed for ${member.name}! Thank you for serving.`);
    closeDirectConfirmModal();
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      setError('Please provide a reason so leadership can assign a replacement.');
      return;
    }

    await declineAttendance(asg.id, declineReason.trim());
    showToast(`Decline noted. Leadership has been alerted to assign a replacement.`);
    closeDirectConfirmModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto shadow-amber-950/20">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Direct Duty Confirmation</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                  One-Tap Response
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AKWC Media Ministry Roster Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={closeDirectConfirmModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Member Greeting Pill */}
        <div className="my-4 p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white">{member.name}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{member.phone}</span>
          </div>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1">
            <div className="text-slate-300 flex items-center gap-1.5 font-semibold text-amber-300">
              <span>Station: {role.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" /> {prog.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Call Time: {prog.callTime}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
              <MapPin className="w-3 h-3" /> {role.station || prog.location}
            </div>
          </div>
        </div>

        {!showDeclineForm ? (
          <div className="space-y-3">
            <div className="text-xs text-slate-300 text-center px-2">
              Please confirm your availability to serve in this upcoming service:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleConfirm}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Attendance</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeclineForm(true)}
                className="py-3 px-4 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 font-semibold text-xs rounded-xl border border-slate-700 hover:border-rose-900/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Decline Duty</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDeclineSubmit} className="space-y-3 pt-1">
            <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl space-y-1">
              <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Declining Duty Assignment</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Please provide a brief reason so leadership can assign an available replacement candidate.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for Declining <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Travel out of town / Work shift conflict / Health reasons..."
                value={declineReason}
                onChange={(e) => {
                  setDeclineReason(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 leading-relaxed"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeclineForm(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Submit Decline & Alert Leadership
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
