import MedicineList from '@/components/medicine/MedicineList';
import { useVault } from '@/services/vaultStore';
import { useLocalSearchParams } from 'expo-router';

export default function VaultScreen() {
  const { ready, medicines } = useVault();
  const { filter } = useLocalSearchParams<{ filter?: string }>();

  return (
    <MedicineList
      scope="vault"
      medicines={medicines}
      ready={ready}
      initialFilter={filter}
    />
  );
}