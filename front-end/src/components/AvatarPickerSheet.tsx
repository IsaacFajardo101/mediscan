import { AVATAR_MAP } from '@/constants/avatars';
import { Colors, Radius, Spacing } from '@/constants/display';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatar from './ProfileAvatar';
const AVATAR_IDS = Object.keys(AVATAR_MAP).map(Number); // [1, 2, ... 12]

type Props = {
  visible: boolean;
  selected: number;
  onClose: () => void;
  onSave: (icon: number) => void;
};

// "Choose an Avatar" bottom sheet (Create Profile / Add Family Member).
export default function AvatarPickerSheet({ visible, selected, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [pick, setPick] = useState(selected);

  useEffect(() => {
    if (visible) setPick(selected);
  }, [visible, selected]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Choose an Avatar</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Pick one that fits this profile.</Text>

          <View style={styles.grid}>
             {AVATAR_IDS.map((id) => (
            <Pressable
              key={id}
              onPress={() => setPick(id)}
              style={styles.cellWrapper}
              accessibilityLabel={`Avatar ${id}`}
            >
              <View style={[styles.avatarCircle, pick === id && styles.avatarCircleOn]}>
                <ProfileAvatar icon={id} size={54} />

                {/* Green Checkmark Badge */}
                {pick === id && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </Pressable>
          ))}
          </View>

          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.cancel]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.save]} onPress={() => onSave(pick)}>
              <Text style={styles.saveText}>Save Avatar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: 'rgba(5, 31, 32, 0.45)', 
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg - 4,
    paddingTop: Spacing.sm + 4,
  },
  handle: { 
    alignSelf: 'center', 
    width: 40, 
    height: 4, 
    borderRadius: 2, 
    backgroundColor: Colors.border, 
    marginBottom: Spacing.md, 
  },
  titleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: Colors.text, 
  },
  subtitle: { 
    fontSize: 13, 
    color: Colors.textMuted, 
    marginTop: 4, 
    marginBottom: Spacing.md, 
  },

  /* --- 4-Column Grid Layout --- */
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'flex-start',
    rowGap: Spacing.sm,
  },
  cellWrapper: {
    width: '25%', // Exactly 4 columns per row
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  avatarCircle: {
    width: 66,
    height: 66,
    borderRadius: 33, // Perfect circle
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
    position: 'relative',
  },
  avatarCircleOn: {
    borderColor: '#409F8A', // Exact Figma green
  },
  checkBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#409F8A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* --- Bottom Action Buttons --- */
  row: { 
    flexDirection: 'row', 
    gap: Spacing.sm + 4, 
    marginTop: Spacing.lg, 
  },
  btn: { 
    flex: 1, 
    height: 48, 
    borderRadius: Radius.sm + 2, 
    alignItems: 'center', 
    justifyContent: 'center', 
  },
  cancel: { 
    borderWidth: 1.5, 
    borderColor: Colors.text, 
  },
  cancelText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: Colors.text, 
  },
  save: { 
    backgroundColor: Colors.primary, 
  },
  saveText: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#FFFFFF', 
  },
});