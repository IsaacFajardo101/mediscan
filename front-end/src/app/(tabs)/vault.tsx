import MedicineList from '@/components/medicine/MedicineList';
import { useVault } from '@/services/vaultStore';

export default function VaultScreen() {
  const { ready, medicines } = useVault();
  return <MedicineList scope="vault" medicines={medicines} ready={ready} />;
}