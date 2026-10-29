import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Assets } from '@/constants/assets';
import { Colors, Spacing } from '@/constants/display';

// Dark green top part of the Log In / Sign Up screens: logo, app name, tagline.
export default function AuthHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + Spacing.lg }]}>
      {/* Gradient background (top: action/primary -> bottom: text/primary) */}
      <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="authGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.actionPrimary} />
            <Stop offset="1" stopColor={Colors.textPrimary} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#authGrad)" />
      </Svg>

      <Image source={Assets.logo.iconLight} style={styles.logo} resizeMode="contain" />
      <Text style={styles.name}>MediScan</Text>
      <Text style={styles.tagline}>Your Family's Medicine Companion</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: Colors.actionPrimary,
  },
  logo: { width: 76, height: 76 },
  name: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: Spacing.sm },
  tagline: { color: '#fff', fontSize: 13, marginTop: 4, opacity: 0.9 },
});