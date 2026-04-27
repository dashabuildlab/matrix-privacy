import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { StarBackground } from '@/components/ui/StarBackground';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { registerWithEmail, getAuthErrorMessage } from '@/lib/firebaseAuth';
import { syncPurchasesUser } from '@/lib/purchases';

export default function RegisterScreen() {
  // Pre-fill name and birthDate from onboarding data stored in the app state
  const storedName = useAppStore((s) => s.userName) ?? '';
  const storedBirthDate = useAppStore((s) => s.userBirthDate) ?? '';
  const storedKnowledgeLevel = useAppStore((s) => s.knowledgeLevel) ?? 'beginner';

  const [values, setValues] = useState({
    name: storedName,
    birthDate: storedBirthDate,
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const { t, locale } = useI18n();
  const isUk = locale === 'uk';

  const FIELDS = [
    { key: 'name',            testID: 'register-name-input',             icon: 'person-outline' as const,           placeholder: t.ui.yourName,                 keyboard: 'default' as const,               caps: 'words' as const },
    { key: 'birthDate',       testID: 'register-birthdate-input',        icon: 'calendar-outline' as const,         placeholder: t.ui.birthDatePlaceholder,      keyboard: 'numbers-and-punctuation' as const, caps: 'none' as const },
    { key: 'email',           testID: 'register-email-input',            icon: 'mail-outline' as const,             placeholder: 'Email',                       keyboard: 'email-address' as const,          caps: 'none' as const },
    { key: 'password',        testID: 'register-password-input',         icon: 'lock-closed-outline' as const,      placeholder: t.auth.password,                keyboard: 'default' as const,               caps: 'none' as const },
    { key: 'confirmPassword', testID: 'register-confirm-password-input', icon: 'shield-checkmark-outline' as const, placeholder: t.ui.confirmPassword,           keyboard: 'default' as const,               caps: 'none' as const },
  ];

  const set = (key: string, val: string) => setValues((v) => ({ ...v, [key]: val }));

  const handleRegister = async () => {
    const { name, birthDate, email, password, confirmPassword } = values;
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t.common.error, t.ui.fillAllFields); return;
    }
    if (name.trim().length < 2) {
      Alert.alert(t.common.error, isUk ? 'Ім\'я має містити щонайменше 2 символи' : 'Name must be at least 2 characters'); return;
    }
    if (!/^[\p{L}\s'-]+$/u.test(name.trim())) {
      Alert.alert(t.common.error, isUk ? 'Ім\'я може містити лише літери' : 'Name can only contain letters'); return;
    }
    const bdParts = birthDate.trim().split('.');
    if (birthDate.trim() && (bdParts.length !== 3 || bdParts.some((p) => isNaN(Number(p))))) {
      Alert.alert(t.common.error, t.ui.invalidDateFormat); return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t.common.error, t.ui.passwordMismatch); return;
    }
    if (password.length < 6) {
      Alert.alert(t.common.error, t.ui.passwordTooShort); return;
    }

    setLoading(true);
    try {
      // Register in Firebase Auth
      const firebaseUser = await registerWithEmail(email, password);

      // Migrate guest data (spreads, matrices, etc.) to the new Firebase UID
      const currentUserId = useAppStore.getState().userId;
      const isGuest = currentUserId?.startsWith('guest_');
      if (isGuest) {
        useAppStore.getState().migrateGuestData(firebaseUser.uid);
      }

      useAppStore.setState({ isAuthenticated: true, userId: firebaseUser.uid, knowledgeLevel: storedKnowledgeLevel });
      setUserProfile(name.trim(), birthDate.trim());

      // Link new Firebase UID to RevenueCat
      syncPurchasesUser(firebaseUser.uid).catch(() => {});

      // Push migrated data to server
      useAppStore.getState().pushToServer().catch(() => {});
      router.replace('/(tabs)');
    } catch (e: any) {
      const code = e?.code ?? '';
      Alert.alert(t.common.error, getAuthErrorMessage(code, isUk));
    }
    setLoading(false);
  };

  return (
    <StarBackground style={styles.root}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={styles.title}>{t.authExtra.createAccount}</Text>
            <Text style={styles.subtitle}>{t.authExtra.saveMatricesHint}</Text>
          </View>

          {/* Форма */}
          <View style={styles.form}>
            {FIELDS.map((f) => {
              const isPass = f.key === 'password' || f.key === 'confirmPassword';
              return (
                <View key={f.key} style={styles.inputRow}>
                  <Ionicons name={f.icon} size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    testID={f.testID}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    value={(values as any)[f.key]}
                    onChangeText={(v) => set(f.key, v)}
                    keyboardType={f.keyboard}
                    autoCapitalize={f.caps}
                    autoCorrect={false}
                    secureTextEntry={isPass && !showPass}
                  />
                  {isPass && (
                    <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                      <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          {/* Кнопка */}
          <TouchableOpacity testID="register-submit-btn" onPress={handleRegister} disabled={loading} activeOpacity={0.85} style={styles.btnWrap}>
            <LinearGradient
              colors={['#C8901A', '#F5C542', '#C8901A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>
                {loading ? t.common.loading : t.authExtra.registerBtn}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Лінк входу */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t.authExtra.alreadyHaveAccount}</Text>
            <TouchableOpacity testID="register-login-link" onPress={() => router.back()}>
              <Text style={styles.footerLink}>{t.authExtra.signInLink}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  kav: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },

  header: { marginBottom: Spacing.lg },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.accent,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },

  form: { gap: 10, marginBottom: Spacing.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.20)',
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.sm,
  },
  eyeBtn: { padding: 4 },

  btnWrap: { borderRadius: BorderRadius.full, overflow: 'hidden', marginBottom: Spacing.md },
  btn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  btnText: {
    color: '#1A0A00',
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: Colors.textMuted, fontSize: FontSize.sm },
  footerLink: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' },
});
