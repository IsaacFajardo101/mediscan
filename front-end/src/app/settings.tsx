
import SettingsContent from '@/components/SettingsContent';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  console.log('SETTINGS SCREEN RENDERED');

  const router = useRouter();

  return (
    <SettingsContent onBack={() => router.back()} />
  );
}
