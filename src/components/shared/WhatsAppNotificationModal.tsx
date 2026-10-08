import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { openWhatsAppNotification, formatPhoneForWhatsApp } from '../../utils/whatsapp';
import {
  X,
  Send,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

export const WhatsAppNotificationModal: React.FC = () => {
  const { whatsAppModalState, closeWhatsAppModal, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  if (!whatsAppModalState) return null;

  const { member, role, program, whatsappUrl, messageText } = whatsAppModalState;
  const formattedPhone = formatPhoneForWhatsApp(member.phone);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    showToast('WhatsApp message text copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSend = () => {
    openWhatsAppNotification(whatsappUrl);
    setAutoOpened(true);
    showToast(`WhatsApp opened for ${member.name}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Automated WhatsApp Notification</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30">
                  Duty Confirmation
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Send duty confirmation message directly to member&apos;s phone
              </p>
            </div>
          </div>
          <button
            onClick={closeWhatsAppModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Member & Assignment Details Pill */}
        <div className="my-4 p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-white flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{member.name}</span>
            </div>
            <span className="font-mono text-emerald-400 font-medium">+{formattedPhone}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-500 block">Assigned Station:</span>
              <span className="font-medium text-amber-300">{role.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Service Date & Call Time:</span>
              <span className="font-medium text-white">{program.date} · {program.callTime}</span>
            </div>
          </div>
        </div>

        {/* Message Preview Box */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center justify-between">
            <span>Pre-formatted WhatsApp Message Preview</span>
            <span className="text-[11px] text-slate-500 font-normal">Formatted for WhatsApp font styling</span>
          </label>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed max-h-52 overflow-y-auto select-all">
            {messageText}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleSend}
            className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{autoOpened ? 'Re-open WhatsApp' : 'Send via WhatsApp (wa.me)'}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          <button
            onClick={handleCopy}
            className="w-full sm:w-auto py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>

          <button
            onClick={closeWhatsAppModal}
            className="w-full sm:w-auto py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>

        {autoOpened && (
          <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Notification dispatched. The member will receive duty instructions and confirmation link.</span>
          </div>
        )}
      </div>
    </div>
  );
};
