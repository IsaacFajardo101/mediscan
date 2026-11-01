// Add Note (Figma: "Add Note Page").
// Two ways to open it:
//   - medicine in the vault:  router.push({ pathname: '/add-note', params: { id: vault_id } })
//       -> Save Note saves it straight to the vault (local first, then change log for backend)
//   - not saved yet (Scan Results preview): router.push({ pathname: '/add-note', params: { draft: '1', name } })
//       -> the note is kept until the user taps "Save to Vault" on Medicine Details
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import AppHeader from '@/components/AppHeader';
import Popup from '@/components/medicine/Popup';
import { Colors, Components, Radius, Spacing, Type } from '@/constants/display';
import { getNoteDraft, setNoteDraft } from '@/services/noteDraft';
import { getMedicineById, updateNote } from '@/services/vaultStore';
import { medicineName } from '@/utils/medicine';

const MAX_LENGTH = 500;

export default function AddNoteScreen() {
  const params = useLocalSearchParams<{ id?: string; draft?: string; name?: string }>();
  const router = useRouter();
  const isDraft = params.draft === '1';
  const medicine = !isDraft && params.id ? getMedicineById(params.id) : undefined;

  const title = isDraft
    ? params.name ?? 'This medicine'
    : medicine ? `${medicineName(medicine)} ${medicine.fda_dosage_strength}` : 'Medicine';
  const startText = isDraft ? getNoteDraft() : medicine?.vault_note ?? '';

  const [text, setText] = useState(startText);
  const [saving, setSaving] = useState(false);
  const [savedPopup, setSavedPopup] = useState(false);

  const changed = text.trim() !== startText.trim();

  const save = async () => {
    if (saving) return;
    if (isDraft) {
      setNoteDraft(text.trim());
      router.back();
      return;
    }
    if (!params.id) return;
    setSaving(true);
    try {
      await updateNote(params.id, text);
      setSavedPopup(true);
    } finally {
      setSaving(false);
    }
  };

  const done = () => {
    setSavedPopup(false);
    router.back();
  };

  return (
    <View style={styles.root}>
      <AppHeader title="Add Note" back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>{title}</Text>
            <Text style={styles.bannerSub}>Adding a personal note for this medicine</Text>
          </View>

          <Text style={styles.label}>Your Note</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="e.g. Take after meals, causes drowsiness..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={MAX_LENGTH}
            textAlignVertical="top"
            autoFocus
            accessibilityLabel="Your note"
          />
          <Text style={styles.counter}>{text.length}/{MAX_LENGTH}</Text>

          <Pressable
            style={({ pressed }) => [
              Components.buttonPrimary, { backgroundColor: Colors.actionPrimary },
              (!changed || saving) && { opacity: 0.5 }, pressed && { opacity: 0.85 },
            ]}
            onPress={save}
            disabled={!changed || saving}
            accessibilityRole="button"
          >
            <Text style={Components.buttonPrimaryText}>{saving ? 'Saving…' : 'Save Note'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Popup
        visible={savedPopup}
        icon="checkmark-circle"
        title={text.trim() ? 'Note Saved' : 'Note Removed'}
        message={text.trim() ? `Your note for ${title} was saved to your vault.` : `The note for ${title} was removed.`}
        onClose={done}
        actions={[{ label: 'Done', onPress: done }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfacePrimary },
  scroll: { padding: Spacing.md + 4, gap: Spacing.sm },
  banner: { backgroundColor: Colors.surfaceSecondary, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.md },
  bannerTitle: { ...Type.label, color: Colors.textPrimary },
  bannerSub: { ...Type.caption, color: Colors.textSecondary, marginTop: 2 },
  label: { ...Type.label, color: Colors.textPrimary },
  input: {
    ...Type.body, color: Colors.textPrimary, minHeight: 160,
    borderWidth: 1, borderColor: Colors.borderDefault, borderRadius: Radius.sm,
    padding: Spacing.md, backgroundColor: Colors.surfacePrimary,
  },
  counter: { ...Type.caption, color: Colors.textSecondary, alignSelf: 'flex-end', marginBottom: Spacing.sm },
});
