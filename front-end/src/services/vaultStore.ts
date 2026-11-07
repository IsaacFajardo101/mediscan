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
import { api } from './api';
import { getSession } from './sessionStore';

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

type VaultApiItem = {
  vault_id: number;
  profile_id: number;
  fda_id: number;
  vault_expiry_date: string | null;
  vault_created_at: string | null;
  fda_approval_id: string;
  fda_registration_id: string;
  fda_genericname: string;
  fda_brandname: string | null;
  fda_dosage_form: string | null;
  fda_dosage_strength: string | null;
};

type VaultListResponse = { data: VaultApiItem[] };
type VaultItemResponse = { data: VaultApiItem };

function mapApiItem(item: VaultApiItem): VaultMedicine {
  return {
    fda_id: item.fda_id,
    fda_approval_id: item.fda_approval_id,
    fda_registration_id: item.fda_registration_id,
    fda_brandname: item.fda_brandname ?? '',
    fda_genericname: item.fda_genericname,
    fda_dosage_form: item.fda_dosage_form ?? '',
    fda_dosage_strength: item.fda_dosage_strength ?? '',
    fda_manufacturer: null,
    fda_pharmacologic_category: null,
    fda_classification: null,
    vault_id: String(item.vault_id),
    vault_expiry_date: item.vault_expiry_date,
    vault_status: 'verified',
    vault_source: 'scan',
    vault_confidence: null,
    vault_note: '',
    vault_saved_at: item.vault_created_at ?? new Date().toISOString(),
    vault_common_uses: null,
    vault_warnings: null,
  };
}

async function activeProfileId(): Promise<number | null> {
  return (await getSession())?.active_profile_id ?? null;
}

async function getRemoteProfileId(): Promise<number | null> {
  const session = await getSession();
  return session?.access_token ? activeProfileId() : null;
}

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
        const profileId = await getRemoteProfileId();
        if (profileId !== null) {
          const response = await api.request<VaultListResponse>(`/accounts/me/vault/?profile_id=${profileId}`);
          setState({ ready: true, medicines: response.data.map(mapApiItem) });
          return;
        }
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
  const profileId = await getRemoteProfileId();
  if (profileId !== null && input.fda_id) {
    const response = await api.request<VaultItemResponse>('/accounts/me/vault/', {
      method: 'POST',
      body: JSON.stringify({
        profile_id: profileId,
        fda_id: input.fda_id,
        vault_expiry_date: input.vault_expiry_date,
      }),
    });
    const med = mapApiItem(response.data);
    setState({ medicines: [med, ...state.medicines] });
    return med;
  }
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
}

// Generic edit (e.g. Edit Expiration Date from Upcoming Alerts can reuse this).
export async function updateMedicine(id: string, changes: Partial<Omit<VaultMedicine, 'vault_id'>>): Promise<void> {
  await loadVault();
  const profileId = await getRemoteProfileId();
  const current = state.medicines.find((medicine) => medicine.vault_id === id);
  if (profileId !== null && current?.fda_id) {
    const response = await api.request<VaultItemResponse>(`/accounts/me/vault/${id}?profile_id=${profileId}`, {
      method: 'PUT',
      body: JSON.stringify({
        fda_id: changes.fda_id ?? current.fda_id,
        vault_expiry_date: changes.vault_expiry_date ?? current.vault_expiry_date,
      }),
    });
    const updated = mapApiItem(response.data);
    setState({ medicines: state.medicines.map((medicine) => (medicine.vault_id === id ? { ...medicine, ...updated } : medicine)) });
    return;
  }
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
  const profileId = await getRemoteProfileId();
  if (profileId !== null) {
    await api.request(`/accounts/me/vault/${id}?profile_id=${profileId}`, { method: 'DELETE' });
  }
}
