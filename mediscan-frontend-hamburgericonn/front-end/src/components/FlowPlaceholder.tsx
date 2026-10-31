import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '@/constants/display';

type Link = { label: string; route: string; mode?: 'push' | 'replace' };
type Props = { name: string; links?: Link[] };

// Ditong part is yung placeholder screen na ginagamit sa mga screens na wala pang laman.
// It shows the name of the screen and a list of links to navigate to other screens.
// Kung maga-add here kayo ng bagong screen, you can add a link to it here for testing purposes.
export default function FlowPlaceholder({ name, links = [] }: Props) {
  const router = useRouter();
  return (
    <View style={styles.c}>
      <Text style={styles.t}>{name} screen - work in progress</Text>
      {links.map((l) => (
        <Pressable
          key={l.label}
          style={styles.btn}
          onPress={() => (l.mode === 'push' ? router.push(l.route as any) : router.replace(l.route as any))}
        >
          <Text style={styles.btnText}>{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm + 4, backgroundColor: Colors.background },
  t: { color: Colors.textMuted, marginBottom: Spacing.sm },
  btn: { paddingVertical: 12, paddingHorizontal: Spacing.lg, borderRadius: Radius.sm, backgroundColor: Colors.primary },
  btnText: { color: '#fff', fontWeight: '700' },
});