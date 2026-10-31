import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Assets } from '@/constants/assets';
import { Colors, Radius, Spacing, Type } from '@/constants/display';
import type { ScanState } from '@/data/mockScanResults';

// Colors used only by this Figma frame that are not in the display.ts tokens yet.
const SubtleText = '#7E7B77';
const Amber = '#E89C38';
const Red = '#D93025';

// Per-state look of the banner (colors + icon).
const variants = {
  verified: {
    bg: '#C5FFC8',
    border: undefined,
    icon: Assets.icons.verified,
    iconSize: { width: 100, height: 90 },
    title: Colors.statusSuccess,
    badgeBg: '#78D07D',
    badgeText: Colors.surfacePrimary,
  },
  needs_verification: {
    bg: '#FFF0DD',
    border: 'rgba(0,0,0,0.12)', // stands in for the inset shadow in Figma
    icon: Assets.icons.warningAmber,
    iconSize: { width: 90, height: 89 },
    title: Amber,
    badgeBg: '#FDE2B7',
    badgeText: '#C58531',
  },
  no_results: {
    bg: '#FDECEC',
    border: 'rgba(0,0,0,0.12)',
    icon: Assets.icons.warningRed,
    iconSize: { width: 90, height: 89 },
    title: Red,
    badgeBg: undefined,
    badgeText: undefined,
  },
} as const;

type Props = {
  status: ScanState;
  title: string;         // e.g. "Verified Medicine"
  subtitle?: string;     // e.g. "High confidence match" (not shown for no_results)
  confidence?: number;   // 0-100 (not shown for no_results)
};

// Banner at the top of the Scan Result screen. Looks different for each state.
export default function VerificationBanner({ status, title, subtitle, confidence }: Props) {
  const v = variants[status];

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 1, borderColor: v.border } : null,
      ]}
    >
      <Image source={v.icon} style={v.iconSize} contentFit="contain" />
      <Text style={[styles.title, { color: v.title }]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {confidence !== undefined && v.badgeBg ? (
        <View style={[styles.confidence, { backgroundColor: v.badgeBg }]}>
          <Text style={[styles.confidenceText, { color: v.badgeText }]}>Confidence: {confidence}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 251,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  title: { ...Type.h1 },
  subtitle: { ...Type.h3, fontWeight: '700', color: SubtleText },
  confidence: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  confidenceText: { ...Type.h3, fontWeight: '700' },
});
