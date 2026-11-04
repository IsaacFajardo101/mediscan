import { Colors, Radius, Spacing, Type } from '@/constants/display';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  items?: string[]; // e.g. the list of missing fields
  onClose: () => void;
};

// Reminder popup (e.g. "Please fill out the required fields").
// Gumagana sa Android, iOS at web (Alert.alert does nothing on web kaya custom popup ito).
export default function ReminderDialog({ visible, title, message, items, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card} accessibilityRole="alert">
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle-outline" size={30} color={Colors.warning} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {items && items.length > 0 ? (
            <View style={styles.list}>
              {items.map((item) => (
                <View key={item} style={styles.listRow}>
                  <Text style={styles.asterisk}>*</Text>
                  <Text style={styles.listText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable style={styles.okBtn} onPress={onClose}>
            <Text style={styles.okText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.lg, backgroundColor: 'rgba(5,31,32,0.45)',
  },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.lg - 4, alignItems: 'center',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: Radius.pill, backgroundColor: Colors.statusWarningSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md - 2,
  },
  title: { ...Type.h3, color: Colors.text, textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
  list: { alignSelf: 'stretch', marginTop: Spacing.md - 4, paddingHorizontal: Spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  asterisk: { color: Colors.danger, fontWeight: '700', fontSize: 15, marginRight: 6 },
  listText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  okBtn: {
    alignSelf: 'stretch', height: 46, borderRadius: Radius.sm, marginTop: Spacing.md + 4,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  okText: { ...Type.label, fontSize: 15, color: '#fff' },
});
