import AddMenu from '@/components/AddMenu';
import AppHeader from '@/components/AppHeader';
import LogoutDialog from '@/components/LogoutDialog';
import { MenuProvider } from '@/components/MenuContext';
import SideMenu from '@/components/SideMenu';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProfileProvider } from '../context/ProfileContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MenuProvider>
        <ProfileProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Main app (bottom bar + top bar) */}
            <Stack.Screen name="(tabs)" />

            {/* Full screens with a back arrow (no bottom bar) */}
            <Stack.Screen
              name="notifications"
              options={{ headerShown: true, header: () => <AppHeader title="Notifications" back /> }}
            />
            <Stack.Screen
              name="manual-entry"
              options={{ headerShown: true, header: () => <AppHeader title="Add Medicine" back /> }}
            />

            {/* Sign-in flow (no header, no bottom bar) */}
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="verify-code" />
            <Stack.Screen name="choose-profile" />

            {/* Bottom sheets */}
            <Stack.Screen
              name="vault-filters"
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
          </Stack>

          {/* Popups that sit on top of everything */}
          <SideMenu />
          <AddMenu />
          <LogoutDialog />
        </ProfileProvider>
      </MenuProvider>
    </SafeAreaProvider>
  );
}