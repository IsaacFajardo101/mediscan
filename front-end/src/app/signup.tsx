import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthHeader from '@/components/AuthHeader';
import AuthInput from '@/components/AuthInput';
import { Colors, Radius, Spacing } from '@/constants/display';

// Sign Up screen. Sign Up -> code verification. Log In link -> Log In screen.
// Ang ilalagay dito is yung email, password, and confirm password fields. 
// Tap the Sign Up button to go to the code verification screen. Tap the Log In link to go to the Log In screen.
export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <AuthHeader />

        <View style={styles.body}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Sign up to start keeping your family's medicines organized.</Text>

          <AuthInput
            label="Email"
            placeholder="e.g. juan@email.com"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <AuthInput label="Password" placeholder="At least 8 characters" password value={password} onChangeText={setPassword} />
          <AuthInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            password
            value={confirm}
            onChangeText={setConfirm}
          />

          <Pressable style={styles.primaryBtn} onPress={() => router.push('/verify-code' as any)}>
            <Text style={styles.primaryText}>Sign Up</Text>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.hint}>Already have an account?  </Text>
            <Pressable onPress={() => router.replace('/login' as any)} hitSlop={8}>
              <Text style={styles.link}>Log In</Text>
            </Pressable>
          </View>
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
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md },
  hint: { color: Colors.textMuted, fontSize: 14 },
  link: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  terms: {
    textAlign: 'center', color: Colors.textMuted, fontSize: 12, lineHeight: 18,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
  },
});