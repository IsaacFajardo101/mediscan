import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthHeader from '@/components/AuthHeader';
import ProfileAvatar from '@/components/ProfileAvatar';
import { MockAuth, Profile } from '@/mock/mockAuth';
import { Colors, Radius, Spacing } from '@/constants/display';

// "Choose your profile" screen. Lumalabas after Log In / Verify.
// Shows the profiles from the account data (Fetch Profile). Display name lagi ang pangalan na pinapakita.
// - Tap a profile -> enter the app (tabs).
// - "+ Add" -> Add Family Member.
// - No profiles yet (bagong account) -> straight to Create Profile.
export default function ChooseProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profiles, setProfiles] = useState<Profile[]>(MockAuth.getProfiles());

  // Reload the list every time this screen shows (e.g. after Add Family Member)
  useFocusEffect(
    useCallback(() => {
      setProfiles([...MockAuth.getProfiles()]);
    }, [])
  );

  if (!MockAuth.isLoggedIn()) return <Redirect href="/login" />;
  if (profiles.length === 0) return <Redirect href="/create-profile" />;

  const pick = (p: Profile) => {
    MockAuth.selectProfile(p);
    router.replace('/');
  };

  const logout = () => {
    MockAuth.logout();
    router.replace('/login');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <AuthHeader />

        <View style={styles.body}>
          <Text style={styles.title}>Choose your profile</Text>

          <View style={styles.grid}>
            {profiles.map((p) => (
              <Pressable
                key={p.profile_id}
                style={styles.tile}
                onPress={() => pick(p)}
                accessibilityLabel={`Continue as ${p.profile_display_name}`}
              >
                <ProfileAvatar icon={p.profile_icon} size={72} />
                <Text style={styles.name} numberOfLines={1}>
                  {p.profile_display_name}
                </Text>
              </Pressable>
            ))}

            <Pressable
              style={styles.tile}
              onPress={() => router.push({ pathname: '/create-profile', params: { mode: 'add' } })}
              accessibilityLabel="Add family member"
            >
              <View style={styles.addCircle}>
                <Ionicons name="add" size={32} color={Colors.text} />
              </View>
              <Text style={styles.name}>Add</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <Pressable style={[styles.logout, { marginBottom: insets.bottom + Spacing.md }]} onPress={logout} hitSlop={8}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { paddingHorizontal: Spacing.lg - 4, paddingTop: Spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: Spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', rowGap: Spacing.lg },
  tile: { width: '33.33%', alignItems: 'center', gap: Spacing.sm },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text, maxWidth: '90%' },
  addCircle: {
    width: 72, height: 72, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface,
  },
  logout: { alignSelf: 'center', paddingVertical: Spacing.sm },
  logoutText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
});