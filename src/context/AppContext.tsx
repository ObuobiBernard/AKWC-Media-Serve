import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  TeamMember,
  MediaRole,
  UserAccount,
  ProgramService,
  RoleAssignment,
  Announcement,
  VerseOfTheDay,
  ReminderConfig,
  AuditLog,
  PortalType,
  RegisterMemberData,
  Pending24HourDuty,
} from '../types';
import {
  INITIAL_ROLES,
  INITIAL_MEMBERS,
  INITIAL_ACCOUNTS,
  INITIAL_PROGRAMS,
  INITIAL_ASSIGNMENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_VERSE,
  INITIAL_REMINDER_CONFIG,
} from '../data/mockData';
import {
  buildAssignmentWhatsAppMessage,
} from '../utils/whatsapp';

export const SUPER_ADMIN_EMAIL = 'bernardoobuobi@gmail.com';

export interface WhatsAppNotificationModalState {
  member: TeamMember;
  role: MediaRole;
  program: ProgramService;
  whatsappUrl: string;
  messageText: string;
}

interface AppContextType {
  // Auth & Navigation
  isLoggedIn: boolean;
  isSuperAdmin: boolean;
  isLeader: boolean;
  isPatron: boolean;
  currentAccount: UserAccount;
  currentMember: TeamMember;
  activePortal: PortalType;
  availableAccounts: UserAccount[];
  switchAccount: (accountId: string) => void;
  switchPortal: (portal: PortalType) => void;
  logout: () => void;
  updateAccountPrivileges: (
    targetAccountId: string,
    newAllowedPortals: PortalType[],
    defaultPortal?: PortalType
  ) => Promise<{ success: boolean; message: string }>;
  toggleMemberLeadership: (
    memberId: string,
    forceStatus?: boolean
  ) => Promise<{ success: boolean; message: string }>;
  checkEmailStatus: (email: string) => {
    status: 'not_found' | 'needs_password' | 'has_password';
    memberName?: string;
    primaryRoleName?: string;
  };
  registerNewMember: (data: RegisterMemberData) => Promise<{ success: boolean; message: string }>;
  setupFirstTimePassword: (email: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; message: string; requiresSetup?: boolean }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
  resetPasswordForMember: (email: string) => Promise<void>;

  // WhatsApp Automated Duty Dispatch
  whatsAppModalState: WhatsAppNotificationModalState | null;
  closeWhatsAppModal: () => void;
  openWhatsAppModalForAssignment: (programId: string, roleId: string, memberId: string) => void;

  // Data Store
  roles: MediaRole[];
  members: TeamMember[];
  programs: ProgramService[];
  assignments: RoleAssignment[];
  announcements: Announcement[];
  verse: VerseOfTheDay;
  reminderConfig: ReminderConfig;
  auditLogs: AuditLog[];

  // Attendance & Workflow Actions
  confirmAttendance: (assignmentId: string, arrivalComment?: string, estimatedArrivalTime?: string) => Promise<void>;
  declineAttendance: (assignmentId: string, reason: string) => Promise<void>;
  assignMemberToRole: (programId: string, roleId: string, memberId: string) => Promise<void>;
  autoFillRoster: (programId: string) => Promise<void>;
  removeAssignment: (assignmentId: string) => Promise<void>;
  replaceAssignment: (assignmentId: string, newMemberId: string) => Promise<void>;
  triggerManualReminder: (programId: string, intervalLabel?: string) => Promise<void>;

  // Session Security & Inactivity Timeout
  inactivityLoggedOut: boolean;
  clearInactivityFlag: () => void;
  inactivityTimeoutMinutes: number;
  setInactivityTimeoutMinutes: (mins: number) => void;
  resetInactivityTimer: () => void;
  showInactivityWarning: boolean;
  inactivitySecondsRemaining: number;

  // Automated 24-Hour Reminder Task & Direct Link Redirection
  pending24HourDuties: Pending24HourDuty[];
  automatedReminderModalOpen: boolean;
  setAutomatedReminderModalOpen: (open: boolean) => void;
  trigger24HourScan: () => void;
  directConfirmData: { asg: RoleAssignment; prog: ProgramService; role: MediaRole; member: TeamMember } | null;
  closeDirectConfirmModal: () => void;

  // Programs & Management
  createProgram: (newProg: Omit<ProgramService, 'id'>) => Promise<string>;
  updateProgram: (updatedProg: ProgramService) => Promise<void>;
  deleteProgram: (programId: string) => Promise<void>;

  // Members Management
  addMember: (member: Omit<TeamMember, 'id'>) => Promise<string>;
  updateMember: (member: TeamMember) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;

  // Announcements & Verses
  addAnnouncement: (announcement: Omit<Announcement, 'id'>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  updateVerse: (newVerse: VerseOfTheDay) => Promise<void>;
  updateReminderConfig: (config: ReminderConfig) => Promise<void>;

  // Tools & Reset
  resetToDefaults: () => Promise<void>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

let idSequence = 0;
export const generateUniqueId = (prefix: string): string => {
  idSequence += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${idSequence}-${rand}`;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roles, setRoles] = useState<MediaRole[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [programs, setPrograms] = useState<ProgramService[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [verse, setVerse] = useState<VerseOfTheDay>(INITIAL_VERSE);
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>(INITIAL_REMINDER_CONFIG);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('mediaserve_auth') === 'true';
  });

  const [currentAccountId, setCurrentAccountId] = useState<string>(() => {
    return sessionStorage.getItem('mediaserve_account_id') || '';
  });

  const [activePortal, setActivePortal] = useState<PortalType>('team');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  async function loadData() {
    try {
      const [
        { data: rolesData, error: rolesErr },
        { data: membersData, error: memErr },
        { data: accountsData, error: accErr },
        { data: programsData, error: progErr },
        { data: assignmentsData, error: asgErr },
        { data: announcementsData, error: annErr },
        { data: verseData },
        { data: reminderData },
        { data: logsData },
      ] = await Promise.all([
        supabase.from('roles').select('*'),
        supabase.from('members').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('programs').select('*'),
        supabase.from('assignments').select('*'),
        supabase.from('announcements').select('*'),
        supabase.from('verse').select('*').maybeSingle(),
        supabase.from('reminder_config').select('*').maybeSingle(),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50),
      ]);

      if (!rolesErr && rolesData && rolesData.length > 0) setRoles(rolesData);
      else { setRoles(INITIAL_ROLES); await supabase.from('roles').upsert(INITIAL_ROLES); }

      if (!memErr && membersData && membersData.length > 0) setMembers(membersData);
      else { setMembers(INITIAL_MEMBERS); await supabase.from('members').upsert(INITIAL_MEMBERS); }

      if (!accErr && accountsData && accountsData.length > 0) setAccounts(accountsData);
      else { setAccounts(INITIAL_ACCOUNTS); await supabase.from('accounts').upsert(INITIAL_ACCOUNTS); }

      if (progErr) {
        console.error('Could not load programs from Supabase:', progErr.message);
      } else {
        setPrograms(programsData ?? []);
      }

      if (!asgErr && assignmentsData && assignmentsData.length > 0) setAssignments(assignmentsData);
      else { setAssignments(INITIAL_ASSIGNMENTS); await supabase.from('assignments').upsert(INITIAL_ASSIGNMENTS); }

      if (!annErr && announcementsData && announcementsData.length > 0) setAnnouncements(announcementsData);
      else { setAnnouncements(INITIAL_ANNOUNCEMENTS); await supabase.from('announcements').upsert(INITIAL_ANNOUNCEMENTS); }

      if (verseData) setVerse(verseData);
      if (reminderData) setReminderConfig(reminderData);
      if (logsData) setAuditLogs(logsData);
    } catch (err) {
      console.error('Error fetching data from Supabase:', err);
    }
  }

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const currentAccount =
    accounts.find((a) => a.id === currentAccountId) ||
    accounts[0] || {
      id: '',
      email: '',
      memberId: '',
      allowedPortals: ['team'],
      defaultPortal: 'team',
    };

  const currentMember =
    members.find((m) => m.id === currentAccount?.memberId) ||
    members[0] || {
      id: '',
      name: 'Guest Member',
      email: '',
      phone: '',
      primaryRole: '',
      secondaryRoles: [],
      skillLevel: 'Beginner',
      availability: 'Flexible',
      status: 'active',
      joinedDate: new Date().toISOString().split('T')[0],
    };

  const isSuperAdmin = currentAccount?.email?.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
  
  const isPatron =
    currentAccount?.allowedPortals?.includes('patron') ||
    currentAccount?.defaultPortal === 'patron';

  const isLeader =
    isSuperAdmin ||
    isPatron ||
    currentAccount?.allowedPortals?.includes('leadership') ||
    Boolean(currentMember?.isLeader);

  const [whatsAppModalState, setWhatsAppModalState] = useState<WhatsAppNotificationModalState | null>(null);

  const closeWhatsAppModal = () => setWhatsAppModalState(null);

  const openWhatsAppModalForAssignment = (programId: string, roleId: string, memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    const role = roles.find((r) => r.id === roleId);
    const program = programs.find((p) => p.id === programId);
    if (!member || !role || !program) return;

    const targetAsg = assignments.find(
      (a) => a.programId === programId && a.roleId === roleId && a.memberId === memberId
    );

    const { whatsappUrl, message } = buildAssignmentWhatsAppMessage({
      memberName: member.name,
      memberPhone: member.phone,
      roleName: role.name,
      station: role.station,
      programTitle: program.title,
      programDate: program.date,
      callTime: program.callTime,
      startTime: program.startTime,
      endTime: program.endTime,
      assignmentId: targetAsg?.id,
      memberId: member.id,
    });

    setWhatsAppModalState({ member, role, program, whatsappUrl, messageText: message });
  };

  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState<number>(15);
  const [inactivityLoggedOut, setInactivityLoggedOut] = useState<boolean>(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);
  const [inactivitySecondsRemaining, setInactivitySecondsRemaining] = useState<number>(60);
  const lastActivityRef = useRef<number>(Date.now());

  const clearInactivityFlag = () => setInactivityLoggedOut(false);

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
    setInactivitySecondsRemaining(60);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    lastActivityRef.current = Date.now();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => { lastActivityRef.current = Date.now(); };

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    const totalTimeoutMs = inactivityTimeoutMinutes * 60 * 1000;
    const warningThresholdMs = Math.max(30000, totalTimeoutMs - 60 * 1000);

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= totalTimeoutMs) {
        setIsLoggedIn(false);
        sessionStorage.removeItem('mediaserve_auth');
        setInactivityLoggedOut(true);
        setShowInactivityWarning(false);
        showToast('Session Expired: You were automatically signed out due to inactivity.');
      } else if (elapsed >= warningThresholdMs) {
        setShowInactivityWarning(true);
        setInactivitySecondsRemaining(Math.max(1, Math.ceil((totalTimeoutMs - elapsed) / 1000)));
      } else {
        setShowInactivityWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearInterval(intervalId);
    };
  }, [isLoggedIn, inactivityTimeoutMinutes]);

  const parseServiceDateTime = (dateStr: string, timeStr?: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    let hours = 8;
    let minutes = 0;

    if (timeStr) {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        hours = h;
        minutes = m;
      }
    }

    return new Date(year, month - 1, day, hours, minutes);
  };

  const [directConfirmData, setDirectConfirmData] = useState<{
    asg: RoleAssignment;
    prog: ProgramService;
    role: MediaRole;
    member: TeamMember;
  } | null>(null);

  const closeDirectConfirmModal = () => setDirectConfirmData(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const asgId = urlParams.get('asgId');
      const memberId = urlParams.get('memberId');

      if (asgId) {
        const foundAsg = assignments.find((a) => a.id === asgId);
        const targetMemId = memberId || foundAsg?.memberId;
        const foundMem = members.find((m) => m.id === targetMemId);
        const foundProg = programs.find((p) => p.id === foundAsg?.programId);
        const foundRole = roles.find((r) => r.id === foundAsg?.roleId);

        if (foundMem && foundAsg && foundProg && foundRole) {
          setDirectConfirmData({
            asg: foundAsg,
            prog: foundProg,
            role: foundRole,
            member: foundMem,
          });

          showToast(`Welcome ${foundMem.name}! Please confirm your attendance below.`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, [assignments, members, programs, roles]);

  const [automatedReminderModalOpen, setAutomatedReminderModalOpen] = useState(false);
  const [pending24HourDuties, setPending24HourDuties] = useState<Pending24HourDuty[]>([]);

  const calculatePending24HourDuties = (): Pending24HourDuty[] => {
    const now = Date.now();
    const result: Pending24HourDuty[] = [];

    programs.forEach((prog) => {
      const serviceDt = parseServiceDateTime(prog.date, prog.callTime || prog.startTime);
      const diffMs = serviceDt.getTime() - now;
      const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));

      if (hoursRemaining >= -4 && hoursRemaining <= 24) {
        const progAsgs = assignments.filter((a) => a.programId === prog.id && a.memberId && a.status === 'pending');
        progAsgs.forEach((asg) => {
          const mem = members.find((m) => m.id === asg.memberId);
          const role = roles.find((r) => r.id === asg.roleId);
          if (mem && role) {
            result.push({
              assignment: asg,
              program: prog,
              role,
              member: mem,
              hoursRemaining: Math.max(0, hoursRemaining),
            });
          }
        });
      }
    });

    return result;
  };

  const trigger24HourScan = () => {
    const list = calculatePending24HourDuties();
    setPending24HourDuties(list);

    if (list.length > 0) {
      list.forEach(async (item) => {
        if (!item.assignment.remindersSent.includes('24h')) {
          const updatedReminders = [...new Set([...item.assignment.remindersSent, '24h'])];
          await supabase.from('assignments').update({ remindersSent: updatedReminders }).eq('id', item.assignment.id);

          logAction(
            'Automated 24h Task',
            '24-Hour Reminder Alert',
            `Service "${item.program.title}" is within 24 hours. Pending confirmation for ${item.member.name} (${item.role.name}).`,
            'reminder'
          );
        }
      });
      showToast(`24-Hour Reminder Task: Found ${list.length} pending crew members within 24h.`);
    } else {
      showToast('24-Hour Reminder Task: All assigned members within 24h are confirmed!');
    }
  };

  useEffect(() => {
    const runScan = () => setPending24HourDuties(calculatePending24HourDuties());
    runScan();
    const interval = setInterval(runScan, 30000);
    return () => clearInterval(interval);
  }, [programs, assignments, members, roles]);

  const switchAccount = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) {
      setCurrentAccountId(acc.id);
      setIsLoggedIn(true);
      sessionStorage.setItem('mediaserve_auth', 'true');
      sessionStorage.setItem('mediaserve_account_id', acc.id);
      if (!acc.allowedPortals.includes(activePortal)) setActivePortal(acc.defaultPortal);
      const mem = members.find((m) => m.id === acc.memberId);
      showToast(`Logged in as ${mem?.name || acc.email}`);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentAccountId('');
    sessionStorage.removeItem('mediaserve_auth');
    sessionStorage.removeItem('mediaserve_account_id');
    showToast('You have been signed out.');
  };

  const checkEmailStatus = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const acc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    const mem = members.find((m) => m.email.toLowerCase() === cleanEmail);

    if (!acc && !mem) {
      return { status: 'not_found' as const };
    }

    const primaryRole = roles.find((r) => r.id === mem?.primaryRole);

    if (acc && acc.hasSetPassword) {
      return {
        status: 'has_password' as const,
        memberName: mem?.name || acc.email,
        primaryRoleName: primaryRole?.name,
      };
    }

    return {
      status: 'needs_password' as const,
      memberName: mem?.name || acc?.email || cleanEmail,
      primaryRoleName: primaryRole?.name,
    };
  };

  const registerNewMember = async (data: RegisterMemberData): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = data.email.trim().toLowerCase();

    if (!data.name.trim()) return { success: false, message: 'Please provide your full name.' };
    if (!cleanEmail || !cleanEmail.includes('@')) return { success: false, message: 'Please provide a valid email address.' };
    if (!data.phone.trim()) return { success: false, message: 'Please provide your WhatsApp / phone number.' };
    if (!data.password || data.password.length < 6) return { success: false, message: 'Password must be at least 6 characters long.' };

    const existingAcc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existingAcc) return { success: false, message: 'An account with this email already exists.' };

    const newMemberId = generateUniqueId('mem');
    const newAccountId = generateUniqueId('acc');

    const newMember: TeamMember = {
      id: newMemberId,
      name: data.name.trim(),
      email: cleanEmail,
      phone: data.phone.trim(),
      gender: data.gender,
      primaryRole: data.primaryRole,
      secondaryRoles: data.secondaryRoles,
      skillLevel: data.skillLevel,
      rawSkillDescription: data.rawSkillDescription,
      availability: data.availability,
      status: 'active',
      joinedDate: new Date().toISOString().split('T')[0],
      notes: data.notes.trim() || undefined,
    };

    const newAccount: UserAccount = {
      id: newAccountId,
      email: cleanEmail,
      memberId: newMemberId,
      allowedPortals: ['team'],
      defaultPortal: 'team',
      password: data.password,
      hasSetPassword: true,
      passwordSetAt: new Date().toISOString(),
    };

    const { error: memErr } = await supabase.from('members').insert([newMember]);
    if (memErr) {
      console.error('Error inserting member:', memErr.message);
      return { success: false, message: `Database Error: ${memErr.message}` };
    }

    const { error: accErr } = await supabase.from('accounts').insert([newAccount]);
    if (accErr) {
      console.error('Error inserting account:', accErr.message);
      return { success: false, message: `Account Creation Error: ${accErr.message}` };
    }

    setMembers((prev) => [...prev, newMember]);
    setAccounts((prev) => [...prev, newAccount]);

    setCurrentAccountId(newAccountId);
    setActivePortal('team');
    setIsLoggedIn(true);
    sessionStorage.setItem('mediaserve_auth', 'true');
    sessionStorage.setItem('mediaserve_account_id', newAccountId);

    await logAction(data.name, 'New Team Member Registration', `Registered via onboarding form as ${roles.find((r) => r.id === data.primaryRole)?.name || 'Media Member'}.`, 'system');
    showToast(`Welcome to AKWC Media, ${data.name}! Your account is active.`);
    return { success: true, message: `Account created successfully! Welcome to the team.` };
  };

  const switchPortal = (portal: PortalType) => {
    if (portal === 'admin' && !isSuperAdmin) {
      showToast('Access Denied: Only the Super Admin (bernardoobuobi@gmail.com) can access the Admin Portal.');
      return;
    }

    const userHasLeadership = isSuperAdmin || isPatron || currentAccount.allowedPortals.includes('leadership') || Boolean(currentMember?.isLeader);

    if (portal === 'leadership' && !userHasLeadership) {
      showToast('Access Denied: You do not have Leadership privileges.');
      return;
    }

    setActivePortal(portal);
  };

  const updateAccountPrivileges = async (
    targetAccountId: string,
    newAllowedPortals: PortalType[],
    defaultPortal?: PortalType
  ): Promise<{ success: boolean; message: string }> => {
    if (!isSuperAdmin) {
      const msg = 'Security violation: Only the Super Admin (bernardoobuobi@gmail.com) is authorized to assign admin or leader privileges.';
      showToast(msg);
      return { success: false, message: msg };
    }

    const targetAcc = accounts.find((a) => a.id === targetAccountId);
    if (!targetAcc) return { success: false, message: 'Account not found.' };

    const sanitizedPortals: PortalType[] = newAllowedPortals.filter((p) => {
      if (p === 'admin') return targetAcc.email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
      return true;
    });

    if (!sanitizedPortals.includes('team')) sanitizedPortals.push('team');
    const isGrantedLeadership = sanitizedPortals.includes('leadership');
    const def = defaultPortal || (isGrantedLeadership ? 'leadership' : 'team');

    await supabase.from('accounts').update({ allowedPortals: sanitizedPortals, defaultPortal: def }).eq('id', targetAccountId);
    await supabase.from('members').update({ isLeader: isGrantedLeadership }).eq('id', targetAcc.memberId);

    setAccounts((prev) => prev.map((a) => (a.id === targetAccountId ? { ...a, allowedPortals: sanitizedPortals, defaultPortal: def } : a)));

    const mem = members.find((m) => m.id === targetAcc.memberId);
    await logAction(currentMember.name, 'Updated Team Member Privileges', `Super Admin updated permissions for ${mem?.name || targetAcc.email}. Leader status: ${isGrantedLeadership ? 'Granted' : 'Revoked'}.`, 'system');

    showToast(`Updated privileges for ${mem?.name || targetAcc.email}`);
    return { success: true, message: 'Privileges updated successfully.' };
  };

  const toggleMemberLeadership = async (memberId: string, forceStatus?: boolean): Promise<{ success: boolean; message: string }> => {
    const mem = members.find((m) => m.id === memberId);
    if (!mem) return { success: false, message: 'Member not found.' };

    const newIsLeader = forceStatus !== undefined ? forceStatus : !Boolean(mem.isLeader);

    await supabase.from('members').update({ isLeader: newIsLeader }).eq('id', memberId);
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, isLeader: newIsLeader } : m)));

    const targetAcc = accounts.find((a) => a.memberId === memberId);
    if (targetAcc) {
      const currentAllowed = targetAcc.allowedPortals || ['team'];
      const newAllowed = newIsLeader ? Array.from(new Set([...currentAllowed, 'leadership', 'team'])) : currentAllowed.filter((p) => p !== 'leadership');

      await supabase.from('accounts').update({ allowedPortals: newAllowed, defaultPortal: newIsLeader ? 'leadership' : 'team' }).eq('id', targetAcc.id);
      setAccounts((prev) => prev.map((a) => (a.id === targetAcc.id ? { ...a, allowedPortals: newAllowed, defaultPortal: newIsLeader ? 'leadership' : 'team' } : a)));
    }

    const msg = newIsLeader ? `${mem.name} is now a Media Leader!` : `Revoked leadership privileges for ${mem.name}.`;
    showToast(msg);
    return { success: true, message: msg };
  };

  const setupFirstTimePassword = async (email: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    
    let acc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    let mem = members.find((m) => m.email.toLowerCase() === cleanEmail);

    if (!acc && mem) {
      acc = accounts.find((a) => a.memberId === mem.id);
    }

    if (!acc && mem) {
      const newAccountId = generateUniqueId('acc');
      acc = {
        id: newAccountId,
        email: cleanEmail,
        memberId: mem.id,
        allowedPortals: ['team'],
        defaultPortal: 'team',
        password: newPassword,
        hasSetPassword: true,
        passwordSetAt: new Date().toISOString(),
      };
      await supabase.from('accounts').insert([acc]);
      setAccounts((prev) => [...prev, acc!]);
    } else if (acc) {
      const { error } = await supabase.from('accounts').update({ password: newPassword, hasSetPassword: true, passwordSetAt: new Date().toISOString() }).eq('id', acc.id);
      if (error) return { success: false, message: error.message };
      setAccounts((prev) => prev.map((a) => (a.id === acc!.id ? { ...a, password: newPassword, hasSetPassword: true } : a)));
    } else {
      return { success: false, message: 'Email not found on media team roster.' };
    }

    setCurrentAccountId(acc.id);
    setIsLoggedIn(true);
    sessionStorage.setItem('mediaserve_auth', 'true');
    sessionStorage.setItem('mediaserve_account_id', acc.id);

    showToast(`Welcome ${mem?.name || cleanEmail}! Account activated.`);
    return { success: true, message: 'Account activated successfully!' };
  };

  const loginWithPassword = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const acc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!acc) return { success: false, message: 'No account found with this email.' };
    if (!acc.hasSetPassword) return { success: false, requiresSetup: true, message: 'Please set your password first.' };
    if (acc.password !== password) return { success: false, message: 'Incorrect password.' };

    setCurrentAccountId(acc.id);
    setIsLoggedIn(true);
    sessionStorage.setItem('mediaserve_auth', 'true');
    sessionStorage.setItem('mediaserve_account_id', acc.id);

    const mem = members.find((m) => m.id === acc.memberId);
    showToast(`Welcome back, ${mem?.name || acc.email}!`);
    return { success: true, message: `Welcome back, ${mem?.name || acc.email}!` };
  };

  const changePassword = async (newPassword: string) => {
    await supabase.from('accounts').update({ password: newPassword, hasSetPassword: true, passwordSetAt: new Date().toISOString() }).eq('id', currentAccount.id);
    setAccounts((prev) => prev.map((a) => (a.id === currentAccount.id ? { ...a, password: newPassword, hasSetPassword: true } : a)));
    showToast('Your password was updated.');
    return { success: true, message: 'Password updated successfully.' };
  };

  const resetPasswordForMember = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    await supabase.from('accounts').update({ password: null, hasSetPassword: false, passwordSetAt: null }).eq('email', cleanEmail);
    setAccounts((prev) => prev.map((a) => (a.email.toLowerCase() === cleanEmail ? { ...a, password: undefined, hasSetPassword: false } : a)));
    showToast(`Password reset for ${cleanEmail}.`);
  };

  const logAction = async (actor: string, action: string, details: string, type: AuditLog['type']) => {
    const newLog: AuditLog = {
      id: generateUniqueId('log'),
      timestamp: new Date().toISOString(),
      actorName: actor,
      action,
      details,
      type,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 49)]);
    await supabase.from('audit_logs').insert([newLog]);
  };

  const confirmAttendance = async (assignmentId: string, arrivalComment?: string, estimatedArrivalTime?: string) => {
    await supabase.from('assignments').update({ status: 'confirmed', confirmedAt: new Date().toISOString(), arrivalComment: arrivalComment?.trim() || null, estimatedArrivalTime: estimatedArrivalTime?.trim() || null, declineReason: null }).eq('id', assignmentId);
    setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? { ...a, status: 'confirmed', confirmedAt: new Date().toISOString(), arrivalComment: arrivalComment?.trim() || undefined, estimatedArrivalTime: estimatedArrivalTime?.trim() || undefined } : a)));
    showToast('Attendance confirmed!');
  };

  const declineAttendance = async (assignmentId: string, reason: string) => {
    await supabase.from('assignments').update({ status: 'declined', declineReason: reason || 'Not specified' }).eq('id', assignmentId);
    setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? { ...a, status: 'declined', declineReason: reason || 'Not specified' } : a)));
    showToast('Declined. Leadership notified.');
  };

  const assignMemberToRole = async (programId: string, roleId: string, memberId: string) => {
    const existing = assignments.find((a) => a.programId === programId && a.roleId === roleId);

    if (existing) {
      await supabase.from('assignments').update({ memberId, status: 'pending', declineReason: null, confirmedAt: null }).eq('id', existing.id);
      setAssignments((prev) => prev.map((a) => (a.id === existing.id ? { ...a, memberId, status: 'pending' } : a)));
    } else {
      const newAsg: RoleAssignment = { id: generateUniqueId('asg'), programId, roleId, memberId, status: 'pending', remindersSent: [] };
      await supabase.from('assignments').insert([newAsg]);
      setAssignments((prev) => [...prev, newAsg]);
    }
    showToast('Member assigned.');
  };

  const autoFillRoster = async (programId: string) => {
    const unassignedRoles = roles.filter((r) => !assignments.some((a) => a.programId === programId && a.roleId === r.id && a.memberId));
    const assignedMemberIds = new Set(assignments.filter((a) => a.programId === programId && a.memberId).map((a) => a.memberId as string));
    const newAssignments: RoleAssignment[] = [];

    for (const role of unassignedRoles) {
      const candidates = members.filter((m) => m.status === 'active' && !assignedMemberIds.has(m.id) && (m.primaryRole === role.id || m.secondaryRoles?.includes(role.id)));
      if (candidates.length > 0) {
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        assignedMemberIds.add(selected.id);
        newAssignments.push({
          id: generateUniqueId('asg'),
          programId,
          roleId: role.id,
          memberId: selected.id,
          status: 'pending',
          remindersSent: [],
        });
      }
    }

    if (newAssignments.length > 0) {
      await supabase.from('assignments').insert(newAssignments);
      setAssignments((prev) => [...prev, ...newAssignments]);
      showToast(`Auto-filled ${newAssignments.length} positions!`);
    } else {
      showToast('No available matching candidates for open roles.');
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    await supabase.from('assignments').delete().eq('id', assignmentId);
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    showToast('Assignment removed.');
  };

  const replaceAssignment = async (assignmentId: string, newMemberId: string) => {
    await supabase.from('assignments').update({ memberId: newMemberId, status: 'pending', declineReason: null, confirmedAt: null }).eq('id', assignmentId);
    setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? { ...a, memberId: newMemberId, status: 'pending', declineReason: undefined } : a)));
    showToast('Replacement candidate assigned!');
  };

  const triggerManualReminder = async (programId: string) => {
    showToast(`Dispatched reminders for service.`);
  };

  const createProgram = async (newProg: Omit<ProgramService, 'id'>): Promise<string> => {
    const id = generateUniqueId('prog');
    const program: ProgramService = { ...newProg, id };
    const { error } = await supabase.from('programs').insert([program]);
    
    if (error) {
      console.error('Error saving program:', error.message);
      showToast(`Database Error: ${error.message}`);
      return '';
    }
    
    setPrograms((prev) => [program, ...prev]);
    showToast('Service created successfully!');
    return id;
  };

  const updateProgram = async (updatedProg: ProgramService) => {
    const { error } = await supabase.from('programs').update(updatedProg).eq('id', updatedProg.id);
    if (error) {
      showToast(`Database Error: ${error.message}`);
      return;
    }
    setPrograms((prev) => prev.map((p) => (p.id === updatedProg.id ? updatedProg : p)));
    showToast('Service updated.');
  };

  const deleteProgram = async (programId: string) => {
    const { error } = await supabase.from('programs').delete().eq('id', programId);
    if (error) {
      showToast(`Database Error: ${error.message}`);
      return;
    }
    await supabase.from('assignments').delete().eq('programId', programId);
    setPrograms((prev) => prev.filter((p) => p.id !== programId));
    setAssignments((prev) => prev.filter((a) => a.programId !== programId));
    showToast('Service deleted.');
  };

  const addMember = async (member: Omit<TeamMember, 'id'>): Promise<string> => {
    const id = generateUniqueId('mem');
    const newMember: TeamMember = { ...member, id };
    const { error } = await supabase.from('members').insert([newMember]);
    if (error) {
      showToast(`Database Error: ${error.message}`);
      return '';
    }
    setMembers((prev) => [...prev, newMember]);
    showToast(`Added ${newMember.name} to roster.`);
    return id;
  };

  const updateMember = async (member: TeamMember) => {
    const { error } = await supabase.from('members').update(member).eq('id', member.id);
    if (error) {
      showToast(`Database Error: ${error.message}`);
      return;
    }
    setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)));
    showToast('Member details updated.');
  };

  const deleteMember = async (memberId: string) => {
    if (!isSuperAdmin) {
      showToast('Permission Denied: Only the Super Admin (bernardoobuobi@gmail.com) can delete team members.');
      return;
    }
    const { error } = await supabase.from('members').delete().eq('id', memberId);
    if (error) {
      showToast(`Database Error: ${error.message}`);
      return;
    }
    await supabase.from('accounts').delete().eq('memberId', memberId);

    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setAccounts((prev) => prev.filter((a) => a.memberId !== memberId));
    showToast('Member deleted.');
  };

  const addAnnouncement = async (announcement: Omit<Announcement, 'id'>) => {
    const id = generateUniqueId('ann');
    const newAnn: Announcement = { ...announcement, id };
    const { error } = await supabase.from('announcements').insert([newAnn]);
    if (error) {
      showToast(`Database Error: ${error.message}`);
      return;
    }
    setAnnouncements((prev) => [newAnn, ...prev]);
    showToast('Announcement posted!');
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) {
      showToast(`Database Error: ${error.message}`);
      return;
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    showToast('Announcement removed.');
  };

  const updateVerse = async (newVerse: VerseOfTheDay) => {
    const { error } = await supabase.from('verse').upsert([newVerse]);
    if (error) {
      showToast(`Database Error: ${error.message}`);
      return;
    }
    setVerse(newVerse);
    showToast('Verse updated.');
  };

  const updateReminderConfig = async (config: ReminderConfig) => {
    const { error } = await supabase.from('reminder_config').upsert([config]);
    if (error) {
      showToast(`Database Error: ${error.message}`);
      return;
    }
    setReminderConfig(config);
    showToast('Reminder settings updated.');
  };

  const resetToDefaults = async () => {
    showToast('Data reset triggered.');
  };

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        isSuperAdmin,
        isLeader,
        isPatron,
        currentAccount,
        currentMember,
        activePortal,
        availableAccounts: accounts,
        switchAccount,
        switchPortal,
        logout,
        updateAccountPrivileges,
        toggleMemberLeadership,
        checkEmailStatus,
        registerNewMember,
        setupFirstTimePassword,
        loginWithPassword,
        changePassword,
        resetPasswordForMember,
        whatsAppModalState,
        closeWhatsAppModal,
        openWhatsAppModalForAssignment,
        roles,
        members,
        programs,
        assignments,
        announcements,
        verse,
        reminderConfig,
        auditLogs,
        confirmAttendance,
        declineAttendance,
        assignMemberToRole,
        autoFillRoster,
        removeAssignment,
        replaceAssignment,
        triggerManualReminder,
        inactivityLoggedOut,
        clearInactivityFlag,
        inactivityTimeoutMinutes,
        setInactivityTimeoutMinutes,
        resetInactivityTimer,
        showInactivityWarning,
        inactivitySecondsRemaining,
        pending24HourDuties,
        automatedReminderModalOpen,
        setAutomatedReminderModalOpen,
        trigger24HourScan,
        directConfirmData,
        closeDirectConfirmModal,
        createProgram,
        updateProgram,
        deleteProgram,
        addMember,
        updateMember,
        deleteMember,
        addAnnouncement,
        deleteAnnouncement,
        updateVerse,
        updateReminderConfig,
        resetToDefaults,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
