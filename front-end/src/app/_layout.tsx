import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import { MenuProvider } from '@/components/MenuContext';
import AddMenu from '@/components/AddMenu';
import LogoutDialog from '@/components/LogoutDialog';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MenuProvider>
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

          {/* Bottom sheets: slide up over the screen behind them */}
          <Stack.Screen
            name="choose-account"
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="vault-filters"
            options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
          />
        </Stack>

        {/* Popups that sit on top of everything */}
        <AddMenu />
        <LogoutDialog />
      </MenuProvider>
    </SafeAreaProvider>
  );
}