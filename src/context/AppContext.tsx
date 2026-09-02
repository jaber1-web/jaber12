import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { EventItem, Person, AttendanceStatus, EventAttendee, AppSettings } from '../types';
import {
  DEFAULT_SETTINGS,
  playAttendanceFeedback,
  FullBackupPayload,
} from '../utils/storage';
import {
  auth,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  User,
} from '../firebase';
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
  user: User | null;
  effectiveUserId: string;
  isAuthLoading: boolean;
  isDataLoading: boolean;
  isSyncing: boolean;
  events: EventItem[];
  persons: Person[];
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;

  // Event Actions
  createEvent: (eventData: {
    title: string;
    date: string;
    location: string;
    selectedPersonIds: string[];
    customAttendees: Array<{ name: string; email?: string; phone?: string; stcNumber?: string }>;
  }) => EventItem;
  updateEvent: (updatedEvent: EventItem) => void;
  deleteEvent: (eventId: string) => void;
  getEventById: (eventId: string) => EventItem | undefined;

  // Attendance Actions
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

  // Person Actions
  addPerson: (personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (personId: string) => void;
  importPersons: (newPersons: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>[]) => void;

  // Data Management
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

// Helper to get or create a persistent client workspace ID for fallback
const getFallbackWorkspaceId = () => {
  try {
    let id = localStorage.getItem('app_workspace_uid');
    if (!id) {
      id = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('app_workspace_uid', id);
    }
    return id;
  } catch {
    return 'client_default_workspace';
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [fallbackUid] = useState<string>(getFallbackWorkspaceId);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Modals state
  const [reportModalEvent, setReportModalEvent] = useState<EventItem | null>(null);
  const [pdfModalEvent, setPdfModalEvent] = useState<EventItem | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const effectiveUserId = user ? user.uid : fallbackUid;

  // 1. Listen for Firebase Auth state changes & attempt silent anonymous sign-in
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthLoading(false);
      } else {
        setUser(null);
        setIsAuthLoading(false);
        try {
          // Attempt silent anonymous auth if available on Firebase project
          const cred = await signInAnonymously(auth);
          setUser(cred.user);
        } catch (err: any) {
          // Admin-restricted-operation is expected if anonymous auth is not enabled in Firebase Console.
          // In that case, we fallback to the persistent client workspace UID smoothly.
          if (err?.code !== 'auth/admin-restricted-operation') {
            console.debug('Firebase auth notice:', err?.message || err);
          }
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore Subscriptions
  useEffect(() => {
    if (!effectiveUserId) return;

    setIsDataLoading(true);

    // Migrate local data to Firestore if this user's cloud DB is new
    checkAndMigrateLocalStorageToFirestore(effectiveUserId).catch(() => {});

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount >= 3) {
        setIsDataLoading(false);
      }
    };

    const unsubEvents = subscribeToEvents(
      effectiveUserId,
      (firestoreEvents) => {
        setEvents(firestoreEvents);
        checkLoaded();
      },
      () => checkLoaded()
    );

    const unsubPersons = subscribeToPersons(
      effectiveUserId,
      (firestorePersons) => {
        setPersons(firestorePersons);
        checkLoaded();
      },
      () => checkLoaded()
    );

    const unsubSettings = subscribeToSettings(
      effectiveUserId,
      (firestoreSettings) => {
        setSettings(firestoreSettings);
        checkLoaded();
      },
      () => checkLoaded()
    );

    return () => {
      unsubEvents();
      unsubPersons();
      unsubSettings();
    };
  }, [effectiveUserId]);

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

  // Update Settings in Firestore
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = {
      ...settings,
      ...newSettings,
    };
    setSettings(updated);
    if (effectiveUserId) {
      setIsSyncing(true);
      try {
        await saveSettingsToFirestore(effectiveUserId, updated);
      } catch (err) {
        console.error('Error saving settings to Firestore:', err);
      } finally {
        setIsSyncing(false);
      }
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
    selectedPersonIds: string[];
    customAttendees: Array<{ name: string; email?: string; phone?: string; stcNumber?: string }>;
  }): EventItem => {
    const attendeesList: EventAttendee[] = [];

    // From global directory
    eventData.selectedPersonIds.forEach((pId) => {
      const p = persons.find((item) => item.id === pId);
      if (p) {
        attendeesList.push({
          personId: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          stcNumber: p.stcNumber,
          status: 'pending',
        });
      }
    });

    // Custom attendees
    const newPersonsToAdd: Person[] = [];
    eventData.customAttendees.forEach((ca, idx) => {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attendees: attendeesList,
    };

    // Optimistic UI updates
    if (newPersonsToAdd.length > 0) {
      setPersons((prev) => [...newPersonsToAdd, ...prev]);
    }
    setEvents((prev) => [newEvent, ...prev]);

    // Save to Firestore
    if (effectiveUserId) {
      setIsSyncing(true);
      Promise.all([
        saveEventToFirestore(effectiveUserId, newEvent),
        ...newPersonsToAdd.map((p) => savePersonToFirestore(effectiveUserId, p)),
      ])
        .catch((err) => console.error('Error creating event in Firestore:', err))
        .finally(() => setIsSyncing(false));
    }

    return newEvent;
  };

  // Update Event
  const updateEvent = (updatedEvent: EventItem) => {
    const finalEvent = { ...updatedEvent, updatedAt: new Date().toISOString() };
    setEvents((prev) =>
      prev.map((evt) => (evt.id === finalEvent.id ? finalEvent : evt))
    );

    if (effectiveUserId) {
      setIsSyncing(true);
      saveEventToFirestore(effectiveUserId, finalEvent)
        .catch((err) => console.error('Error updating event in Firestore:', err))
        .finally(() => setIsSyncing(false));
    }
  };

  // Delete Event
  const deleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((evt) => evt.id !== eventId));
    if (reportModalEvent?.id === eventId) {
      setReportModalEvent(null);
    }
    if (pdfModalEvent?.id === eventId) {
      setPdfModalEvent(null);
    }

    if (effectiveUserId) {
      setIsSyncing(true);
      deleteEventFromFirestore(effectiveUserId, eventId)
        .catch((err) => console.error('Error deleting event from Firestore:', err))
        .finally(() => setIsSyncing(false));
    }
  };

  // Update Attendee Status
  const updateAttendeeStatus = (eventId: string, personId: string, status: AttendanceStatus) => {
    if (status === 'present' || status === 'absent') {
      playAttendanceFeedback(status, settings.soundEnabled);
    }

    let updatedEventToSave: EventItem | null = null;

    setEvents((prevEvents) =>
      prevEvents.map((evt) => {
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
      })
    );

    if (effectiveUserId && updatedEventToSave) {
      saveEventToFirestore(effectiveUserId, updatedEventToSave).catch((err) =>
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

    setEvents((prevEvents) =>
      prevEvents.map((evt) => {
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
      })
    );

    if (effectiveUserId && updatedEventToSave) {
      saveEventToFirestore(effectiveUserId, updatedEventToSave).catch((err) =>
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

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const updated = {
          ...evt,
          updatedAt: new Date().toISOString(),
          attendees: [newAttendee, ...(evt.attendees || [])],
        };
        updatedEventToSave = updated;
        return updated;
      })
    );

    const newPerson: Person = {
      id: newPersonId,
      name: attendeeData.name,
      email: attendeeData.email || '',
      phone: attendeeData.phone || '',
      stcNumber: attendeeData.stcNumber || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (saveToGlobal) {
      setPersons((prev) => [newPerson, ...prev]);
    }

    if (effectiveUserId) {
      if (updatedEventToSave) {
        saveEventToFirestore(effectiveUserId, updatedEventToSave).catch(console.error);
      }
      if (saveToGlobal) {
        savePersonToFirestore(effectiveUserId, newPerson).catch(console.error);
      }
    }
  };

  // Add Multiple Attendees to Event (e.g. from Excel or Bulk Text)
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
    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const updated = {
          ...evt,
          updatedAt: new Date().toISOString(),
          attendees: [...newAttendees, ...(evt.attendees || [])],
        };
        updatedEventToSave = updated;
        return updated;
      })
    );

    if (saveToGlobal && newPersons.length > 0) {
      setPersons((prev) => [...newPersons, ...prev]);
    }

    if (effectiveUserId) {
      setIsSyncing(true);
      Promise.all([
        updatedEventToSave ? saveEventToFirestore(effectiveUserId, updatedEventToSave) : Promise.resolve(),
        ...(saveToGlobal ? newPersons.map((p) => savePersonToFirestore(effectiveUserId, p)) : []),
      ])
        .catch(console.error)
        .finally(() => setIsSyncing(false));
    }
  };

  // Add Existing Persons to Event
  const addExistingPersonsToEvent = (eventId: string, selectedPersons: Person[]) => {
    let updatedEventToSave: EventItem | null = null;

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const existingIds = new Set((evt.attendees || []).map((a) => a.personId));
        const newAttendees: EventAttendee[] = selectedPersons
          .filter((p) => !existingIds.has(p.id))
          .map((p) => ({
            personId: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            stcNumber: p.stcNumber,
            status: 'pending',
          }));

        const updated = {
          ...evt,
          updatedAt: new Date().toISOString(),
          attendees: [...(evt.attendees || []), ...newAttendees],
        };
        updatedEventToSave = updated;
        return updated;
      })
    );

    if (effectiveUserId && updatedEventToSave) {
      saveEventToFirestore(effectiveUserId, updatedEventToSave).catch(console.error);
    }
  };

  // Remove Attendee from Event
  const removeAttendeeFromEvent = (eventId: string, personId: string) => {
    let updatedEventToSave: EventItem | null = null;

    setEvents((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventId) return evt;
        const updated = {
          ...evt,
          updatedAt: new Date().toISOString(),
          attendees: (evt.attendees || []).filter((a) => a.personId !== personId),
        };
        updatedEventToSave = updated;
        return updated;
      })
    );

    if (effectiveUserId && updatedEventToSave) {
      saveEventToFirestore(effectiveUserId, updatedEventToSave).catch(console.error);
    }
  };

  // Edit Attendee in Event
  const editAttendeeInEvent = (
    eventId: string,
    updatedAttendee: EventAttendee,
    updateGlobal: boolean
  ) => {
    let updatedEventToSave: EventItem | null = null;

    setEvents((prev) =>
      prev.map((evt) => {
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
      })
    );

    let updatedPersonToSave: Person | null = null;
    if (updateGlobal) {
      setPersons((prev) =>
        prev.map((p) => {
          if (p.id === updatedAttendee.personId) {
            const updatedP: Person = {
              ...p,
              name: updatedAttendee.name,
              email: updatedAttendee.email,
              phone: updatedAttendee.phone,
              stcNumber: updatedAttendee.stcNumber,
              updatedAt: new Date().toISOString(),
            };
            updatedPersonToSave = updatedP;
            return updatedP;
          }
          return p;
        })
      );
    }

    if (effectiveUserId) {
      if (updatedEventToSave) {
        saveEventToFirestore(effectiveUserId, updatedEventToSave).catch(console.error);
      }
      if (updateGlobal && updatedPersonToSave) {
        savePersonToFirestore(effectiveUserId, updatedPersonToSave).catch(console.error);
      }
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
    setPersons((prev) => [newPerson, ...prev]);

    if (effectiveUserId) {
      setIsSyncing(true);
      savePersonToFirestore(effectiveUserId, newPerson)
        .catch(console.error)
        .finally(() => setIsSyncing(false));
    }
  };

  // Update Person in Directory
  const updatePerson = (updatedPerson: Person) => {
    const finalPerson = { ...updatedPerson, updatedAt: new Date().toISOString() };
    setPersons((prev) =>
      prev.map((p) => (p.id === finalPerson.id ? finalPerson : p))
    );

    // Also update existing event attendees with this personId
    const eventsToUpdate: EventItem[] = [];
    setEvents((prev) =>
      prev.map((evt) => {
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
      })
    );

    if (effectiveUserId) {
      setIsSyncing(true);
      Promise.all([
        savePersonToFirestore(effectiveUserId, finalPerson),
        ...eventsToUpdate.map((e) => saveEventToFirestore(effectiveUserId, e)),
      ])
        .catch(console.error)
        .finally(() => setIsSyncing(false));
    }
  };

  // Delete Person from Directory
  const deletePerson = (personId: string) => {
    setPersons((prev) => prev.filter((p) => p.id !== personId));

    if (effectiveUserId) {
      setIsSyncing(true);
      deletePersonFromFirestore(effectiveUserId, personId)
        .catch(console.error)
        .finally(() => setIsSyncing(false));
    }
  };

  // Import Persons
  const importPersons = (newPersonsList: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const formatted: Person[] = newPersonsList.map((p, idx) => ({
      id: `p-imp-${Date.now()}-${idx}`,
      ...p,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setPersons((prev) => [...formatted, ...prev]);

    if (effectiveUserId) {
      setIsSyncing(true);
      Promise.all(formatted.map((p) => savePersonToFirestore(effectiveUserId, p)))
        .catch(console.error)
        .finally(() => setIsSyncing(false));
    }
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
      setPersons(payload.persons);
      if (payload.settings) {
        setSettings(payload.settings);
      }

      if (effectiveUserId) {
        setIsSyncing(true);
        await batchImportAllToFirestore(effectiveUserId, {
          events: payload.events,
          persons: payload.persons,
          settings: payload.settings,
        });
        setIsSyncing(false);
      }

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
    setPersons([]);
    setSettings(DEFAULT_SETTINGS);

    if (effectiveUserId) {
      setIsSyncing(true);
      await clearAllUserDataFromFirestore(effectiveUserId);
      setIsSyncing(false);
    }
  };

  // Clear all data
  const clearAllData = async () => {
    setEvents([]);
    setPersons([]);
    setSettings(DEFAULT_SETTINGS);

    if (effectiveUserId) {
      setIsSyncing(true);
      await clearAllUserDataFromFirestore(effectiveUserId);
      setIsSyncing(false);
    }
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
