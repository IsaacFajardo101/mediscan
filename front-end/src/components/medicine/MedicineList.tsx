// The searchable / filterable / sortable medicine list.
// Used by: Vault tab, "<Name>'s Medicine" (Medicine Overview > View All).
// Upcoming Alerts (Reminders team) can reuse it too: just pass a different `scope` and list.
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Colors, Components, Radius, Spacing, Type } from '@/constants/display';
import { resetListQuery, setListQuery, useListQuery, type ListScope } from '@/services/listQueryStore';
import {
  commitDelete, deleteWithUndo, UNDO_SECONDS, undoDelete, usePendingDeletes,
} from '@/services/vaultStore';
import type { StatusFilter, VaultMedicine } from '@/types/medicine';
import { activeSheetFilterCount, applyQuery, medicineName } from '@/utils/medicine';
import CardMenu from './CardMenu';
import MedicineCard, { type Anchor } from './MedicineCard';
import Popup from './Popup';

type Props = {
  scope: ListScope;
  medicines: VaultMedicine[];
  ready: boolean;
};

const CHIPS: { key: StatusFilter; label: string; icon?: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'all', label: 'All', color: Colors.textPrimary },
  { key: 'verified', label: 'Verified', icon: 'checkmark', color: Colors.statusSuccess },
  { key: 'needs_verification', label: 'Needs Verification', icon: 'warning-outline', color: Colors.statusWarning },
  { key: 'expired', label: 'Expired', icon: 'ban-outline', color: Colors.statusDanger },
];

export default function MedicineList({ scope, medicines, ready }: Props) {
  const router = useRouter();
  const query = useListQuery(scope);
  const shown = useMemo(() => applyQuery(medicines, query), [medicines, query]);
  const sheetCount = activeSheetFilterCount(query);

  // ⋮ menu + delete flow
  const [menu, setMenu] = useState<{ medicine: VaultMedicine; anchor: Anchor } | null>(null);
  const [confirm, setConfirm] = useState<VaultMedicine | null>(null);
  const [deleted, setDeleted] = useState<{ id: string; name: string } | null>(null);
  const pending = usePendingDeletes();
  const deletedVisible = !!deleted && pending.includes(deleted.id);
  const secondsLeft = useCountdown(deletedVisible ? deleted?.id ?? null : null);

  const openDetails = (m: VaultMedicine) =>
    router.push({ pathname: '/medicine/[id]', params: { id: m.vault_id } });

  const confirmDelete = () => {
    if (!confirm) return;
    deleteWithUndo(confirm.vault_id);
    setDeleted({ id: confirm.vault_id, name: medicineName(confirm) });
    setConfirm(null);
  };

  const hasQuery = query.search.trim() !== '' || query.status !== 'all' || sheetCount > 0;

  return (
    <View style={styles.root}>
      {/* Search + filter button */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            value={query.search}
            onChangeText={(t) => setListQuery(scope, { search: t })}
            placeholder="Search medicines..."
            placeholderTextColor={Colors.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Search medicines"
          />
          {query.search ? (
            <Pressable onPress={() => setListQuery(scope, { search: '' })} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </Pressable>
          ) : (
            <Ionicons name="search" size={20} color={Colors.textPrimary} />
          )}
        </View>
        <Pressable
          style={styles.filterBtn}
          onPress={() => router.push({ pathname: '/vault-filters', params: { scope } })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={sheetCount ? `Filters, ${sheetCount} on` : 'Filters'}
        >
          <Ionicons name="options-outline" size={26} color={Colors.textPrimary} />
          {sheetCount > 0 && (
            <View style={styles.filterDot}><Text style={styles.filterDotText}>{sheetCount}</Text></View>
          )}
        </Pressable>
      </View>

      {/* Status chips */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CHIPS.map((c) => {
            const on = query.status === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => setListQuery(scope, { status: c.key })}
                style={[on ? Components.chipSelected : Components.chip, styles.chip, !on && c.key !== 'all' && { borderColor: c.color }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                {c.icon && <Ionicons name={c.icon} size={16} color={on ? Colors.onAction : c.color} />}
                <Text style={[styles.chipText, { color: on ? Colors.onAction : c.color }]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Count + sort */}
      <View style={styles.countRow}>
        <Text style={styles.count}>
          {shown.length} {shown.length === 1 ? 'Medicine' : 'Medicines'}
        </Text>
        <Pressable
          style={styles.sortBtn}
          onPress={() => setListQuery(scope, { sort: query.sort === 'az' ? 'za' : 'az' })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={query.sort === 'az' ? 'Sorted A to Z. Tap for Z to A' : 'Sorted Z to A. Tap for A to Z'}
        >
          <Text style={styles.sortText}>{query.sort === 'az' ? 'A–Z' : 'Z–A'}</Text>
          <Ionicons name="swap-vertical" size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {/* List */}
      {!ready ? (
        <View style={styles.center}><ActivityIndicator color={Colors.actionPrimary} /></View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(m) => m.vault_id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm + 4 }} />}
          renderItem={({ item }) => (
            <MedicineCard
              medicine={item}
              onPress={openDetails}
              onMenu={(m, anchor) => setMenu({ medicine: m, anchor })}
            />
          )}
          ListEmptyComponent={
            medicines.length === 0 ? (
              <EmptyState
                icon="shield-outline"
                title="Your vault is empty"
                message="Tap the + button below to scan a medicine or enter it manually."
              />
            ) : (
              <EmptyState
                icon="search-outline"
                title="No medicines found"
                message="Try a different search, or clear the filters."
                actionLabel={hasQuery ? 'Clear search & filters' : undefined}
                onAction={() => resetListQuery(scope, { sort: query.sort })}
              />
            )
          }
        />
      )}

      <CardMenu
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        items={menu ? [
          { label: 'View Details', icon: 'information-circle-outline', onPress: () => openDetails(menu.medicine) },
          {
            label: menu.medicine.vault_note ? 'Edit Note' : 'Add Note', icon: 'create-outline',
            onPress: () => router.push({ pathname: '/add-note', params: { id: menu.medicine.vault_id } }),
          },
          { label: 'Delete', icon: 'trash-outline', danger: true, onPress: () => setConfirm(menu.medicine) },
        ] : []}
      />

      {/* One popup for both steps ("Delete this medicine?" -> "Medicine Deleted"), so iOS
          never has to close one modal and open another at the same moment. */}
      <Popup
        visible={!!confirm || deletedVisible}
        icon="trash-outline"
        tone="danger"
        {...(confirm
          ? {
            title: 'Delete this medicine?',
            message: `Are you sure you want to delete ${medicineName(confirm)}? You can undo this within ${UNDO_SECONDS} seconds.`,
            onClose: () => setConfirm(null),
            actions: [
              { label: 'Cancel', variant: 'secondary' as const, onPress: () => setConfirm(null) },
              { label: 'Delete', variant: 'danger' as const, onPress: confirmDelete },
            ],
          }
          : {
            title: 'Medicine Deleted',
            message: deleted ? `${deleted.name} was removed from your list.` : '',
            stacked: true,
            onClose: () => { if (deleted) commitDelete(deleted.id); },
            actions: [
              { label: 'Done', onPress: () => { if (deleted) commitDelete(deleted.id); } },
              {
                label: `Undo (${secondsLeft}s)`, icon: 'arrow-undo' as const, variant: 'soft' as const,
                onPress: () => { if (deleted) undoDelete(deleted.id); },
              },
            ],
          })}
      />
    </View>
  );
}

// Seconds left in the undo window (counts down from UNDO_SECONDS while `key` is set).
function useCountdown(key: string | null): number {
  const [left, setLeft] = useState(UNDO_SECONDS);
  useEffect(() => {
    if (!key) return;
    const started = Date.now();
    setLeft(UNDO_SECONDS);
    const t = setInterval(() => {
      setLeft(Math.max(0, UNDO_SECONDS - Math.floor((Date.now() - started) / 1000)));
    }, 250);
    return () => clearInterval(t);
  }, [key]);
  return left;
}

function EmptyState({
  icon, title, message, actionLabel, onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap; title: string; message: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={32} color={Colors.actionPrimary} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMsg}>{message}</Text>
      {actionLabel && onAction && (
        <Pressable style={[Components.buttonSecondary, { marginTop: Spacing.md }]} onPress={onAction}>
          <Text style={Components.buttonSecondaryText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfacePrimary },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, paddingHorizontal: Spacing.md + 4, paddingTop: Spacing.md },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.textSecondary, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, backgroundColor: Colors.surfacePrimary, minHeight: 48,
  },
  searchInput: { flex: 1, ...Type.body, color: Colors.textPrimary, paddingVertical: Spacing.sm },
  filterBtn: { padding: Spacing.xs },
  filterDot: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.statusSuccess, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  filterDotText: { color: Colors.onAction, fontSize: 11, fontWeight: '700' },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.md + 4, paddingVertical: Spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm + 4, minHeight: 36 },
  chipText: { ...Type.caption, fontWeight: '600' },
  countRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md + 4, paddingBottom: Spacing.sm,
  },
  count: { ...Type.h3, color: Colors.textPrimary },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.xs },
  sortText: { ...Type.label, color: Colors.textPrimary },
  list: { paddingHorizontal: Spacing.md + 4, paddingTop: Spacing.xs, paddingBottom: Spacing.xl * 2, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl * 1.5, paddingHorizontal: Spacing.lg },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  emptyTitle: { ...Type.h3, color: Colors.textPrimary, textAlign: 'center' },
  emptyMsg: { ...Type.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },
});
