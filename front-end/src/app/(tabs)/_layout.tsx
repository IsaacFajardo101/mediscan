import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import AddTabButton from '@/components/AddTabButton';
import AppHeader from '@/components/AppHeader';
import ReminderIcon from '@/components/ReminderIcon';
import { Colors } from '@/constants/display';
import { MockAuth } from '@/mock/mockAuth';
import { HeaderFilterProvider, useHeaderFilter } from '@/components/HeaderFilterContext';

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

// The ONE header for the reminders screen (back + title + filter + bell)
function RemindersHeader() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { onFilterPress } = useHeaderFilter();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/(tabs)' as never);
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: topInset,
          height: 52 + topInset,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        testID="reminders-back"
        onPress={goBack}
        hitSlop={10}
        style={styles.headerSide}
      >
        <Ionicons name="arrow-back" size={22} color={colors.foreground} />
      </Pressable>

      <Text style={[styles.headerTitle, { color: colors.foreground }]}>All Reminders</Text>

      <View style={styles.headerRight}>
        {onFilterPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter reminders by family member"
            testID="open-reminder-filter"
            onPress={onFilterPress}
            hitSlop={10}
          >
            <Ionicons name="filter-outline" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Upcoming alerts"
          testID="header-bell"
          onPress={() => router.push('/upcoming-alerts' as never)}
          hitSlop={10}
        >
          <Ionicons name="notifications-outline" size={21} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  // START SCREEN: hangga't walang naka-login + napiling profile, Log In muna (walang tabs/icons).
  if (!MockAuth.getActiveProfile()) return <Redirect href="/login" />;
  return (
    <HeaderFilterProvider>
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
        <Tabs.Screen
          name="reminders"
          options={{
            ...tab('Reminders', icons.reminders),
            tabBarLabel: 'Reminders',
            header: () => <RemindersHeader />,
          }}
        />
        <Tabs.Screen name="profiles" options={{ ...tab('Family Profile', icons.profiles), tabBarLabel: 'Profiles' }} />
      </Tabs>
    </HeaderFilterProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
  },
  headerSide: { width: 60, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  headerRight: {
    width: 60,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
});