import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MedicineIcon from '@/components/medicine/MedicineIcon';
import ScanCard from '@/components/medicine/ScanCard';
import { Colors, Components, Radius, Spacing, Type } from '@/constants/display';
import { useFirstLaunchPermissions } from '@/hooks/useFirstLaunchPermissions';
import { resetListQuery } from '@/services/listQueryStore';
import {
  firstName, getUpcomingReminders, useLoggedInProfile, useSavedReminders,
} from '@/services/profileReminders';
import { useVault } from '@/services/vaultStore';
import type { StatusFilter, UrgencyFilter, VaultMedicine } from '@/types/medicine';
import { getMedicineForm, overviewCounts } from '@/utils/medicine';

// Home (Figma: Home Page). The top bar (burger + MediScan logo + bell) comes from
// (tabs)/_layout.tsx, so this screen does NOT draw its own header.
export default function HomeScreen() {
  useFirstLaunchPermissions();
  const router = useRouter();
  const { ready, medicines } = useVault();
  const profile = useLoggedInProfile(); // the profile picked on Choose Profile
  const name = firstName(profile);
  const savedReminders = useSavedReminders();

  const counts = useMemo(() => overviewCounts(medicines), [medicines]);
  const recent = useMemo(
    () => [...medicines].sort((a, b) => b.vault_saved_at.localeCompare(a.vault_saved_at)).slice(0, 3),
    [medicines],
  );
  const reminders = useMemo(
    () => getUpcomingReminders(savedReminders, profile).slice(0, 3),
    [savedReminders, profile],
  );

  const openDetails = (m: VaultMedicine) =>
    router.push({ pathname: '/medicine/[id]', params: { id: m.vault_id } });

  // Medicine Overview cards -> the Vault tab (there is no separate per-profile vault).
  // Total = whole vault; the other cards open the Vault already filtered to match the card.
  const openVault = (status: StatusFilter = 'all', urgency: UrgencyFilter = 'none') => {
    resetListQuery('vault', { status, urgency });
    router.navigate('/vault');
  };

  // Upcoming Reminders -> Reminders tab, filtered to the logged-in profile.
  // With reminderId, the Reminders tab opens that reminder's details right away.
  const member = profile?.profile_display_name ?? '';
  const openReminders = (reminderId?: string) =>
    router.navigate({
      pathname: '/reminders',
      params: reminderId ? { member, reminderId, from: 'home' } : { member },
    });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Greeting */}
      <LinearGradient
        colors={[Colors.surfacePrimary, Colors.surfaceSecondary]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.greeting}
      >
        <Text style={styles.hello}>Hello, {name}! 👋</Text>
        <Text style={styles.sub}>Take care, stay safe.</Text>
      </LinearGradient>

      {/* Medicine Overview */}
      <SectionHeader title="Medicine Overview" />
      {!ready ? (
        <ActivityIndicator color={Colors.actionPrimary} style={{ marginVertical: Spacing.lg }} />
      ) : (
        <View style={styles.stats}>
          <StatCard
            icon={<MaterialCommunityIcons name="pill" size={26} color={Colors.textSecondary} />}
            value={counts.total} label="Total Medicines" onPress={() => openVault()}
          />
          <StatCard
            icon={<Ionicons name="shield-checkmark" size={26} color={Colors.statusSuccess} />}
            value={counts.verified} label="Verified" onPress={() => openVault('verified')}
          />
          <StatCard
            icon={<Ionicons name="warning" size={26} color={Colors.statusWarning} />}
            value={counts.needsVerification} label="Needs Verification" onPress={() => openVault('needs_verification')}
          />
          <StatCard
            icon={<Ionicons name="time" size={26} color={Colors.statusDanger} />}
            value={counts.expiring} label="Expiring" onPress={() => openVault('all', 'within30')}
          />
        </View>
      )}

      {/* Recent Scans */}
      <SectionHeader title="Recent Scans" onViewAll={() => router.push('/recent-scans')} />
      {ready && recent.length === 0 ? (
        <EmptyLine text="No medicines yet. Tap + to scan your first one." />
      ) : (
        <View style={styles.list}>
          {recent.map((m) => <ScanCard key={m.vault_id} medicine={m} onPress={openDetails} />)}
        </View>
      )}

      {/* Upcoming Reminders (for the logged-in profile) */}
      <SectionHeader title="Upcoming Reminders" onViewAll={() => openReminders()} />
      {reminders.length === 0 ? (
        <EmptyLine text={`No upcoming reminders for ${name}.`} />
      ) : (
        <View style={styles.list}>
          {reminders.map(({ reminder, label }) => (
            <Pressable
              key={reminder.id}
              style={({ pressed }) => [Components.medicineCard, styles.reminder, pressed && { opacity: 0.85 }]}
              onPress={() => openReminders(reminder.id)}
              accessibilityRole="button"
              accessibilityLabel={`${reminder.medicine}, ${label}. Open reminder details`}
            >
              <MedicineIcon form={getMedicineForm(reminder.category)} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.remName} numberOfLines={1}>{reminder.medicine}</Text>
                <Text style={styles.remSub} numberOfLines={1}>
                  {reminder.frequency}{reminder.instructions ? ` · ${reminder.instructions}` : ''}
                </Text>
              </View>
              <View style={styles.remTime}>
                <Ionicons name="alarm-outline" size={16} color={Colors.statusSuccess} />
                <Text style={styles.remTimeText}>{label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// "View All" only shows when onViewAll is given (Medicine Overview has none).
function SectionHeader({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{title}</Text>
      {onViewAll && (
        <Pressable onPress={onViewAll} hitSlop={10} accessibilityRole="button" accessibilityLabel={`View all ${title}`}>
          <Text style={styles.viewAll}>View All</Text>
        </Pressable>
      )}
    </View>
  );
}

function StatCard({ icon, value, label, onPress }: { icon: ReactNode; value: number; label: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [Components.statCard, styles.stat, pressed && { backgroundColor: Colors.surfaceSecondary }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
    >
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
    </Pressable>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfacePrimary },
  content: { paddingBottom: Spacing.xl * 2 },
  greeting: { paddingHorizontal: Spacing.md + 4, paddingVertical: Spacing.lg },
  hello: { ...Type.h1, color: Colors.textPrimary },
  sub: { ...Type.bodyLarge, fontWeight: '600', color: Colors.textPrimary },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md + 4, marginTop: Spacing.lg, marginBottom: Spacing.sm + 4,
  },
  section: { ...Type.h2, color: Colors.textPrimary },
  viewAll: { ...Type.label, color: Colors.textSecondary },
  stats: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md + 4 },
  stat: { flex: 1, gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.sm },
  statValue: { ...Type.h2, color: Colors.textPrimary },
  statLabel: { ...Type.caption, lineHeight: 18, color: Colors.textPrimary, textAlign: 'center' },
  list: { gap: Spacing.sm + 4, paddingHorizontal: Spacing.md + 4 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, padding: Spacing.sm + 4 },
  remName: { ...Type.label, color: Colors.textPrimary },
  remSub: { ...Type.caption, color: Colors.textSecondary },
  remTime: { alignItems: 'flex-end', gap: 2, maxWidth: '40%' },
  remTimeText: { ...Type.caption, color: Colors.textPrimary, textAlign: 'right' },
  empty: { ...Type.body, color: Colors.textSecondary, paddingHorizontal: Spacing.md + 4 },
});