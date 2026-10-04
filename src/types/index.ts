export type RoleCategory = 'audio' | 'video' | 'visuals' | 'lighting' | 'creative' | 'it' | 'logistics' | 'admin';

export type SkillLevel = 'Lead' | 'Senior' | 'Intermediate' | 'Apprentice';

export type AssignmentStatus = 'confirmed' | 'pending' | 'declined';

export type PortalType = 'admin' | 'leadership' | 'team';

export interface MediaRole {
  id: string;
  name: string;
  category: RoleCategory;
  description: string;
  defaultCount: number;
  station: string;
  skillRequired: SkillLevel;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender?: 'Male' | 'Female';
  avatarUrl?: string;
  primaryRole: string;
  secondaryRoles: string[];
  skillLevel: SkillLevel;
  rawSkillDescription?: string;
  availability?: 'Flexible' | 'Both Sundays & Weekdays' | 'Sundays only';
  status: 'active' | 'leave' | 'training';
  joinedDate: string;
  notes?: string;
  blackoutDates?: string[]; // ISO date strings when member is unavailable
}

export interface UserAccount {
  id: string;
  email: string;
  memberId: string;
  allowedPortals: PortalType[];
  defaultPortal: PortalType;
  password?: string;
  hasSetPassword?: boolean;
  passwordSetAt?: string;
}

export interface RegisterMemberData {
  name: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female';
  primaryRole: string;
  secondaryRoles: string[];
  skillLevel: SkillLevel;
  rawSkillDescription: string;
  availability: 'Flexible' | 'Both Sundays & Weekdays' | 'Sundays only';
  notes: string;
  password: string;
}

export interface RoleAssignment {
  id: string;
  programId: string;
  roleId: string;
  memberId: string | null;
  status: AssignmentStatus;
  confirmedAt?: string;
  declineReason?: string;
  replacementForMemberId?: string;
  remindersSent: string[]; // e.g. ['7d', '3d', '24h']
  whatsappNotificationSent?: boolean;
  whatsappNotificationAt?: string;
  arrivalComment?: string; // Note/comment if member cannot arrive on time
  estimatedArrivalTime?: string; // e.g. '8:30 AM'
}

export interface ProgramService {
  id: string;
  title: string;
  serviceType: 'Sunday Divine Service' | 'Sunday Second Service' | 'Wednesday Midweek' | 'Friday Prophetic' | 'Youth Service' | 'Special Event';
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. '08:00 AM'
  endTime: string; // e.g. '11:00 AM'
  callTime: string; // e.g. '07:00 AM' (1 hr before)
  location: string;
  theme?: string;
  directorName: string;
  googleCalendarEventId?: string;
  isCompleted?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  priority: 'normal' | 'urgent';
  tag: string;
}

export interface VerseOfTheDay {
  verse: string;
  reference: string;
  reflection: string;
  date: string;
}

export interface ReminderConfig {
  intervals: {
    id: string;
    label: string;
    offsetMinutes: number; // e.g., 7 days = 10080 mins
    enabled: boolean;
  }[];
  autoReplacementAlert: boolean;
  whatsappTemplate: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  details: string;
  type: 'assignment' | 'confirmation' | 'decline' | 'replacement' | 'reminder' | 'system';
}
