export type AttendanceStatus = 'present' | 'absent' | 'pending';

export type ThemeColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'slate' | 'rose' | 'teal' | 'monochrome';
export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSizePreference = 'compact' | 'normal' | 'comfortable';
export type LogoPreset = 'crown' | 'building' | 'shield' | 'award' | 'users' | 'star' | 'flame' | 'sparkles';

export interface AppSettings {
  // Branding & Identity
  orgName: string;
  orgSubtitle: string;
  logoType: 'preset' | 'custom';
  customLogoUrl: string;
  presetIcon: LogoPreset;
  authorizedSigner: string;
  showLogoInReports: boolean;

  // Themes & Appearance
  themeColor: ThemeColor;
  mode: ThemeMode;
  fontSize: FontSizePreference;

  // PDF & Print Settings
  printHeaderTitle: string;
  printFooterNote: string;
  includeStcInPrint: boolean;
  includeEmailInPrint: boolean;
  includeSignaturesInPrint: boolean;
  includeStatsInPrint: boolean;

  // Attendance & UX Preferences
  soundEnabled: boolean;
  confettiEnabled: boolean;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  phone: string;
  stcNumber: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  personId: string;
  name: string;
  email: string;
  phone: string;
  stcNumber: string;
  status: AttendanceStatus;
  markedAt?: string;
}

export interface AttendanceRound {
  id: string;
  name: string;
  createdAt: string;
  notes?: string;
  records: Record<string, AttendanceStatus>;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  location?: string;
  notes?: string;
  attendees: EventAttendee[];
  rounds?: AttendanceRound[];
  activeRoundId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventReport {
  event: EventItem;
  totalCount: number;
  presentCount: number;
  absentCount: number;
  pendingCount: number;
  presentPercentage: number;
  absentPercentage: number;
}

