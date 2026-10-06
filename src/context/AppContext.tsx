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
import { buildAssignmentWhatsAppMessage } from '../utils/whatsapp';

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
    return sessionStorage.getItem('mediaserve_account_id') || 'acc-ebenezer';
  });

  const [activePortal, setActivePortal] = useState<PortalType>('team');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Load Initial Data from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const [
          { data: rolesData },
          { data: membersData },
          { data: accountsData },
          { data: programsData },
          { data: assignmentsData },
          { data: announcementsData },
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
          supabase.from('verse').select('*').single(),
          supabase.from('reminder_config').select('*').single(),
          supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50),
        ]);

        if (rolesData && rolesData.length > 0) setRoles(rolesData);
        else setRoles(INITIAL_ROLES);

        if (membersData && membersData.length > 0) setMembers(membersData);
        else setMembers(INITIAL_MEMBERS);

        if (accountsData && accountsData.length > 0) setAccounts(accountsData);
        else setAccounts(INITIAL_ACCOUNTS);

        if (programsData && programsData.length > 0) setPrograms(programsData);
        else setPrograms(INITIAL_PROGRAMS);

        if (assignmentsData && assignmentsData.length > 0) setAssignments(assignmentsData);
        else setAssignments(INITIAL_ASSIGNMENTS);

        if (announcementsData && announcementsData.length > 0) setAnnouncements(announcementsData);
        else setAnnouncements(INITIAL_ANNOUNCEMENTS);

        if (verseData) setVerse(verseData);
        if (reminderData) setReminderConfig(reminderData);
        if (logsData) setAuditLogs(logsData);
      } catch (err) {
        console.error('Error fetching data from Supabase:', err);
      }
    }

    loadData();

    // Enable Realtime Subscriptions
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

  const currentAccount = accounts.find((a) => a.id === currentAccountId) || accounts[0] || {
    id: 'acc-ebenezer',
    email: 'ebenezer@akwc.org',
    memberId: 'mem-ebenezer',
    allowedPortals: ['team'],
    defaultPortal: 'team',
  };

  const currentMember =
    members.find((m) => m.id === currentAccount?.memberId) ||
    members.find((m) => m.id === 'mem-ebenezer') ||
    members[0] || {
      id: 'mem-ebenezer',
      name: 'Ebenezer Addo',
      email: 'ebenezer@akwc.org',
      phone: '233200000000',
      primaryRole: 'role-livestream',
      secondaryRoles: [],
      skillLevel: 'Advanced',
      availability: [],
      status: 'active',
      joinedDate: '2024-01-01',
    };

  const isSuperAdmin = currentAccount?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const isLeader =
    isSuperAdmin ||
    currentAccount?.allowedPortals?.includes('leadership') ||
    Boolean(currentMember?.isLeader);

  // WhatsApp Modal state
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

  // Inactivity timeout configuration
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
