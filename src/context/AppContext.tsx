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
  INITIAL_AUDIT_LOGS,
} from '../data/mockData';
import {
  buildAssignmentWhatsAppMessage,
  buildNewMemberWhatsAppMessage,
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

  // Fetch & Seed Data Helper
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

      if (!rolesErr && rolesData && rolesData.length > 0) {
        setRoles(rolesData);
      } else {
        setRoles(INITIAL_ROLES);
        await supabase.from('roles').upsert(INITIAL_ROLES);
      }

      if (!memErr && membersData && membersData.length > 0) {
        setMembers(membersData);
      } else {
        setMembers(INITIAL_MEMBERS);
        await supabase.from('members').upsert(INITIAL_MEMBERS);
      }

      if (!accErr && accountsData && accountsData.length > 0) {
        setAccounts(accountsData);
      } else {
        setAccounts(INITIAL_ACCOUNTS);
        await supabase.from('accounts').upsert(INITIAL_ACCOUNTS);
      }

      if (!progErr && programsData && programsData.length > 0) {
        setPrograms(programsData);
      } else {
        setPrograms(INITIAL_PROGRAMS);
        await supabase.from('programs').upsert(INITIAL_PROGRAMS);
      }

      if (!asgErr && assignmentsData && assignmentsData.length > 0) {
        setAssignments(assignmentsData);
      } else {
        setAssignments(INITIAL_ASSIGNMENTS);
        await supabase.from('assignments').upsert(INITIAL_ASSIGNMENTS);
      }

      if (!annErr && announcementsData && announcementsData.length > 0) {
        setAnnouncements(announcementsData);
      } else {
        setAnnouncements(INITIAL_ANNOUNCEMENTS);
        await supabase.from('announcements').upsert(INITIAL_ANNOUNCEMENTS);
      }

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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime database sync active.');
        }
      });

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
      availability: [],
      status: 'active',
      joinedDate: new Date().toISOString().split('T')[0],
    };

  const isSuperAdmin = currentAccount?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isLeader =
    isSuperAdmin ||
    currentAccount?.allowedPortals?.includes('leadership') ||
    Boolean(currentMember?.isLeader);

  const [whatsAppModalState, setWhatsAppModalState] = useState<WhatsAppNotificationModalState | null>(null);

  const closeWhatsAppModal = () => {
    setWhatsAppModalState(null);
  };

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

    setWhatsAppModalState({
      member,
      role,
      program,
      whatsappUrl,
      messageText: message,
    });
  };

  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState<number>(15);
  const [inactivityLoggedOut, setInactivityLoggedOut] = useState<boolean>(false);
  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);
  const [inactivitySecondsRemaining, setInactivitySecondsRemaining] = useState<number>(60);
  const lastActivityRef = useRef<number>(Date.now());

  const clearInactivityFlag = () => {
    setInactivityLoggedOut(false);
  };

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
    setInactivitySecondsRemaining(60);
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    lastActivityRef.current = Date.now();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

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
        const remaining = Math.max(1, Math.ceil((totalTimeoutMs - elapsed) / 1000));
        setInactivitySecondsRemaining(remaining);
      } else {
        setShowInactivityWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
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

  const closeDirectConfirmModal = () => {
    setDirectConfirmData(null);
  };

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
        const targetAcc = accounts.find((a) => a.memberId === targetMemId);

        if (targetAcc && foundMem && foundAsg && foundProg && foundRole) {
          setCurrentAccountId(targetAcc.id);
          setIsLoggedIn(true);
          sessionStorage.setItem('mediaserve_auth', 'true');
          setActivePortal('team');

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
  }, [assignments, members, programs, roles, accounts]);

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
        const progAsgs = assignments.filter(
          (a) => a.programId === prog.id && a.memberId && a.status === 'pending'
        );
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
          await supabase
            .from('assignments')
            .update({ remindersSent: updatedReminders })
            .eq('id', item.assignment.id);

          logAction(
            'Automated 24h Task',
            '24-Hour Reminder Alert',
            `Service "${item.program.title}" is within 24 hours. Pending confirmation for ${item.member.name} (${item.role.name}). WhatsApp direct link prepared.`,
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
    const runScan = () => {
      const list = calculatePending24HourDuties();
      setPending24HourDuties(list);
    };

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
      if (!acc.allowedPortals.includes(activePortal)) {
        setActivePortal(acc.defaultPortal);
      }
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
    if (!acc) {
      return { status: 'not_found' as const };
    }
    const mem = members.find((m) => m.id === acc.memberId);
    const primaryRole = roles.find((r) => r.id === mem?.primaryRole);
    if (!acc.hasSetPassword) {
      return {
        status: 'needs_password' as const,
        memberName: mem?.name || acc.email,
        primaryRoleName: primaryRole?.name,
      };
    }
    return {
      status: 'has_password' as const,
      memberName: mem?.name || acc.email,
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
    if (memErr) console.error('Error inserting member to Supabase:', memErr);

    const { error: accErr } = await supabase.from('accounts').insert([newAccount]);
    if (accErr) console.error('Error inserting account to Supabase:', accErr);

    setMembers((prev) => [...prev, newMember]);
    setAccounts((prev) => [...prev, newAccount]);

    setCurrentAccountId(newAccountId);
    setActivePortal('team');
    setIsLoggedIn(true);
    sessionStorage.setItem('mediaserve_auth', 'true');
    sessionStorage.setItem('mediaserve_account_id', newAccountId);

    await logAction(data.name, 'New Team Member Registration', `Registered via onboarding form as ${roles.find((r) => r.id === data.primaryRole)?.name || 'Media Member'}.`, 'system');
    showToast(`Welcome to AKWC Media, ${data.
