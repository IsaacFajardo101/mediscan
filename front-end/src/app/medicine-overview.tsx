import { StyleSheet, View } from 'react-native';
import AppHeader from '@/components/AppHeader';
import MedicineList from '@/components/medicine/MedicineList';
import { Colors } from '@/constants/display';
import { firstName, useCurrentProfile } from '@/services/profileReminders';
import { useVault } from '@/services/vaultStore';

// Home > Medicine Overview > "View All" (Figma: "Maria's Medicine").
// Shows all medicines of the account; the title follows the selected profile.
// Tapping an overview card on Home opens this already filtered (e.g. Verified).
export default function MedicineOverviewScreen() {
  const { ready, medicines } = useVault();
  const profile = useCurrentProfile();
  const title = profile ? `${firstName(profile)}'s Medicine` : 'All Medicines';

  return (
    <View style={styles.root}>
      <AppHeader title={title} back />
      <MedicineList scope="overview" medicines={medicines} ready={ready} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surfacePrimary },
});
