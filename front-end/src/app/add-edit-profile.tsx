import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { getAvatarSource } from '../constants/avatars'; //
import { useProfile } from '../context/ProfileContext';

export default function AddEditProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; profileId?: string }>();
  const isEdit = params.mode === 'edit';

  const { profiles, addProfile, updateProfile } = useProfile();

  // Find profile if in edit mode
  const existingProfile = profiles.find(
    (p) => p.profile_id.toString() === params.profileId
  );

  // Form State
  const [fullname, setFullname] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [iconId, setIconId] = useState(1);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (isEdit && existingProfile) {
      setFullname(existingProfile.profile_fullname);
      setDisplayName(existingProfile.profile_display_name);
      setBirthdate(existingProfile.profile_birthdate);
      setIconId(existingProfile.profile_icon || 1);
    }
  }, [isEdit, existingProfile]);

  const handleSave = async () => {
    if (!fullname.trim()) {
      Alert.alert('Required', 'Please enter a full name.');
      return;
    }
   if (!displayName.trim()) {
      Alert.alert('Required', 'Please enter a nickname / display name.');
      return;
}

    if (isEdit && existingProfile) {
      await updateProfile(existingProfile.profile_id, {
        profile_fullname: fullname.trim(),
        profile_display_name: displayName.trim(),
        profile_birthdate: birthdate.trim() || '2000-01-01',
        profile_icon: iconId,
      });
    } else {
      await addProfile({
        profile_icon: iconId,
        profile_fullname: fullname.trim(),
        profile_display_name: displayName.trim(),
        profile_birthdate: birthdate.trim() || '2000-01-01',
      });
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header with Back Arrow */}
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
          {/* Avatar Circle */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarCircle}
              activeOpacity={0.8}
              onPress={() => setShowPicker(true)}
            >
              <Image
                source={getAvatarSource(iconId)}
                style={{ width: 96, height: 96, borderRadius: 48 }}
              />
             <View style={styles.editBadge}>
                  <Ionicons name={isEdit ? 'pencil' : 'add'} size={14} color="#FFFFFF" />
               </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to choose avatar</Text>
          </View>

          {/* Input Fields */}
          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter full name"
              placeholderTextColor="#A0AEC0"
              value={fullname}
              onChangeText={setFullname}
            />

            <Text style={styles.label}>Relationship</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Me, Mama, Papa"
              placeholderTextColor="#A0AEC0"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter date of birth (e.g. January 1, 2006)"
              placeholderTextColor="#A0AEC0"
              value={birthdate}
              onChangeText={setBirthdate}
            />
          </View>

          {/* Bottom Save Button */}
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={handleSave}>
            <Text style={styles.saveBtnText}>
              {isEdit ? 'Save Changes' : 'Save Family Member'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.pickerBox}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choose an Avatar</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              numColumns={4}
              keyExtractor={(id) => id.toString()}
              renderItem={({ item: id }) => (
                <TouchableOpacity
                  style={[
                    styles.avatarOption,
                    iconId === id && styles.selectedOption,
                  ]}
                  onPress={() => {
                    setIconId(id);
                    setShowPicker(false);
                  }}
                >
                  <Image
                    source={getAvatarSource(id)}
                    style={{ width: 52, height: 52, borderRadius: 26 }}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
  avatarSection: { alignItems: 'center', marginVertical: 20 },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleAdd: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#52B788',
    borderStyle: 'dashed',
  },
  avatarCircleEdit: {
    backgroundColor: '#FFD6D6',
  },
  form: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 6 },
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
  
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#2D6A4F',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: {
    fontSize: 12,
    color: '#2D6A4F',
    fontWeight: '600',
    marginTop: 8,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: 380,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B4332',
  },
  avatarOption: {
    flex: 1,
    aspectRatio: 1,
    margin: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAF9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedOption: {
    borderWidth: 2.5,
    borderColor: '#2D6A4F',
    backgroundColor: '#D8F3DC',
  },
});