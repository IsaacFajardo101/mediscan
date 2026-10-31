import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppHeader from '@/components/AppHeader';
import MedicineDetails from '@/components/medicine/MedicineDetails';
import { Colors, Components, Spacing, Type } from '@/constants/display';
import { useVaultMedicine } from '@/services/vaultStore';

// Medicine Details for a medicine already in the vault.
// Open it with: router.push({ pathname: '/medicine/[id]', params: { id: medicine.vault_id } })
export default function MedicineDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, medicine } = useVaultMedicine(id);
  const router = useRouter();

  return (
    <View style={styles.root}>
      <AppHeader title="Medicine Details" back />
      {!ready ? (
        <View style={styles.center}><ActivityIndicator color={Colors.actionPrimary} /></View>
      ) : !medicine ? (
        <View style={styles.center}>
          <Text style={styles.msg}>This medicine is no longer in your vault.</Text>
          <Pressable style={[Components.buttonSecondary, { marginTop: Spacing.md }]} onPress={() => router.back()}>
            <Text style={Components.buttonSecondaryText}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <MedicineDetails mode="saved" medicine={medicine} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfacePrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  msg: { ...Type.body, color: Colors.textSecondary, textAlign: 'center' },
});
