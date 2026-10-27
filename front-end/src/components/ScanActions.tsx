import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Assets } from '@/constants/assets';
import { Colors, Radius, Spacing, Type } from '@/constants/display';
import type { ScanState } from '@/data/mockScanResults';

// Colors used only by this Figma frame that are not in the display.ts tokens yet.
const Amber = '#E89C38';
const Red = '#D93025';
const RedSoft = '#FDECEC';
const RedBorder = '#D6D6D6';
const HintText = '#5B6B6C';

type Props = {
  status: ScanState;
  onViewDetails?: () => void; // verified
  onSave?: () => void;        // verified
  onRedoScan?: () => void;    // needs_verification, no_results
};

// Fixed bar at the bottom of the Scan Result screen. The buttons depend on the state.
export default function ScanActions({ status, onViewDetails, onSave, onRedoScan }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
      {status === 'verified' ? (
        <>
          <Pressable style={styles.verifiedPrimary} onPress={onViewDetails} accessibilityRole="button">
            <Image source={Assets.icons.details} style={styles.icon} contentFit="contain" />
            <Text style={[styles.text, { color: Colors.surfacePrimary }]}>View Medicine Details</Text>
          </Pressable>
          <Pressable style={styles.verifiedSecondary} onPress={onSave} accessibilityRole="button">
            <Image source={Assets.icons.save} style={styles.icon} contentFit="contain" />
            <Text style={[styles.text, { color: Colors.textPrimary }]}>Save to Vault</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.hint}>Tap the correct medicine above to edit or save it.</Text>
          {status === 'needs_verification' ? (
            <Pressable style={[styles.button, { backgroundColor: Amber }]} onPress={onRedoScan} accessibilityRole="button">
              <Image source={Assets.icons.scanWhite} style={styles.icon} contentFit="contain" />
              <Text style={[styles.text, { color: Colors.surfacePrimary }]}>Redo Scan</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.button, { backgroundColor: RedSoft, borderWidth: 1, borderColor: RedBorder }]}
              onPress={onRedoScan}
              accessibilityRole="button"
            >
              <Image source={Assets.icons.scanRed} style={styles.icon} contentFit="contain" />
              <Text style={[styles.text, { color: Red }]}>Redo Scan</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.onAction,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 6,
  },
  hint: { fontSize: 13, color: HintText, textAlign: 'center' },

  button: {
    borderRadius: Radius.sm,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm + 2,
  },
  verifiedPrimary: {
    backgroundColor: Colors.statusSuccess,
    borderRadius: Radius.sm,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm + 2,
  },
  verifiedSecondary: {
    backgroundColor: Colors.surfacePrimary,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: Radius.sm,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm + 2,
  },
  icon: { width: 20, height: 20 },
  text: { ...Type.label },
});
