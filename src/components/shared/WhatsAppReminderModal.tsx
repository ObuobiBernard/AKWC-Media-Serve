import React, { useState } from 'react';
import { ProgramService, TeamMember, MediaRole } from '../../types';
import { X, Send, Copy, Check, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getLiveAppBaseUrl, formatPhoneForWhatsApp } from '../../utils/whatsapp';

interface WhatsAppReminderModalProps {
  program: ProgramService;
  members: TeamMember[];
  roles: MediaRole[];
  isOpen: boolean;
  onClose: () => void;
  selectedMemberId?: string;
  selectedRoleId?: string;
}

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  program,
  members,
  roles,
  isOpen,
  onClose,
  selectedMemberId,
  selectedRoleId,
}) => {
  const { assignments, reminderConfig, showToast } = useApp();
  const [memberId, setMemberId] = useState<string>(selectedMemberId || members[0]?.id || '');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentMember = members.find((m) => m.id === memberId) || members[0];
  const currentRole =
    roles.find((r) => r.id === selectedRoleId) ||
    roles.find((r) => r.id === currentMember?.primaryRole) ||
    roles[0];

  // Format phone number cleanly via central helper
  const cleanPhone = currentMember ? formatPhoneForWhatsApp(currentMember.phone) : '';

  // Find assignment to build personalized one-tap confirmation link
  const targetAsg =
    assignments.find(
      (a) => a.programId === program.id && a.memberId === currentMember?.id && a.roleId === currentRole?.id
    ) ||
    assignments.find((a) => a.programId === program.id && a.memberId === currentMember?.id);

  const baseUrl = getLiveAppBaseUrl();
  const confirmUrl =
    targetAsg && currentMember
      ? `${baseUrl}/?action=confirm&asgId=${targetAsg.id}&memberId=${currentMember.id}`
      : baseUrl;

  let template =
    reminderConfig?.whatsappTemplate ||
    `*AKWC MEDIA TEAM ROSTER ALERT* 🎙️🎥\n\nDear {memberName},\nYou are assigned to serve in the upcoming service:\n*Service:* {serviceTitle}\n*Date:* {serviceDate}\n*Call Time:* {callTime} (Strict)\n*Role:* {roleName}\n*Station:* {stationLocation}\n\nPlease confirm your attendance on MediaServe:\n{appLink}\n\n_COP Akweteyman Worship Center (AKWC)_`;

  // Self-heal: Clean any broken/stale URLs
  template = template.replace(/https?:\/\/[^\s]*github\.io[^\s]*/gi, '{appLink}');
  template = template.replace(/https?:\/\/[^\s]*obuobibernard[^\s]*/gi, '{appLink}');
  if (!template.includes('{appLink}')) {
    template += '\n\nPlease confirm your attendance on MediaServe:\n{appLink}';
  }

  const messageText =
    template
      .replace('{memberName}', currentMember?.name || 'Beloved Team Member')
      .replace('{serviceTitle}', program.title)
      .replace('{serviceDate}', `${program.date} (${program.startTime})`)
      .replace('{callTime}', program.callTime)
      .replace('{roleName}', currentRole?.name || 'Media Crew')
      .replace('{stationLocation}', currentRole?.station || program.location)
      .replace('{appLink}', confirmUrl) +
    `\n\n_(💡 iPhone tip: Tap 'Close and continue' or open in Safari/Chrome if prompted)_`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    showToast('WhatsApp reminder copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(messageText);
    const targetUrl = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">WhatsApp Assignment Dispatch</h3>
              <p className="text-xs text-slate-400">COP Akweteyman Worship Center Broadcast</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Select Recipient Team Member
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Message Preview (Ghana Format)
            </label>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {messageText}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Message'}</span>
            </button>
            <button
              onClick={handleOpenWhatsApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
