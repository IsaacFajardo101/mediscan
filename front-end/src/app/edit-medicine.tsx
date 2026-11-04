import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, usePreventRemove, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MedicineAddedModal from '@/components/MedicineAddedModal';
import QuitEditingModal from '@/components/QuitEditingModal';
import { FormColors, FormField, InputBox } from '@/components/FormField';
import PossibleMatchCard from '@/components/PossibleMatchCard';
import { Assets } from '@/constants/assets';
import { Colors } from '@/constants/display';
import { findPossibleMatch } from '@/data/mockScanResults';
import { formatDateInput } from '@/utils/date';

// Edit Medicine screen, opened from Scan Result with the selected possible match (?id=...).
// The medicine name is auto-filled from that medicine; the expiration date is typed. The header
// (back arrow returns to Scan Result) comes from AppHeader via app/_layout.tsx.
export default function EditMedicineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const match = findPossibleMatch(id);

  const [name, setName] = useState(match?.name ?? '');
  const [expiry, setExpiry] = useState('');

  const [addedOpen, setAddedOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);

  // Leaving the screen (header back arrow, Android back, swipe back) asks "Leave page?" first.
  // Uses usePreventRemove (Expo Router SDK 58; the old `beforeRemove` event was removed). While
  // `preventLeave` is true the blocked navigation is kept in `repeatLeave` until the user taps Yes.
  // It is set to false after Yes, and after saving (the medicine is saved, so nothing to quit).
  const [preventLeave, setPreventLeave] = useState(true);
  const repeatLeave = useRef<(() => void) | null>(null);

  usePreventRemove(preventLeave, ({ repeat }) => {
    repeatLeave.current = repeat;
    setQuitOpen(true);
  });

  const confirmQuit = () => {
    setPreventLeave(false);
    setQuitOpen(false);
    repeatLeave.current?.();
  };

  // TODO: actually save the medicine to the vault. For now Save to Vault only shows the Medicine Added overlay.
  const onSave = () => {
    setPreventLeave(false);
    setAddedOpen(true);
  };

  const goToVault = () => {
    setAddedOpen(false);
    router.navigate('/vault');
  };

  if (!match) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Medicine not found. Go back and select one again.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PossibleMatchCard match={match} selected />

        <Text style={styles.heading}>Medicine Details</Text>
        <Text style={styles.required}>Fields marked with * are required.</Text>

        <FormField label="Medicine Name" required>
          <InputBox>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Medicine name"
              placeholderTextColor={FormColors.placeholder}
              accessibilityLabel="Medicine name"
            />
          </InputBox>
        </FormField>

        <FormField label="Expiration Date" required>
          <InputBox>
            <TextInput
              style={styles.input}
              value={expiry}
              onChangeText={(t) => setExpiry(formatDateInput(t))}
              placeholder="MM / DD / YYYY"
              placeholderTextColor={FormColors.placeholder}
              keyboardType="number-pad"
              maxLength={14}
              accessibilityLabel="Expiration date"
            />
            {/* TODO: open a date picker */}
            <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Open calendar">
              <Image source={Assets.icons.calendar} style={styles.icon} contentFit="contain" />
            </Pressable>
          </InputBox>
        </FormField>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable style={styles.saveButton} onPress={onSave} accessibilityRole="button">
          <Image source={Assets.icons.bookmark} style={styles.icon} contentFit="contain" />
          <Text style={styles.saveText}>Save to Vault</Text>
        </Pressable>
      </View>

      <MedicineAddedModal
        visible={addedOpen}
        medicineName={name}
        onViewVault={goToVault}
        onClose={() => setAddedOpen(false)}
      />
      <QuitEditingModal visible={quitOpen} onConfirm={confirmQuit} onCancel={() => setQuitOpen(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surfacePrimary },
  content: { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 24, gap: 16 },

  heading: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  required: { fontSize: 12, color: FormColors.helper },

  input: { flex: 1, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  icon: { width: 20, height: 20 },

  bar: { paddingTop: 20, paddingHorizontal: 24, backgroundColor: Colors.surfacePrimary },
  saveButton: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: { fontSize: 15, fontWeight: '700', color: Colors.onAction },

  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.surfacePrimary },
  missingText: { color: Colors.textMuted, textAlign: 'center' },
});
