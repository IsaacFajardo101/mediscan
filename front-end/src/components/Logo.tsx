import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Assets } from '@/constants/assets';
import { Colors, Type } from '@/constants/display';

// Here yung Logo sizes and icons
type Props = {
  size?: number;
  variant?: 'icon' | 'horizontal' | 'vertical';
  withText?: boolean;
};

export default function Logo({ size = 32, variant, withText = false }: Props) {
  const v = variant ?? (withText ? 'horizontal' : 'icon');

  const icon = (
    <Image
      source={Assets.logo.icon}
      style={{ width: size, height: size, borderRadius: size * 0.25 }}
      resizeMode="cover"
    />
  );

  if (v === 'icon') return icon;

  if (v === 'vertical') {
    return (
      <View style={styles.col}>
        {icon}
        <Text style={styles.small}>MediScan</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {icon}
      <Text style={styles.text}>MediScan</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  col: { alignItems: 'center', gap: 4 },
  text: { ...Type.h2, lineHeight: 26, fontWeight: '800', color: Colors.text, includeFontPadding: false, textAlignVertical: 'center' },
  small: { fontSize: 10, fontWeight: '700', color: Colors.text },
});
