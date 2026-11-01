import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Components, Radius, Spacing, Type } from '@/constants/display';

// One popup used for: "Delete this medicine?", "Medicine Deleted" (Undo), "Note Saved",
// "Medicine Saved to Vault!". Matches the Figma dialogs (icon circle, title, message, buttons).
export type PopupAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'soft';
  icon?: keyof typeof Ionicons.glyphMap;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'success' | 'danger';
  actions: PopupAction[];
  stacked?: boolean;        // buttons on top of each other (Done / Undo) instead of side by side
  onClose?: () => void;     // tap outside, Android back button, or the X
  showClose?: boolean;
};

export default function Popup({
  visible, title, message, icon, tone = 'success', actions, stacked, onClose, showClose,
}: Props) {
  const toneColor = tone === 'danger' ? Colors.statusDanger : Colors.statusSuccess;
  const toneSoft = tone === 'danger' ? Colors.statusDangerSoft : Colors.statusSuccessSoft;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close popup" />
        <View style={styles.card} accessibilityViewIsModal>
          {showClose && onClose && (
            <Pressable style={styles.close} onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </Pressable>
          )}
          {icon && (
            <View style={[styles.iconCircle, { backgroundColor: toneSoft }]}>
              <Ionicons name={icon} size={28} color={toneColor} />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={[styles.actions, stacked ? styles.stacked : styles.row]}>
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                style={({ pressed }) => [
                  styles.btn,
                  !stacked && { flex: 1 },
                  variantBox(a.variant),
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
              >
                {a.icon && <Ionicons name={a.icon} size={18} color={variantText(a.variant)} />}
                <Text style={[styles.btnText, { color: variantText(a.variant) }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function variantBox(v: PopupAction['variant']) {
  switch (v) {
    case 'secondary': return Components.buttonSecondary;
    case 'danger': return Components.buttonDanger;
    case 'soft': return { ...Components.buttonSecondary, backgroundColor: Colors.surfaceSecondary, borderColor: Colors.surfaceSecondary };
    default: return { ...Components.buttonPrimary, backgroundColor: Colors.actionPrimary };
  }
}
function variantText(v: PopupAction['variant']) {
  return v === 'secondary' || v === 'soft' ? Colors.textPrimary : Colors.onAction;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(5,31,32,0.45)', padding: Spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: Colors.surfacePrimary, borderRadius: Radius.md,
    padding: Spacing.lg, alignItems: 'center',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  close: { position: 'absolute', top: Spacing.sm + 4, right: Spacing.sm + 4, zIndex: 1 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm + 4 },
  title: { ...Type.h3, color: Colors.textPrimary, textAlign: 'center' },
  message: { ...Type.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  actions: { marginTop: Spacing.lg, alignSelf: 'stretch', gap: Spacing.sm + 4 },
  row: { flexDirection: 'row' },
  stacked: { flexDirection: 'column' },
  btn: { flexDirection: 'row', gap: Spacing.sm },
  btnText: { ...Type.label },
});
