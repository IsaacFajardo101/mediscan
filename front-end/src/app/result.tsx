import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MedicineAddedModal from '@/components/MedicineAddedModal';
import MedicineInfoCard from '@/components/MedicineInfoCard';
import PossibleMatches from '@/components/PossibleMatches';
import ScanActions from '@/components/ScanActions';
import VerificationBanner from '@/components/VerificationBanner';
import { Colors, Spacing, Type } from '@/constants/display';
import { findPossibleMatch, isScanState, mockScanResults } from '@/data/mockScanResults';

// Colors used only by this Figma frame that are not in the display.ts tokens yet.
const CategoryText = '#938B8B';
const EmptyText = '#B9B9B9';

// Scan Result screen. The header comes from AppHeader via app/_layout.tsx.
// While there is no real scan data, pick the state with /result?state=verified | needs_verification | no_results
export default function ResultScreen() {
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const result = mockScanResults[isScanState(state) ? state : 'verified'];

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
              <Image source={result.medicine.image} style={styles.medicineImage} contentFit="contain" />
              <View style={styles.labelText}>
                <Text style={styles.medicineName}>{result.medicine.name}</Text>
                <Text style={styles.medicineCategory}>{result.medicine.category}</Text>
              </View>
            </View>
            <MedicineInfoCard rows={result.info} />
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
        // TODO: onViewDetails -> medicine details screen
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
  medicineImage: { width: 114, height: 120 },
  labelText: { flex: 1, gap: Spacing.sm },
  medicineName: { ...Type.h3, color: Colors.textPrimary },
  medicineCategory: { ...Type.body, color: CategoryText },

  empty: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  emptyText: { ...Type.label, lineHeight: 30, color: EmptyText },
});
