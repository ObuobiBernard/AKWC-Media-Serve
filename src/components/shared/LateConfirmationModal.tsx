import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProgramService, MediaRole } from '../../types';
import { X, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface LateConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  program: ProgramService;
  role: MediaRole;
}

export const LateConfirmationModal: React.FC<LateConfirmationModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  program,
  role,
}) => {
  const { confirmAttendance } = useApp();

  const [arrivalComment, setArrivalComment] = useState('');
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arrivalComment.trim()) {
      setError('Please provide a brief reason or comment for leadership.');
      return;
    }

    await confirmAttendance(assignmentId, arrivalComment.trim(), estimatedArrivalTime.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Confirm Availability with Arrival Note</h3>
              <p className="text-xs text-slate-400">
                Let leadership know you are serving but will be slightly delayed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Service & Official Call Time Pill */}
        <div className="my-4 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
          <div className="text-slate-400">Service: <strong className="text-white">{program.title}</strong></div>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60 text-slate-300">
            <span>Station: <strong className="text-amber-300">{role.name}</strong></span>
            <span>Official Call Time: <strong className="text-amber-400 font-mono">{program.callTime}</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Estimated Arrival Time (ETA)
            </label>
            <input
              type="text"
              placeholder="e.g. 7:30 AM, or 20 mins after call time"
              value={estimatedArrivalTime}
              onChange={(e) => setEstimatedArrivalTime(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Official call time is {program.callTime}. Please specify approximately when you expect to arrive at the media booth.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Arrival Comment / Reason <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-slate-500 font-normal">Visible to Media Leadership</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Closing late from hospital shift / Heavy traffic from Achimota / Exam finishing at 8:00 AM..."
              value={arrivalComment}
              onChange={(e) => {
                setArrivalComment(e.target.value);
                setError('');
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Availability (With Note)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
