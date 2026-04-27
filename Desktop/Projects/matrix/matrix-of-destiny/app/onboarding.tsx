/**
 * Onboarding — redesigned flow per the Онбординг Матриця spec.
 * Flow: language → welcome → intent → focus → dob → generating → aha → paywall → registration → home
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, Animated, Easing, TextInput,
  KeyboardAvoidingView, ScrollView, Image, Alert, Keyboard, TouchableWithoutFeedback,
  Vibration,
} from 'react-native';
import Reanimated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { router } from 'expo-router';
import * as SecureStore from '@/lib/storage';
import { Spacing, FontSize, BorderRadius, Colors } from '@/constants/theme';
import { StarBackground } from '@/components/ui/StarBackground';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { calculateMatrix, getDailyEnergy } from '@/lib/matrix-calc';
import { getEnergyById } from '@/constants/energies';
import { EnergyBadge } from '@/components/ui/EnergyBadge';
import { askClaude } from '@/lib/claude';
import { getPositionText } from '@/constants/matrixTexts';
// import * as Localization from 'expo-localization'; // TODO: restore for multilingual
import { MatrixDiagram } from '@/components/matrix/MatrixDiagram';
import { signInWithGoogle, signInWithApple, getAuthErrorMessage } from '@/lib/firebaseAuth';
import { syncPurchasesUser, checkSubscriptionStatus } from '@/lib/purchases';
import {
  trackOnboardingStart, trackOnboardingComplete,
  trackWelcomeShown, trackWelcomeContinue, trackWelcomeSignIn,
  trackIntentScreenShown, trackIntentSelected, trackIntentContinue,
  trackFocusScreenShown, trackFocusSelected, trackFocusSkipped, trackFocusContinue,
  trackDobScreenShown, trackDobContinue,
  trackMatrixGenerationStarted, trackMatrixGenerationCompleted, trackMatrixGenerationDuration, trackMatrixGenerationFailed,
  trackAhaScreenShown, trackAhaCtaTapped, trackAhaTimeSpent,
  trackPaywallShown, trackPaywallDismissed, trackPaywallCtaTapped,
} from '@/lib/analytics';

const MAX_ONBOARDING_WIDTH = 480;
const isWeb = Platform.OS === 'web';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'language' | 'welcome' | 'intent' | 'focus' | 'gender' | 'dob' | 'generating' | 'aha' | 'paywall' | 'registration';
/** Steps shown in the top progress bar (mobile only) */
const PROGRESS_STEPS: Step[] = ['welcome', 'intent', 'focus', 'gender', 'dob'];

// ─── Data ─────────────────────────────────────────────────────────────────────
const DAYS  = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const YEARS = Array.from({ length: 71 }, (_, i) => String(1940 + i));

// ─── Wheel Picker (mobile only) ───────────────────────────────────────────────
const ITEM_H  = 48;
const VISIBLE = 5;

function WheelPicker({ data, initialIdx = 0, onChange }: {
  data: string[];
  initialIdx?: number;
  onChange: (val: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);

  const commit = (offsetY: number) => {
    const idx = Math.round(offsetY / ITEM_H);
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    onChange(data[clamped]);
  };

  return (
    <View style={styles.wheelOuter}>
      <LinearGradient
        colors={['rgba(13,11,30,1)', 'rgba(13,11,30,0)']}
        style={styles.wheelFadeTop}
        pointerEvents="none"
      />
      <View style={styles.wheelHighlight} pointerEvents="none" />
      <LinearGradient
        colors={['rgba(13,11,30,0)', 'rgba(13,11,30,1)']}
        style={styles.wheelFadeBottom}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        overScrollMode="always"
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
        onLayout={() => {
          setTimeout(() => {
            scrollRef.current?.scrollTo({ y: initialIdx * ITEM_H, animated: false });
          }, 50);
        }}
        onMomentumScrollEnd={(e) => commit(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e)      => commit(e.nativeEvent.contentOffset.y)}
      >
        {data.map((item, i) => (
          <View key={i} style={styles.wheelItem}>
            <Text style={styles.wheelItemText}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Web-only components ──────────────────────────────────────────────────────

/** Step-progress dots + card wrapper used in web steps */
function WebCard({ children, stepNum }: { children: React.ReactNode; stepNum: number }) {
  const TOTAL = 5; // welcome, intent, focus, gender, dob
  return (
    <View style={ws.card}>
      <View style={ws.dots}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <View
            key={i}
            style={[
              ws.dot,
              i < stepNum - 1 && ws.dotDone,
              i === stepNum - 1 && ws.dotActive,
            ]}
          />
        ))}
      </View>
      {children}
    </View>
  );
}

function WebBack({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <TouchableOpacity onPress={onPress} style={ws.backBtn}>
      <Ionicons name="chevron-back" size={15} color="rgba(255,255,255,0.45)" />
      <Text style={ws.backText}>{t.common.back}</Text>
    </TouchableOpacity>
  );
}

function WebBtn({
  onPress, disabled = false, children,
}: {
  onPress: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={disabled ? 0.5 : 0.82}
      style={ws.btnWrap}
    >
      <LinearGradient
        colors={disabled ? ['#2a2a2a', '#3a3a3a'] : ['#C8901A', '#F5C542', '#C8901A']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={ws.btn}
      >
        {children}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function WebStepper({ label, value, onDec, onInc }: {
  label: string; value: string; onDec: () => void; onInc: () => void;
}) {
  return (
    <View style={ws.stepper}>
      <Text style={ws.stepperLabel}>{label}</Text>
      <View style={ws.stepperControl}>
        <TouchableOpacity style={ws.arrowBtn} onPress={onDec} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.65)" />
        </TouchableOpacity>
        <Text style={ws.stepperVal}>{value}</Text>
        <TouchableOpacity style={ws.arrowBtn} onPress={onInc} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.65)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Entrance animation hook ──────────────────────────────────────────────────
function useEntrance() {
  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return { fadeIn, slideUp };
}

// ─── Step 0: Language ─────────────────────────────────────────────────────────
function LanguageStep({ onNext }: { onNext: () => void }) {
  const { setLocale } = useI18n();
  const { fadeIn, slideUp } = useEntrance();

  const LANGS = [
    { code: 'en', flag: '🇺🇸', label: 'English (US)' },
    { code: 'en-GB', flag: '🇬🇧', label: 'English (UK)' },
    { code: 'uk', flag: '🇺🇦', label: 'Українська' },
  ];

  const pick = (code: string) => {
    setLocale(code);
    onNext();
  };

  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: Colors.accent, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 4, marginBottom: Spacing.sm }}>DESTINY MATRIX</Text>
        <Text style={{ color: Colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: Spacing.xl }}>Choose your language</Text>
        <View style={{ width: '100%', gap: Spacing.sm }}>
          {LANGS.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              activeOpacity={0.8}
              onPress={() => pick(lang.code)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: 'rgba(22,10,55,0.8)',
                paddingVertical: 18,
                paddingHorizontal: 20,
                borderRadius: BorderRadius.lg,
                borderWidth: 1,
                borderColor: 'rgba(139,92,246,0.3)',
              }}
            >
              <Text style={{ fontSize: 28 }}>{lang.flag}</Text>
              <Text style={{ color: Colors.text, fontSize: FontSize.md, fontWeight: '600', flex: 1 }}>{lang.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────
function WelcomeStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const { fadeIn, slideUp } = useEntrance();

  // ── Cosmos background slow rotation ──
  const cosmosRot = useRef(new Animated.Value(0)).current;

  // ── Cascade animation values ──
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY       = useRef(new Animated.Value(14)).current;

  const line1Opacity = useRef(new Animated.Value(0)).current;
  const line1Y       = useRef(new Animated.Value(12)).current;
  const line2Opacity = useRef(new Animated.Value(0)).current;
  const line2Y       = useRef(new Animated.Value(12)).current;
  const line3Opacity = useRef(new Animated.Value(0)).current;
  const line3Y       = useRef(new Animated.Value(12)).current;

  const descOpacity = useRef(new Animated.Value(0)).current;

  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnY       = useRef(new Animated.Value(28)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;
  const btnGlow    = useRef(new Animated.Value(0.2)).current;

  const T = (val: Animated.Value, to: number, delay: number, dur = 380) =>
    Animated.timing(val, { toValue: to, duration: dur, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });

  useEffect(() => {
    // Cosmos slow rotation — independent loop
    Animated.loop(
      Animated.timing(cosmosRot, { toValue: 1, duration: 80000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // Cascade choreography — all start in parallel with staggered delays
    Animated.parallel([
      T(subtitleOpacity, 1, 150),
      T(subtitleY,       0, 150),
      T(line1Opacity,    1, 350),
      T(line1Y,          0, 350),
      T(line2Opacity,    1, 480),
      T(line2Y,          0, 480),
      T(line3Opacity,    1, 610),
      T(line3Y,          0, 610),
      T(descOpacity,     1, 850),
      Animated.timing(btnOpacity, { toValue: 1, duration: 420, delay: 1050, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(btnY,       { toValue: 0, duration: 480, delay: 1050, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }),
    ]).start(() => {
      // Micro-pulse once the button has appeared
      Animated.sequence([
        Animated.spring(btnScale, { toValue: 1.06, tension: 400, friction: 5, useNativeDriver: true }),
        Animated.spring(btnScale, { toValue: 1,    tension: 180, friction: 8, useNativeDriver: true }),
      ]).start();
      // Breathing glow loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(btnGlow, { toValue: 0.85, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(btnGlow, { toValue: 0.2,  duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const cosmosRotStyle = {
    transform: [{ rotate: cosmosRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
  };

  /* ── Web ── */
  if (isWeb) {
    return (
      <Animated.View style={[ws.stepOuter, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <View style={ws.card}>
          <View style={ws.logoRow}>
            <LinearGradient colors={['#C8901A', '#F5C542']} style={ws.logoIcon}>
              <Text style={ws.logoIconText}>✦</Text>
            </LinearGradient>
            <View>
              <Text style={ws.logoTitle}>DESTINY MATRIX</Text>
              <Text style={ws.logoSub}>Your personal guide</Text>
            </View>
          </View>

          <Text style={ws.title}>Discover what's written in your date of birth</Text>
          <Text style={ws.sub}>Matrix of Destiny — AI guidance for self-discovery, relationships, and life path</Text>

          <WebBtn onPress={onNext}>
            <Text style={ws.btnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={15} color="#1A0800" />
          </WebBtn>

          <TouchableOpacity onPress={onBack} style={[styles.skipLink, { marginTop: 12 }]}>
            <Text style={styles.skipLinkText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  /* ── Mobile ── */
  return (
    <View style={{ flex: 1 }}>
      {/* Cosmos nebula — very slow rotation */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, cosmosRotStyle, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <View style={{
          width: 520, height: 520, borderRadius: 260,
          backgroundColor: 'transparent',
          shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.25, shadowRadius: 120,
          opacity: 0.45,
        }} />
      </Animated.View>

      {/* Main content */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg }}>
        {/* Subtitle */}
        <Animated.Text style={{
          color: Colors.accent, fontSize: FontSize.xs, fontWeight: '800',
          letterSpacing: 4, marginBottom: Spacing.md,
          opacity: subtitleOpacity, transform: [{ translateY: subtitleY }],
        }}>
          МАТРИЦЯ ДОЛІ
        </Animated.Text>

        {/* Title — each line cascades */}
        <Animated.Text style={[styles.welcomeTitle, { opacity: line1Opacity, transform: [{ translateY: line1Y }] }]}>
          Дізнайся, що
        </Animated.Text>
        <Animated.Text style={[styles.welcomeTitle, { opacity: line2Opacity, transform: [{ translateY: line2Y }] }]}>
          записано у твоїй
        </Animated.Text>
        <Animated.Text style={[styles.welcomeTitle, { opacity: line3Opacity, transform: [{ translateY: line3Y }], marginBottom: Spacing.lg }]}>
          даті народження
        </Animated.Text>

        {/* Description */}
        <Animated.Text style={[styles.stepSub, { textAlign: 'center', color: 'rgba(255,255,255,0.78)', opacity: descOpacity }]}>
          Матриця Долі — AI-провідник для самопізнання, стосунків та життєвого шляху
        </Animated.Text>
      </View>

      {/* CTA button with glow */}
      <View style={[styles.bottomBtn, { paddingBottom: Platform.OS === 'ios' ? 48 : 56 }]}>
        <Animated.View style={{ opacity: btnOpacity, transform: [{ translateY: btnY }, { scale: btnScale }] }}>
          {/* Breathing glow halo */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
            borderRadius: BorderRadius.full + 4,
            backgroundColor: 'rgba(245,197,66,0.28)',
            opacity: btnGlow,
          }]} />
          <TouchableOpacity onPress={onNext} activeOpacity={0.85}>
            <LinearGradient
              colors={['#C8901A', '#F5C542', '#C8901A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.bigBtn}
            >
              <Text style={styles.bigBtnTextDark}>{t.onboarding.next}</Text>
              <Ionicons name="arrow-forward" size={18} color="#1A0800" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Step 2: Intent ───────────────────────────────────────────────────────────
function IntentStep({ onNext, onBack }: {
  onNext: (intent: string) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);
  const { fadeIn, slideUp } = useEntrance();
  // Button activation animation
  const btnScale = useRef(new Animated.Value(1)).current;
  const btnOpacity = useRef(new Animated.Value(0.45)).current;
  const prevCanContinue = useRef(false);

  const OPTIONS = [
    { id: 'self',      icon: 'person-circle-outline' as const, label: t.onboarding.intent1 },
    { id: 'relations', icon: 'heart-outline'          as const, label: t.onboarding.intent2 },
    { id: 'path',      icon: 'navigate-outline'       as const, label: t.onboarding.intent3 },
    { id: 'daily',     icon: 'sunny-outline'          as const, label: t.onboarding.intent4 },
    { id: 'matrix',     icon: 'sparkles-outline'       as const, label: t.onboarding.intent5 },
  ];
  const canContinue = selected.length > 0;

  useEffect(() => {
    if (canContinue && !prevCanContinue.current) {
      // Button "activates" with pulse
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(btnScale, { toValue: 1.06, tension: 300, friction: 5, useNativeDriver: true }),
          Animated.spring(btnScale, { toValue: 1,    tension: 180, friction: 8, useNativeDriver: true }),
        ]),
      ]).start();
    } else if (!canContinue) {
      Animated.timing(btnOpacity, { toValue: 0.45, duration: 200, useNativeDriver: true }).start();
    }
    prevCanContinue.current = canContinue;
  }, [canContinue]);

  const toggleOption = (id: string) => {
    Vibration.vibrate(20);
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const renderOption = (item: typeof OPTIONS[0], index: number) => {
    const active = selected.includes(item.id);
    const tapScale = useRef(new Animated.Value(1)).current;
    const checkScale = useRef(new Animated.Value(active ? 1 : 0)).current;

    const handlePress = () => {
      // Scale bounce on tap
      Animated.sequence([
        Animated.spring(tapScale, { toValue: 0.96, tension: 400, friction: 6, useNativeDriver: true }),
        Animated.spring(tapScale, { toValue: 1,    tension: 200, friction: 8, useNativeDriver: true }),
      ]).start();
      // Checkmark pop-in
      if (!active) {
        Animated.spring(checkScale, { toValue: 1, tension: 350, friction: 5, useNativeDriver: true }).start();
      } else {
        Animated.timing(checkScale, { toValue: 0, duration: 100, useNativeDriver: true }).start();
      }
      toggleOption(item.id);
    };

    return (
      <Reanimated.View key={item.id} entering={FadeInUp.delay(index * 80).duration(350).springify()}>
        <Animated.View style={{ transform: [{ scale: tapScale }] }}>
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={1}
            style={[styles.listRow, active && styles.listRowActive]}
          >
            {active && (
              <LinearGradient
                colors={['rgba(139,92,246,0.22)', 'rgba(91,33,182,0.10)']}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={[styles.listIcon, active && styles.listIconActive]}>
              <Ionicons name={item.icon} size={22} color={active ? '#F5C542' : 'rgba(255,255,255,0.6)'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listLabel, active && styles.listLabelActive]}>{item.label}</Text>
            </View>
            <Animated.View style={[styles.radio, active && styles.radioActive, { transform: [{ scale: checkScale }] }]}>
              {active && <Ionicons name="checkmark" size={14} color="#F5C542" />}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Reanimated.View>
    );
  };

  /* ── Web ── */
  if (isWeb) {
    return (
      <Animated.View style={[ws.stepOuter, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <WebCard stepNum={1}>
          <WebBack onPress={onBack} />
          <Text style={ws.title}>{t.onboarding.intentTitle.replace('\n', ' ')}</Text>
          <Text style={ws.sub}>{t.onboarding.intentSub}</Text>
          <View style={{ gap: 0, marginBottom: Spacing.sm }}>
            {OPTIONS.map((o, i) => renderOption(o, i))}
          </View>
          <WebBtn onPress={() => onNext(selected.join(','))} disabled={!canContinue}>
            <Text style={[ws.btnText, !canContinue && { color: 'rgba(255,255,255,0.35)' }]}>{t.onboarding.next}</Text>
            <Ionicons name="arrow-forward" size={15} color={canContinue ? '#1A0800' : 'rgba(255,255,255,0.35)'} />
          </WebBtn>
        </WebCard>
      </Animated.View>
    );
  }

  /* ── Mobile ── */
  return (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>{t.onboarding.intentTitle}</Text>
        <Text style={styles.stepSub}>{t.onboarding.intentSub}</Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: Spacing.lg }}>
        {OPTIONS.map((o, i) => renderOption(o, i))}
      </View>
      <View style={styles.bottomBtn}>
        <Animated.View style={{ opacity: btnOpacity, transform: [{ scale: btnScale }] }}>
          <TouchableOpacity onPress={() => { if (canContinue) { Vibration.vibrate(30); onNext(selected.join(',')); } }} activeOpacity={canContinue ? 0.85 : 1}>
            <LinearGradient
              colors={canContinue ? ['#C8901A', '#F5C542', '#C8901A'] : ['#2a2240', '#3a2e5a']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.bigBtn}
            >
              <Text style={[styles.bigBtnTextDark, !canContinue && { color: 'rgba(255,255,255,0.35)' }]}>{t.onboarding.next}</Text>
              <Ionicons name="arrow-forward" size={18} color={canContinue ? '#1A0800' : 'rgba(255,255,255,0.35)'} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── Step 3: Focus / Pain ──────────────────────────────────────────────────────
function FocusStep({ onNext, onBack }: {
  onNext: (focus: string) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);
  const { fadeIn, slideUp } = useEntrance();

  const OPTIONS = [
    { id: 'clarity',    icon: 'bulb-outline'          as const, label: t.onboarding.focus1 },
    { id: 'relations',  icon: 'heart-outline'          as const, label: t.onboarding.focus2 },
    { id: 'strengths',  icon: 'star-outline'           as const, label: t.onboarding.focus3 },
    { id: 'direction',  icon: 'compass-outline'        as const, label: t.onboarding.focus4 },
    { id: 'daily',      icon: 'notifications-outline'  as const, label: t.onboarding.focus5 },
  ];
  const canContinue = selected.length > 0;

  const toggleOption = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const renderOption = (item: typeof OPTIONS[0], index: number) => {
    const active = selected.includes(item.id);
    const tapScale = useRef(new Animated.Value(1)).current;
    const checkScale = useRef(new Animated.Value(active ? 1 : 0)).current;
    const handlePress = () => {
      Animated.sequence([
        Animated.spring(tapScale, { toValue: 0.96, tension: 400, friction: 6, useNativeDriver: true }),
        Animated.spring(tapScale, { toValue: 1,    tension: 200, friction: 8, useNativeDriver: true }),
      ]).start();
      if (!active) Animated.spring(checkScale, { toValue: 1, tension: 350, friction: 5, useNativeDriver: true }).start();
      else Animated.timing(checkScale, { toValue: 0, duration: 100, useNativeDriver: true }).start();
      Vibration.vibrate(20);
      toggleOption(item.id);
    };
    return (
      <Reanimated.View key={item.id} entering={FadeInUp.delay(index * 80).duration(350).springify()}>
        <Animated.View style={{ transform: [{ scale: tapScale }] }}>
          <TouchableOpacity onPress={handlePress} activeOpacity={1} style={[styles.listRow, active && styles.listRowActive]}>
            {active && <LinearGradient colors={['rgba(139,92,246,0.22)', 'rgba(91,33,182,0.10)']} style={StyleSheet.absoluteFill} />}
            <View style={[styles.listIcon, active && styles.listIconActive]}>
              <Ionicons name={item.icon} size={22} color={active ? '#F5C542' : 'rgba(255,255,255,0.6)'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listLabel, active && styles.listLabelActive]}>{item.label}</Text>
            </View>
            <Animated.View style={[styles.radio, active && styles.radioActive, { transform: [{ scale: checkScale }] }]}>
              {active && <Ionicons name="checkmark" size={14} color="#F5C542" />}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Reanimated.View>
    );
  };

  /* ── Web ── */
  if (isWeb) {
    return (
      <Animated.View style={[ws.stepOuter, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <WebCard stepNum={2}>
          <WebBack onPress={onBack} />
          <Text style={ws.title}>{t.onboarding.focusTitle.replace('\n', ' ')}</Text>
          <Text style={ws.sub}>{t.onboarding.focusSingleSub}</Text>
          <View style={{ gap: 0, marginBottom: Spacing.sm }}>
            {OPTIONS.map((o, i) => renderOption(o, i))}
          </View>
          <WebBtn onPress={() => onNext(selected.join(','))} disabled={!canContinue}>
            <Text style={[ws.btnText, !canContinue && { color: 'rgba(255,255,255,0.35)' }]}>{t.onboarding.next}</Text>
            <Ionicons name="arrow-forward" size={15} color={canContinue ? '#1A0800' : 'rgba(255,255,255,0.35)'} />
          </WebBtn>
        </WebCard>
      </Animated.View>
    );
  }

  /* ── Mobile ── */
  return (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>{t.onboarding.focusTitle}</Text>
        <Text style={styles.stepSub}>{t.onboarding.focusSingleSub}</Text>
      </View>
      <View style={{ flex: 1, paddingHorizontal: Spacing.lg }}>
        {OPTIONS.map((o, i) => renderOption(o, i))}
      </View>
      <View style={styles.bottomBtn}>
        <TouchableOpacity onPress={() => { if (canContinue) { Vibration.vibrate(30); onNext(selected.join(',')); } }} activeOpacity={canContinue ? 0.85 : 1}>
          <LinearGradient
            colors={canContinue ? ['#C8901A', '#F5C542', '#C8901A'] : ['#2a2240', '#3a2e5a']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.bigBtn}
          >
            <Text style={[styles.bigBtnTextDark, !canContinue && { color: 'rgba(255,255,255,0.35)' }]}>{t.onboarding.next}</Text>
            <Ionicons name="arrow-forward" size={18} color={canContinue ? '#1A0800' : 'rgba(255,255,255,0.35)'} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Step 4: Gender ───────────────────────────────────────────────────────────
function GenderStep({ onNext, onBack }: { onNext: (gender: 'male' | 'female') => void; onBack: () => void }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<'male' | 'female' | null>(null);
  const { fadeIn, slideUp } = useEntrance();

  const GENDERS = [
    { id: 'male' as const,   icon: 'male-outline' as const,   emoji: '♂️', label: t.onboarding.genderMale },
    { id: 'female' as const, icon: 'female-outline' as const, emoji: '♀️', label: t.onboarding.genderFemale },
  ];

  const renderOption = (g: typeof GENDERS[0]) => {
    const active = selected === g.id;
    return (
      <TouchableOpacity
        key={g.id}
        onPress={() => setSelected(g.id)}
        activeOpacity={0.8}
        style={[styles.listRow, active && styles.listRowActive]}
      >
        {active && (
          <LinearGradient
            colors={['rgba(139,92,246,0.2)', 'rgba(91,33,182,0.1)']}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={[styles.listIcon, active && styles.listIconActive]}>
          <Ionicons name={g.icon} size={22} color={active ? '#F5C542' : 'rgba(255,255,255,0.6)'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.listLabel, active && styles.listLabelActive]}>{g.label}</Text>
        </View>
        <View style={[styles.radio, active && styles.radioActive]}>
          {active && <View style={styles.radioDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  /* ── Web ── */
  if (isWeb) {
    return (
      <Animated.View style={[ws.stepOuter, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <WebCard stepNum={3}>
          <WebBack onPress={onBack} />
          <Text style={ws.title}>{t.onboarding.chooseGender}</Text>
          <Text style={ws.sub}>{t.onboarding.chooseGenderSub}</Text>
          <View style={{ gap: 0, marginBottom: Spacing.sm }}>{GENDERS.map(renderOption)}</View>
          <WebBtn onPress={() => selected && onNext(selected)} disabled={!selected}>
            <Text style={[ws.btnText, !selected && { color: 'rgba(255,255,255,0.35)' }]}>{t.onboarding.next}</Text>
            <Ionicons name="arrow-forward" size={15} color={selected ? '#1A0800' : 'rgba(255,255,255,0.35)'} />
          </WebBtn>
        </WebCard>
      </Animated.View>
    );
  }

  /* ── Mobile ── */
  return (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={styles.stepTitle}>{t.onboarding.chooseGender}</Text>
        <Text style={styles.stepSub}>{t.onboarding.chooseGenderSub}</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg }}>
        {GENDERS.map(renderOption)}
      </View>
      <View style={styles.bottomBtn}>
        <TouchableOpacity onPress={() => selected && onNext(selected)} activeOpacity={selected ? 0.85 : 0.5} disabled={!selected}>
          <LinearGradient
            colors={selected ? ['#C8901A', '#F5C542', '#C8901A'] : ['#333', '#444']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.bigBtn}
          >
            <Text style={[styles.bigBtnTextDark, !selected && { color: 'rgba(255,255,255,0.4)' }]}>{t.onboarding.next}</Text>
            <Ionicons name="arrow-forward" size={18} color={selected ? '#1A0800' : 'rgba(255,255,255,0.4)'} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Step 5: Date of Birth ────────────────────────────────────────────────────
// (WebCard stepNum=4 — gender is step 3)
function BirthDateStep({ onNext, onBack }: {
  onNext: (birthDate: string, name: string) => void;
  onBack: () => void;
}) {
  const { t, locale } = useI18n();
  const isUk = locale === 'uk';
  const MONTHS = t.onboarding.months as string[];
  const [userName, setUserName] = useState('');
  const [day,   setDay]   = useState('15');
  const [month, setMonth] = useState(MONTHS[5]);
  const [year,  setYear]  = useState('1990');

  const [manualMode,  setManualMode]  = useState(false);
  const [manualInput, setManualInput] = useState('15.06.1990');
  const [manualError, setManualError] = useState('');

  const { fadeIn, slideUp } = useEntrance();

  const handleNext = () => {
    const mm = String(MONTHS.indexOf(month) + 1).padStart(2, '0');
    onNext(`${day}.${mm}.${year}`, userName.trim());
  };

  const handleManualChange = (text: string) => {
    let v = text.replace(/[^\d.]/g, '');
    if (v.length === 2 && manualInput.length === 1) v = v + '.';
    if (v.length === 5 && manualInput.length === 4) v = v + '.';
    setManualInput(v);
    setManualError('');
    const parts = v.split('.');
    if (parts.length === 3 && parts[2].length === 4) {
      const d = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const y = parseInt(parts[2]);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1940 && y <= 2015) {
        setDay(String(d).padStart(2, '0'));
        setMonth(MONTHS[m - 1]);
        setYear(String(y));
      }
    }
  };

  const validateAndNext = () => {
    const parts = manualInput.trim().split('.');
    if (parts.length !== 3 || parts[2].length < 4) { setManualError(t.onboarding.invalidDateFormat); return; }
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const y = parseInt(parts[2]);
    if (isNaN(d) || d < 1  || d > 31)   { setManualError(t.onboarding.invalidDay);    return; }
    if (isNaN(m) || m < 1  || m > 12)   { setManualError(t.onboarding.invalidMonth);  return; }
    if (isNaN(y) || y < 1920) { setManualError(t.onboarding.invalidYear); return; }
    const inputDate = new Date(y, m - 1, d);
    if (inputDate > new Date()) { setManualError(isUk ? 'Дата не може бути в майбутньому' : 'Date cannot be in the future'); return; }
    if (new Date().getFullYear() - y < 5) { setManualError(t.onboarding.invalidYear); return; }
    const mm = String(m).padStart(2, '0');
    onNext(`${String(d).padStart(2, '0')}.${mm}.${y}`, userName.trim());
  };

  const toggleMode = () => {
    if (!manualMode) {
      const mm = String(MONTHS.indexOf(month) + 1).padStart(2, '0');
      setManualInput(`${day}.${mm}.${year}`);
      setManualError('');
    }
    setManualMode((m) => !m);
  };

  /* ── Web ── */
  if (isWeb) {
    return (
      <Animated.View style={[ws.stepOuter, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <WebCard stepNum={4}>
          <WebBack onPress={onBack} />
          <Text style={ws.title}>{t.onboarding.dobTitle.replace('\n', ' ')}</Text>
          <Text style={ws.sub}>{t.onboarding.dobSub}</Text>

          <View style={ws.lockRow}>
            <Ionicons name="lock-closed-outline" size={11} color="rgba(245,197,66,0.65)" />
            <Text style={ws.lockText}>{t.onboarding.storedOnDevice}</Text>
          </View>

          <TouchableOpacity onPress={toggleMode} style={ws.modeToggle} activeOpacity={0.7}>
            <Ionicons name={manualMode ? 'apps-outline' : 'create-outline'} size={12} color={Colors.accent} />
            <Text style={ws.modeToggleText}>{manualMode ? t.onboarding.chooseWithArrows : t.onboarding.enterManually}</Text>
          </TouchableOpacity>

          {manualMode ? (
            <View style={{ marginBottom: 8 }}>
              <View style={[styles.inputWrap, manualError ? ws.inputError : null]}>
                <Ionicons name="calendar-outline" size={18} color={Colors.accent} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.input}
                  placeholder="DD.MM.YYYY"
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  value={manualInput}
                  onChangeText={handleManualChange}
                  keyboardType="numeric"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={validateAndNext}
                  autoFocus
                />
              </View>
              {!!manualError && <Text style={ws.errorText}>{manualError}</Text>}
            </View>
          ) : (
            <View style={ws.dateRow}>
              <WebStepper label={t.onboarding.day} value={day}
                onDec={() => setDay(String(Math.max(1, parseInt(day) - 1)).padStart(2, '0'))}
                onInc={() => setDay(String(Math.min(31, parseInt(day) + 1)).padStart(2, '0'))}
              />
              <View style={ws.dateDivider} />
              <WebStepper label={t.onboarding.month} value={month}
                onDec={() => setMonth(MONTHS[Math.max(0, MONTHS.indexOf(month) - 1)])}
                onInc={() => setMonth(MONTHS[Math.min(11, MONTHS.indexOf(month) + 1)])}
              />
              <View style={ws.dateDivider} />
              <WebStepper label={t.onboarding.year} value={year}
                onDec={() => setYear(String(Math.max(1940, parseInt(year) - 1)))}
                onInc={() => setYear(String(Math.min(2015, parseInt(year) + 1)))}
              />
            </View>
          )}

          <WebBtn onPress={manualMode ? validateAndNext : handleNext}>
            <Text style={ws.btnText}>{t.onboarding.dobCta}</Text>
            <Ionicons name="arrow-forward" size={15} color="#1A0800" />
          </WebBtn>

          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 12, textAlign: 'center' }}>
            {t.onboarding.dobPrivacy}
          </Text>
        </WebCard>
      </Animated.View>
    );
  }

  /* ── Mobile ── */
  return (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.stepHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <Text style={[styles.stepTitle, { fontSize: FontSize.xl }]}>{t.onboarding.dobTitle}</Text>
        <Text style={[styles.stepSub, { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.xs, marginBottom: 4 }]}>{t.onboarding.dobSub}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Ionicons name="lock-closed-outline" size={10} color="rgba(245,197,66,0.75)" />
          <Text style={{ color: 'rgba(245,197,66,0.75)', fontSize: 10 }}>{t.onboarding.storedOnDevice}</Text>
        </View>
      </View>
      </TouchableWithoutFeedback>
      <View style={{ flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
        <TextInput
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BorderRadius.lg, padding: Spacing.sm, color: Colors.text, fontSize: FontSize.md, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', marginBottom: Spacing.sm }}
          placeholder={isUk ? 'Ваше ім\'я' : 'Your name'}
          placeholderTextColor={Colors.textMuted}
          value={userName}
          onChangeText={setUserName}
          autoCapitalize="words"
          maxLength={30}
        />
        <View style={styles.wheelsRow}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <WheelPicker data={DAYS} initialIdx={DAYS.indexOf('15')} onChange={setDay} />
            <Text style={styles.wheelLabel}>{t.onboarding.day}</Text>
          </View>
          <View style={styles.wheelsDivider} />
          <View style={{ flex: 2, alignItems: 'center' }}>
            <WheelPicker data={MONTHS} initialIdx={5} onChange={setMonth} />
            <Text style={styles.wheelLabel}>{t.onboarding.month}</Text>
          </View>
          <View style={styles.wheelsDivider} />
          <View style={{ flex: 1.3, alignItems: 'center' }}>
            <WheelPicker data={YEARS} initialIdx={YEARS.indexOf('1990')} onChange={setYear} />
            <Text style={styles.wheelLabel}>{t.onboarding.year}</Text>
          </View>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, textAlign: 'center', marginTop: 6 }}>
          {t.onboarding.dobPrivacy}
        </Text>
      </View>
      <View style={styles.bottomBtn}>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85} disabled={!userName.trim()}>
          <LinearGradient
            colors={userName.trim() ? ['#C8901A', '#F5C542', '#C8901A'] : ['#3A3A4A', '#4A4A5A', '#3A3A4A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.bigBtn, !userName.trim() && { opacity: 0.5 }]}
          >
            <Text style={styles.bigBtnTextDark}>{t.onboarding.dobCta}</Text>
            <Ionicons name="arrow-forward" size={18} color="#1A0800" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Step 5: Generating ────────────────────────────────────────────────────────
function GeneratingStep({ onDone, birthDate }: { onDone: () => void; birthDate: string }) {
  const { t } = useI18n();
  const GEN_STEPS = [
    t.onboarding.genStep1,
    t.onboarding.genStep2,
    t.onboarding.genStep3,
    t.onboarding.genStep4,
    t.onboarding.genReady,
  ];
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone]       = useState(false);
  const progress   = useRef(new Animated.Value(0)).current;
  const fadeIn     = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkFade  = useRef(new Animated.Value(0)).current;

  // Video sphere
  const spherePlayer = useVideoPlayer(require('../assets/onboarding_sphere.mp4'), (player) => {
    player.muted = true;
    player.loop = true;
    if ('audioMixingMode' in player) (player as any).audioMixingMode = 'mixWithOthers';
    player.play();
  });

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    let idx = 0;
    const tick = () => {
      if (idx >= GEN_STEPS.length - 1) {
        setStepIdx(GEN_STEPS.length - 1);
        setDone(true);
        Animated.sequence([
          Animated.timing(checkFade,  { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(checkScale, { toValue: 1, tension: 50, friction: 6, useNativeDriver: true }),
        ]).start();
        Animated.timing(progress, { toValue: 1, duration: 600, useNativeDriver: false }).start();
        setTimeout(onDone, 1800);
        return;
      }
      idx++;
      setStepIdx(idx);
      Animated.timing(progress, {
        toValue: idx / (GEN_STEPS.length - 1),
        duration: 500,
        useNativeDriver: false,
      }).start();
      setTimeout(tick, 900);
    };
    setTimeout(tick, 800);
  }, []);

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.planContainer, { opacity: fadeIn }]}>
      <View style={{ alignItems: 'center', marginBottom: 40 }}>
        <View style={styles.sphereVideoWrap}>
          {/* Static first frame */}
          <Image
            source={require('../assets/sphere_frame.jpg')}
            style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
            resizeMode="cover"
          />
          {/* Video sphere */}
          <VideoView
            player={spherePlayer}
            style={[StyleSheet.absoluteFill, { borderRadius: 999 }]}
            contentFit="cover"
            nativeControls={false}
          />
          {/* Subtle glow border */}
          <View style={[StyleSheet.absoluteFill, { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' }]} pointerEvents="none" />
          {done && (
            <Animated.View style={[styles.sphereCheckOverlay, { opacity: checkFade, transform: [{ scale: checkScale }] }]}>
              <LinearGradient colors={['#C8901A', '#F5C542']} style={styles.planDoneGrad}>
                <Ionicons name="checkmark" size={48} color="#1A0800" />
              </LinearGradient>
            </Animated.View>
          )}
        </View>
      </View>

      <Text style={styles.planTitle}>{done ? t.onboarding.genReady : t.onboarding.generatingTitle.replace('\n', ' ')}</Text>
      <Text style={styles.planSubtitle}>{done ? t.onboarding.genReadyDesc : GEN_STEPS[stepIdx]}</Text>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <View style={styles.planStepsList}>
        {GEN_STEPS.slice(0, -1).map((s, i) => (
          <View key={i} style={styles.planStepRow}>
            <View style={[
              styles.planStepDot,
              i < stepIdx && styles.planStepDotDone,
              i === stepIdx && styles.planStepDotActive,
            ]}>
              {i < stepIdx
                ? <Ionicons name="checkmark" size={10} color="#fff" />
                : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === stepIdx ? '#F5C542' : 'rgba(255,255,255,0.2)' }} />
              }
            </View>
            <Text style={[
              styles.planStepText,
              i < stepIdx  && { color: '#A78BFA' },
              i === stepIdx && { color: '#F5C542', fontWeight: '600' },
            ]}>{s}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Aha Teaser text tables ───────────────────────────────────────────────────
type IntentKey = 'self' | 'relations' | 'path' | 'daily' | 'matrix';

const AHA_TEASERS_UK: Record<IntentKey, [string, string, string]> = {
  self:      ['Ти тонко відчуваєш людей і настрій навколо себе', 'У тебе є природна інтуїція та внутрішній компас', 'Твій головний ресурс — глибина мислення та самоаналіз'],
  relations: ['Ти природний посередник, здатний знаходити спільну мову', 'У тебе є магнетизм та здатність притягувати близьких людей', 'Твоя матриця вказує на сильний потенціал у стосунках'],
  path:      ['Твоя дата народження несе в собі особливе призначення', 'У тебе є унікальні таланти, що чекають на реалізацію', 'Твій шлях — через самопізнання до зовнішнього успіху'],
  daily:     ['Твої енергетичні цикли підпорядковані особливому ритму', 'Є моменти, коли твоя інтуїція особливо загострена', 'Матриця допоможе тобі обирати найкращі дні для дій'],
  matrix:    ['У тебе висока чутливість до символів та образів', "Ти маєш природний зв'язок з архетипами підсвідомості", 'Енергії для тебе — точне дзеркало внутрішніх процесів'],
};

const AHA_TEASERS_EN: Record<IntentKey, [string, string, string]> = {
  self:      ['You subtly sense people and the mood around you', 'You have a natural intuition and inner compass', 'Your main resource is depth of thought and self-reflection'],
  relations: ['You are a natural mediator able to find common ground', 'You have a magnetism that draws the right people close', 'Your matrix indicates strong relationship potential'],
  path:      ['Your birth date carries a special purpose', 'You have unique talents waiting to be unlocked', 'Your path runs through self-discovery to outer success'],
  daily:     ['Your energy cycles follow a unique personal rhythm', 'There are moments when your intuition is especially sharp', 'Your matrix helps you choose the best days for action'],
  matrix:    ['You have a high sensitivity to symbols and imagery', 'You have a natural connection with archetypal energies', 'Energies serve as a precise mirror of your inner world'],
};

// ─── Step 6: Aha Teaser ────────────────────────────────────────────────────────
function AhaTeaserStep({ onNext, intent, birthDate }: { onNext: () => void; intent: string; birthDate: string }) {
  const { t, locale } = useI18n();
  const { fadeIn, slideUp } = useEntrance();
  const isUk = locale === 'uk';
  const ahaStartTime = useRef(Date.now());

  const [aiTeaser, setAiTeaser] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  // Daily energy
  const today = new Date();
  const dailyEnergyId = getDailyEnergy(today);
  const dailyEnergy = getEnergyById(dailyEnergyId);

  // User's personal matrix — convert DD.MM.YYYY → YYYY-MM-DD
  const matrixData = React.useMemo(() => {
    if (!birthDate) return null;
    try {
      const parts = birthDate.split('.');
      const dateStr = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : birthDate;
      return calculateMatrix(dateStr);
    } catch { return null; }
  }, [birthDate]);

  // Daily matrix for blurred grid
  const dailyMatrix = React.useMemo(() => {
    try { return calculateMatrix(today.toISOString().split('T')[0]); } catch { return null; }
  }, []);

  // AI comparison on mount
  useEffect(() => {
    if (!matrixData) { setAiLoading(false); return; }
    const personalEnergy = getEnergyById(matrixData.personality);
    const soulEnergy = getEnergyById(matrixData.soul);
    const langInstr = isUk ? 'Відповідай УКРАЇНСЬКОЮ.' : 'Respond in English.';
    const karmicEnergy = getEnergyById(matrixData.karmicTail);
    const prompt = isUk
      ? `Матриця Долі людини: особистість=${matrixData.personality} (${personalEnergy?.name}, ${personalEnergy?.positive}), душа=${matrixData.soul} (${soulEnergy?.name}), кармічний хвіст=${matrixData.karmicTail} (${karmicEnergy?.name}).

Напиши коротку персональну записку (3-4 речення) за формулою:
1. Сильна сторона: конкретно похвали на основі числа Особистості
2. Прихована перешкода: м'яко вкажи що кармічний хвіст блокує щось конкретне (фінанси АБО стосунки АБО кар'єру)
3. Інтрига: закінчи тим що повний аналіз матриці покаже як зняти цей блок

Пиши тепло, впевнено. НЕ використовуй слова "Premium" чи "підписка". ${langInstr}`
      : `Person's Destiny Matrix: personality=${matrixData.personality} (${personalEnergy?.arcana}, ${personalEnergy?.positive}), soul=${matrixData.soul} (${soulEnergy?.arcana}), karmic tail=${matrixData.karmicTail} (${karmicEnergy?.arcana}).

Write a short personal note (3-4 sentences) following this formula:
1. Strength: specifically praise based on their Personality number
2. Hidden block: gently point out that their karmic tail blocks something specific (finances OR relationships OR career)
3. Intrigue: end by saying the full matrix analysis shows how to remove this block

Write warmly, confidently. Do NOT use words "Premium" or "subscription". ${langInstr}`;

    askClaude(
      isUk ? 'Ти — експерт з Матриці Долі. Пишеш коротко, точно, інтригуюче. Кожне слово має створювати відчуття "це про мене".' : 'You are a Destiny Matrix expert. Write concisely, precisely, intriguingly. Every word should feel like "this is about me".',
      [],
      prompt,
    )
      .then((text) => setAiTeaser(text))
      .catch(() => setAiTeaser(isUk
        ? 'Ваша матриця показує потужний потенціал лідера та творця. Але кармічний хвіст вказує на прихований блок, що стримує фінансовий та емоційний ріст. Повний аналіз матриці розкриє конкретний шлях до зняття цього обмеження.'
        : 'Your matrix reveals a powerful potential for leadership and creativity. But your karmic tail points to a hidden block holding back financial and emotional growth. A full matrix analysis will show the specific path to removing this limitation.'))
      .finally(() => setAiLoading(false));
  }, []);

  // Shimmer + floating CTA
  const shimmerX  = useRef(new Animated.Value(-200)).current;
  const floatY    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Shimmer loop — sweeps left-to-right every 3 s
    const runShimmer = () => {
      shimmerX.setValue(-200);
      Animated.timing(shimmerX, { toValue: 400, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true })
        .start(() => setTimeout(runShimmer, 3000));
    };
    setTimeout(runShimmer, 1200);

    // Floating loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -4, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue:  0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { marginTop: 12 }]}>{t.onboarding.ahaTitle}</Text>
        </View>

        {/* Mystical matrix preview */}
        {matrixData && (
          <View style={styles.ahaMatrixWrap}>
            <MatrixDiagram data={matrixData} size={260} mysteryMode />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(8,1,26,0.25)', 'rgba(8,1,26,0.6)', 'rgba(8,1,26,0.95)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
              />
            </View>
            <View style={styles.ahaMatrixLock} pointerEvents="none">
              <Text style={{ color: Colors.accent, fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' }}>
                {isUk ? '✦ Твоя унікальна Матриця ✦' : '✦ Your Unique Matrix ✦'}
              </Text>
            </View>
          </View>
        )}

        {/* Personal matrix analysis — no daily energy */}
        {matrixData && (() => {
          const pText = getPositionText('personality', matrixData.personality, matrixData);
          const sText = getPositionText('soul', matrixData.soul, matrixData);
          const dText = getPositionText('destiny', matrixData.destiny, matrixData);
          const personality = getEnergyById(matrixData.personality);
          const soul = getEnergyById(matrixData.soul);
          const destiny = getEnergyById(matrixData.destiny);

          return (
            <View style={styles.ahaCard}>
              <Text style={{ color: Colors.accent, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: Spacing.sm }}>
                {isUk ? 'Твоя Матриця Долі' : 'Your Destiny Matrix'}
              </Text>

              {/* 1. Personality — fully open */}
              <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="person-outline" size={18} color="#F59E0B" />
                  <Text style={{ color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' }}>{isUk ? 'Особистість' : 'Personality'}</Text>
                </View>
                <Text style={{ color: '#F59E0B', fontSize: FontSize.md, fontWeight: '800', marginTop: 6 }}>
                  {matrixData.personality}. {isUk ? personality?.name : personality?.arcana}
                </Text>
                <Text style={{ color: Colors.textSecondary, fontSize: FontSize.md, marginTop: 6, lineHeight: 22 }}>
                  {pText?.full ?? personality?.positive}
                </Text>
              </View>

              {/* 2. Soul — 2 lines visible, rest blurred (teaser) */}
              <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="heart-outline" size={18} color="#818CF8" />
                  <Text style={{ color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' }}>{isUk ? 'Душа' : 'Soul'}</Text>
                </View>
                <Text style={{ color: '#818CF8', fontSize: FontSize.md, fontWeight: '800', marginTop: 6 }}>
                  {matrixData.soul}. {isUk ? soul?.name : soul?.arcana}
                </Text>
                {/* Teaser — first sentence visible, rest faded */}
                <View style={{ overflow: 'hidden', maxHeight: 48 }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 }}>
                    {sText?.short ?? soul?.positive}
                  </Text>
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(8,1,26,0.92)']}
                  style={{ marginTop: -12, paddingTop: 12, paddingBottom: 8 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="lock-closed" size={12} color={Colors.accent} />
                    <Text style={{ color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' }}>
                      {isUk ? 'Повний аналіз доступний у Premium' : 'Full analysis available in Premium'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              {/* 3. Destiny — same teaser pattern */}
              <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="compass-outline" size={18} color="#2563EB" />
                  <Text style={{ color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' }}>{isUk ? 'Доля' : 'Destiny'}</Text>
                </View>
                <Text style={{ color: '#60A5FA', fontSize: FontSize.md, fontWeight: '800', marginTop: 6 }}>
                  {matrixData.destiny}. {isUk ? destiny?.name : destiny?.arcana}
                </Text>
                <View style={{ overflow: 'hidden', maxHeight: 48 }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 }}>
                    {dText?.short ?? destiny?.positive}
                  </Text>
                </View>
                <LinearGradient
                  colors={['transparent', 'rgba(8,1,26,0.92)']}
                  style={{ marginTop: -12, paddingTop: 12, paddingBottom: 8 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="lock-closed" size={12} color={Colors.accent} />
                    <Text style={{ color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' }}>
                      {isUk ? 'Повний аналіз доступний у Premium' : 'Full analysis available in Premium'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              {/* Locked premium triggers */}
              {[
                { icon: 'star-outline' as const, label: isUk ? 'Талант від Бога' : 'God-given Talent', color: '#0D9488', hint: isUk ? 'Ваш унікальний дар та як його реалізувати' : 'Your unique gift and how to use it' },
                { icon: 'cash-outline' as const, label: isUk ? 'Фінансовий канал' : 'Money Channel', color: '#10B981', hint: isUk ? 'Як розблокувати потік грошей та які професії підходять' : 'How to unlock your money flow and ideal career' },
                { icon: 'heart-circle-outline' as const, label: isUk ? 'Стосунки та кохання' : 'Love & Relationships', color: '#EC4899', hint: isUk ? 'Який партнер підходить та чому не складаються відносини' : 'Your ideal partner and why relationships may struggle' },
                { icon: 'infinite-outline' as const, label: isUk ? 'Кармічний урок' : 'Karmic Lesson', color: '#D97706', hint: isUk ? 'Що блокує ваш розвиток та як це подолати' : 'What blocks your growth and how to overcome it' },
              ].map((item) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', opacity: 0.6 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: item.color + '15', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' }}>{item.label}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 }}>{item.hint}</Text>
                  </View>
                  <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
                </View>
              ))}
            </View>
          );
        })()}

        {/* AI teaser text */}
        {!aiLoading && aiTeaser && (
          <View style={styles.ahaCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm }}>
              <Ionicons name="sparkles" size={16} color={Colors.accent} />
              <Text style={{ color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' }}>
                {isUk ? 'AI-аналіз для тебе' : 'AI analysis for you'}
              </Text>
            </View>
            <Text style={[styles.ahaCardText, { lineHeight: 22 }]}>{aiTeaser}</Text>
          </View>
        )}

      </ScrollView>

      {/* Fixed CTA — floating + shimmer */}
      <View style={[styles.bottomBtn, { paddingBottom: Platform.OS === 'ios' ? 48 : 56 }]}>
        <Animated.View style={{ transform: [{ translateY: floatY }] }}>
          <TouchableOpacity
            onPress={() => {
              Vibration.vibrate(35);
              const sec = Math.round((Date.now() - ahaStartTime.current) / 1000);
              trackAhaTimeSpent(sec); trackAhaCtaTapped(sec); onNext();
            }}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#C8901A', '#F5C542', '#C8901A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.bigBtn, { overflow: 'hidden' }]}
            >
              <Text style={styles.bigBtnTextDark}>{t.onboarding.ahaUnlockCta}</Text>
              <Ionicons name="arrow-forward" size={18} color="#1A0800" />
              {/* Shimmer sweep */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute', top: 0, bottom: 0, width: 80,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  transform: [{ translateX: shimmerX }, { skewX: '-18deg' }],
                }}
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── Step 7: Inline Paywall ────────────────────────────────────────────────────
function InlinePaywallStep({ onSkip }: { onSkip: () => void }) {
  const { t, locale } = useI18n();
  const isUk = locale === 'uk';
  const { fadeIn, slideUp } = useEntrance();
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly' | 'weekly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [rcPackages, setRcPackages] = useState<any[]>([]);
  const paywallStartTime = useRef(Date.now());

  useEffect(() => {
    trackPaywallShown({ placement: 'onboarding_paywall', paywall_id: 'pw_01' });
    const { isRevenueCatAvailable, getOfferings } = require('@/lib/purchases');
    if (isRevenueCatAvailable()) {
      getOfferings().then((pkgs: any[]) => { if (pkgs.length) setRcPackages(pkgs); });
    }
  }, []);

  const rcPrice = (type: string) => rcPackages.find((p: any) => p.planType === type);

  const PLANS = [
    {
      id: 'yearly' as const,
      label: t.paywall.year,
      price: rcPrice('yearly')?.price ?? '$49.99',
      perDay: rcPrice('yearly') ? `$${(rcPrice('yearly').priceNumber / 365).toFixed(2)}` : '$0.14',
      badge: t.paywall.bestPrice,
    },
    {
      id: 'monthly' as const,
      label: t.paywall.month,
      price: rcPrice('monthly')?.price ?? '$9.99',
      perDay: rcPrice('monthly') ? `$${(rcPrice('monthly').priceNumber / 30).toFixed(2)}` : '$0.33',
      badge: null,
    },
    {
      id: 'weekly' as const,
      label: t.paywall.week,
      price: rcPrice('weekly')?.price ?? '$3.99',
      perDay: rcPrice('weekly') ? `$${(rcPrice('weekly').priceNumber / 7).toFixed(2)}` : '$0.57',
      badge: t.paywall.tryIt,
    },
  ];

  const FEATURES = [
    isUk ? 'Повна Матриця Долі — 22 енергії та призначення' : 'Full Destiny Matrix — 22 energies and purpose',
    isUk ? 'Матриця дня — щоденні енергії та поради' : 'Matrix of the Day — daily energies & advice',
    isUk ? 'Сумісність з партнером' : 'Partner compatibility',
    isUk ? 'Аналіз карми та уроків минулих життів' : 'Karma and past-life lessons analysis',
    isUk ? 'AI-сканування: портрет Вищого Я' : 'AI scan: Higher Self portrait',
    isUk ? 'Персональна порада дня' : 'Personalized daily advice',
  ];

  const handlePurchase = async () => {
    const { isRevenueCatAvailable, purchasePackage } = require('@/lib/purchases');
    // trackPaywallCtaTapped imported at top

    const rcPkg = rcPackages.find((p: any) => p.planType === selectedPlan);
    if (rcPkg && isRevenueCatAvailable()) {
      setIsLoading(true);
      const pwSec = Math.round((Date.now() - paywallStartTime.current) / 1000);
      trackPaywallCtaTapped(selectedPlan, 'onboarding_paywall', pwSec);
      const result = await purchasePackage(rcPkg);
      setIsLoading(false);
      if (result.success) {
        onSkip();
      } else if (!result.cancelled) {
        // purchase_failed tracked by RevenueCat
        Alert.alert(
          isUk ? 'Помилка оплати' : 'Payment Error',
          isUk ? 'Не вдалося завершити покупку.' : 'Could not complete purchase.',
        );
      }
    } else {
      // Fallback — mock for Expo Go
      onSkip();
    }
  };

  return (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { marginTop: 12 }]}>{t.onboarding.paywallTitle}</Text>
          <Text style={styles.stepSub}>{t.onboarding.paywallSub}</Text>
        </View>

        {/* Plan selector */}
        <View style={{ gap: 10, marginBottom: Spacing.lg }}>
          {PLANS.map((plan) => {
            const active = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
                style={[styles.planCard, active && styles.planCardActive]}
              >
                {active && (
                  <LinearGradient
                    colors={['rgba(139,92,246,0.2)', 'rgba(91,33,182,0.08)']}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planCardLabel, active && { color: '#fff' }]}>{plan.label}</Text>
                  <Text style={styles.planCardPerMonth}>
                    {isUk ? `${plan.perDay} — вартість Матриці Дня` : `${plan.perDay} — Matrix of the Day cost`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.planCardPrice, active && { color: '#F5C542' }]}>{plan.price}</Text>
                  {plan.badge && (
                    <View style={styles.planCardBadge}>
                      <Text style={styles.planCardBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.radio, active && styles.radioActive, { marginLeft: 12 }]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Features */}
        <View style={{ gap: 10, marginBottom: Spacing.lg }}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Ionicons name="checkmark" size={13} color="#1A0800" />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, textAlign: 'center' }}>
          {t.onboarding.paywallCancelNote}
        </Text>
      </ScrollView>

      {/* Fixed buttons */}
      <View style={[styles.bottomBtn, { paddingBottom: Platform.OS === 'ios' ? 48 : 56, gap: 0 }]}>
        <TouchableOpacity onPress={handlePurchase} activeOpacity={0.85}>
          <LinearGradient
            colors={['#C8901A', '#F5C542', '#C8901A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.bigBtn}
          >
            <Ionicons name="lock-open-outline" size={18} color="#1A0800" />
            <Text style={styles.bigBtnTextDark}>{t.onboarding.paywallCta}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { const sec = Math.round((Date.now() - paywallStartTime.current) / 1000); trackPaywallDismissed(selectedPlan, sec); onSkip(); }} activeOpacity={0.85} style={{ marginTop: Spacing.md }}>
          <View style={{ height: 48, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.5)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,246,0.12)' }}>
            <Text style={{ color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '600' }}>{t.onboarding.paywallSkip}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Step 8: Registration Soft Gate ───────────────────────────────────────────
function RegistrationStep({ onDone }: { onDone: () => void }) {
  const { t, locale } = useI18n();
  const isUk = locale === 'uk';
  const { fadeIn, slideUp } = useEntrance();

  const BULLETS = [
    { icon: 'grid-outline' as const,          label: t.onboarding.regBullet1 },
    { icon: 'time-outline' as const,           label: t.onboarding.regBullet2 },
    { icon: 'sync-outline' as const,           label: t.onboarding.regBullet3 },
  ];

  const [socialLoading, setSocialLoading] = useState(false);

  const handleSocial = async (provider: 'google' | 'apple') => {
    if (socialLoading) return;
    setSocialLoading(true);
    try {
      const firebaseUser = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithApple();
      useAppStore.getState().logout();
      useAppStore.setState({
        isAuthenticated: true,
        userId: firebaseUser.uid,
        onboardingCompleted: true,
      });
      useAppStore.getState().setUserProfile(firebaseUser.displayName ?? '', '');
      syncPurchasesUser(firebaseUser.uid)
        .then(() => checkSubscriptionStatus())
        .catch(() => {});
      useAppStore.getState().syncWithServer().catch(() => {});
      onDone();
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(
          isUk ? 'Помилка' : 'Error',
          getAuthErrorMessage(e?.code ?? '', isUk),
        );
      }
    }
    setSocialLoading(false);
  };

  return (
    <Animated.View style={[{ flex: 1 }, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
      <View style={{ flex: 1, paddingHorizontal: Spacing.lg }}>
        <View style={styles.stepHeader}>
          <Text style={[styles.stepTitle, { marginTop: 12 }]}>{t.onboarding.registrationTitle}</Text>
          <Text style={styles.stepSub}>{t.onboarding.registrationSub}</Text>
        </View>

        {/* Value bullets */}
        <View style={{ gap: 14, marginBottom: Spacing.xl }}>
          {BULLETS.map((b, i) => (
            <View key={i} style={styles.regBullet}>
              <View style={styles.regBulletIcon}>
                <Ionicons name={b.icon} size={18} color="#F5C542" />
              </View>
              <Text style={styles.regBulletText}>{b.label}</Text>
            </View>
          ))}
        </View>

        {/* Social auth buttons */}
        <View style={{ gap: 12 }}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={() => handleSocial('apple')}
              activeOpacity={0.85}
              disabled={socialLoading}
              style={styles.socialBtn}
            >
              <Ionicons name="logo-apple" size={20} color="#fff" />
              <Text style={styles.socialBtnText}>{t.onboarding.registrationApple}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => handleSocial('google')}
            activeOpacity={0.85}
            disabled={socialLoading}
            style={styles.socialBtn}
          >
            <Text style={{ fontSize: 18 }}>G</Text>
            <Text style={styles.socialBtnText}>{t.onboarding.registrationGoogle}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.85}
            style={[styles.socialBtn, { borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' }]}
          >
            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.socialBtnText, { color: 'rgba(255,255,255,0.7)' }]}>{t.onboarding.registrationEmail}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.navigate('/auth/login' as any)} style={{ alignSelf: 'center', marginTop: Spacing.md }}>
          <Text style={{ color: Colors.primaryLight, fontSize: FontSize.sm }}>
            {isUk ? 'Вже маю акаунт — Увійти' : 'Already have an account — Sign in'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDone} activeOpacity={0.85} style={{ marginTop: Spacing.md }}>
          <View style={{ height: 48, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: 'rgba(139,92,246,0.5)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,246,0.12)' }}>
            <Text style={{ color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '600' }}>{t.onboarding.registrationSkip}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ─── Progress Bar (mobile only) ────────────────────────────────────────────────
function ProgressBar({ step }: { step: Step }) {
  const idx = PROGRESS_STEPS.indexOf(step);
  const total = PROGRESS_STEPS.length;
  const safeIdx = Math.max(idx, 0);
  // Start from 0 on first mount so the bar "grows" into place
  const progress = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (idx < 0) return;
    const target = (idx + 1) / total;
    if (!mounted.current) {
      // First mount — grow from zero with spring overshoot
      mounted.current = true;
      Animated.spring(progress, {
        toValue: target,
        tension: 55,
        friction: 9,
        useNativeDriver: false,
      }).start();
    } else {
      // Step change — spring to new position with slight bounce
      Animated.spring(progress, {
        toValue: target,
        tension: 80,
        friction: 10,
        useNativeDriver: false,
      }).start();
    }
  }, [idx]);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  if (isWeb || idx < 0) return null;

  return (
    <View style={styles.progressBarWrap} pointerEvents="none">
      <View style={styles.progressBarTrack}>
        <Animated.View style={[styles.progressBarFill, { width: barWidth }]} />
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [step,      setStep]      = useState<Step>('welcome');
  const [birthDate, setBirthDate] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [intent,    setIntent]    = useState('self');
  const [focus,     setFocus]     = useState('clarity');
  const [gender,    setGender]    = useState<'male' | 'female'>('female');
  const onboardingStartTime = useRef(Date.now());

  const setUserProfile           = useAppStore((s) => s.setUserProfile);
  const setOnboardingPreferences = useAppStore((s) => s.setOnboardingPreferences);
  const setOnboardingCompleted   = useAppStore((s) => s.setOnboardingCompleted);
  const setUserGender            = useAppStore((s) => s.setUserGender);

  const { setLocale } = useI18n();
  useEffect(() => {
    // Force Ukrainian; TODO: restore auto-detect for multilingual
    setLocale('uk');
  }, []);

  const handleDone = async () => {
    await SecureStore.setItemAsync('welcome_seen', 'true');
    await SecureStore.setItemAsync('onboarding_done', 'true');

    setUserProfile(nameInput, birthDate);
    setOnboardingPreferences({
      knowledgeLevel: 'beginner',
      lifeFocus: [focus],
      dailyEnergyEnabled: true,
    });
    setOnboardingCompleted();
    setUserGender(gender);
    const durationSec = Math.round((Date.now() - onboardingStartTime.current) / 1000);
    trackOnboardingComplete('default', durationSec);

    if (!useAppStore.getState().isAuthenticated) {
      const guestId = 'guest_' + Date.now();
      useAppStore.getState().setUserProfile(nameInput, birthDate);
      useAppStore.setState({ isAuthenticated: true, userId: guestId });
    }

    if (birthDate) {
      try {
        const parts = birthDate.split('.');
        if (parts.length === 3) {
          const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          const matrix = calculateMatrix(dateStr);
          useAppStore.getState().setPersonalMatrix(matrix);
        }
      } catch {}
    }

    router.replace('/(tabs)/matrix');
  };

  return (
    <StarBackground style={{ flex: 1 }}>
      <View style={[styles.onboardingContainer, isWeb && ws.containerWeb]}>

        {step === 'welcome' && (
          <WelcomeStep
            onNext={() => { trackOnboardingStart(); trackWelcomeShown(); trackWelcomeContinue(); setStep('intent'); }}
            onBack={() => { trackWelcomeSignIn(); router.push('/auth/login'); }}
          />
        )}
        {step === 'intent' && (
          <IntentStep
            onNext={(i) => { trackIntentScreenShown(); trackIntentSelected(i); trackIntentContinue(); setIntent(i); setStep('focus'); }}
            onBack={() => setStep('welcome')}
          />
        )}
        {step === 'focus' && (
          <FocusStep
            onNext={(f) => { trackFocusScreenShown(); trackFocusSelected(f); trackFocusContinue(); setFocus(f); setStep('gender'); }}
            onBack={() => setStep('intent')}
          />
        )}
        {step === 'gender' && (
          <GenderStep
            onNext={(g) => { setGender(g); setStep('dob'); }}
            onBack={() => setStep('focus')}
          />
        )}
        {step === 'dob' && (
          <BirthDateStep
            onNext={(bd, name) => { trackDobScreenShown(); trackDobContinue(); setBirthDate(bd); setNameInput(name); setStep('generating'); }}
            onBack={() => setStep('focus')}
          />
        )}
        {step === 'generating' && (
          <GeneratingStep onDone={() => { trackMatrixGenerationCompleted(); setStep('aha'); }} birthDate={birthDate} />
        )}
        {step === 'aha' && (
          <AhaTeaserStep onNext={() => { trackAhaScreenShown(); setStep('paywall'); }} intent={intent} birthDate={birthDate} />
        )}
        {step === 'paywall' && (
          <InlinePaywallStep onSkip={() => setStep('registration')} />
        )}
        {step === 'registration' && (
          <RegistrationStep onDone={handleDone} />
        )}

        <ProgressBar step={step} />
      </View>
    </StarBackground>
  );
}

// ─── Mobile Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  onboardingContainer: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_ONBOARDING_WIDTH,
    alignSelf: 'center',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 50,
    paddingBottom: Spacing.sm,
    alignItems: 'center',
  },
  backBtn: { marginBottom: Spacing.md, alignSelf: 'flex-start' },
  stepTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 40,
    textAlign: 'center',
  },
  welcomeTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 44,
    textAlign: 'center',
  },
  stepSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.80)',
    lineHeight: 20,
    textAlign: 'center',
  },
  bigBtn: {
    borderRadius: BorderRadius.full,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  bigBtnTextDark: {
    color: '#1A0800',
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: 4,
  },
  skipLinkText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: FontSize.xs,
    textDecorationLine: 'underline',
  },
  bottomBtn: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 48 : 56,
    paddingTop: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.25)',
    paddingHorizontal: Spacing.md,
    height: 54,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: FontSize.md,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  wheelsDivider: {
    width: 1,
    height: ITEM_H * VISIBLE,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  wheelOuter: {
    height: ITEM_H * VISIBLE,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  wheelFadeTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: ITEM_H * 2,
    zIndex: 2,
  },
  wheelFadeBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: ITEM_H * 2,
    zIndex: 2,
  },
  wheelHighlight: {
    position: 'absolute',
    top: ITEM_H * 2,
    left: 4, right: 4,
    height: ITEM_H,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(245,197,66,0.35)',
    zIndex: 1,
  },
  wheelItem:     { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  wheelItemText: { fontSize: 18, fontWeight: '500', color: 'rgba(255,255,255,0.8)' },
  wheelLabel:    { fontSize: 9, fontWeight: '700', color: Colors.accent, letterSpacing: 1.5, marginTop: 6, opacity: 0.7 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  listRowActive:  { borderColor: 'rgba(139,92,246,0.5)' },
  listIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIconActive: { backgroundColor: 'rgba(139,92,246,0.25)' },
  listLabel:      { fontSize: FontSize.md, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  listLabelActive: { color: '#fff' },
  listSub:        { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.primary },
  radioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  checkBadge: {
    position: 'absolute',
    top: 10, right: 10,
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Welcome Matrix wrap ──
  welcomeMatrixWrap: {
    width: 200, height: 200,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },

  // ── Welcome Logo (legacy, kept for web) ──
  welcomeLogo: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },

  // ── Aha Teaser ──
  ahaMatrixWrap: {
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(20,5,50,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  ahaMatrixLock: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 6,
  },
  ahaMatrixLockText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    textAlign: 'center',
  },
  ahaCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  ahaCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  ahaCatIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(245,197,66,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  ahaCatLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.accent, letterSpacing: 0.5 },
  ahaCardText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', lineHeight: 22 },
  ahaLockedBanner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
    gap: 8,
  },
  ahaLockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  ahaLockIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(245,197,66,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  ahaLockedLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.accent },
  ahaBlurRow:     { height: 12, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6, marginBottom: 6 },
  ahaLockedDesc:  { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.5)', lineHeight: 18, marginTop: 6 },

  // ── Inline Paywall ──
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    overflow: 'hidden',
  },
  planCardActive:   { borderColor: 'rgba(139,92,246,0.5)' },
  planCardLabel:    { fontSize: FontSize.md, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  planCardPerMonth: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  planCardPrice:    { fontSize: FontSize.md, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },
  planCardBadge: {
    backgroundColor: 'rgba(245,197,66,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  planCardBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.accent },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.75)', flex: 1 },

  // ── Registration ──
  regBullet:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  regBulletIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(245,197,66,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  regBulletText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', flex: 1, lineHeight: 20 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
  },
  socialBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },

  // ── Generating (plan) ──
  planContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  sphereVideoWrap: {
    width: 200, height: 200, borderRadius: 100,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0D0B1E',
  },
  sphereVideo: { width: 260, height: 260 },
  sphereCheckOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(13,11,30,0.5)',
    borderRadius: 100,
  },
  planSpinner:      { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
  planSpinnerRing: {
    position: 'absolute',
    width: 128, height: 128, borderRadius: 64,
    borderWidth: 3,
    borderColor: 'rgba(139,92,246,0.5)',
    borderTopColor: Colors.primary,
  },
  planSpinnerInner: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  planDoneGrad: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
  },
  planTitle:    { fontSize: FontSize.xxl, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  planSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 },
  progressTrack: {
    width: '100%', height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3, overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  progressFill:   { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  planStepsList:  { width: '100%', gap: 10 },
  planStepRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planStepDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  planStepDotDone:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  planStepDotActive: { borderColor: Colors.accent },
  planStepText:      { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.4)' },

  // ── Top progress bar ──
  progressBarWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 42,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 10,
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});

// ─── Web Styles ───────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  containerWeb: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: undefined,
    alignSelf: undefined,
  } as any,

  stepOuter: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: 'rgba(7, 4, 20, 0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 66, 0.22)',
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,197,66,0.1)',
  },
  logoIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  logoIconText: { color: '#1A0A35', fontSize: 18, fontWeight: '900' },
  logoTitle:    { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '900', letterSpacing: 3 },
  logoSub:      { color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 1 },

  dots: { flexDirection: 'row', gap: 6, marginBottom: 28, alignItems: 'center' },
  dot:       { height: 4, width: 8, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  dotDone:   { backgroundColor: 'rgba(245,197,66,0.45)' },
  dotActive: { width: 24, backgroundColor: Colors.accent },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  backText: { color: 'rgba(255,255,255,0.4)', fontSize: FontSize.xs, fontWeight: '500' },

  title: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 6, lineHeight: 30 },
  sub:   { color: 'rgba(255,255,255,0.48)', fontSize: FontSize.sm, marginBottom: 24, lineHeight: 20 },

  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 20,
    marginTop: -16,
  },
  lockText: { color: 'rgba(245,197,66,0.6)', fontSize: 11 },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    marginBottom: 8,
  },
  dateDivider: { width: 1, height: 52, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },
  stepper:        { flex: 1, alignItems: 'center', gap: 10 },
  stepperLabel:   { color: Colors.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1.5, opacity: 0.7 },
  stepperControl: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrowBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperVal: { color: '#fff', fontSize: 16, fontWeight: '700', minWidth: 58, textAlign: 'center' },

  btnWrap: { marginTop: 24, alignSelf: 'flex-end' },
  btn: {
    borderRadius: BorderRadius.full,
    paddingVertical: 18, paddingHorizontal: 36,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  btnText: { color: '#1A0800', fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 1 },

  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    marginBottom: 10,
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(245,197,66,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.2)',
  },
  modeToggleText: { color: Colors.accent, fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  inputError:     { borderColor: 'rgba(220,50,50,0.6)' },
  errorText:      { color: 'rgba(220,80,80,0.9)', fontSize: 11, marginTop: 6, marginLeft: 4 },

  focusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8, marginTop: 4 },
  focusCard: {
    flex: 1, minWidth: '44%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14, paddingLeft: 16,
    overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    position: 'relative',
  },
  focusCardActive: { borderColor: 'rgba(139,92,246,0.6)' },
  focusEmoji: { fontSize: 22 },
  focusLabel: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.sm, fontWeight: '600', flex: 1, lineHeight: 18 },
  focusLabelActive: { color: '#fff' },
});
