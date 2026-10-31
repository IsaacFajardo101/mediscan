import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Type } from '@/constants/display';

type Props = { title: string; links?: { label: string; route: string }[] };

// This part is yung placeholder screen na ginagamit sa mga screens na wala pang laman.
// It shows the name of the screen and a list of links to navigate to other screens.
export default function SheetPlaceholder({ title, links = [] }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Tap the dim area to close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={Colors.text} />
          </Pressable>
        </View>

        <Text style={styles.note}>work in progress</Text>

        {links.map((l) => (
          <Pressable key={l.label} style={styles.btn} onPress={() => router.replace(l.route as any)}>
            <Text style={styles.btnText}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,31,32,0.45)' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    padding: Spacing.lg - 4, minHeight: 260,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, marginBottom: Spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...Type.h3, color: Colors.text },
  note: { color: Colors.textMuted, marginVertical: Spacing.md },
  btn: {
    paddingVertical: 12, paddingHorizontal: Spacing.md, borderRadius: Radius.sm,
    backgroundColor: Colors.primary, alignItems: 'center', marginTop: Spacing.sm,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});