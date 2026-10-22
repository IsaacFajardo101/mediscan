import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useProfile } from '../../context/ProfileContext';

export default function ProfileDetailScreen({ route, navigation }: any) {
  const { profileId } = route.params;
  const { profiles, deleteProfileWithUndo } = useProfile();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const profile = profiles.find((p) => p.profile_id === profileId);
  if (!profile) return null;

  const handleConfirmDelete = () => {
    setShowConfirmModal(false);
    deleteProfileWithUndo(profile.profile_id);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Profile Header Card */}
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#2D6A4F" />
        </View>
        <Text style={styles.profileName}>{profile.profile_fullname}</Text>
        <Text style={styles.subtext}>{profile.profile_relationship} • {profile.profile_birthdate}</Text>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('AddEditProfile', { mode: 'edit', profile })}
        >
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Medicine Overview Section (From Doc Page 48) */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Medicine Overview</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Vault')}>
          <Text style={styles.linkText}>View All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}><Text style={styles.statNum}>5</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum, { color: '#2D6A4F' }]}>4</Text><Text style={styles.statLabel}>Verified</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum, { color: '#E09F3E' }]}>1</Text><Text style={styles.statLabel}>Needs Verif.</Text></View>
        <View style={styles.statBox}><Text style={[styles.statNum, { color: '#9E2A2B' }]}>2</Text><Text style={styles.statLabel}>Expiring</Text></View>
      </View>

      {/* Remove Profile Link */}
      <TouchableOpacity style={styles.deleteLink} onPress={() => setShowConfirmModal(true)}>
        <Ionicons name="trash-outline" size={18} color="#D90429" style={{ marginRight: 6 }} />
        <Text style={styles.deleteLinkText}>Remove Profile</Text>
      </TouchableOpacity>

      {/* Deletion Dialog */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.dialog}>
            <Ionicons name="trash" size={36} color="#D90429" style={{ alignSelf: 'center' }} />
            <Text style={styles.dialogTitle}>Remove this profile?</Text>
            <Text style={styles.dialogMsg}>
              Are you sure you want to remove {profile.profile_fullname}'s profile? You can still undo this within 15 seconds.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmDelete}>
                <Text style={styles.confirmBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 16 },
  cardHeader: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 14,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#D8F3DC', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#1B4332' },
  subtext: { fontSize: 13, color: '#718096', marginTop: 2 },
  editBtn: { marginTop: 14, borderWidth: 1, borderColor: '#2D6A4F', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 20 },
  editBtnText: { color: '#2D6A4F', fontWeight: '600', fontSize: 13 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  linkText: { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { flex: 1, alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, marginHorizontal: 3, backgroundColor: '#FFFFFF' },
  statNum: { fontSize: 18, fontWeight: '700', color: '#1B4332' },
  statLabel: { fontSize: 11, color: '#718096', marginTop: 2 },
  deleteLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  deleteLinkText: { color: '#D90429', fontWeight: '600', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  dialog: { width: '82%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  dialogTitle: { fontSize: 17, fontWeight: '700', color: '#1B4332', textAlign: 'center', marginTop: 10 },
  dialogMsg: { fontSize: 13, color: '#718096', textAlign: 'center', marginVertical: 12 },
  dialogActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', marginRight: 6, borderRadius: 8, backgroundColor: '#EDF2F7' },
  cancelBtnText: { color: '#4A5568', fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 12, alignItems: 'center', marginLeft: 6, borderRadius: 8, backgroundColor: '#D90429' },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '600' },
});