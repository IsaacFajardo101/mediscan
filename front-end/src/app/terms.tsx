import { useRouter } from 'expo-router';
import TermsMedicalDisclaimerContent from '@/components/TermsMedicalDisclaimerContent';
import { useMenu } from '@/components/MenuContext';

export default function TermsScreen() {
  const router = useRouter();
  const { openMenu } = useMenu();

  return (
    <TermsMedicalDisclaimerContent
      onBack={() => {
        router.back();
        openMenu(); // back arrow returns to the hamburger menu, like Settings
      }}
    />
  );
}