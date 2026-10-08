import React, { useState } from 'react';
import { ProgramService, RoleAssignment, MediaRole } from '../../types';
import { X, UserCheck, AlertTriangle, Phone, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: RoleAssignment;
  program: ProgramService;
  role: MediaRole;
}

export const ReplacementModal: React.FC<ReplacementModalProps> = ({
  isOpen,
  onClose,
  assignment,
  program,
  role,
}) => {
  const { members, assignments, replaceAssignment } = useApp();
  const [selectedNewMemberId, setSelectedNewMemberId] = useState<string>('');

  if (!isOpen) return null;

  const previousMember = members.find((m) => m.id === assignment.memberId);

  // Check which members are already assigned to this program
  const assignedMemberIds = new Set(
    assignments
      .filter((a) => a.programId === program.id && a.memberId && a.id !== assignment.id)
      .map((a) => a.memberId as string)
  );

  // Filter candidates: active members who are not already booked on this service
  const candidates = members
    .filter((m) => m.status === 'active' && m.id !== assignment.memberId)
    .map((m) => {
      const isAlreadyBooked = assignedMemberIds.has(m.id);
      const isPrimaryMatch = m.primaryRole === role.id;
      const isSecondaryMatch = m.secondaryRoles?.includes(role.id) || false;
      const isQualified = isPrimaryMatch || isSecondaryMatch;

      return {
        member: m,
        isAlreadyBooked,
        isQualified,
        matchScore: isPrimaryMatch ? 3 : isSecondaryMatch ? 2 : 1,
      };
    })
    .sort((a, b) => {
      // Prioritize available and qualified members
      if (a.isAlreadyBooked !== b.isAlreadyBooked) {
        return a.isAlreadyBooked ? 1 : -1;
      }
      return b.matchScore - a.matchScore;
    });

  const handleConfirm = async () => {
    if (!selectedNewMemberId) return;
    await replaceAssignment(assignment.id, selectedNewMemberId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Assign Shift Replacement</h3>
              <p className="text-xs text-slate-400">{program.title} · {program.date}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vacated Station Alert */}
        <div className="my-4 p-3.5 bg-rose-950/40 border border-rose-900/60 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Attendance Issue: Member Declined</span>
          </div>
          <div className="text-xs text-slate-300">
            <strong className="text-white">{previousMember?.name || 'Assigned member'}</strong> was scheduled for{' '}
            <strong className="text-amber-300">{role.name}</strong> ({role.station}).
          </div>
          {assignment.declineReason && (
            <div className="text-xs text-rose-200/90 italic pt-1 border-t border-rose-900/40">
              Reported Reason: &ldquo;{assignment.declineReason}&rdquo;
            </div>
          )}
        </div>

        {/* Candidate Selector */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Select Available Replacement Candidate</span>
            <span>{candidates.filter((c) => !c.isAlreadyBooked).length} Available</span>
          </div>

          <div className="space-y-2">
            {candidates.map(({ member, isAlreadyBooked, isQualified }) => {
              const isSelected = selectedNewMemberId === member.id;
              return (
                <div
                  key={member.id}
                  onClick={() => !isAlreadyBooked && setSelectedNewMemberId(member.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isAlreadyBooked
                      ? 'opacity-40 bg-slate-950 border-slate-800 cursor-not-allowed'
                      : isSelected
                      ? 'bg-amber-500/10 border-amber-500/60 text-white shadow-xs'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <span>{member.name}</span>
                          {isQualified && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-normal">
                              <Star className="w-3 h-3 fill-emerald-400/20" /> Matching Role
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>{member.skillLevel}</span>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {member.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isAlreadyBooked ? (
                        <span className="text-xs text-slate-500 italic">Already Booked</span>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-amber-400 bg-amber-400 text-slate-950'
                              : 'border-slate-700'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedNewMemberId}
            className={`px-5 py-2 text-xs font-semibold rounded-lg transition-colors ${
              selectedNewMemberId
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Confirm Replacement & Dispatch Alert
          </button>
        </div>
      </div>
    </div>
  );
};
