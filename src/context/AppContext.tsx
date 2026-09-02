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
  AppSettings,
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
  clearAllUserDataFromFirestore,
} from '../services/firestoreService';

interface AppContextType {
  // User & Auth State
  user: User | null;
  effectiveUserId: string;
  isAuthLoading: boolean;
  isDataLoading: boolean;
  isSyncing: boolean;

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

  // Active modals & selected state
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Initialize with local cache for instant UI rendering
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
          // Normal fallback if anonymous auth not enabled
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore Subscriptions & Initial Sync
  useEffect(() => {
    // Initial check to upload any locally created data to Firestore
    checkAndMigrateLocalStorageToFirestore().catch(() => {});

    const unsubEvents = subscribeToEvents((firestoreEvents) => {
      if (firestoreEvents.length > 0) {
        setEvents(firestoreEvents);
        saveEvents(firestoreEvents);
      } else {
        // If Firestore is empty, check if we have local events and upload them
        const local = getStoredEvents();
        if (local.length > 0) {
          local.forEach((e) => saveEventToFirestore(e).catch(() => {}));
        }
      }
    });

    const unsubPersons = subscribeToPersons((firestorePersons) => {
      if (firestorePersons.length > 0) {
        setPersons(firestorePersons);
        savePersons(firestorePersons);
      } else {
        const local = getStoredPersons();
        if (local.length > 0) {
          local.forEach((p) => savePersonToFirestore(p).catch(() => {}));
        }
      }
    });

    const unsubSettings = subscribeToSettings((firestoreSettings) => {
      setSettings(firestoreSettings);
      saveSettings(firestoreSettings);
    });

    return () => {
      unsubEvents();
      unsubPersons();
      unsubSettings();
    };
  }, []);

  // Apply dark mode & theme preferences to root element
  useEffect(() => {
    if (settings.mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.mode]);

  // Sign out user
  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
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
      title: eventData.title,
      date: eventData.date,
      location: eventData.location,
      notes: eventData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attendees: attendeesList,
    };

    // Immediate state & local storage update
    const updatedEvents = [newEvent, ...events];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (newPersonsToAdd.length > 0) {
      const updatedPersons = [...newPersonsToAdd, ...persons];
      setPersons(updatedPersons);
      savePersons(updatedPersons);
    }

    // Immediate Firestore cloud sync
    setIsSyncing(true);
    Promise.all([
      saveEventToFirestore(newEvent),
      ...newPersonsToAdd.map((p) => savePersonToFirestore(p)),
    ])
      .catch((err) => console.error('Error creating event in Firestore:', err))
      .finally(() => setIsSyncing(false));

    return newEvent;
  };

  // Update Event
  const updateEvent = (updatedEvent: EventItem) => {
    const finalEvent = { ...updatedEvent, updatedAt: new Date().toISOString() };
    const updatedEvents = events.map((evt) => (evt.id === finalEvent.id ? finalEvent : evt));
    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    setIsSyncing(true);
    saveEventToFirestore(finalEvent)
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
      const updated = {
        ...evt,
        updatedAt: new Date().toISOString(),
        attendees: (evt.attendees || []).map((att) => {
          if (att.personId !== personId) return att;
          return {
            ...att,
            status,
            markedAt: status !== 'pending' ? new Date().toISOString() : undefined,
          };
        }),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave).catch((err) =>
        console.error('Error updating attendee status in Firestore:', err)
      );
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
      const updated = {
        ...evt,
        updatedAt: new Date().toISOString(),
        attendees: (evt.attendees || []).map((att) => ({
          ...att,
          status,
          markedAt: status !== 'pending' ? new Date().toISOString() : undefined,
        })),
      };
      updatedEventToSave = updated;
      return updated;
    });

    setEvents(updatedEvents);
    saveEvents(updatedEvents);

    if (updatedEventToSave) {
      saveEventToFirestore(updatedEventToSave).catch((err) =>
        console.error('Error marking all attendees in Firestore:', err)
      );
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
      name: attendeeData.name,
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
        name: attendeeData.name,
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
          name: att.name,
          email: att.email || '',
          phone: att.phone || '',
          stcNumber: att.stcNumber || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      return {
        personId,
        name: att.name,
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
      saveEventToFirestore(updatedEventToSave).catch(console.error);
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
      saveEventToFirestore(updatedEventToSave).catch(console.error);
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

  // Add Person to Directory
  const addPerson = (personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPerson: Person = {
      id: `p-${Date.now()}`,
      ...personData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedPersons = [newPerson, ...persons];
    setPersons(updatedPersons);
    savePersons(updatedPersons);

    setIsSyncing(true);
    savePersonToFirestore(newPerson)
      .catch(console.error)
      .finally(() => setIsSyncing(false));
  };

  // Update Person in Directory
  const updatePerson = (updatedPerson: Person) => {
    const finalPerson = { ...updatedPerson, updatedAt: new Date().toISOString() };
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
      .catch(console.error)
      .finally(() => setIsSyncing(false));
  };

  // Import Persons
  const importPersons = (newPersonsList: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const formatted: Person[] = newPersonsList.map((p, idx) => ({
      id: `p-imp-${Date.now()}-${idx}`,
      ...p,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const updatedPersons = [...formatted, ...persons];
    setPersons(updatedPersons);
    savePersons(updatedPersons);

    setIsSyncing(true);
    Promise.all(formatted.map((p) => savePersonToFirestore(p)))
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
  };

  return (
    <AppContext.Provider
      value={{
        user,
        effectiveUserId,
        isAuthLoading,
        isDataLoading,
        isSyncing,
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
