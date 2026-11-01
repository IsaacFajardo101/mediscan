import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import AppHeader from '@/components/AppHeader';
import ScanCard from '@/components/medicine/ScanCard';
import { Colors, Spacing, Type } from '@/constants/display';
import { useVault } from '@/services/vaultStore';

// Home > Recent Scans > "View All" (Figma: Recent Scans). Newest first.
export default function RecentScansScreen() {
  const router = useRouter();
  const { ready, medicines } = useVault();
  const sorted = useMemo(
    () => [...medicines].sort((a, b) => b.vault_saved_at.localeCompare(a.vault_saved_at)),
    [medicines],
  );

  return (
    <View style={styles.root}>
      <AppHeader title="Recent Scans" back />
      {!ready ? (
        <ActivityIndicator color={Colors.actionPrimary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(m) => m.vault_id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm + 4 }} />}
          renderItem={({ item }) => (
            <ScanCard
              medicine={item}
              onPress={(m) => router.push({ pathname: '/medicine/[id]', params: { id: m.vault_id } })}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No scans yet. Tap + to scan your first medicine.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfacePrimary },
  list: { padding: Spacing.md + 4, paddingBottom: Spacing.xl * 2 },
  empty: { ...Type.body, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
});
