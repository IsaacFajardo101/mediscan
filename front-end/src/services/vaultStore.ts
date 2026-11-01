// The Medicine Vault data, saved on the phone (AsyncStorage).
// Medicines are per ACCOUNT (not per profile), so there is one vault for everyone.
//
// How screens use it:
//   const { ready, medicines } = useVault();         // list (auto-refreshes on changes)
//   const medicine = useVaultMedicine(id);            // one medicine
//   await addMedicine(newMedicine);                   // Scan Results / Manual Entry "Save to Vault"
//   await updateNote(id, 'Take after meals');         // Add Note
//   deleteWithUndo(id) -> undoDelete(id) or commitDelete(id)   // delete with 15s undo
//
// Every change is saved locally first, then written to the change log for backend sync.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { buildMockVault } from '@/mock';
import type { NewMedicine, VaultMedicine } from '@/types/medicine';
import { logChange, newId } from './changeLog';

const KEY = 'mediscan.vault.medicines.v1';
export const UNDO_SECONDS = 15;

type State = {
  ready: boolean;
  medicines: VaultMedicine[];
  pendingDeleteIds: string[]; // hidden from lists, still waiting for Undo / timeout
};

let state: State = { ready: false, medicines: [], pendingDeleteIds: [] };
const listeners = new Set<() => void>();
const deleteTimers = new Map<string, ReturnType<typeof setTimeout>>();

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function getSnapshot() {
  return state;
}

// Save writes are chained so they always finish in order.
let saveQueue: Promise<unknown> = Promise.resolve();
function persist(): Promise<void> {
  const snapshot = state.medicines;
  const job = () => AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
  const next = saveQueue.then(job, job);
  saveQueue = next.catch(() => undefined);
  return next.catch((e) => console.log('[vault] save failed', e));
}

// ---------- loading ----------

let loading: Promise<void> | null = null;

// Loads the vault from the phone. First time ever: starts with the shared mock data.
export function loadVault(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          setState({ ready: true, medicines: JSON.parse(raw) as VaultMedicine[] });
          return;
        }
      } catch (e) {
        console.log('[vault] load failed, using mock data', e);
      }
      // TODO(Sprint 4): replace with GET from backend, then save locally.
      setState({ ready: true, medicines: buildMockVault() });
      await persist();
    })();
  }
  return loading;
}

// For testing: wipes the local vault and loads the mock data again.
export async function resetVaultToMock(): Promise<void> {
  deleteTimers.forEach((t) => clearTimeout(t));
  deleteTimers.clear();
  setState({ ready: true, medicines: buildMockVault(), pendingDeleteIds: [] });
  await persist();
}

// ---------- hooks ----------

export function useVault() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadVault();
  }, []);
  const medicines = useMemo(
    () => s.medicines.filter((m) => !s.pendingDeleteIds.includes(m.vault_id)),
    [s.medicines, s.pendingDeleteIds],
  );
  return { ready: s.ready, medicines };
}

export function useVaultMedicine(id: string | undefined): { ready: boolean; medicine: VaultMedicine | null } {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    loadVault();
  }, []);
  const medicine = id ? s.medicines.find((m) => m.vault_id === id) ?? null : null;
  return { ready: s.ready, medicine };
}

// Ids currently waiting for Undo (the Vault screen shows the "Medicine Deleted" popup for these).
export function usePendingDeletes(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).pendingDeleteIds;
}

export function getMedicineById(id: string): VaultMedicine | undefined {
  return state.medicines.find((m) => m.vault_id === id);
}

// ---------- create / update ----------

// "Save to Vault" from Scan Results or Manual Entry.
export async function addMedicine(input: NewMedicine): Promise<VaultMedicine> {
  await loadVault();
  const med: VaultMedicine = {
    ...input,
    vault_id: newId('med'),
    vault_note: input.vault_note ?? '',
    vault_saved_at: new Date().toISOString(),
  };
  setState({ medicines: [med, ...state.medicines] });
  await persist();
  await logChange('create', med.vault_id, { ...med });
  // TODO(Sprint 4): POST to backend here (log entry stays unsynced if offline).
  return med;
}

export async function updateNote(id: string, note: string): Promise<void> {
  await loadVault();
  const clean = note.trim();
  setState({ medicines: state.medicines.map((m) => (m.vault_id === id ? { ...m, vault_note: clean } : m)) });
  await persist();
  await logChange('update', id, { vault_note: clean });
  // TODO(Sprint 4): PATCH to backend here.
}

// Generic edit (e.g. Edit Expiration Date from Upcoming Alerts can reuse this).
export async function updateMedicine(id: string, changes: Partial<Omit<VaultMedicine, 'vault_id'>>): Promise<void> {
  await loadVault();
  setState({ medicines: state.medicines.map((m) => (m.vault_id === id ? { ...m, ...changes } : m)) });
  await persist();
  await logChange('update', id, { ...changes });
}

// ---------- delete with undo ----------
// Delete hides the medicine right away and starts a 15-second timer.
// - Undo within 15s  -> it comes back, nothing is logged, backend never hears about it.
// - Done / timeout   -> it is removed for real, saved, and logged for backend.
// If the app is closed during the 15s, the delete never got saved, so it acts like Undo.

export function deleteWithUndo(id: string): void {
  if (state.pendingDeleteIds.includes(id)) return;
  setState({ pendingDeleteIds: [...state.pendingDeleteIds, id] });
  deleteTimers.set(id, setTimeout(() => {
    commitDelete(id);
  }, UNDO_SECONDS * 1000));
}

export function undoDelete(id: string): void {
  const t = deleteTimers.get(id);
  if (t) clearTimeout(t);
  deleteTimers.delete(id);
  setState({ pendingDeleteIds: state.pendingDeleteIds.filter((x) => x !== id) });
}

export async function commitDelete(id: string): Promise<void> {
  const t = deleteTimers.get(id);
  if (t) clearTimeout(t);
  deleteTimers.delete(id);
  if (!state.pendingDeleteIds.includes(id)) return; // already undone or committed
  setState({
    medicines: state.medicines.filter((m) => m.vault_id !== id),
    pendingDeleteIds: state.pendingDeleteIds.filter((x) => x !== id),
  });
  await persist();
  await logChange('delete', id, null);
  // TODO(Sprint 4): DELETE on backend here.
}
