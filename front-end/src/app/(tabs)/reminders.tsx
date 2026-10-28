import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ReminderEditorModal from '@/components/ReminderEditorModal';
import {
  FAMILY_MEMBERS,
  SAMPLE_REMINDERS,
  type Reminder,
} from '@/components/reminderTypes';
import { useColors } from '@/hooks/useColors';

const STORAGE_KEY = 'mediscan.reminders.v1';

export default function RemindersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ openAdd?: string }>();
  const handledAddParam = useRef('');
  const [reminders, setReminders] = useState<Reminder[]>(SAMPLE_REMINDERS);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState('All Members');
  const [pendingMember, setPendingMember] = useState('All Members');
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!isMounted) return;
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (
            Array.isArray(parsed) &&
            parsed.every(
              (item) =>
                typeof item === 'object' &&
                item !== null &&
                typeof (item as Reminder).id === 'string' &&
                typeof (item as Reminder).medicine === 'string',
            )
          ) {
            setReminders(parsed as Reminder[]);
          } else {
            setStorageError('Saved reminders could not be read. Sample reminders are shown.');
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setStorageError('Saved reminders could not be loaded. Changes will stay on this screen.');
        }
      })
      .finally(() => {
        if (isMounted) setLoaded(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const addRequest = params.openAdd;
    if (addRequest && addRequest !== handledAddParam.current) {
      handledAddParam.current = addRequest;
      setEditingReminder(null);
      setEditorVisible(true);
      router.setParams({ openAdd: undefined });
    }
  }, [params.openAdd]);

  const persist = async (next: Reminder[]) => {
    setReminders(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageError('');
    } catch {
      setStorageError('Could not save reminders on this device. Your current changes are still visible.');
    }
  };

  const visibleReminders = useMemo(() => {
    const filtered =
      selectedMember === 'All Members'
        ? reminders
        : reminders.filter((reminder) => reminder.member === selectedMember);
    return showAll ? filtered : filtered.slice(0, 2);
  }, [reminders, selectedMember, showAll]);

  const openNewReminder = () => {
    setEditingReminder(null);
    setEditorVisible(true);
  };

  const openReminder = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditorVisible(true);
  };

  const saveReminder = (reminder: Reminder) => {
    const isEditing = reminders.some((item) => item.id === reminder.id);
    const next = isEditing
      ? reminders.map((item) => (item.id === reminder.id ? reminder : item))
      : [reminder, ...reminders];
    void persist(next);
    setEditorVisible(false);
    setEditingReminder(null);
    setSuccessMessage(isEditing ? 'Changes saved' : 'Reminder added');
  };

  const deleteReminder = (id: string) => {
    void persist(reminders.filter((item) => item.id !== id));
    setEditorVisible(false);
    setEditingReminder(null);
    setSuccessMessage('Reminder deleted');
  };

  const toggleReminder = (id: string) => {
    void persist(
      reminders.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

 const goBack = () => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.navigate('/(tabs)');
  }
};

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const todayCount = reminders.filter((item) => item.enabled).length;

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safe,
        { backgroundColor: colors.background, paddingTop: Math.max(0, webTopInset - insets.top) },
      ]}
    >
      <StatusBar style="dark" />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          testID="reminders-back"
          onPress={goBack}
          hitSlop={10}
          style={styles.headerSide}
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          All Reminders
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter reminders by family member"
          testID="open-reminder-filter"
          onPress={() => {
            setPendingMember(selectedMember);
            setFilterVisible(true);
          }}
          hitSlop={10}
          style={[styles.headerSide, styles.filterButton]}
        >
          <Ionicons name="filter-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {!loaded ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading remindersΓÇª
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {storageError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.expiringBackground }]}>
              <Ionicons name="information-circle-outline" size={17} color={colors.expiringForeground} />
              <Text style={[styles.errorText, { color: colors.expiringForeground }]}>
                {storageError}
              </Text>
              <Pressable
                accessibilityLabel="Dismiss storage message"
                onPress={() => setStorageError('')}
                hitSlop={8}
              >
                <Ionicons name="close" size={17} color={colors.expiringForeground} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Upcoming Alerts
            </Text>
            <Pressable
              accessibilityRole="button"
              testID="toggle-all-reminders"
              onPress={() => setShowAll((value) => !value)}
              hitSlop={8}
            >
              <Text style={[styles.viewAll, { color: colors.primary }]}>
                {showAll ? 'Show Less' : 'View All'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.summaryRow}>
            <SummaryCard
              count="2"
              label="Expired"
              sublabel="Medicines"
              icon="ban-outline"
              background={colors.expiredBackground}
              border={colors.expiredBorder}
              foreground={colors.expiredForeground}
            />
            <SummaryCard
              count="2"
              label="Expiring"
              sublabel="Medicines"
              icon="alert-circle-outline"
              background={colors.expiringBackground}
              border={colors.expiringBorder}
              foreground={colors.expiringForeground}
            />
            <SummaryCard
              count={String(todayCount)}
              label="Reminders"
              sublabel="Today"
              icon="calendar-outline"
              background={colors.todayBackground}
              border={colors.todayBorder}
              foreground={colors.todayForeground}
            />
            <SummaryCard
              count={String(reminders.length)}
              label="Total"
              sublabel="Reminders"
              icon="notifications"
              background={colors.totalBackground}
              border={colors.totalBorder}
              foreground={colors.totalForeground}
            />
          </View>

          <View style={styles.listHeading}>
            <View>
              <Text style={[styles.listTitle, { color: colors.foreground }]}>
                Today - Aug 13
              </Text>
              {selectedMember !== 'All Members' ? (
                <Text style={[styles.filterCaption, { color: colors.mutedForeground }]}>
                  Showing {selectedMember}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.countText, { color: colors.mutedForeground }]}>
              {selectedMember === 'All Members'
                ? reminders.length
                : reminders.filter((item) => item.member === selectedMember).length}{' '}
              {reminders.length === 1 ? 'reminder' : 'reminders'}
            </Text>
          </View>

          {visibleReminders.length ? (
            <View style={styles.reminderList}>
              {visibleReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onPress={() => openReminder(reminder)}
                  onToggle={() => toggleReminder(reminder.id)}
                  colors={colors}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="alarm-outline" size={23} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No reminders for {selectedMember}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Add a reminder or choose another family member.
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            testID="add-reminder-button"
            onPress={openNewReminder}
            style={({ pressed }) => [
              styles.addReminderButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 },
            ]}
          >
            <Ionicons name="add" size={19} color={colors.primaryForeground} />
            <Text style={[styles.addReminderText, { color: colors.primaryForeground }]}>
              Add Reminder
            </Text>
          </Pressable>
        </ScrollView>
      )}

      <ReminderEditorModal
        key={editingReminder?.id ?? 'new-reminder'}
        visible={editorVisible}
        reminder={editingReminder}
        onClose={() => {
          setEditorVisible(false);
          setEditingReminder(null);
        }}
        onSave={saveReminder}
        onDelete={deleteReminder}
      />

      <FilterModal
        visible={filterVisible}
        selectedMember={pendingMember}
        onSelect={setPendingMember}
        onClose={() => setFilterVisible(false)}
        onApply={() => {
          setSelectedMember(pendingMember);
          setShowAll(true);
          setFilterVisible(false);
        }}
        colors={colors}
        bottomInset={insets.bottom}
      />

      <Modal
        visible={Boolean(successMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessMessage('')}
      >
        <View
          style={[
            styles.successBackdrop,
            { backgroundColor: colors.overlayStrong },
          ]}
        >
          <View style={[styles.successCard, { backgroundColor: colors.card }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="checkmark" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>
              {successMessage}
            </Text>
            <Text style={[styles.successCopy, { color: colors.mutedForeground }]}>
              Your reminder list has been updated.
            </Text>
            <Pressable
              accessibilityRole="button"
              testID="dismiss-success"
              onPress={() => setSuccessMessage('')}
              style={[styles.successButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.successButtonText, { color: colors.primaryForeground }]}>
                Done
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type SummaryCardProps = {
  count: string;
  label: string;
  sublabel: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  background: string;
  border: string;
  foreground: string;
};

function SummaryCard({
  count,
  label,
  sublabel,
  icon,
  background,
  border,
  foreground,
}: SummaryCardProps) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: background, borderColor: border }]}>
      <Text style={[styles.summaryCount, { color: foreground }]}>{count}</Text>
      <Text numberOfLines={1} style={[styles.summaryLabel, { color: foreground }]}>
        {label}
      </Text>
      <Text numberOfLines={1} style={[styles.summarySublabel, { color: foreground }]}>
        {sublabel}
      </Text>
      <Ionicons name={icon} size={15} color={foreground} style={styles.summaryIcon} />
    </View>
  );
}

type ReminderCardProps = {
  reminder: Reminder;
  onPress: () => void;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
};


function ReminderCard({ reminder, onPress, onToggle, colors }: ReminderCardProps) {
  return (
    <View
      style={[
        styles.reminderCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      {/* Reminder information: separate clickable area */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${reminder.medicine} reminder at ${reminder.time}`}
        testID={`reminder-card-${reminder.id}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.reminderCardContent,
          { opacity: pressed ? 0.75 : 1 },
        ]}
      >
        <View style={styles.timeColumn}>
          <Text style={[styles.timeText, { color: colors.foreground }]}>
            {reminder.time}
          </Text>
          <Ionicons
            name="sunny-outline"
            size={17}
            color={colors.expiringBorder}
            style={styles.sunIcon}
          />
        </View>

        <View
          style={[
            styles.cardDivider,
            { backgroundColor: colors.border },
          ]}
        />

        <View style={styles.reminderInfo}>
          <Text
            numberOfLines={1}
            style={[
              styles.reminderMedicine,
              { color: colors.foreground },
            ]}
          >
            {reminder.medicine}
          </Text>

          <Text
            style={[
              styles.reminderMeta,
              { color: colors.mutedForeground },
            ]}
          >
            {reminder.category}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.reminderInstructions,
              { color: colors.foreground },
            ]}
          >
            {reminder.instructions || reminder.frequency}
          </Text>

          <View style={styles.memberLine}>
            <View
              style={[
                styles.memberAvatar,
                { backgroundColor: colors.accent },
              ]}
            >
              <Ionicons
                name="person"
                size={10}
                color={colors.primary}
              />
            </View>

            <Text
              style={[
                styles.memberName,
                { color: colors.mutedForeground },
              ]}
            >
              {reminder.member}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Bell toggle: sibling of the edit button, not nested inside it */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Turn ${
          reminder.enabled ? 'off' : 'on'
        } ${reminder.medicine} alert`}
        accessibilityState={{ checked: reminder.enabled }}
        testID={`toggle-reminder-${reminder.id}`}
        onPress={onToggle}
        hitSlop={8}
        style={styles.bellButton}
      >
        <Ionicons
          name={
            reminder.enabled
              ? 'notifications-outline'
              : 'notifications-off-outline'
          }
          size={19}
          color={
            reminder.enabled
              ? colors.primary
              : colors.mutedForeground
          }
        />
      </Pressable>
    </View>
  );
}


type FilterModalProps = {
  visible: boolean;
  selectedMember: string;
  onSelect: (member: string) => void;
  onClose: () => void;
  onApply: () => void;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
};

function FilterModal({
  visible,
  selectedMember,
  onSelect,
  onClose,
  onApply,
  colors,
  bottomInset,
}: FilterModalProps) {
  const people = ['All Members', ...FAMILY_MEMBERS];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.filterRoot}>
        <Pressable
          accessibilityLabel="Close family filter"
          onPress={onClose}
          style={[styles.filterBackdrop, { backgroundColor: colors.overlay }]}
        />
        <View
          style={[
            styles.filterSheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(bottomInset, 14) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.filterTitleRow}>
            <Text style={[styles.filterTitle, { color: colors.foreground }]}>
              Filter by Family Member
            </Text>
            <Pressable
              accessibilityLabel="Close"
              testID="close-reminder-filter"
              onPress={onClose}
              hitSlop={10}
            >
              <Ionicons name="close" size={21} color={colors.foreground} />
            </Pressable>
          </View>
          <Text style={[styles.filterSubtitle, { color: colors.mutedForeground }]}>
            Show the daily timeline for:
          </Text>
          <ScrollView
            style={styles.filterList}
            contentContainerStyle={styles.filterListContent}
            showsVerticalScrollIndicator={false}
          >
            {people.map((person, index) => {
              const selected = selectedMember === person;
              return (
                <Pressable
                  key={person}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  testID={`filter-${person.toLowerCase().replaceAll(' ', '-')}`}
                  onPress={() => onSelect(person)}
                  style={[
                    styles.filterOption,
                    { borderColor: selected ? colors.todayBorder : colors.border },
                    selected && { backgroundColor: colors.accent },
                  ]}
                >
                  <View
                    style={[
                      styles.filterAvatar,
                      { backgroundColor: index === 0 ? colors.accent : colors.secondary },
                    ]}
                  >
                    <Ionicons
                      name={index === 0 ? 'people-outline' : 'person-outline'}
                      size={17}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={[styles.filterMember, { color: colors.foreground }]}>
                    {person}
                  </Text>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={19}
                    color={selected ? colors.todayForeground : colors.border}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            testID="apply-reminder-filter"
            onPress={onApply}
            style={({ pressed }) => [
              styles.addReminderButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 },
            ]}
          >
            <Text style={[styles.addReminderText, { color: colors.primaryForeground }]}>
              Apply Filter
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  headerSide: {
    width: 42,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  filterButton: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 18 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 13 },
  errorBanner: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 13,
  },
  errorText: { flex: 1, fontSize: 11, lineHeight: 15 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  viewAll: { fontSize: 12, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 7 },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 91,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingTop: 6,
  },
  summaryCount: { fontSize: 17, fontWeight: '800', marginBottom: 3 },
  summaryLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  summarySublabel: { fontSize: 8, textAlign: 'center', marginTop: 1 },
  summaryIcon: { marginTop: 5 },
  listHeading: {
    marginTop: 21,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: { fontSize: 14, fontWeight: '700' },
  filterCaption: { fontSize: 10, marginTop: 3 },
  countText: { fontSize: 11 },
  reminderList: { gap: 8 },
  reminderCard: {
    minHeight: 103,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  timeColumn: {
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  timeText: { fontSize: 10, fontWeight: '600' },
  sunIcon: { marginTop: 2 },
  cardDivider: { width: 1, height: 68, marginHorizontal: 9 },
  reminderInfo: { flex: 1, minWidth: 0 },
  reminderMedicine: { fontSize: 12, fontWeight: '700' },
  reminderMeta: { fontSize: 10, marginTop: 1 },
  reminderInstructions: { fontSize: 10, marginTop: 2 },
  memberLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  memberAvatar: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: { fontSize: 10 },
  bellButton: { padding: 6, marginLeft: 4 },
  emptyCard: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 13,
    padding: 18,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 5 },
  addReminderButton: {
    minHeight: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 12,
  },
  addReminderText: { fontSize: 12, fontWeight: '700' },
  filterRoot: { flex: 1, justifyContent: 'flex-end' },
  filterBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  filterSheet: {
    maxHeight: '82%',
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 11,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: { fontSize: 17, fontWeight: '700' },
  filterSubtitle: { fontSize: 11, marginTop: 10, marginBottom: 8 },
  filterList: { flexGrow: 0 },
  filterListContent: { gap: 6, paddingBottom: 5 },
  filterOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    gap: 8,
  },
  filterAvatar: {
    width: 29,
    height: 29,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterMember: { flex: 1, fontSize: 12, fontWeight: '600' },
  successBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  successCard: {
    width: '100%',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  successTitle: { fontSize: 17, fontWeight: '700' },
  successCopy: { fontSize: 11, textAlign: 'center', marginTop: 5, marginBottom: 15 },
  successButton: {
    width: '100%',
    minHeight: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButtonText: { fontSize: 12, fontWeight: '700' },

  reminderCardContent: {
  flex: 1,
  minWidth: 0,
  flexDirection: 'row',
  alignItems: 'center',
},
});
