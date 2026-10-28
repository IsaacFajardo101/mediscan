import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/display';
import Logo from './Logo';
import { useMenu } from './MenuContext';
import { usePathname } from 'expo-router';

const PANEL_W = Dimensions.get('window').width * 0.78;

// To add another menu item later: add another line here, then create its screen file.
// `route` = the screen it opens (file name in src/app/(tabs)/).
const ITEMS: { label: string; icon: React.ReactElement; route: string }[] = [
  {
    label: 'Settings',
    icon: (
      <Ionicons
        name="settings-outline"
        size={20}
        color={Colors.primary}
      />
    ),
    route: '/settings',
  },
  {
    label: 'Terms & Medical Disclaimer',
    icon: (
      <MaterialCommunityIcons
        name="receipt-text-outline"
        size={20}
        color={Colors.primary}
      />
    ),
    route: '/terms',
  },
];

export default function HamburgerMenu() {
  const { open, closeMenu, openLogout } = useMenu();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log('Current route:', pathname);
  }, [pathname]);

  const insets = useSafeAreaInsets();

  const [mounted, setMounted] = useState(false);
  const x = useRef(new Animated.Value(-PANEL_W)).current;
  const fade = useRef(new Animated.Value(0)).current;

  // Slide in when opened, slide out when closed
  useEffect(() => {
    if (open) {
      setMounted(true);

      Animated.parallel([
        Animated.timing(x, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(x, {
          toValue: -PANEL_W,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, x, fade]);

  // Android back button closes the menu
  useEffect(() => {
    if (!open) return;

    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        closeMenu();
        return true;
      }
    );

    return () => sub.remove();
  }, [open, closeMenu]);

  if (!mounted) return null;

  return (
    <View style={styles.overlay}>
      {/* Dark area (tap to close) */}
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable
          style={styles.backdropPressable}
          onPress={closeMenu}
        />
      </Animated.View>

      {/* Sliding panel */}
      <Animated.View
        style={[
          styles.panel,
          { transform: [{ translateX: x }] },
        ]}
      >
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View style={styles.topRow}>
            <Pressable
              onPress={closeMenu}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={Colors.text}
              />
            </Pressable>

            <Logo size={26} withText />
          </View>

          {/* Profile card */}
          <Pressable
            style={({ pressed }) => [
              styles.profileCard,
              pressed && { backgroundColor: Colors.primarySoft },
            ]}
            onPress={() => {
              closeMenu();
              router.navigate('/profiles' as any);
            }}
            accessibilityRole="button"
          >
            {/* TODO: replace with the real avatar image once Person 1/2's avatar assets are merged */}
            <View style={styles.avatar}>
              <Ionicons
                name="person"
                size={26}
                color={Colors.primary}
              />
            </View>

            <View style={styles.profileText}>
              <Text style={styles.name}>Maria Batumbakal</Text>
              <Text style={styles.email}>
                mariabatumbakal@email.com
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.text}
            />
          </Pressable>

          {/* Menu items: each one opens its own screen */}
          <View style={styles.list}>
            {ITEMS.map((item) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [
                  styles.item,
                  pressed && {
                    backgroundColor: Colors.primarySoft,
                  },
                ]}
                onPress={() => { closeMenu();
                  const route =
                    item.route === '/settings'
                      ? '/settings'
                      : item.route === '/terms'
                        ? '/terms'
                        : item.route;

                    router.push(route as any);
                }}
                accessibilityRole="button"
              >
                {item.icon}
                <Text style={styles.itemText} numberOfLines={1}>
                  {item.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.text}
                />
              </Pressable>
            ))}
          </View>

          <View style={{ flex: 1 }} />

          {/* Footer with Log Out (asks first, then goes to the Log In screen) */}
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, Spacing.md) },
            ]}
          >
            <Pressable
              style={styles.logout}
              onPress={() => {
                closeMenu();
                openLogout();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backdropPressable: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_W,
    backgroundColor: Colors.surface,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    padding: Spacing.md,
  },

  // Profile card: soft shadow so it looks in front, very light thin line, a little lower from the top row
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    marginTop: Spacing.sm + 4,
    marginHorizontal: Spacing.md,
    padding: Spacing.sm + 4,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border + '33',
    backgroundColor: Colors.surface,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontWeight: '700',
    color: Colors.text,
    fontSize: FontSizes.body - 1,
  },
  email: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  // Menu items: bigger space from the profile card and between boxes, very thin faint line, one-line text
  list: {
    marginTop: Spacing.lg + 6,
    paddingHorizontal: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md + 2,
    marginBottom: Spacing.sm + 4,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border + '33',
    backgroundColor: Colors.surface,
  },
  itemText: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer: Log Out sits low
  footer: {
    backgroundColor: Colors.primarySoft,
    paddingTop: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  logout: {
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
  },
});