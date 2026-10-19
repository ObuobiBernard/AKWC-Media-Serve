import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  Cookie,
  HeartHandshake,
  CheckCircle2,
  Building,
} from 'lucide-react';

export type LegalTab = 'privacy' | 'terms' | 'cookies' | 'ministry';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: LegalTab;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(defaultTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Legal, Privacy & Ministry Guidelines
              </h2>
              <p className="text-xs text-slate-400">
                The Church of Pentecost · Akweteyman Worship Center (AKWC) Media Ministry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close legal modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl my-3 shrink-0 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'terms'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'cookies'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cookie className="w-3.5 h-3.5" />
            <span>Cookie Notice</span>
          </button>
          <button
            onClick={() => setActiveTab('ministry')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'ministry'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Ministry Charter</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto pr-1 text-xs text-slate-300 space-y-4 flex-1 leading-relaxed">
          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <span className="font-semibold text-white">Compliance Standard:</span> This privacy policy is formulated in compliance with the Republic of Ghana Data Protection Act, 2012 (Act 843) and international best practices for volunteer religious organizations.
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">1. Information We Collect</h3>
                <p>MediaServe collects only data necessary for production scheduling, role assignments, and emergency contact during church services:</p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300 pl-2">
                  <li>Full name, gender, phone number (WhatsApp enabled), and email address.</li>
                  <li>Technical skills, station proficiencies (Sound, Livestream, Camera, Projection, Photography, IT).</li>
                  <li>Availability preferences, duty confirmation statuses, and arrival check-ins.</li>
                  <li>Security audit records of administrative actions (assignment, roster publishing).</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">2. Purpose of Processing</h3>
                <p>All data is processed strictly for:</p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300 pl-2">
                  <li>Generating balanced, fair worship service duty rosters.</li>
                  <li>Sending automated 48-hour and 24-hour attendance reminders via WhatsApp.</li>
                  <li>Ensuring technical station redundancy and Sunday service coverage.</li>
                </ul>
                <p className="mt-1.5 font-medium text-emerald-400">We do not sell, rent, monetize, or share member contact information with third-party marketers or advertisers under any circumstances.</p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">3. Data Security & Storage</h3>
                <p>Authentication credentials are encrypted using modern hashing standards. Session tokens expire automatically after periods of inactivity to protect unauthorized workstation access in the media booth.</p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">4. Your Rights</h3>
                <p>Every media ministry member has the right to view, update, correct, or request deletion of their profile at any time by contacting the Media Director or Media Secretary.</p>
              </div>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3.5">
              <div>
                <h3 className="font-bold text-white text-sm mb-1">1. Acceptance of Terms</h3>
                <p>By registering on or using MediaServe, members agree to adhere to these operational ministry terms in spirit of Christian service and church stewardship (Colossians 3:23).</p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">2. Roster Attendance Commitment</h3>
                <p>Members scheduled on a roster are requested to:</p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300 pl-2">
                  <li>Confirm attendance promptly upon receiving WhatsApp dispatch notifications.</li>
                  <li>If unable to attend, tap &quot;Decline&quot; with at least 24 hours notice to allow directors to assign a replacement.</li>
                  <li>Arrive at the designated <strong>Call Time</strong> (e.g. 7:30 AM for 1st Service) for pre-service audio check, camera white-balance, and prayer.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">3. Equipment Stewardship</h3>
                <p>Hardware in the AKWC Media Booth (ATEM switchers, PTZ controllers, audio consoles, studio microphones, mirrorless cameras) is church property dedicated to worship production. Members must handle all gear with utmost care and report any technical faults immediately.</p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">4. Access Controls</h3>
                <p>Admin and Leadership privileges are assigned solely by executive ministry leadership. Unauthorized tampering with schedules or member accounts is strictly prohibited.</p>
              </div>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="font-semibold text-white">Zero Tracking Cookies:</span> MediaServe does not use third-party tracking, advertising pixels, or cross-site behavioral cookies.
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">1. Essential Local Storage</h3>
                <p>We use browser local storage and session storage exclusively for essential operational functionality:</p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-slate-300 pl-2">
                  <li><strong>Session Authentication:</strong> Remembering active member session securely.</li>
                  <li><strong>Inactivity Guard:</strong> Running the 15-minute booth safety timeout.</li>
                  <li><strong>Offline Roster Cache:</strong> Allowing duty rosters to remain accessible when sanctuary connectivity is interrupted.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">2. Browser Cookie Management</h3>
                <p>You can clear site data or cookies in your browser settings at any time without penalty. Clearing cache will simply require logging in on your next visit.</p>
              </div>
            </div>
          )}

          {activeTab === 'ministry' && (
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-amber-300">
                <Building className="w-4 h-4 text-amber-400 shrink-0" />
                <span>The Church of Pentecost · Akweteyman Worship Center (Achimota Area, Accra)</span>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">Voluntary Ministry & Non-Commercial Notice</h3>
                <p>MediaServe is a custom volunteer church ministry operations portal developed solely for the AKWC Media Team. There are no fees, ticket sales, commercial transactions, or subscriptions. As such, commercial refund policies do not apply.</p>
              </div>

              <div>
                <h3 className="font-bold text-white text-sm mb-1">Official Ministry Contacts</h3>
                <p>For administrative or technical inquiries regarding the AKWC Media Department:</p>
                <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-[11px]">
                  <div><strong>Ministry Lead / Director:</strong> Bernard Owusu Obuobi (0543515464)</div>
                  <div><strong>Email:</strong> bernardoobuobi@gmail.com</div>
                  <div><strong>Location:</strong> Akweteyman, Achimota Area, Accra, Ghana</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Last Updated: October 2026 · COP Akweteyman Worship Center
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
