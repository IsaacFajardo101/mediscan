import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthHeader from '@/components/AuthHeader';
import AuthInput from '@/components/AuthInput';
import { Colors, Radius, Spacing } from '@/constants/display';

// same sa figma
// Log In screen. Opened after Log Out.
// Log In -> "Choose an account" sheet. Sign in (Sign Up) -> Sign Up screen.
// ang kailangan dito is yung email and password fields, tap the Log In button to go to the "Choose an account" sheet, tap the Sign Up button to go to the Sign Up screen.
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <AuthHeader />

        <View style={styles.body}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>Log in to keep your family's medicines organized and synced across devices.</Text>

          <AuthInput
            label="Email"
            placeholder="e.g. juan@email.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <AuthInput label="Password" placeholder="Enter your password" password value={password} onChangeText={setPassword} />

          <Pressable style={styles.primaryBtn} onPress={() => router.push('/choose-account' as any)}>
            <Text style={styles.primaryText}>Log In</Text>
          </Pressable>

          <Text style={styles.hint}>Don't have an account?</Text>
          <Pressable style={styles.outlineBtn} onPress={() => router.replace('/signup' as any)}>
            <Text style={styles.outlineText}>Sign in</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} />
        <Text style={[styles.terms, { paddingBottom: insets.bottom + Spacing.md }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  body: { paddingHorizontal: Spacing.lg - 4, paddingTop: Spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 15, lineHeight: 22, color: Colors.textMuted, marginTop: Spacing.sm, marginBottom: Spacing.md },
  primaryBtn: {
    height: 50, borderRadius: Radius.sm + 2, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { textAlign: 'center', color: Colors.textMuted, fontSize: 14, marginVertical: Spacing.md - 2 },
  outlineBtn: {
    height: 50, borderRadius: Radius.sm + 2, borderWidth: 1.5, borderColor: Colors.primary,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  outlineText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  terms: {
    textAlign: 'center', color: Colors.textMuted, fontSize: 12, lineHeight: 18,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
  },
});