import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Assets } from '@/constants/assets';
import { Colors } from '@/constants/display';
import OverlayModal from './OverlayModal';

type Props = {
  visible: boolean;
  medicineName: string;
  onViewVault: () => void;
  onClose: () => void; // Add Another, or tapping outside the card
};

// "Medicine Added!" overlay shown after Save to Vault (Scan Result, Manual Entry, Edit Medicine).
export default function MedicineAddedModal({ visible, medicineName, onViewVault, onClose }: Props) {
  return (
    <OverlayModal visible={visible} onRequestClose={onClose}>
      <View style={styles.iconCircle}>
        <Image source={Assets.icons.checkAdded} style={styles.icon} contentFit="contain" />
      </View>
      <Text style={styles.title}>Medicine Added!</Text>
      <Text style={styles.message}>
        {medicineName ? `${medicineName} was saved to your Medicine Vault.` : 'The medicine was saved to your Medicine Vault.'}
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={onViewVault} accessibilityRole="button">
          <Text style={styles.primaryText}>View in Vault</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onClose} accessibilityRole="button">
          <Text style={styles.secondaryText}>Add Another</Text>
        </Pressable>
      </View>
    </OverlayModal>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 40,
    backgroundColor: Colors.statusSuccessSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 34, height: 34 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, color: '#5B6B6C', textAlign: 'center', alignSelf: 'stretch' },
  actions: { alignSelf: 'stretch', gap: 10 },
  primary: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontSize: 15, fontWeight: '700', color: Colors.onAction },
  secondary: {
    backgroundColor: Colors.onAction,
    borderWidth: 1,
    borderColor: Colors.actionPrimary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: Colors.actionPrimary },
});
