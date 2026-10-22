import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getAvatar } from '@/constants/avatars';
import { Radius } from '@/constants/display';

export default function ProfileAvatar({ icon, size = 64 }: { icon: number; size?: number }) {
  const a = getAvatar(icon);
  return (
    <View style={[styles.circle, { width: size, height: size, backgroundColor: a.bg }]}>
      <Text style={{ fontSize: size * 0.55 }}>{a.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});