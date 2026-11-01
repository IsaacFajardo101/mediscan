import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Assets } from '@/constants/assets';
import { Colors } from '@/constants/display';
import OverlayModal from './OverlayModal';

// Colors used only by this Figma frame that are not in the display.ts tokens yet.
const AmberSoft = '#FFF4E5';
const LinkGreen = '#409F8A';

type Props = {
  visible: boolean;
  onClose: () => void;          // Rescan, or tapping outside the card
  onUseDifferentPhoto: () => void; // runs after the overlay is gone, e.g. open the gallery picker
};

// "We couldn't read the text" overlay for the Camera screen, for when no text is detected on a photo.
// Not wired to Camera yet. Usage:
//   <CantReadModal visible={cantReadOpen} onClose={() => setCantReadOpen(false)} onUseDifferentPhoto={pickFromGallery} />
// Rescan only closes it. Use a Different Photo closes it, then calls onUseDifferentPhoto. Enter Details
// Manually closes it and opens Manual Entry.
export default function CantReadModal({ visible, onClose, onUseDifferentPhoto }: Props) {
  const router = useRouter();

  // iOS can't present the image picker while a Modal is still closing, so wait for Modal's onDismiss there.
  // Android has no onDismiss, and no such problem, so the callback runs right away.
  const pendingPhoto = useRef(false);

  const usePhoto = () => {
    onClose();
    if (Platform.OS === 'ios') pendingPhoto.current = true;
    else onUseDifferentPhoto();
  };

  const onDismiss = () => {
    if (!pendingPhoto.current) return;
    pendingPhoto.current = false;
    onUseDifferentPhoto();
  };

  const enterManually = () => {
    onClose();
    router.push('/manual-entry');
  };

  return (
    <OverlayModal visible={visible} onRequestClose={onClose} onDismiss={onDismiss}>
      <View style={styles.iconCircle}>
        <Image source={Assets.icons.unreadableScan} style={styles.bigIcon} contentFit="contain" />
      </View>
      <Text style={styles.title}>We couldn't read the text</Text>
      <Text style={styles.message}>
        No text was detected on this photo. Make sure the label is clear, well-lit and inside the frame — or try a
        different photo.
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.primary} onPress={onClose} accessibilityRole="button">
          <Image source={Assets.icons.scanWhiteSmall} style={styles.icon} contentFit="contain" />
          <Text style={styles.primaryText}>Rescan</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={usePhoto} accessibilityRole="button">
          <Image source={Assets.icons.image} style={styles.icon} contentFit="contain" />
          <Text style={styles.secondaryText}>Use a Different Photo</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={enterManually} accessibilityRole="button">
          <Image source={Assets.icons.pencil} style={styles.icon} contentFit="contain" />
          <Text style={styles.linkText}>Enter Details Manually</Text>
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
    backgroundColor: AmberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigIcon: { width: 34, height: 34 },
  icon: { width: 20, height: 20 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  message: { fontSize: 14, lineHeight: 20, color: '#5B6B6C', textAlign: 'center', alignSelf: 'stretch' },
  actions: { alignSelf: 'stretch', gap: 10 },
  primary: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontSize: 15, fontWeight: '700', color: Colors.onAction },
  secondary: {
    backgroundColor: Colors.onAction,
    borderWidth: 1,
    borderColor: Colors.actionPrimary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: Colors.actionPrimary },
  link: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  linkText: { fontSize: 15, fontWeight: '600', color: LinkGreen },
});
