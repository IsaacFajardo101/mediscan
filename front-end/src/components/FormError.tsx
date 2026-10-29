import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/display';

export default function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={18} color={Colors.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.statusDangerSoft, borderRadius: Radius.sm,
    paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.sm + 4, marginBottom: Spacing.md - 2,
  },
  text: { flex: 1, color: Colors.danger, fontSize: 14, lineHeight: 19 },
});