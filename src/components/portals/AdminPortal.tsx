import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TeamMember, MediaRole, SkillLevel, Announcement } from '../../types';
import {
  Users,
  Shield,
  FileSpreadsheet,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Download,
  Upload,
  Search,
  CheckCircle2,
  Clock,
  Radio,
  FileText,
  AlertCircle,
  Save,
  KeyRound,
  RotateCcw,
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const {
    members,
    roles,
    programs,
    assignments,
    announcements,
    reminderConfig,
    auditLogs,
    availableAccounts,
    addMember,
    updateMember,
    deleteMember,
    addAnnouncement,
    deleteAnnouncement,
    updateReminderConfig,
    resetPasswordForMember,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'members' | 'roles' | 'excel' | 'config' | 'announcements' | 'audit'>('members');

  // Member Management State
  const [memberSearch, setMemberSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editMemberModalOpen, setEditMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // New Member Form
  const [memName, setMemName] = useState('');
  const [memEmail, setMemEmail] = useState('');
  const [memPhone, setMemPhone] = useState('+233 ');
  const [memPrimaryRole, setMemPrimaryRole] = useState(roles[0]?.id || '');
  const [memSkillLevel, setMemSkillLevel] = useState<SkillLevel>('Intermediate');
  const [memNotes, setMemNotes] = useState('');

  // Reminder Config State
  const [templateDraft, setTemplateDraft] = useState(reminderConfig.whatsappTemplate);

  // New Announcement Form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'urgent'>('normal');

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.phone.includes(memberSearch);
    const matchesRole = filterRole === 'all' || m.primaryRole === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleOpenAddMember = () => {
    setEditingMember(null);
    setMemName('');
    setMemEmail('');
    setMemPhone('+233 24 ');
    setMemPrimaryRole(roles[0]?.id || '');
    setMemSkillLevel('Intermediate');
    setMemNotes('');
    setEditMemberModalOpen(true);
  };

  const handleOpenEditMember = (m: TeamMember) => {
    setEditingMember(m);
    setMemName(m.name);
    setMemEmail(m.email);
    setMemPhone(m.phone);
    setMemPrimaryRole(m.primaryRole);
    setMemSkillLevel(m.skillLevel);
    setMemNotes(m.notes || '');
    setEditMemberModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memName || !memEmail) return;

    if (editingMember) {
      updateMember({
        ...editingMember,
        name: memName,
        email: memEmail,
        phone: memPhone,
        primaryRole: memPrimaryRole,
        skillLevel: memSkillLevel,
        notes: memNotes,
      });
    } else {
      addMember({
        name: memName,
        email: memEmail,
        phone: memPhone,
        primaryRole: memPrimaryRole,
        secondaryRoles: [],
        skillLevel: memSkillLevel,
        status: 'active',
        joinedDate: new Date().toISOString().split('T')[0],
        notes: memNotes,
      });
    }
    setEditMemberModalOpen(false);
  };

  // Export to Excel / CSV
  const handleExportMembersCsv = () => {
    const headers = [
      'ID',
      'Full Name',
      'Phone Number',
      'Email Address',
      'Gender',
      'Primary Media Role',
      'Skill Level',
      'Availability Preference',
      'Status',
      'Joined Date',
      'Notes',
    ];
    const rows = members.map((m) => {
      const roleName = roles.find((r) => r.id === m.primaryRole)?.name || m.primaryRole;
      return [
        m.id,
        `"${m.name}"`,
        `"${m.phone}"`,
        m.email,
        m.gender || 'Male',
        `"${roleName}"`,
        `"${m.rawSkillDescription || m.skillLevel}"`,
        `"${m.availability || 'Flexible'}"`,
        m.status,
        m.joinedDate,
        `"${m.notes || ''}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AKWC_Media_Roster_Database_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('AKWC Media member database exported to Excel CSV!');
  };

  const handleExportScheduleCsv = () => {
    const headers = ['Program ID', 'Program Title', 'Date', 'Call Time', 'Role', 'Station', 'Assigned Member', 'Status', 'Confirmed At'];
    const rows = assignments.map((asg) => {
      const prog = programs.find((p) => p.id === asg.programId);
      const role = roles.find((r) => r.id === asg.roleId);
      const mem = members.find((m) => m.id === asg.memberId);
      return [
        asg.programId,
        `"${prog?.title || ''}"`,
        prog?.date || '',
        `"${prog?.callTime || ''}"`,
        `"${role?.name || ''}"`,
        `"${role?.station || ''}"`,
        `"${mem?.name || 'Unassigned'}"`,
        asg.status,
        asg.confirmedAt || '',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AKWC_Media_Duty_Schedule_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Schedule & attendance matrix exported to Excel CSV!');
  };

  const handleSaveReminderConfig = () => {
    updateReminderConfig({
      ...reminderConfig,
      whatsappTemplate: templateDraft,
    });
  };

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    addAnnouncement({
      title: annTitle,
      content: annContent,
      author: 'Admin Office',
      date: new Date().toISOString().split('T')[0],
      priority: annPriority,
      tag: 'Official Bulletin',
    });
    setAnnTitle('');
    setAnnContent('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Overview & Metrics */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Administration & System Core
            </div>
            <h1 className="text-2xl font-bold text-white mt-0.5">
              AKWC MediaServe System Console
            </h1>
            <p className="text-xs text-slate-400">
              Manage team membership, media stations catalogue, Excel/CSV sync, reminder protocols, and audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportMembersCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Roster CSV</span>
            </button>
            <button
              onClick={handleOpenAddMember}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Team Member</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Blocks */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400">Total Registered Crew</div>
            <div className="text-2xl font-bold text-white tabular-nums">{members.length}</div>
            <div className="text-[10px] text-emerald-400">
              {members.filter((m) => m.status === 'active').length} Active Servants
            </div>
          </div>
          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400">Media Stations & Roles</div>
            <div className="text-2xl font-bold text-white tabular-nums">{roles.length}</div>
            <div className="text-[10px] text-slate-400">Audio, Video, Visuals, Lighting</div>
          </div>
          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400">Scheduled Services</div>
            <div className="text-2xl font-bold text-amber-300 tabular-nums">{programs.length}</div>
            <div className="text-[10px] text-slate-400">Sunday & Midweek Calendar</div>
          </div>
          <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
            <div className="text-[11px] text-slate-400">Roster Assignments</div>
            <div className="text-2xl font-bold text-white tabular-nums">{assignments.length}</div>
            <div className="text-[10px] text-emerald-400">
              {assignments.filter((a) => a.status === 'confirmed').length} Confirmed Check-ins
            </div>
          </div>
        </div>
      </section>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'members', label: 'Team Members Directory', icon: <Users className="w-4 h-4" /> },
          { id: 'roles', label: 'Media Stations & Gear', icon: <Radio className="w-4 h-4" /> },
          { id: 'excel', label: 'Excel MVP / CSV Storage', icon: <FileSpreadsheet className="w-4 h-4" /> },
          { id: 'config', label: 'Reminders & WhatsApp Config', icon: <Settings className="w-4 h-4" /> },
          { id: 'announcements', label: 'Announcements Board', icon: <FileText className="w-4 h-4" /> },
          { id: 'audit', label: 'System Audit Log', icon: <Shield className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-amber-400 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MEMBERS DIRECTORY */}
      {activeTab === 'members' && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search members by name, phone, or email..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50"
              >
                <option value="all">All Primary Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Phone / WhatsApp</th>
                    <th className="py-3 px-4">Primary Station</th>
                    <th className="py-3 px-4">Skill Rating</th>
                    <th className="py-3 px-4">Availability</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredMembers.map((m) => {
                    const primaryRoleObj = roles.find((r) => r.id === m.primaryRole);
                    const acc = availableAccounts.find((a) => a.memberId === m.id || a.email.toLowerCase() === m.email.toLowerCase());
                    return (
                      <tr key={m.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-amber-400 shrink-0">
                              {m.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{m.name}</span>
                                {m.gender && (
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    ({m.gender})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                          {m.phone}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-medium">
                            {primaryRoleObj?.name || m.primaryRole}
                          </div>
                          {m.secondaryRoles && m.secondaryRoles.length > 0 && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                              Secondary: {m.secondaryRoles.map((rId) => roles.find((r) => r.id === rId)?.name || rId).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <div className="font-mono text-[11px] text-amber-400">
                            {m.skillLevel}
                          </div>
                          {m.rawSkillDescription && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                              {m.rawSkillDescription}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">
                          <span className="text-slate-300 font-medium">
                            {m.availability || 'Flexible'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`capitalize font-medium text-xs ${
                              m.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {m.status}
                            </span>
                            {!acc?.hasSetPassword && (
                              <span className="text-[10px] text-amber-400 font-mono" title="First-time password pending">
                                · Unset
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {acc?.hasSetPassword && (
                              <button
                                onClick={() => resetPasswordForMember(m.email)}
                                title="Reset password to allow member to set a new password"
                                className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditMember(m)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {members.length > 1 && (
                              <button
                                onClick={() => deleteMember(m.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                                title="Remove member"
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
      )}

      {/* TAB 2: ROLES & STATIONS */}
      {activeTab === 'roles' && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => (
            <div
              key={r.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  {r.category}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  Min Skill: {r.skillRequired}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{r.name}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500">
                Station: <strong className="text-slate-300">{r.station}</strong>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* TAB 3: EXCEL MVP STORAGE & CSV SYNC */}
      {activeTab === 'excel' && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white">Excel MVP Database Architecture</h3>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              As agreed during the MVP planning, church rosters and membership data can be seamlessly exchanged with Excel spreadsheets via standard CSV format. This maintains zero infrastructure cost while guaranteeing complete portability.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>AKWC Member Roster Database</span>
              </div>
              <p className="text-xs text-slate-400">
                Exports all registered members, phone contacts, primary and secondary media roles, skill ratings, and attendance history into Excel format.
              </p>
              <button
                onClick={handleExportMembersCsv}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Members Excel CSV</span>
              </button>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <span>Duty Rosters & Attendance Records</span>
              </div>
              <p className="text-xs text-slate-400">
                Exports all upcoming service assignments, stations, confirmed check-ins, decline notes, and replacement records into Excel format.
              </p>
              <button
                onClick={handleExportScheduleCsv}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download Schedules Excel CSV</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: REMINDERS & WHATSAPP CONFIG */}
      {activeTab === 'config' && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white">Reminder Schedules & WhatsApp Templates</h3>
            <p className="text-xs text-slate-400">
              Configure the automated dispatch schedule intervals and customize the default message sent to members.
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-300">Active Alert Schedule Intervals</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {reminderConfig.intervals.map((inv) => (
                <div key={inv.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-white">{inv.label}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Offset: {inv.offsetMinutes} mins
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">Status: Enabled</div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                WhatsApp Dispatch Template (Ghana & AKWC Specific)
              </label>
              <p className="text-[11px] text-slate-400">
                Available tags: <code className="text-amber-400 font-mono">{'{memberName}'}</code>,{' '}
                <code className="text-amber-400 font-mono">{'{serviceTitle}'}</code>,{' '}
                <code className="text-amber-400 font-mono">{'{serviceDate}'}</code>,{' '}
                <code className="text-amber-400 font-mono">{'{callTime}'}</code>,{' '}
                <code className="text-amber-400 font-mono">{'{roleName}'}</code>,{' '}
                <code className="text-amber-400 font-mono">{'{stationLocation}'}</code>,{' '}
                <code className="text-amber-400 font-mono">{'{appLink}'}</code>
              </p>
              <textarea
                rows={6}
                value={templateDraft}
                onChange={(e) => setTemplateDraft(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <button
                onClick={handleSaveReminderConfig}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Reminder Template</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 5: ANNOUNCEMENTS BOARD */}
      {activeTab === 'announcements' && (
        <section className="space-y-6">
          {/* Create announcement */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Post New Media Team Announcement</h3>
            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Announcement Title (e.g. Soundcheck policy update)"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </div>
                <div>
                  <select
                    value={annPriority}
                    onChange={(e) => setAnnPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="urgent">Urgent Alert</option>
                  </select>
                </div>
              </div>
              <div>
                <textarea
                  rows={3}
                  placeholder="Announcement body text..."
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
              >
                Publish to Team Portal
              </button>
            </form>
          </div>

          {/* List announcements */}
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{ann.title}</span>
                    {ann.priority === 'urgent' && (
                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold rounded uppercase">
                        Urgent
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{ann.content}</p>
                  <div className="text-[11px] text-slate-500 pt-1">
                    By {ann.author} · {ann.date}
                  </div>
                </div>
                <button
                  onClick={() => deleteAnnouncement(ann.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 6: AUDIT LOG */}
      {activeTab === 'audit' && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">System Activity & Audit Log</h3>
            <span className="text-xs text-slate-500">{auditLogs.length} Events Logged</span>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-medium text-slate-200">
                    <span className="text-amber-400 font-semibold">{log.actorName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-white">{log.action}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">{log.details}</div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                  {new Date(log.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit / Add Member Modal */}
      {editMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">
                {editingMember ? 'Edit Media Team Member' : 'Register New Team Member'}
              </h3>
              <button
                onClick={() => setEditMemberModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ebenezer Addo"
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="name@akwcmedia.org"
                    value={memEmail}
                    onChange={(e) => setMemEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="+233 24 555 1024"
                    value={memPhone}
                    onChange={(e) => setMemPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Primary Station</label>
                  <select
                    value={memPrimaryRole}
                    onChange={(e) => setMemPrimaryRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Skill Rating</label>
                  <select
                    value={memSkillLevel}
                    onChange={(e) => setMemSkillLevel(e.target.value as SkillLevel)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Lead">Lead Director / Engineer</option>
                    <option value="Senior">Senior Operator</option>
                    <option value="Intermediate">Intermediate Crew</option>
                    <option value="Apprentice">Apprentice / In-Training</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes / Preferences</label>
                <textarea
                  rows={2}
                  placeholder="Preferred service times, station equipment notes..."
                  value={memNotes}
                  onChange={(e) => setMemNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditMemberModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  {editingMember ? 'Save Changes' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
