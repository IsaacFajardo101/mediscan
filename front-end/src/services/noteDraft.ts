// Holds the note typed on the Add Note screen for a medicine that is NOT saved yet
// (Scan Results preview). When the user taps "Save to Vault", the note is saved with it.
import { useSyncExternalStore } from 'react';

let draft = '';
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function setNoteDraft(text: string): void {
  draft = text;
  listeners.forEach((l) => l());
}

export function clearNoteDraft(): void {
  setNoteDraft('');
}

export function getNoteDraft(): string {
  return draft;
}

export function useNoteDraft(): string {
  return useSyncExternalStore(subscribe, () => draft, () => draft);
}
