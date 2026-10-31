import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Components, Radius, Spacing, Type } from '@/constants/display';
import { getListQuery, isListScope, setListQuery } from '@/services/listQueryStore';
import type { MedicineForm, UrgencyFilter } from '@/types/medicine';
import { MEDICINE_FORMS, mdyToYMD, ymdToMDY } from '@/utils/medicine';

const URGENCY: { key: Exclude<UrgencyFilter, 'none'>; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'within7', label: 'Expiring within 7 days', icon: 'time-outline', color: Colors.statusWarning },
  { key: 'within30', label: 'Expiring within 30 days', icon: 'time-outline', color: Colors.statusWarning },
  { key: 'expired', label: 'Expired', icon: 'close', color: Colors.statusDanger },
  { key: 'custom', label: 'Custom range', icon: 'calendar-outline', color: Colors.textPrimary },
];

export default function VaultFiltersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scope: scopeParam } = useLocalSearchParams<{ scope?: string }>();
  const scope = isListScope(scopeParam) ? scopeParam : 'vault';
  const current = getListQuery(scope);

  const [forms, setForms] = useState<MedicineForm[]>(current.forms);
  const [urgency, setUrgency] = useState<UrgencyFilter>(current.urgency);
  const [fromText, setFromText] = useState(ymdToMDY(current.customFrom));
  const [toText, setToText] = useState(ymdToMDY(current.customTo));
  const [error, setError] = useState('');

  const toggleForm = (f: MedicineForm) =>
    setForms((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const toggleUrgency = (u: UrgencyFilter) => {
    setError('');
    setUrgency((prev) => (prev === u ? 'none' : u));
  };

  const reset = () => {
    setForms([]);
    setUrgency('none');
    setFromText('');
    setToText('');
    setError('');
  };

  const apply = () => {
    let customFrom: string | null = null;
    let customTo: string | null = null;
    if (urgency === 'custom') {
      customFrom = fromText.trim() ? mdyToYMD(fromText) : null;
      customTo = toText.trim() ? mdyToYMD(toText) : null;
      if ((fromText.trim() && !customFrom) || (toText.trim() && !customTo)) {
        setError('Please enter dates as MM/DD/YYYY.');
        return;
      }
      if (!customFrom && !customTo) {
        setError('Enter a From date, a To date, or both.');
        return;
      }
      if (customFrom && customTo && customFrom > customTo) {
        setError('The From date must be before the To date.');
        return;
      }
    }
    setListQuery(scope, { forms, urgency, customFrom, customTo });
    router.back();
  };

  const customOn = urgency === 'custom';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Tap the dim area to close */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityLabel="Close filters" />

      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Filters</Text>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: Spacing.sm }}>
          {/* Medicine Form */}
          <View style={styles.sectionHead}>
            <Text style={styles.section}>Medicine Form</Text>
            <Text style={styles.hint}>Multi-select</Text>
          </View>
          <View style={styles.wrap}>
            {MEDICINE_FORMS.map((f) => {
              const on = forms.includes(f);
              return (
                <Pressable
                  key={f}
                  onPress={() => toggleForm(f)}
                  style={[styles.pill, on && styles.pillOn]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  {on && <Ionicons name="checkmark" size={16} color={Colors.onAction} />}
                  <Text style={[styles.pillText, on && { color: Colors.onAction }]}>{f}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Date Range / Urgency */}
          <Text style={[styles.section, { marginBottom: Spacing.sm + 4 }]}>Date Range / Urgency</Text>
          <View style={styles.wrap}>
            {URGENCY.map((u) => {
              const on = urgency === u.key;
              return (
                <Pressable
                  key={u.key}
                  onPress={() => toggleUrgency(u.key)}
                  style={[styles.pill, on && styles.pillOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Ionicons name={u.icon} size={16} color={on ? Colors.onAction : u.color} />
                  <Text style={[styles.pillText, on && { color: Colors.onAction }]}>{u.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.dates}>
            <DateField label="From" value={fromText} onChange={setFromText} enabled={customOn} />
            <DateField label="To" value={toText} onChange={setToText} enabled={customOn} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.buttons}>
          <Pressable style={[Components.buttonSecondary, styles.resetBtn]} onPress={reset} accessibilityRole="button">
            <Ionicons name="refresh" size={18} color={Colors.textPrimary} />
            <Text style={Components.buttonSecondaryText}>Reset</Text>
          </Pressable>
          <Pressable
            style={[Components.buttonPrimary, { flex: 1, backgroundColor: Colors.actionPrimary }]}
            onPress={apply}
            accessibilityRole="button"
          >
            <Text style={Components.buttonPrimaryText}>Apply Filters</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function DateField({
  label, value, onChange, enabled,
}: { label: string; value: string; onChange: (t: string) => void; enabled: boolean }) {
  // Adds the slashes while typing: 12252026 -> 12/25/2026
  const onText = (t: string) => {
    const digits = t.replace(/\D/g, '').slice(0, 8);
    let out = digits;
    if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    onChange(out);
  };
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.dateLabel, !enabled && { opacity: 0.5 }]}>{label}</Text>
      <View style={[styles.dateBox, !enabled && { opacity: 0.5 }]}>
        <TextInput
          style={styles.dateInput}
          value={value}
          onChangeText={onText}
          editable={enabled}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="number-pad"
          maxLength={10}
          accessibilityLabel={`${label} date`}
        />
        <Ionicons name="calendar-outline" size={18} color={Colors.textSecondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,31,32,0.45)' },
  sheet: {
    backgroundColor: Colors.surfacePrimary, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg - 4, paddingTop: Spacing.sm + 4, maxHeight: '90%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderDefault, marginBottom: Spacing.md },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: Spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault, marginBottom: Spacing.md,
  },
  title: { ...Type.h2, color: Colors.textPrimary },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm + 4 },
  section: { ...Type.label, color: Colors.textPrimary },
  hint: { ...Type.caption, color: Colors.textSecondary },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: 40,
    paddingHorizontal: Spacing.md - 2, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.borderDefault, backgroundColor: Colors.surfacePrimary,
  },
  pillOn: { backgroundColor: Colors.actionPrimary, borderColor: Colors.actionPrimary },
  pillText: { ...Type.caption, color: Colors.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.borderDefault, marginVertical: Spacing.md },
  dates: { flexDirection: 'row', gap: Spacing.sm + 4, marginTop: Spacing.md },
  dateLabel: { ...Type.caption, color: Colors.textSecondary, marginBottom: Spacing.xs },
  dateBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.borderDefault,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm + 4, minHeight: 48,
  },
  dateInput: { flex: 1, ...Type.body, color: Colors.textPrimary, paddingVertical: Spacing.sm },
  error: { ...Type.caption, color: Colors.statusDanger, marginTop: Spacing.sm },
  buttons: { flexDirection: 'row', gap: Spacing.sm + 4, marginTop: Spacing.md },
  resetBtn: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
});