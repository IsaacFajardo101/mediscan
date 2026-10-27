import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FormColors, FormField, InputBox } from '@/components/FormField';
import PossibleMatchCard from '@/components/PossibleMatchCard';
import { Assets } from '@/constants/assets';
import { Colors } from '@/constants/display';
import { findPossibleMatch } from '@/data/mockScanResults';
import { formatDateInput } from '@/utils/date';

// Choices for the Medicine Form dropdown. The medicine's own form is added if it is not in here.
const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops'];

// Edit Medicine screen, opened from Scan Result with the selected possible match (?id=...).
// Everything except the expiration date is auto-filled from that medicine. The header (back arrow
// returns to Scan Result) comes from AppHeader via app/_layout.tsx.
export default function EditMedicineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const match = findPossibleMatch(id);

  const [name, setName] = useState(match?.name ?? '');
  const [expiry, setExpiry] = useState('');
  const [form, setForm] = useState(match?.form ?? '');
  const [strength, setStrength] = useState(match?.strength ?? '');
  const [formOpen, setFormOpen] = useState(false);

  // TODO: actually save the medicine to the vault. For now it only opens the Vault screen.
  const onSave = () => router.navigate('/vault');

  if (!match) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingText}>Medicine not found. Go back and select one again.</Text>
      </View>
    );
  }

  const formOptions = FORMS.includes(form) || !form ? FORMS : [form, ...FORMS];

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

        <View style={styles.row}>
          <View style={styles.half}>
            <FormField label="Medicine Form">
              <Pressable onPress={() => setFormOpen((o) => !o)} accessibilityRole="button" accessibilityLabel="Medicine form">
                <InputBox>
                  <Text style={[styles.value, !form && { color: FormColors.placeholder }]} numberOfLines={1}>
                    {form || 'Select form'}
                  </Text>
                  <Image source={Assets.icons.chevronDown} style={styles.icon} contentFit="contain" />
                </InputBox>
              </Pressable>
              {formOpen && (
                <View style={styles.options}>
                  {formOptions.map((option) => (
                    <Pressable
                      key={option}
                      style={styles.option}
                      onPress={() => {
                        setForm(option);
                        setFormOpen(false);
                      }}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.value, option === form && styles.optionSelected]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </FormField>
          </View>

          <View style={styles.half}>
            <FormField label="Dosage / Strength">
              <InputBox>
                <TextInput
                  style={styles.input}
                  value={strength}
                  onChangeText={setStrength}
                  placeholder="e.g. 500 mg"
                  placeholderTextColor={FormColors.placeholder}
                  accessibilityLabel="Dosage or strength"
                />
              </InputBox>
            </FormField>
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable style={styles.saveButton} onPress={onSave} accessibilityRole="button">
          <Image source={Assets.icons.bookmark} style={styles.icon} contentFit="contain" />
          <Text style={styles.saveText}>Save to Vault</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surfacePrimary },
  content: { paddingTop: 20, paddingHorizontal: 24, paddingBottom: 24, gap: 16 },

  heading: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  required: { fontSize: 12, color: FormColors.helper },

  input: { flex: 1, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  value: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  icon: { width: 20, height: 20 },

  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  half: { flex: 1 },
  options: {
    backgroundColor: Colors.onAction,
    borderWidth: 1,
    borderColor: FormColors.inputBorder,
    borderRadius: 10,
    overflow: 'hidden',
  },
  option: { paddingHorizontal: 14, paddingVertical: 12 },
  optionSelected: { fontWeight: '700' },

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
