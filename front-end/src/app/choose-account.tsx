import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomSheet from '@/components/BottomSheet';
import { Colors, Radius, Spacing } from '@/constants/display';

// Itong part is yung "Choose an account" screen na lumalabas after Log In. It shows a list of saved accounts and an option to use another account.
// ang kailangan dito is yung user can tap on a saved account to log in, or tap on "Use another account" to go back to the Log In screen.
// TODO: implement the actual login logic when tapping on a saved account.
// yung mga todo is yung mga wala pang laman na functionality, like the actual login logic when tapping on a saved account. The rest of the UI is already implemented.
export default function ChooseAccountScreen() {
  const router = useRouter();

  return (
    <BottomSheet title="Choose an account" subtitle="to continue to MediScan">
      {/* Saved account */}
      <Pressable style={styles.row} onPress={() => router.replace('/' as any)}>
        <View style={[styles.avatar, { backgroundColor: '#3F9E86' }]}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Maria Batumbakal</Text>
          <Text style={styles.email}>mariabatumbakal@email.com</Text>
        </View>
      </Pressable>

      {/* Another account */}
      <Pressable style={styles.row} onPress={() => router.back() /* TODO: use another account */}>
        <View style={[styles.avatar, { backgroundColor: '#8A9490' }]}>
          <Ionicons name="add" size={20} color="#fff" />
        </View>
        <Text style={styles.name}>Use another account</Text>
      </Pressable>

      <Text style={styles.footer}>
        To continue, Google will share your name, email address and profile picture with MediScan.
      </Text>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4,
    padding: Spacing.md - 2, marginBottom: Spacing.sm + 2,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  avatar: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  email: { fontSize: 13, color: Colors.textMuted, marginTop: 1 },
  footer: { fontSize: 12, lineHeight: 18, color: Colors.textMuted, marginTop: Spacing.sm, marginBottom: Spacing.sm },
});