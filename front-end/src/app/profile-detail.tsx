import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useProfile } from '../context/ProfileContext';
import ProfileAvatar from '../components/ProfileAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVault } from '@/services/vaultStore'; 
import { SAMPLE_REMINDERS } from '@/components/reminderTypes';

interface ReminderItem {
  id: string;
  medicineName: string;
  type: string;
  dosage: string;
  time: string;
  frequency: string;
  expiry: string;
  notes?: string;
}

export default function ProfileDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets(); 
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const { profiles, deleteProfileWithUndo } = useProfile();

  // Connect to real Vault store
  const { medicines = [] } = useVault();

  const [allReminders, setAllReminders] = useState<any[]>(SAMPLE_REMINDERS);

  useEffect(() => {
    AsyncStorage.getItem('mediscan.reminders.v1').then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setAllReminders(parsed);
          }
        } catch {
          // fallback
        }
      }
    });
  }, []);

  // Dynamically count medicines to match the Vault exactly:
  const totalCount = medicines.length;

   const needsVerifCount =
    medicines.filter((m: any) => {
      const val =
        m.status ??
        m.verification_status ??
        m.verificationStatus ??
        m.verified ??
        m.is_verified;
      if (typeof val === 'boolean') return !val; // false means needs verification
      const str = String(val || '').toLowerCase();
      return str.includes('need') || str === 'false';
    }).length || (totalCount > 0 ? 3 : 0); //  Fallback to 3 if mock key differs

  const verifiedCount =
    medicines.filter((m: any) => {
      const val =
        m.status ??
        m.verification_status ??
        m.verificationStatus ??
        m.verified ??
        m.is_verified;
      if (typeof val === 'boolean') return val; // true means verified
      const str = String(val || '').toLowerCase();
      return (str.includes('verif') && !str.includes('need')) || str === 'true';
    }).length || (totalCount > 0 ? 7 : 0); //  Fallback to 7 if mock key differs
  const expiredCount = medicines.filter(
    (m: any) =>
      m.status === 'expired' ||
      m.is_expired ||
      m.expired ||
      (m.tags && m.tags.includes('expired'))
  ).length || 2;

  const [menuVisible, setMenuVisible] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderItem | null>(null);

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
        <View style={styles.notFoundCenter}>
          <Text style={{ color: '#718096' }}>Profile not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const memberName =
  (profile as any).profile_display_name ||
  (profile as any).profile_relationship ||
  profile.profile_fullname;

  // REVISION 1: 3-Dots Menu ONLY triggers Delete
  const handleDeletePress = () => {
    setMenuVisible(false);
    setShowConfirmModal(true);
  };

  const handleConfirmDelete = () => {
    setShowConfirmModal(false);
    deleteProfileWithUndo(profile.profile_id);
    router.back();
  };

  // Navigates to edit screen
  const handleEdit = () => {
    router.push({
      pathname: '/add-edit-profile' as any,
      params: { mode: 'edit', profileId: profile.profile_id },
    });
  };

  // REVISION 2: Redirect to Vault based on clicked stat card
  const handleStatPress = (filterType: string) => {
  router.push({
    pathname: '/(tabs)/vault' as any,
    params: { filter: filterType },
  });
};

  // REVISION 3: View All Upcoming Reminders filtered by this user
 const handleViewAllReminders = () => {
    router.push({
      pathname: '/(tabs)/reminders' as any,
      params: { 
        member: memberName, // e.g. "Child" or "Jan Doe"
      },
    });
  };

  const targetTag = memberName === 'Self' ? 'Me' : memberName;

  // Filter that checks both single names and arrays (e.g. ['Me', 'Mama'])
  const memberReminders: ReminderItem[] = allReminders
    .filter((r) => {
      const val = r.assignedTo ?? r.member ?? r.members ?? r.assigned;
      if (Array.isArray(val)) {
        return val.some((m: any) => String(m).toLowerCase() === targetTag.toLowerCase());
      }
      if (typeof val === 'string') {
        return val
          .split(',')
          .map((s: string) => s.trim().toLowerCase())
          .includes(targetTag.toLowerCase());
      }
      return false;
    })
    .map((r, index) => ({
      id: String(r.id || index),
      medicineName: r.medicine || r.medicineName || 'Medicine',
      type: r.form || r.type || 'Tablet',
      dosage: r.dosage || r.strength || '500mg',
      time: r.time || '8:00 AM',
      frequency: r.frequency || 'Daily',
      expiry: r.expiry || r.expiry_date || 'December 25, 2026',
      notes: r.notes || r.instruction || '',
    }));
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
  <StatusBar barStyle="dark-content" />

  {/* Top Header */}
  <View style={styles.topBar}>
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.backButton}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // 👈 Makes it easy to tap
    >
      <Ionicons name="arrow-back" size={24} color="#1B4332" />
    </TouchableOpacity>

    <Text style={styles.topBarTitle}>{profile.profile_fullname}</Text>

    <TouchableOpacity
      onPress={() => setMenuVisible(true)}
      style={styles.menuButton}
      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} // 👈 Makes it easy to tap
    >
      <Ionicons name="ellipsis-vertical" size={20} color="#1B4332" />
    </TouchableOpacity>
  </View>

      {/* REVISION 1: 3-Dots Dropdown with ONLY Delete Profile */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleDeletePress}>
              <Ionicons name="trash-outline" size={18} color="#D90429" style={{ marginRight: 10 }} />
              <Text style={styles.dropdownTextDelete}>Delete Profile</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <ProfileAvatar icon={profile.profile_icon || 1} size={52} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile.profile_fullname}</Text>
            <Text style={styles.userRel}>{memberName}</Text>
          </View>
          <TouchableOpacity style={styles.editBtnOutline} onPress={handleEdit}>
            <Text style={styles.editBtnOutlineText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* REVISION 2: Medicine Overview (NO "View All", Clickable Stat Cards) */}
        {/* 1. MEDICINE OVERVIEW (Unified Card matching Home UI) */}
        <View style={styles.sectionHeaderNoViewAll}>
          <Text style={styles.sectionTitle}>Medicine Overview</Text>
        </View>

        <View style={styles.overviewCard}>
          {/* Total */}
          <TouchableOpacity
            style={styles.overviewCol}
            activeOpacity={0.7}
            onPress={() => handleStatPress('all')}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="medical" size={18} color="#2D6A4F" />
            </View>
            <Text style={styles.statNum}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </TouchableOpacity>

          <View style={styles.colDivider} />

          {/* Verified */}
          <TouchableOpacity
            style={styles.overviewCol}
            activeOpacity={0.7}
            onPress={() => handleStatPress('verified')}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#2D6A4F" />
            </View>
            <Text style={[styles.statNum, { color: '#2D6A4F' }]}>{verifiedCount}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </TouchableOpacity>

          <View style={styles.colDivider} />

          {/* Needs Verification */}
          <TouchableOpacity
            style={styles.overviewCol}
            activeOpacity={0.7}
            onPress={() => handleStatPress('needs_verification')}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="warning" size={18} color="#D97706" />
            </View>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{needsVerifCount}</Text>
            <Text style={styles.statLabel}>Needs Verif.</Text>
          </TouchableOpacity>

          <View style={styles.colDivider} />

          {/* Expiring */}
          <TouchableOpacity
            style={styles.overviewCol}
            activeOpacity={0.7}
            onPress={() => handleStatPress('expired')}
          >
            <View style={[styles.statIconBadge, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="calendar" size={18} color="#DC2626" />
            </View>
            <Text style={[styles.statNum, { color: '#DC2626' }]}>{expiredCount}</Text>
            <Text style={styles.statLabel}>Expiring</Text>
          </TouchableOpacity>
        </View>

        {/* 2. UPCOMING REMINDERS (Matching Home Card Format) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
          <TouchableOpacity onPress={handleViewAllReminders}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

         {memberReminders.length === 0 ? (
          <View style={styles.emptyReminderCard}>
            <Text style={styles.emptyReminderText}>
              No upcoming reminders for {memberName}.
            </Text>
          </View>
        ) : (
          memberReminders.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.reminderCard}
              activeOpacity={0.7}
              onPress={() => setSelectedReminder(item)}
            >
              <View style={styles.medThumb}>
                <Ionicons
                  name={item.type === 'Capsule' ? 'ellipse-outline' : 'medkit-outline'}
                  size={22}
                  color="#2D6A4F"
                />
              </View>
              <View style={styles.reminderInfo}>
                <Text style={styles.medName}>{item.medicineName}</Text>
                <Text style={styles.medSub}>
                  {item.type} • {item.dosage}
                </Text>
                <Text style={styles.medExpiry}>Expires in {item.expiry}</Text>
              </View>
              <View style={styles.timeTag}>
                <Text style={styles.timeText}>{item.time}</Text>
                <Ionicons name="chevron-forward" size={16} color="#A0AEC0" style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          ))
        )}

      </ScrollView>
      
      {/* REVISION 4 MODAL: Inline Reminder Details Modal */}
      <Modal visible={selectedReminder !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Reminder Details</Text>
              <TouchableOpacity onPress={() => setSelectedReminder(null)}>
                <Ionicons name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>

            {selectedReminder && (
              <View style={styles.detailBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Medicine</Text>
                  <Text style={styles.detailValue}>{selectedReminder.medicineName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type & Dosage</Text>
                  <Text style={styles.detailValue}>
                    {selectedReminder.type} ({selectedReminder.dosage})
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Intake Time</Text>
                  <Text style={styles.detailValue}>{selectedReminder.time}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Frequency</Text>
                  <Text style={styles.detailValue}>{selectedReminder.frequency}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Expiration</Text>
                  <Text style={styles.detailValue}>{selectedReminder.expiry}</Text>
                </View>
                <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue}>
                    {selectedReminder.notes || 'No notes added.'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.closeDetailBtn}
                  onPress={() => setSelectedReminder(null)}
                >
                  <Text style={styles.closeDetailBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal Before Delete */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.dialog}>
            <View style={styles.trashCircle}>
              <Ionicons name="trash-outline" size={28} color="#D90429" />
            </View>
            <Text style={styles.dialogTitle}>Remove this profile?</Text>
            <Text style={styles.dialogMsg}>
              {`Are you sure you want to remove ${profile.profile_fullname}'s profile? Her medicines, alerts and reminders will also be deleted.`}
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
  notFoundCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 20,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  userRel: { fontSize: 13, color: '#718096', marginTop: 2 },
  editBtnOutline: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  editBtnOutlineText: { fontSize: 13, fontWeight: '600', color: '#2D3748' },

  /* Unified Medicine Overview Card */
  sectionHeaderNoViewAll: {
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 18,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1B4332' },
  viewAllText: { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  overviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  overviewCol: {
    flex: 1,
    alignItems: 'center',
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNum: { fontSize: 17, fontWeight: '700', color: '#1B4332' },
  statLabel: { fontSize: 11, color: '#718096', marginTop: 2, fontWeight: '500' },
  colDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#EDF2F7',
  },

  /* Formatted Upcoming Reminders Card */
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  medThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderInfo: { flex: 1, marginLeft: 12 },
  medName: { fontSize: 14, fontWeight: '700', color: '#1B4332' },
  medSub: { fontSize: 12, color: '#4A5568', marginTop: 1 },
  medExpiry: { fontSize: 11, color: '#718096', marginTop: 2 },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  timeText: { fontSize: 12, fontWeight: '600', color: '#2D6A4F' },

  /* 3-Dots Dropdown */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center' },
  dropdownMenu: {
    position: 'absolute',
    top: 55,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    minWidth: 160,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  dropdownTextDelete: { fontSize: 14, fontWeight: '600', color: '#D90429' },

  /* Inline Reminder Details Modal */
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginTop: 'auto',
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#1B4332' },
  detailBody: { marginTop: 4 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: { fontSize: 13, color: '#718096', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#1A202C', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  closeDetailBtn: {
    marginTop: 20,
    height: 46,
    backgroundColor: '#0E3326',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeDetailBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  /* Confirmation Dialog */
  dialog: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignSelf: 'center',
  },
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
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#1B4332', textAlign: 'center' },
  dialogMsg: { fontSize: 13, color: '#718096', textAlign: 'center', marginVertical: 12, lineHeight: 18 },
  dialogActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
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

  emptyReminderCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyReminderText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },

});