import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SAVED_MEDICINES_KEY,
  type SavedMedicine,
} from '@/components/reminderTypes';
import { useColors } from '@/hooks/useColors';

type MedicineStatus = 'Needs Verification' | 'Expired' | 'Expiring' | 'Verified';
type FilterStatus = 'All' | Exclude<MedicineStatus, 'Verified'>;
type SortBy = 'expiry' | 'name';
type UrgencyFilter = '7 days' | '30 days' | 'Expired' | 'Custom range' | null;
type MedicineForm = 'Tablet' | 'Capsule' | 'Syrup' | 'Drops' | 'Inhaler';

type MedicineItem = {
  id: string;
  name: string;
  category: string;
  expiryDate: string;
  status: MedicineStatus;
  iconColor: string;
};

type AlertPreferences = {
  archivedIds: string[];
  deletedIds: string[];
  expiryOverrides: Record<string, string>;
  snoozedUntil: Record<string, number>;
};

const ALERT_PREFERENCES_KEY = 'mediscan.alert-preferences.v1';
const DAY_MS = 86_400_000;
const MEDICINE_FORMS: MedicineForm[] = ['Tablet', 'Capsule', 'Syrup', 'Drops', 'Inhaler'];
const EMPTY_PREFERENCES: AlertPreferences = {
  archivedIds: [],
  deletedIds: [],
  expiryOverrides: {},
  snoozedUntil: {},
};

const SAMPLE_MEDICINES: MedicineItem[] = [
  {
    id: 'sample-paracetamol',
    name: 'Paracetamol Biogesic',
    category: 'Tablet',
    expiryDate: 'December 25, 2026',
    status: 'Verified',
    iconColor: '#D9EAF4',
  },
  {
    id: 'sample-ibuprofen',
    name: 'Ibuprofen Advil',
    category: 'Capsule',
    expiryDate: 'March 12, 2025',
    status: 'Expired',
    iconColor: '#D9E6E2',
  },
  {
    id: 'sample-amoxicillin',
    name: 'Amoxicillin Moxatag',
    category: 'Tablet',
    expiryDate: 'July 9, 2024',
    status: 'Expired',
    iconColor: '#F5E7D8',
  },
  {
    id: 'sample-cetirizine',
    name: 'Cetirizine Zyrtec',
    category: 'Tablet',
    expiryDate: 'January 15, 2027',
    status: 'Verified',
    iconColor: '#ECE7E1',
  },
  {
    id: 'sample-metformin',
    name: 'Metformin Glucophage',
    category: 'Tablet',
    expiryDate: 'October 3, 2025',
    status: 'Verified',
    iconColor: '#E5E9E8',
  },
  {
    id: 'sample-loratadine',
    name: 'Loratadine Claritin',
    category: 'Syrup',
    expiryDate: 'May 30, 2026',
    status: 'Expiring',
    iconColor: '#EDE6F1',
  },
  {
    id: 'sample-accupril',
    name: 'Accupril',
    category: 'Tablet',
    expiryDate: 'November 17, 2026',
    status: 'Expiring',
    iconColor: '#F5E2CF',
  },
  {
    id: 'sample-omeprazole',
    name: 'Omeprazole',
    category: 'Capsule',
    expiryDate: '',
    status: 'Needs Verification',
    iconColor: '#E3E8F1',
  },
  {
    id: 'sample-vitamin',
    name: 'Vitamin D3',
    category: 'Softgel',
    expiryDate: '',
    status: 'Needs Verification',
    iconColor: '#F1E7D5',
  },
];

const FILTERS: FilterStatus[] = [
  'All',
  'Needs Verification',
  'Expired',
  'Expiring',
];

export default function UpcomingAlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [currentTime, setCurrentTime] = useState<number | null>(null);

useEffect(() => {
  const updateTime = () => setCurrentTime(Date.now());

  updateTime();

  const interval = setInterval(updateTime, 60_000);

  return () => clearInterval(interval);
}, []);
  const [medicines, setMedicines] = useState<MedicineItem[]>(() =>
    SAMPLE_MEDICINES.map((item) => ({
      ...item,
      status: getStatusFromExpiry(item.expiryDate),
    })),
  );
  const [alertPreferences, setAlertPreferences] =
    useState<AlertPreferences>(EMPTY_PREFERENCES);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [storageError, setStorageError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('All');
  const [sortBy, setSortBy] = useState<SortBy>('expiry');
  const [sortAscending, setSortAscending] = useState(true);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectedForms, setSelectedForms] = useState<MedicineForm[]>([]);
  const [urgency, setUrgency] = useState<UrgencyFilter>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [draftForms, setDraftForms] = useState<MedicineForm[]>([]);
  const [draftUrgency, setDraftUrgency] = useState<UrgencyFilter>(null);
  const [draftDateFrom, setDraftDateFrom] = useState('');
  const [draftDateTo, setDraftDateTo] = useState('');
  const [filterError, setFilterError] = useState('');
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [actionMedicine, setActionMedicine] = useState<MedicineItem | null>(null);
  const [detailsMedicine, setDetailsMedicine] = useState<MedicineItem | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<MedicineItem | null>(null);
  const [editExpiryText, setEditExpiryText] = useState('');
  const [editExpiryError, setEditExpiryError] = useState('');
  const [deleteMedicine, setDeleteMedicine] = useState<MedicineItem | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.multiGet([SAVED_MEDICINES_KEY, ALERT_PREFERENCES_KEY])
      .then((entries) => {
        if (!isMounted) return;
        const savedMedicinesValue = entries[0]?.[1];
        const preferencesValue = entries[1]?.[1];
        const preferences = parseAlertPreferences(preferencesValue);
        setAlertPreferences(preferences);

        const parsed: unknown = savedMedicinesValue
          ? JSON.parse(savedMedicinesValue)
          : [];
        if (!Array.isArray(parsed)) {
          throw new Error('Saved medicines are not a list.');
        }
        const custom = parsed
          .filter(
            (item): item is SavedMedicine =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as SavedMedicine).id === 'string' &&
              typeof (item as SavedMedicine).name === 'string' &&
              typeof (item as SavedMedicine).category === 'string',
          )
          .map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            expiryDate: item.expiryDate ?? '',
            status: getStatusFromExpiry(item.expiryDate ?? ''),
            iconColor: '#EAF1EE',
          }));
        const customNames = new Set(custom.map((item) => item.name.toLowerCase()));
        const allMedicines = [
          ...custom,
          ...SAMPLE_MEDICINES.filter(
            (item) => !customNames.has(item.name.toLowerCase()),
          ),
        ];
        const deletedIds = new Set(preferences.deletedIds);
        setMedicines(
          allMedicines
            .filter((item) => !deletedIds.has(item.id))
            .map((item) => {
              const expiryDate = preferences.expiryOverrides[item.id] ?? item.expiryDate;
              return {
                ...item,
                expiryDate,
                status: getStatusFromExpiry(expiryDate),
              };
            }),
        );
      })
      .catch(() => {
        if (isMounted) {
          setStorageError('Saved medicines could not be loaded. Showing sample medicines.');
        }
      })
      .finally(() => {
        if (isMounted) setLoadingCustom(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleMedicines = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const filtered = medicines.filter((medicine) => {
      const isArchived = alertPreferences.archivedIds.includes(medicine.id);
      const matchesSearch =
        !normalizedQuery ||
        medicine.name.toLowerCase().includes(normalizedQuery) ||
        medicine.category.toLowerCase().includes(normalizedQuery);
      const matchesStatus = filter === 'All' || medicine.status === filter;
      const matchesForm =
        selectedForms.length === 0 || selectedForms.includes(medicine.category as MedicineForm);
      const matchesUrgency = medicineMatchesUrgency(
        medicine,
        urgency,
        dateFrom,
        dateTo,
      );
      return (
        matchesSearch &&
        matchesStatus &&
        matchesForm &&
        matchesUrgency &&
        (showArchived ? isArchived : !isArchived)
      );
    });

    return filtered.sort((left, right) => {
      const comparison =
        sortBy === 'name'
          ? left.name.localeCompare(right.name)
          : compareExpiry(left.expiryDate, right.expiryDate);
      return sortAscending ? comparison : -comparison;
    });
  }, [
    alertPreferences.archivedIds,
    dateFrom,
    dateTo,
    filter,
    medicines,
    search,
    selectedForms,
    showArchived,
    sortAscending,
    sortBy,
    urgency,
  ]);

  const counts = useMemo(
    () => ({
      all: medicines.filter((item) => !alertPreferences.archivedIds.includes(item.id)).length,
      verification: medicines.filter(
        (item) =>
          !alertPreferences.archivedIds.includes(item.id) &&
          item.status === 'Needs Verification',
      ).length,
      expired: medicines.filter(
        (item) =>
          !alertPreferences.archivedIds.includes(item.id) && item.status === 'Expired',
      ).length,
      expiring: medicines.filter(
        (item) =>
          !alertPreferences.archivedIds.includes(item.id) && item.status === 'Expiring',
      ).length,
    }),
    [alertPreferences.archivedIds, medicines],
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/(tabs)/reminders' as never);
  };

  const persistPreferences = (next: AlertPreferences) => {
    setAlertPreferences(next);
    AsyncStorage.setItem(ALERT_PREFERENCES_KEY, JSON.stringify(next)).catch(() => {
      setStorageError('Your alert changes could not be saved. Please try again.');
    });
  };

  const updateSavedMedicine = (
    medicineId: string,
    updater: (medicine: SavedMedicine) => SavedMedicine | null,
  ) => {
    AsyncStorage.getItem(SAVED_MEDICINES_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (!Array.isArray(parsed)) return;
        const updated = parsed
          .filter(
            (item): item is SavedMedicine =>
              typeof item === 'object' &&
              item !== null &&
              typeof (item as SavedMedicine).id === 'string',
          )
          .map((item) => (item.id === medicineId ? updater(item) : item))
          .filter((item): item is SavedMedicine => item !== null);
        return AsyncStorage.setItem(SAVED_MEDICINES_KEY, JSON.stringify(updated));
      })
      .catch(() => {
        setStorageError('A medicine change could not be saved to your vault.');
      });
  };

  const beginFilterSheet = () => {
    setDraftForms(selectedForms);
    setDraftUrgency(urgency);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setFilterError('');
    setFilterSheetVisible(true);
  };

  const toggleDraftForm = (form: MedicineForm) => {
    setDraftForms((current) =>
      current.includes(form)
        ? current.filter((item) => item !== form)
        : [...current, form],
    );
  };

  const applyFilters = () => {
    if (draftUrgency === 'Custom range') {
      const from = parseDateInput(draftDateFrom);
      const to = parseDateInput(draftDateTo);
      if (!from || !to) {
        setFilterError('Enter a valid start and end date.');
        return;
      }
      if (from.getTime() > to.getTime()) {
        setFilterError('The start date must be before the end date.');
        return;
      }
    }
    setSelectedForms(draftForms);
    setUrgency(draftUrgency);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    setFilterSheetVisible(false);
  };

  const resetDraftFilters = () => {
    setDraftForms([]);
    setDraftUrgency(null);
    setDraftDateFrom('');
    setDraftDateTo('');
    setFilterError('');
  };

  const editExpiryDate = () => {
    if (!actionMedicine) return;
    setEditExpiryText(formatDateInput(actionMedicine.expiryDate));
    setEditExpiryError('');
    setEditingMedicine(actionMedicine);
    setActionMedicine(null);
  };

  const saveExpiryDate = () => {
    if (!editingMedicine) return;
    const parsedDate = parseDateInput(editExpiryText);
    if (!parsedDate) {
      setEditExpiryError('Enter a valid date in MM/DD/YYYY format.');
      return;
    }
    const formatted = formatLongDate(parsedDate);
    setMedicines((current) =>
      current.map((item) =>
        item.id === editingMedicine.id
          ? { ...item, expiryDate: formatted, status: getStatusFromExpiry(formatted) }
          : item,
      ),
    );
    persistPreferences({
      ...alertPreferences,
      expiryOverrides: {
        ...alertPreferences.expiryOverrides,
        [editingMedicine.id]: formatted,
      },
    });
    updateSavedMedicine(editingMedicine.id, (item) => ({
      ...item,
      expiryDate: formatted,
    }));
    setEditingMedicine(null);
  };

  const snoozeAlert = (medicine: MedicineItem) => {
    persistPreferences({
      ...alertPreferences,
      snoozedUntil: {
        ...alertPreferences.snoozedUntil,
        [medicine.id]: Date.now() + 7 * DAY_MS,
      },
    });
    setActionMedicine(null);
  };

  const archiveMedicine = (medicine: MedicineItem, archived: boolean) => {
    const archivedIds = archived
      ? alertPreferences.archivedIds.filter((id) => id !== medicine.id)
      : [...new Set([...alertPreferences.archivedIds, medicine.id])];
    persistPreferences({ ...alertPreferences, archivedIds });
    setActionMedicine(null);
  };

  const removeMedicine = (medicine: MedicineItem) => {
    const deletedIds = [...new Set([...alertPreferences.deletedIds, medicine.id])];
    persistPreferences({ ...alertPreferences, deletedIds });
    setMedicines((current) => current.filter((item) => item.id !== medicine.id));
    updateSavedMedicine(medicine.id, () => null);
    setDeleteMedicine(null);
  };

  const activeFilterCount = selectedForms.length + (urgency ? 1 : 0);
  const webTopInset = Platform.OS === 'web' ? Math.max(0, 67 - insets.top) : 0;

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safe,
        { backgroundColor: colors.background, paddingTop: webTopInset },
      ]}
    >
      <StatusBar style="dark" />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back to all reminders"
          testID="upcoming-alerts-back"
          onPress={goBack}
          hitSlop={10}
          style={styles.headerSide}
        >
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {showArchived ? 'Archived Medicines' : 'Upcoming Alerts'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="More medicine list options"
          testID="upcoming-alerts-more"
          onPress={() => setOptionsVisible(true)}
          hitSlop={10}
          style={[styles.headerSide, styles.moreButton]}
        >
          <Ionicons name="ellipsis-vertical" size={21} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <TextInput
            accessibilityLabel="Search medicines"
            testID="search-alert-medicines"
            value={search}
            onChangeText={setSearch}
            placeholder="Search medicines..."
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search ? (
            <Pressable
              accessibilityLabel="Clear medicine search"
              testID="clear-medicine-search"
              onPress={() => setSearch('')}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : (
            <Ionicons name="search-outline" size={19} color={colors.foreground} />
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter and sort medicines"
          testID="open-medicine-filters"
          onPress={beginFilterSheet}
          style={[styles.filterButton, { backgroundColor: colors.background }]}
        >
          <Ionicons name="options-outline" size={22} color={colors.primary} />
          {activeFilterCount > 0 ? (
            <View
              style={[
                styles.filterBadge,
                { backgroundColor: colors.primary, borderColor: colors.card },
              ]}
            />
          ) : null}
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {FILTERS.map((option) => {
          const selected = filter === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              testID={`alert-filter-${option.toLowerCase().replaceAll(' ', '-')}`}
              onPress={() => setFilter(option)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              {option !== 'All' ? (
                <Ionicons
                  name={filterIcon(option)}
                  size={13}
                  color={selected ? colors.primaryForeground : filterColor(option, colors)}
                />
              ) : null}
              <Text
                numberOfLines={1}
                style={[
                  styles.filterChipText,
                  { color: selected ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {option}
              </Text>
              {option !== 'All' ? (
                <Text
                  style={[
                    styles.filterCount,
                    { color: selected ? colors.primaryForeground : filterColor(option, colors) },
                  ]}
                >
                  {option === 'Needs Verification'
                    ? counts.verification
                    : option === 'Expired'
                      ? counts.expired
                      : counts.expiring}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.listHeading}>
        <Text style={[styles.listTitle, { color: colors.foreground }]}>
          {visibleMedicines.length} {visibleMedicines.length === 1 ? 'Medicine' : 'Medicines'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sort by ${sortBy === 'expiry' ? 'medicine name' : 'expiry date'}, ${sortAscending ? 'descending' : 'ascending'}`}
          testID="toggle-alert-sort"
          onPress={() => {
            setSortAscending((ascending) => !ascending);
          }}
          style={styles.sortButton}
        >
          <Text style={[styles.sortText, { color: colors.primary }]}>Sort</Text>
          <Ionicons
            name={sortAscending ? 'swap-vertical-outline' : 'swap-vertical'}
            size={17}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {storageError ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.expiringBackground }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.expiringForeground} />
          <Text style={[styles.errorText, { color: colors.expiringForeground }]}>{storageError}</Text>
        </View>
      ) : null}

      {loadingCustom ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : visibleMedicines.length ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {visibleMedicines.map((medicine, index) => (
            <View
              key={medicine.id}
              style={[
                styles.medicineRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${medicine.name}, ${medicine.category}, ${expiryCaption(medicine)}`}
                testID={`alert-medicine-${medicine.id}`}
                onPress={() => setDetailsMedicine(medicine)}
                style={({ pressed }) => [
                  styles.medicineMain,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <View style={[styles.productImage, { backgroundColor: medicine.iconColor }]}>
                  <Ionicons
                    name={productIcon(medicine.category)}
                    size={24}
                    color={productTint(index, colors)}
                  />
                  <View style={[styles.productStripe, { backgroundColor: productTint(index, colors) }]} />
                </View>
                <View style={styles.medicineCopy}>
                  <Text numberOfLines={1} style={[styles.medicineName, { color: colors.foreground }]}>
                    {medicine.name}
                  </Text>
                  <Text style={[styles.medicineCategory, { color: colors.mutedForeground }]}>
                    {medicine.category}
                  </Text>
                  {medicine.expiryDate ? (
                    <View style={styles.expiryRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={11}
                        color={expiryColor(medicine.status, colors)}
                      />
                      <Text
                        numberOfLines={1}
                        style={[styles.expiryText, { color: expiryColor(medicine.status, colors) }]}
                      >
                        {expiryCaption(medicine)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.expiryRow}>
                      <Ionicons name="alert-circle-outline" size={11} color={colors.expiringForeground} />
                      <Text style={[styles.expiryText, { color: colors.expiringForeground }]}>
                        Check expiry date
                      </Text>
                    </View>
                  )}
                  {currentTime !== null &&
                    alertPreferences.snoozedUntil[medicine.id] > currentTime ? (
                    <View style={styles.expiryRow}>
                      <Ionicons name="time-outline" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.expiryText, { color: colors.mutedForeground }]}>
                        Alert snoozed
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Options for ${medicine.name}`}
                testID={`medicine-options-${medicine.id}`}
                onPress={() => setActionMedicine(medicine)}
                hitSlop={9}
                style={styles.rowMore}
              >
                <Ionicons name="ellipsis-vertical" size={17} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}
          <View style={styles.listBottomSpace} />
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="search-outline" size={23} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {showArchived ? 'No archived medicines' : 'No medicines found'}
          </Text>
          <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>
            {showArchived
              ? 'Medicines you archive will appear here.'
              : 'Try another search or select a different filter.'}
          </Text>
        </View>
      )}

      <FiltersSheet
        visible={filterSheetVisible}
        selectedForms={draftForms}
        urgency={draftUrgency}
        dateFrom={draftDateFrom}
        dateTo={draftDateTo}
        error={filterError}
        onToggleForm={toggleDraftForm}
        onSelectUrgency={setDraftUrgency}
        onDateFromChange={setDraftDateFrom}
        onDateToChange={setDraftDateTo}
        onReset={resetDraftFilters}
        onClose={() => setFilterSheetVisible(false)}
        onApply={applyFilters}
        colors={colors}
        bottomInset={insets.bottom}
      />

      <OptionsModal
        visible={optionsVisible}
        sortBy={sortBy}
        archivedCount={alertPreferences.archivedIds.length}
        showingArchived={showArchived}
        onSelect={(nextSort) => {
          setSortBy(nextSort);
          setOptionsVisible(false);
        }}
        onToggleArchive={() => {
          setShowArchived((current) => !current);
          setFilter('All');
          setOptionsVisible(false);
        }}
        onClose={() => setOptionsVisible(false)}
        colors={colors}
        bottomInset={insets.bottom}
      />

      <MedicineActionsModal
        medicine={actionMedicine}
        archived={Boolean(
          actionMedicine && alertPreferences.archivedIds.includes(actionMedicine.id),
        )}
        onClose={() => setActionMedicine(null)}
        onEditExpiry={editExpiryDate}
        onSnooze={() => {
          if (actionMedicine) snoozeAlert(actionMedicine);
        }}
        onArchive={() => {
          if (actionMedicine) {
            archiveMedicine(
              actionMedicine,
              alertPreferences.archivedIds.includes(actionMedicine.id),
            );
          }
        }}
        onDelete={() => {
          setDeleteMedicine(actionMedicine);
          setActionMedicine(null);
        }}
        colors={colors}
        bottomInset={insets.bottom}
      />

      <MedicineDetailsModal
        medicine={detailsMedicine}
        currentTime={currentTime}
        snoozedUntil={
          detailsMedicine
            ? alertPreferences.snoozedUntil[detailsMedicine.id]
            : undefined
        }
        onClose={() => setDetailsMedicine(null)}
        colors={colors}
        bottomInset={insets.bottom}
      />
      <EditExpiryModal
        medicine={editingMedicine}
        value={editExpiryText}
        error={editExpiryError}
        onChange={setEditExpiryText}
        onClose={() => setEditingMedicine(null)}
        onSave={saveExpiryDate}
        colors={colors}
        bottomInset={insets.bottom}
      />
      <DeleteConfirmationModal
        medicine={deleteMedicine}
        onClose={() => setDeleteMedicine(null)}
        onConfirm={() => {
          if (deleteMedicine) removeMedicine(deleteMedicine);
        }}
        colors={colors}
        bottomInset={insets.bottom}
      />
    </SafeAreaView>
  );
}

function FiltersSheet({
  visible,
  selectedForms,
  urgency,
  dateFrom,
  dateTo,
  error,
  onToggleForm,
  onSelectUrgency,
  onDateFromChange,
  onDateToChange,
  onReset,
  onClose,
  onApply,
  colors,
  bottomInset,
}: {
  visible: boolean;
  selectedForms: MedicineForm[];
  urgency: UrgencyFilter;
  dateFrom: string;
  dateTo: string;
  error: string;
  onToggleForm: (form: MedicineForm) => void;
  onSelectUrgency: (urgency: UrgencyFilter) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onReset: () => void;
  onClose: () => void;
  onApply: () => void;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(bottomInset, 14),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Filters</Text>
            <Pressable accessibilityLabel="Close filters" onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={21} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Medicine Form
              </Text>
              <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
                Multi-select
              </Text>
            </View>
            <View style={styles.choiceChips}>
              {MEDICINE_FORMS.map((form) => {
                const selected = selectedForms.includes(form);
                return (
                  <Pressable
                    key={form}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    testID={`form-filter-${form.toLowerCase()}`}
                    onPress={() => onToggleForm(form)}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={13}
                        color={colors.primaryForeground}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.choiceChipText,
                        {
                          color: selected
                            ? colors.primaryForeground
                            : colors.foreground,
                        },
                      ]}
                    >
                      {form}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.sectionDivider, { borderColor: colors.border }]} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Date Range / Urgency
            </Text>
            <View style={styles.choiceChips}>
              {([
                ['7 days', 'Expiring within 7 days', 'time-outline'],
                ['30 days', 'Expiring within 30 days', 'time-outline'],
                ['Expired', 'Expired', 'close-circle-outline'],
                ['Custom range', 'Custom range', 'calendar-outline'],
              ] as const).map(([value, label, icon]) => {
                const selected = urgency === value;
                const isExpired = value === 'Expired';
                const iconColor = selected
                  ? colors.primaryForeground
                  : isExpired
                    ? colors.destructive
                    : colors.expiringForeground;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    testID={`urgency-filter-${value.toLowerCase().replaceAll(' ', '-')}`}
                    onPress={() => onSelectUrgency(selected ? null : value)}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons name={icon} size={13} color={iconColor} />
                    <Text
                      style={[
                        styles.choiceChipText,
                        {
                          color: selected
                            ? colors.primaryForeground
                            : colors.foreground,
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {urgency === 'Custom range' ? (
              <View style={styles.dateRangeFields}>
                <DateInput
                  label="From"
                  value={dateFrom}
                  onChangeText={onDateFromChange}
                  colors={colors}
                  testID="filter-date-from"
                />
                <DateInput
                  label="To"
                  value={dateTo}
                  onChangeText={onDateToChange}
                  colors={colors}
                  testID="filter-date-to"
                />
              </View>
            ) : null}
            {error ? (
              <Text
                accessibilityRole="alert"
                style={[styles.validationError, { color: colors.destructive }]}
              >
                {error}
              </Text>
            ) : null}
          </ScrollView>
          <View style={styles.sheetFooter}>
            <Pressable
              accessibilityRole="button"
              testID="reset-medicine-filters"
              onPress={onReset}
              style={({ pressed }) => [
                styles.resetButton,
                { borderColor: colors.border, opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.foreground} />
              <Text style={[styles.resetText, { color: colors.foreground }]}>Reset</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="apply-medicine-filters"
              onPress={onApply}
              style={({ pressed }) => [
                styles.applyButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              <Text style={[styles.applyText, { color: colors.primaryForeground }]}>
                Apply Filters
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DateInput({
  label,
  value,
  onChangeText,
  colors,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  testID: string;
}) {
  return (
    <View style={styles.dateInputGroup}>
      <Text style={[styles.dateInputLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View
        style={[
          styles.dateInput,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <TextInput
          accessibilityLabel={`${label} date`}
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder="MM/DD/YYYY"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          style={[styles.dateInputText, { color: colors.foreground }]}
        />
        <Ionicons name="calendar-outline" size={15} color={colors.mutedForeground} />
      </View>
    </View>
  );
}

function OptionsModal({
  visible,
  sortBy,
  archivedCount,
  showingArchived,
  onSelect,
  onToggleArchive,
  onClose,
  colors,
  bottomInset,
}: {
  visible: boolean;
  sortBy: SortBy;
  archivedCount: number;
  showingArchived: boolean;
  onSelect: (sort: SortBy) => void;
  onToggleArchive: () => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        <View style={[styles.optionsCard, { backgroundColor: colors.card, marginBottom: Math.max(bottomInset, 12) }]}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>List options</Text>
          {([
            ['expiry', 'By expiry date', 'calendar-outline'],
            ['name', 'By medicine name', 'text-outline'],
          ] as const).map(([value, label, icon]) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              testID={`quick-sort-${value}`}
              onPress={() => onSelect(value)}
              style={[styles.quickOption, { borderColor: colors.border }]}
            >
              <Ionicons name={icon} size={17} color={colors.primary} />
              <Text style={[styles.sheetOptionText, { color: colors.foreground }]}>{label}</Text>
              {sortBy === value ? (
                <Ionicons name="checkmark" size={18} color={colors.primary} />
              ) : null}
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            testID="toggle-archived-medicines"
            onPress={onToggleArchive}
            style={[styles.quickOption, { borderColor: colors.border }]}
          >
            <Ionicons
              name={showingArchived ? 'arrow-back-outline' : 'archive-outline'}
              size={17}
              color={colors.primary}
            />
            <Text style={[styles.sheetOptionText, { color: colors.foreground }]}>
              {showingArchived
                ? 'Back to upcoming alerts'
                : `View archive (${archivedCount})`}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID="close-medicine-options"
            onPress={onClose}
            style={[styles.cancelButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function MedicineActionsModal({
  medicine,
  archived,
  onClose,
  onEditExpiry,
  onSnooze,
  onArchive,
  onDelete,
  colors,
  bottomInset,
}: {
  medicine: MedicineItem | null;
  archived: boolean;
  onClose: () => void;
  onEditExpiry: () => void;
  onSnooze: () => void;
  onArchive: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}) {
  return (
    <Modal visible={Boolean(medicine)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        {medicine ? (
          <View style={[styles.optionsCard, { backgroundColor: colors.card, marginBottom: Math.max(bottomInset, 12) }]}>
            <Text numberOfLines={1} style={[styles.sheetTitle, { color: colors.foreground }]}>
              {medicine.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              testID="edit-expiration-date"
              onPress={onEditExpiry}
              style={[styles.quickOption, { borderColor: colors.border }]}
            >
              <Ionicons name="calendar-outline" size={17} color={colors.primary} />
              <Text style={[styles.sheetOptionText, { color: colors.foreground }]}>
                Edit Expiration Date
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="snooze-medicine-alert"
              onPress={onSnooze}
              style={[styles.quickOption, { borderColor: colors.border }]}
            >
              <Ionicons name="time-outline" size={17} color={colors.primary} />
              <Text style={[styles.sheetOptionText, { color: colors.foreground }]}>
                Snooze Alert
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="archive-medicine"
              onPress={onArchive}
              style={[styles.quickOption, { borderColor: colors.border }]}
            >
              <Ionicons
                name={archived ? 'arrow-undo-outline' : 'archive-outline'}
                size={17}
                color={colors.primary}
              />
              <Text style={[styles.sheetOptionText, { color: colors.foreground }]}>
                {archived ? 'Restore to Alerts' : 'Move to Archive'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="delete-medicine"
              onPress={onDelete}
              style={[styles.quickOption, { borderColor: colors.border }]}
            >
              <Ionicons name="trash-outline" size={17} color={colors.destructive} />
              <Text style={[styles.sheetOptionText, { color: colors.destructive }]}>
                Delete
              </Text>
            </Pressable>
            <Pressable onPress={onClose} style={[styles.cancelButton, { borderColor: colors.border }]}>
              <Text style={[styles.cancelText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function EditExpiryModal({
  medicine,
  value,
  error,
  onChange,
  onClose,
  onSave,
  colors,
  bottomInset,
}: {
  medicine: MedicineItem | null;
  value: string;
  error: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}) {
  return (
    <Modal
      visible={Boolean(medicine)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.overlay },
          ]}
        />
        {medicine ? (
          <View
            style={[
              styles.sheet,
              styles.editSheet,
              {
                backgroundColor: colors.card,
                paddingBottom: Math.max(bottomInset, 14),
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                Edit Expiration Date
              </Text>
              <Pressable
                accessibilityLabel="Close date editor"
                onPress={onClose}
                hitSlop={10}
              >
                <Ionicons name="close" size={21} color={colors.foreground} />
              </Pressable>
            </View>
            <Text style={[styles.editMedicineName, { color: colors.mutedForeground }]}>
              {medicine.name}
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <DateInput
                label="Expiration date"
                value={value}
                onChangeText={onChange}
                colors={colors}
                testID="edit-expiry-input"
              />
            </View>
            {error ? (
              <Text
                accessibilityRole="alert"
                style={[styles.validationError, { color: colors.destructive }]}
              >
                {error}
              </Text>
            ) : null}
            <View style={styles.editActions}>
              <Pressable
                accessibilityRole="button"
                testID="cancel-expiry-edit"
                onPress={onClose}
                style={[
                  styles.resetButton,
                  styles.editCancelButton,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[styles.resetText, { color: colors.foreground }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                testID="save-expiry-date"
                onPress={onSave}
                style={[styles.applyButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.applyText, { color: colors.primaryForeground }]}>
                  Save Date
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function DeleteConfirmationModal({
  medicine,
  onClose,
  onConfirm,
  colors,
  bottomInset,
}: {
  medicine: MedicineItem | null;
  onClose: () => void;
  onConfirm: () => void;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}) {
  return (
    <Modal
      visible={Boolean(medicine)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalRoot, styles.confirmModalRoot]}>
        <Pressable
          onPress={onClose}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.overlay },
          ]}
        />
        {medicine ? (
          <View
            style={[
              styles.confirmCard,
              { backgroundColor: colors.card, marginBottom: Math.max(bottomInset, 12) },
            ]}
          >
            <View style={[styles.confirmIcon, { backgroundColor: colors.confirmBackground }]}>
              <Ionicons name="trash-outline" size={21} color={colors.destructive} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>
              Delete this medicine?
            </Text>
            <Text style={[styles.confirmCopy, { color: colors.mutedForeground }]}>
              {medicine.name} will be removed from your alerts and medicine vault.
            </Text>
            <View style={styles.editActions}>
              <Pressable
                accessibilityRole="button"
                testID="cancel-medicine-delete"
                onPress={onClose}
                style={[
                  styles.resetButton,
                  styles.editCancelButton,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[styles.resetText, { color: colors.foreground }]}>
                  Keep
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                testID="confirm-medicine-delete"
                onPress={onConfirm}
                style={[
                  styles.applyButton,
                  { backgroundColor: colors.destructive },
                ]}
              >
                <Text style={[styles.applyText, { color: colors.destructiveForeground }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function MedicineDetailsModal({
  medicine,
  snoozedUntil,
  currentTime,
  onClose,
  colors,
  bottomInset,
}: {
  medicine: MedicineItem | null;
  snoozedUntil?: number;
  currentTime: number | null;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
  bottomInset: number;
}) {
  return (
    <Modal visible={Boolean(medicine)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        {medicine ? (
          <View style={[styles.detailsCard, { backgroundColor: colors.card, marginBottom: Math.max(bottomInset, 12) }]}>
            <View style={styles.detailsHeader}>
              <View style={[styles.detailsIcon, { backgroundColor: medicine.iconColor }]}>
                <Ionicons name={productIcon(medicine.category)} size={25} color={colors.primary} />
              </View>
              <View style={styles.detailsCopy}>
                <Text style={[styles.detailsName, { color: colors.foreground }]}>{medicine.name}</Text>
                <Text style={[styles.detailsCategory, { color: colors.mutedForeground }]}>{medicine.category}</Text>
              </View>
              <Pressable accessibilityLabel="Close medicine details" onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={[styles.detailLine, { borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Expiry date</Text>
              <Text style={[styles.detailValue, { color: colors.foreground }]}>
                {medicine.expiryDate || 'Not entered'}
              </Text>
            </View>
            <View style={[styles.detailLine, { borderColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Status</Text>
              <Text style={[styles.detailValue, { color: statusColor(medicine.status, colors) }]}>
                {medicine.status}
              </Text>
            </View>
            {currentTime !== null &&
              snoozedUntil &&
              snoozedUntil > currentTime ? (
              <View style={[styles.detailLine, { borderColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                  Alert
                </Text>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>
                  Snoozed until {formatLongDate(new Date(snoozedUntil))}
                </Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              testID="close-medicine-details"
              onPress={onClose}
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.applyText, { color: colors.primaryForeground }]}>Done</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function compareExpiry(left: string, right: string) {
  const leftTime = parseDateInput(left)?.getTime() ?? Number.NaN;
  const rightTime = parseDateInput(right)?.getTime() ?? Number.NaN;
  const leftValue = Number.isNaN(leftTime) ? Number.MAX_SAFE_INTEGER : leftTime;
  const rightValue = Number.isNaN(rightTime) ? Number.MAX_SAFE_INTEGER : rightTime;
  return leftValue - rightValue;
}

function parseAlertPreferences(stored: string | null): AlertPreferences {
  if (!stored) return EMPTY_PREFERENCES;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_PREFERENCES;
    const source = parsed as Partial<AlertPreferences>;
    const stringArray = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string')
        : [];
    const stringMap = (value: unknown): Record<string, string> => {
      if (typeof value !== 'object' || value === null) return {};
      return Object.fromEntries(
        Object.entries(value).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      );
    };
    const numberMap = (value: unknown): Record<string, number> => {
      if (typeof value !== 'object' || value === null) return {};
      return Object.fromEntries(
        Object.entries(value).filter(
          (entry): entry is [string, number] =>
            typeof entry[1] === 'number' && Number.isFinite(entry[1]),
        ),
      );
    };
    return {
      archivedIds: stringArray(source.archivedIds),
      deletedIds: stringArray(source.deletedIds),
      expiryOverrides: stringMap(source.expiryOverrides),
      snoozedUntil: numberMap(source.snoozedUntil),
    };
  } catch {
    return EMPTY_PREFERENCES;
  }
}

function parseDateInput(value: string): Date | null {
  const input = value.trim();
  if (!input) return null;

  const numeric = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(input);
  if (numeric) {
    const month = Number(numeric[1]);
    const day = Number(numeric[2]);
    const year = Number(numeric[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) return null;
  const parsed = new Date(timestamp);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function formatDateInput(value: string): string {
  const date = parseDateInput(value);
  if (!date) return '';
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(
    date.getDate(),
  ).padStart(2, '0')}/${date.getFullYear()}`;
}

function formatLongDate(value: Date): string {
  return value.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function medicineMatchesUrgency(
  medicine: MedicineItem,
  urgency: UrgencyFilter,
  fromValue: string,
  toValue: string,
): boolean {
  if (!urgency) return true;
  const expiry = parseDateInput(medicine.expiryDate);
  if (!expiry) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryTime = expiry.getTime();
  const todayTime = today.getTime();

  if (urgency === 'Expired') return expiryTime < todayTime;
  if (urgency === '7 days') return expiryTime >= todayTime && expiryTime <= todayTime + 7 * DAY_MS;
  if (urgency === '30 days') return expiryTime >= todayTime && expiryTime <= todayTime + 30 * DAY_MS;

  const from = parseDateInput(fromValue);
  const to = parseDateInput(toValue);
  return Boolean(from && to && expiryTime >= from.getTime() && expiryTime <= to.getTime());
}

function getStatusFromExpiry(expiryDate: string): MedicineStatus {
  if (!expiryDate.trim()) return 'Needs Verification';
  const expiry = parseDateInput(expiryDate);
  if (!expiry) return 'Needs Verification';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = (expiry.getTime() - today.getTime()) / DAY_MS;
  if (daysRemaining < 0) return 'Expired';
  if (daysRemaining <= 60) return 'Expiring';
  return 'Verified';
}

function expiryCaption(medicine: MedicineItem) {
  return medicine.status === 'Expired'
    ? `Expired on ${medicine.expiryDate}`
    : `Expires in ${medicine.expiryDate}`;
}

function filterIcon(filter: Exclude<FilterStatus, 'All'>): React.ComponentProps<typeof Ionicons>['name'] {
  if (filter === 'Needs Verification') return 'alert-circle-outline';
  if (filter === 'Expired') return 'ban-outline';
  return 'calendar-outline';
}

function filterColor(filter: Exclude<FilterStatus, 'All'>, colors: ReturnType<typeof useColors>) {
  if (filter === 'Needs Verification') return colors.expiringForeground;
  if (filter === 'Expired') return colors.expiredForeground;
  return colors.totalForeground;
}

function statusColor(status: MedicineStatus, colors: ReturnType<typeof useColors>) {
  if (status === 'Expired') return colors.expiredForeground;
  if (status === 'Expiring' || status === 'Needs Verification') return colors.expiringForeground;
  return colors.todayForeground;
}

function expiryColor(status: MedicineStatus, colors: ReturnType<typeof useColors>) {
  return status === 'Expired' ? colors.expiredForeground : colors.expiringForeground;
}

function productIcon(category: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (category.toLowerCase().includes('syrup')) return 'flask-outline';
  if (category.toLowerCase().includes('capsule')) return 'medical-outline';
  return 'medkit-outline';
}

function productTint(index: number, colors: ReturnType<typeof useColors>) {
  const tints = [colors.totalForeground, colors.primary, colors.expiringForeground, colors.todayForeground];
  return tints[index % tints.length];
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    height: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSide: { width: 36, alignItems: 'flex-start', justifyContent: 'center' },
  moreButton: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 13,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    height: 43,
    borderWidth: 1,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: 12 },
  filterButton: {
    width: 34,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 5,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipScroll: { flexGrow: 0, marginTop: 10 },
  chipRow: { paddingHorizontal: 18, gap: 6, alignItems: 'center' },
  filterChip: {
    height: 26,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  filterChipText: { fontSize: 9, fontWeight: '700' },
  filterCount: { fontSize: 9, fontWeight: '700' },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 11,
    paddingBottom: 7,
  },
  listTitle: { fontSize: 15, fontWeight: '700' },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 3 },
  sortText: { fontSize: 11, fontWeight: '600' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingBottom: 14, gap: 7 },
  medicineRow: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  medicineMain: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  productImage: {
    width: 50,
    height: 46,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  productStripe: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, opacity: 0.7 },
  medicineCopy: { flex: 1, minWidth: 0 },
  medicineName: { fontSize: 11, fontWeight: '700' },
  medicineCategory: { fontSize: 10, marginTop: 2 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  expiryText: { flex: 1, fontSize: 9, fontWeight: '500' },
  rowMore: { width: 24, height: 34, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 1 },
  listBottomSpace: { height: 5 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 13 },
  emptyCopy: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 6 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 18, padding: 9, borderRadius: 8 },
  errorText: { flex: 1, fontSize: 10, lineHeight: 15 },
  modalRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
    paddingHorizontal: 19,
    paddingTop: 10,
  },
  handle: { width: 35, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  sheetBody: { flexShrink: 1 },
  sheetBodyContent: { paddingBottom: 4 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 12, fontWeight: '700' },
  sectionHint: { fontSize: 10 },
  choiceChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  choiceChip: {
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  choiceChipText: { fontSize: 10, fontWeight: '600' },
  sectionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginBottom: 12,
  },
  dateRangeFields: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dateInputGroup: { flex: 1, minWidth: 0 },
  dateInputLabel: { fontSize: 10, marginBottom: 5 },
  dateInput: {
    minHeight: 39,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateInputText: { flex: 1, minWidth: 0, paddingVertical: 0, fontSize: 10 },
  validationError: { fontSize: 10, marginTop: 8 },
  sheetFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  resetButton: {
    width: 105,
    height: 43,
    borderWidth: 1,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resetText: { fontSize: 11, fontWeight: '600' },
  sheetLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.7, marginTop: 8, marginBottom: 7 },
  sheetOptions: { gap: 6 },
  sheetOption: {
    height: 41,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetOptionText: { fontSize: 11, fontWeight: '600', flex: 1, marginLeft: 8 },
  sortOptions: { flexDirection: 'row', gap: 8 },
  sortOption: {
    flex: 1,
    minHeight: 39,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  directionButton: { height: 38, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, marginTop: 9 },
  directionText: { fontSize: 10, fontWeight: '600' },
  applyButton: { flex: 1, height: 43, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 12, fontWeight: '700' },
  editSheet: { paddingTop: 10 },
  editMedicineName: { fontSize: 11, marginTop: -6, marginBottom: 14 },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 17 },
  editCancelButton: { flex: 1, width: undefined },
  confirmModalRoot: { justifyContent: 'center', paddingHorizontal: 20 },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  confirmCopy: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  optionsCard: { width: '88%', maxWidth: 360, borderRadius: 15, padding: 16, gap: 9 },
  quickOption: { minHeight: 41, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 5 },
  cancelButton: { minHeight: 39, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  cancelText: { fontSize: 11, fontWeight: '600' },
  detailsCard: { width: '90%', maxWidth: 370, borderRadius: 15, padding: 17 },
  detailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  detailsIcon: { width: 49, height: 49, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  detailsCopy: { flex: 1 },
  detailsName: { fontSize: 14, fontWeight: '700' },
  detailsCategory: { fontSize: 11, marginTop: 4 },
  detailLine: { minHeight: 39, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailLabel: { fontSize: 11 },
  detailValue: { fontSize: 11, fontWeight: '600' },
});
