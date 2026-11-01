import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import {
  FAMILY_MEMBERS,
  MEDICINES,
  type Reminder,
  type ReminderFrequency,
} from '@/components/reminderTypes';

type Props = {
  visible: boolean;
  reminder: Reminder | null;
  onClose: () => void;
  onSave: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
};

const frequencies: ReminderFrequency[] = ['Daily', 'Weekly', 'As needed'];

export default function ReminderEditorModal({
  visible,
  reminder,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [medicine, setMedicine] = useState(reminder?.medicine ?? '');
  const [time, setTime] = useState(reminder?.time ?? '10:00 AM');
  const [frequency, setFrequency] = useState<ReminderFrequency>(
    reminder?.frequency ?? 'Daily',
  );
  const [startDate, setStartDate] = useState(
    reminder?.startDate ?? 'Aug 13, 2026',
  );
  const [member, setMember] = useState(reminder?.member ?? 'Me');
  const [notes, setNotes] = useState(reminder?.notes ?? '');
  const [medicinePickerOpen, setMedicinePickerOpen] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

  const selectedMedicine = MEDICINES.find((item) => item.name === medicine);
  const filteredMedicines = useMemo(
    () =>
      MEDICINES.filter((item) =>
        item.name.toLowerCase().includes(medicineSearch.trim().toLowerCase()),
      ),
    [medicineSearch],
  );

  const save = () => {
    if (!medicine.trim()) {
      setValidationMessage('Choose a medicine before saving.');
      return;
    }
    if (!time.trim()) {
      setValidationMessage('Enter a reminder time before saving.');
      return;
    }

    const medicineDetails = selectedMedicine ?? {
      name: medicine.trim(),
      category: 'Medicine',
      instructions: '',
    };
    onSave({
      id: reminder?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      medicine: medicineDetails.name,
      category: medicineDetails.category,
      instructions: medicineDetails.instructions,
      time: time.trim(),
      frequency,
      startDate: startDate.trim(),
      member,
      notes: notes.trim(),
      enabled: reminder?.enabled ?? true,
    });
  };

  const sheetBackground = { backgroundColor: colors.card };
  const borderColor = { borderColor: colors.border };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close reminder details"
          onPress={onClose}
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        />
        <View
          style={[
            styles.sheet,
            sheetBackground,
            { paddingBottom: Math.max(insets.bottom, 14) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              Reminder Details
            </Text>
            <Pressable
              accessibilityLabel="Close"
              testID="close-reminder-editor"
              onPress={onClose}
              hitSlop={12}
              style={styles.iconButton}
            >
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <KeyboardAwareScrollViewCompat
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            bottomOffset={24}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              accessibilityRole="button"
              testID="select-medicine"
              onPress={() => {
                setMedicinePickerOpen(true);
                setMedicineSearch('');
              }}
              style={[
                styles.medicineCard,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.medicineIcon,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Ionicons name="medical-outline" size={27} color={colors.primary} />
              </View>
              <View style={styles.medicineCopy}>
                <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
                  SELECT MEDICINE
                </Text>
                <Text style={[styles.medicineName, { color: colors.foreground }]}>
                  {medicine || 'Choose from your Vault'}
                </Text>
                <Text style={[styles.medicineDescription, { color: colors.mutedForeground }]}>
                  {selectedMedicine?.category ?? 'Tap to select a medicine'}
                  {selectedMedicine?.instructions
                    ? ` ┬╖ ${selectedMedicine.instructions}`
                    : ''}
                </Text>
              </View>
              <View style={styles.changeMedicine}>
                <Text style={[styles.changeText, { color: colors.primary }]}>
                  {medicine ? 'Change' : 'Select'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </View>
            </Pressable>

            <View style={[styles.fieldRow, borderColor]}>
              <Ionicons name="time-outline" size={19} color={colors.mutedForeground} />
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Reminder Time
              </Text>
              <TextInput
                accessibilityLabel="Reminder time"
                testID="reminder-time-input"
                value={time}
                onChangeText={setTime}
                placeholder="10:00 AM"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.inlineInput, { color: colors.foreground }]}
                returnKeyType="done"
              />
            </View>

            <View style={[styles.fieldRow, borderColor]}>
              <Ionicons name="repeat-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Frequency
              </Text>
              <Pressable
                accessibilityRole="button"
                testID="frequency-picker"
                onPress={() => setFrequencyOpen((open) => !open)}
                style={[styles.selectField, borderColor]}
              >
                <Text style={[styles.selectText, { color: colors.foreground }]}>
                  {frequency}
                </Text>
                <Ionicons
                  name={frequencyOpen ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
            {frequencyOpen ? (
              <View style={styles.inlineOptions}>
                {frequencies.map((option) => (
                  <Pressable
                    key={option}
                    testID={`frequency-${option.toLowerCase().replaceAll(' ', '-')}`}
                    onPress={() => {
                      setFrequency(option);
                      setFrequencyOpen(false);
                    }}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor:
                          frequency === option ? colors.accent : colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: frequency === option ? colors.primary : colors.foreground },
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={[styles.fieldRow, borderColor]}>
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Start Date
              </Text>
              <TextInput
                accessibilityLabel="Start date"
                testID="start-date-input"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="Aug 13, 2026"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.inlineInput, { color: colors.foreground }]}
                returnKeyType="done"
              />
            </View>

            <View style={[styles.fieldRow, borderColor]}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Assigned to
              </Text>
              <Pressable
                accessibilityRole="button"
                testID="member-picker"
                onPress={() => setMemberOpen((open) => !open)}
                style={[styles.selectField, borderColor]}
              >
                <Text style={[styles.selectText, { color: colors.foreground }]}>
                  {member}
                </Text>
                <Ionicons
                  name={memberOpen ? 'chevron-up' : 'chevron-down'}
                  size={15}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
            {memberOpen ? (
              <View style={styles.memberOptions}>
                {FAMILY_MEMBERS.map((person) => (
                  <Pressable
                    key={person}
                    testID={`member-${person.toLowerCase()}`}
                    onPress={() => {
                      setMember(person);
                      setMemberOpen(false);
                    }}
                    style={[
                      styles.memberOption,
                      { borderColor: colors.border },
                      member === person && { backgroundColor: colors.accent },
                    ]}
                  >
                    <Text style={[styles.memberText, { color: colors.foreground }]}>
                      {person}
                    </Text>
                    <Ionicons
                      name={member === person ? 'radio-button-on' : 'radio-button-off'}
                      size={19}
                      color={member === person ? colors.primary : colors.border}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.notesHeader}>
              <Ionicons name="reorder-three-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                Notes
              </Text>
            </View>
            <TextInput
              accessibilityLabel="Reminder notes"
              testID="reminder-notes-input"
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this reminder (optional)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
              style={[
                styles.notesInput,
                { color: colors.foreground, borderColor: colors.border },
              ]}
            />

            {validationMessage ? (
              <Text style={[styles.validation, { color: colors.destructive }]}>
                {validationMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              testID="save-reminder"
              onPress={save}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              <Ionicons
                name={reminder ? 'save-outline' : 'add'}
                size={18}
                color={colors.primaryForeground}
              />
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                {reminder ? 'Save Changes' : 'Add Reminder'}
              </Text>
            </Pressable>

            {reminder ? (
              <Pressable
                accessibilityRole="button"
                testID="delete-reminder"
                onPress={() => setConfirmDelete(true)}
                style={[styles.deleteButton, { borderColor: colors.destructive }]}
              >
                <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                <Text style={[styles.deleteText, { color: colors.destructive }]}>
                  Delete Reminder
                </Text>
              </Pressable>
            ) : null}
          </KeyboardAwareScrollViewCompat>
        </View>

        {medicinePickerOpen ? (
        <View style={styles.pickerLayer}>
            <Pressable
              accessibilityLabel="Close medicine list"
              onPress={() => setMedicinePickerOpen(false)}
            style={[styles.pickerBackdrop, { backgroundColor: colors.overlay }]}
            />
            <View
              style={[
                styles.pickerSheet,
                { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 14) },
              ]}
            >
              <View style={styles.pickerHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                    Select Medicine
                  </Text>
                  <Text style={[styles.pickerSubtitle, { color: colors.mutedForeground }]}>
                    Choose a medicine from your Vault.
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close"
                  onPress={() => setMedicinePickerOpen(false)}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={22} color={colors.foreground} />
                </Pressable>
              </View>
              <View
                style={[
                  styles.searchBox,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Ionicons name="search" size={17} color={colors.mutedForeground} />
                <TextInput
                  accessibilityLabel="Search medicines"
                  testID="medicine-search-input"
                  value={medicineSearch}
                  onChangeText={setMedicineSearch}
                  placeholder="Search medicines..."
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.searchInput, { color: colors.foreground }]}
                />
              </View>
              <KeyboardAwareScrollViewCompat
                style={styles.medicineList}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {filteredMedicines.map((item) => {
                  const isSelected = medicine === item.name;
                  return (
                    <Pressable
                      key={item.name}
                      testID={`medicine-${item.name.toLowerCase().replaceAll(' ', '-')}`}
                      onPress={() => {
                        setMedicine(item.name);
                        setValidationMessage('');
                        setMedicinePickerOpen(false);
                      }}
                      style={[
                        styles.medicineOption,
                        { borderColor: colors.border },
                        isSelected && { backgroundColor: colors.accent },
                      ]}
                    >
                      <View
                        style={[
                          styles.medicineOptionIcon,
                          { backgroundColor: colors.secondary },
                        ]}
                      >
                        <Ionicons name="medical-outline" size={19} color={colors.primary} />
                      </View>
                      <View style={styles.medicineOptionCopy}>
                        <Text style={[styles.medicineName, { color: colors.foreground }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.medicineDescription, { color: colors.mutedForeground }]}>
                          {item.category} ┬╖ {item.instructions}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={19}
                        color={isSelected ? colors.primary : colors.border}
                      />
                    </Pressable>
                  );
                })}
                {filteredMedicines.length === 0 ? (
                  <Text style={[styles.noMedicines, { color: colors.mutedForeground }]}>
                    No matching medicines. Try another search.
                  </Text>
                ) : null}
              </KeyboardAwareScrollViewCompat>
            </View>
          </View>
        ) : null}

        {confirmDelete ? (
          <View style={styles.confirmLayer}>
            <Pressable
              accessibilityLabel="Cancel delete"
              onPress={() => setConfirmDelete(false)}
              style={[
                styles.confirmBackdrop,
                { backgroundColor: colors.overlayStrong },
              ]}
            />
            <View style={[styles.confirmCard, { backgroundColor: colors.card }]}>
              <View
                style={[
                  styles.confirmIcon,
                  { backgroundColor: colors.confirmBackground },
                ]}
              >
                <Ionicons name="trash-outline" size={24} color={colors.destructive} />
              </View>
              <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
                Delete this reminder?
              </Text>
              <Text style={[styles.confirmCopy, { color: colors.mutedForeground }]}>
                This reminder will be removed from your list.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  testID="cancel-delete"
                  onPress={() => setConfirmDelete(false)}
                  style={[styles.confirmButton, { borderColor: colors.border }]}
                >
                  <Text style={[styles.confirmButtonText, { color: colors.foreground }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  testID="confirm-delete"
                  onPress={() => reminder && onDelete(reminder.id)}
                  style={[
                    styles.confirmButton,
                    { backgroundColor: colors.destructive, borderColor: colors.destructive },
                  ]}
                >
                  <Text style={[styles.confirmButtonText, { color: colors.destructiveForeground }]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    overflow: 'hidden',
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 19, fontWeight: '700' },
  iconButton: { padding: 4 },
  formScroll: { flexGrow: 0 },
  formContent: { paddingBottom: 12 },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    marginBottom: 9,
    minHeight: 82,
  },
  medicineIcon: {
    width: 52,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  medicineCopy: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 3 },
  medicineName: { fontSize: 14, fontWeight: '700' },
  medicineDescription: { fontSize: 11, lineHeight: 15, marginTop: 2 },
  changeMedicine: { flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  changeText: { fontSize: 10, fontWeight: '600' },
  fieldRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 9,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  inlineInput: {
    minWidth: 92,
    maxWidth: '45%',
    textAlign: 'right',
    fontSize: 12,
    paddingVertical: 8,
    paddingHorizontal: 3,
  },
  selectField: {
    minWidth: 112,
    maxWidth: '48%',
    height: 34,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectText: { fontSize: 12, flexShrink: 1 },
  inlineOptions: { flexDirection: 'row', gap: 8, paddingVertical: 9 },
  optionChip: {
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  optionText: { fontSize: 11, fontWeight: '600' },
  memberOptions: { gap: 6, paddingVertical: 8 },
  memberOption: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberText: { fontSize: 12, fontWeight: '600' },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 9,
    marginBottom: 7,
  },
  notesInput: {
    minHeight: 60,
    borderWidth: 1,
    borderRadius: 9,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
  },
  validation: { marginTop: 7, fontSize: 12, fontWeight: '600' },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginTop: 11,
  },
  primaryButtonText: { fontSize: 13, fontWeight: '700' },
  deleteButton: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 7,
  },
  deleteText: { fontSize: 12, fontWeight: '700' },
  pickerLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  pickerSheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pickerSubtitle: { fontSize: 12, marginTop: 4, marginBottom: 11 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 12, paddingVertical: 6 },
  medicineList: { flexGrow: 0 },
  medicineOption: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    gap: 9,
  },
  medicineOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineOptionCopy: { flex: 1 },
  noMedicines: { textAlign: 'center', paddingVertical: 22, fontSize: 13 },
  confirmLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },
  confirmBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  confirmCard: {
    width: '100%',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  confirmCopy: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  confirmActions: { flexDirection: 'row', gap: 9, width: '100%' },
  confirmButton: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: { fontSize: 12, fontWeight: '700' },
});
