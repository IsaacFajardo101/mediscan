import { useRouter } from 'expo-router';
import TermsMedicalDisclaimerContent from '@/components/TermsMedicalDisclaimerContent';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <TermsMedicalDisclaimerContent
      onBack={() => router.back()}
    />
  );
}