import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarSyncModal } from '../shared/CalendarSyncModal';
import { LateConfirmationModal } from '../shared/LateConfirmationModal';
import { supabase } from '../../lib/supabase';
import { getRandomInspirationalVerse } from '../../data/mockData';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  Bell,
  Share2,
  User,
  Radio,
  CalendarDays,
  Check,
  KeyRound,
  Shield,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { ProgramService, RoleAssignment, MediaRole, VerseOfTheDay } from '../../types';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const TeamPortal: React.FC = () => {
  const {
    currentAccount,
    currentMember,
    programs,
    assignments,
    roles,
    verse,
    announcements,
    confirmAttendance,
    declineAttendance,
    updateMember,
    switchPortal,
    isSuperAdmin,
    isLeader,
    showToast,
  } = useApp();

  const userHasLeadership =
    isSuperAdmin ||
    isLeader ||
    currentAccount.allowedPortals.includes('leadership') ||
    Boolean(currentMember.isLeader);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'duties' | 'verse' | 'schedule' | 'profile'>('duties');

  // Rotating Verse of the Day state
  const [currentVerse, setCurrentVerse] = useState<VerseOfTheDay>(verse);
  const [verseCopied, setVerseCopied] = useState(false);

  const handleRefreshVerse = () => {
    const nextV = getRandomInspirationalVerse();
    setCurrentVerse(nextV);
    showToast('Loaded fresh inspirational verse & quote!');
  };

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator)) {
      showToast("Your browser doesn't support background notifications.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      const PUBLIC_KEY = "BICjTcF-HdOuOAUH7VjRSOcE9PbIBiHrP9o1mId2d0ZZsBuCxjgTbBTgXXTkiYVmXbtd3M_CqrVyRviF1B_lQKc";

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
      });

      const subData = JSON.parse(JSON.stringify(subscription));

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          member_id: currentMember.id,
          endpoint: subData.endpoint,
          auth: subData.keys.auth,
          p256dh: subData.keys.p256dh,
        },
        { onConflict: 'endpoint' }
      );

      if (error) throw error;
      showToast('You will now receive notifications for your duties!');
    } catch (error) {
      console.error('Error turning on notifications:', error);
      showToast('Could not enable notifications. Please check browser permissions.');
    }
  };

  // Find assignments for the logged-in member
  const myAssignments = assignments.filter((a) => a.memberId === currentMember.id);

  // Match with program details
  const myDuties = myAssignments
    .map((asg) => {
      const prog = programs.find((p) => p.id === asg.programId);
      const role = roles.find((r) => r.id === asg.roleId);
      return { asg, prog, role };
    })
    .filter((d): d is { asg: RoleAssignment; prog: ProgramService; role: MediaRole } =>
      Boolean(d.prog && d.role)
    )
    .sort((a, b) => new Date(a.prog.date).getTime() - new Date(b.prog.date).getTime());

  const nextDuty = myDuties[0];

  // Modals state
  const [calendarSyncOpen, setCalendarSyncOpen] = useState(false);
  const [selectedCalendarDuty, setSelectedCalendarDuty] = useState<{
    prog: ProgramService;
    role: MediaRole;
    asg: RoleAssignment;
  } | null>(null);

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [targetDeclineAsgId, setTargetDeclineAsgId] = useState<string>('');
  const [declineReason, setDeclineReason] = useState('Work schedule conflict');
  const [declineCustomNote, setDeclineCustomNote] = useState('');

  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [lateModalData, setLateModalData] = useState<{
    asgId: string;
    prog: ProgramService;
    role: MediaRole;
  } | null>(null);

  const handleOpenLateConfirm = (asgId: string, prog: ProgramService, role: MediaRole) => {
    setLateModalData({ asgId, prog, role });
    setLateModalOpen(true);
  };

  const [blackoutInput, setBlackoutInput] = useState('');

  const handleOpenDecline = (asgId: string) => {
    setTargetDeclineAsgId(asgId);
    setDeclineModalOpen(true);
  };

  const submitDecline = () => {
    const finalReason = declineCustomNote
      ? `${declineReason}: ${declineCustomNote}`
      : declineReason;
    declineAttendance(targetDeclineAsgId, finalReason);
    setDeclineModalOpen(false);
    setDeclineCustomNote('');
  };

  const handleCopyVerse = () => {
    const text = `"${currentVerse.verse}"\n— ${currentVerse.reference}\n\nMedia Ministry Reflection: ${currentVerse.reflection}\n(COP Akweteyman Worship Center)`;
    navigator.clipboard.writeText(text);
    setVerseCopied(true);
    showToast('Verse of the Day copied to clipboard!');
    setTimeout(() => setVerseCopied(false), 2000);
  };

  const handleAddBlackout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackoutInput) return;
    const existing = currentMember.blackoutDates || [];
    if (existing.includes(blackoutInput)) {
      showToast('Date already added as unavailable.');
      return;
    }
    updateMember({
      ...currentMember,
      blackoutDates: [...existing, blackoutInput],
    });
    setBlackoutInput('');
    showToast(`Marked ${blackoutInput} as unavailable.`);
  };

  const handleRemoveBlackout = (dateStr: string) => {
    const existing = currentMember.blackoutDates || [];
    updateMember({
      ...currentMember,
      blackoutDates: existing.filter((d) => d !== dateStr),
    });
    showToast(`Removed blackout date.`);
  };

  const myPrimaryRole = roles.find((r) => r.id === currentMember.primaryRole);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Top Welcome Header Card */}
      <section className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-7 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>AKWC Media Team Roster</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              {userHasLeadership ? (
                <span className="text-blue-400 font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Leader</span>
                </span>
              ) : (
                <span className="text-slate-400">Team Member</span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Welcome, {currentMember.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <span>Role: <strong className="text-amber-300">{myPrimaryRole?.name || 'General Crew'}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Skill: <strong className="text-slate-200">{currentMember.rawSkillDescription || currentMember.skillLevel}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Phone: <strong className="font-mono text-slate-300">{currentMember.phone}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl text-center min-w-[90px]">
              <div className="text-base font-bold text-white tabular-nums">{myDuties.length}</div>
              <div className="text-[10px] text-slate-400">Assigned</div>
            </div>
            <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl text-center min-w-[90px]">
              <div className="text-base font-bold text-emerald-400 tabular-nums">
                {myDuties.filter((d) => d.asg.status === 'confirmed').length}
              </div>
              <div className="text-[10px] text-slate-400">Confirmed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Access Notification Banner */}
      {userHasLeadership && (
        <section className="p-4 bg-gradient-to-r from-blue-950/60 via-slate-900 to-amber-950/30 border border-blue-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs sm:text-sm">Media Ministry Leadership Access Active</div>
              <p className="text-xs text-slate-300 mt-0.5">
                You have authorization to manage schedules, assign roster duties, and dispatch WhatsApp call-time reminders.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => switchPortal('leadership')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Leadership Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* First-Time Password Setup Banner */}
      {!currentAccount.hasSetPassword && (
        <section className="p-4 bg-slate-900 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">Set Your Personal Password</div>
              <p className="text-xs text-slate-300">Secure your account for future logins with your email.</p>
            </div>
          </div>
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shrink-0"
          >
            Set Password
          </button>
        </section>
      )}

      {/* Mobile-Optimized Tab Navigation */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto shadow-md">
        <button
          onClick={() => setActiveTab('duties')}
          className={`flex-1 min-w-[110px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'duties'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 shrink-0" />
          <span>My Duties ({myDuties.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('verse')}
          className={`flex-1 min-w-[110px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'verse'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Verse & Comm</span>
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 min-w-[110px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'schedule'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Church Roster</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 min-w-[110px] py-3 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4 shrink-0" />
          <span>My Profile</span>
        </button>
      </div>

      {/* TAB 1: MY DUTIES */}
      {activeTab === 'duties' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Next Duty Card */}
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>Next Upcoming Service Duty</span>
            </h2>

            {nextDuty ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      {nextDuty.prog.serviceType}
                    </span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                      {nextDuty.prog.title}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 self-start sm:self-center">
                    {nextDuty.prog.date}
                  </span>
                </div>

                {nextDuty.prog.theme && (
                  <p className="text-xs text-amber-200/90 italic bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                    Service Theme: &ldquo;{nextDuty.prog.theme}&rdquo;
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 font-semibold">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Strict Call Time</span>
                    </div>
                    <div className="text-lg font-extrabold text-amber-300">
                      {nextDuty.prog.callTime}
                    </div>
                    <div className="text-xs text-slate-500">
                      Service: {nextDuty.prog.startTime} - {nextDuty.prog.endTime}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5 font-semibold">
                      <Radio className="w-4 h-4 text-blue-400" />
                      <span>Assigned Duty Station</span>
                    </div>
                    <div className="text-lg font-extrabold text-white">
                      {nextDuty.role.name}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {nextDuty.role.station}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{nextDuty.prog.location}</span>
                </div>

                {/* Attendance Confirmation Section */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Attendance Confirmation Status
                  </div>

                  {nextDuty.asg.status === 'confirmed' ? (
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/60 rounded-xl space-y-1 text-xs text-emerald-300">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>You are Confirmed for this Service</span>
                      </div>
                      {nextDuty.asg.arrivalComment && (
                        <p className="italic text-slate-300 mt-1">
                          Note / ETA: &ldquo;{nextDuty.asg.arrivalComment}&rdquo;
                        </p>
                      )}
                    </div>
                  ) : nextDuty.asg.status === 'declined' ? (
                    <div className="p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <div>
                        <div className="font-bold">Declined</div>
                        <div className="text-[11px] text-rose-300/80">{nextDuty.asg.declineReason}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-amber-950/30 border border-amber-900/50 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold">Action Required: Please Confirm Attendance</div>
                        <div className="text-[11px] text-amber-300/80">Let media leadership know if you will be present at call time.</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {nextDuty.asg.status !== 'confirmed' ? (
                      <>
                        <button
                          onClick={() => confirmAttendance(nextDuty.asg.id)}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>I&apos;m Coming (On Time)</span>
                        </button>
                        <button
                          onClick={() => handleOpenLateConfirm(nextDuty.asg.id, nextDuty.prog, nextDuty.role)}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                        >
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>Running Late? (Add ETA Note)</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleOpenLateConfirm(nextDuty.asg.id, nextDuty.prog, nextDuty.role)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Update Arrival / Late Note</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedCalendarDuty(nextDuty);
                        setCalendarSyncOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span>Add to Google Calendar</span>
                    </button>

                    <button
                      onClick={() => handleOpenDecline(nextDuty.asg.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-rose-950/40 text-rose-300 border border-slate-700 hover:border-rose-900/60 font-semibold text-xs rounded-xl transition-all cursor-pointer sm:col-span-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Can&apos;t Make It? (Decline & Request Replacement)</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No Pending Upcoming Duties</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You are fully clear on upcoming service rosters. Leadership will notify you when new assignments are published.
                </p>
              </div>
            )}
          </div>

          {/* All Scheduled Duties List */}
          <div className="space-y-3 pt-4">
            <h3 className="text-base font-bold text-white">All My Scheduled Duties History</h3>
            <div className="space-y-3">
              {myDuties.map(({ asg, prog, role }) => (
                <div
                  key={`${asg.id}-${asg.programId}-${asg.roleId}`}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{prog.title}</span>
                      <span className="text-xs text-amber-400 font-semibold">{prog.date}</span>
                    </div>
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3">
                      <span>Role: <strong className="text-slate-100">{role.name}</strong></span>
                      <span>Call Time: <strong className="text-amber-300">{prog.callTime}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {asg.status === 'confirmed' ? (
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Confirmed
                      </span>
                    ) : asg.status === 'declined' ? (
                      <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold rounded-lg flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Declined
                      </span>
                    ) : (
                      <button
                        onClick={() => confirmAttendance(asg.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Confirm Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VERSE & COMMUNICATIONS */}
      {activeTab === 'verse' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Rotating Verse of the Day Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Verse of the Day & Work-with-God Inspiration
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshVerse}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  title="Get another random inspirational verse on working for God"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                  <span>New Verse</span>
                </button>
                <button
                  onClick={handleCopyVerse}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {verseCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{verseCopied ? 'Copied' : 'Share'}</span>
                </button>
              </div>
            </div>

            <blockquote className="space-y-3 py-2">
              <p className="text-lg sm:text-xl font-serif italic text-white leading-relaxed">
                &ldquo;{currentVerse.verse}&rdquo;
              </p>
              <footer className="text-sm font-bold text-amber-300">
                — {currentVerse.reference}
              </footer>
            </blockquote>

            <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1.5">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                Media Ministry Reflection & Stewardship Quotation
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {currentVerse.reflection}
              </p>
            </div>
          </div>

          {/* AKWC Announcements */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">AKWC Announcements & Communications</h3>
              <span className="text-xs text-slate-400">{announcements.length} Active</span>
            </div>

            <div className="space-y-3">
              {announcements.length > 0 ? (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{ann.title}</span>
                      <span className="text-xs text-slate-400 font-mono">{ann.date}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{ann.content}</p>
                    <div className="text-xs text-amber-400 font-medium">Posted by {ann.author}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic py-8 text-center">No active announcements.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHURCH ROSTER SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white">Church Service & Media Roster</h2>
            <span className="text-xs text-slate-400">{programs.length} Services Scheduled</span>
          </div>

          <div className="space-y-4">
            {programs.map((prog) => {
              const progAssignments = assignments.filter((a) => a.programId === prog.id);
              return (
                <div key={prog.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <span className="text-xs font-bold text-amber-400">{prog.serviceType}</span>
                      <h3 className="text-base sm:text-lg font-extrabold text-white">{prog.title}</h3>
                    </div>
                    <div className="text-xs text-slate-300 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 self-start">
                      📅 {prog.date} | Call Time: <strong className="text-amber-300">{prog.callTime}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {progAssignments.map((asg) => {
                      const m = useApp().members.find((mem) => mem.id === asg.memberId);
                      const r = roles.find((rol) => rol.id === asg.roleId);
                      return (
                        <div key={asg.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                          <div className="text-xs font-bold text-white">{r?.name || 'Role'}</div>
                          <div className="text-xs text-amber-300 font-medium">{m?.name || 'Assigned Crew'}</div>
                          <div className="text-[10px] text-slate-400 uppercase">
                            Status: <span className={asg.status === 'confirmed' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{asg.status}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: MY PROFILE & AVAILABILITY */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Push Notifications Card */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">Browser Push Notifications</div>
                <p className="text-xs text-slate-400">Get instant alerts on your device when rostered for duties.</p>
              </div>
            </div>
            <button
              onClick={subscribeToNotifications}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer"
            >
              Enable Notifications
            </button>
          </div>

          {/* Blackout Dates / Availability Card */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">My Availability & Blackout Dates</h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Mark dates when you are traveling, busy with work, or unavailable so media leadership will not roster you.
            </p>

            <form onSubmit={handleAddBlackout} className="flex gap-2">
              <input
                type="date"
                value={blackoutInput}
                onChange={(e) => setBlackoutInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-colors whitespace-nowrap cursor-pointer"
              >
                Block Date
              </button>
            </form>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-slate-400">Currently Blocked Dates:</div>
              {currentMember.blackoutDates && currentMember.blackoutDates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentMember.blackoutDates.map((dateStr) => (
                    <div
                      key={dateStr}
                      className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs"
                    >
                      <span className="text-slate-200 font-mono font-bold">{dateStr}</span>
                      <button
                        onClick={() => handleRemoveBlackout(dateStr)}
                        className="text-slate-400 hover:text-rose-400 transition-colors font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic py-2">No blackout dates registered. You are fully available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {calendarSyncOpen && selectedCalendarDuty && (
        <CalendarSyncModal
          isOpen={calendarSyncOpen}
          onClose={() => setCalendarSyncOpen(false)}
          program={selectedCalendarDuty.prog}
          role={selectedCalendarDuty.role}
        />
      )}

      {lateModalOpen && lateModalData && (
        <LateConfirmationModal
          isOpen={lateModalOpen}
          onClose={() => setLateModalOpen(false)}
          assignmentId={lateModalData.asgId}
          program={lateModalData.prog}
          role={lateModalData.role}
        />
      )}

      {/* Decline Reason Modal */}
      {declineModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Decline Duty Assignment</h3>
            <p className="text-xs text-slate-300">
              Please select a reason for declining. This alerts leadership so a replacement candidate can be assigned immediately.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Reason</label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              >
                <option value="Work schedule conflict">Work schedule conflict</option>
                <option value="Health or illness">Health or illness</option>
                <option value="Traveling / Out of town">Traveling / Out of town</option>
                <option value="Family emergency">Family emergency</option>
                <option value="Other personal reason">Other personal reason</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Additional Note (Optional)</label>
              <textarea
                value={declineCustomNote}
                onChange={(e) => setDeclineCustomNote(e.target.value)}
                placeholder="Provide short details for production leadership..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeclineModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDecline}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
              >
                Confirm Decline & Notify Leadership
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
