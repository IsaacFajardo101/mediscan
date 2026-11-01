// Change log for offline-first saving.
// Rule from the doc: save locally first, and keep a log of what changed so that when we sync
// (Sync button in Profile), backend can tell what was added/edited/deleted while offline.
//
// Each entry = one change. Sync can send entries where synced === false, then call markSynced().
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mediscan.changeLog.v1';

export type ChangeAction = 'create' | 'update' | 'delete';

export type ChangeEntry = {
  log_id: string;
  entity: 'medicine';       // other teams can add 'reminder', 'profile', ...
  action: ChangeAction;
  record_id: string;        // vault_id of the medicine
  data: Record<string, unknown> | null; // full record for create, changed fields for update, null for delete
  changed_at: string;       // ISO date-time
  synced: boolean;
};

// All writes go through this chain so two quick changes never overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getChangeLog(): Promise<ChangeEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ChangeEntry[]) : [];
  } catch (e) {
    console.log('[changeLog] read failed', e);
    return [];
  }
}

export function logChange(
  action: ChangeAction,
  record_id: string,
  data: Record<string, unknown> | null,
): Promise<void> {
  return enqueue(async () => {
    const log = await getChangeLog();
    log.push({
      log_id: newId('log'),
      entity: 'medicine',
      action,
      record_id,
      data,
      changed_at: new Date().toISOString(),
      synced: false,
    });
    await AsyncStorage.setItem(KEY, JSON.stringify(log));
  }).catch((e) => console.log('[changeLog] write failed', e));
}

// For the Sync feature: mark entries as sent to backend.
export function markSynced(logIds: string[]): Promise<void> {
  return enqueue(async () => {
    const ids = new Set(logIds);
    const log = (await getChangeLog()).map((e) => (ids.has(e.log_id) ? { ...e, synced: true } : e));
    await AsyncStorage.setItem(KEY, JSON.stringify(log));
  }).catch((e) => console.log('[changeLog] markSynced failed', e));
}
