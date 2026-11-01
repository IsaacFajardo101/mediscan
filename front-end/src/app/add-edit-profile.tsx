import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AvatarPickerSheet from '../components/AvatarPickerSheet';
import ProfileAvatar from '../components/ProfileAvatar';
import ReminderDialog from '../components/ReminderDialog';
import { useProfile } from '../context/ProfileContext';
import { fromApiDate, maskDate, toApiDate } from '../lib/validation';

export default function AddEditProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; profileId?: string }>();
  const isEdit = params.mode === 'edit';

  const { profiles, addProfile, updateProfile } = useProfile();

  const existingProfile = profiles.find(
    (p) => p.profile_id.toString() === params.profileId
  );

  // Form State — pre-filled from the profile when editing (no useEffect needed)
  const [fullname, setFullname] = useState(() => (isEdit ? existingProfile?.profile_fullname ?? '' : ''));
  const [displayName, setDisplayName] = useState(() => (isEdit ? existingProfile?.profile_display_name ?? '' : ''));
  const [birthdate, setBirthdate] = useState(() => (isEdit ? fromApiDate(existingProfile?.profile_birthdate) : '')); // "2004-02-26" -> "02/26/2004"
  const [iconId, setIconId] = useState(() => (isEdit ? existingProfile?.profile_icon || 1 : 1));
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  // Required-field reminder popup + which fields to outline in red
  const [missing, setMissing] = useState<string[]>([]);
  const [badDate, setBadDate] = useState(false);
  const [reminder, setReminder] = useState<{ title: string; message: string; items?: string[] } | null>(null);

  // Validation: All fields with asterisks (*) are required
  const handleSave = async () => {
    const empty: string[] = [];
    if (!fullname.trim()) empty.push('Full Name');
    if (!displayName.trim()) empty.push('Nickname / Display Name');
    if (!birthdate.trim()) empty.push('Date of Birth');
    setMissing(empty);
    if (empty.length) {
      setBadDate(false);
      setReminder({
        title: 'Required fields',
        message: 'Please fill out the following before saving:',
        items: empty,
      });
      return;
    }

    // Date of Birth: numbers only, MM/DD/YYYY -> sent to backend as YYYY-MM-DD
    const apiBirthdate = toApiDate(birthdate);
    setBadDate(!apiBirthdate);
    if (!apiBirthdate) {
      setReminder({
        title: 'Invalid date of birth',
        message: 'Please enter the date of birth in numbers as MM/DD/YYYY (e.g. 02/26/2004).',
      });
      return;
    }

    setSaving(true);
    try {
      if (isEdit && existingProfile) {
        await updateProfile(existingProfile.profile_id, {
          profile_fullname: fullname.trim(),
          profile_display_name: displayName.trim(),
          profile_birthdate: apiBirthdate,
          profile_icon: iconId,
        });
      } else {
        await addProfile({
          profile_icon: iconId,
          profile_fullname: fullname.trim(),
          profile_display_name: displayName.trim(),
          profile_birthdate: apiBirthdate,
        });
      }
      router.back();
    } catch (e) {
      setReminder({ title: 'Not saved', message: e instanceof Error ? e.message : 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1B4332" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {isEdit ? 'Edit Profile' : 'Add Family Member'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar Section: Consistent with Create Profile */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrap}
              activeOpacity={0.8}
              onPress={() => setShowPicker(true)}
            >
              <ProfileAvatar icon={iconId} size={96} />
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Choose avatar</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, missing.includes('Full Name') && styles.inputInvalid]}
              placeholder="e.g. Maria Batumbakal"
              placeholderTextColor="#A0AEC0"
              autoCapitalize="words"
              value={fullname}
              onChangeText={(t) => {
                setFullname(t);
                setMissing((m) => m.filter((f) => f !== 'Full Name'));
              }}
            />

            <Text style={styles.label}>
              Nickname / Display Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, missing.includes('Nickname / Display Name') && styles.inputInvalid]}
              placeholder="e.g. Me, Mama, Papa"
              placeholderTextColor="#A0AEC0"
              autoCapitalize="words"
              value={displayName}
              onChangeText={(t) => {
                setDisplayName(t);
                setMissing((m) => m.filter((f) => f !== 'Nickname / Display Name'));
              }}
            />

            <Text style={styles.label}>
              Date of Birth (MM/DD/YYYY) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, (missing.includes('Date of Birth') || badDate) && styles.inputInvalid]}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#A0AEC0"
              keyboardType="number-pad"
              maxLength={10}
              value={birthdate}
              onChangeText={(t) => {
                setBirthdate(maskDate(t)); // numbers only, slashes added automatically
                setBadDate(false);
                setMissing((m) => m.filter((f) => f !== 'Date of Birth'));
              }}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Family Member'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Required-field reminder popup */}
      <ReminderDialog
        visible={!!reminder}
        title={reminder?.title ?? ''}
        message={reminder?.message ?? ''}
        items={reminder?.items}
        onClose={() => setReminder(null)}
      />

      {/* Shared AvatarPickerSheet (Identical to Create Profile) */}
      <AvatarPickerSheet
        visible={showPicker}
        selected={iconId}
        onClose={() => setShowPicker(false)}
        onSave={(newIcon: number) => {
          setIconId(newIcon);
          setShowPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: { padding: 4 },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: '#1B4332' },
  scrollContent: { padding: 24, justifyContent: 'space-between', flexGrow: 1 },
  avatarSection: { alignItems: 'center', marginVertical: 16 },
  avatarWrap: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  // Same pencil badge as Create Profile
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#183732',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8FAFC',
  },
  avatarHint: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '700',
    marginTop: 8,
  },
  form: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
  required: { color: '#E53E3E' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#1A202C',
    marginBottom: 18,
    backgroundColor: '#FAFAFA',
  },
  inputInvalid: { borderColor: '#E53E3E', borderWidth: 1.5 },
  saveBtn: {
    backgroundColor: '#0E3326',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});