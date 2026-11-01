import type { ImageSource } from 'expo-image';
import type { DimensionValue } from 'react-native';
import type { MedicineInfoRow } from '@/components/MedicineInfoCard';
import { Assets } from '@/constants/assets';
import multipleResponse from './response_2_multiple.json';
import emptyResponse from './response_3_empty.json';

// The three states of the Scan Result screen.
export type ScanState = 'verified' | 'needs_verification' | 'no_results';

// Photo of a possible match. `crop` mirrors how the Figma frame zooms into the image.
export type MatchImage = {
  source: ImageSource | number;
  width: number;
  height: number;
  crop?: { width: DimensionValue; height: DimensionValue; left: DimensionValue; top: DimensionValue };
};

export type PossibleMatch = {
  id: string;
  name: string;
  category: string;
  form: string;     // e.g. "Tablet", used to auto-fill Edit Medicine
  strength: string; // e.g. "500 mg"
  similarity: number; // 0-100
  image: MatchImage;
};

export type ScanResult =
  | {
      status: 'verified';
      confidence: number;
      medicine: { name: string; category: string; image: ImageSource | number };
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

// The API has no similarity score or photo yet, so these are mock values.
const MOCK_CONFIDENCE = 80;
const MOCK_SIMILARITIES = [80, 75, 70, 60];
const MOCK_IMAGES: MatchImage[] = [
  { source: Assets.meds.match1, width: 79, height: 79 },
  {
    source: Assets.meds.match2,
    width: 53,
    height: 72,
    crop: { width: '238.71%', height: '176.19%', left: '-18.57%', top: '-47%' },
  },
  {
    source: Assets.meds.match3,
    width: 93,
    height: 48,
    crop: { width: '202.56%', height: '395%', left: '-60.21%', top: '-210.18%' },
  },
  {
    source: Assets.meds.match4,
    width: 95,
    height: 54,
    crop: { width: '100%', height: '214.71%', left: '0.39%', top: '-114.3%' },
  },
];

// Converts a search response with 0 or many medicines into a ScanResult.
// TODO: the verified state (exactly one confident match) still comes from the mock below.
export function fromSearchResponse(res: ApiResponse): ScanResult {
  if (res.data.length === 0) return { status: 'no_results' };

  const matches = res.data.slice(0, MOCK_IMAGES.length).map((m, i) => ({
    id: m.fda_approval_id,
    name: `${m.fda_brandname} ${m.fda_dosage_strength}`,
    category: m.fda_genericname,
    form: m.fda_dosage_form,
    strength: m.fda_dosage_strength,
    similarity: MOCK_SIMILARITIES[i],
    image: MOCK_IMAGES[i],
  }));
  return { status: 'needs_verification', confidence: MOCK_CONFIDENCE, matches };
}

export const mockScanResults: Record<ScanState, ScanResult> = {
  verified: {
    status: 'verified',
    confidence: 80,
    medicine: {
      name: 'Paracetamol 500mg Tablet',
      category: 'Pain Reliever / Flu Reliever',
      image: Assets.meds.decolgen,
    },
    info: [
      { icon: Assets.icons.manufacturer, label: 'Manufacturer', value: 'ABC Pharma' },
      { icon: Assets.icons.expiryDate, label: 'Expiry Date', value: 'May 19, 2030' },
      { icon: Assets.icons.batchNumber, label: 'Batch Number', value: '1876920' },
      { icon: Assets.icons.medicineType, label: 'Medicine Type', value: 'Tablet' },
      { icon: Assets.icons.strength, label: 'Strength', value: '500mg' },
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
