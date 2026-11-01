import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { MenuProvider } from '@/components/MenuContext';
import AddMenu from '@/components/AddMenu';
import LogoutDialog from '@/components/LogoutDialog';
import HamburgerMenu from '@/components/HamburgerMenu';
import { ProfileProvider } from '../context/ProfileContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MenuProvider>
        <ProfileProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Main app (bottom bar + top bar) */}
            <Stack.Screen name="(tabs)" />

            {/* Opened from the hamburger menu (back arrow returns to the menu) */}
            <Stack.Screen
              name="profile"
              options={{ headerShown: true, header: () => <AppHeader title="Profile" back backToMenu /> }}
            />

            {/* Full screens with a back arrow (no bottom bar) */}
            <Stack.Screen
              name="notifications"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="manual-entry"
              options={{ headerShown: true, header: () => <AppHeader title="Manual Entry" back /> }}
            />
            <Stack.Screen
              name="result"
              options={{ headerShown: true, header: () => <AppHeader title="Scan Result" back /> }}
            />
            <Stack.Screen
              name="edit-medicine"
              options={{ headerShown: true, header: () => <AppHeader title="Edit Medicine" back /> }}
            />

            {/* Sign-in flow (no header, no bottom bar) */}
            <Stack.Screen name="login" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="verify-code" />
            <Stack.Screen name="choose-profile" />
            <Stack.Screen name="create-profile" />

            {/* Bottom sheets: slide up over the screen behind them */}
            <Stack.Screen
              name="vault-filters"
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
          </Stack>

          {/* Popups that sit on top of everything */}
          <HamburgerMenu />
          <AddMenu />
          <LogoutDialog />
        </ProfileProvider>
      </MenuProvider>
    </SafeAreaProvider>
  );
}