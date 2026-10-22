import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/display';
import DataSync from '@/components/Datasync';
import HealthInfo from '@/components/HealthInfo';

// MOCK DATA: copied from the team's "Fetch Profile.json" response.
// Replace with the real response once the backend is connected.
const MOCK_ACCOUNT = {
  email: 'user@example.com',
  profile: {
    profile_id: 1,
    profile_icon: 3,
    profile_fullname: 'Jane',
    profile_birthdate: '2004-02-26', // the mock file has "2004-26-2004" (invalid), fixed here
    profile_relationship: 'Self', // CHANGES page says this becomes profile_displayname
  },
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [healthOpen, setHealthOpen] = useState(false);

  const { profile, email } = MOCK_ACCOUNT;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name + email */}
        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            {/* TODO: map profile.profile_icon (1-12) to the avatar image */}
            <View style={styles.avatar}>
              <Ionicons name="person" size={44} color={Colors.primary} />
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={11} color="#fff" />
            </View>
          </View>
          <Text style={styles.fullName}>{profile.profile_fullname}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Data Sync (its own component file) */}
        <DataSync />

        {/* Profile rows */}
        <Text style={styles.sectionTitle}>Profile</Text>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.primarySoft }]}
          onPress={() => {
          }}
        >
          <MaterialCommunityIcons name="pencil-outline" size={20} color={Colors.primary} />
          <Text style={styles.rowText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.text} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.primarySoft }]}
          onPress={() => setHealthOpen(true)}
        >
          <MaterialCommunityIcons name="heart-pulse" size={20} color={Colors.primary} />
          <Text style={styles.rowText}>Health Information</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.text} />
        </Pressable>
      </ScrollView>

      {/* Health Information sheet (its own component file) */}
      <HealthInfo visible={healthOpen} onClose={() => setHealthOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  identity: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  avatarWrap: { marginBottom: Spacing.sm + 4 },
  avatar: {
    width: 96, height: 96, borderRadius: Radius.pill, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', right: 0, bottom: 2, width: 24, height: 24, borderRadius: Radius.pill,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  fullName: { fontWeight: '700', color: Colors.text, fontSize: FontSizes.body + 4 },
  email: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  sectionTitle: {
    fontWeight: '700', color: Colors.text, fontSize: FontSizes.body,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4,
    paddingVertical: 14, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm + 2,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  rowText: { flex: 1, color: Colors.text, fontSize: FontSizes.body - 1, fontWeight: '600' },
});