import { api } from './api';

export type OcrMedicine = {
  fda_id: number;
  fda_approval_id: string;
  fda_registration_id: string;
  fda_brandname: string | null;
  fda_genericname: string;
  fda_dosage_form: string | null;
  fda_dosage_strength: string | null;
  fda_manufacturer: string | null;
  fda_pharmacologic_category: string | null;
  fda_classification: string | null;
  confidence_percentage: number;
  confidence_level: 'max' | 'high' | 'medium' | 'low';
  accuracy_guidance: string;
};

export type OcrResponse = {
  success: boolean;
  code: number;
  message: string;
  entities: {
    medicine_name: string | null;
    dosage: string | null;
    frequency: string | null;
    expiry_date: string | null;
  };
  suggested_medicines: OcrMedicine[];
};

export async function scanLabel(uri: string): Promise<OcrResponse> {
  const body = new FormData();
  body.append('file', {
    uri,
    name: 'medicine-label.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  return api.request<OcrResponse>('/ocr/extract-label', {
    method: 'POST',
    body,
  });
}
