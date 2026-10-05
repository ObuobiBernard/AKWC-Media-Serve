import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  ) => { success: boolean; message: string };
  checkEmailStatus: (email: string) => {
    status: 'not_found' | 'needs_password' | 'has_password';
    memberName?: string;
    primaryRoleName?: string;
  };
  registerNewMember: (data: RegisterMemberData) => { success: boolean; message: string };
  setupFirstTimePassword: (email: string, newPassword: string) => { success: boolean; message: string };
  loginWithPassword: (email: string, password: string) => { success: boolean; message: string; requiresSetup?: boolean };
  changePassword: (newPassword: string) => { success: boolean; message: string };
  resetPasswordForMember: (email: string) => void;

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
  confirmAttendance: (assignmentId: string, arrivalComment?: string, estimatedArrivalTime?: string) => void;
  declineAttendance: (assignmentId: string, reason: string) => void;
  assignMemberToRole: (programId: string, roleId: string, memberId: string) => void;
  autoFillRoster: (programId: string) => void;
  removeAssignment: (assignmentId: string) => void;
  replaceAssignment: (assignmentId: string, newMemberId: string) => void;
  triggerManualReminder: (programId: string, intervalLabel?: string) => void;

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
  createProgram: (newProg: Omit<ProgramService, 'id'>) => string;
  updateProgram: (updatedProg: ProgramService) => void;
  deleteProgram: (programId: string) => void;

  // Members Management
  addMember: (member: Omit<TeamMember, 'id'>) => string;
  updateMember: (member: TeamMember) => void;
  deleteMember: (memberId: string) => void;

  // Announcements & Verses
  addAnnouncement: (announcement: Omit<Announcement, 'id'>) => void;
  deleteAnnouncement: (id: string) => void;
  updateVerse: (newVerse: VerseOfTheDay) => void;
  updateReminderConfig: (config: ReminderConfig) => void;

  // Tools & Reset
  resetToDefaults: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const STORAGE_PREFIX = 'mediaserve_akwc_v3_';

let idSequence = 0;
export const generateUniqueId = (prefix: string): string => {
  idSequence += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${idSequence}-${rand}`;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from localStorage or use initial mock data
  const [roles, setRoles] = useState<MediaRole[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'roles');
    return saved ? JSON.parse(saved) : INITIAL_ROLES;
  });

  const [members, setMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [programs, setPrograms] = useState<ProgramService[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'programs');
    return saved ? JSON.parse(saved) : INITIAL_PROGRAMS;
  });

  const [assignments, setAssignments] = useState<RoleAssignment[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'assignments');
    const loaded: RoleAssignment[] = saved ? JSON.parse(saved) : INITIAL_ASSIGNMENTS;

    // Self-healing: Guarantee all loaded assignments have strictly unique keys
    const seen = new Set<string>();
    return loaded.map((asg) => {
      if (!asg.id || seen.has(asg.id)) {
        const freshId = generateUniqueId('asg');
        seen.add(freshId);
        return { ...asg, id: freshId };
      }
      seen.add(asg.id);
      return asg;
    });
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'announcements');
    return saved ? JSON.parse(saved) : INITIAL_ANNOUNCEMENTS;
  });

  const [verse, setVerse] = useState<VerseOfTheDay>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'verse');
    return saved ? JSON.parse(saved) : INITIAL_VERSE;
  });

  const [reminderConfig, setReminderConfig] = useState<ReminderConfig>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'reminder_config');
    let config: ReminderConfig = saved ? JSON.parse(saved) : INITIAL_REMINDER_CONFIG;

    // Self-healing: if stored template has stale or broken links like obuobibernard.github.io, sanitize with {appLink}
    if (
      config.whatsappTemplate &&
      (config.whatsappTemplate.includes('github.io') ||
        config.whatsappTemplate.includes('obuobibernard') ||
        !config.whatsappTemplate.includes('{appLink}'))
    ) {
      config.whatsappTemplate = config.whatsappTemplate
        .replace(/https?:\/\/[^\s]*github\.io[^\s]*/gi, '{appLink}')
        .replace(/https?:\/\/[^\s]*obuobibernard[^\s]*/gi, '{appLink}');
      if (!config.whatsappTemplate.includes('{appLink}')) {
        config.whatsappTemplate = INITIAL_REMINDER_CONFIG.whatsappTemplate;
      }
      localStorage.setItem(STORAGE_PREFIX + 'reminder_config', JSON.stringify(config));
    }
    return config;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Authentication gate state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'is_authenticated');
    return saved === 'true';
  });

  // Current logged in account. Default to Ebenezer Addo to satisfy user requirement
  const [currentAccountId, setCurrentAccountId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'current_account_id');
    return saved || 'acc-ebenezer';
  });

  const currentAccount = accounts.find((a) => a.id === currentAccountId) || accounts[0];
  const currentMember =
    members.find((m) => m.id === currentAccount.memberId) ||
    members.find((m) => m.id === 'mem-ebenezer') ||
    members[0];

  const [activePortal, setActivePortal] = useState<PortalType>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'active_portal');
    if (saved && (saved === 'admin' || saved === 'leadership' || saved === 'team')) {
      return saved as PortalType;
    }
    return currentAccount.defaultPortal;
  });

  const isSuperAdmin = currentAccount.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // WhatsApp Automated Duty Dispatch Modal state
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

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Inactivity timeout configuration (Default: 15 minutes)
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_PREFIX + 'inactivity_timeout_mins');
    return saved ? parseInt(saved, 10) : 15;
  });

  const [inactivityLoggedOut, setInactivityLoggedOut] = useState<boolean>(() => {
    return sessionStorage.getItem(STORAGE_PREFIX + 'inactivity_logout') === 'true';
  });
  const [showInactivityWarning, setShowInactivityWarning] = useState<boolean>(false);
  const [inactivitySecondsRemaining, setInactivitySecondsRemaining] = useState<number>(60);
  const lastActivityRef = useRef<number>(Date.now());

  const clearInactivityFlag = () => {
    setInactivityLoggedOut(false);
    sessionStorage.removeItem(STORAGE_PREFIX + 'inactivity_logout');
  };

  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    setShowInactivityWarning(false);
    setInactivitySecondsRemaining(60);
  };

  // User activity tracker: auto-logout after inactivityTimeoutMinutes of idle time
  useEffect(() => {
    if (!isLoggedIn) return;

    lastActivityRef.current = Date.now();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    const totalTimeoutMs = inactivityTimeoutMinutes * 60 * 1000;
    const warningThresholdMs = Math.max(30000, totalTimeoutMs - 60 * 1000); // 60s before timeout

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= totalTimeoutMs) {
        setIsLoggedIn(false);
        localStorage.removeItem(STORAGE_PREFIX + 'is_authenticated');
        sessionStorage.setItem(STORAGE_PREFIX + 'inactivity_logout', 'true');
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

  // Helper: parse service date and time to Date object
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

  // Direct confirmation from WhatsApp link (?action=confirm&asgId=...&memberId=...)
  const [directConfirmData, setDirectConfirmData] = useState<{
    asg: RoleAssignment;
    prog: ProgramService;
    role: MediaRole;
    member: TeamMember;
  } | null>(null);

  const closeDirectConfirmModal = () => {
    setDirectConfirmData(null);
  };

  // Handle direct confirmation link from WhatsApp
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
          // Switch to this member's account and team portal
          setCurrentAccountId(targetAcc.id);
          setIsLoggedIn(true);
          localStorage.setItem(STORAGE_PREFIX + 'is_authenticated', 'true');
          setActivePortal('team');

          setDirectConfirmData({
            asg: foundAsg,
            prog: foundProg,
            role: foundRole,
            member: foundMem,
          });

          showToast(`Welcome ${foundMem.name}! Please confirm your attendance below.`);
          // Clean URL params so refresh does not pop up unnecessarily
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, [assignments, members, programs, roles, accounts]);

  // Automated 24-Hour Reminder Task
  const [automatedReminderModalOpen, setAutomatedReminderModalOpen] = useState(false);
  const [pending24HourDuties, setPending24HourDuties] = useState<Pending24HourDuty[]>([]);

  const calculatePending24HourDuties = (): Pending24HourDuty[] => {
    const now = Date.now();
    const result: Pending24HourDuty[] = [];

    programs.forEach((prog) => {
      const serviceDt = parseServiceDateTime(prog.date, prog.callTime || prog.startTime);
      const diffMs = serviceDt.getTime() - now;
      const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60));

      // Service is within 24 hours (and not older than 4 hours post-start)
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
      list.forEach((item) => {
        if (!item.assignment.remindersSent.includes('24h')) {
          setAssignments((prev) =>
            prev.map((a) =>
              a.id === item.assignment.id
                ? { ...a, remindersSent: [...new Set([...a.remindersSent, '24h'])] }
                : a
            )
          );
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

  // Automated background interval: scans every 30 seconds
  useEffect(() => {
    const runScan = () => {
      const list = calculatePending24HourDuties();
      setPending24HourDuties(list);
    };

    runScan();
    const interval = setInterval(runScan, 30000);
    return () => clearInterval(interval);
  }, [programs, assignments, members, roles]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'roles', JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'programs', JSON.stringify(programs));
  }, [programs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'announcements', JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'verse', JSON.stringify(verse));
  }, [verse]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'reminder_config', JSON.stringify(reminderConfig));
  }, [reminderConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'current_account_id', currentAccountId);
  }, [currentAccountId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'active_portal', activePortal);
  }, [activePortal]);

  // Auth switch
  const switchAccount = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) {
      setCurrentAccountId(acc.id);
      setIsLoggedIn(true);
      localStorage.setItem(STORAGE_PREFIX + 'is_authenticated', 'true');
      // If active portal is not in allowed portals of new account, switch to default portal
      if (!acc.allowedPortals.includes(activePortal)) {
        setActivePortal(acc.defaultPortal);
      }
      const mem = members.find((m) => m.id === acc.memberId);
      showToast(`Logged in as ${mem?.name || acc.email}`);
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem(STORAGE_PREFIX + 'is_authenticated');
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

  const registerNewMember = (data: RegisterMemberData): { success: boolean; message: string } => {
    const cleanEmail = data.email.trim().toLowerCase();
    
    if (!data.name.trim()) {
      return { success: false, message: 'Please provide your full name.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please provide a valid email address.' };
    }
    if (!data.phone.trim()) {
      return { success: false, message: 'Please provide your WhatsApp / phone number.' };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    // Check if email already exists in accounts or member directory
    const emailExists =
      accounts.some((a) => a.email.toLowerCase() === cleanEmail) ||
      members.some((m) => m.email.toLowerCase() === cleanEmail);
    if (emailExists) {
      return {
        success: false,
        message: 'An account or team profile with this email address already exists. Please sign in or use password recovery.',
      };
    }

    // Check if phone number already exists
    const normalizeDigits = (p: string) => {
      const digits = p.replace(/\D/g, '');
      if (digits.startsWith('0') && digits.length === 10) {
        return '233' + digits.substring(1);
      }
      return digits;
    };

    const candPhoneNorm = normalizeDigits(data.phone);
    if (candPhoneNorm.length >= 7) {
      const phoneExists = members.some((m) => normalizeDigits(m.phone) === candPhoneNorm);
      if (phoneExists) {
        return {
          success: false,
          message: 'An account with this phone/WhatsApp number is already registered in the AKWC Media roster. Please sign in with your email or use a different phone number.',
        };
      }
    }

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
      allowedPortals: ['team'], // New signups get Team Portal
      defaultPortal: 'team',
      password: data.password,
      hasSetPassword: true,
      passwordSetAt: new Date().toISOString(),
    };

    setMembers((prev) => [...prev, newMember]);
    setAccounts((prev) => [...prev, newAccount]);
    setCurrentAccountId(newAccountId);
    setActivePortal('team');
    setIsLoggedIn(true);
    localStorage.setItem(STORAGE_PREFIX + 'is_authenticated', 'true');

    logAction(
      data.name,
      'New Team Member Registration',
      `Registered via MediaServe onboarding form as ${roles.find((r) => r.id === data.primaryRole)?.name || 'Media Member'}.`,
      'system'
    );

    showToast(`Welcome to AKWC Media, ${data.name}! Your account is active.`);
    return { success: true, message: `Account created successfully! Welcome to the team.` };
  };

  const switchPortal = (portal: PortalType) => {
    // SECURITY RULE: Only bernardoobuobi@gmail.com can access the admin portal
    if (portal === 'admin' && !isSuperAdmin) {
      showToast('Access Denied: Only the Super Admin (bernardoobuobi@gmail.com) can access the Admin Portal.');
      return;
    }

    // Only accounts with leadership permission or super admin can access leadership portal
    if (portal === 'leadership' && !isSuperAdmin && !currentAccount.allowedPortals.includes('leadership')) {
      showToast('Access Denied: You do not have Leadership privileges.');
      return;
    }

    if (currentAccount.allowedPortals.includes(portal) || isSuperAdmin) {
      setActivePortal(portal);
    } else {
      showToast(`Access restricted: Your account does not have permission for the ${portal} portal.`);
    }
  };

  const updateAccountPrivileges = (
    targetAccountId: string,
    newAllowedPortals: PortalType[],
    defaultPortal?: PortalType
  ): { success: boolean; message: string } => {
    // SECURITY RULE: Only bernardoobuobi@gmail.com can assign admin or leader privileges
    if (!isSuperAdmin) {
      const msg = 'Security violation: Only the Super Admin (bernardoobuobi@gmail.com) is authorized to assign admin or leader privileges.';
      showToast(msg);
      return { success: false, message: msg };
    }

    const targetAcc = accounts.find((a) => a.id === targetAccountId);
    if (!targetAcc) {
      return { success: false, message: 'Account not found.' };
    }

    // No one other than bernardoobuobi@gmail.com can ever have admin portal privilege
    const sanitizedPortals: PortalType[] = newAllowedPortals.filter((p) => {
      if (p === 'admin') {
        return targetAcc.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      }
      return true;
    });

    if (!sanitizedPortals.includes('team')) {
      sanitizedPortals.push('team');
    }

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === targetAccountId) {
          const def = defaultPortal || (sanitizedPortals.includes(a.defaultPortal) ? a.defaultPortal : 'team');
          return {
            ...a,
            allowedPortals: sanitizedPortals,
            defaultPortal: def,
          };
        }
        return a;
      })
    );

    const mem = members.find((m) => m.id === targetAcc.memberId);
    logAction(
      currentMember.name,
      'Updated Team Member Privileges',
      `Super Admin updated portal permissions for ${mem?.name || targetAcc.email} to: [${sanitizedPortals.join(', ')}].`,
      'system'
    );

    showToast(`Updated privileges for ${mem?.name || targetAcc.email}`);
    return { success: true, message: 'Privileges updated successfully.' };
  };

  const setupFirstTimePassword = (email: string, newPassword: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const acc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (!acc) {
      return {
        success: false,
        message: 'This email is not registered on the AKWC Media Team spreadsheet. Please check the email you provided.',
      };
    }

    const member = members.find((m) => m.id === acc.memberId);

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === acc.id
          ? {
              ...a,
              password: newPassword,
              hasSetPassword: true,
              passwordSetAt: new Date().toISOString(),
            }
          : a
      )
    );

    setCurrentAccountId(acc.id);
    setIsLoggedIn(true);
    localStorage.setItem(STORAGE_PREFIX + 'is_authenticated', 'true');

    if (!acc.allowedPortals.includes(activePortal)) {
      setActivePortal(acc.defaultPortal);
    }

    logAction(
      member?.name || cleanEmail,
      'Set First-Time Password',
      `Member successfully activated their account and set their personal password.`,
      'system'
    );

    showToast(`Password set! Welcome, ${member?.name || cleanEmail}.`);
    return {
      success: true,
      message: `Account activated for ${member?.name}! You are now logged in.`,
    };
  };

  const loginWithPassword = (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const acc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);

    if (!acc) {
      return {
        success: false,
        message: 'No account found with this email. Make sure you use the email provided on the AKWC media team form.',
      };
    }

    if (!acc.hasSetPassword) {
      return {
        success: false,
        requiresSetup: true,
        message: `You haven't set up your password yet! Please set your password below to activate your account.`,
      };
    }

    if (acc.password !== password) {
      return {
        success: false,
        message: 'Incorrect password. If you forgot your password, you can reset it.',
      };
    }

    setCurrentAccountId(acc.id);
    setIsLoggedIn(true);
    localStorage.setItem(STORAGE_PREFIX + 'is_authenticated', 'true');

    if (!acc.allowedPortals.includes(activePortal)) {
      setActivePortal(acc.defaultPortal);
    }
    const mem = members.find((m) => m.id === acc.memberId);
    showToast(`Welcome back, ${mem?.name || acc.email}!`);
    return {
      success: true,
      message: `Welcome back, ${mem?.name || acc.email}!`,
    };
  };

  const changePassword = (newPassword: string) => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === currentAccount.id
          ? { ...a, password: newPassword, hasSetPassword: true, passwordSetAt: new Date().toISOString() }
          : a
      )
    );
    showToast('Your password was updated successfully.');
    return { success: true, message: 'Password updated successfully.' };
  };

  const resetPasswordForMember = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setAccounts((prev) =>
      prev.map((a) =>
        a.email.toLowerCase() === cleanEmail
          ? { ...a, password: undefined, hasSetPassword: false, passwordSetAt: undefined }
          : a
      )
    );
    const mem = members.find((m) => m.email.toLowerCase() === cleanEmail);
    logAction(
      currentMember.name,
      'Reset Member Password',
      `Reset password for ${mem?.name || cleanEmail} to allow first-time setup again.`,
      'system'
    );
    showToast(`Password reset for ${mem?.name || cleanEmail}. They can now set a new password.`);
  };

  const logAction = (
    actor: string,
    action: string,
    details: string,
    type: AuditLog['type']
  ) => {
    const newLog: AuditLog = {
      id: generateUniqueId('log'),
      timestamp: new Date().toISOString(),
      actorName: actor,
      action,
      details,
      type,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  // Workflow Handlers
  const confirmAttendance = (assignmentId: string, arrivalComment?: string, estimatedArrivalTime?: string) => {
    setAssignments((prev) =>
      prev.map((asg) => {
        if (asg.id === assignmentId) {
          return {
            ...asg,
            status: 'confirmed',
            confirmedAt: new Date().toISOString(),
            arrivalComment: arrivalComment?.trim() || undefined,
            estimatedArrivalTime: estimatedArrivalTime?.trim() || undefined,
            declineReason: undefined,
          };
        }
        return asg;
      })
    );

    const asg = assignments.find((a) => a.id === assignmentId);
    const prog = programs.find((p) => p.id === asg?.programId);
    const role = roles.find((r) => r.id === asg?.roleId);

    const hasLateNote = Boolean(arrivalComment?.trim() || estimatedArrivalTime?.trim());
    const detailMsg = hasLateNote
      ? `Confirmed attendance for ${prog?.title || 'service'} (${role?.name || 'station'}). Arrival Note: ${estimatedArrivalTime ? `ETA: ${estimatedArrivalTime}. ` : ''}"${arrivalComment || 'Delayed'}"`
      : `Confirmed on-time attendance for ${prog?.title || 'service'} (${role?.name || 'station'}).`;

    logAction(
      currentMember.name,
      hasLateNote ? 'Confirmed (Delayed Arrival)' : 'Confirmed Attendance',
      detailMsg,
      'confirmation'
    );

    if (hasLateNote) {
      showToast(`Attendance confirmed with arrival note! Leadership has been notified of your ETA (${estimatedArrivalTime || 'delayed'}).`);
    } else {
      showToast(`Attendance confirmed on time! Thank you for serving, ${currentMember.name}.`);
    }
  };

  const declineAttendance = (assignmentId: string, reason: string) => {
    setAssignments((prev) =>
      prev.map((asg) => {
        if (asg.id === assignmentId) {
          return {
            ...asg,
            status: 'declined',
            declineReason: reason || 'Not specified',
          };
        }
        return asg;
      })
    );

    const asg = assignments.find((a) => a.id === assignmentId);
    const prog = programs.find((p) => p.id === asg?.programId);
    const role = roles.find((r) => r.id === asg?.roleId);

    logAction(
      currentMember.name,
      'Declined Assignment',
      `Declined ${role?.name} for ${prog?.title || 'service'} (Reason: ${reason || 'Not specified'}). Replacement requested.`,
      'decline'
    );
    showToast(`You have declined. Leadership has been alerted to find a replacement.`);
  };

  const assignMemberToRole = (programId: string, roleId: string, memberId: string) => {
    setAssignments((prev) => {
      const existing = prev.find((a) => a.programId === programId && a.roleId === roleId);
      if (existing) {
        return prev.map((a) => {
          if (a.id === existing.id) {
            return {
              ...a,
              memberId,
              status: 'pending',
              declineReason: undefined,
              confirmedAt: undefined,
            };
          }
          return a;
        });
      } else {
        const newAsg: RoleAssignment = {
          id: generateUniqueId('asg'),
          programId,
          roleId,
          memberId,
          status: 'pending',
          remindersSent: [],
        };
        return [...prev, newAsg];
      }
    });

    const assignedMember = members.find((m) => m.id === memberId);
    const role = roles.find((r) => r.id === roleId);
    const prog = programs.find((p) => p.id === programId);

    logAction(
      currentMember.name,
      'Assigned Role',
      `Assigned ${assignedMember?.name || 'crew'} to ${role?.name || 'station'} for ${prog?.title || 'service'}.`,
      'assignment'
    );
    showToast(`Assigned ${assignedMember?.name || 'crew'} to ${role?.name || 'station'}`);

    // Automatically trigger WhatsApp notification to the assigned member for confirmation
    if (memberId) {
      openWhatsAppModalForAssignment(programId, roleId, memberId);
    }
  };

  const autoFillRoster = (programId: string) => {
    const prog = programs.find((p) => p.id === programId);
    if (!prog) return;

    let filledCount = 0;

    setAssignments((prev) => {
      // Collect currently assigned members in this specific program
      const bookedMemberIds = new Set<string>();
      prev
        .filter((a) => a.programId === programId && a.memberId)
        .forEach((a) => bookedMemberIds.add(a.memberId as string));

      const updated = [...prev];

      roles.forEach((role) => {
        const existingIdx = updated.findIndex(
          (a) => a.programId === programId && a.roleId === role.id
        );

        if (existingIdx !== -1) {
          const currentAsg = updated[existingIdx];
          if (!currentAsg.memberId) {
            const candidate = members.find(
              (m) =>
                m.status === 'active' &&
                !bookedMemberIds.has(m.id) &&
                (m.primaryRole === role.id || m.secondaryRoles.includes(role.id))
            );
            if (candidate) {
              bookedMemberIds.add(candidate.id);
              filledCount += 1;
              updated[existingIdx] = {
                ...currentAsg,
                memberId: candidate.id,
                status: 'pending',
                declineReason: undefined,
                confirmedAt: undefined,
              };
            }
          }
        } else {
          const candidate = members.find(
            (m) =>
              m.status === 'active' &&
              !bookedMemberIds.has(m.id) &&
              (m.primaryRole === role.id || m.secondaryRoles.includes(role.id))
          );
          if (candidate) {
            bookedMemberIds.add(candidate.id);
            filledCount += 1;
            updated.push({
              id: generateUniqueId('asg'),
              programId,
              roleId: role.id,
              memberId: candidate.id,
              status: 'pending',
              remindersSent: [],
            });
          }
        }
      });

      return updated;
    });

    logAction(
      currentMember.name,
      'Auto-Filled Roster',
      `Auto-filled available qualified media crew into stations for ${prog.title}.`,
      'assignment'
    );
    showToast(`Auto-filled qualified crew into vacant stations!`);
  };

  const removeAssignment = (assignmentId: string) => {
    const asg = assignments.find((a) => a.id === assignmentId);
    const role = roles.find((r) => r.id === asg?.roleId);
    const prog = programs.find((p) => p.id === asg?.programId);

    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    logAction(
      currentMember.name,
      'Removed Assignment',
      `Removed assignment for ${role?.name} in ${prog?.title}.`,
      'assignment'
    );
    showToast(`Assignment removed.`);
  };

  const replaceAssignment = (assignmentId: string, newMemberId: string) => {
    const originalAsg = assignments.find((a) => a.id === assignmentId);
    if (!originalAsg) return;

    const previousMember = members.find((m) => m.id === originalAsg.memberId);
    const newMember = members.find((m) => m.id === newMemberId);
    const role = roles.find((r) => r.id === originalAsg.roleId);
    const prog = programs.find((p) => p.id === originalAsg.programId);

    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === assignmentId) {
          return {
            ...a,
            memberId: newMemberId,
            status: 'pending',
            replacementForMemberId: originalAsg.memberId || undefined,
            declineReason: undefined,
            confirmedAt: undefined,
            remindersSent: ['replacement-alert'],
          };
        }
        return a;
      })
    );

    logAction(
      currentMember.name,
      'Assigned Replacement',
      `Replaced ${previousMember?.name || 'declined member'} with ${newMember?.name} for ${role?.name} in ${prog?.title}.`,
      'replacement'
    );
    showToast(`Replacement assigned! ${newMember?.name} has been placed on duty.`);

    // Automatically trigger WhatsApp notification to the replacement member
    if (newMemberId && originalAsg) {
      openWhatsAppModalForAssignment(originalAsg.programId, originalAsg.roleId, newMemberId);
    }
  };

  const triggerManualReminder = (programId: string, intervalLabel: string = 'Manual Reminder') => {
    const prog = programs.find((p) => p.id === programId);
    const progAssignments = assignments.filter((a) => a.programId === programId && a.memberId);

    setAssignments((prev) =>
      prev.map((a) => {
        if (a.programId === programId && a.memberId) {
          return {
            ...a,
            remindersSent: [...new Set([...a.remindersSent, intervalLabel])],
          };
        }
        return a;
      })
    );

    logAction(
      currentMember.name,
      'Dispatched Reminder',
      `Dispatched "${intervalLabel}" reminder to ${progAssignments.length} crew members for ${prog?.title}.`,
      'reminder'
    );
    showToast(`Reminders successfully broadcast to ${progAssignments.length} team members!`);
  };

  // Program Management
  const createProgram = (newProg: Omit<ProgramService, 'id'>) => {
    const id = generateUniqueId('prog');
    const created: ProgramService = {
      ...newProg,
      id,
    };
    setPrograms((prev) => [created, ...prev]);

    // Prepopulate assignments with default roles (unassigned or pending)
    const initialAsgs: RoleAssignment[] = roles.slice(0, 7).map((role) => ({
      id: generateUniqueId('asg'),
      programId: id,
      roleId: role.id,
      memberId: null,
      status: 'pending',
      remindersSent: [],
    }));
    setAssignments((prev) => [...prev, ...initialAsgs]);

    logAction(
      currentMember.name,
      'Created Program',
      `Created new service "${newProg.title}" on ${newProg.date}.`,
      'system'
    );
    showToast(`Service "${newProg.title}" created with media roster template!`);
    return id;
  };

  const updateProgram = (updatedProg: ProgramService) => {
    setPrograms((prev) => prev.map((p) => (p.id === updatedProg.id ? updatedProg : p)));
    logAction(
      currentMember.name,
      'Updated Program',
      `Updated service details for "${updatedProg.title}".`,
      'system'
    );
    showToast(`Program updated.`);
  };

  const deleteProgram = (programId: string) => {
    const prog = programs.find((p) => p.id === programId);
    setPrograms((prev) => prev.filter((p) => p.id !== programId));
    setAssignments((prev) => prev.filter((a) => a.programId !== programId));
    logAction(
      currentMember.name,
      'Deleted Program',
      `Deleted service "${prog?.title}".`,
      'system'
    );
    showToast(`Service deleted.`);
  };

  // Members Management
  const addMember = (newMem: Omit<TeamMember, 'id'>) => {
    const cleanEmail = newMem.email.trim().toLowerCase();
    const normalizeDigits = (p: string) => {
      const digits = p.replace(/\D/g, '');
      if (digits.startsWith('0') && digits.length === 10) {
        return '233' + digits.substring(1);
      }
      return digits;
    };

    const emailExists =
      accounts.some((a) => a.email.toLowerCase() === cleanEmail) ||
      members.some((m) => m.email.toLowerCase() === cleanEmail);
    if (emailExists) {
      showToast(`Cannot add: A member with email "${newMem.email}" already exists in the roster.`);
      return '';
    }

    const candPhoneNorm = normalizeDigits(newMem.phone);
    if (candPhoneNorm.length >= 7) {
      const phoneExists = members.some((m) => normalizeDigits(m.phone) === candPhoneNorm);
      if (phoneExists) {
        showToast(`Cannot add: A member with phone number "${newMem.phone}" already exists in the roster.`);
        return '';
      }
    }

    const id = generateUniqueId('mem');
    const created: TeamMember = {
      ...newMem,
      id,
    };
    setMembers((prev) => [...prev, created]);

    // Create an account for them
    const newAcc: UserAccount = {
      id: generateUniqueId('acc'),
      email: newMem.email,
      memberId: id,
      allowedPortals: ['team'],
      defaultPortal: 'team',
    };
    setAccounts((prev) => [...prev, newAcc]);

    logAction(
      currentMember.name,
      'Added Team Member',
      `Added ${newMem.name} to media database with role ${newMem.primaryRole}.`,
      'system'
    );
    showToast(`Added member ${newMem.name} to the AKWC Media Team roster!`);
    return id;
  };

  const updateMember = (updatedMem: TeamMember) => {
    setMembers((prev) => prev.map((m) => (m.id === updatedMem.id ? updatedMem : m)));
    logAction(
      currentMember.name,
      'Updated Team Member',
      `Updated profile information for ${updatedMem.name}.`,
      'system'
    );
    showToast(`Member profile updated.`);
  };

  const deleteMember = (memberId: string) => {
    const mem = members.find((m) => m.id === memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setAccounts((prev) => prev.filter((a) => a.memberId !== memberId));
    setAssignments((prev) =>
      prev.map((a) => (a.memberId === memberId ? { ...a, memberId: null, status: 'pending' } : a))
    );
    logAction(
      currentMember.name,
      'Removed Member',
      `Removed ${mem?.name} from roster.`,
      'system'
    );
    showToast(`Member removed from roster.`);
  };

  // Announcements
  const addAnnouncement = (newAnn: Omit<Announcement, 'id'>) => {
    const created: Announcement = {
      ...newAnn,
      id: generateUniqueId('ann'),
    };
    setAnnouncements((prev) => [created, ...prev]);
    showToast(`Announcement published!`);
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    showToast(`Announcement removed.`);
  };

  const updateVerse = (newVerse: VerseOfTheDay) => {
    setVerse(newVerse);
    showToast(`Verse of the Day updated.`);
  };

  const updateReminderConfig = (config: ReminderConfig) => {
    setReminderConfig(config);
    showToast(`Reminder schedules updated.`);
  };

  const resetToDefaults = () => {
    setRoles(INITIAL_ROLES);
    setMembers(INITIAL_MEMBERS);
    setAccounts(INITIAL_ACCOUNTS);
    setPrograms(INITIAL_PROGRAMS);
    setAssignments(INITIAL_ASSIGNMENTS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setVerse(INITIAL_VERSE);
    setReminderConfig(INITIAL_REMINDER_CONFIG);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentAccountId('acc-ebenezer');
    setActivePortal('team');
    showToast(`Database reset to pristine AKWC default state.`);
  };

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        isSuperAdmin,
        currentAccount,
        currentMember,
        activePortal,
        availableAccounts: accounts,
        switchAccount,
        switchPortal,
        logout,
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
        updateAccountPrivileges,
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
