import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { EventItem, Person, AppSettings } from '../types';
import { DEFAULT_SETTINGS, getStoredEvents, getStoredPersons, getStoredSettings } from '../utils/storage';

// Collection / Doc references
const getEventsCollection = (userId: string) => collection(db, 'users', userId, 'events');
const getPersonsCollection = (userId: string) => collection(db, 'users', userId, 'persons');
const getSettingsDoc = (userId: string) => doc(db, 'users', userId, 'settings', 'appSettings');

/**
 * Subscribe to real-time events for a specific user
 */
export function subscribeToEvents(
  userId: string,
  onEventsChanged: (events: EventItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const eventsCol = getEventsCollection(userId);
  return onSnapshot(
    eventsCol,
    (snapshot) => {
      const events: EventItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as EventItem;
        events.push({
          ...data,
          id: d.id,
          attendees: Array.isArray(data.attendees) ? data.attendees : [],
        });
      });
      // Sort by createdAt descending or date
      events.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onEventsChanged(events);
    },
    (err) => {
      console.error('Firestore events subscription error:', err);
      onError?.(err);
    }
  );
}

/**
 * Subscribe to real-time persons directory for a specific user
 */
export function subscribeToPersons(
  userId: string,
  onPersonsChanged: (persons: Person[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const personsCol = getPersonsCollection(userId);
  return onSnapshot(
    personsCol,
    (snapshot) => {
      const persons: Person[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Person;
        persons.push({
          ...data,
          id: d.id,
        });
      });
      persons.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onPersonsChanged(persons);
    },
    (err) => {
      console.error('Firestore persons subscription error:', err);
      onError?.(err);
    }
  );
}

/**
 * Subscribe to real-time settings for a specific user
 */
export function subscribeToSettings(
  userId: string,
  onSettingsChanged: (settings: AppSettings) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const settingsRef = getSettingsDoc(userId);
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
      console.error('Firestore settings subscription error:', err);
      onError?.(err);
    }
  );
}

/**
 * Save or update an event in Firestore
 */
export async function saveEventToFirestore(userId: string, event: EventItem): Promise<void> {
  if (!userId || !event.id) return;
  const eventRef = doc(db, 'users', userId, 'events', event.id);
  await setDoc(eventRef, {
    ...event,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Delete an event from Firestore
 */
export async function deleteEventFromFirestore(userId: string, eventId: string): Promise<void> {
  if (!userId || !eventId) return;
  const eventRef = doc(db, 'users', userId, 'events', eventId);
  await deleteDoc(eventRef);
}

/**
 * Save or update a person in Firestore
 */
export async function savePersonToFirestore(userId: string, person: Person): Promise<void> {
  if (!userId || !person.id) return;
  const personRef = doc(db, 'users', userId, 'persons', person.id);
  await setDoc(personRef, {
    ...person,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Delete a person from Firestore
 */
export async function deletePersonFromFirestore(userId: string, personId: string): Promise<void> {
  if (!userId || !personId) return;
  const personRef = doc(db, 'users', userId, 'persons', personId);
  await deleteDoc(personRef);
}

/**
 * Save app settings to Firestore
 */
export async function saveSettingsToFirestore(userId: string, settings: AppSettings): Promise<void> {
  if (!userId) return;
  const settingsRef = getSettingsDoc(userId);
  await setDoc(settingsRef, settings, { merge: true });
}

/**
 * Batch import or restore all data to Firestore
 */
export async function batchImportAllToFirestore(
  userId: string,
  data: { events: EventItem[]; persons: Person[]; settings?: AppSettings }
): Promise<void> {
  if (!userId) return;
  const batch = writeBatch(db);

  if (Array.isArray(data.events)) {
    data.events.forEach((evt) => {
      const ref = doc(db, 'users', userId, 'events', evt.id);
      batch.set(ref, evt, { merge: true });
    });
  }

  if (Array.isArray(data.persons)) {
    data.persons.forEach((person) => {
      const ref = doc(db, 'users', userId, 'persons', person.id);
      batch.set(ref, person, { merge: true });
    });
  }

  if (data.settings) {
    const settingsRef = getSettingsDoc(userId);
    batch.set(settingsRef, data.settings, { merge: true });
  }

  await batch.commit();
}

/**
 * Migrate existing local storage data to Firestore once if user has no data in Firestore yet
 */
export async function checkAndMigrateLocalStorageToFirestore(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const eventsSnap = await getDocs(getEventsCollection(userId));
    const personsSnap = await getDocs(getPersonsCollection(userId));

    if (eventsSnap.empty && personsSnap.empty) {
      const localEvents = getStoredEvents();
      const localPersons = getStoredPersons();
      const localSettings = getStoredSettings();

      if (localEvents.length > 0 || localPersons.length > 0) {
        await batchImportAllToFirestore(userId, {
          events: localEvents,
          persons: localPersons,
          settings: localSettings,
        });
      }
    }
  } catch (e) {
    console.warn('Initial migration check warning:', e);
  }
}

/**
 * Clear all user data from Firestore
 */
export async function clearAllUserDataFromFirestore(userId: string): Promise<void> {
  if (!userId) return;
  const batch = writeBatch(db);

  const eventsSnap = await getDocs(getEventsCollection(userId));
  eventsSnap.forEach((d) => batch.delete(d.ref));

  const personsSnap = await getDocs(getPersonsCollection(userId));
  personsSnap.forEach((d) => batch.delete(d.ref));

  const settingsRef = getSettingsDoc(userId);
  batch.set(settingsRef, DEFAULT_SETTINGS);

  await batch.commit();
}
