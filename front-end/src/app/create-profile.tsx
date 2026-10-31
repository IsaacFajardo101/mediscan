import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthInput from '@/components/AuthInput';
import AvatarPickerSheet from '@/components/AvatarPickerSheet';
import FormError from '@/components/FormError';
import ProfileAvatar from '@/components/ProfileAvatar';
import { MockAuth } from '@/mock/mockAuth';
import { maskDate, toApiDate } from '@/lib/validation';
import { Colors, Radius, Spacing } from '@/constants/display';

// Two uses:
//  - "Create Profile"     -> first profile of a new account (no profiles yet). After saving -> Home.
//  - "Add Family Member"  -> from the "+ Add" tile (?mode=add). After saving -> back to Choose Profile.
// Fields: avatar, Full Name (required), Nickname / Display Name, Date of Birth.
// CHANGES: wala nang Relationship (Display Name na lagi), wala ring Allergies (wala sa backend).
export default function CreateProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  // First profile of a new account? (frozen on open so the title doesn't flip after saving)
  const [isFirst] = useState(() => mode !== 'add' && MockAuth.getProfiles().length === 0);

  const [icon, setIcon] = useState(3);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (isFirst) {
      // nothing behind the first profile screen -> back to Log In
      MockAuth.logout();
      router.replace('/login');
    } else router.replace('/choose-profile');
  };

  const onSave = async () => {
    setError(null);
    const name = fullName.trim();
    if (!name) return setError('Please enter a full name.');
    const birthdate = toApiDate(dob);
    if (!birthdate) return setError('Please enter a valid date of birth (MM/DD/YYYY).');

    setLoading(true);
    const res = await MockAuth.addProfile({
      profile_icon: icon,
      profile_fullname: name,
      // Display name is always shown. If left blank, use the first name.
      profile_display_name: displayName.trim() || name.split(' ')[0],
      profile_birthdate: birthdate,
    });
    setLoading(false);
    if (!res.success || !res.data) return setError(res.message);

    if (isFirst) {
      MockAuth.selectProfile(res.data);
      router.replace('/'); // straight into the app
    } else {
      goBack(); // back to Choose your profile
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{isFirst ? 'Create Profile' : 'Add Family Member'}</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {isFirst ? (
          <>
            <Text style={styles.title}>Let's set up your profile</Text>
            <Text style={styles.subtitle}>This will be the first profile on MediScan. You can add family members later.</Text>
          </>
        ) : null}

        {/* Avatar */}
        <Pressable style={styles.avatarWrap} onPress={() => setPickerOpen(true)} accessibilityLabel="Choose avatar">
          <View>
            <ProfileAvatar icon={icon} size={96} />
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.avatarLabel}>Choose avatar</Text>
        </Pressable>

        <FormError message={error} />

        <AuthInput
          label="Full Name *"
          placeholder="e.g. Maria Batumbakal"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
        />
        <AuthInput
          label="Nickname / Display Name"
          placeholder="e.g. Me, Mama, Papa"
          autoCapitalize="words"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <AuthInput
          label="Date of Birth"
          placeholder="MM / DD / YYYY"
          keyboardType="number-pad"
          value={dob}
          onChangeText={(t) => setDob(maskDate(t))}
          maxLength={10}
        />

        <View style={{ flex: 1 }} />
        <Pressable
          style={[styles.primaryBtn, { marginBottom: insets.bottom + Spacing.md }, loading && styles.disabled]}
          onPress={onSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.primaryText}>{isFirst ? 'Create Profile' : 'Save Family Member'}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <AvatarPickerSheet
        visible={pickerOpen}
        selected={icon}
        onClose={() => setPickerOpen(false)}
        onSave={(i) => {
          setIcon(i);
          setPickerOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg - 4, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  body: { flexGrow: 1, paddingHorizontal: Spacing.lg - 4, paddingTop: Spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, lineHeight: 20, color: Colors.textMuted, marginTop: 4 },
  avatarWrap: { alignSelf: 'center', alignItems: 'center', marginVertical: Spacing.lg },
  editBadge: {
    position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: Radius.pill,
    backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLabel: { marginTop: Spacing.sm, color: Colors.success, fontSize: 14, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row', gap: Spacing.sm, height: 50, borderRadius: Radius.sm + 2, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg,
  },
  disabled: { opacity: 0.7 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});