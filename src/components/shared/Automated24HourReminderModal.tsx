import React from 'react';
import { useApp } from '../../context/AppContext';
import { Pending24HourDuty } from '../../types';
import { Clock, Send, CheckCircle2, X, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';
import { build24HourReminderWhatsAppMessage, openWhatsAppNotification } from '../../utils/whatsapp';

interface Automated24HourReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingDuties: Pending24HourDuty[];
}

export const Automated24HourReminderModal: React.FC<Automated24HourReminderModalProps> = ({
  isOpen,
  onClose,
  pendingDuties,
}) => {
  const { triggerManualReminder, showToast } = useApp();

  if (!isOpen) return null;

  const handleSendReminder = (duty: Pending24HourDuty) => {
    const { whatsappUrl } = build24HourReminderWhatsAppMessage({
      memberName: duty.member.name,
      memberPhone: duty.member.phone,
      memberId: duty.member.id,
      assignmentId: duty.assignment.id,
      roleName: duty.role.name,
      station: duty.role.station,
      programTitle: duty.program.title,
      programDate: duty.program.date,
      callTime: duty.program.callTime,
      startTime: duty.program.startTime,
      endTime: duty.program.endTime,
      hoursRemaining: duty.hoursRemaining,
    });

    triggerManualReminder(duty.program.id, '24h-urgent-whatsapp');
    openWhatsAppNotification(whatsappUrl);
    showToast(`24-hour reminder dispatched for ${duty.member.name}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 sm:p-7 text-slate-100 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  24-Hour Automated Reminder Dispatcher
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 uppercase">
                  {pendingDuties.length} Pending
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Team members scheduled within the next 24 hours who haven&apos;t confirmed attendance
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

        {/* Info callout */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block font-semibold">Direct Confirmation Links Embedded</strong>
            <span>
              Each WhatsApp message contains a secure direct link (`?action=confirm`) that redirects the team member straight to their personal portal to confirm their arrival on time or submit an arrival note.
            </span>
          </div>
        </div>

        {/* List of pending crew */}
        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {pendingDuties.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-semibold text-white">All Crew Confirmed!</h3>
              <p className="text-xs text-slate-400">
                No unconfirmed team members within the next 24 hours.
              </p>
            </div>
          ) : (
            pendingDuties.map((duty) => (
              <div
                key={duty.assignment.id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-amber-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs sm:text-sm">
                      {duty.member.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                      Unconfirmed
                    </span>
                    {duty.hoursRemaining !== undefined && (
                      <span className="text-[10px] text-amber-400 font-mono">
                        (~{duty.hoursRemaining}h to call time)
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2">
                    <span className="text-amber-400 font-semibold">{duty.role.name}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400">{duty.program.title}</span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Call Time: <strong className="text-slate-300">{duty.program.callTime}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Phone: <strong className="text-slate-400 font-mono">{duty.member.phone}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSendReminder(duty)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send 24h WhatsApp</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            System continuously monitors services within 24 hours.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
