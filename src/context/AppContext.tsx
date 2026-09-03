import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { User, onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import {
  EventItem,
  Person,
  EventAttendee,
  AttendanceStatus,
  AttendanceRound,
  AppSettings,
  ThemeMode,
} from '../types';
import {
  DEFAULT_SETTINGS,
  getStoredEvents,
  saveEvents,
  getStoredPersons,
  savePersons,
  getStoredSettings,
  saveSettings,
  FullBackupPayload,
  playAttendanceFeedback,
} from '../utils/storage';
import {
  subscribeToEvents,
  subscribeToPersons,
  subscribeToSettings,
  saveEventToFirestore,
  deleteEventFromFirestore,
  savePersonToFirestore,
  deletePersonFromFirestore,
  saveSettingsToFirestore,
  batchImportAllToFirestore,
  checkAndMigrateLocalStorageToFirestore,
  forceSyncLocalToFirestore,
  clearAllUserDataFromFirestore,
  testFirestoreConnection,
} from '../services/firestoreService';

interface AppContextType {
  // User & Auth State
  user: User | null;
  effectiveUserId: string;
  isAuthLoading: boolean;
  isDataLoading: boolean;
  isSyncing: boolean;
  isCloudConnected: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
  syncNow: () => Promise<void>;

  // Data State
  events: EventItem[];
  persons: Person[];
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;

  // Event Actions
  createEvent: (eventData: {
    title: string;
    date: string;
    location: string;
    notes?: string;
    selectedPersonIds: string[];
    customAttendees: Array<{ name: string; email?: string; phone?: string; stcNumber?: string }>;
  }) => EventItem;
  updateEvent: (updatedEvent: EventItem) => void;
  deleteEvent: (eventId: string) => void;
  getEventById: (eventId: string) => EventItem | undefined;

  // Attendee Actions
  updateAttendeeStatus: (eventId: string, personId: string, status: AttendanceStatus) => void;
  markAllAttendees: (eventId: string, status: AttendanceStatus) => void;
  addAttendeeToEvent: (
    eventId: string,
    attendeeData: { name: string; email?: string; phone?: string; stcNumber?: string },
    saveToGlobal: boolean
  ) => void;
  addMultipleAttendeesToEvent: (
    eventId: string,
    attendeesData: Array<{ name: string; email?: string; phone?: string; stcNumber?: string }>,
    saveToGlobal: boolean
  ) => void;
  addExistingPersonsToEvent: (eventId: string, selectedPersons: Person[]) => void;
  removeAttendeeFromEvent: (eventId: string, personId: string) => void;
  editAttendeeInEvent: (eventId: string, updatedAttendee: EventAttendee, updateGlobal: boolean) => void;

  // Periodic Attendance Rounds Actions
  createAttendanceRound: (eventId: string, roundName?: string, copyPrevious?: boolean) => AttendanceRound;
  deleteAttendanceRound: (eventId: string, roundId: string) => void;
  renameAttendanceRound: (eventId: string, roundId: string, newName: string) => void;
  setActiveAttendanceRound: (eventId: string, roundId: string) => void;
  updateAttendeeRoundStatus: (
    eventId: string,
    roundId: string,
    personId: string,
    status: AttendanceStatus
  ) => void;
  markAllRoundAttendees: (
    eventId: string,
    roundId: string,
    status: AttendanceStatus
  ) => void;

  // Directory / Person Actions
  addPerson: (person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (personId: string) => void;
  importPersons: (persons: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>[]) => void;

  // Backup & Restore
  exportAllBackupData: () => FullBackupPayload;
  importBackupData: (payload: FullBackupPayload) => Promise<{ success: boolean; message: string }>;
  resetToDefaultData: () => Promise<void>;
  clearAllData: () => Promise<void>;

  // Auth Actions & Modal
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  signOutUser: () => Promise<void>;

  // Modals & Theme State
  isDarkMode: boolean;
  toggleThemeMode: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  reportModalEvent: EventItem | null;
  setReportModalEvent: (event: EventItem | null) => void;
  pdfModalEvent: EventItem | null;
  setPdfModalEvent: (event: EventItem | null) => void;
  isCreateEventOpen: boolean;
  setIsCreateEventOpen: (open: boolean) => void;
  isEditEventOpen: boolean;
  setIsEditEventOpen: (open: boolean) => void;
  editingEvent: EventItem | null;
  setEditingEvent: (event: EventItem | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Initialize with local cache for instant UI rendering with 0ms delay
  const [events, setEvents] = useState<EventItem[]>(() => getStoredEvents());
  const [persons, setPersons] = useState<Person[]>(() => getStoredPersons());
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());

  // Modals state
  const [reportModalEvent, setReportModalEvent] = useState<EventItem | null>(null);
  const [pdfModalEvent, setPdfModalEvent] = useState<EventItem | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const effectiveUserId = user ? user.uid : 'default_user';

  // 1. Silent Auth setup
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthLoading(false);
      } else {
        setUser(null);
        setIsAuthLoading(false);
        try {
          const cred = await signInAnonymously(auth);
          setUser(cred.user);
        } catch (err: any) {
          // Anonymous auth fallback
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore Subscriptions & Initial Sync
  useEffect(() => {
    // Test server connectivity on mount
    testFirestoreConnection()
      .then((connected) => {
        setIsCloudConnected(connected);
      })
      .catch(() => {});

    // Initial check to upload any locally created data to Firestore
    checkAndMigrateLocalStorageToFirestore()
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch(() => {});

    const unsubEvents = subscribeToEvents(
      (firestoreEvents) => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
        setSyncError(null);

        const validEvents = firestoreEvents.filter(
          (e) => e && e.id && !e.id.includes('batch-test') && e.title !== 'Batch Event' && !e.id.includes('verify-')
        );

        setEvents(validEvents);
        saveEvents(validEvents);
      },
      (err) => {
        console.warn('Firestore events subscription warning:', err);
        setSyncError('تعذر الاتصال بالسحابة مؤقتاً، يتم الحفظ محلياً');
      }
    );

    const unsubPersons = subscribeToPersons(
      (firestorePersons) => {
        setIsCloudConnected(true);
        const validPersons = firestorePersons.filter(
          (p) => p && p.id && !p.id.includes('batch-test') && p.name !== 'Batch Person' && !p.id.includes('verify-')
        );
        setPersons(validPersons);
        savePersons(validPersons);
      },
      (err) => {
        console.warn('Firestore persons subscription warning:', err);
      }
    );

    const unsubSettings = subscribeToSettings(
      (firestoreSettings) => {
        setSettings(firestoreSettings);
        saveSettings(firestoreSettings);
      },
      (err) => {
        console.warn('Firestore settings subscription warning:', err);
      }
    );

    return () => {
      unsubEvents();
      unsubPersons();
      unsubSettings();
    };
  }, []);

  // Dynamic dark mode state computation
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const s = getStoredSettings();
    if (s.mode === 'dark') return true;
    if (s.mode === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode & theme preferences to root element
  useEffect(() => {
    const updateTheme = () => {
      let isDark = false;
      if (settings.mode === 'dark') {
        isDark = true;
      } else if (settings.mode === 'light') {
        isDark = false;
      } else {
        isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }

      // Apply dynamic brand theme attribute
      document.documentElement.setAttribute('data-theme', settings.themeColor || 'blue');
      document.documentElement.setAttribute('data-fontsize', settings.fontSize || 'normal');
    };

    updateTheme();

    if (settings.mode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => updateTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [settings.mode, settings.themeColor, settings.fontSize]);

  const toggleThemeMode = () => {
    const nextMode: ThemeMode = isDarkMode ? 'light' : 'dark';
    updateSettings({ mode: nextMode });
  };

  const setThemeMode = (mode: ThemeMode) => {
    updateSettings({ mode });
  };

  // Sign out user
  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Manual Sync trigger
  const syncNow = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await forceSyncLocalToFirestore();
      setIsCloudConnected(true);
      setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
    } catch (err: any) {
      console.error('Manual sync error:', err);
      setSyncError('تعذر إنهاء المزامنة السحابية');
    } finally {
      setIsSyncing(false);
    }
  };

  // Update Settings
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = {
      ...settings,
      ...newSettings,
    };
    setSettings(updated);
    saveSettings(updated);

    setIsSyncing(true);
    try {
      await saveSettingsToFirestore(updated);
      setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
    } catch (err) {
      console.error('Error saving settings to Firestore:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const getEventById = (eventId: string) => {
    return events.find((e) => e.id === eventId);
  };

  // Create Event
  const createEvent = (eventData: {
    title: string;
    date: string;
    location: string;
    notes?: string;
    selectedPersonIds: string[];
    customAttendees: Array<{ name: string; email?: string; phone?: string; stcNumber?: string }>;
  }): EventItem => {
    const attendeesList: EventAttendee[] = [];

    // From global directory
    (eventData.selectedPersonIds || []).forEach((pId) => {
      const p = persons.find((item) => item.id === pId);
      if (p) {
        attendeesList.push({
          personId: p.id,
          name: p.name,
          email: p.email || '',
          phone: p.phone || '',
          stcNumber: p.stcNumber || '',
          status: 'pending',
        });
      }
    });

    // Custom attendees
    const newPersonsToAdd: Person[] = [];
    (eventData.customAttendees || []).forEach((ca, idx) => {
      const newPersonId = `p-${Date.now()}-${idx}`;
      attendeesList.push({
        personId: newPersonId,
        name: ca.name,
        email: ca.email || '',
        phone: ca.phone || '',
        stcNumber: ca.stcNumber || '',
        status: 'pending',
      });

      const newPersonDoc: Person = {
        id: newPersonId,
        name: ca.name,
        email: ca.email || '',
        phone: ca.phone || '',
        stcNumber: ca.stcNumber || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newPersonsToAdd.push(newPersonDoc);
    });

    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      title: eventData.title.trim(),
      date: eventData.date,
      location: (eventData.location || '').trim(),
      notes: (eventData.notes || '').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attendees: attendeesList,
    };

    // Immediate state & local storage update for instant response
    const updatedEvents = [newEvent, ...events];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (newPersonsToAdd.length > 0) {
      const updatedPersons = [...newPersonsToAdd, ...persons];
      setPersons(updatedPersons);
      savePersons(updatedPersons);
    }

    // Direct Firestore cloud sync
    setIsSyncing(true);
    setSyncError(null);
    Promise.all([
      saveEventToFirestore(newEvent),
      ...newPersonsToAdd.map((p) => savePersonToFirestore(p)),
    ])
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch((err) => {
        console.error('Error creating event in Firestore:', err);
        setSyncError('تم الحفظ محلياً، وسيتم رفعه تلقائياً');
      })
      .finally(() => setIsSyncing(false));

    return newEvent;
  };

  // Update Event
  const updateEvent = (updatedEvent: EventItem) => {
    const finalEvent = {
      ...updatedEvent,
      location: updatedEvent.location || '',
      notes: updatedEvent.notes || '',
      updatedAt: new Date().toISOString(),
    };
    const updatedEvents = events.map((evt) => (evt.id === finalEvent.id ? finalEvent : evt));
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    setIsSyncing(true);
    saveEventToFirestore(finalEvent)
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch((err) => console.error('Error updating event in Firestore:', err))
      .finally(() => setIsSyncing(false));
  };

  // Delete Event
  const deleteEvent = (eventId: string) => {
    const updatedEvents = events.filter((evt) => evt.id !== eventId);
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (reportModalEvent?.id === eventId) {
      setReportModalEvent(null);
    }
    if (pdfModalEvent?.id === eventId) {
      setPdfModalEvent(null);
    }

    setIsSyncing(true);
    deleteEventFromFirestore(eventId)
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch((err) => console.error('Error deleting event from Firestore:', err))
      .finally(() => setIsSyncing(false));
  };

  // Update Attendee Status
  const updateAttendeeStatus = (eventId: string, personId: string, status: AttendanceStatus) => {
    if (status === 'present' || status === 'absent') {
      playAttendanceFeedback(status, settings.soundEnabled);
    }

    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;

      const activeRoundId = evt.activeRoundId || (evt.rounds && evt.rounds.length > 0 ? evt.rounds[evt.rounds.length - 1].id : undefined);
      const updatedRounds = evt.rounds && activeRoundId
        ? evt.rounds.map((r) => {
            if (r.id !== activeRoundId) return r;
            return {
              ...r,
              records: {
                ...r.records,
                [personId]: status,
              },
            };
          })
        : evt.rounds;

      const updated = {
        ...evt,
        rounds: updatedRounds,
        updatedAt: new Date().toISOString(),
        attendees: (evt.attendees || []).map((att) => {
          if (att.personId !== personId) return att;
          return {
            ...att,
            status,
            markedAt: status !== 'pending' ? new Date().toISOString() : '',
          };
        }),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave)
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('ar-SA')))
        .catch((err) => console.error('Error updating attendee status in Firestore:', err));
    }
  };

  // Mark All Attendees
  const markAllAttendees = (eventId: string, status: AttendanceStatus) => {
    if (status === 'present' || status === 'absent') {
      playAttendanceFeedback(status, settings.soundEnabled);
    }

    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;

      const activeRoundId = evt.activeRoundId || (evt.rounds && evt.rounds.length > 0 ? evt.rounds[evt.rounds.length - 1].id : undefined);
      const updatedRounds = evt.rounds && activeRoundId
        ? evt.rounds.map((r) => {
            if (r.id !== activeRoundId) return r;
            const newRecords = { ...r.records };
            (evt.attendees || []).forEach((att) => {
              newRecords[att.personId] = status;
            });
            return {
              ...r,
              records: newRecords,
            };
          })
        : evt.rounds;

      const updated = {
        ...evt,
        rounds: updatedRounds,
        updatedAt: new Date().toISOString(),
        attendees: (evt.attendees || []).map((att) => ({
          ...att,
          status,
          markedAt: status !== 'pending' ? new Date().toISOString() : '',
        })),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave)
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('ar-SA')))
        .catch((err) => console.error('Error marking all attendees in Firestore:', err));
    }
  };

  // Add Attendee to Event
  const addAttendeeToEvent = (
    eventId: string,
    attendeeData: { name: string; email?: string; phone?: string; stcNumber?: string },
    saveToGlobal: boolean
  ) => {
    const newPersonId = `p-${Date.now()}`;
    const newAttendee: EventAttendee = {
      personId: newPersonId,
      name: attendeeData.name.trim(),
      email: attendeeData.email || '',
      phone: attendeeData.phone || '',
      stcNumber: attendeeData.stcNumber || '',
      status: 'pending',
    };

    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;
      const updated = {
        ...evt,
        updatedAt: new Date().toISOString(),
        attendees: [newAttendee, ...(evt.attendees || [])],
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    let newPerson: Person | null = null;
    if (saveToGlobal) {
      newPerson = {
        id: newPersonId,
        name: attendeeData.name.trim(),
        email: attendeeData.email || '',
        phone: attendeeData.phone || '',
        stcNumber: attendeeData.stcNumber || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedPersons = [newPerson, ...persons];
      setPersons(updatedPersons);
      savePersons(updatedPersons);
    }

    setIsSyncing(true);
    Promise.all([
      updatedEventToSave ? saveEventToFirestore(updatedEventToSave) : Promise.resolve(),
      newPerson ? savePersonToFirestore(newPerson) : Promise.resolve(),
    ])
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch((err) => console.error('Error adding attendee in Firestore:', err))
      .finally(() => setIsSyncing(false));
  };

  // Add Multiple Attendees to Event
  const addMultipleAttendeesToEvent = (
    eventId: string,
    attendeesData: Array<{ name: string; email?: string; phone?: string; stcNumber?: string }>,
    saveToGlobal: boolean
  ) => {
    if (!attendeesData || attendeesData.length === 0) return;

    const newPersons: Person[] = [];
    const newAttendees: EventAttendee[] = attendeesData.map((att, idx) => {
      const personId = `p-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      if (saveToGlobal) {
        newPersons.push({
          id: personId,
          name: att.name.trim(),
          email: att.email || '',
          phone: att.phone || '',
          stcNumber: att.stcNumber || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return {
        personId,
        name: att.name.trim(),
        email: att.email || '',
        phone: att.phone || '',
        stcNumber: att.stcNumber || '',
        status: 'pending' as const,
      };
    });

    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;
      const updated = {
        ...evt,
        updatedAt: new Date().toISOString(),
        attendees: [...newAttendees, ...(evt.attendees || [])],
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (saveToGlobal && newPersons.length > 0) {
      const updatedPersons = [...newPersons, ...persons];
      setPersons(updatedPersons);
      savePersons(updatedPersons);
    }

    setIsSyncing(true);
    Promise.all([
      updatedEventToSave ? saveEventToFirestore(updatedEventToSave) : Promise.resolve(),
      ...(saveToGlobal ? newPersons.map((p) => savePersonToFirestore(p)) : []),
    ])
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch(console.error)
      .finally(() => setIsSyncing(false));
  };

  // Add Existing Persons to Event
  const addExistingPersonsToEvent = (eventId: string, selectedPersons: Person[]) => {
    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;
      const existingIds = new Set((evt.attendees || []).map((a) => a.personId));
      const newAttendees: EventAttendee[] = selectedPersons
        .filter((p) => !existingIds.has(p.id))
        .map((p) => ({
          personId: p.id,
          name: p.name,
          email: p.email || '',
          phone: p.phone || '',
          stcNumber: p.stcNumber || '',
          status: 'pending',
        }));

      const updated = {
        ...evt,
        updatedAt: new Date().toISOString(),
        attendees: [...(evt.attendees || []), ...newAttendees],
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave)
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('ar-SA')))
        .catch(console.error);
    }
  };

  // Remove Attendee from Event
  const removeAttendeeFromEvent = (eventId: string, personId: string) => {
    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;
      const updated = {
        ...evt,
        updatedAt: new Date().toISOString(),
        attendees: (evt.attendees || []).filter((a) => a.personId !== personId),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave)
        .then(() => setLastSyncedAt(new Date().toLocaleTimeString('ar-SA')))
        .catch(console.error);
    }
  };

  // Edit Attendee in Event
  const editAttendeeInEvent = (
    eventId: string,
    updatedAttendee: EventAttendee,
    updateGlobal: boolean
  ) => {
    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;
      const updated = {
        ...evt,
        updatedAt: new Date().toISOString(),
        attendees: (evt.attendees || []).map((a) =>
          a.personId === updatedAttendee.personId ? updatedAttendee : a
        ),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    let updatedPersonToSave: Person | null = null;
    if (updateGlobal) {
      const updatedPersons = persons.map((p) => {
        if (p.id === updatedAttendee.personId) {
          const updatedP: Person = {
            ...p,
            name: updatedAttendee.name,
            email: updatedAttendee.email || '',
            phone: updatedAttendee.phone || '',
            stcNumber: updatedAttendee.stcNumber || '',
            updatedAt: new Date().toISOString(),
          };
          updatedPersonToSave = updatedP;
          return updatedP;
        }
        return p;
      });
      setPersons(updatedPersons);
      savePersons(updatedPersons);
    }

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave).catch(console.error);
    }
    if (updateGlobal && updatedPersonToSave) {
      savePersonToFirestore(updatedPersonToSave).catch(console.error);
    }
  };

  // Create Periodic Attendance Round
  const createAttendanceRound = (eventId: string, roundName?: string, copyPrevious: boolean = true): AttendanceRound => {
    let newRound: AttendanceRound | null = null;
    let updatedEventToSave: EventItem | null = null;

    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;

      const existingRounds = evt.rounds || [];
      let baseRounds = [...existingRounds];

      // If no rounds exist yet, initialize Round 1 from current attendee statuses
      if (baseRounds.length === 0) {
        const initialRoundId = `round-init-${Date.now()}`;
        const initialRecords: Record<string, AttendanceStatus> = {};
        (evt.attendees || []).forEach((a) => {
          initialRecords[a.personId] = a.status;
        });
        baseRounds.push({
          id: initialRoundId,
          name: 'الجولة 1 (الحضور المبدئي)',
          createdAt: evt.createdAt || new Date().toISOString(),
          records: initialRecords,
        });
      }

      const prevRound = baseRounds[baseRounds.length - 1];
      const newRoundIndex = baseRounds.length + 1;
      const roundTimeFormatted = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      const finalName = roundName?.trim() || `الجولة ${newRoundIndex} (${roundTimeFormatted})`;

      const newRecords: Record<string, AttendanceStatus> = {};
      (evt.attendees || []).forEach((a) => {
        if (copyPrevious && prevRound && prevRound.records[a.personId]) {
          newRecords[a.personId] = prevRound.records[a.personId];
        } else {
          newRecords[a.personId] = 'pending';
        }
      });

      newRound = {
        id: `round-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: finalName,
        createdAt: new Date().toISOString(),
        records: newRecords,
      };

      const finalRounds = [...baseRounds, newRound];

      const updatedAttendees = (evt.attendees || []).map((att) => ({
        ...att,
        status: newRecords[att.personId] || att.status,
      }));

      const updated: EventItem = {
        ...evt,
        rounds: finalRounds,
        activeRoundId: newRound.id,
        attendees: updatedAttendees,
        updatedAt: new Date().toISOString(),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave).catch(console.error);
    }

    return newRound!;
  };

  // Delete Periodic Attendance Round
  const deleteAttendanceRound = (eventId: string, roundId: string) => {
    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;
      const remainingRounds = (evt.rounds || []).filter((r) => r.id !== roundId);
      const nextActiveRound = remainingRounds[remainingRounds.length - 1];
      const nextActiveId = nextActiveRound ? nextActiveRound.id : undefined;

      const updatedAttendees = (evt.attendees || []).map((att) => {
        if (nextActiveRound && nextActiveRound.records[att.personId]) {
          return { ...att, status: nextActiveRound.records[att.personId] };
        }
        return att;
      });

      const updated: EventItem = {
        ...evt,
        rounds: remainingRounds,
        activeRoundId: nextActiveId,
        attendees: updatedAttendees,
        updatedAt: new Date().toISOString(),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave).catch(console.error);
    }
  };

  // Rename Periodic Attendance Round
  const renameAttendanceRound = (eventId: string, roundId: string, newName: string) => {
    if (!newName.trim()) return;
    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;
      const updatedRounds = (evt.rounds || []).map((r) =>
        r.id === roundId ? { ...r, name: newName.trim() } : r
      );
      const updated: EventItem = {
        ...evt,
        rounds: updatedRounds,
        updatedAt: new Date().toISOString(),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave).catch(console.error);
    }
  };

  // Set Active Periodic Attendance Round
  const setActiveAttendanceRound = (eventId: string, roundId: string) => {
    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;
      const targetRound = (evt.rounds || []).find((r) => r.id === roundId);
      if (!targetRound) return evt;

      const updatedAttendees = (evt.attendees || []).map((att) => ({
        ...att,
        status: targetRound.records[att.personId] || 'pending',
      }));

      const updated: EventItem = {
        ...evt,
        activeRoundId: roundId,
        attendees: updatedAttendees,
        updatedAt: new Date().toISOString(),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave).catch(console.error);
    }
  };

  // Update Attendee Round Status
  const updateAttendeeRoundStatus = (
    eventId: string,
    roundId: string,
    personId: string,
    status: AttendanceStatus
  ) => {
    if (status === 'present' || status === 'absent') {
      playAttendanceFeedback(status, settings.soundEnabled);
    }

    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;

      const existingRounds = evt.rounds || [];
      const updatedRounds = existingRounds.map((r) => {
        if (r.id !== roundId) return r;
        return {
          ...r,
          records: {
            ...r.records,
            [personId]: status,
          },
        };
      });

      const isActive = evt.activeRoundId === roundId || (!evt.activeRoundId && existingRounds[existingRounds.length - 1]?.id === roundId);
      const updatedAttendees = (evt.attendees || []).map((att) => {
        if (att.personId !== personId || !isActive) return att;
        return {
          ...att,
          status,
          markedAt: status !== 'pending' ? new Date().toISOString() : '',
        };
      });

      const updated: EventItem = {
        ...evt,
        rounds: updatedRounds,
        attendees: updatedAttendees,
        updatedAt: new Date().toISOString(),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave).catch(console.error);
    }
  };

  // Mark All Round Attendees
  const markAllRoundAttendees = (
    eventId: string,
    roundId: string,
    status: AttendanceStatus
  ) => {
    if (status === 'present' || status === 'absent') {
      playAttendanceFeedback(status, settings.soundEnabled);
    }

    let updatedEventToSave: EventItem | null = null;
    const updatedEvents = events.map((evt) => {
      if (evt.id !== eventId) return evt;

      const existingRounds = evt.rounds || [];
      const updatedRounds = existingRounds.map((r) => {
        if (r.id !== roundId) return r;
        const newRecords = { ...r.records };
        (evt.attendees || []).forEach((att) => {
          newRecords[att.personId] = status;
        });
        return {
          ...r,
          records: newRecords,
        };
      });

      const isActive = evt.activeRoundId === roundId || (!evt.activeRoundId && existingRounds[existingRounds.length - 1]?.id === roundId);
      const updatedAttendees = (evt.attendees || []).map((att) => {
        if (!isActive) return att;
        return {
          ...att,
          status,
          markedAt: status !== 'pending' ? new Date().toISOString() : '',
        };
      });

      const updated: EventItem = {
        ...evt,
        rounds: updatedRounds,
        attendees: updatedAttendees,
        updatedAt: new Date().toISOString(),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave).catch(console.error);
    }
  };

  // Add Person to Directory
  const addPerson = (personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPerson: Person = {
      id: `p-${Date.now()}`,
      name: personData.name.trim(),
      email: personData.email || '',
      phone: personData.phone || '',
      stcNumber: personData.stcNumber || '',
      notes: personData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedPersons = [newPerson, ...persons];
    setPersons(updatedPersons);
    savePersons(updatedPersons);

    setIsSyncing(true);
    savePersonToFirestore(newPerson)
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch(console.error)
      .finally(() => setIsSyncing(false));
  };

  // Update Person in Directory
  const updatePerson = (updatedPerson: Person) => {
    const finalPerson = {
      ...updatedPerson,
      name: updatedPerson.name.trim(),
      email: updatedPerson.email || '',
      phone: updatedPerson.phone || '',
      stcNumber: updatedPerson.stcNumber || '',
      notes: updatedPerson.notes || '',
      updatedAt: new Date().toISOString(),
    };
    const updatedPersons = persons.map((p) => (p.id === finalPerson.id ? finalPerson : p));
    setPersons(updatedPersons);
    savePersons(updatedPersons);

    // Also update existing event attendees with this personId
    const eventsToUpdate: EventItem[] = [];
    const updatedEvents = events.map((evt) => {
      let hasChanges = false;
      const updatedAttendees = (evt.attendees || []).map((att) => {
        if (att.personId === finalPerson.id) {
          hasChanges = true;
          return {
            ...att,
            name: finalPerson.name,
            email: finalPerson.email,
            phone: finalPerson.phone,
            stcNumber: finalPerson.stcNumber,
          };
        }
        return att;
      });

      if (hasChanges) {
        const updatedEvt = { ...evt, attendees: updatedAttendees, updatedAt: new Date().toISOString() };
        eventsToUpdate.push(updatedEvt);
        return updatedEvt;
      }
      return evt;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    setIsSyncing(true);
    Promise.all([
      savePersonToFirestore(finalPerson),
      ...eventsToUpdate.map((e) => saveEventToFirestore(e)),
    ])
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch(console.error)
      .finally(() => setIsSyncing(false));
  };

  // Delete Person from Directory
  const deletePerson = (personId: string) => {
    const updatedPersons = persons.filter((p) => p.id !== personId);
    setPersons(updatedPersons);
    savePersons(updatedPersons);

    setIsSyncing(true);
    deletePersonFromFirestore(personId)
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch(console.error)
      .finally(() => setIsSyncing(false));
  };

  // Import Persons
  const importPersons = (newPersonsList: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const formatted: Person[] = newPersonsList.map((p, idx) => ({
      id: `p-imp-${Date.now()}-${idx}`,
      name: p.name.trim(),
      email: p.email || '',
      phone: p.phone || '',
      stcNumber: p.stcNumber || '',
      notes: p.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const updatedPersons = [...formatted, ...persons];
    setPersons(updatedPersons);
    savePersons(updatedPersons);

    setIsSyncing(true);
    Promise.all(formatted.map((p) => savePersonToFirestore(p)))
      .then(() => {
        setIsCloudConnected(true);
        setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
      })
      .catch(console.error)
      .finally(() => setIsSyncing(false));
  };

  // Export Full Backup Payload
  const exportAllBackupData = (): FullBackupPayload => {
    return {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      events,
      persons,
      settings,
    };
  };

  // Import Backup Data
  const importBackupData = async (payload: FullBackupPayload): Promise<{ success: boolean; message: string }> => {
    try {
      if (!payload || !Array.isArray(payload.events) || !Array.isArray(payload.persons)) {
        return { success: false, message: 'صيغة ملف النسخة الاحتياطية غير صالحة' };
      }

      setEvents(payload.events);
      saveEvents(payload.events);
      setPersons(payload.persons);
      savePersons(payload.persons);
      if (payload.settings) {
        setSettings(payload.settings);
        saveSettings(payload.settings);
      }

      setIsSyncing(true);
      await batchImportAllToFirestore({
        events: payload.events,
        persons: payload.persons,
        settings: payload.settings,
      });
      setIsSyncing(false);
      setIsCloudConnected(true);
      setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));

      return {
        success: true,
        message: `تم استعادة ${payload.events.length} فعالية و ${payload.persons.length} شخص وحفظها في قاعدة البيانات السحابية بنجاح!`,
      };
    } catch (err) {
      console.error('Import error:', err);
      setIsSyncing(false);
      return { success: false, message: 'حدث خطأ أثناء استعادة النسخة الاحتياطية' };
    }
  };

  // Reset to default data
  const resetToDefaultData = async () => {
    setEvents([]);
    saveEvents([]);
    setPersons([]);
    savePersons([]);
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);

    setIsSyncing(true);
    await clearAllUserDataFromFirestore();
    setIsSyncing(false);
    setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
  };

  // Clear all data
  const clearAllData = async () => {
    setEvents([]);
    saveEvents([]);
    setPersons([]);
    savePersons([]);
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);

    setIsSyncing(true);
    await clearAllUserDataFromFirestore();
    setIsSyncing(false);
    setLastSyncedAt(new Date().toLocaleTimeString('ar-SA'));
  };

  return (
    <AppContext.Provider
      value={{
        user,
        effectiveUserId,
        isAuthLoading,
        isDataLoading,
        isSyncing,
        isCloudConnected,
        lastSyncedAt,
        syncError,
        syncNow,
        events,
        persons,
        settings,
        updateSettings,
        createEvent,
        updateEvent,
        deleteEvent,
        getEventById,
        updateAttendeeStatus,
        markAllAttendees,
        addAttendeeToEvent,
        addMultipleAttendeesToEvent,
        addExistingPersonsToEvent,
        removeAttendeeFromEvent,
        editAttendeeInEvent,
        createAttendanceRound,
        deleteAttendanceRound,
        renameAttendanceRound,
        setActiveAttendanceRound,
        updateAttendeeRoundStatus,
        markAllRoundAttendees,
        addPerson,
        updatePerson,
        deletePerson,
        importPersons,
        exportAllBackupData,
        importBackupData,
        resetToDefaultData,
        clearAllData,
        isAuthModalOpen,
        setIsAuthModalOpen,
        signOutUser,
        isDarkMode,
        toggleThemeMode,
        setThemeMode,
        reportModalEvent,
        setReportModalEvent,
        pdfModalEvent,
        setPdfModalEvent,
        isCreateEventOpen,
        setIsCreateEventOpen,
        isEditEventOpen,
        setIsEditEventOpen,
        editingEvent,
        setEditingEvent,
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
