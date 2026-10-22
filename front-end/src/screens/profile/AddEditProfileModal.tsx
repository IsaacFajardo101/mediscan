import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useProfile } from '../../context/ProfileContext';

export default function AddEditProfileModal({ route, navigation }: any) {
  const { mode, profile } = route.params || { mode: 'create' };
  const { addProfile, updateProfile } = useProfile();

  // Form Fields mapped directly to your JSON mock schema
  const [iconId, setIconId] = useState<number>(profile?.profile_icon || 5);
  const [fullname, setFullname] = useState(profile?.profile_fullname || '');
  const [birthdate, setBirthdate] = useState(profile?.profile_birthdate || '');
  const [relationship, setRelationship] = useState(profile?.profile_display_name || '');
  const [showPicker, setShowPicker] = useState(false);

  const avatarIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const handleSave = async () => {
    if (!fullname.trim() || !birthdate.trim() || !relationship.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    if (mode === 'create') {
      // Sends Add Profile.json payload
      await addProfile({
        profile_icon: iconId,
        profile_fullname: fullname.trim(),
        profile_birthdate: birthdate.trim(),
        profile_display_name: relationship.trim(),
      });
    } else {
      // Sends Edit Profile.json payload
      await updateProfile(profile.profile_id, {
        profile_icon: iconId,
        profile_fullname: fullname.trim(),
        profile_birthdate: birthdate.trim(),
        profile_display_name: relationship.trim(),
      });
    }
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Avatar Selector */}
      <View style={styles.avatarWrapper}>
        <TouchableOpacity style={styles.avatarCircle} onPress={() => setShowPicker(true)}>
          <Ionicons name="person" size={44} color="#2D6A4F" />
          <View style={styles.badge}><Ionicons name="camera" size={14} color="#FFF" /></View>
        </TouchableOpacity>
        <Text style={styles.avatarLabel}>Selected Avatar: #{iconId}</Text>
      </View>

      {/* Full Name Field */}
      <Text style={styles.label}>Full Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Johana"
        value={fullname}
        onChangeText={setFullname}
      />

      {/* Relationship / Display Tag Field */}
      <Text style={styles.label}>Relationship (or Display Label) *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Mom, Self, Child, Brother"
        value={relationship}
        onChangeText={setRelationship}
      />

      {/* Birthdate Field */}
      <Text style={styles.label}>Date of Birth (YYYY-MM-DD) *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2004-11-03"
        value={birthdate}
        onChangeText={setBirthdate}
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
        <Text style={styles.submitText}>{mode === 'create' ? 'Save Family Member' : 'Save Changes'}</Text>
      </TouchableOpacity>

      {/* Avatar Picker Modal */}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.pickerBox}>
            <Text style={styles.pickerTitle}>Choose an Avatar</Text>
            <FlatList
              data={avatarIds}
              numColumns={4}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.avatarOption, iconId === item && styles.selectedOption]}
                  onPress={() => { setIconId(item); setShowPicker(false); }}
                >
                  <Text style={styles.optionText}>#{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  avatarWrapper: { alignItems: 'center', marginBottom: 20 },
  avatarCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#D8F3DC', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#2D6A4F', padding: 6, borderRadius: 12 },
  avatarLabel: { marginTop: 8, fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  label: { fontSize: 13, color: '#4A5568', fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 16 },
  submitBtn: { backgroundColor: '#1B4332', height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerBox: { backgroundColor: '#FFF', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  avatarOption: { flex: 1, aspectRatio: 1, margin: 6, backgroundColor: '#F1F5F9', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  selectedOption: { borderWidth: 2, borderColor: '#2D6A4F', backgroundColor: '#D8F3DC' },
  optionText: { fontSize: 15, fontWeight: '700', color: '#1B4332' },
});