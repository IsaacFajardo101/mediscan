import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing, Type } from '@/constants/display';
import { useMenu } from './MenuContext';

// "Log out of MediScan?" popup. Opened by the Log Out button in the burger menu.
export default function LogoutDialog() {
  const { logoutOpen, closeLogout } = useMenu();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (logoutOpen) {
      setMounted(true);
      Animated.timing(t, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(t, { toValue: 0, duration: 140, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [logoutOpen, t]);

  // Android back button = Cancel
  useEffect(() => {
    if (!logoutOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeLogout();
      return true;
    });
    return () => sub.remove();
  }, [logoutOpen, closeLogout]);

  if (!mounted) return null;

  const confirmLogout = () => {
    closeLogout();
    // need here is to clear the user session and navigate to the login screen. This is a placeholder for the actual logout logic.
    router.replace('/login' as any);
  };

  return (
    <View style={styles.overlay}>
      {/* Dim the screen (tap outside = Cancel) */}
      <Animated.View style={[styles.backdrop, { opacity: t }]}>
        <Pressable style={{ flex: 1 }} onPress={closeLogout} />
      </Animated.View>

      <View style={styles.center} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { opacity: t, transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="log-out-outline" size={30} color={Colors.danger} />
          </View>

          <Text style={styles.title}>Log out of MediScan?</Text>
          <Text style={styles.message}>
            Make sure your data is synced before logging out so you don't lose recent changes.
          </Text>

          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.cancel]} onPress={closeLogout}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.logout]} onPress={confirmLogout}>
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 100, elevation: 100 },
  backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(5,31,32,0.45)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.lg - 4, alignItems: 'center',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: Radius.pill, backgroundColor: Colors.statusDangerSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md - 2,
  },
  title: { ...Type.h3, color: Colors.text, textAlign: 'center' },
  message: {
    fontSize: 13, lineHeight: 19, color: Colors.textMuted, textAlign: 'center',
    marginTop: Spacing.sm, marginBottom: Spacing.md + 4,
  },
  row: { flexDirection: 'row', gap: Spacing.sm + 4, width: '100%' },
  btn: { flex: 1, height: 46, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.text },
  cancelText: { ...Type.label, fontSize: 15, color: Colors.text },
  logout: { backgroundColor: Colors.danger },
  logoutText: { ...Type.label, fontSize: 15, color: '#fff' },
});