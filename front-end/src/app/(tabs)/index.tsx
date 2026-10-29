// Home (Figma: Home Page). The top bar (burger + MediScan logo + bell) comes from
// (tabs)/_layout.tsx, so this screen does NOT draw its own header (that was the "duplicated header").
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
import { firstName, getUpcomingReminders, useCurrentProfile } from '@/services/profileReminders';
import { useVault } from '@/services/vaultStore';
import type { StatusFilter, UrgencyFilter, VaultMedicine } from '@/types/medicine';
import { getMedicineForm, medicineName, overviewCounts } from '@/utils/medicine';

export default function HomeScreen() {
  useFirstLaunchPermissions();
  const router = useRouter();
  const { ready, medicines } = useVault();
  const profile = useCurrentProfile();
  const name = firstName(profile);

  const counts = useMemo(() => overviewCounts(medicines), [medicines]);
  const recent = useMemo(
    () => [...medicines].sort((a, b) => b.vault_saved_at.localeCompare(a.vault_saved_at)).slice(0, 3),
    [medicines],
  );
  const reminders = useMemo(
    () => getUpcomingReminders(profile?.profile_id ?? null, medicines).slice(0, 3),
    [profile, medicines],
  );

  const openDetails = (m: VaultMedicine) =>
    router.push({ pathname: '/medicine/[id]', params: { id: m.vault_id } });

  // Medicine Overview -> "<Name>'s Medicine" list, optionally pre-filtered by the tapped card
  const openOverview = (status: StatusFilter = 'all', urgency: UrgencyFilter = 'none') => {
    resetListQuery('overview', { status, urgency });
    router.push('/medicine-overview');
  };

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
      <SectionHeader title="Medicine Overview" onViewAll={() => openOverview()} />
      {!ready ? (
        <ActivityIndicator color={Colors.actionPrimary} style={{ marginVertical: Spacing.lg }} />
      ) : (
        <View style={styles.stats}>
          <StatCard
            icon={<MaterialCommunityIcons name="pill" size={26} color={Colors.textSecondary} />}
            value={counts.total} label="Total Medicines" onPress={() => openOverview()}
          />
          <StatCard
            icon={<Ionicons name="shield-checkmark" size={26} color={Colors.statusSuccess} />}
            value={counts.verified} label="Verified" onPress={() => openOverview('verified')}
          />
          <StatCard
            icon={<Ionicons name="warning" size={26} color={Colors.statusWarning} />}
            value={counts.needsVerification} label="Needs Verification" onPress={() => openOverview('needs_verification')}
          />
          <StatCard
            icon={<Ionicons name="time" size={26} color={Colors.statusDanger} />}
            value={counts.expiring} label="Expiring" onPress={() => openOverview('all', 'within30')}
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

      {/* Upcoming Reminders (for the selected profile) */}
      <SectionHeader title="Upcoming Reminders" onViewAll={() => router.navigate('/reminders')} />
      {reminders.length === 0 ? (
        <EmptyLine text={`No upcoming reminders for ${name}.`} />
      ) : (
        <View style={styles.list}>
          {reminders.map((r) => (
            <Pressable
              key={r.schedule.schedule_id}
              style={({ pressed }) => [Components.medicineCard, styles.reminder, pressed && { opacity: 0.85 }]}
              onPress={() => router.navigate('/reminders')}
              accessibilityRole="button"
            >
              <MedicineIcon form={getMedicineForm(r.medicine?.fda_dosage_form)} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.remName} numberOfLines={1}>
                  {r.medicine ? medicineName(r.medicine) : r.schedule.fda_registration_id}
                </Text>
                <Text style={styles.remSub} numberOfLines={1}>
                  {r.schedule.sched_frequency_type}{r.schedule.sched_notes ? ` · ${r.schedule.sched_notes}` : ''}
                </Text>
              </View>
              <View style={styles.remTime}>
                <Ionicons name="alarm-outline" size={16} color={Colors.statusSuccess} />
                <Text style={styles.remTimeText}>{r.label}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function SectionHeader({ title, onViewAll }: { title: string; onViewAll: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{title}</Text>
      <Pressable onPress={onViewAll} hitSlop={10} accessibilityRole="button" accessibilityLabel={`View all ${title}`}>
        <Text style={styles.viewAll}>View All</Text>
      </Pressable>
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
