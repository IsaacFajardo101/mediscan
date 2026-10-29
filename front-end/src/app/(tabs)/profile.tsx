import React, { useState } from 'react';
import {
  FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/display';
import { getAvatarSource } from '@/constants/avatars';
import { useProfile } from '@/context/ProfileContext';
import DataSync from '@/components/Datasync';
import HealthInfo from '@/components/HealthInfo';

const MOCK_ACCOUNT = {
  email: 'user@example.com',
  profile: {
    profile_id: 1,
    profile_icon: 3,
    profile_fullname: 'Jane',
    profile_birthdate: '2004-02-26',
    profile_display_name: 'Self', 
  },
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [healthOpen, setHealthOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { updateProfile } = useProfile();

  const { profile, email } = MOCK_ACCOUNT;
  const [iconId, setIconId] = useState(profile.profile_icon);

  const chooseAvatar = async (id: number) => {
    setIconId(id);
    setPickerOpen(false);
    try {
      await updateProfile(profile.profile_id, { profile_icon: id });
    } catch (e) {
      console.warn('Could not save avatar', e);
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
            <View style={styles.avatar}>
              <Image
                source={getAvatarSource(iconId)}
                style={{ width: 96, height: 96, borderRadius: 48 }}
              />
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={11} color="#fff" />
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

      {/* Avatar picker */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBg}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerOpen(false)} />
          <View style={[styles.pickerBox, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choose an Avatar</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              numColumns={4}
              keyExtractor={(id) => id.toString()}
              renderItem={({ item: id }) => (
                <Pressable
                  style={[styles.avatarOption, iconId === id && styles.selectedOption]}
                  onPress={() => chooseAvatar(id)}
                >
                  <Image
                    source={getAvatarSource(id)}
                    style={{ width: 52, height: 52, borderRadius: 26 }}
                  />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

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

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerBox: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: 420,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  avatarOption: {
    flex: 1, aspectRatio: 1, margin: 6, borderRadius: 12,
    backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  selectedOption: {
    borderWidth: 2.5, borderColor: Colors.primary, backgroundColor: Colors.primarySoft,
  },
});