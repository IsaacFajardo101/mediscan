import React, { useState } from 'react';
import {
  Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/display';
import { useProfile } from '@/context/ProfileContext';
import AvatarPickerSheet from '@/components/AvatarPickerSheet';
import DataSync from '@/components/Datasync';
import ProfileAvatar from '@/components/ProfileAvatar';
import HealthInfo from '@/components/HealthInfo';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [healthOpen, setHealthOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
    // The logged-in account + the profile picked on "Choose your profile"
  const { activeProfile: profile, email, updateProfile } = useProfile();
  // Shows the new avatar right away while the save is in progress
  const [savingIcon, setSavingIcon] = useState<number | null>(null);

  if (!profile) return <Redirect href="/choose-profile" />;

  const iconId = savingIcon ?? profile.profile_icon;

  const chooseAvatar = async (id: number) => {
    setPickerOpen(false);
    if (id === profile.profile_icon) return;
    setSavingIcon(id);
    try {
      await updateProfile(profile.profile_id, { profile_icon: id });
    } catch (e) {
      Alert.alert('Avatar not saved', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSavingIcon(null);
    }
  };

  const openEdit = () =>
    router.push({
      pathname: '/add-edit-profile',
      params: { mode: 'edit', profileId: String(profile.profile_id) },
    } as any);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name + email */}
        <View style={styles.identity}>
          <Pressable
            style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.8 }]}
            onPress={() => setPickerOpen(true)}
            accessibilityLabel="Change profile picture"
          >
            <ProfileAvatar icon={iconId} size={96} />
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </View>
          </Pressable>
          <Text style={styles.fullName}>{profile.profile_fullname}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Data Sync (its own component file) */}
        <DataSync />

        {/* Profile rows */}
        <Text style={styles.sectionTitle}>Profile</Text>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.primarySoft }]}
          onPress={openEdit}
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

      {/* Avatar picker (same sheet as Create Profile / Add-Edit Profile) */}
      <AvatarPickerSheet
        visible={pickerOpen}
        selected={iconId}
        onClose={() => setPickerOpen(false)}
        onSave={chooseAvatar}
      />

      {/* Health Information sheet (its own component file) */}
      <HealthInfo visible={healthOpen} onClose={() => setHealthOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  identity: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  avatarWrap: { marginBottom: Spacing.sm + 4 },
  // Same pencil badge as Create Profile / Add-Edit Profile
  editBadge: {
    position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: Radius.pill,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surface,
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