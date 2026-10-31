import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Components, Spacing, Type } from '@/constants/display';
import type { VaultMedicine } from '@/types/medicine';
import { formatShortDate, getMedicineForm, medicineName } from '@/utils/medicine';
import MedicineIcon from './MedicineIcon';
import StatusBadge from './StatusBadge';

// One row in "Recent Scans" (Home + Recent Scans screen). Tinted green card from display.ts.
export default function ScanCard({ medicine, onPress }: { medicine: VaultMedicine; onPress: (m: VaultMedicine) => void }) {
  const form = getMedicineForm(medicine.fda_dosage_form);
  return (
    <Pressable
      style={({ pressed }) => [Components.scanCard, styles.card, pressed && { opacity: 0.85 }]}
      onPress={() => onPress(medicine)}
      accessibilityRole="button"
      accessibilityLabel={`${medicineName(medicine)}, ${form}, saved ${formatShortDate(medicine.vault_saved_at)}`}
    >
      <MedicineIcon form={form} size={48} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={2}>{medicineName(medicine)}</Text>
        <Text style={styles.form} numberOfLines={1}>{form}</Text>
      </View>
      <View style={styles.right}>
        <StatusBadge kind={medicine.vault_status} />
        <Text style={styles.date}>{formatShortDate(medicine.vault_saved_at)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, padding: Spacing.sm + 4 },
  text: { flex: 1, gap: 2 },
  name: { ...Type.label, color: Colors.textPrimary },
  form: { ...Type.caption, color: Colors.textSecondary },
  right: { alignItems: 'flex-end', gap: Spacing.xs, maxWidth: '45%' },
  date: { ...Type.caption, color: Colors.textPrimary },
});
