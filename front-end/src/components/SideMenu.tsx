import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/display';
import { getAvatarSource } from '@/constants/avatars';
import Logo from './Logo';
import { useMenu } from './MenuContext';

// MOCK DATA: same account as the Profile screen. Replace with the real response later.
const MOCK_USER = { name: 'Jane', email: 'user@example.com', icon: 3 };

const PANEL_W = Dimensions.get('window').width * 0.78;

// To add another menu item later: add another line here, then create its screen file.
// `route` = the screen it opens (file name in src/app/(tabs)/).
const ITEMS: { label: string; icon: React.ReactElement; route: string }[] = [
  {
    label: 'Settings',
    icon: <Ionicons name="settings-outline" size={22} color={Colors.primary} />,
    route: '/settings',
  },
  {
    label: 'Terms & Medical Disclaimer',
    icon: <MaterialCommunityIcons name="receipt-text-outline" size={22} color={Colors.primary} />,
    route: '/terms',
  },
];

export default function SideMenu() {
  const { open, closeMenu, openLogout } = useMenu();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [mounted, setMounted] = useState(false);
  const x = useRef(new Animated.Value(-PANEL_W)).current; // panel position
  const fade = useRef(new Animated.Value(0)).current; // dark backdrop

  // Slide in when opened, slide out when closed
  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(x, { toValue: -PANEL_W, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open, x, fade]);

  // Android back button closes the menu
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeMenu();
      return true;
    });
    return () => sub.remove();
  }, [open, closeMenu]);

  if (!mounted) return null;

  return (
    <View style={styles.overlay}>
      {/* Dark area (tap to close) */}
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={closeMenu} />
      </Animated.View>

      {/* Sliding panel */}
      <Animated.View style={[styles.panel, { transform: [{ translateX: x }] }]}>
        <View style={{ flex: 1, paddingTop: insets.top }}>
          <View style={styles.topRow}>
            <Pressable onPress={closeMenu} hitSlop={12} accessibilityLabel="Close menu">
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </Pressable>
            <Logo size={30} withText />
          </View>

          {/* Profile card */}
          <Pressable
            style={({ pressed }) => [styles.profileCard, pressed && { backgroundColor: Colors.primarySoft }]}
            onPress={() => {
                closeMenu();
                router.navigate('/profile' as any);
           }}
          >
          <View style={styles.avatar}>
            <Image
              source={getAvatarSource(MOCK_USER.icon)}
              style={{ width: 52, height: 52, borderRadius: 26 }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{MOCK_USER.name}</Text>
            <Text style={styles.email}>{MOCK_USER.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.text} />
          </Pressable>

          {/* Menu items: each one opens its own screen */}
          <View style={styles.list}>
            {ITEMS.map((i) => (
              <Pressable
                key={i.label}
                style={({ pressed }) => [styles.item, pressed && { backgroundColor: Colors.primarySoft }]}
                onPress={() => {
                  closeMenu();
                  router.navigate(i.route as any);
                }}
              >
                {i.icon}
                <Text style={styles.itemText}>{i.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.text} />
              </Pressable>
            ))}
          </View>

          <View style={{ flex: 1 }} />

          {/* Footer with Log Out (asks first, then goes to the Log In screen) */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Pressable
              style={styles.logout}
              onPress={() => {
                closeMenu();
                openLogout(); // shows the "Log out of MediScan?" popup
              }}
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
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    zIndex: 100, elevation: 100,
  },
  backdrop: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  panel: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: PANEL_W,
    backgroundColor: Colors.surface,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4, padding: Spacing.md },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4,
    marginHorizontal: Spacing.md, padding: Spacing.sm + 4,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  avatar: {
    width: 52, height: 52, borderRadius: Radius.pill, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontWeight: '700', color: Colors.text, fontSize: FontSizes.body + 1 },
  email: { fontSize: 11, color: Colors.textMuted },

  list: { marginTop: Spacing.md, paddingHorizontal: Spacing.md },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4,
    paddingVertical: 14, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm + 2,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  itemText: { flex: 1, color: Colors.text, fontSize: FontSizes.body - 1, fontWeight: '600' },

  footer: { backgroundColor: Colors.primarySoft, paddingTop: Spacing.md, paddingHorizontal: Spacing.md },
  logout: { padding: 14, borderRadius: Radius.sm, backgroundColor: Colors.primary, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '700' },
});