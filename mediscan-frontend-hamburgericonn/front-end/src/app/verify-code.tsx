import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthHeader from '@/components/AuthHeader';
import FormError from '@/components/FormError';
import SaveLoginDialog from '@/components/SaveLoginDialog';
import { MockAuth } from '@/mock/mockAuth';
import { Colors, Radius, Spacing } from '@/constants/display';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

// "Verify your email" screen (after Sign Up for a NEW account).
// User opens their email, types the 6-digit code -> backend checks it.
// Correct -> account is marked verified + backend gives a session -> ask to save login -> Choose Profile.
// (Mock code: 849201)
export default function VerifyCodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [askSave, setAskSave] = useState(false);

  // Resend countdown
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const onVerify = async () => {
    setError(null);
    setInfo(null);
    if (code.length !== CODE_LENGTH) return setError(`Enter the ${CODE_LENGTH}-digit code from your email.`);

    setLoading(true);
    const res = await MockAuth.verifyCode(email, code);
    setLoading(false);
    if (!res.success) {
      setCode('');
      return setError(res.message);
    }
    setAskSave(true); // signup = manual login -> ask to save
  };

  const onAnswerSave = (save: boolean) => {
    setAskSave(false);
    if (save) MockAuth.saveCurrentLogin();
    router.replace('/choose-profile'); // new account has no profiles -> goes on to Create Profile
  };

  const onResend = async () => {
    setError(null);
    const res = await MockAuth.resendCode(email);
    if (res.success) {
      setInfo(res.message);
      setSeconds(RESEND_SECONDS);
    } else setError(res.message);
  };

  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <AuthHeader />

        <View style={styles.body}>
          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to <Text style={styles.email}>{email || 'your email'}</Text>. Enter it below to verify
            your account.
          </Text>

          <FormError message={error} />
          {info ? <Text style={styles.info}>{info}</Text> : null}

          {/* 6 boxes. One hidden input underneath handles typing + paste. */}
          <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const active = i === Math.min(code.length, CODE_LENGTH - 1);
              return (
                <View key={i} style={[styles.box, active && styles.boxActive]}>
                  <Text style={styles.digit}>{code[i] ?? ''}</Text>
                </View>
              );
            })}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              autoFocus
              style={styles.hiddenInput}
              onSubmitEditing={onVerify}
              accessibilityLabel="Verification code"
            />
          </Pressable>

          <Pressable style={[styles.primaryBtn, loading && styles.disabled]} onPress={onVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify</Text>}
          </Pressable>

          <View style={styles.row}>
            {seconds > 0 ? (
              <Text style={styles.hint}>
                Didn't get the code? Resend in {mm}:{ss}
              </Text>
            ) : (
              <Pressable onPress={onResend} hitSlop={8}>
                <Text style={styles.link}>Resend code</Text>
              </Pressable>
            )}
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/signup'))} hitSlop={8}>
              <Text style={styles.link}>Change email</Text>
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
  email: { fontWeight: '700', color: Colors.text },
  info: { fontSize: 14, color: Colors.success, marginBottom: Spacing.sm + 2 },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md + 4 },
  box: {
    width: 46, height: 54, borderRadius: Radius.sm + 2, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  boxActive: { borderWidth: 2, borderColor: Colors.primary },
  digit: { fontSize: 22, fontWeight: '700', color: Colors.text },
  hiddenInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0.01 },
  primaryBtn: {
    height: 50, borderRadius: Radius.sm + 2, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  disabled: { opacity: 0.7 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  hint: { color: Colors.textMuted, fontSize: 13 },
  link: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  terms: {
    textAlign: 'center', color: Colors.textMuted, fontSize: 12, lineHeight: 18,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
  },
});