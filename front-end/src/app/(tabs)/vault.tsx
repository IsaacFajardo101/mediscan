import MedicineList from '@/components/medicine/MedicineList';
import { useVault } from '@/services/vaultStore';

// Medicine Vault tab. The header ("Medicine Vault" + burger + bell) comes from (tabs)/_layout.tsx.
// All medicines of the account are shown (medicines are per account, not per profile).
export default function VaultScreen() {
  const { ready, medicines } = useVault();
  return <MedicineList scope="vault" medicines={medicines} ready={ready} />;
}
