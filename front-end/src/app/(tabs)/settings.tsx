import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Type } from '@/constants/display';

const icon = { size: 22, color: Colors.primary };

type Row = { label: string; icon: React.ReactElement; route: string; value?: string };

// Dito is yung settings screen. It shows the profile card and the list of settings options.
// The settings options are grouped into sections. Each option has a label, an icon, and a route to navigate to when tapped. 
// Some options also have a value displayed on the right side.
const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: 'Preferences',
    rows: [
      { label: 'Appearance', route: '/appearance', icon: <MaterialCommunityIcons name="theme-light-dark" {...icon} /> },
      { label: 'Language', route: '/language', value: 'English', icon: <Ionicons name="globe-outline" {...icon} /> }, // Filipino + English only
      { label: 'Notifications', route: '/notification-settings', icon: <Ionicons name="notifications-outline" {...icon} /> },
    ],
  },
  {
    title: 'Security & Privacy',
    rows: [
      { label: 'Privacy', route: '/privacy', icon: <Ionicons name="shield-outline" {...icon} /> }, // Camera Access only
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Help & Support', route: '/help-support', icon: <Ionicons name="help-circle-outline" {...icon} /> }, // FAQ only
      { label: 'About MediScan', route: '/about', icon: <Ionicons name="information-circle-outline" {...icon} /> },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Profile card */}
      <Pressable
        style={({ pressed }) => [styles.profileCard, pressed && { backgroundColor: Colors.primarySoft }]}
        onPress={() => router.navigate('/profile' as any)}
      >
       {/* ang need dito is yung avatar */}
        <View style={styles.avatar}>
          <Ionicons name="person" size={30} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Maria Batumbakal</Text>
          <Text style={styles.email}>mariabatumbakal@email.com</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.text} />
      </Pressable>

      {SECTIONS.map((s) => (
        <View key={s.title}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          {s.rows.map((r) => (
            <Pressable
              key={r.label}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.primarySoft }]}
              onPress={() => router.navigate(r.route as any)}
            >
              {r.icon}
              <Text style={styles.rowLabel}>{r.label}</Text>
              {r.value ? <Text style={styles.rowValue}>{r.value}</Text> : null}
              <Ionicons name="chevron-forward" size={18} color={Colors.text} />
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  avatar: {
    width: 56, height: 56, borderRadius: Radius.pill, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { ...Type.h3, color: Colors.text },
  email: { ...Type.caption, color: Colors.textMuted },
  sectionTitle: { ...Type.h3, color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4,
    paddingVertical: 14, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  rowLabel: { ...Type.label, flex: 1, color: Colors.text },
  rowValue: { ...Type.body, color: Colors.border, fontWeight: '600' },
});