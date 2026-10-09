import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarSyncModal } from '../shared/CalendarSyncModal';
import { AccountSwitcherModal } from '../auth/AccountSwitcherModal';
import { LateConfirmationModal } from '../shared/LateConfirmationModal';
import { supabase } from '../../lib/supabase';
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
  ChevronRight,
  ShieldAlert,
  User,
  Phone,
  Radio,
  CalendarDays,
  Check,
  KeyRound,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { ProgramService, RoleAssignment, MediaRole } from '../../types';

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

  const subscribeToNotifications = async () => {
    if (!('serviceWorker' in navigator)) {
      showToast("Your browser doesn't support background notifications.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const PUBLIC_KEY = "BICjTcF-HdOuOAUH7VjRSOcE9PbIBiHrP9o1mId2d0ZZsBuCxjgTbBTgXXTkiYVmXbtd3M_CqrVyRviF1B_lQKc"; // Replace with your generated VAPID public key

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
      showToast('Could not enable notifications. Please check your browser permissions.');
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

  // Next duty is the first pending or confirmed duty
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

  // Late arrival confirmation modal state
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

  // Blackout dates state
  const [blackoutInput, setBlackoutInput] = useState('');
  const [verseCopied, setVerseCopied] = useState(false);

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
    const text = `"${verse.verse}"\n— ${verse.reference}\n\nMedia Ministry Reflection: ${verse.reflection}\n(COP Akweteyman Worship Center)`;
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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Push Notification Button Banner */}
      <section className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">Enable Push Notifications</div>
            <p className="text-xs text-slate-400">Receive instant alerts on your device when scheduled for duties.</p>
          </div>
        </div>
        <button
          onClick={subscribeToNotifications}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shrink-0"
        >
          Enable Duty Notifications
        </button>
      </section>

      {/* Leadership Access Notification Banner */}
      {userHasLeadership && (
        <section className="p-4 sm:p-5 bg-gradient-to-r from-blue-950/50 via-slate-900 to-amber-950/30 border border-blue-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-blue-950/20 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Media Ministry Leadership Access Active</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500 text-white font-bold uppercase tracking-wide">
                  Authorized Leader
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                You have leadership authorization to create service programs, auto-fill qualified crew, assign station duties, and dispatch WhatsApp call-time reminders.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => switchPortal('leadership')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <span>Open Leadership Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8">
        <img
          src="/church_media_booth_1791063344649.jpg"
          alt="AKWC Media Production Booth"
          className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none select-none"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
              <Radio className="w-3.5 h-3.5" />
              <span>AKWC Media Team Roster Portal</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              {userHasLeadership ? (
                <span className="text-blue-400 font-semibold flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  <span>Media Ministry Leader</span>
                </span>
              ) : (
                <span className="text-slate-400">Verified Member</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome, {currentMember.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>Primary Station: <strong className="text-slate-200">{myPrimaryRole?.name || 'General Crew'}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Skill Level: <strong className="text-amber-400">{currentMember.rawSkillDescription || currentMember.skillLevel}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Availability: <strong className="text-slate-200">{currentMember.availability || 'Flexible'}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Phone: <strong className="text-slate-300 font-mono">{currentMember.phone}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center min-w-[100px]">
              <div className="text-lg font-bold text-white tabular-nums">{myDuties.length}</div>
              <div className="text-[11px] text-slate-400">Assigned Services</div>
            </div>
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center min-w-[100px]">
              <div className="text-lg font-bold text-emerald-400 tabular-nums">
                {myDuties.filter((d) => d.asg.status === 'confirmed').length}
              </div>
              <div className="text-[11px] text-slate-400">Confirmed</div>
            </div>
          </div>
        </div>
      </section>

      {/* First-Time Password Setup Banner (if unset) */}
      {!currentAccount.hasSetPassword && (
        <section className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/30 to-slate-900 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>First-Time Account Activation</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                  Pending Password
                </span>
              </div>
              <p className="text-xs text-slate-300">
                You haven&apos;t set a personal password yet for <strong className="text-amber-300">{currentAccount.email}</strong>. Create your password to secure your account across devices.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all shrink-0"
          >
            Set My Password Now
          </button>
        </section>
      )}

      {/* Primary Action Card: Next Assigned Service */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">My Next Media Duty</h2>
          {nextDuty && (
            <span className="text-xs text-slate-400">
              Service Date: <strong className="text-slate-200">{nextDuty.prog.date}</strong>
            </span>
          )}
        </div>

        {nextDuty ? (
          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left & Middle Info */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-amber-400">
                    {nextDuty.prog.serviceType}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400">{nextDuty.prog.date}</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                  {nextDuty.prog.title}
                </h3>

                {nextDuty.prog.theme && (
                  <p className="text-xs text-amber-200/80 italic">
                    Theme: &ldquo;{nextDuty.prog.theme}&rdquo;
                  </p>
                )}

                {/* Duty Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Call Time (Strict Attendance)</span>
                    </div>
                    <div className="text-base font-bold text-amber-300 tabular-nums">
                      {nextDuty.prog.callTime}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Service runs {nextDuty.prog.startTime} - {nextDuty.prog.endTime}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-400" />
                      <span>Assigned Station & Role</span>
                    </div>
                    <div className="text-base font-bold text-white">
                      {nextDuty.role.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {nextDuty.role.station}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{nextDuty.prog.location}</span>
                  <span aria-hidden="true">·</span>
                  <span>Director: <strong className="text-slate-300">{nextDuty.prog.directorName}</strong></span>
                </div>
              </div>

              {/* Right Side: Attendance Action Center */}
              <div className="flex flex-col justify-between p-5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300">
                    Confirmation Status
                  </div>

                  {nextDuty.asg.status === 'confirmed' ? (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Attendance Confirmed</span>
                      </div>
                      {nextDuty.asg.arrivalComment ? (
                        <div className="mt-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200">
                          <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>Arrival Note {nextDuty.asg.estimatedArrivalTime ? `(ETA: ${nextDuty.asg.estimatedArrivalTime})` : ''}</span>
                          </div>
                          <p className="mt-0.5 italic text-slate-300">&ldquo;{nextDuty.asg.arrivalComment}&rdquo;</p>
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-400/80">
                          On-time check-in recorded for {nextDuty.prog.callTime}.
                        </div>
                      )}
                    </div>
                  ) : nextDuty.asg.status === 'declined' ? (
                    <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-lg flex items-center gap-2.5 text-rose-300 text-xs">
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <div>
                        <div className="font-semibold">Declined - Replacement Requested</div>
                        <div className="text-[10px] text-rose-300/80">
                          {nextDuty.asg.declineReason || 'Reason recorded'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-lg flex items-center gap-2.5 text-amber-300 text-xs">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-semibold">Response Pending</div>
                        <div className="text-[10px] text-amber-300/80">
                          Please confirm your availability so leadership can finalize the broadcast roster.
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm / Decline Action Buttons */}
                <div className="space-y-2 pt-2">
                  {nextDuty.asg.status !== 'confirmed' ? (
                    <>
                      <button
                        onClick={() => confirmAttendance(nextDuty.asg.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.01]"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>I&apos;m Coming (On Time)</span>
                      </button>

                      <button
                        onClick={() => handleOpenLateConfirm(nextDuty.asg.id, nextDuty.prog, nextDuty.role)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium text-xs rounded-xl transition-all"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Can&apos;t make exact call time? (Add Note)</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleOpenLateConfirm(nextDuty.asg.id, nextDuty.prog, nextDuty.role)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 text-xs rounded-xl transition-colors"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{nextDuty.asg.arrivalComment ? 'Update Arrival Note' : 'Add Late Arrival Note'}</span>
                    </button>
                  )}

                  {nextDuty.asg.status === 'confirmed' ? (
                    <button
                      onClick={() => handleOpenDecline(nextDuty.asg.id)}
                      className="w-full text-center text-xs text-rose-400/80 hover:text-rose-300 py-1.5 transition-colors"
                    >
                      Need to change? Decline & Request Replacement
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenDecline(nextDuty.asg.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-rose-950/40 hover:text-rose-300 border border-slate-800 hover:border-rose-900/60 text-slate-300 text-xs rounded-xl transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Can&apos;t Attend (Decline)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedCalendarDuty(nextDuty);
                      setCalendarSyncOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs rounded-xl transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add to Google Calendar / iCal</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-200">No Pending Assignments</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You are currently not rostered for upcoming services. Leadership will notify you when new assignments are published.
            </p>
          </div>
        )}
      </section>

      {/* Grid: All My Upcoming Assignments + Reminders History */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* All Assignments List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-white">All My Scheduled Duties</h2>

          <div className="space-y-3">
            {myDuties.map(({ asg, prog, role }) => (
              <div
                key={`${asg.id}-${asg.programId}-${asg.roleId}`}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{prog.title}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-xs text-amber-400">{prog.date}</span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>Role: <strong className="text-slate-300">{role.name}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Call Time: <strong className="text-amber-300">{prog.callTime}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {asg.status === 'confirmed' ? (
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium rounded-lg">
                        <Check className="w-3.5 h-3.5" /> Confirmed
                      </span>
                      {asg.arrivalComment && (
                        <button
                          type="button"
                          onClick={() => handleOpenLateConfirm(asg.id, prog, role)}
                          className="text-[10px] text-amber-300 font-medium bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 px-2 py-0.5 rounded cursor-pointer transition-colors"
                          title={`Click to edit note: "${asg.arrivalComment}"`}
                        >
                          ETA: {asg.estimatedArrivalTime || 'Delayed'} (Note)
                        </button>
                      )}
                    </div>
                  ) : asg.status === 'declined' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-medium rounded-lg">
                      <XCircle className="w-3.5 h-3.5" /> Declined
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => confirmAttendance(asg.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        On Time
                      </button>
                      <button
                        onClick={() => handleOpenLateConfirm(asg.id, prog, role)}
                        className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                        title="Can't make exact call time? Confirm with note / ETA"
                      >
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>+ Note</span>
                      </button>
                      <button
                        onClick={() => handleOpenDecline(asg.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedCalendarDuty({ prog, role, asg });
                      setCalendarSyncOpen(true);
                    }}
                    title="Add to Calendar"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reminders Dispatch Log & Blackout Dates */}
        <div className="space-y-6">
          {/* Blackout Dates / Availability */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">My Availability & Blackout Dates</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mark upcoming dates when you are traveling or unavailable so leadership won&apos;t roster you.
            </p>

            <form onSubmit={handleAddBlackout} className="flex gap-2">
              <input
                type="date"
                value={blackoutInput}
                onChange={(e) => setBlackoutInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors whitespace-nowrap"
              >
                Block Date
              </button>
            </form>

            <div className="space-y-1.5 pt-1">
              {currentMember.blackoutDates && currentMember.blackoutDates.length > 0 ? (
                currentMember.blackoutDates.map((dateStr) => (
                  <div
                    key={dateStr}
                    className="flex items-center justify-between p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                  >
                    <span className="text-slate-300 font-mono">{dateStr}</span>
                    <button
                      onClick={() => handleRemoveBlackout(dateStr)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic">No blackout dates registered.</div>
              )}
            </div>
          </div>

          {/* Automated Reminder History */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">MediaServe Reminder Protocol</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatic alerts are dispatched at 7 days, 3 days, 24 hours, 1 hour, and 15 minutes before your scheduled call times.
            </p>
            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>7 Days Before Service</span>
                <span className="text-emerald-400 font-mono">Dispatched</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>3 Days Before Service</span>
                <span className="text-emerald-400 font-mono">Dispatched</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>24 Hours (Call Time Alert)</span>
                <span className="text-emerald-400 font-mono">Dispatched</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>15 Minutes Warning</span>
                <span className="text-slate-500 font-mono">Queued</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Verse of the Day & AKWC Announcements Section */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Verse of the Day & Ministry Communications</h2>
          </div>
          <span className="text-xs text-slate-400">COP Akweteyman Worship Center</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Verse of the Day Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-amber-950/20 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Scripture Inspiration for Media Servants
              </span>
              <button
                onClick={handleCopyVerse}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
              >
                {verseCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{verseCopied ? 'Copied' : 'Share Verse'}</span>
              </button>
            </div>

            <blockquote className="space-y-2">
              <p className="text-base sm:text-lg font-serif italic text-white leading-relaxed">
                &ldquo;{verse.verse}&rdquo;
              </p>
              <footer className="text-xs font-semibold text-amber-300">
                — {verse.reference}
              </footer>
            </blockquote>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
              <div className="text-[11px] font-semibold text-amber-400">Media Ministry Reflection</div>
              <p className="text-xs text-slate-300 leading-relaxed">{verse.reflection}</p>
            </div>
          </div>

          {/* Announcements Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                AKWC Announcements & Updates
              </span>
              <span className="text-[11px] text-slate-400">{announcements.length} Active</span>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {announcements.length > 0 ? (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{ann.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{ann.date}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                    <div className="text-[10px] text-amber-400/80 font-medium">Posted by {ann.author}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic py-8 text-center">No active announcements.</div>
              )}
            </div>
          </div>
        </div>
      </section>

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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDecline}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-rose-950/50"
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
