import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserPlus,
  Trash2,
  Megaphone,
  Plus,
  Lock,
  ShieldCheck,
} from 'lucide-react';

export const LeadershipPortal: React.FC = () => {
  const {
    isSuperAdmin,
    isPatron,
    members,
    announcements,
    addAnnouncement,
    deleteAnnouncement,
    deleteMember,
  } = useApp();

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [showAddAnnouncementModal, setShowAddAnnouncementModal] = useState(false);

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
                : 'Manage services, team rosters, attendance, and announcements.'}
            </p>
          </div>
        </div>
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

      {/* Post Announcement Modal */}
      {showAddAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-4">
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
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
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
