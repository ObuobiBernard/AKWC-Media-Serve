import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProgramService, RoleAssignment, MediaRole, TeamMember } from '../../types';
import { WhatsAppReminderModal } from '../shared/WhatsAppReminderModal';
import { CalendarSyncModal } from '../shared/CalendarSyncModal';
import { ReplacementModal } from '../shared/ReplacementModal';
import {
  Calendar,
  Clock,
  UserCheck,
  AlertTriangle,
  Plus,
  Send,
  CalendarPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';

export const LeadershipPortal: React.FC = () => {
  const {
    programs,
    assignments,
    roles,
    members,
    currentMember,
    createProgram,
    deleteProgram,
    assignMemberToRole,
    autoFillRoster,
    removeAssignment,
    triggerManualReminder,
    showToast,
  } = useApp();

  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    programs[0]?.id || ''
  );

  const selectedProgram =
    programs.find((p) => p.id === selectedProgramId) || programs[0];

  // Modals
  const [createProgOpen, setCreateProgOpen] = useState(false);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [whatsAppTargetMemberId, setWhatsAppTargetMemberId] = useState<string | undefined>();
  const [whatsAppTargetRoleId, setWhatsAppTargetRoleId] = useState<string | undefined>();
  const [calendarSyncOpen, setCalendarSyncOpen] = useState(false);
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [activeReplacementData, setActiveReplacementData] = useState<{
    assignment: RoleAssignment;
    role: MediaRole;
  } | null>(null);

  // New Program Form State
  const [newTitle, setNewTitle] = useState('');
  const [newServiceType, setNewServiceType] = useState<ProgramService['serviceType']>('Sunday Divine Service');
  const [newDate, setNewDate] = useState('2026-10-11');
  const [newStartTime, setNewStartTime] = useState('07:30 AM');
  const [newEndTime, setNewEndTime] = useState('10:00 AM');
  const [newCallTime, setNewCallTime] = useState('06:45 AM');
  const [newLocation, setNewLocation] = useState('Main Sanctuary & Media Suite, AKWC');
  const [newTheme, setNewTheme] = useState('');
  const [newDirector, setNewDirector] = useState(currentMember.name);

  // Assignments for current program
  const currentAssignments = assignments.filter((a) => a.programId === selectedProgram?.id);

  // Calculate monitoring stats
  const totalSlots = roles.length;
  const assignedSlots = currentAssignments.filter((a) => a.memberId).length;
  const confirmedCount = currentAssignments.filter((a) => a.status === 'confirmed').length;
  const pendingCount = currentAssignments.filter((a) => a.status === 'pending' && a.memberId).length;
  const declinedCount = currentAssignments.filter((a) => a.status === 'declined').length;
  const unassignedCount = totalSlots - assignedSlots;

  const confirmationRate = assignedSlots > 0 ? Math.round((confirmedCount / assignedSlots) * 100) : 0;

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const newId = createProgram({
      title: newTitle,
      serviceType: newServiceType,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      callTime: newCallTime,
      location: newLocation,
      theme: newTheme,
      directorName: newDirector,
    });
    setSelectedProgramId(newId);
    setCreateProgOpen(false);
    setNewTitle('');
    setNewTheme('');
  };

  const handleOpenWhatsAppForMember = (memberId: string, roleId: string) => {
    setWhatsAppTargetMemberId(memberId);
    setWhatsAppTargetRoleId(roleId);
    setWhatsAppModalOpen(true);
  };

  const handleOpenReplacement = (asg: RoleAssignment, role: MediaRole) => {
    setActiveReplacementData({ assignment: asg, role });
    setReplacementModalOpen(true);
  };

  // Auto fill recommendation
  const handleAutoFillRoster = () => {
    if (!selectedProgram) return;
    autoFillRoster(selectedProgram.id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Workflow Navigation Banner */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Core Leadership Workflow
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              Create → Assign → Remind → Confirm → Monitor
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Plan service media coverage, assign crew stations, trigger multi-stage reminders, and monitor confirmations in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCreateProgOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-amber-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Service</span>
            </button>

            <button
              onClick={() => {
                setWhatsAppTargetMemberId(undefined);
                setWhatsAppModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Dispatch</span>
            </button>

            <button
              onClick={() => setCalendarSyncOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Google Calendar</span>
            </button>
          </div>
        </div>

        {/* Program Selector Tabs */}
        <div className="pt-2 border-t border-slate-800">
          <div className="text-xs font-medium text-slate-400 mb-2">Select Active Service Roster:</div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {programs.map((prog) => {
              const isSelected = selectedProgram?.id === prog.id;
              const progAssignments = assignments.filter((a) => a.programId === prog.id);
              const hasDeclines = progAssignments.some((a) => a.status === 'declined');

              return (
                <button
                  key={prog.id}
                  onClick={() => setSelectedProgramId(prog.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/60 text-white shadow-xs'
                      : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="font-semibold">{prog.title}</span>
                  <span className="text-[11px] text-slate-500">({prog.date})</span>
                  {hasDeclines && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Has declined shift needing replacement" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Program Details & Real-Time Monitoring Stats */}
      {selectedProgram && (
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Service Info Box */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-amber-400">{selectedProgram.serviceType}</span>
                <h2 className="text-xl font-bold text-white mt-0.5">{selectedProgram.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoFillRoster}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fill Qualified Roster</span>
                </button>
                {programs.length > 1 && (
                  <button
                    onClick={() => deleteProgram(selectedProgram.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                    title="Delete service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {selectedProgram.theme && (
              <p className="text-xs text-amber-200/90 italic">
                Theme: &ldquo;{selectedProgram.theme}&rdquo;
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                <div className="text-[11px] text-slate-500">Service Date</div>
                <div className="text-sm font-semibold text-white mt-0.5">{selectedProgram.date}</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                <div className="text-[11px] text-slate-500">Call Time (Strict)</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">{selectedProgram.callTime}</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                <div className="text-[11px] text-slate-500">Service Hours</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">
                  {selectedProgram.startTime} - {selectedProgram.endTime}
                </div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                <div className="text-[11px] text-slate-500">Duty Director</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5">{selectedProgram.directorName}</div>
              </div>
            </div>
          </div>

          {/* Monitoring Stats Column */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-400">Live Confirmation Rate</div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-white tabular-nums">{confirmationRate}%</span>
                <span className="text-xs text-slate-400">
                  ({confirmedCount}/{assignedSlots} confirmed)
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${confirmationRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-emerald-400 font-bold tabular-nums text-base">{confirmedCount}</div>
                <div className="text-[11px] text-slate-400">Confirmed</div>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-amber-400 font-bold tabular-nums text-base">{pendingCount}</div>
                <div className="text-[11px] text-slate-400">Pending</div>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-rose-400 font-bold tabular-nums text-base">{declinedCount}</div>
                <div className="text-[11px] text-slate-400">Declined</div>
              </div>
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 font-bold tabular-nums text-base">{unassignedCount}</div>
                <div className="text-[11px] text-slate-400">Vacant</div>
              </div>
            </div>

            {declinedCount > 0 && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-900/60 rounded-xl flex items-center gap-2 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{declinedCount} member declined. Replacement required immediately.</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Roster Assignment Matrix Table */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Media Stations & Assignment Matrix</h2>
            <p className="text-xs text-slate-400">Assign crew to audio, video switcher, cameras, projection, lighting and streaming stations.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerManualReminder(selectedProgram.id, '24-Hour Call Time Alert')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-blue-400" />
              <span>Broadcast 24h Reminder</span>
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Station & Media Role</th>
                  <th className="py-3 px-4">Required Skill</th>
                  <th className="py-3 px-4">Assigned Member</th>
                  <th className="py-3 px-4">Status & Attendance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {roles.map((role) => {
                  const asg = currentAssignments.find((a) => a.roleId === role.id);
                  const assignedMember = members.find((m) => m.id === asg?.memberId);
                  const isDeclined = asg?.status === 'declined';
                  const isConfirmed = asg?.status === 'confirmed';
                  const isPending = asg?.status === 'pending' && Boolean(assignedMember);

                  return (
                    <tr
                      key={role.id}
                      className={`hover:bg-slate-850/50 transition-colors ${
                        isDeclined ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Station & Role */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white text-sm">{role.name}</div>
                        <div className="text-[11px] text-slate-400">{role.station}</div>
                      </td>

                      {/* Required Skill */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <span className="font-mono text-[11px] text-slate-400">
                          {role.skillRequired}
                        </span>
                      </td>

                      {/* Assigned Member */}
                      <td className="py-3.5 px-4">
                        {assignedMember ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-amber-400 shrink-0">
                              {assignedMember.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-medium text-slate-100 flex items-center gap-1.5">
                                <span>{assignedMember.name}</span>
                                {asg?.replacementForMemberId && (
                                  <span className="text-[10px] text-amber-400 font-normal">
                                    (Replacement)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{assignedMember.phone}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-500 italic flex items-center gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
                            <span>Unassigned station</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isConfirmed && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> Confirmed
                            </span>
                            {asg?.arrivalComment && (
                              <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg space-y-0.5 max-w-xs">
                                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                                  <Clock className="w-3 h-3" />
                                  <span>Delayed Arrival {asg.estimatedArrivalTime ? `· ETA: ${asg.estimatedArrivalTime}` : ''}</span>
                                </div>
                                <div className="italic text-slate-300">
                                  &ldquo;{asg.arrivalComment}&rdquo;
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                            <Clock className="w-4 h-4" /> Response Pending
                          </span>
                        )}
                        {isDeclined && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium">
                              <XCircle className="w-4 h-4" /> Declined: Needs Replacement
                            </span>
                            {asg.declineReason && (
                              <div className="text-[10px] text-rose-300/80 italic">
                                &ldquo;{asg.declineReason}&rdquo;
                              </div>
                            )}
                          </div>
                        )}
                        {!assignedMember && (
                          <span className="text-slate-500 font-medium">Vacant</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If declined, prominent Find Replacement button */}
                          {isDeclined && (
                            <button
                              onClick={() => handleOpenReplacement(asg, role)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-colors"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Find Replacement</span>
                            </button>
                          )}

                          {/* Quick assign / change member dropdown */}
                          <select
                            value={assignedMember?.id || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                assignMemberToRole(selectedProgram.id, role.id, e.target.value);
                              } else if (asg) {
                                removeAssignment(asg.id);
                              }
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 hover:border-slate-700 focus:outline-none focus:border-amber-500/50"
                          >
                            <option value="">{assignedMember ? 'Change Member...' : 'Assign Member...'}</option>
                            {members
                              .filter((m) => m.status === 'active')
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.skillLevel})
                                </option>
                              ))}
                          </select>

                          {/* WhatsApp alert */}
                          {assignedMember && (
                            <button
                              onClick={() => handleOpenWhatsAppForMember(assignedMember.id, role.id)}
                              title="Send WhatsApp assignment reminder"
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20 rounded-lg transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          {/* Remove Assignment */}
                          {asg && (
                            <button
                              onClick={() => removeAssignment(asg.id)}
                              title="Clear assignment"
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Multi-Tier Reminders Protocol */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Automated Multi-Stage Reminder Protocol</h3>
            <p className="text-xs text-slate-400">
              MediaServe automatically dispatches alerts according to the church media schedule policy.
            </p>
          </div>
          <button
            onClick={() => triggerManualReminder(selectedProgram.id, 'Manual Leadership Broadcast')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Trigger Broadcast To All Crew</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-xs font-semibold text-slate-300">1. 7 Days Prior</div>
            <div className="text-[11px] text-slate-400">Initial Roster Notice</div>
            <div className="text-[10px] text-emerald-400 font-mono">Active</div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-xs font-semibold text-slate-300">2. 3 Days Prior</div>
            <div className="text-[11px] text-slate-400">Mid-Week Followup</div>
            <div className="text-[10px] text-emerald-400 font-mono">Active</div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-xs font-semibold text-slate-300">3. 24 Hours Prior</div>
            <div className="text-[11px] text-slate-400">Call Time & Station</div>
            <div className="text-[10px] text-emerald-400 font-mono">Active</div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-xs font-semibold text-slate-300">4. 1 Hour Prior</div>
            <div className="text-[11px] text-slate-400">Transit & Arrival</div>
            <div className="text-[10px] text-amber-400 font-mono">Queued</div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-xs font-semibold text-slate-300">5. 15 Mins Prior</div>
            <div className="text-[11px] text-slate-400">Soundcheck Check-in</div>
            <div className="text-[10px] text-amber-400 font-mono">Queued</div>
          </div>
        </div>
      </section>

      {/* Create Program Modal */}
      {createProgOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">Create New Service / Program</h3>
              <button
                onClick={() => setCreateProgOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Service Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sunday Celebration Service"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Service Type</label>
                  <select
                    value={newServiceType}
                    onChange={(e) => setNewServiceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Sunday Divine Service">Sunday Divine Service</option>
                    <option value="Sunday Second Service">Sunday Second Service</option>
                    <option value="Wednesday Midweek">Wednesday Midweek</option>
                    <option value="Friday Prophetic">Friday Prophetic</option>
                    <option value="Youth Service">Youth Service</option>
                    <option value="Special Event">Special Event / Convention</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Call Time</label>
                  <input
                    type="text"
                    placeholder="06:45 AM"
                    value={newCallTime}
                    onChange={(e) => setNewCallTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Time</label>
                  <input
                    type="text"
                    placeholder="07:30 AM"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">End Time</label>
                  <input
                    type="text"
                    placeholder="10:00 AM"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Sermon / Service Theme (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Walking in Supernatural Fruitfulness"
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Duty Director</label>
                <input
                  type="text"
                  value={newDirector}
                  onChange={(e) => setNewDirector(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateProgOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  Create & Seed Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {selectedProgram && (
        <WhatsAppReminderModal
          isOpen={whatsAppModalOpen}
          onClose={() => setWhatsAppModalOpen(false)}
          program={selectedProgram}
          members={members}
          roles={roles}
          selectedMemberId={whatsAppTargetMemberId}
          selectedRoleId={whatsAppTargetRoleId}
        />
      )}

      {/* Calendar Modal */}
      {selectedProgram && (
        <CalendarSyncModal
          isOpen={calendarSyncOpen}
          onClose={() => setCalendarSyncOpen(false)}
          program={selectedProgram}
        />
      )}

      {/* Replacement Modal */}
      {activeReplacementData && selectedProgram && (
        <ReplacementModal
          isOpen={replacementModalOpen}
          onClose={() => {
            setReplacementModalOpen(false);
            setActiveReplacementData(null);
          }}
          assignment={activeReplacementData.assignment}
          role={activeReplacementData.role}
          program={selectedProgram}
        />
      )}
    </div>
  );
};
