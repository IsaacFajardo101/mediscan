import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Components, Spacing, Type } from '@/constants/display';

export type BadgeKind = 'verified' | 'needs_verification' | 'expired';

const CONFIG = {
  verified: { label: 'Verified', icon: 'checkmark' as const, color: Colors.statusSuccess, box: Components.badgeVerified },
  needs_verification: { label: 'Needs Verification', icon: 'alert-circle-outline' as const, color: Colors.statusWarning, box: Components.badgeWarning },
  expired: { label: 'Expired', icon: 'close-circle-outline' as const, color: Colors.statusDanger, box: Components.badgeDanger },
};

export default function StatusBadge({ kind, showIcon = false }: { kind: BadgeKind; showIcon?: boolean }) {
  const c = CONFIG[kind];
  return (
    <View style={[c.box, styles.row]}>
      {showIcon && <Ionicons name={c.icon} size={14} color={c.color} />}
      <Text style={[styles.text, { color: c.color }]} numberOfLines={1}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start' },
  text: { ...Type.caption, fontWeight: '600' },
});
