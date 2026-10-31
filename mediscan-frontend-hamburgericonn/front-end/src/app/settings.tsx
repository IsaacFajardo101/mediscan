import SettingsContent from '@/components/SettingsContent';
import { useMenu } from '@/components/MenuContext';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const router = useRouter();
  const { openMenu } = useMenu();

  return (
    <SettingsContent
      onBack={() => {
        router.back();
        openMenu(); // back arrow returns to the hamburger menu
      }}
    />
  );
}