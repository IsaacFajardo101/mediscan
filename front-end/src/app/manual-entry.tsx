import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Assets } from '@/constants/assets';
import { Colors } from '@/constants/display';

// Colors used only by this Figma frame that are not in the display.ts tokens yet.
const InputBorder = '#C9D6CF';
const ReadOnlyBg = '#F1F5F3';
const ReadOnlyBorder = '#E1E8E4';
const Placeholder = '#9AAFA3';
const HelperText = '#5B6B6C';
const RequiredStar = '#D93025';

// Formats typed digits as "MM / DD / YYYY".
const formatDate = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean);
  return parts.join(' / ');
};

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{text}</Text>
      {required && <Text style={styles.star}>*</Text>}
    </View>
  );
}

// Disabled box that is filled automatically after a medicine is picked.
function ReadOnlyField({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.readOnlyField}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readOnlyBox}>
        <Text style={[styles.readOnlyText, value ? { color: Colors.textPrimary } : null]} numberOfLines={1}>
          {value ?? 'Auto-filled'}
        </Text>
        <Image source={Assets.icons.lock} style={styles.lockIcon} contentFit="contain" />
      </View>
    </View>
  );
}

// The header ("Manual Entry" + back arrow) comes from AppHeader via app/_layout.tsx.
export default function ManualEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [medicineName, setMedicineName] = useState('');
  const [expiry, setExpiry] = useState('');

  // TODO: fill these from the medicine picked in the search results.
  const selected = { genericName: '', brandName: '', strength: '', form: '', manufacturer: '' };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: 24 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>Medicine Details</Text>
      <Text style={styles.required}>Fields marked with * are required.</Text>

      {/* Medicine name */}
      <View style={styles.field}>
        <Label text="Medicine Name" required />
        <View style={styles.inputBox}>
          <Image source={Assets.icons.search} style={styles.searchIcon} contentFit="contain" />
          <TextInput
            style={styles.input}
            value={medicineName}
            onChangeText={setMedicineName}
            placeholder="Type to search, e.g. Paracetamol"
            placeholderTextColor={Placeholder}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Medicine name"
          />
        </View>
        <Text style={styles.helper}>Choose your medicine from the list to verify it.</Text>
      </View>

      {/* Expiration date */}
      <View style={styles.field}>
        <Label text="Expiration Date" required />
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={expiry}
            onChangeText={(t) => setExpiry(formatDate(t))}
            placeholder="MM / DD / YYYY"
            placeholderTextColor={Placeholder}
            keyboardType="number-pad"
            maxLength={14}
            accessibilityLabel="Expiration date"
          />
          {/* TODO: open a date picker */}
          <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel="Open calendar">
            <Image source={Assets.icons.calendar} style={styles.calendarIcon} contentFit="contain" />
          </Pressable>
        </View>
        <Text style={styles.helper}>Type the date or tap the calendar.</Text>
      </View>

      {/* Verified details (read-only) */}
      <View style={styles.verifiedCard}>
        <View style={styles.verifiedHeader}>
          <Image source={Assets.icons.lockSmall} style={styles.lockSmallIcon} contentFit="contain" />
          <Text style={styles.verifiedHeaderText}>Filled in automatically after you pick a medicine</Text>
        </View>
        <ReadOnlyField label="Generic Name" value={selected.genericName || undefined} />
        <View style={styles.row}>
          <ReadOnlyField label="Brand Name" value={selected.brandName || undefined} />
          <ReadOnlyField label="Strength" value={selected.strength || undefined} />
        </View>
        <View style={styles.row}>
          <ReadOnlyField label="Medicine Form" value={selected.form || undefined} />
          <ReadOnlyField label="Manufacturer" value={selected.manufacturer || undefined} />
        </View>
      </View>

      {/* Actions */}
      {/* TODO: save the entry to the vault */}
      <Pressable style={styles.saveButton} accessibilityRole="button">
        <Image source={Assets.icons.bookmark} style={styles.bookmarkIcon} contentFit="contain" />
        <Text style={styles.saveText}>Save to Vault</Text>
      </Pressable>
      <Pressable style={styles.cancelButton} onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surfacePrimary },
  content: { paddingTop: 20, paddingHorizontal: 24, gap: 16 },

  heading: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  required: { fontSize: 12, color: HelperText },

  field: { gap: 6 },
  labelRow: { flexDirection: 'row', gap: 3 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  star: { fontSize: 14, fontWeight: '700', color: RequiredStar },
  helper: { fontSize: 13, color: HelperText },

  inputBox: {
    height: 48,
    backgroundColor: Colors.onAction,
    borderWidth: 1,
    borderColor: InputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary, padding: 0 },
  searchIcon: { width: 14.8333, height: 14.8333, marginHorizontal: 2.58 }, // centered in the 20px icon slot
  calendarIcon: { width: 20, height: 20 },

  verifiedCard: {
    backgroundColor: Colors.onAction,
    borderWidth: 1,
    borderColor: ReadOnlyBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 14,
  },
  verifiedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifiedHeaderText: { flex: 1, fontSize: 13, color: HelperText },
  lockSmallIcon: { width: 11.85, height: 14.85, marginHorizontal: 3.075 }, // centered in the 18px icon slot
  row: { flexDirection: 'row', gap: 12 },

  readOnlyField: { flex: 1, gap: 6 },
  readOnlyBox: {
    height: 48,
    backgroundColor: ReadOnlyBg,
    borderWidth: 1,
    borderColor: ReadOnlyBorder,
    borderRadius: 10,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readOnlyText: { flex: 1, fontSize: 15, color: Placeholder },
  lockIcon: { width: 10.5333, height: 13.2, marginHorizontal: 2.73 }, // centered in the 16px icon slot

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
  bookmarkIcon: { width: 20, height: 20 },
  saveText: { fontSize: 15, fontWeight: '700', color: Colors.onAction },
  cancelButton: {
    backgroundColor: Colors.onAction,
    borderWidth: 1,
    borderColor: Colors.actionPrimary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: Colors.actionPrimary },
});
