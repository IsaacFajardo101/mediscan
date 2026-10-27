import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/display';

type Props = {
  visible: boolean;
  onRequestClose: () => void; // tap outside the card, or the Android back button
  children: ReactNode;
};

// Dimmed full-screen backdrop with a white rounded card in the middle (Figma "Modal Card").
// Shared by the Medicine Added and Leave page? overlays.
export default function OverlayModal({ visible, onRequestClose, children }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onRequestClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} accessibilityLabel="Close" />
        <View style={styles.card}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,31,32,0.45)', alignItems: 'center', justifyContent: 'center', padding: 31 },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.onAction,
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
});
