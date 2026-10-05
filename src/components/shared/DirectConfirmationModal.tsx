import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProgramService, RoleAssignment, MediaRole, TeamMember } from '../../types';
import { CheckCircle2, Clock, X, AlertCircle, MessageSquare } from 'lucide-react';

interface DirectConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: RoleAssignment;
  program: ProgramService;
  role: MediaRole;
  member: TeamMember;
}

export const DirectConfirmationModal: React.FC<DirectConfirmationModalProps> = ({
  isOpen,
  onClose,
  assignment,
  program,
  role,
  member,
}) => {
  const { confirmAttendance, declineAttendance } = useApp();

  const [mode, setMode] = useState<'options' | 'lateNote' | 'decline'>('options');
  const [arrivalComment, setArrivalComment] = useState('');
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('');
  const [declineReason, setDeclineReason] = useState('Work schedule conflict');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirmOnTime = () => {
    confirmAttendance(assignment.id);
    onClose();
  };

  const handleConfirmWithNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arrivalComment.trim()) {
      setError('Please provide a reason or note for leadership.');
      return;
    }
    confirmAttendance(assignment.id, arrivalComment.trim(), estimatedArrivalTime.trim() || undefined);
    onClose();
  };

  const handleDeclineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    declineAttendance(assignment.id, declineReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-100 space-y-5 shadow-amber-950/40">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>WhatsApp Duty Confirmation Link</span>
            </span>
            <h2 className="text-xl font-extrabold text-white mt-1">
              Welcome, {member.name}!
            </h2>
            <p className="text-xs text-slate-400">
              Please confirm your attendance on the media roster below:
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Duty Overview Card */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 font-semibold">{program.serviceType}</span>
            <span className="text-slate-400 font-mono">{program.date}</span>
          </div>
          <div className="text-sm font-bold text-white leading-snug">{program.title}</div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-500 block">Assigned Station</span>
              <strong className="text-slate-200">{role.name}</strong>
              <span className="text-slate-400 block text-[10px]">{role.station}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Official Call Time</span>
              <strong className="text-amber-300 font-mono text-xs">{program.callTime}</strong>
              <span className="text-slate-400 block text-[10px]">Service: {program.startTime} - {program.endTime}</span>
            </div>
          </div>
        </div>

        {/* Options View */}
        {mode === 'options' && (
          <div className="space-y-2.5">
            <button
              onClick={handleConfirmOnTime}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.01] cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm On-Time Arrival ({program.callTime})</span>
            </button>

            <button
              onClick={() => setMode('lateNote')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>I&apos;m Coming, but can&apos;t make exact call time (+ Arrival Note)</span>
            </button>

            <button
              onClick={() => setMode('decline')}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/60 text-slate-400 hover:text-rose-300 text-xs rounded-xl transition-all cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Cannot Attend (Decline & Request Replacement)</span>
            </button>
          </div>
        )}

        {/* Mode: Late Arrival Note */}
        {mode === 'lateNote' && (
          <form onSubmit={handleConfirmWithNote} className="space-y-3 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estimated Arrival Time (ETA)
              </label>
              <input
                type="text"
                placeholder="e.g. 7:30 AM, or 15 mins after call time"
                value={estimatedArrivalTime}
                onChange={(e) => setEstimatedArrivalTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Arrival Note / Reason for delay <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Closing late from work shift / Heavy traffic from Achimota..."
                value={arrivalComment}
                onChange={(e) => {
                  setArrivalComment(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>

            {error && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('options')}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Confirm with Note
              </button>
            </div>
          </form>
        )}

        {/* Mode: Decline */}
        {mode === 'decline' && (
          <form onSubmit={handleDeclineSubmit} className="space-y-3 animate-in fade-in duration-150">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reason for declining
              </label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Work schedule conflict">Work schedule conflict</option>
                <option value="Traveling / Out of town">Traveling / Out of town</option>
                <option value="Health / Medical reasons">Health / Medical reasons</option>
                <option value="Family / Personal emergency">Family / Personal emergency</option>
                <option value="Exam / School commitments">Exam / School commitments</option>
                <option value="Other commitment">Other commitment</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode('options')}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Confirm Decline & Request Replacement
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
