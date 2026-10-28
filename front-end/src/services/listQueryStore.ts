// Search / status chip / sort / filter-sheet state for medicine lists.
// Each list has its own "scope" so the Vault and the "<Name>'s Medicine" screen
// don't share filters. The Filters sheet (/vault-filters?scope=...) edits the same state.
import { useSyncExternalStore } from 'react';
import { DEFAULT_QUERY, type ListQuery } from '@/utils/medicine';

export type ListScope = 'vault' | 'overview';

const queries: Record<ListScope, ListQuery> = {
  vault: { ...DEFAULT_QUERY },
  overview: { ...DEFAULT_QUERY },
};
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getListQuery(scope: ListScope): ListQuery {
  return queries[scope];
}

export function setListQuery(scope: ListScope, patch: Partial<ListQuery>): void {
  queries[scope] = { ...queries[scope], ...patch };
  listeners.forEach((l) => l());
}

export function resetListQuery(scope: ListScope, keep: Partial<ListQuery> = {}): void {
  queries[scope] = { ...DEFAULT_QUERY, ...keep };
  listeners.forEach((l) => l());
}

export function useListQuery(scope: ListScope): ListQuery {
  return useSyncExternalStore(subscribe, () => queries[scope], () => queries[scope]);
}

export function isListScope(v: unknown): v is ListScope {
  return v === 'vault' || v === 'overview';
}
