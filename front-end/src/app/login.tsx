import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AuthHeader from '@/components/AuthHeader';
import AuthInput from '@/components/AuthInput';
import FormError from '@/components/FormError';
import SaveLoginDialog from '@/components/SaveLoginDialog';
import { MockAuth } from '@/mock/mockAuth';
import { Colors, Radius, Spacing } from '@/constants/display';
import { isValidEmail } from '@/lib/validation';

// START SCREEN ng app (Log In). Walang tabs/icons dito, Log In or Sign in lang.
//
// Flow:
//  1. Pag bukas ng app, kung may saved login info -> auto-fill email + password (hindi na magta-type).
//  2. Tap Log In -> backend -> bagong session ID (kahit saved info, nagla-login pa rin talaga).
//  3. Kung MANUAL login (tinype ni user / iba sa naka-save) -> tanungin kung i-save ang login info.
//  4. -> "Choose your profile".
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState<{ email: string; password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [askSave, setAskSave] = useState(false);

  // Auto-fill from saved login info (replaces the old "Choose an account" sheet)
  useEffect(() => {
    const s = MockAuth.getSavedLogin();
    if (!s) return;
    setSaved(s);
    setEmail(s.email);
    setPassword(s.password);
  }, []);

  const usingSaved = !!saved && saved.email === email.trim() && saved.password === password;

  const goNext = () => router.replace('/choose-profile');

  const onLogin = async () => {
    setError(null);
    const e = email.trim();
    if (!isValidEmail(e)) return setError('Please enter a valid email address.');
    if (!password) return setError('Please enter your password.');

    setLoading(true);
    const res = await MockAuth.login(e, password);
    setLoading(false);
    if (!res.success) return setError(res.message);

    if (usingSaved) goNext(); // auto-filled login -> don't ask again
    else setAskSave(true); // manual login -> always ask
  };

  const onAnswerSave = (save: boolean) => {
    setAskSave(false);
    if (save) MockAuth.saveLogin(email, password);
    goNext();
  };

  const forgetSaved = () => {
    MockAuth.forgetLogin();
    setSaved(null);
    setEmail('');
    setPassword('');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <AuthHeader />

        <View style={styles.body}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>Log in to keep your family's medicines organized and synced across devices.</Text>

          {usingSaved ? (
            <View style={styles.savedNote}>
              <Ionicons name="key-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.savedText}>Using your saved login info.</Text>
              <Pressable onPress={forgetSaved} hitSlop={8}>
                <Text style={styles.savedLink}>Forget</Text>
              </Pressable>
            </View>
          ) : null}

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
            placeholder="Enter your password"
            password
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={onLogin}
          />

          <Pressable style={[styles.primaryBtn, loading && styles.disabled]} onPress={onLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Log In</Text>}
          </Pressable>

          <Text style={styles.hint}>Don't have an account?</Text>
          <Pressable style={styles.outlineBtn} onPress={() => router.replace('/signup')} disabled={loading}>
            <Text style={styles.outlineText}>Sign in</Text>
          </Pressable>
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
  savedNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primarySoft, borderRadius: Radius.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm + 4, marginBottom: Spacing.md - 2,
  },
  savedText: { flex: 1, fontSize: 13, color: Colors.textMuted },
  savedLink: { fontSize: 13, fontWeight: '700', color: Colors.text, textDecorationLine: 'underline' },
  primaryBtn: {
    height: 50, borderRadius: Radius.sm + 2, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  disabled: { opacity: 0.7 },
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