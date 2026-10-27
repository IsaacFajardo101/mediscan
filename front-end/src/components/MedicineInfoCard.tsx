import { Image, ImageSource } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Type } from '@/constants/display';

export type MedicineInfoRow = {
  icon: ImageSource | number; // use Assets.icons.*
  label: string;
  value: string;
};

type Props = {
  rows: MedicineInfoRow[];
};

// Bordered card listing icon + label + value rows (manufacturer, expiry date, ...).
export default function MedicineInfoCard({ rows }: Props) {
  return (
    <View style={styles.card}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Image source={row.icon} style={styles.icon} contentFit="contain" />
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfacePrimary,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },
  icon: { width: 24, height: 24 },
  label: { ...Type.label, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  value: { ...Type.label, fontWeight: '700', color: Colors.textSecondary, flex: 1 },
});
