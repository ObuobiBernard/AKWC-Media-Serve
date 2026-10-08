import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserPlus,
  Trash2,
  Megaphone,
  Plus,
  Lock,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  RefreshCw,
  UserCheck,
  AlertCircle,
  X,
} from 'lucide-react';

export const LeadershipPortal: React.FC = () => {
  const {
    isSuperAdmin,
    isPatron,
    members,
    programs,
    roles,
    assignments,
    announcements,
    addAnnouncement,
    deleteAnnouncement,
    deleteMember,
    createProgram,
    deleteProgram,
    autoFillRoster,
    assignMemberToRole,
    openWhatsAppModalForAssignment,
  } = useApp();

  // Announcement State
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);

  // New Program/Service State
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const [progTitle, setProgTitle] = useState('');
  const [progDate, setProgDate] = useState('');
  const [progCallTime, setProgCallTime] = useState('07:00 AM');
  const [progStartTime, setProgStartTime] = useState('08:00 AM');
  const [progEndTime, setProgEndTime] = useState('11:30 AM');
  const [progLocation, setProgLocation] = useState('Main Sanctuary');

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) return;

    await addAnnouncement({
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      date: new Date().toISOString().split('T')[0],
      author: 'Media Leadership',
      priority: 'normal',
    });

    setAnnouncementTitle('');
    setAnnouncementContent('');
    setShowAddAnnouncementModal(false);
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progTitle.trim() || !progDate) return;

    await createProgram({
      title: progTitle.trim(),
      date: progDate,
      callTime: progCallTime,
      startTime: progStartTime,
      endTime: progEndTime,
      location: progLocation,
      status: 'upcoming',
    });

    setProgTitle('');
    setProgDate('');
    setShowCreateProgramModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Role Banner Badge */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {isPatron ? 'Media Patron Overview' : 'Media Leadership Portal'}
            </h2>
            <p className="text-xs text-slate-400">
              {isPatron
                ? 'Read-only roster & attendance view with Announcement posting privileges.'
                : 'Manage services, team rosters, duty dispatches, and announcements.'}
            </p>
          </div>
        </div>
      </div>

      {/* SERVICE MANAGEMENT & ROSTER DISPATCH */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Upcoming Services & Duty Assignments</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Create upcoming church programs and assign team members to media stations.
            </p>
          </div>

          {!isPatron && (
            <button
              onClick={() => setShowCreateProgramModal(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Service</span>
            </button>
          )}
        </div>

        {/* List of Services or Empty State */}
        {programs.length === 0 ? (
          <div className="py-10 text-center space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-6">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-300">No Active Service Programs</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All programs in Supabase were deleted. Click &ldquo;Create New Service&rdquo; above to schedule an upcoming service roster.
              </p>
            </div>
            {!isPatron && (
              <button
                onClick={() => setShowCreateProgramModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                <Plus className="w-4 h-4" />
                <span>Create Service Now</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {programs.map((prog) => (
              <div
                key={prog.id}
                className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-4"
              >
                {/* Service Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <div className="text-sm font-bold text-amber-400">{prog.title}</div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" /> {prog.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" /> Call Time: {prog.callTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" /> {prog.location}
                      </span>
                    </div>
                  </div>

                  {!isPatron && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => autoFillRoster(prog.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer"
                        title="Automatically assign matching team members to open roles"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto-Fill</span>
                      </button>
                      <button
                        onClick={() => deleteProgram(prog.id)}
                        className="p-1.5 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 rounded-lg transition-colors cursor-pointer border border-rose-900/40"
                        title="Delete Program"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Role Assignments Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {roles.map((role) => {
                    const asg = assignments.find(
                      (a) => a.programId === prog.id && a.roleId === role.id
                    );
                    const assignedMem = members.find((m) => m.id === asg?.memberId);

                    return (
                      <div
                        key={role.id}
                        className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{role.name}</span>
                          <span className="text-[10px] text-slate-500">{role.station}</span>
                        </div>

                        {/* Assignee Picker */}
                        <div className="flex items-center gap-1.5">
                          <select
                            disabled={isPatron}
                            value={asg?.memberId || ''}
                            onChange={(e) => assignMemberToRole(prog.id, role.id, e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-70"
                          >
                            <option value="">-- Unassigned --</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>

                          {assignedMem && !isPatron && (
                            <button
                              onClick={() =>
                                openWhatsAppModalForAssignment(prog.id, role.id, assignedMem.id)
                              }
                              className="p-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg border border-emerald-500/30 shrink-0 cursor-pointer"
                              title="Send WhatsApp Duty Reminder"
                            >
                              <Megaphone className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Status pill */}
                        {asg && (
                          <div className="text-[10px] flex items-center justify-between pt-0.5">
                            <span
                              className={`px-2 py-0.5 rounded-full font-semibold ${
                                asg.status === 'confirmed'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : asg.status === 'declined'
                                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {asg.status.toUpperCase()}
                            </span>
                            {asg.declineReason && (
                              <span
                                className="text-rose-400 truncate max-w-[120px]"
                                title={asg.declineReason}
                              >
                                {asg.declineReason}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcements Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Ministry Announcements</h3>
          </div>
          <button
            onClick={() => setShowAddAnnouncementModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Announcement</span>
          </button>
        </div>

        <div className="space-y-2">
          {announcements.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No announcements posted yet.</p>
          ) : (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-bold text-white">{ann.title}</div>
                  <div className="text-xs text-slate-300 mt-1">{ann.content}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Posted by {ann.author} · {ann.date}
                  </div>
                </div>
                <button
                  onClick={() => deleteAnnouncement(ann.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Team Roster List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white">AKWC Media Team Roster</h3>

        <div className="divide-y divide-slate-800/60">
          {members.map((member) => (
            <div key={member.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-white">{member.name}</div>
                <div className="text-slate-400 text-[11px]">
                  {member.email} · {member.phone}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Delete Member Button: ONLY Visible to Super Admin */}
                {isSuperAdmin ? (
                  <button
                    onClick={() => deleteMember(member.id)}
                    className="p-1.5 bg-rose-950/40 border border-rose-900/50 text-rose-400 hover:bg-rose-900/60 rounded-lg transition-colors cursor-pointer"
                    title="Delete Member (Super Admin Only)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span
                    className="text-[10px] text-slate-600 flex items-center gap-1 italic"
                    title="Only Super Admin can delete members"
                  >
                    <Lock className="w-3 h-3" /> Protected
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CREATE SERVICE PROGRAM MODAL */}
      {showCreateProgramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Create New Service Roster</span>
              </h3>
              <button
                onClick={() => setShowCreateProgramModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProgram} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Service Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunday Divine Service / Friday Vigil"
                  value={progTitle}
                  onChange={(e) => setProgTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={progDate}
                    onChange={(e) => setProgDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Call Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 07:00 AM"
                    value={progCallTime}
                    onChange={(e) => setProgCallTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 08:00 AM"
                    value={progStartTime}
                    onChange={(e) => setProgStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 11:30 AM"
                    value={progEndTime}
                    onChange={(e) => setProgEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Location / Venue</label>
                <input
                  type="text"
                  placeholder="Main Sanctuary"
                  value={progLocation}
                  onChange={(e) => setProgLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateProgramModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save & Start Assigning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Announcement Modal */}
      {showAddAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Post New Announcement</h3>
            <form onSubmit={handlePostAnnouncement} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Media Team Briefing Ahead of Sunday"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Content</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Type the announcement details here..."
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAnnouncementModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
