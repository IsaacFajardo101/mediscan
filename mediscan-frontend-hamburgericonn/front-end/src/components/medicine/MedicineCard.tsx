import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Components, Spacing, Type } from '@/constants/display';
import type { VaultMedicine } from '@/types/medicine';
import { daysUntilExpiry, expiryLabel, getMedicineForm, isExpired, medicineName } from '@/utils/medicine';
import MedicineIcon from './MedicineIcon';
import StatusBadge from './StatusBadge';

export type Anchor = { x: number; y: number; w: number; h: number };

type Props = {
  medicine: VaultMedicine;
  onPress: (m: VaultMedicine) => void;
  onMenu?: (m: VaultMedicine, anchor: Anchor) => void; // ⋮ button (hidden if not given)
};

// One row in the Medicine Vault list (Figma: Medicine Vault Page).
export default function MedicineCard({ medicine, onPress, onMenu }: Props) {
  const menuRef = useRef<View>(null);
  const form = getMedicineForm(medicine.fda_dosage_form);
  const expired = isExpired(medicine);
  const days = daysUntilExpiry(medicine);
  const expiryColor = expired
    ? Colors.statusDanger
    : days !== null && days <= 30 ? Colors.statusWarning : Colors.textSecondary;

  const openMenu = () => {
    menuRef.current?.measureInWindow((x, y, w, h) => onMenu?.(medicine, { x, y, w, h }));
  };

  return (
    <Pressable
      style={({ pressed }) => [Components.medicineCard, styles.card, pressed && { backgroundColor: Colors.surfaceSecondary }]}
      onPress={() => onPress(medicine)}
      accessibilityRole="button"
      accessibilityLabel={`${medicineName(medicine)}, ${form}, ${expiryLabel(medicine)}`}
    >
      <MedicineIcon form={form} size={56} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>{medicineName(medicine)}</Text>
        <Text style={styles.form} numberOfLines={1}>{form} · {medicine.fda_dosage_strength}</Text>
        <View style={styles.expiryRow}>
          <Ionicons name="calendar-outline" size={14} color={expiryColor} />
          <Text style={[styles.expiry, { color: expiryColor }]} numberOfLines={1}>{expiryLabel(medicine)}</Text>
        </View>
        {(medicine.vault_status === 'needs_verification' || expired) && (
          <View style={styles.badgeRow}>
            {expired
              ? <StatusBadge kind="expired" />
              : <StatusBadge kind="needs_verification" />}
          </View>
        )}
      </View>
      {onMenu && (
        <Pressable
          ref={menuRef}
          onPress={openMenu}
          hitSlop={10}
          style={styles.menuBtn}
          accessibilityRole="button"
          accessibilityLabel={`More options for ${medicineName(medicine)}`}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.textPrimary} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, padding: Spacing.sm + 4 },
  text: { flex: 1, gap: 2 },
  name: { ...Type.label, color: Colors.textPrimary },
  form: { ...Type.caption, color: Colors.textSecondary },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  expiry: { ...Type.caption, flexShrink: 1 },
  badgeRow: { flexDirection: 'row', marginTop: Spacing.xs },
  menuBtn: { padding: Spacing.xs, alignSelf: 'flex-start' },
});
