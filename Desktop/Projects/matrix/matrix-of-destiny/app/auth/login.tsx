import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
  TouchableOpacity, TouchableWithoutFeedback,
  Keyboard, Alert, Animated, Modal, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { loginWithEmail, sendPasswordReset, getAuthErrorMessage, signInWithGoogle, signInWithApple } from '@/lib/firebaseAuth';
import { syncPurchasesUser, checkSubscriptionStatus } from '@/lib/purchases';
import * as Storage from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { StarBackground } from '@/components/ui/StarBackground';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'done'>('email');
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const { t, locale } = useI18n();
  const isUk = locale === 'uk';

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
      const firebaseUser = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithApple();
      useAppStore.getState().logout();
      useAppStore.setState({ isAuthenticated: true, userId: firebaseUser.uid, onboardingCompleted: true });
      setUserProfile(firebaseUser.displayName ?? '', '');
      // Link user ID to RevenueCat and refresh subscription status
      syncPurchasesUser(firebaseUser.uid).then(() => checkSubscriptionStatus()).catch(() => {});
      useAppStore.getState().syncWithServer().catch(() => {});
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t.common.error, getAuthErrorMessage(e?.code ?? '', isUk));
      }
    }
    setLoading(false);
  };

  const logoAnim    = useRef(new Animated.Value(0)).current;
  const formAnim    = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoPulse   = useRef(new Animated.Value(1)).current;
  const ringRotate  = useRef(new Animated.Value(0)).current;
  const ring2Rotate = useRef(new Animated.Value(0)).current;
  const auraScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim,  { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
      Animated.timing(formAnim,  { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
    ]).start();

    Animated.loop(Animated.sequence([
      Animated.timing(logoPulse, { toValue: 1.14, duration: 1800, useNativeDriver: true }),
      Animated.timing(logoPulse, { toValue: 1,    duration: 1800, useNativeDriver: true }),
    ])).start();

    Animated.loop(
      Animated.timing(ringRotate, { toValue: 1, duration: 10000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.timing(ring2Rotate, { toValue: 1, duration: 6000, useNativeDriver: true })
    ).start();

    Animated.loop(Animated.sequence([
      Animated.timing(auraScale, { toValue: 1.22, duration: 2000, useNativeDriver: true }),
      Animated.timing(auraScale, { toValue: 1,    duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);

  const formTranslate   = formAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const outerRotateDeg  = ringRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const innerRotateDeg  = ring2Rotate.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.common.error, t.ui.fillAllFields);
      return;
    }
    setLoading(true);
    try {
      const firebaseUser = await loginWithEmail(email, password);
      // Wipe previous guest data, then set new user
      useAppStore.getState().logout();
      useAppStore.setState({ isAuthenticated: true, userId: firebaseUser.uid, onboardingCompleted: true });
      setUserProfile(firebaseUser.displayName ?? '', '');
      // Link user ID to RevenueCat and refresh subscription status
      syncPurchasesUser(firebaseUser.uid).then(() => checkSubscriptionStatus()).catch(() => {});
      // Restore data from server
      useAppStore.getState().syncWithServer().catch(() => {});
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(t.common.error, getAuthErrorMessage(e?.code ?? '', isUk));
    }
    setLoading(false);
  };

  const handleResetVerify = async () => {
    if (!resetEmail.trim()) {
      Alert.alert(isUk ? 'Помилка' : 'Error', isUk ? 'Введіть email' : 'Enter email');
      return;
    }
    try {
      await sendPasswordReset(resetEmail);
      setResetStep('done');
    } catch (e: any) {
      Alert.alert(isUk ? 'Помилка' : 'Error', getAuthErrorMessage(e?.code ?? '', isUk));
    }
  };

  const closeReset = () => {
    setShowReset(false);
    setResetEmail('');
    setResetStep('email');
  };

  const resetModal = (
    <Modal visible={showReset} transparent animationType="fade" onRequestClose={closeReset}>
      <Pressable style={rs.overlay} onPress={closeReset}>
        <Pressable style={rs.card} onPress={(e) => e.stopPropagation()}>
          <Text style={rs.title}>
            {resetStep === 'done'
              ? (isUk ? 'Пароль змінено!' : 'Password changed!')
              : (isUk ? 'Відновлення пароля' : 'Reset password')}
          </Text>

          {resetStep === 'done' ? (
            <>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" style={{ alignSelf: 'center', marginVertical: Spacing.md }} />
              <Text testID="reset-success-msg" style={rs.desc}>
                {isUk
                  ? 'Ми надіслали лист на вашу пошту. Перейдіть за посиланням щоб встановити новий пароль.'
                  : 'We sent a link to your email. Follow it to set a new password.'}
              </Text>
              <TouchableOpacity style={rs.btn} onPress={closeReset}>
                <Text style={rs.btnText}>{isUk ? 'Зрозуміло' : 'Got it'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={rs.desc}>
                {isUk ? 'Введіть email, з яким ви реєструвалися' : 'Enter the email you registered with'}
              </Text>
              <TextInput
                testID="reset-email-input"
                style={rs.input}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                value={resetEmail}
                onChangeText={setResetEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity testID="reset-submit-btn" style={rs.btn} onPress={handleResetVerify}>
                <Text style={rs.btnText}>{isUk ? 'Надіслати лист' : 'Send reset email'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={closeReset} style={{ marginTop: Spacing.sm, alignSelf: 'center' }}>
                <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm }}>{isUk ? 'Скасувати' : 'Cancel'}</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <StarBackground style={styles.container}>
      {resetModal}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Logo ── */}
          <View style={styles.header}>
            <Animated.View style={{ opacity: logoAnim, transform: [{ scale: logoScale }] }}>
              <View style={styles.logoContainer}>
                <Animated.View style={[styles.logoAura, { transform: [{ scale: auraScale }] }]} />
                <Animated.View style={[styles.outerRing, { transform: [{ rotate: outerRotateDeg }] }]} />
                <Animated.View style={[styles.innerRingAnim, { transform: [{ rotate: innerRotateDeg }] }]} />
                <Animated.View style={{ transform: [{ scale: logoPulse }] }}>
                  <LinearGradient
                    colors={['#C8901A', '#F5C542', '#C8901A']}
                    style={styles.logoRing}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <LinearGradient
                      colors={['#1C1040', '#0D0B1E']}
                      style={styles.logoInner}
                    >
                      <Ionicons name="sparkles" size={36} color={Colors.accent} />
                    </LinearGradient>
                  </LinearGradient>
                </Animated.View>
              </View>
            </Animated.View>
            <Animated.View style={{ opacity: logoAnim, transform: [{ translateY: formTranslate }], alignItems: 'center' }}>
              <Text style={styles.appName}>Matrix of Destiny</Text>
              <Text style={styles.appTagline}>{t.authExtra.openYourDestiny}</Text>
            </Animated.View>
          </View>

          {/* ── Form Card ── */}
          <Animated.View style={[styles.formCard, { opacity: formAnim, transform: [{ translateY: formTranslate }] }]}>

            <Text style={styles.inputLabel}>EMAIL</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={18} color={Colors.accent} style={styles.inputIcon} />
              <TextInput
                testID="login-email-input"
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={100}
              />
            </View>

            <Text style={[styles.inputLabel, { marginTop: Spacing.sm }]}>{t.authExtra.enterPassword}</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.accent} style={styles.inputIcon} />
              <TextInput
                testID="login-password-input"
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPwd}
                maxLength={64}
              />
              <TouchableOpacity testID="login-show-password-btn" onPress={() => setShowPwd(!showPwd)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPwd ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="rgba(255,255,255,0.45)"
                />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: Spacing.md }}>
              <Button testID="login-submit-btn" title={t.authExtra.signIn} variant="gold" onPress={handleLogin} loading={loading} />
            </View>

            <TouchableOpacity testID="login-forgot-btn" onPress={() => setShowReset(true)} style={{ alignSelf: 'center', marginTop: Spacing.sm }}>
              <Text style={{ color: Colors.primaryLight, fontSize: FontSize.sm }}>
                {locale === 'uk' ? 'Забули пароль?' : 'Forgot password?'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.authExtra.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            {Platform.OS === 'ios' && (
              <TouchableOpacity testID="login-apple-btn" style={styles.socialBtn} activeOpacity={0.7} onPress={() => handleSocialLogin('apple')}>
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                <Text style={styles.socialText}>{t.authExtra.continueApple}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity testID="login-google-btn" style={[styles.socialBtn, { marginTop: Spacing.sm }]} activeOpacity={0.7} onPress={() => handleSocialLogin('google')}>
              <Ionicons name="logo-google" size={20} color={Colors.accent} />
              <Text style={styles.socialText}>{t.authExtra.continueGoogle}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t.authExtra.noAccountQ}</Text>
            <TouchableOpacity testID="login-register-link" onPress={() => router.push('/auth/register')}>
              <Text style={styles.footerLink}>{t.authExtra.register}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="login-guest-btn"
            style={{ alignSelf: 'center', marginTop: Spacing.md, paddingVertical: Spacing.sm }}
            onPress={async () => {
              const guestId = 'guest_' + Date.now();
              useAppStore.setState({ isAuthenticated: true, userId: guestId });
              await Storage.setItemAsync('welcome_seen', 'true');
              await Storage.setItemAsync('onboarding_done', 'true');
              useAppStore.getState().setOnboardingCompleted();
              router.replace('/(tabs)');
            }}
          >
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm }}>
              {isUk ? 'Продовжити без реєстрації' : 'Continue without registration'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },

  header: { alignItems: 'center', marginBottom: Spacing.lg },

  logoContainer: {
    width: 134, height: 134,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoAura: {
    position: 'absolute',
    width: 118, height: 118, borderRadius: 59,
    backgroundColor: 'rgba(245,197,66,0.07)',
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 0,
  },
  outerRing: {
    position: 'absolute',
    width: 108, height: 108, borderRadius: 54,
    borderWidth: 1.5,
    borderColor: 'rgba(245,197,66,0.42)',
  },
  innerRingAnim: {
    position: 'absolute',
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.60)',
  },
  logoRing: {
    width: 74, height: 74, borderRadius: 37,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55, shadowRadius: 16, elevation: 14,
  },
  logoInner: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
  },
  appName: {
    fontSize: FontSize.xl, fontWeight: '800',
    color: '#FFFFFF', textAlign: 'center',
  },
  appTagline: {
    fontSize: FontSize.sm, color: 'rgba(255,255,255,0.55)',
    marginTop: 2, textAlign: 'center',
  },

  formCard: {
    backgroundColor: 'rgba(22, 10, 55, 0.88)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.30)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  inputLabel: {
    fontSize: FontSize.xs, fontWeight: '800',
    color: Colors.accent, letterSpacing: 1.5,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.25)',
    paddingHorizontal: Spacing.md,
    height: 46,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1, color: '#FFFFFF',
    fontSize: FontSize.md,
  },
  eyeBtn: { padding: Spacing.sm },

  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: FontSize.xs, marginHorizontal: Spacing.sm,
  },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  socialText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSize.sm, fontWeight: '500',
  },
  footer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: Spacing.md,
  },
  footerText: { color: 'rgba(255,255,255,0.45)', fontSize: FontSize.sm },
  footerLink: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' },
});

const rs = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: '#1E1B4B',
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  title: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.sm,
  },
  desc: {
    color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.md,
  },
  label: {
    color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.md,
    padding: Spacing.md, color: Colors.text, fontSize: FontSize.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: Spacing.sm,
  },
  btn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm,
  },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
