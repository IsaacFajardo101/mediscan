import type { MedicineInfoRow } from '@/components/MedicineInfoCard';
import { Assets } from '@/constants/assets';
import multipleResponse from './response_2_multiple.json';
import emptyResponse from './response_3_empty.json';

// The three states of the Scan Result screen.
export type ScanState = 'verified' | 'needs_verification' | 'no_results';

export type PossibleMatch = {
  id: string;
  fdaId?: number;
  name: string;
  category: string;
  form: string;     // raw dosage form, e.g. "Film-Coated Tablet": shown as an icon and used to auto-fill Edit Medicine
  strength: string; // e.g. "500 mg"
  similarity: number; // 0-100
};

export type ScanResult =
  | {
      status: 'verified';
      confidence: number;
      medicine: { name: string; category: string; form: string }; // form: raw dosage form, shown as an icon
      info: MedicineInfoRow[];
    }
  | { status: 'needs_verification'; confidence: number; matches: PossibleMatch[] }
  | { status: 'no_results' };

// Shape of the medicine search API (see response_2_multiple.json / response_3_empty.json).
type ApiMedicine = {
  fda_approval_id: string;
  fda_registration_id: string;
  fda_brandname: string;
  fda_genericname: string;
  fda_dosage_form: string;
  fda_dosage_strength: string;
  fda_manufacturer: string | null;
  fda_pharmacologic_category: string;
  fda_classification: string;
};
type ApiResponse = {
  header: { success: boolean; code: number; message: string };
  data: ApiMedicine[];
};

type OcrResponse = {
  entities: { expiry_date: string | null };
  suggested_medicines: Array<{
    fda_id: number;
    fda_approval_id: string;
    fda_brandname: string | null;
    fda_genericname: string;
    fda_dosage_form: string | null;
    fda_dosage_strength: string | null;
    fda_manufacturer: string | null;
    fda_pharmacologic_category: string | null;
    confidence_percentage: number;
  }>;
};

// The API has no similarity score yet, so these are mock values (one per shown match).
const MOCK_CONFIDENCE = 80;
const MOCK_SIMILARITIES = [80, 75, 70, 60];

// Converts a search response with 0 or many medicines into a ScanResult.
// TODO: the verified state (exactly one confident match) still comes from the mock below.
export function fromSearchResponse(res: ApiResponse): ScanResult {
  if (res.data.length === 0) return { status: 'no_results' };

  const matches = res.data.slice(0, MOCK_SIMILARITIES.length).map((m, i) => ({
    id: m.fda_approval_id,
    name: `${m.fda_brandname} ${m.fda_dosage_strength}`,
    category: m.fda_genericname,
    form: m.fda_dosage_form,
    strength: m.fda_dosage_strength,
    similarity: MOCK_SIMILARITIES[i],
  }));
  return { status: 'needs_verification', confidence: MOCK_CONFIDENCE, matches };
}

export function fromOcrResponse(res: OcrResponse): ScanResult {
  const [first, ...rest] = res.suggested_medicines;
  if (!first) return { status: 'no_results' };
  const name = `${first.fda_brandname || first.fda_genericname}${first.fda_dosage_strength ? ` ${first.fda_dosage_strength}` : ''}`;
  if (rest.length === 0 && first.confidence_percentage >= 95) {
    return {
      status: 'verified',
      confidence: first.confidence_percentage,
      medicine: { name, category: first.fda_genericname, form: first.fda_dosage_form ?? '' },
      info: [
        { icon: Assets.icons.manufacturer, label: 'Manufacturer', value: first.fda_manufacturer ?? 'Unknown' },
        { icon: Assets.icons.expiryDate, label: 'Expiry Date', value: res.entities.expiry_date ?? 'Not detected' },
        { icon: Assets.icons.medicineType, label: 'Medicine Type', value: first.fda_dosage_form ?? 'Unknown' },
        { icon: Assets.icons.strength, label: 'Strength', value: first.fda_dosage_strength ?? 'Unknown' },
      ],
    };
  }
  return {
    status: 'needs_verification',
    confidence: first.confidence_percentage,
    matches: [first, ...rest].slice(0, 4).map((medicine) => ({
      id: medicine.fda_approval_id,
      fdaId: medicine.fda_id,
      name: `${medicine.fda_brandname || medicine.fda_genericname}${medicine.fda_dosage_strength ? ` ${medicine.fda_dosage_strength}` : ''}`,
      category: medicine.fda_genericname,
      form: medicine.fda_dosage_form ?? '',
      strength: medicine.fda_dosage_strength ?? '',
      similarity: medicine.confidence_percentage,
    })),
  };
}

// The verified mock is "Heparin Leo 5,000 IU/mL" (FDA reg. BR-1005, first entry of response_2_multiple.json).
// This is the id of the same medicine in the mock vault (src/mock/index.ts: `mock-<fda_approval_id>`), so
// View Medicine Details opens the matching Medicine Details screen. Confidence (96) is the vault mock's value.
export const VERIFIED_VAULT_ID = 'mock-0f3b194307307840';

export const mockScanResults: Record<ScanState, ScanResult> = {
  verified: {
    status: 'verified',
    confidence: 96,
    medicine: {
      name: 'Heparin Leo 5,000 IU/mL',
      category: 'Heparin Sodium',
      form: 'Solution For Injection (IV/SC)',
    },
    info: [
      // Same values the Medicine Details screen shows. The mock data's manufacturer field is mis-mapped
      // (it holds a category), and there is no batch number in the data, so that row stays a sample value.
      { icon: Assets.icons.manufacturer, label: 'Manufacturer', value: 'Antithrombotic Agents' },
      // Fallback only: result.tsx shows the expiry date of the vault medicine when it is there.
      { icon: Assets.icons.expiryDate, label: 'Expiry Date', value: 'May 19, 2030' },
      { icon: Assets.icons.batchNumber, label: 'Batch Number', value: '1876920' },
      { icon: Assets.icons.medicineType, label: 'Medicine Type', value: 'Solution For Injection (IV/SC)' },
      { icon: Assets.icons.strength, label: 'Strength', value: '5,000 IU/mL' },
    ],
  },
  needs_verification: fromSearchResponse(multipleResponse as ApiResponse),
  no_results: fromSearchResponse(emptyResponse as ApiResponse),
};

// Finds a possible match by id (used by Edit Medicine until real scan data is passed around).
export function findPossibleMatch(id: string | undefined): PossibleMatch | undefined {
  const result = mockScanResults.needs_verification;
  if (result.status !== 'needs_verification') return undefined;
  return result.matches.find((m) => m.id === id);
}

export const isScanState = (value: unknown): value is ScanState =>
  value === 'verified' || value === 'needs_verification' || value === 'no_results';
