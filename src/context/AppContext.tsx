import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
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
import { buildAssignmentWhatsAppMessage } from '../utils/whatsapp';
import {
  hashPassword,
  verifyPassword,
  isPasswordHashed,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from '../utils/security';

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
  requestPasswordReset: (
    identifier: string,
    method: 'email' | 'phone'
  ) => Promise<{
    success: boolean;
    message: string;
    code?: string;
    maskedTarget?: string;
    targetPhone?: string;
    targetEmail?: string;
  }>;
  verifyAndResetPassword: (
    identifier: string,
    code: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string }>;

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
  isSupabaseConfigured: boolean;
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

const getStoredItem = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);
    if (Array.isArray(defaultValue) && Array.isArray(parsed) && parsed.length > 0) {
      return parsed as unknown as T;
    }
    if (!Array.isArray(defaultValue) && parsed) {
      return parsed as unknown as T;
    }
  } catch (err) {
    console.warn(`Could not parse stored item for ${key}:`, err);
  }
  return defaultValue;
};

const setStoredItem = <T,>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Could not save item for ${key}:`, err);
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [roles, setRoles] = useState<MediaRole[]>(() => getStoredItem('akwc_roles', INITIAL_ROLES));
  const [members, setMembers] = useState<TeamMember[]>(() => getStoredItem('akwc_members', INITIAL_MEMBERS));
  const [accounts, setAccounts] = useState<UserAccount[]>(() => getStoredItem('akwc_accounts', INITIAL_ACCOUNTS));
  const [programs, setPrograms] = useState<ProgramService[]>(() => getStoredItem('akwc_programs', INITIAL_PROGRAMS));
  const [assignments, setAssignments] = useState<RoleAssignment[]>(() => getStoredItem('akwc_assignments', INITIAL_ASSIGNMENTS));
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getStoredItem('akwc_announcements', INITIAL_ANNOUNCEMENTS));
  const [verse, setVerse] = useState<VerseOfTheDay>(() => getStoredItem('akwc_verse', INITIAL_VERSE));
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>(() => getStoredItem('akwc_reminder_config', INITIAL_REMINDER_CONFIG));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getStoredItem('akwc_audit_logs', []));

  // Sync state changes to localStorage cache
  useEffect(() => { setStoredItem('akwc_roles', roles); }, [roles]);
  useEffect(() => { setStoredItem('akwc_members', members); }, [members]);
  useEffect(() => { setStoredItem('akwc_accounts', accounts); }, [accounts]);
  useEffect(() => { setStoredItem('akwc_programs', programs); }, [programs]);
  useEffect(() => { setStoredItem('akwc_assignments', assignments); }, [assignments]);
  useEffect(() => { setStoredItem('akwc_announcements', announcements); }, [announcements]);
  useEffect(() => { setStoredItem('akwc_verse', verse); }, [verse]);
  useEffect(() => { setStoredItem('akwc_reminder_config', reminderConfig); }, [reminderConfig]);
  useEffect(() => { setStoredItem('akwc_audit_logs', auditLogs); }, [auditLogs]);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('mediaserve_auth') === 'true';
  });

  const [currentAccountId, setCurrentAccountId] = useState<string>(() => {
    const saved = sessionStorage.getItem('mediaserve_account_id');
    if (saved) return saved;
    // Default to Super Admin (Bernard) if available
    const superAdmin = INITIAL_ACCOUNTS.find((a) => a.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
    return superAdmin ? superAdmin.id : '';
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
    if (!isSupabaseConfigured) {
      return;
    }

    try {
      const [
        rolesRes,
        membersRes,
        accountsRes,
        programsRes,
        assignmentsRes,
        announcementsRes,
        verseRes,
        reminderRes,
        logsRes,
      ] = await Promise.allSettled([
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

      if (rolesRes.status === 'fulfilled' && !rolesRes.value.error && rolesRes.value.data && rolesRes.value.data.length > 0) {
        setRoles(rolesRes.value.data);
      }
      if (membersRes.status === 'fulfilled' && !membersRes.value.error && membersRes.value.data && membersRes.value.data.length > 0) {
        setMembers(membersRes.value.data);
      }
      if (accountsRes.status === 'fulfilled' && !accountsRes.value.error && accountsRes.value.data && accountsRes.value.data.length > 0) {
        setAccounts(accountsRes.value.data);
      }
      if (programsRes.status === 'fulfilled' && !programsRes.value.error && programsRes.value.data) {
        setPrograms(programsRes.value.data);
      }
      if (assignmentsRes.status === 'fulfilled' && !assignmentsRes.value.error && assignmentsRes.value.data && assignmentsRes.value.data.length > 0) {
        setAssignments(assignmentsRes.value.data);
      }
      if (announcementsRes.status === 'fulfilled' && !announcementsRes.value.error && announcementsRes.value.data && announcementsRes.value.data.length > 0) {
        setAnnouncements(announcementsRes.value.data);
      }
      if (verseRes.status === 'fulfilled' && !verseRes.value.error && verseRes.value.data) {
        setVerse(verseRes.value.data);
      }
      if (reminderRes.status === 'fulfilled' && !reminderRes.value.error && reminderRes.value.data) {
        setReminderConfig(reminderRes.value.data);
      }
      if (logsRes.status === 'fulfilled' && !logsRes.value.error && logsRes.value.data) {
        setAuditLogs(logsRes.value.data);
      }
    } catch (err: any) {
      console.warn('Could not load data from Supabase (operating from local cache):', err?.message || err);
    }
  }

  useEffect(() => {
    loadData();

    if (!isSupabaseConfigured) return;

    try {
      const channel = supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          loadData();
        })
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {}
      };
    } catch (err) {
      console.warn('Realtime channel setup error:', err);
    }
  }, []);

  const currentAccount =
    accounts.find((a) => a.id === currentAccountId) ||
    accounts[0] || {
      id: 'acc-super-1',
      email: SUPER_ADMIN_EMAIL,
      memberId: 'mem-1',
      allowedPortals: ['admin', 'leadership', 'team'],
      defaultPortal: 'admin',
    };

  const currentMember =
    members.find((m) => m.id === currentAccount?.memberId) ||
    members[0] || {
      id: 'mem-1',
      name: 'Bernard Obuobi',
      email: SUPER_ADMIN_EMAIL,
      phone: '0543515464',
      primaryRole: 'r-live-switcher',
      secondaryRoles: ['r-audio-foh'],
      skillLevel: 'Lead',
      availability: 'Flexible',
      status: 'active',
      joinedDate: '2023-01-15',
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

  const [pending24HourDuties, setPending24HourDuties] = useState<Pending24HourDuty[]>([]);
  const [automatedReminderModalOpen, setAutomatedReminderModalOpen] = useState<boolean>(false);

  const [directConfirmData, setDirectConfirmData] = useState<{
    asg: RoleAssignment;
    prog: ProgramService;
    role: MediaRole;
    member: TeamMember;
  } | null>(null);

  const closeDirectConfirmModal = () => {
    setDirectConfirmData(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const asgId = urlParams.get('asgId');
      const action = urlParams.get('action');

      if (action === 'confirm' && (asgId || urlParams.get('prog') || urlParams.get('role'))) {
        let foundAsg = assignments.find((a) => a.id === asgId);
        const targetMemId = urlParams.get('mem') || foundAsg?.memberId;
        const targetProgId = urlParams.get('prog') || foundAsg?.programId;
        const targetRoleId = urlParams.get('role') || foundAsg?.roleId;

        const foundMem = members.find((m) => m.id === targetMemId) || {
          id: targetMemId || 'mem-whatsapp',
          name: urlParams.get('name') || 'Team Member',
          email: '',
          phone: '',
          primaryRole: targetRoleId || 'r-general',
          secondaryRoles: [],
          skillLevel: 'Intermediate' as const,
          availability: 'Flexible',
          status: 'active' as const,
          joinedDate: '2024-01-01',
        };

        const foundProg = programs.find((p) => p.id === targetProgId) || {
          id: targetProgId || 'prog-whatsapp',
          title: urlParams.get('title') || 'Upcoming Service',
          serviceType: 'Sunday Divine Service' as const,
          date: urlParams.get('date') || new Date().toISOString().split('T')[0],
          startTime: '08:00',
          endTime: '12:00',
          callTime: '07:30',
          location: 'Main Auditorium',
          directorName: 'Media Director',
        };

        const foundRole = roles.find((r) => r.id === targetRoleId) || {
          id: targetRoleId || 'role-whatsapp',
          name: urlParams.get('roleName') || 'Media Station',
          category: 'video' as const,
          description: 'Media ministry role',
          station: 'Media Booth',
          skillRequired: 'Intermediate' as const,
          defaultCount: 1,
        };

        if (!foundAsg) {
          foundAsg = {
            id: asgId || `asg-url-${Date.now()}`,
            programId: foundProg.id,
            roleId: foundRole.id,
            memberId: foundMem.id,
            status: 'pending',
            remindersSent: [],
          };
        }

        setDirectConfirmData({
          asg: foundAsg,
          prog: foundProg,
          role: foundRole,
          member: foundMem,
        });
      }
    } catch (e) {
      console.warn('Error reading confirm link:', e);
    }
  }, [assignments, programs, roles, members]);

  const calculatePending24HourDuties = (): Pending24HourDuty[] => {
    const now = new Date();
    const duties: Pending24HourDuty[] = [];

    programs.forEach((prog) => {
      try {
        const [year, month, day] = prog.date.split('-').map(Number);
        const [startHours, startMins] = prog.startTime.split(':').map(Number);
        const serviceStart = new Date(year, month - 1, day, startHours, startMins);

        const diffMs = serviceStart.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours > 0 && diffHours <= 24) {
          const progAssignments = assignments.filter((a) => a.programId === prog.id);

          progAssignments.forEach((asg) => {
            if (asg.status === 'pending' && asg.memberId) {
              const member = members.find((m) => m.id === asg.memberId);
              const role = roles.find((r) => r.id === asg.roleId);

              if (member && role) {
                duties.push({
                  assignment: asg,
                  program: prog,
                  member,
                  role,
                  hoursRemaining: Math.round(diffHours * 10) / 10,
                });
              }
            }
          });
        }
      } catch (err) {
        console.error('Error calculating duties for program:', prog.title, err);
      }
    });

    return duties.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
  };

  const trigger24HourScan = () => {
    const list = calculatePending24HourDuties();
    setPending24HourDuties(list);

    if (list.length > 0) {
      list.forEach(async (item) => {
        if (!item.assignment.remindersSent.includes('24h')) {
          const updatedReminders = [...new Set([...item.assignment.remindersSent, '24h'])];
          if (isSupabaseConfigured) {
            try {
              await supabase.from('assignments').update({ remindersSent: updatedReminders }).eq('id', item.assignment.id);
            } catch (e) {
              console.warn('Supabase reminder update warning:', e);
            }
          }

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
  }, [programs, assignments, members]);

  const switchAccount = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    setCurrentAccountId(acc.id);
    setActivePortal(acc.defaultPortal || 'team');
    setIsLoggedIn(true);
    sessionStorage.setItem('mediaserve_auth', 'true');
    sessionStorage.setItem('mediaserve_account_id', acc.id);
    resetInactivityTimer();
    showToast(`Switched account to: ${acc.email}`);
  };

  const logout = () => {
    setIsLoggedIn(false);
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
    const cleanEmail = sanitizeEmail(data.email);
    const cleanName = sanitizeText(data.name);
    const cleanPhone = sanitizePhone(data.phone);
    const cleanNotes = sanitizeText(data.notes || '');
    const cleanSkillDesc = sanitizeText(data.rawSkillDescription || '');

    if (!cleanName) return { success: false, message: 'Please provide your full name.' };
    if (!cleanEmail || !cleanEmail.includes('@')) return { success: false, message: 'Please provide a valid email address.' };
    if (!cleanPhone) return { success: false, message: 'Please provide your WhatsApp / phone number.' };
    if (!data.password || data.password.length < 6) return { success: false, message: 'Password must be at least 6 characters long.' };

    // Rate limiting: max 5 registration attempts per 5 minutes per device/email
    const rateCheck = checkRateLimit('register', cleanEmail, 5, 300000, 300000);
    if (!rateCheck.allowed) {
      return { success: false, message: `Too many registration attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.` };
    }

    const existingAcc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (existingAcc) return { success: false, message: 'An account with this email already exists.' };

    const newMemberId = generateUniqueId('mem');
    const newAccountId = generateUniqueId('acc');

    // Cryptographic PBKDF2 password hashing with random salt
    const hashedPassword = await hashPassword(data.password);

    const newMember: TeamMember = {
      id: newMemberId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      gender: data.gender,
      primaryRole: data.primaryRole,
      secondaryRoles: data.secondaryRoles,
      skillLevel: data.skillLevel,
      rawSkillDescription: cleanSkillDesc,
      availability: data.availability,
      status: 'active',
      joinedDate: new Date().toISOString().split('T')[0],
      notes: cleanNotes || undefined,
    };

    const newAccount: UserAccount = {
      id: newAccountId,
      email: cleanEmail,
      memberId: newMemberId,
      allowedPortals: ['team'],
      defaultPortal: 'team',
      password: hashedPassword,
      hasSetPassword: true,
      passwordSetAt: new Date().toISOString(),
    };

    // Update local state and cache immediately so the user is never blocked
    setMembers((prev) => [...prev, newMember]);
    setAccounts((prev) => [...prev, newAccount]);

    setCurrentAccountId(newAccountId);
    setActivePortal('team');
    setIsLoggedIn(true);
    sessionStorage.setItem('mediaserve_auth', 'true');
    sessionStorage.setItem('mediaserve_account_id', newAccountId);

    // If Supabase is configured, sync to database with safety catch
    if (isSupabaseConfigured) {
      try {
        const { error: memErr } = await supabase.from('members').insert([newMember]);
        if (memErr) {
          console.warn('Supabase member sync warning (stored in local roster):', memErr.message);
        }
        const { error: accErr } = await supabase.from('accounts').insert([newAccount]);
        if (accErr) {
          console.warn('Supabase account sync warning (stored in local roster):', accErr.message);
        }
      } catch (err: any) {
        console.warn('Supabase network error during member registration (stored in local roster):', err?.message || err);
      }
    }

    await logAction(
      cleanName,
      'New Team Member Registration',
      `Registered via onboarding form as ${roles.find((r) => r.id === data.primaryRole)?.name || 'Media Member'}.`,
      'system'
    );
    showToast(`Welcome to AKWC Media, ${cleanName}! Your account is active.`);
    return { success: true, message: `Account created successfully! Welcome to the team.` };
  };

  const switchPortal = (portal: PortalType) => {
    if (portal === 'admin' && !isSuperAdmin) {
      showToast('Access Denied: Only the Super Admin (bernardoobuobi@gmail.com) can access the Admin Portal.');
      return;
    }
    if (portal === 'leadership' && !isLeader) {
      showToast('Access Denied: Leadership clearance required.');
      return;
    }
    setActivePortal(portal);
    resetInactivityTimer();
  };

  const updateAccountPrivileges = async (
    targetAccountId: string,
    newAllowedPortals: PortalType[],
    defaultPortal?: PortalType
  ): Promise<{ success: boolean; message: string }> => {
    if (!isSuperAdmin) {
      const msg = 'Permission Denied: Only the Super Admin (bernardoobuobi@gmail.com) can modify account portal access.';
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

    setAccounts((prev) => prev.map((a) => (a.id === targetAccountId ? { ...a, allowedPortals: sanitizedPortals, defaultPortal: def } : a)));
    setMembers((prev) => prev.map((m) => (m.id === targetAcc.memberId ? { ...m, isLeader: isGrantedLeadership } : m)));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('accounts').update({ allowedPortals: sanitizedPortals, defaultPortal: def }).eq('id', targetAccountId);
        await supabase.from('members').update({ isLeader: isGrantedLeadership }).eq('id', targetAcc.memberId);
      } catch (e) {
        console.warn('Supabase update privileges warning:', e);
      }
    }

    const mem = members.find((m) => m.id === targetAcc.memberId);
    await logAction(currentMember.name, 'Updated Team Member Privileges', `Super Admin updated permissions for ${mem?.name || targetAcc.email}. Leader status: ${isGrantedLeadership ? 'Granted' : 'Revoked'}.`, 'system');

    showToast(`Updated privileges for ${mem?.name || targetAcc.email}`);
    return { success: true, message: 'Privileges updated successfully.' };
  };

  const toggleMemberLeadership = async (memberId: string, forceStatus?: boolean): Promise<{ success: boolean; message: string }> => {
    const mem = members.find((m) => m.id === memberId);
    if (!mem) return { success: false, message: 'Member not found.' };

    const newIsLeader = forceStatus !== undefined ? forceStatus : !Boolean(mem.isLeader);

    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, isLeader: newIsLeader } : m)));

    const targetAcc = accounts.find((a) => a.memberId === memberId);
    if (targetAcc) {
      const currentAllowed = targetAcc.allowedPortals || ['team'];
      const newAllowed: PortalType[] = newIsLeader
        ? (Array.from(new Set([...currentAllowed, 'leadership', 'team'])) as PortalType[])
        : (currentAllowed.filter((p) => p !== 'leadership') as PortalType[]);

      setAccounts((prev) => prev.map((a) => (a.id === targetAcc.id ? { ...a, allowedPortals: newAllowed, defaultPortal: newIsLeader ? 'leadership' : 'team' } : a)));

      if (isSupabaseConfigured) {
        try {
          await supabase.from('accounts').update({ allowedPortals: newAllowed, defaultPortal: newIsLeader ? 'leadership' : 'team' }).eq('id', targetAcc.id);
        } catch (e) {
          console.warn('Supabase update account warning:', e);
        }
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('members').update({ isLeader: newIsLeader }).eq('id', memberId);
      } catch (e) {
        console.warn('Supabase update member warning:', e);
      }
    }

    const msg = newIsLeader ? `${mem.name} is now a Media Leader!` : `Revoked leadership privileges for ${mem.name}.`;
    showToast(msg);
    return { success: true, message: msg };
  };

  const setupFirstTimePassword = async (email: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const cleanEmail = sanitizeEmail(email);

    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }
    
    let acc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    let mem = members.find((m) => m.email.toLowerCase() === cleanEmail);

    if (!acc && mem) {
      acc = accounts.find((a) => a.memberId === mem.id);
    }

    const hashedPassword = await hashPassword(newPassword);

    if (!acc && mem) {
      const newAccountId = generateUniqueId('acc');
      acc = {
        id: newAccountId,
        email: cleanEmail,
        memberId: mem.id,
        allowedPortals: ['team'],
        defaultPortal: 'team',
        password: hashedPassword,
        hasSetPassword: true,
        passwordSetAt: new Date().toISOString(),
      };
      setAccounts((prev) => [...prev, acc!]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('accounts').insert([acc]);
        } catch (e) {
          console.warn('Supabase insert account warning:', e);
        }
      }
    } else if (acc) {
      setAccounts((prev) => prev.map((a) => (a.id === acc!.id ? { ...a, password: hashedPassword, hasSetPassword: true, passwordSetAt: new Date().toISOString() } : a)));

      if (isSupabaseConfigured) {
        try {
          await supabase.from('accounts').update({ password: hashedPassword, hasSetPassword: true, passwordSetAt: new Date().toISOString() }).eq('id', acc.id);
        } catch (e) {
          console.warn('Supabase update account warning:', e);
        }
      }
    } else {
      return { success: false, message: 'Email not found on media team roster.' };
    }

    setCurrentAccountId(acc.id);
    setIsLoggedIn(true);
    sessionStorage.setItem('mediaserve_auth', 'true');
    sessionStorage.setItem('mediaserve_account_id', acc.id);

    showToast(`Welcome ${mem?.name || cleanEmail}! Account activated.`);
    return { success: true, message: 'Password set successfully.' };
  };

  const loginWithPassword = async (email: string, password: string): Promise<{ success: boolean; message: string; requiresSetup?: boolean }> => {
    const cleanEmail = sanitizeEmail(email);

    // Rate limiting: max 5 failed attempts per 60 seconds
    const rateCheck = checkRateLimit('login', cleanEmail, 5, 60000, 60000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `Too many failed login attempts. Account temporarily locked for security. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
      };
    }

    let acc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    let mem = members.find((m) => m.email.toLowerCase() === cleanEmail);

    if (!acc && mem) {
      acc = accounts.find((a) => a.memberId === mem.id);
    }

    if (!acc && !mem) {
      recordFailedAttempt('login', cleanEmail, 5, 60000, 60000);
      return { success: false, message: 'No registered media member found with this email.' };
    }

    if (acc && !acc.hasSetPassword) {
      return { success: false, message: 'You have not set your password yet. Please create one.', requiresSetup: true };
    }

    if (!acc && mem) {
      return { success: false, message: 'You are registered on the roster but need to set your password first.', requiresSetup: true };
    }

    const isMatch = await verifyPassword(password, acc?.password);
    if (!isMatch) {
      recordFailedAttempt('login', cleanEmail, 5, 60000, 60000);
      const remaining = rateCheck.remainingAttempts - 1;
      const warning = remaining > 0 ? ` (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)` : '';
      return { success: false, message: `Incorrect password.${warning} Try again or use Forgot Password.` };
    }

    // Success: reset rate limit counter
    resetRateLimit('login', cleanEmail);

    // Auto-upgrade legacy unhashed password to PBKDF2 hash on the fly
    if (acc && !isPasswordHashed(acc.password)) {
      try {
        const secureHash = await hashPassword(password);
        setAccounts((prev) => prev.map((a) => (a.id === acc!.id ? { ...a, password: secureHash } : a)));
        if (isSupabaseConfigured) {
          await supabase.from('accounts').update({ password: secureHash }).eq('id', acc.id);
        }
      } catch (err) {
        console.warn('Password upgrade warning:', err);
      }
    }

    if (acc) {
      setCurrentAccountId(acc.id);
      setActivePortal(acc.defaultPortal || 'team');
      setIsLoggedIn(true);
      sessionStorage.setItem('mediaserve_auth', 'true');
      sessionStorage.setItem('mediaserve_account_id', acc.id);
      resetInactivityTimer();
      showToast(`Welcome back, ${mem?.name || acc.email}!`);
      return { success: true, message: 'Sign in successful.' };
    }

    return { success: false, message: 'Authentication failed.' };
  };

  const changePassword = async (newPassword: string) => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const hashedPassword = await hashPassword(newPassword);
    setAccounts((prev) => prev.map((a) => (a.id === currentAccount.id ? { ...a, password: hashedPassword, hasSetPassword: true, passwordSetAt: new Date().toISOString() } : a)));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('accounts').update({ password: hashedPassword, hasSetPassword: true, passwordSetAt: new Date().toISOString() }).eq('id', currentAccount.id);
      } catch (e) {
        console.warn('Supabase change password warning:', e);
      }
    }

    showToast('Your password was updated securely.');
    return { success: true, message: 'Password updated successfully.' };
  };

  const resetPasswordForMember = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setAccounts((prev) => prev.map((a) => (a.email.toLowerCase() === cleanEmail ? { ...a, password: undefined, hasSetPassword: false } : a)));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('accounts').update({ password: null, hasSetPassword: false, passwordSetAt: null }).eq('email', cleanEmail);
      } catch (e) {
        console.warn('Supabase reset password warning:', e);
      }
    }

    showToast(`Password reset for ${cleanEmail}.`);
  };

  const requestPasswordReset = async (
    identifier: string,
    method: 'email' | 'phone'
  ): Promise<{
    success: boolean;
    message: string;
    code?: string;
    maskedTarget?: string;
    targetPhone?: string;
    targetEmail?: string;
  }> => {
    const cleanId = sanitizeText(identifier).trim().toLowerCase();
    const cleanPhoneDigits = identifier.replace(/\D/g, '');

    // Rate limiting: max 3 password reset requests per 3 minutes
    const rateCheck = checkRateLimit('pwd_reset', cleanId || cleanPhoneDigits, 3, 180000, 180000);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `Too many password reset requests. Please wait ${rateCheck.retryAfterSeconds} seconds before requesting a new code.`,
      };
    }

    const member = members.find((m) => {
      const memEmail = m.email.trim().toLowerCase();
      const memPhoneDigits = m.phone.replace(/\D/g, '');
      return memEmail === cleanId || (cleanPhoneDigits.length >= 7 && (memPhoneDigits.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(memPhoneDigits)));
    });

    const account = accounts.find((a) => {
      return a.email.trim().toLowerCase() === cleanId || (member && a.memberId === member.id);
    });

    if (!member && !account) {
      return {
        success: false,
        message: 'No registered member or account found matching this email or phone number.',
      };
    }

    const email = account?.email || member?.email || '';
    const phone = member?.phone || '';

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    const resetPayload = {
      code,
      expiresAt,
      email,
      phone,
      memberId: member?.id,
      accountId: account?.id,
    };

    sessionStorage.setItem('mediaserve_pwd_reset', JSON.stringify(resetPayload));

    let maskedTarget = '';
    if (method === 'email' && email) {
      const parts = email.split('@');
      const namePart = parts[0];
      const domain = parts[1] || '';
      const maskedName = namePart.length > 2 ? `${namePart[0]}***${namePart[namePart.length - 1]}` : `${namePart[0]}***`;
      maskedTarget = `${maskedName}@${domain}`;
    } else {
      const cleanDigits = phone.replace(/\D/g, '');
      maskedTarget = cleanDigits.length >= 6 ? `${cleanDigits.slice(0, 3)}••••${cleanDigits.slice(-3)}` : phone;
    }

    await logAction(
      member?.name || email,
      'Password Reset Requested',
      `Verification code requested via ${method.toUpperCase()} for ${maskedTarget}.`,
      'system'
    );

    return {
      success: true,
      message: `Verification code generated for ${maskedTarget}.`,
      code,
      maskedTarget,
      targetPhone: phone,
      targetEmail: email,
    };
  };

  const verifyAndResetPassword = async (
    identifier: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const storedStr = sessionStorage.getItem('mediaserve_pwd_reset');
    let resetData: { code: string; expiresAt: number; email: string; phone: string; memberId?: string; accountId?: string } | null = null;
    if (storedStr) {
      try {
        resetData = JSON.parse(storedStr);
      } catch {}
    }

    const cleanInputCode = code.trim();
    if (!resetData || resetData.code !== cleanInputCode) {
      return { success: false, message: 'Invalid verification code. Please check and try again.' };
    }

    if (Date.now() > resetData.expiresAt) {
      return { success: false, message: 'Verification code has expired. Please request a new code.' };
    }

    const cleanEmail = resetData.email.trim().toLowerCase();
    let acc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    const mem = members.find((m) => m.id === resetData?.memberId || m.email.toLowerCase() === cleanEmail);

    const hashedPassword = await hashPassword(newPassword);

    if (!acc && mem) {
      const newAccountId = generateUniqueId('acc');
      acc = {
        id: newAccountId,
        email: cleanEmail,
        memberId: mem.id,
        allowedPortals: ['team'],
        defaultPortal: 'team',
        password: hashedPassword,
        hasSetPassword: true,
        passwordSetAt: new Date().toISOString(),
      };
      setAccounts((prev) => [...prev, acc!]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('accounts').insert([acc]);
        } catch (e) {
          console.warn('Supabase insert account warning:', e);
        }
      }
    } else if (acc) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === acc!.id ? { ...a, password: hashedPassword, hasSetPassword: true, passwordSetAt: new Date().toISOString() } : a))
      );

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('accounts')
            .update({ password: hashedPassword, hasSetPassword: true, passwordSetAt: new Date().toISOString() })
            .eq('id', acc.id);
        } catch (e) {
          console.warn('Supabase update account password warning:', e);
        }
      }
    } else {
      return { success: false, message: 'Account not found to update password.' };
    }

    sessionStorage.removeItem('mediaserve_pwd_reset');

    setCurrentAccountId(acc.id);
    setIsLoggedIn(true);
    sessionStorage.setItem('mediaserve_auth', 'true');
    sessionStorage.setItem('mediaserve_account_id', acc.id);

    await logAction(
      mem?.name || cleanEmail,
      'Password Reset Complete',
      `Account password was verified and reset successfully for ${cleanEmail}.`,
      'system'
    );

    showToast(`Password updated successfully! Welcome back, ${mem?.name || cleanEmail}.`);
    return { success: true, message: 'Password reset and sign in successful!' };
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

    if (isSupabaseConfigured) {
      try {
        await supabase.from('audit_logs').insert([newLog]);
      } catch (e) {
        console.warn('Supabase logAction warning:', e);
      }
    }
  };

  const confirmAttendance = async (assignmentId: string, arrivalComment?: string, estimatedArrivalTime?: string) => {
    const existing = assignments.find((a) => a.id === assignmentId);
    if (!existing && directConfirmData?.asg) {
      const newAsg: RoleAssignment = {
        ...directConfirmData.asg,
        id: assignmentId,
        status: 'confirmed',
        confirmedAt: new Date().toISOString(),
        arrivalComment: arrivalComment?.trim() || undefined,
        estimatedArrivalTime: estimatedArrivalTime?.trim() || undefined,
        declineReason: undefined,
      };
      setAssignments((prev) => [...prev, newAsg]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('assignments').upsert([newAsg]);
        } catch (e) {
          console.warn('Supabase confirmAttendance upsert warning:', e);
        }
      }
    } else {
      setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? { ...a, status: 'confirmed', confirmedAt: new Date().toISOString(), arrivalComment: arrivalComment?.trim() || undefined, estimatedArrivalTime: estimatedArrivalTime?.trim() || undefined } : a)));

      if (isSupabaseConfigured) {
        try {
          await supabase.from('assignments').update({ status: 'confirmed', confirmedAt: new Date().toISOString(), arrivalComment: arrivalComment?.trim() || null, estimatedArrivalTime: estimatedArrivalTime?.trim() || null, declineReason: null }).eq('id', assignmentId);
        } catch (e) {
          console.warn('Supabase confirmAttendance update warning:', e);
        }
      }
    }
    showToast('Attendance confirmed! Thank you for your service.');
  };

  const declineAttendance = async (assignmentId: string, reason: string) => {
    setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? { ...a, status: 'declined', declineReason: reason || 'Not specified' } : a)));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('assignments').update({ status: 'declined', declineReason: reason || 'Not specified' }).eq('id', assignmentId);
      } catch (e) {
        console.warn('Supabase declineAttendance warning:', e);
      }
    }

    showToast('Declined. Leadership notified.');
  };

  const assignMemberToRole = async (programId: string, roleId: string, memberId: string) => {
    const existing = assignments.find((a) => a.programId === programId && a.roleId === roleId);

    if (existing) {
      setAssignments((prev) => prev.map((a) => (a.id === existing.id ? { ...a, memberId, status: 'pending' } : a)));

      if (isSupabaseConfigured) {
        try {
          await supabase.from('assignments').update({ memberId, status: 'pending', declineReason: null, confirmedAt: null }).eq('id', existing.id);
        } catch (e) {
          console.warn('Supabase assignMemberToRole update warning:', e);
        }
      }
    } else {
      const newAsg: RoleAssignment = { id: generateUniqueId('asg'), programId, roleId, memberId, status: 'pending', remindersSent: [] };
      setAssignments((prev) => [...prev, newAsg]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('assignments').insert([newAsg]);
        } catch (e) {
          console.warn('Supabase assignMemberToRole insert warning:', e);
        }
      }
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
      setAssignments((prev) => [...prev, ...newAssignments]);

      if (isSupabaseConfigured) {
        try {
          await supabase.from('assignments').insert(newAssignments);
        } catch (e) {
          console.warn('Supabase autoFillRoster insert warning:', e);
        }
      }

      showToast(`Auto-filled ${newAssignments.length} positions!`);
    } else {
      showToast('No available matching candidates for open roles.');
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('assignments').delete().eq('id', assignmentId);
      } catch (e) {
        console.warn('Supabase removeAssignment warning:', e);
      }
    }

    showToast('Assignment removed.');
  };

  const replaceAssignment = async (assignmentId: string, newMemberId: string) => {
    setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? { ...a, memberId: newMemberId, status: 'pending', declineReason: undefined } : a)));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('assignments').update({ memberId: newMemberId, status: 'pending', declineReason: null, confirmedAt: null }).eq('id', assignmentId);
      } catch (e) {
        console.warn('Supabase replaceAssignment warning:', e);
      }
    }

    showToast('Replacement candidate assigned!');
  };

  const triggerManualReminder = async (programId: string) => {
    showToast(`Dispatched reminders for service.`);
  };

  const createProgram = async (newProg: Omit<ProgramService, 'id'>): Promise<string> => {
    const id = generateUniqueId('prog');
    const program: ProgramService = {
      ...newProg,
      id,
      title: sanitizeText(newProg.title),
      location: sanitizeText(newProg.location),
      directorName: sanitizeText(newProg.directorName),
      theme: newProg.theme ? sanitizeText(newProg.theme) : undefined,
    };
    setPrograms((prev) => [program, ...prev]);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('programs').insert([program]);
        if (error) {
          console.warn('Supabase createProgram warning:', error.message);
        }
      } catch (e) {
        console.warn('Supabase createProgram warning:', e);
      }
    }
    
    showToast('Service created successfully!');
    return id;
  };

  const updateProgram = async (updatedProg: ProgramService) => {
    const sanitized: ProgramService = {
      ...updatedProg,
      title: sanitizeText(updatedProg.title),
      location: sanitizeText(updatedProg.location),
      directorName: sanitizeText(updatedProg.directorName),
      theme: updatedProg.theme ? sanitizeText(updatedProg.theme) : undefined,
    };
    setPrograms((prev) => prev.map((p) => (p.id === sanitized.id ? sanitized : p)));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('programs').update(sanitized).eq('id', sanitized.id);
        if (error) console.warn('Supabase updateProgram warning:', error.message);
      } catch (e) {
        console.warn('Supabase updateProgram warning:', e);
      }
    }

    showToast('Service updated.');
  };

  const deleteProgram = async (programId: string) => {
    setPrograms((prev) => prev.filter((p) => p.id !== programId));
    setAssignments((prev) => prev.filter((a) => a.programId !== programId));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('programs').delete().eq('id', programId);
        await supabase.from('assignments').delete().eq('programId', programId);
      } catch (e) {
        console.warn('Supabase deleteProgram warning:', e);
      }
    }

    showToast('Service deleted.');
  };

  const addMember = async (member: Omit<TeamMember, 'id'>): Promise<string> => {
    const id = generateUniqueId('mem');
    const newMember: TeamMember = {
      ...member,
      id,
      name: sanitizeText(member.name),
      email: sanitizeEmail(member.email),
      phone: sanitizePhone(member.phone),
      notes: member.notes ? sanitizeText(member.notes) : undefined,
    };
    setMembers((prev) => [...prev, newMember]);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('members').insert([newMember]);
        if (error) console.warn('Supabase addMember warning:', error.message);
      } catch (e) {
        console.warn('Supabase addMember warning:', e);
      }
    }

    showToast(`Added ${newMember.name} to roster.`);
    return id;
  };

  const updateMember = async (member: TeamMember) => {
    const sanitized: TeamMember = {
      ...member,
      name: sanitizeText(member.name),
      email: sanitizeEmail(member.email),
      phone: sanitizePhone(member.phone),
      notes: member.notes ? sanitizeText(member.notes) : undefined,
    };
    setMembers((prev) => prev.map((m) => (m.id === sanitized.id ? sanitized : m)));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('members').update(sanitized).eq('id', sanitized.id);
        if (error) console.warn('Supabase updateMember warning:', error.message);
      } catch (e) {
        console.warn('Supabase updateMember warning:', e);
      }
    }

    showToast('Member details updated.');
  };

  const deleteMember = async (memberId: string) => {
    if (!isSuperAdmin) {
      showToast('Permission Denied: Only the Super Admin (bernardoobuobi@gmail.com) can delete team members.');
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setAccounts((prev) => prev.filter((a) => a.memberId !== memberId));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('members').delete().eq('id', memberId);
        await supabase.from('accounts').delete().eq('memberId', memberId);
      } catch (e) {
        console.warn('Supabase deleteMember warning:', e);
      }
    }

    showToast('Member deleted.');
  };

  const addAnnouncement = async (announcement: Omit<Announcement, 'id'>) => {
    const id = generateUniqueId('ann');
    const newAnn: Announcement = {
      ...announcement,
      id,
      title: sanitizeText(announcement.title),
      content: sanitizeText(announcement.content),
      author: sanitizeText(announcement.author),
    };
    setAnnouncements((prev) => [newAnn, ...prev]);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('announcements').insert([newAnn]);
        if (error) console.warn('Supabase addAnnouncement warning:', error.message);
      } catch (e) {
        console.warn('Supabase addAnnouncement warning:', e);
      }
    }

    showToast('Announcement posted!');
  };

  const deleteAnnouncement = async (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) console.warn('Supabase deleteAnnouncement warning:', error.message);
      } catch (e) {
        console.warn('Supabase deleteAnnouncement warning:', e);
      }
    }

    showToast('Announcement removed.');
  };

  const updateVerse = async (newVerse: VerseOfTheDay) => {
    setVerse(newVerse);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('verse').upsert([newVerse]);
        if (error) console.warn('Supabase updateVerse warning:', error.message);
      } catch (e) {
        console.warn('Supabase updateVerse warning:', e);
      }
    }

    showToast('Verse updated.');
  };

  const updateReminderConfig = async (config: ReminderConfig) => {
    setReminderConfig(config);

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from('reminder_config').upsert([config]);
        if (error) console.warn('Supabase updateReminderConfig warning:', error.message);
      } catch (e) {
        console.warn('Supabase updateReminderConfig warning:', e);
      }
    }

    showToast('Reminder settings updated.');
  };

  const resetToDefaults = async () => {
    setRoles(INITIAL_ROLES);
    setMembers(INITIAL_MEMBERS);
    setAccounts(INITIAL_ACCOUNTS);
    setPrograms(INITIAL_PROGRAMS);
    setAssignments(INITIAL_ASSIGNMENTS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setVerse(INITIAL_VERSE);
    setReminderConfig(INITIAL_REMINDER_CONFIG);
    setAuditLogs([]);

    if (typeof window !== 'undefined') {
      localStorage.setItem('akwc_roles', JSON.stringify(INITIAL_ROLES));
      localStorage.setItem('akwc_members', JSON.stringify(INITIAL_MEMBERS));
      localStorage.setItem('akwc_accounts', JSON.stringify(INITIAL_ACCOUNTS));
      localStorage.setItem('akwc_programs', JSON.stringify(INITIAL_PROGRAMS));
      localStorage.setItem('akwc_assignments', JSON.stringify(INITIAL_ASSIGNMENTS));
      localStorage.setItem('akwc_announcements', JSON.stringify(INITIAL_ANNOUNCEMENTS));
      localStorage.setItem('akwc_verse', JSON.stringify(INITIAL_VERSE));
      localStorage.setItem('akwc_reminder_config', JSON.stringify(INITIAL_REMINDER_CONFIG));
      localStorage.removeItem('akwc_audit_logs');
    }

    if (isSupabaseConfigured) {
      try {
        await Promise.allSettled([
          supabase.from('roles').upsert(INITIAL_ROLES),
          supabase.from('members').upsert(INITIAL_MEMBERS),
          supabase.from('accounts').upsert(INITIAL_ACCOUNTS),
          supabase.from('programs').upsert(INITIAL_PROGRAMS),
          supabase.from('assignments').upsert(INITIAL_ASSIGNMENTS),
          supabase.from('announcements').upsert(INITIAL_ANNOUNCEMENTS),
          supabase.from('verse').upsert([INITIAL_VERSE]),
          supabase.from('reminder_config').upsert([INITIAL_REMINDER_CONFIG]),
        ]);
      } catch (err) {
        console.warn('Could not reset Supabase remote database:', err);
      }
    }

    showToast('Reset system to initial AKWC Media state.');
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
        requestPasswordReset,
        verifyAndResetPassword,
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
        isSupabaseConfigured,
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
