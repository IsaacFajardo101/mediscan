import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAvatarSource } from '../constants/avatars';
import { useProfile } from '../context/ProfileContext';

export default function ProfileDetailScreen() {
  const router = useRouter();
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { profiles, deleteProfileWithUndo } = useProfile();

  const [menuVisible, setMenuVisible] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Find the selected profile
  const profile = profiles.find((p) => p.profile_id.toString() === profileId);

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1B4332" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#718096' }}>Profile not found.</Text>
        </View>
      </SafeAreaView>
    );
  }
  
// DELETE ACTION: Opens the confirmation modal
 const handleDelete = () => {
    setMenuVisible(false);
    setShowConfirmModal(true);
  };

  const handleEdit = () => {
    setMenuVisible(false);
    router.push({
      pathname: '/add-edit-profile' as any,
      params: { mode: 'edit', profileId: profile.profile_id },
    });
  };

  // CONFIRM DELETE ACTION: Deletes profile with 15s undo
  const handleConfirmDelete = () => {
    setShowConfirmModal(false);
    deleteProfileWithUndo(profile.profile_id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1B4332" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{profile.profile_fullname}</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#1B4332" />
        </TouchableOpacity>
      </View>

      {/* 3-Dots Dropdown Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleEdit}>
              <Ionicons name="create-outline" size={18} color="#2D3748" style={{ marginRight: 10 }} />
              <Text style={styles.dropdownText}>Edit Profile</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.dropdownItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#D90429" style={{ marginRight: 10 }} />
              <Text style={[styles.dropdownText, { color: '#D90429' }]}>Remove Profile</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Image 
              source={getAvatarSource(profile.profile_icon)}
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile.profile_fullname}</Text>
            <Text style={styles.userRel}>{profile.profile_display_name}</Text>
          </View>
          <TouchableOpacity style={styles.editBtnOutline} onPress={handleEdit}>
            <Text style={styles.editBtnOutlineText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Medicine Overview Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Medicine Overview</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="medical" size={18} color="#2D6A4F" style={{ marginBottom: 4 }} />
          <Text style={styles.statNum}>5</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={styles.statBox}>
          <Ionicons name="shield-checkmark" size={18} color="#2D6A4F" style={{ marginBottom: 4 }} />
          <Text style={[styles.statNum, { color: '#2D6A4F' }]}>4</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>

        <View style={styles.statBox}>
          <Ionicons name="warning" size={18} color="#D97706" style={{ marginBottom: 4 }} />
          <Text style={[styles.statNum, { color: '#D97706' }]}>1</Text>
          <Text style={styles.statLabel}>Needs Verif.</Text>
        </View>

        <View style={styles.statBox}>
          <Ionicons name="calendar" size={18} color="#DC2626" style={{ marginBottom: 4 }} />
          <Text style={[styles.statNum, { color: '#DC2626' }]}>2</Text>
          <Text style={styles.statLabel}>Expiring</Text>
        </View>
      </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Sample Reminder Cards */}
        <View style={styles.reminderCard}>
          <Ionicons name="medkit-outline" size={22} color="#2D6A4F" />
          <View style={styles.reminderInfo}>
            <Text style={styles.medName}>Paracetamol Biogesic</Text>
            <Text style={styles.medDetails}>Tablet • Expires in December 25, 2026</Text>
          </View>
        </View>

        <View style={styles.reminderCard}>
          <Ionicons name="medkit-outline" size={22} color="#2D6A4F" />
          <View style={styles.reminderInfo}>
            <Text style={styles.medName}>Ibuprofen Advil</Text>
            <Text style={styles.medDetails}>Capsule • Expires in March 15, 2025</Text>
          </View>
        </View>
      </ScrollView>
      
       <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.dialog}>
            <View style={styles.trashCircle}>
              <Ionicons name="trash-outline" size={28} color="#D90429" />
            </View>

            <Text style={styles.dialogTitle}>Remove this profile?</Text>
            <Text style={styles.dialogMsg}>
              Are you sure you want to remove {profile.profile_fullname}'s profile? Her medicines, alerts and reminders will also be deleted.
            </Text>

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.confirmBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
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
  backButton: { padding: 6 },
  topBarTitle: { fontSize: 18, fontWeight: '700', color: '#1B4332' },
  menuButton: { padding: 6 },
  content: { padding: 16 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D8F3DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  userRel: { fontSize: 13, color: '#718096', marginTop: 2 },
  editBtnOutline: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  editBtnOutlineText: { fontSize: 13, fontWeight: '600', color: '#2D3748' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  viewAllText: { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  statNum: { fontSize: 18, fontWeight: '700', color: '#1B4332' },
  statLabel: { fontSize: 11, color: '#718096', marginTop: 2 },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  reminderInfo: { marginLeft: 12 },
  medName: { fontSize: 14, fontWeight: '700', color: '#166534' },
  medDetails: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 150,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  dropdownText: { fontSize: 14, fontWeight: '500', color: '#2D3748' },
  divider: { height: 1, backgroundColor: '#E2E8F0' },
  trashCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  dialog: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignSelf: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B4332',
    textAlign: 'center',
  },
  dialogMsg: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginVertical: 12,
    lineHeight: 18,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#4A5568', fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#D90429',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '700' },
});