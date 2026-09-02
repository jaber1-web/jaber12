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

// Direct root collection references for seamless persistence and instant console visibility
const getEventsCollection = () => collection(db, 'events');
const getPersonsCollection = () => collection(db, 'persons');
const getSettingsDoc = () => doc(db, 'settings', 'appSettings');

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
        events.push({
          ...data,
          id: d.id,
          attendees: Array.isArray(data.attendees) ? data.attendees : [],
        });
      });
      // Sort by createdAt descending or date
      events.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
      onEventsChanged(events);
    },
    (err) => {
      console.warn('Firestore events subscription notice:', err?.message || err);
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
        persons.push({
          ...data,
          id: d.id,
        });
      });
      persons.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onPersonsChanged(persons);
    },
    (err) => {
      console.warn('Firestore persons subscription notice:', err?.message || err);
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
      console.warn('Firestore settings subscription notice:', err?.message || err);
      onError?.(err);
    }
  );
}

/**
 * Save or update an event in Firestore
 */
export async function saveEventToFirestore(event: EventItem): Promise<void> {
  if (!event.id) return;
  const eventRef = doc(db, 'events', event.id);
  await setDoc(
    eventRef,
    {
      ...event,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Delete an event from Firestore
 */
export async function deleteEventFromFirestore(eventId: string): Promise<void> {
  if (!eventId) return;
  const eventRef = doc(db, 'events', eventId);
  await deleteDoc(eventRef);
}

/**
 * Save or update a person in Firestore
 */
export async function savePersonToFirestore(person: Person): Promise<void> {
  if (!person.id) return;
  const personRef = doc(db, 'persons', person.id);
  await setDoc(
    personRef,
    {
      ...person,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Delete a person from Firestore
 */
export async function deletePersonFromFirestore(personId: string): Promise<void> {
  if (!personId) return;
  const personRef = doc(db, 'persons', personId);
  await deleteDoc(personRef);
}

/**
 * Save app settings to Firestore
 */
export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const settingsRef = getSettingsDoc();
  await setDoc(settingsRef, settings, { merge: true });
}

/**
 * Batch import or restore all data to Firestore
 */
export async function batchImportAllToFirestore(data: {
  events: EventItem[];
  persons: Person[];
  settings?: AppSettings;
}): Promise<void> {
  const batch = writeBatch(db);

  if (Array.isArray(data.events)) {
    data.events.forEach((evt) => {
      if (evt?.id) {
        const ref = doc(db, 'events', evt.id);
        batch.set(ref, evt, { merge: true });
      }
    });
  }

  if (Array.isArray(data.persons)) {
    data.persons.forEach((person) => {
      if (person?.id) {
        const ref = doc(db, 'persons', person.id);
        batch.set(ref, person, { merge: true });
      }
    });
  }

  if (data.settings) {
    const settingsRef = getSettingsDoc();
    batch.set(settingsRef, data.settings, { merge: true });
  }

  await batch.commit();
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

    // If Firestore has fewer events/persons than local, sync local data to Firestore
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
 * Clear all data from Firestore
 */
export async function clearAllUserDataFromFirestore(): Promise<void> {
  const batch = writeBatch(db);

  const eventsSnap = await getDocs(getEventsCollection());
  eventsSnap.forEach((d) => batch.delete(d.ref));

  const personsSnap = await getDocs(getPersonsCollection());
  personsSnap.forEach((d) => batch.delete(d.ref));

  const settingsRef = getSettingsDoc();
  batch.set(settingsRef, DEFAULT_SETTINGS);

  await batch.commit();
}
