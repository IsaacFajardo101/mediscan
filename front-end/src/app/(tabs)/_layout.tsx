import AddTabButton from '@/components/AddTabButton';
import AppHeader from '@/components/AppHeader';
import ReminderIcon from '@/components/ReminderIcon';
import { Colors } from '@/constants/display';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

// ito yung tab bar layout na ginagamit sa buong app. It defines the bottom bar tabs, their icons, and the header for each screen.
const icons = {
  home: (c: any) => <Ionicons name="home-outline" size={24} color={c} />,
  vault: (c: any) => <Ionicons name="shield-outline" size={24} color={c} />,
  add: (c: any) => <Ionicons name="add" size={24} color={c} />,
  reminders: (c: any) => <ReminderIcon size={24} color={c} />,
  profiles: (c: any) => <Ionicons name="person-outline" size={24} color={c} />,
};

// Header title per tab. You can add/remove tabs here when updating the UI.
const tab = (title: string, icon: (c: any) => any, showLogo = false) => ({
  title,
  header: () => <AppHeader title={title} showLogo={showLogo} />,
  tabBarIcon: ({ color }: { color: any }) => icon(color),
});

// Screens opened from the burger menu / Settings. They are NOT in the bottom bar
// They are hidden from the bottom bar, but they still have a header with a back button.
const hidden = (title: string) => ({
  title,
  href: null,
  header: () => <AppHeader title={title} back />,
});

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        tabBarActiveTintColor: Colors.active,
        tabBarInactiveTintColor: Colors.text,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { height: 64, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border },
      }}
    >
      {/* Bottom bar */}
      <Tabs.Screen name="index" options={{ ...tab('MediScan', icons.home, true), tabBarLabel: 'Home' }} />
      <Tabs.Screen name="vault" options={{ ...tab('Medicine Vault', icons.vault), tabBarLabel: 'Vault' }} />
      <Tabs.Screen
        name="camera"
        options={{
          ...tab('Scan Medicine', icons.add),
          tabBarLabel: '',
          tabBarButton: () => <AddTabButton />,
          // Camera screen only: full screen, no header and no bottom bar
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen name="reminders" options={{ ...tab('Reminders', icons.reminders) }} />
      <Tabs.Screen name="profiles" options={{ ...tab('Family Profile', icons.profiles), tabBarLabel: 'Profiles' }} />

      {/* Burger menu screens (hidden from the bottom bar) */}
      <Tabs.Screen name="settings" options={hidden('Settings')} />
      <Tabs.Screen name="terms" options={hidden('Terms & Medical Disclaimer')} />
      <Tabs.Screen name="profile" options={hidden('Profile')} />

      {/* Settings screens (hidden from the bottom bar) */}
      <Tabs.Screen name="appearance" options={hidden('Appearance')} />
      <Tabs.Screen name="language" options={hidden('Language')} />
      <Tabs.Screen name="notification-settings" options={hidden('Notifications')} />
      <Tabs.Screen name="privacy" options={hidden('Privacy')} />
      <Tabs.Screen name="help-support" options={hidden('Help & Support')} />
      <Tabs.Screen name="about" options={hidden('About MediScan')} />
    </Tabs>
  );
}