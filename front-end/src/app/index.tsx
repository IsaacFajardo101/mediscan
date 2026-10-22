import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 1. LOG IN ACTION: Direct jump to choose-profile (NO Google Popup)
  const handleLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both your email and password.');
      return;
    }

    // In Sprint 4: Call backend login endpoint to fetch session token
    // For Sprint 1-2 (Mock): Bypass directly to Choose Profile screen
    router.replace('/choose-profile');
  };

  // 2. SIGN UP ACTION: Direct jump to Signup screen
  const handleGoToSignup = () => {
    router.push('/signup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B2B20" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* Top Curved Dark Green Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              {/* MediScan Cross Logo */}
              <View style={styles.logoPlaceholder}>
                <Ionicons name="medical" size={32} color="#52B788" />
              </View>
              <Text style={styles.logoTitle}>MediScan</Text>
              <Text style={styles.logoSubtitle}>Your Family's Medicine Companion</Text>
            </View>
          </View>

          {/* Form Content */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeTitle}>Welcome back!</Text>
            <Text style={styles.welcomeSubtitle}>
              Log in to keep your family's medicines organized and synced across devices.
            </Text>

            {/* Email Field */}
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. juan@email.com"
                placeholderTextColor="#A0AEC0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#A0AEC0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#718096"
                />
              </TouchableOpacity>
            </View>

            {/* Main Log In Button */}
            <TouchableOpacity style={styles.loginBtn} activeOpacity={0.8} onPress={handleLogin}>
              <Text style={styles.loginBtnText}>Log In</Text>
            </TouchableOpacity>

            {/* Switch to Sign Up Flow */}
            <View style={styles.signupPromptContainer}>
              <Text style={styles.signupPromptText}>Don't have an account?</Text>
            </View>

            <TouchableOpacity style={styles.signupBtn} activeOpacity={0.8} onPress={handleGoToSignup}>
              <Text style={styles.signupBtnText}>Sign in</Text>
            </TouchableOpacity>
          </View>

          {/* Legal / Disclaimer Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    backgroundColor: '#0E3326',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingTop: Platform.OS === 'android' ? 30 : 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#52B788',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoSubtitle: {
    fontSize: 13,
    color: '#D8F3DC',
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0E3326',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B4332',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
    backgroundColor: '#FFFFFF',
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A202C',
  },
  eyeIcon: {
    padding: 6,
  },
  loginBtn: {
    backgroundColor: '#0E3326',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  signupPromptContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  signupPromptText: {
    fontSize: 14,
    color: '#4A5568',
  },
  signupBtn: {
    borderWidth: 1.5,
    borderColor: '#0E3326',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupBtnText: {
    color: '#0E3326',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 32,
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 18,
  },
});