import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
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
import { useProfile } from '../context/ProfileContext';

export default function AddEditProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; profileId?: string }>();
  const isEdit = params.mode === 'edit';

  const { profiles, addProfile, updateProfile } = useProfile();

  const existingProfile = profiles.find(
    (p) => p.profile_id.toString() === params.profileId
  );

  // Form State
  const [fullname, setFullname] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [iconId, setIconId] = useState(1);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

   useEffect(() => {
    if (isEdit && existingProfile) {
      setFullname(existingProfile.profile_fullname);
      setDisplayName(existingProfile.profile_display_name || '');   // ← now one line
      setBirthdate(existingProfile.profile_birthdate);
      setIconId(existingProfile.profile_icon || 1);
    }
  }, [isEdit, existingProfile]);
  
    // Validation: All fields with asterisks (*) are required
  const handleSave = async () => {
    if (!fullname.trim()) {
      Alert.alert('Required Field', 'Please enter Full Name.');
      return;
    }
    if (!displayName.trim()) {
      Alert.alert('Required Field', 'Please enter Nickname / Display Name.');
      return;
    }
    if (!birthdate.trim()) {
      Alert.alert('Required Field', 'Please enter Date of Birth.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && existingProfile) {
        await updateProfile(existingProfile.profile_id, {
          profile_fullname: fullname.trim(),
          profile_display_name: displayName.trim(),
          profile_birthdate: birthdate.trim(),
          profile_icon: iconId,
        });
      } else {
        await addProfile({
          profile_icon: iconId,
          profile_fullname: fullname.trim(),
          profile_display_name: displayName.trim(),
          profile_birthdate: birthdate.trim(),
        });
      }
      router.back();
    } catch (e) {
      Alert.alert('Not saved', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
              style={styles.input}
              placeholder="e.g. Maria Batumbakal"
              placeholderTextColor="#A0AEC0"
              value={fullname}
              onChangeText={setFullname}
            />

            <Text style={styles.label}>
              Nickname / Display Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Me, Mama, Papa"
              placeholderTextColor="#A0AEC0"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Text style={styles.label}>
              Date of Birth <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2004-11-26 or January 1, 2006"
              placeholderTextColor="#A0AEC0"
              value={birthdate}
              onChangeText={setBirthdate}
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
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0E3326',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontSize: 13,
    color: '#2D6A4F',
    fontWeight: '600',
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