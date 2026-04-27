import { useEffect, useState, useRef, useCallback } from 'react';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { Stack, router as navRouter } from 'expo-router';
import { initChatDb, importSessionsSync } from '@/lib/chatDb';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, Text, Animated, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useAppStore, Achievement } from '@/stores/useAppStore';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { initializeNotifications } from '@/lib/notifications';
import { initAnalytics, setAnalyticsUser, updateUserProperties, trackAppOpen, trackNotificationOpen, trackStreakUpdate, getZodiacSign } from '@/lib/analytics';
import { initCrashlytics, setCrashlyticsUser, setCrashlyticsAttribute } from '@/lib/crashlytics';
import { initPurchases, checkSubscriptionStatus, addCustomerInfoListener } from '@/lib/purchases';
import { onAuthStateChanged } from '@/lib/firebaseAuth';

function AchievementToast({ achievement, onHide }: { achievement: Achievement; onHide: () => void }) {
  const { t } = useI18n();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-80)).current;
  const dismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -80, duration: 280, useNativeDriver: true }),
    ]).start(() => onHide());
  }, [onHide]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(dismiss, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', top: 56, left: 16, right: 16, zIndex: 9999,
      opacity, transform: [{ translateY }],
      backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1.5, borderColor: Colors.accent,
      shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18, shadowRadius: 16, elevation: 12,
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(245,159,11,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="trophy" size={24} color={Colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: Colors.accent, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
          {t.layout.newReward}
        </Text>
        <Text style={{ color: '#1A0A35', fontSize: 15, fontWeight: '700' }}>{achievement.title}</Text>
        <Text style={{ color: '#9B87C0', fontSize: 12 }}>{achievement.description} · +{achievement.xp} XP</Text>
      </View>
      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="close" size={20} color="#9B87C0" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function StreakToast({ streak, onHide }: { streak: number; onHide: () => void }) {
  const { t } = useI18n();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const dismissed = useRef(false);

  const dismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.85, duration: 280, useNativeDriver: true }),
    ]).start(() => onHide());
  }, [onHide]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(dismiss, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', top: 56, left: 16, right: 16, zIndex: 9999,
      opacity, transform: [{ scale }],
      backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1.5, borderColor: '#F97316',
      shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15, shadowRadius: 16, elevation: 12,
    }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(249,115,22,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="flame" size={24} color="#F97316" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#F97316', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
          {t.layout.streakUpdated}
        </Text>
        <Text style={{ color: '#1A0A35', fontSize: 16, fontWeight: '700' }}>
          {t.layout.daysInRow(streak)}
        </Text>
        <Text style={{ color: '#9B87C0', fontSize: 12 }}>{t.layout.xpForDailyLogin}</Text>
      </View>
      <TouchableOpacity onPress={dismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="close" size={20} color="#9B87C0" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function RootLayoutInner() {
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const onboardingDone = useAppStore((s) => s.onboardingCompleted);
  const [achievementToast, setAchievementToast] = useState<Achievement | null>(null);
  const [streakToast, setStreakToast] = useState<number | null>(null);

  const checkAndUpdateStreak = useAppStore((s) => s.checkAndUpdateStreak);
  const checkAchievements = useAppStore((s) => s.checkAchievements);
  const addNotification = useAppStore((s) => s.addNotification);
  const storeAuthenticated = useAppStore((s) => s.isAuthenticated);
  const syncWithServer = useAppStore((s) => s.syncWithServer);
  const userId = useAppStore((s) => s.userId);
  const showRegistrationPrompt = useAppStore((s) => s.showRegistrationPrompt);
  const dismissRegistrationPrompt = useAppStore((s) => s.dismissRegistrationPrompt);

  // Auto-sync with server on app open
  useEffect(() => {
    if (userId) {
      syncWithServer();
    }
  }, [userId]);

  // React to Firebase Auth state changes (e.g. account deleted, forced sign-out from another device)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      const store = useAppStore.getState();
      if (!firebaseUser && store.isAuthenticated) {
        // Firebase says user is gone but app still thinks they're logged in → force logout
        store.logout();
        navRouter.replace('/welcome');
      }
    });
    return unsubscribe;
  }, []);

  // Очищення застарілого кешу при оновленні версії додатку
  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
    const store = useAppStore.getState();
    const lastVersion = (store as any)._lastAppVersion as string | undefined;

    if (lastVersion && lastVersion !== currentVersion) {
      // Версія змінилась — очищаємо стале
      store.clearPendingAnalysis();
      useAppStore.setState({ aiCache: {} } as any);
      console.log(`[AppUpdate] ${lastVersion} → ${currentVersion}: cache cleared`);
    }

    // Зберігаємо поточну версію
    useAppStore.setState({ _lastAppVersion: currentVersion } as any);
  }, []);

  useEffect(() => {
    // Request App Tracking Transparency (iOS 14.5+) before initialising analytics.
    // On Android or Expo Go the library is a no-op and resolves 'unavailable'.
    const requestATT = async () => {
      if (Platform.OS !== 'ios' || Constants.appOwnership === 'expo') return;
      try {
        const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
        await requestTrackingPermissionsAsync();
        // Analytics collection is enabled by default; if denied we disable it.
        // We intentionally don't gate analytics on the result — Firebase itself
        // respects the OS-level ATT flag and won't send IDFA when denied.
      } catch {}
    };
    requestATT();

    // Initialize Firebase Analytics
    initAnalytics().then(() => {
      const s = useAppStore.getState();
      setAnalyticsUser(s.userId);
      updateUserProperties({
        premium_status: s.isPremium,
        crystal_balance: s.tokens,
        user_level: s.level,
        zodiac_sign: s.userBirthDate ? getZodiacSign(s.userBirthDate) : undefined,
        app_language: locale,
      });
      const isFirst = !s.firstOpenDate;
      const appVersion = Constants.expoConfig?.version ?? '1.0.0';
      trackAppOpen(locale, 'organic', isFirst, appVersion);

      if (isFirst) {
        const today = new Date().toISOString().split('T')[0];
        useAppStore.getState().setFirstOpenDate(today);
      }
    });

    // Initialize Firebase Crashlytics
    initCrashlytics().then(() => {
      const s = useAppStore.getState();
      setCrashlyticsUser(s.userId);
      setCrashlyticsAttribute('premium_status', String(s.isPremium));
      setCrashlyticsAttribute('app_language', locale);
    });

    // Initialise SQLite chat store (creates tables if not exists)
    initChatDb();

    // One-time migration: move existing Zustand chatSessions into SQLite, then clear from store
    const legacySessions = (useAppStore.getState() as any).chatSessions as any[];
    if (legacySessions?.length) {
      importSessionsSync(legacySessions);
      useAppStore.setState({ chatSessions: [] } as any);
    }

    // Assign a cryptographically unique guest ID on first install so data can be migrated on registration
    if (!useAppStore.getState().userId) {
      useAppStore.setState({ userId: `guest_${Crypto.randomUUID()}` });
    }

    if (storeAuthenticated) {
      // Check streak & gamification on app open
      const result = checkAndUpdateStreak();
      if (result.isNewDay) {
        trackStreakUpdate(result.newStreak);
        if (!result.streakBroken && result.newStreak > 1) {
          setTimeout(() => setStreakToast(result.newStreak), 800);
        }
        setTimeout(() => {
          const newAchievements = checkAchievements();
          if (newAchievements.length > 0) {
            setAchievementToast(newAchievements[0]);
          }
        }, result.newStreak > 1 ? 4500 : 800);

        const affirmation = t.affirmations[new Date().getDay() % t.affirmations.length];
        addNotification({
          id: `affirmation_${Date.now()}`,
          title: t.screens.affirmationOfDay,
          body: affirmation,
          type: 'affirmation',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Initialize RevenueCat purchases
    initPurchases().then((ok) => {
      if (ok) {
        checkSubscriptionStatus();
        addCustomerInfoListener();
      }
    });

    // Initialize push notifications at app level
    initializeNotifications(locale);

    // Clear expired gifts (from previous days)
    useAppStore.getState().clearExpiredGifts();

    setLoading(false);
  }, []);

  // Handle notification tap (foreground + background/killed app)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Skip in Expo Go — notifications not supported since SDK 53
    const Constants = require('expo-constants').default;
    if (Constants.appOwnership === 'expo') return;

    let sub: any;
    (async () => {
      const N = await import('expo-notifications');

      // Handle cold start: app was killed and opened via notification
      const lastResponse = await N.getLastNotificationResponseAsync();
      if (lastResponse) {
        const coldData = lastResponse.notification.request.content.data as any;
        trackNotificationOpen(coldData?.push_id, coldData?.type ?? 'unknown');
        // Re-track app_open with push source
        trackAppOpen(locale, 'push', false, Constants.expoConfig?.version ?? '1.0.0');
        if (coldData?.type === 'daily-gift') {
          setTimeout(() => navRouter.push('/(tabs)' as any), 300);
        }
        if (coldData?.type === 'analysis-ready') {
          setTimeout(() => navRouter.push('/(tabs)/matrix' as any), 300);
        }
      }

      // Handle foreground/background tap
      sub = N.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as any;
        trackNotificationOpen(data?.push_id, data?.type ?? 'unknown');
        if (data?.type === 'daily-gift') {
          setTimeout(() => navRouter.push('/(tabs)' as any), 100);
        }
        if (data?.type === 'analysis-ready') {
          setTimeout(() => navRouter.push('/(tabs)/matrix' as any), 100);
        }
      });
    })();

    return () => { sub?.remove?.(); };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.accent,
        headerTitleStyle: { fontWeight: '700', color: Colors.accent },
        contentStyle: { backgroundColor: Colors.bg },
        headerShadowVisible: false,
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
      }}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} redirect={onboardingDone} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ title: '', headerBackTitle: t.common.back }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} redirect={!storeAuthenticated} />

        {/* Matrix */}
        <Stack.Screen name="matrix/create" options={{ title: t.screens.createMatrix, presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="matrix/[id]" options={{ title: t.screens.matrix }} />
        <Stack.Screen name="matrix/compatibility" options={{ title: t.screens.compatibility, presentation: 'modal', headerRight: () => (
          <TouchableOpacity onPress={() => navRouter.back()} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color={Colors.accent} />
          </TouchableOpacity>
        ) }} />
        <Stack.Screen name="matrix/daily" options={{ title: t.screens.matrixOfDay }} />
        <Stack.Screen name="matrix/referral" options={{ title: t.screens.referralProgram }} />

        {/* AI */}
        <Stack.Screen name="ai/chat" options={{ headerShown: false }} />
        <Stack.Screen name="ai/conflict" options={{ title: t.screens.conflictAnalysis, presentation: 'modal' }} />
        <Stack.Screen name="ai/history" options={{ title: t.screens.chatHistory }} />

        {/* Learn */}
        <Stack.Screen name="learn/matrix-guide" options={{ headerShown: false }} />
        <Stack.Screen name="learn/quiz" options={{ title: t.quizStrings.quizTitle, headerShown: false }} />
        <Stack.Screen name="learn/memory" options={{ headerShown: false }} />
        <Stack.Screen name="learn/match" options={{ headerShown: false }} />
        <Stack.Screen name="learn/chakras" options={{ title: t.screens.chakras }} />
        <Stack.Screen name="learn/planets" options={{ title: t.screens.planets }} />
        <Stack.Screen name="learn/signs" options={{ title: t.screens.zodiacSigns }} />

        {/* Profile */}
        <Stack.Screen name="profile/history" options={{ title: t.screens.history }} />
        <Stack.Screen name="profile/achievements" options={{ title: t.screens.achievementsRewards }} />
        <Stack.Screen name="profile/account" options={{ title: t.screens.accountSettings }} />
        <Stack.Screen name="profile/about" options={{ title: t.screens.aboutApp }} />
        <Stack.Screen name="profile/language" options={{ headerShown: false }} />
        <Stack.Screen name="profile/notifications" options={{ headerShown: false }} />
        <Stack.Screen name="profile/privacy" options={{ headerShown: false }} />

        {/* Utility */}
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="share" options={{ title: t.screens.share, presentation: 'modal', headerRight: () => null }} />

      </Stack>

      {achievementToast && (
        <AchievementToast achievement={achievementToast} onHide={() => setAchievementToast(null)} />
      )}
      {streakToast !== null && !achievementToast && (
        <StreakToast streak={streakToast} onHide={() => setStreakToast(null)} />
      )}

      {/* Registration prompt — shown when user has no server record */}
      {showRegistrationPrompt && (
        <Animated.View style={layoutStyles.regPrompt}>
          <View style={{ flex: 1 }}>
            <Text style={layoutStyles.regTitle}>{t.layout.registerForSync}</Text>
            <Text style={layoutStyles.regSubtitle}>
              {t.layout.dataStoredLocally}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { dismissRegistrationPrompt(); navRouter.push('/auth/register' as any); }}
            style={layoutStyles.regBtn}
          >
            <Text style={layoutStyles.regBtnText}>{t.layout.registration}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={dismissRegistrationPrompt} style={layoutStyles.regClose}>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <RootLayoutInner />
    </I18nProvider>
  );
}

const layoutStyles = StyleSheet.create({
  regPrompt: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: '#1E1040',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.5)',
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    zIndex: 8888,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  regTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 2 },
  regSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 15 },
  regBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  regBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  regClose: {
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
});
