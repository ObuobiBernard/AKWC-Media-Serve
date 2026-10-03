import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarSyncModal } from '../shared/CalendarSyncModal';
import { AccountSwitcherModal } from '../auth/AccountSwitcherModal';
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
} from 'lucide-react';
import { ProgramService, RoleAssignment, MediaRole } from '../../types';

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
    showToast,
  } = useApp();

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

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
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8">
        <img
          src="/src/assets/images/church_media_booth_1791063344649.jpg"
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
              <span className="text-slate-400">Verified Member</span>
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
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-lg flex items-center gap-2.5 text-emerald-300 text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold">Attendance Confirmed</div>
                        <div className="text-[10px] text-emerald-400/80">
                          Checked in for duty. See you at {nextDuty.prog.callTime}!
                        </div>
                      </div>
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
                  {nextDuty.asg.status !== 'confirmed' && (
                    <button
                      onClick={() => confirmAttendance(nextDuty.asg.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.01]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>I&apos;m Coming (Confirm Attendance)</span>
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
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium rounded-lg">
                      <Check className="w-3.5 h-3.5" /> Confirmed
                    </span>
                  ) : asg.status === 'declined' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-medium rounded-lg">
                      <XCircle className="w-3.5 h-3.5" /> Declined
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => confirmAttendance(asg.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Confirm
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

            <blockquote className="space-y-2 border-l-2 border-amber-500/80 pl-4 py-1">
              <p className="text-base sm:text-lg font-medium text-slate-100 italic leading-relaxed">
                &ldquo;{verse.verse}&rdquo;
              </p>
              <footer className="text-xs font-semibold text-amber-400 not-italic">
                — {verse.reference}
              </footer>
            </blockquote>

            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <div className="text-xs font-medium text-slate-300">Ministry Reflection:</div>
              <p className="text-xs text-slate-400 leading-relaxed">{verse.reflection}</p>
            </div>
          </div>

          {/* AKWC Announcements Board */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Media Team Announcements</span>
              </h3>
              <span className="text-xs text-slate-500">{announcements.length} Active Bulletins</span>
            </div>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">{ann.title}</span>
                    {ann.priority === 'urgent' && (
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold rounded-md uppercase tracking-wider shrink-0">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{ann.content}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-900">
                    <span>{ann.author}</span>
                    <span>{ann.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Decline Reason Modal */}
      {declineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Decline Media Assignment</h3>
                <p className="text-xs text-slate-400">Alert leadership so a replacement can be assigned</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Reason
                </label>
                <select
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                >
                  <option value="Work schedule conflict">Work schedule / Shift conflict</option>
                  <option value="Family commitment / Travel">Family commitment / Traveling out of Accra</option>
                  <option value="Health / Feeling unwell">Health / Feeling unwell</option>
                  <option value="Academic exam / School deadline">Academic exam / School commitment</option>
                  <option value="Emergency">Unexpected Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Additional Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide context for the director..."
                  value={declineCustomNote}
                  onChange={(e) => setDeclineCustomNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeclineModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={submitDecline}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Confirm Decline & Request Replacement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Sync Modal */}
      {selectedCalendarDuty && (
        <CalendarSyncModal
          isOpen={calendarSyncOpen}
          onClose={() => setCalendarSyncOpen(false)}
          program={selectedCalendarDuty.prog}
          role={selectedCalendarDuty.role}
          assignment={selectedCalendarDuty.asg}
        />
      )}

      {/* Password Setup / Account Switcher Modal */}
      <AccountSwitcherModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
};
