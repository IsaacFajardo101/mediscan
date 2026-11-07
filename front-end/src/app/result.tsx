import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MedicineAddedModal from '@/components/MedicineAddedModal';
import MedicineIcon from '@/components/medicine/MedicineIcon';
import MedicineInfoCard from '@/components/MedicineInfoCard';
import PossibleMatches from '@/components/PossibleMatches';
import ScanActions from '@/components/ScanActions';
import VerificationBanner from '@/components/VerificationBanner';
import { Colors, Spacing, Type } from '@/constants/display';
import { findPossibleMatch, fromOcrResponse, isScanState, mockScanResults, VERIFIED_VAULT_ID, type ScanResult } from '@/data/mockScanResults';
import { useVaultMedicine } from '@/services/vaultStore';
import { formatLongDate, getMedicineForm } from '@/utils/medicine';

// Colors used only by this Figma frame that are not in the display.ts tokens yet.
const CategoryText = '#938B8B';
const EmptyText = '#B9B9B9';

// Scan Result screen. The header comes from AppHeader via app/_layout.tsx.
// While there is no real scan data, pick the state with /result?state=verified | needs_verification | no_results
export default function ResultScreen() {
  const router = useRouter();
  const { state, scan } = useLocalSearchParams<{ state?: string; scan?: string }>();
  let result: ScanResult = mockScanResults[isScanState(state) ? state : 'verified'];
  if (scan) {
    try {
      result = fromOcrResponse(JSON.parse(scan));
    } catch {
      result = mockScanResults[isScanState(state) ? state : 'verified'];
    }
  }

  // Needs Verification: at most one possible match is selected. Tapping the selected one again deselects it.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // TODO: actually save the medicine to the vault. For now Save to Vault only shows the Medicine Added overlay.
  const [addedOpen, setAddedOpen] = useState(false);
  const savedName =
    result.status === 'verified' ? result.medicine.name : findPossibleMatch(selectedId ?? undefined)?.name ?? '';
  const goToVault = () => {
    setAddedOpen(false);
    router.navigate('/vault');
  };

  // TEMP: the verified mock is the same medicine as the mock vault's Heparin Leo 5,000 IU/mL, so View
  // Medicine Details opens it on the Medicine Details screen (/medicine/[id]). Its expiry date comes from
  // the vault entry (the mock vault sets it relative to the day it was first created). Replace this with the
  // scanned medicine once the real scan data is wired (MedicineDetails also has mode="preview" for that).
  const { medicine: vaultMatch } = useVaultMedicine(VERIFIED_VAULT_ID);
  const viewDetails = () => router.push({ pathname: '/medicine/[id]', params: { id: VERIFIED_VAULT_ID } });
  const verifiedInfo =
    result.status === 'verified'
      ? result.info.map((row) =>
          row.label === 'Expiry Date' && vaultMatch?.vault_expiry_date
            ? { ...row, value: formatLongDate(vaultMatch.vault_expiry_date) }
            : row,
        )
      : [];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {result.status === 'verified' && (
          <>
            <VerificationBanner
              status="verified"
              title="Verified Medicine"
              subtitle="High confidence match"
              confidence={result.confidence}
            />
            <View style={styles.label}>
              <MedicineIcon form={getMedicineForm(result.medicine.form)} size={96} />
              <View style={styles.labelText}>
                <Text style={styles.medicineName}>{result.medicine.name}</Text>
                <Text style={styles.medicineCategory}>{result.medicine.category}</Text>
              </View>
            </View>
            <MedicineInfoCard rows={verifiedInfo} />
          </>
        )}

        {result.status === 'needs_verification' && (
          <>
            <VerificationBanner
              status="needs_verification"
              title="Needs Verification"
              subtitle="Moderate confidence match"
              confidence={result.confidence}
            />
            <PossibleMatches
              matches={result.matches}
              selectedId={selectedId}
              onSelect={(m) => setSelectedId((prev) => (prev === m.id ? null : m.id))}
            />
          </>
        )}

        {result.status === 'no_results' && (
          <>
            <VerificationBanner status="no_results" title="No Results" />
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No results found...</Text>
            </View>
          </>
        )}
      </ScrollView>

      <ScanActions
        status={result.status}
        hasSelection={selectedId !== null}
        onRedoScan={() => router.replace('/camera')}
        onSave={() => setAddedOpen(true)}
        onEdit={() => router.push({ pathname: '/edit-medicine', params: { id: selectedId } })}
        onViewDetails={viewDetails}
      />

      <MedicineAddedModal
        visible={addedOpen}
        medicineName={savedName}
        onViewVault={goToVault}
        onClose={() => setAddedOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surfacePrimary },
  content: { padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },

  label: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.sm },
  labelText: { flex: 1, gap: Spacing.sm },
  medicineName: { ...Type.h3, color: Colors.textPrimary },
  medicineCategory: { ...Type.body, color: CategoryText },

  empty: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...Type.label, lineHeight: 30, color: EmptyText },
});
