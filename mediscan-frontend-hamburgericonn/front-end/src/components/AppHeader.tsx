import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Type } from '@/constants/display';
import Logo from './Logo';
import { useMenu } from './MenuContext';

type Props = {
  title: string;
  showLogo?: boolean;    // Home screen and upper tabs: burger + logo (left) + bell (right)
  back?: boolean;        // Here yung back arrow, no bell, title centered. (for screens that are not the home screen)
  backToMenu?: boolean;  // Back arrow also reopens the hamburger menu (for screens opened from the menu)
};

// Itong AppHeader is the top bar of the app. It shows either yung logo or yung title, and either a back arrow or a burger menu.
export default function AppHeader({ title, showLogo, back, backToMenu }: Props) {
  const router = useRouter();
  const { openMenu } = useMenu();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate('/' as any);
    if (backToMenu) openMenu(); // return to the hamburger menu
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        {/* ito yung left side: back arrow or burger menu */}
        {back ? (
          <Pressable
            style={styles.side}
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={26} color={Colors.text} />
          </Pressable>
        ) : (
          <Pressable
            style={styles.side}
            onPress={openMenu}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={28} color={Colors.text} />
          </Pressable>
        )}

        {/* ito naman is the title container */}
        <View style={[styles.titleWrap, showLogo && styles.titleLeft]}>
          {showLogo ? (
            <Logo size={34} withText />
          ) : (
            <Text
              style={styles.title}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {title}
            </Text>
          )}
        </View>

        {/* ito yung right side: bell (hidden on back screens, keeps the title centered) */}
        {back ? (
          <View style={styles.side} />
        ) : (
          <Pressable
            style={[styles.side, { alignItems: 'flex-end' }]}
            onPress={() => router.push('/notifications' as any)}
            hitSlop={12}
            accessibilityLabel="Notifications"
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={Colors.text}
            />
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  row: {
    height: 56,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: { width: 40, justifyContent: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  titleLeft: { alignItems: 'flex-start', paddingLeft: Spacing.sm }, // yung logo is beside sa burger menu, so hindi centered yung title gaya sa figma
  title: { ...Type.h2, color: Colors.text },
});