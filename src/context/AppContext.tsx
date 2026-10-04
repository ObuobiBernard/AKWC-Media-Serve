import React, { createContext, useContext, useState, useEffect } from 'react';
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
  confirmAttendance: (assignmentId: string) => void;
  declineAttendance: (assignmentId: string, reason: string) => void;
  assignMemberToRole: (programId: string, roleId: string, memberId: string) => void;
  autoFillRoster: (programId: string) => void;
  removeAssignment: (assignmentId: string) => void;
  replaceAssignment: (assignmentId: string, newMemberId: string) => void;
  triggerManualReminder: (programId: string, intervalLabel?: string) => void;

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
    return saved ? JSON.parse(saved) : INITIAL_REMINDER_CONFIG;
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
  const confirmAttendance = (assignmentId: string) => {
    setAssignments((prev) =>
      prev.map((asg) => {
        if (asg.id === assignmentId) {
          return {
            ...asg,
            status: 'confirmed',
            confirmedAt: new Date().toISOString(),
            declineReason: undefined,
          };
        }
        return asg;
      })
    );

    const asg = assignments.find((a) => a.id === assignmentId);
    const prog = programs.find((p) => p.id === asg?.programId);
    logAction(
      currentMember.name,
      'Confirmed Attendance',
      `Confirmed attendance for ${prog?.title || 'service'}.`,
      'confirmation'
    );
    showToast(`Attendance confirmed! Thank you for serving, ${currentMember.name}.`);
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
