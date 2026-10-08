import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  build24HourReminderWhatsAppMessage,
  openWhatsAppNotification,
  formatPhoneForWhatsApp,
} from '../../utils/whatsapp';
import {
  X,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export const Automated24HourReminderModal: React.FC = () => {
  const {
    pending24HourDuties,
    automatedReminderModalOpen,
    setAutomatedReminderModalOpen,
    showToast,
  } = useApp();

  const [dispatchedIds, setDispatchedIds] = useState<string[]>([]);

  if (!automatedReminderModalOpen) return null;

  const handleDispatchSingle = (dutyId: string) => {
    const item = pending24HourDuties.find((d) => d.assignment.id === dutyId);
    if (!item) return;

    const { whatsappUrl } = build24HourReminderWhatsAppMessage({
      memberName: item.member.name,
      memberPhone: item.member.phone,
      roleName: item.role.name,
      station: item.role.station,
      programTitle: item.program.title,
      programDate: item.program.date,
      callTime: item.program.callTime,
      startTime: item.program.startTime,
      endTime: item.program.endTime,
      assignmentId: item.assignment.id,
      memberId: item.member.id,
      hoursRemaining: item.hoursRemaining,
    });

    openWhatsAppNotification(whatsappUrl);
    setDispatchedIds((prev) => [...new Set([...prev, dutyId])]);
    showToast(`WhatsApp reminder opened for ${item.member.name}`);
  };

  const handleDispatchAll = () => {
    pending24HourDuties.forEach((item) => {
      const { whatsappUrl } = build24HourReminderWhatsAppMessage({
        memberName: item.member.name,
        memberPhone: item.member.phone,
        roleName: item.role.name,
        station: item.role.station,
        programTitle: item.program.title,
        programDate: item.program.date,
        callTime: item.program.callTime,
        startTime: item.program.startTime,
        endTime: item.program.endTime,
        assignmentId: item.assignment.id,
        memberId: item.member.id,
        hoursRemaining: item.hoursRemaining,
      });

      setTimeout(() => {
        openWhatsAppNotification(whatsappUrl);
      }, 300);
    });

    const allIds = pending24HourDuties.map((d) => d.assignment.id);
    setDispatchedIds(allIds);
    showToast(`Dispatched reminders for ${pending24HourDuties.length} pending members.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Automated 24-Hour Duty Alert Scan</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                  Real-time Task
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Services within 24 hours requiring prompt team availability confirmation
              </p>
            </div>
          </div>
          <button
            onClick={() => setAutomatedReminderModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="my-4 space-y-4 flex-1 overflow-y-auto pr-1">
          {pending24HourDuties.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">All Clear! No Pending Reminders</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                All crew members scheduled for services within the next 24 hours have confirmed their duty assignments on MediaServe.
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Found <strong className="text-white">{pending24HourDuties.length}</strong> pending confirmation(s) within 24h.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDispatchAll}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch All Reminders</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {pending24HourDuties.map((item) => {
                  const isSent = dispatchedIds.includes(item.assignment.id);
                  const formattedPhone = formatPhoneForWhatsApp(item.member.phone);

                  return (
                    <div
                      key={item.assignment.id}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">{item.member.name}</span>
                          <span className="text-[10px] font-mono text-emerald-400">+{formattedPhone}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>Station: <strong className="text-amber-300">{item.role.name}</strong></span>
                          <span>·</span>
                          <span>{item.program.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span className="text-amber-400/90 font-mono">Call Time: {item.program.callTime}</span>
                          <span>·</span>
                          <span className="text-slate-400 font-medium">~{item.hoursRemaining} hrs remaining</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDispatchSingle(item.assignment.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Remind</span>
                            <ExternalLink className="w-3 h-3 opacity-70" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Automated scan executes every 30 seconds</span>
          </div>
          <button
            type="button"
            onClick={() => setAutomatedReminderModalOpen(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
