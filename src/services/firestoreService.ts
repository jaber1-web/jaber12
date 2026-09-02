import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { EventItem, Person, AppSettings } from '../types';
import { DEFAULT_SETTINGS, getStoredEvents, getStoredPersons, getStoredSettings, saveEvents, savePersons } from '../utils/storage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Deep sanitization to completely remove any undefined fields before sending to Firestore.
 * Firestore throws a fatal "Unsupported field value: undefined" exception if any key contains undefined.
 */
export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Direct root collection references for seamless persistence and instant console visibility
export const getEventsCollection = () => collection(db, 'events');
export const getPersonsCollection = () => collection(db, 'persons');
export const getSettingsDoc = () => doc(db, 'settings', 'appSettings');

/**
 * Test server connectivity on startup
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice: please check network or project permissions.');
      return false;
    }
    // Any other response means server reached
    return true;
  }
}

/**
 * Subscribe to real-time events from Firestore
 */
export function subscribeToEvents(
  onEventsChanged: (events: EventItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const eventsCol = getEventsCollection();
  return onSnapshot(
    eventsCol,
    (snapshot) => {
      const events: EventItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as EventItem;
        // Ensure only valid event records are extracted (ignores test artifacts)
        if (data && data.title) {
          events.push({
            ...data,
            id: d.id,
            attendees: Array.isArray(data.attendees) ? data.attendees : [],
          });
        }
      });
      // Sort by createdAt descending or date
      events.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
      onEventsChanged(events);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'events');
      onError?.(err);
    }
  );
}

/**
 * Subscribe to real-time persons directory from Firestore
 */
export function subscribeToPersons(
  onPersonsChanged: (persons: Person[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const personsCol = getPersonsCollection();
  return onSnapshot(
    personsCol,
    (snapshot) => {
      const persons: Person[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Person;
        if (data && data.name) {
          persons.push({
            ...data,
            id: d.id,
          });
        }
      });
      persons.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onPersonsChanged(persons);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'persons');
      onError?.(err);
    }
  );
}

/**
 * Subscribe to real-time settings from Firestore
 */
export function subscribeToSettings(
  onSettingsChanged: (settings: AppSettings) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const settingsRef = getSettingsDoc();
  return onSnapshot(
    settingsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AppSettings;
        onSettingsChanged({ ...DEFAULT_SETTINGS, ...data });
      } else {
        onSettingsChanged(DEFAULT_SETTINGS);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/appSettings');
      onError?.(err);
    }
  );
}

/**
 * Save or update an event in Firestore
 */
export async function saveEventToFirestore(event: EventItem): Promise<void> {
  if (!event.id) return;
  const path = `events/${event.id}`;
  try {
    const eventRef = doc(db, 'events', event.id);
    const cleaned = cleanForFirestore({
      ...event,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(eventRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Delete an event from Firestore
 */
export async function deleteEventFromFirestore(eventId: string): Promise<void> {
  if (!eventId) return;
  const path = `events/${eventId}`;
  try {
    const eventRef = doc(db, 'events', eventId);
    await deleteDoc(eventRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Save or update a person in Firestore
 */
export async function savePersonToFirestore(person: Person): Promise<void> {
  if (!person.id) return;
  const path = `persons/${person.id}`;
  try {
    const personRef = doc(db, 'persons', person.id);
    const cleaned = cleanForFirestore({
      ...person,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(personRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Delete a person from Firestore
 */
export async function deletePersonFromFirestore(personId: string): Promise<void> {
  if (!personId) return;
  const path = `persons/${personId}`;
  try {
    const personRef = doc(db, 'persons', personId);
    await deleteDoc(personRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

/**
 * Save app settings to Firestore
 */
export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const path = 'settings/appSettings';
  try {
    const settingsRef = getSettingsDoc();
    const cleaned = cleanForFirestore(settings);
    await setDoc(settingsRef, cleaned, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Batch import or restore all data to Firestore
 */
export async function batchImportAllToFirestore(data: {
  events: EventItem[];
  persons: Person[];
  settings?: AppSettings;
}): Promise<void> {
  const rawEvents = Array.isArray(data.events) ? data.events : [];
  const rawPersons = Array.isArray(data.persons) ? data.persons : [];

  const validEvents = rawEvents
    .filter((evt) => evt && typeof evt === 'object')
    .map((evt) => ({
      ...evt,
      id: evt.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: (evt.title || '').trim() || 'فعالية بدون عنوان',
    }));

  const validPersons = rawPersons
    .filter((p) => p && typeof p === 'object')
    .map((p) => ({
      ...p,
      id: p.id || `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: (p.name || '').trim() || 'شخص بدون اسم',
    }));

  if (validEvents.length === 0 && validPersons.length === 0 && !data.settings) {
    return;
  }

  try {
    const batch = writeBatch(db);

    validEvents.forEach((evt) => {
      const ref = doc(db, 'events', evt.id);
      batch.set(ref, cleanForFirestore(evt), { merge: true });
    });

    validPersons.forEach((person) => {
      const ref = doc(db, 'persons', person.id);
      batch.set(ref, cleanForFirestore(person), { merge: true });
    });

    if (data.settings) {
      const settingsRef = getSettingsDoc();
      batch.set(settingsRef, cleanForFirestore(data.settings), { merge: true });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch_import');
    // Fallback: commit documents individually using Promise.allSettled so no single document fails the whole sync
    try {
      const promises: Promise<any>[] = [];
      validEvents.forEach((evt) => {
        promises.push(setDoc(doc(db, 'events', evt.id), cleanForFirestore(evt), { merge: true }));
      });
      validPersons.forEach((person) => {
        promises.push(setDoc(doc(db, 'persons', person.id), cleanForFirestore(person), { merge: true }));
      });
      if (data.settings) {
        promises.push(setDoc(getSettingsDoc(), cleanForFirestore(data.settings), { merge: true }));
      }
      await Promise.allSettled(promises);
    } catch (fallbackErr) {
      console.warn('Fallback individual sync warning:', fallbackErr);
    }
  }
}

/**
 * Migrate existing local storage data to Firestore if Firestore database has no events
 */
export async function checkAndMigrateLocalStorageToFirestore(): Promise<void> {
  try {
    const eventsSnap = await getDocs(getEventsCollection());
    const personsSnap = await getDocs(getPersonsCollection());

    const localEvents = getStoredEvents();
    const localPersons = getStoredPersons();
    const localSettings = getStoredSettings();

    // If Firestore has no valid events but local storage has events, upload them to Firestore
    if (eventsSnap.empty && localEvents.length > 0) {
      await batchImportAllToFirestore({
        events: localEvents,
        persons: localPersons,
        settings: localSettings,
      });
    } else if (personsSnap.empty && localPersons.length > 0) {
      await batchImportAllToFirestore({
        events: localEvents,
        persons: localPersons,
        settings: localSettings,
      });
    }
  } catch (e) {
    console.warn('Initial migration check warning:', e);
  }
}

/**
 * Force bidirectional sync check: reconciles remote Firestore documents with local storage
 */
export async function forceSyncLocalToFirestore(): Promise<{
  eventsCount: number;
  personsCount: number;
}> {
  try {
    // 1. Fetch remote docs
    const eventsSnap = await getDocs(getEventsCollection());
    const personsSnap = await getDocs(getPersonsCollection());

    const remoteEventsMap = new Map<string, EventItem>();
    eventsSnap.forEach((d) => {
      const data = d.data() as EventItem;
      if (data && data.title) {
        remoteEventsMap.set(d.id, { ...data, id: d.id });
      }
    });

    const remotePersonsMap = new Map<string, Person>();
    personsSnap.forEach((d) => {
      const data = d.data() as Person;
      if (data && data.name) {
        remotePersonsMap.set(d.id, { ...data, id: d.id });
      }
    });

    // 2. Read local docs
    const localEvents = getStoredEvents();
    const localPersons = getStoredPersons();
    const localSettings = getStoredSettings();

    // 3. Bidirectional merge for events
    const mergedEventsMap = new Map<string, EventItem>(remoteEventsMap);
    localEvents.forEach((localEvt) => {
      if (!localEvt?.id) return;
      const remoteEvt = mergedEventsMap.get(localEvt.id);
      if (!remoteEvt) {
        mergedEventsMap.set(localEvt.id, localEvt);
      } else {
        const localTime = new Date(localEvt.updatedAt || localEvt.createdAt || 0).getTime();
        const remoteTime = new Date(remoteEvt.updatedAt || remoteEvt.createdAt || 0).getTime();
        if (localTime > remoteTime) {
          mergedEventsMap.set(localEvt.id, localEvt);
        }
      }
    });

    // 4. Bidirectional merge for persons
    const mergedPersonsMap = new Map<string, Person>(remotePersonsMap);
    localPersons.forEach((localP) => {
      if (!localP?.id) return;
      const remoteP = mergedPersonsMap.get(localP.id);
      if (!remoteP) {
        mergedPersonsMap.set(localP.id, localP);
      } else {
        const localTime = new Date(localP.updatedAt || localP.createdAt || 0).getTime();
        const remoteTime = new Date(remoteP.updatedAt || remoteP.createdAt || 0).getTime();
        if (localTime > remoteTime) {
          mergedPersonsMap.set(localP.id, localP);
        }
      }
    });

    const mergedEvents = Array.from(mergedEventsMap.values());
    const mergedPersons = Array.from(mergedPersonsMap.values());

    // Update local cache
    saveEvents(mergedEvents);
    savePersons(mergedPersons);

    // Commit all merged records back to Firestore
    await batchImportAllToFirestore({
      events: mergedEvents,
      persons: mergedPersons,
      settings: localSettings,
    });

    return {
      eventsCount: mergedEvents.length,
      personsCount: mergedPersons.length,
    };
  } catch (error) {
    console.error('Error during bidirectional sync:', error);
    // Fallback: still push local
    const localEvents = getStoredEvents();
    const localPersons = getStoredPersons();
    const localSettings = getStoredSettings();
    await batchImportAllToFirestore({
      events: localEvents,
      persons: localPersons,
      settings: localSettings,
    });
    return {
      eventsCount: localEvents.length,
      personsCount: localPersons.length,
    };
  }
}

/**
 * Clear all data from Firestore
 */
export async function clearAllUserDataFromFirestore(): Promise<void> {
  try {
    const batch = writeBatch(db);

    const eventsSnap = await getDocs(getEventsCollection());
    eventsSnap.forEach((d) => batch.delete(d.ref));

    const personsSnap = await getDocs(getPersonsCollection());
    personsSnap.forEach((d) => batch.delete(d.ref));

    const settingsRef = getSettingsDoc();
    batch.set(settingsRef, cleanForFirestore(DEFAULT_SETTINGS));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'clear_all');
    throw error;
  }
}
