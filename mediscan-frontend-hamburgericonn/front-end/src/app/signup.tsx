import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthHeader from '@/components/AuthHeader';
import AuthInput from '@/components/AuthInput';
import FormError from '@/components/FormError';
import SaveLoginDialog from '@/components/SaveLoginDialog';
import { MockAuth } from '@/mock/mockAuth';
import { isValidEmail, MIN_PASSWORD } from '@/lib/validation';
import { Colors, Radius, Spacing } from '@/constants/display';

// Sign Up ("Sign in" button sa Log In screen).
//
// Flow (from the requirements):
//  1. User fills in email + password + confirm.
//  2. Frontend sends JSON to backend (POST /auth/signup).
//  3a. Existing account (409) -> silently log them in, WALANG verification ulit.
//  3b. New account -> backend sends a code to their email -> go to Verify screen.
//      Hindi pa usable ang account hangga't hindi verified.
export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askSave, setAskSave] = useState(false);

  const onSignUp = async () => {
    setError(null);
    const e = email.trim();
    if (!isValidEmail(e)) return setError('Please enter a valid email address.');
    if (password.length < MIN_PASSWORD) return setError(`Password must be at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    const res = await MockAuth.signUp(e, password);

    // 3a. Already exists -> silent log in
    if (res.code === 409) {
      const login = await MockAuth.login(e, password);
      setLoading(false);
      if (!login.success) {
        return setError('An account with this email already exists, but the password is incorrect. Try Log In instead.');
      }
      setAskSave(true); // manual login -> ask to save
      return;
    }

    setLoading(false);
    if (!res.success) return setError(res.message);

    // 3b. New account -> verify
    router.push({ pathname: '/verify-code', params: { email: e } });
  };

  const onAnswerSave = (save: boolean) => {
    setAskSave(false);
    if (save) MockAuth.saveLogin(email, password);
    router.replace('/choose-profile');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <AuthHeader />

        <View style={styles.body}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Sign up to start keeping your family's medicines organized.</Text>

          <FormError message={error} />

          <AuthInput
            label="Email"
            placeholder="e.g. juan@email.com"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <AuthInput
            label="Password"
            placeholder={`At least ${MIN_PASSWORD} characters`}
            password
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />
          <AuthInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            password
            autoComplete="new-password"
            value={confirm}
            onChangeText={setConfirm}
            onSubmitEditing={onSignUp}
          />

          <Pressable style={[styles.primaryBtn, loading && styles.disabled]} onPress={onSignUp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Sign Up</Text>}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.hint}>Already have an account?  </Text>
            <Pressable onPress={() => router.replace('/login')} hitSlop={8} disabled={loading}>
              <Text style={styles.link}>Log In</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <Text style={[styles.terms, { paddingBottom: insets.bottom + Spacing.md }]}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>

      <SaveLoginDialog visible={askSave} onAnswer={onAnswerSave} />
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
  disabled: { opacity: 0.7 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Spacing.md },
  hint: { color: Colors.textMuted, fontSize: 14 },
  link: { color: Colors.text, fontSize: 14, fontWeight: '800' },
  terms: {
    textAlign: 'center', color: Colors.textMuted, fontSize: 12, lineHeight: 18,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
  },
});