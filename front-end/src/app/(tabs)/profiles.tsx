import { getAvatarSource } from '@/constants/avatars';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useProfile } from '../../context/ProfileContext';
import { Profile } from '../../types/profile';

export default function FamilyProfilesTab() {
  const router = useRouter();
  const { profiles, pendingDeleteId, undoDelete, undoSecondsLeft } = useProfile();

  const renderItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
            // Viewing a family member does NOT switch the active profile (that's done on "Choose your profile")
      onPress={() => {
        router.push({
          pathname: '/profile-detail',
          params: { profileId: item.profile_id },
        });
      }}
    >
      <View style={styles.avatarCircle}>
        <Image 
        source={getAvatarSource(item.profile_icon)} 
        style={{ width: 44, height: 44, borderRadius: 22 }}
        resizeMode="cover"
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{item.profile_fullname}</Text>
        <Text style={styles.relationship}>
          {item.profile_display_name} • Born {item.profile_birthdate}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.topBanner}>
        <Text style={styles.bannerText}>Manage medicines by family member</Text>
      </View>

      {/* Profiles List */}
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.profile_id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      {/* Add Family Member Button */}
      <TouchableOpacity
        style={[styles.addButton, profiles.length >= 6 && styles.disabledButton]}
        disabled={profiles.length >= 6}
        onPress={() => router.push('/add-edit-profile')}
      >
        <Ionicons name="add" size={20} color="#FFF" style={{ marginRight: 6 }} />
        <Text style={styles.addButtonText}>
          {profiles.length >= 6 ? 'Profile Limit Reached (6 Max)' : 'Add Family Member'}
        </Text>
      </TouchableOpacity>

      {/* 15-Second Undo Banner */}
      {pendingDeleteId !== null && (
        <View style={styles.undoToast}>
          <Text style={styles.undoText}>
            Profile deleted. Undo in {undoSecondsLeft}s
          </Text>
          <TouchableOpacity onPress={undoDelete}>
            <Text style={styles.undoAction}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  topBanner: {
    padding: 14,
    backgroundColor: '#E8F5E9',
  },
  bannerText: {
    fontSize: 13,
    color: '#2D6A4F',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D8F3DC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B4332',
  },
  relationship: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#1B4332',
    flexDirection: 'row',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  undoToast: {
    position: 'absolute',
    bottom: 85,
    left: 16,
    right: 16,
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  undoText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  undoAction: {
    color: '#52B788',
    fontWeight: '700',
    fontSize: 14,
  },
});