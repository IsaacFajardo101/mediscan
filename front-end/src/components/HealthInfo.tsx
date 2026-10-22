import React, { useEffect, useState } from 'react';
import {
  Keyboard, Modal, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Type } from '@/constants/display';

interface HealthInfoData {
  allergies: string;
  conditions: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
}

const EMPTY: HealthInfoData = {
  allergies: '',
  conditions: '',
  emergencyContactName: '',
  emergencyContactNumber: '',
};

const HEALTH_KEY = 'mediscan:healthInfo';

async function loadHealthInfo(): Promise<HealthInfoData> {
  try {
    const raw = await AsyncStorage.getItem(HEALTH_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch (e) {
    console.warn('loadHealthInfo failed', e);
    return EMPTY;
  }
}

async function saveHealthInfo(info: HealthInfoData): Promise<boolean> {
  try {
    await AsyncStorage.setItem(HEALTH_KEY, JSON.stringify(info));
    return true;
  } catch (e) {
    console.warn('saveHealthInfo failed', e);
    return false;
  }
}

function Field({
  label, value, onChangeText, placeholder, keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export default function HealthInfo({
  visible, onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<HealthInfoData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  // Load the saved values every time the sheet opens
  useEffect(() => {
    if (!visible) return;
    let active = true;
    loadHealthInfo().then((saved) => {
      if (active) setForm(saved);
    });
    return () => {
      active = false;
    };
  }, [visible]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const set = (key: keyof HealthInfoData) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveHealthInfo(form);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Dark area (tap to close) */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              marginBottom: kbHeight,
              paddingBottom: kbHeight > 0 ? Spacing.md : insets.bottom + Spacing.md,
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Health Information</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>
          </View>

          <View>
            <Field
              label="Allergies"
              value={form.allergies}
              onChangeText={set('allergies')}
              placeholder="e.g. Peanuts, Penicillin"
            />
            <Field
              label="Conditions"
              value={form.conditions}
              onChangeText={set('conditions')}
              placeholder="e.g. Diabetes, Asthma"
            />
            <Field
              label="Emergency Contact Name"
              value={form.emergencyContactName}
              onChangeText={set('emergencyContactName')}
              placeholder="Name of contact"
            />
            <Field
              label="Emergency Contact Number"
              value={form.emergencyContactNumber}
              onChangeText={set('emergencyContactNumber')}
              placeholder="Contact number"
              keyboardType="phone-pad"
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveBtn, (pressed || saving) && { opacity: 0.8 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,31,32,0.45)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: { ...Type.h3, color: Colors.text },
  field: { marginBottom: Spacing.md },
  label: { ...Type.label, color: Colors.text, marginBottom: 6 },
  input: {
    height: 46, paddingHorizontal: Spacing.md, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    color: Colors.text, fontSize: 14,
  },
  saveBtn: {
    height: 48, borderRadius: Radius.sm, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm,
  },
  saveText: { color: '#fff', fontWeight: '700' },
});