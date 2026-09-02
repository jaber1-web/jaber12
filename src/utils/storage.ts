import { EventItem, Person, EventAttendee, AttendanceStatus, AppSettings } from '../types';

const STORAGE_EVENTS_KEY = 'event_attendance_events_v2';
const STORAGE_PERSONS_KEY = 'event_attendance_persons_v2';
const STORAGE_SETTINGS_KEY = 'event_attendance_settings_v2';

export const DEFAULT_SETTINGS: AppSettings = {
  orgName: 'نظام إدارة الحضور والفعاليات',
  orgSubtitle: '',
  logoType: 'preset',
  customLogoUrl: '',
  presetIcon: 'building',
  authorizedSigner: '',
  showLogoInReports: true,

  themeColor: 'blue',
  mode: 'light',
  fontSize: 'normal',

  printHeaderTitle: 'تقرير كشف الحضور',
  printFooterNote: 'تم استخراج هذا التقرير آلياً من نظام إدارة الحضور.',
  includeStcInPrint: true,
  includeEmailInPrint: false,
  includeSignaturesInPrint: false,
  includeStatsInPrint: true,

  soundEnabled: true,
  confettiEnabled: true,
};

const INITIAL_PERSONS: Person[] = [];

const INITIAL_EVENTS: EventItem[] = [];

export function getStoredPersons(): Person[] {
  try {
    const raw = localStorage.getItem(STORAGE_PERSONS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PERSONS_KEY, JSON.stringify(INITIAL_PERSONS));
      return INITIAL_PERSONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading persons', e);
    return INITIAL_PERSONS;
  }
}

export function savePersons(persons: Person[]): void {
  try {
    localStorage.setItem(STORAGE_PERSONS_KEY, JSON.stringify(persons));
  } catch (e) {
    console.error('Error saving persons', e);
  }
}

export function upsertPerson(personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Person {
  const persons = getStoredPersons();
  const now = new Date().toISOString();
  
  if (personData.id) {
    const idx = persons.findIndex(p => p.id === personData.id);
    if (idx >= 0) {
      const updated: Person = {
        ...persons[idx],
        ...personData,
        id: personData.id,
        updatedAt: now,
      };
      persons[idx] = updated;
      savePersons(persons);
      return updated;
    }
  }

  // Check if person exists by phone, STC, or email
  const existingIdx = persons.findIndex(p => 
    (personData.phone && p.phone === personData.phone) ||
    (personData.stcNumber && p.stcNumber.toLowerCase() === personData.stcNumber.toLowerCase()) ||
    (personData.email && p.email.toLowerCase() === personData.email.toLowerCase())
  );

  if (existingIdx >= 0) {
    const updated: Person = {
      ...persons[existingIdx],
      name: personData.name || persons[existingIdx].name,
      email: personData.email || persons[existingIdx].email,
      phone: personData.phone || persons[existingIdx].phone,
      stcNumber: personData.stcNumber || persons[existingIdx].stcNumber,
      updatedAt: now,
    };
    persons[existingIdx] = updated;
    savePersons(persons);
    return updated;
  }

  // Create new person
  const newPerson: Person = {
    id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: personData.name.trim(),
    email: personData.email.trim(),
    phone: personData.phone.trim(),
    stcNumber: personData.stcNumber.trim(),
    notes: personData.notes,
    createdAt: now,
    updatedAt: now,
  };
  persons.unshift(newPerson);
  savePersons(persons);
  return newPerson;
}

export function deletePerson(personId: string): void {
  const persons = getStoredPersons().filter(p => p.id !== personId);
  savePersons(persons);
}

export function getStoredEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_EVENTS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(INITIAL_EVENTS));
      return INITIAL_EVENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading events', e);
    return INITIAL_EVENTS;
  }
}

export function saveEvents(events: EventItem[]): void {
  try {
    localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Error saving events', e);
  }
}

export function createEvent(title: string, date: string, location?: string, notes?: string): EventItem {
  const events = getStoredEvents();
  const newEvent: EventItem = {
    id: `evt-${Date.now()}`,
    title: title.trim(),
    date: date,
    location: location?.trim() || '',
    notes: notes?.trim() || '',
    attendees: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  events.unshift(newEvent);
  saveEvents(events);
  return newEvent;
}

export function updateEvent(eventId: string, updates: Partial<Omit<EventItem, 'id' | 'createdAt'>>): EventItem | null {
  const events = getStoredEvents();
  const idx = events.findIndex(e => e.id === eventId);
  if (idx === -1) return null;

  events[idx] = {
    ...events[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveEvents(events);
  return events[idx];
}

export function deleteEvent(eventId: string): void {
  const events = getStoredEvents().filter(e => e.id !== eventId);
  saveEvents(events);
}

// Play audio feedback for quick attendance check
export function playAttendanceFeedback(status: 'present' | 'absent', soundEnabled = true) {
  if (!soundEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (status === 'present') {
      // Pleasant high double ping
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      // Crisp low tone for absent
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(240, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // Audio context not allowed or supported; silent fallback
  }
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.error('Error loading settings', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export interface FullBackupPayload {
  version: string;
  exportedAt: string;
  events: EventItem[];
  persons: Person[];
  settings: AppSettings;
}

export function exportAllBackupData(): FullBackupPayload {
  return {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    events: getStoredEvents(),
    persons: getStoredPersons(),
    settings: getStoredSettings(),
  };
}

export function importBackupData(payload: FullBackupPayload): { success: boolean; message: string } {
  try {
    if (!payload || !Array.isArray(payload.events) || !Array.isArray(payload.persons)) {
      return { success: false, message: 'صيغة ملف النسخة الاحتياطية غير صالحة' };
    }

    saveEvents(payload.events);
    savePersons(payload.persons);
    if (payload.settings) {
      saveSettings(payload.settings);
    }

    return { success: true, message: `تم استعادة ${payload.events.length} فعالية و ${payload.persons.length} شخص بنجاح!` };
  } catch (err) {
    console.error('Import error', err);
    return { success: false, message: 'حدث خطأ أثناء قراءة ملف النسخة الاحتياطية' };
  }
}

export function resetToDefaultData(): void {
  localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify([]));
  localStorage.setItem(STORAGE_PERSONS_KEY, JSON.stringify([]));
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
}

export function clearAllData(): void {
  localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify([]));
  localStorage.setItem(STORAGE_PERSONS_KEY, JSON.stringify([]));
  localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
}

