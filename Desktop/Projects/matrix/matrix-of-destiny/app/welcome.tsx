import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  Image,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useI18n } from '@/lib/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from '@/lib/storage';
import { Asset } from 'expo-asset';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';
import { StarBackground } from '@/components/ui/StarBackground';

const isWeb = Platform.OS === 'web';

export default function WelcomeScreen() {
  const { t } = useI18n();
  const [videoReady, setVideoReady] = useState(false);
  const welcomePlayer = useVideoPlayer(require('../assets/welcome_bg_opt.mp4'), (player) => {
    player.muted = true;
    player.loop = true;
    if ('audioMixingMode' in player) (player as any).audioMixingMode = 'mixWithOthers';
    player.play();
  });

  useEffect(() => {
    const sub = welcomePlayer.addListener('statusChange', (ev: any) => {
      if (ev.status === 'readyToPlay') setVideoReady(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Preload next screens' videos while user is on welcome
    Asset.loadAsync([
      require('../assets/onboarding_sphere.mp4'),
      require('../assets/avatar_start.mp4'),
      require('../assets/avatar_loop.mp4'),
    ]);
  }, []);

  const FEATURES = [
    { icon: 'sparkles-outline' as const, label: t.ui.welcomeFeatureMatrix },
    { icon: 'color-wand-outline' as const, label: t.ui.welcomeFeatureAI },
    { icon: 'moon-outline'     as const, label: t.ui.welcomeFeatureAstro },
  ];
  const fadeIn   = useRef(new Animated.Value(0)).current;
  const slideUp  = useRef(new Animated.Value(isWeb ? 20 : 40)).current;
  const btnScale = useRef(new Animated.Value(0.92)).current;
  const glowPulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(isWeb ? 200 : 400),
      Animated.parallel([
        Animated.timing(fadeIn,  { toValue: 1, duration: isWeb ? 600 : 900, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
        Animated.spring(btnScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleStart = async () => {
    await SecureStore.setItemAsync('welcome_seen', 'true');
    await SecureStore.deleteItemAsync('onboarding_done');
    useAppStore.setState({ onboardingCompleted: false });
    router.replace('/onboarding');
  };


  // ─── Web layout ──────────────────────────────────────────────────────────────
  if (isWeb) {
    return (
      <StarBackground style={styles.root}>
        <StatusBar style="light" />

        {/* Centered two-panel hero */}
        <View style={ws.container}>
          <Animated.View style={[ws.hero, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>

            {/* Left panel — branding */}
            <LinearGradient
              colors={['rgba(30,10,70,0.97)', 'rgba(15,5,40,0.97)']}
              style={ws.leftPanel}
            >
              {/* Decorative orb */}
              <View style={ws.orb} />
              <View style={ws.orbSmall} />

              {/* Logo */}
              <View style={ws.logoWrap}>
                <LinearGradient colors={['#C8901A', '#F5C542']} style={ws.logoIcon}>
                  <Text style={ws.logoIconText}>✦</Text>
                </LinearGradient>
                <View>
                  <Text style={ws.logoTitle}>DESTINY</Text>
                  <Text style={ws.logoSub}>MATRIX</Text>
                </View>
              </View>

              {/* Feature list */}
              <View style={ws.featureList}>
                {FEATURES.map((f) => (
                  <View key={f.icon} style={ws.featureRow}>
                    <View style={ws.featureIcon}>
                      <Ionicons name={f.icon} size={15} color={Colors.accent} />
                    </View>
                    <Text style={ws.featureLabel}>{f.label}</Text>
                  </View>
                ))}
              </View>

              {/* Bottom decoration */}
              <Text style={ws.decText}>✦  ·  ✦  ·  ✦</Text>
            </LinearGradient>

            {/* Right panel — CTA */}
            <View style={ws.rightPanel}>
              <Text style={ws.tagline}>DESTINY MATRIX</Text>
              <Text style={ws.headline}>{t.ui.welcomeHeadline}</Text>

              <View style={ws.divider}>
                <View style={ws.dividerLine} />
                <Text style={ws.dividerStar}>✦</Text>
                <View style={ws.dividerLine} />
              </View>

              <Text style={ws.desc}>
                {t.ui.welcomeDesc}
              </Text>

              <Animated.View style={[ws.btnWrap, { transform: [{ scale: btnScale }] }]}>
                <Animated.View style={[ws.btnGlow, { opacity: glowPulse }]} />
                <Pressable onPress={handleStart} style={ws.btnPress}>
                  <LinearGradient
                    colors={Colors.gradientGold}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={ws.btnGrad}
                  >
                    <Text style={ws.btnText}>{t.ui.start}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#1A0800" />
                  </LinearGradient>
                </Pressable>
              </Animated.View>

            </View>
          </Animated.View>
        </View>
      </StarBackground>
    );
  }

  // ─── Mobile layout ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Static first frame — shows instantly, no black screen */}
      <Image
        source={require('../assets/welcome_frame.jpg')}
        style={[StyleSheet.absoluteFill, { left: -43 }]}
        resizeMode="cover"
      />

      {/* Background Video — hidden until ready to avoid position jump */}
      <VideoView
        player={welcomePlayer}
        style={[StyleSheet.absoluteFill, { opacity: videoReady ? 1 : 0 }]}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Dark gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(13, 11, 30, 0.5)',
          'rgba(13, 11, 30, 0.3)',
          'rgba(13, 11, 30, 0.55)',
          'rgba(13, 11, 30, 0.92)',
        ]}
        locations={[0, 0.25, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={{ flex: 1 }} />
        <Animated.View
          style={[
            styles.bottomSection,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          <Text style={styles.subtitle}>DESTINY MATRIX</Text>
          <Text style={styles.title}>{t.ui.welcomeHeadline}</Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerStar}>✦</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.description}>
            {t.ui.welcomeDesc}
          </Text>

          <Animated.View style={[styles.btnWrapper, { transform: [{ scale: btnScale }] }]}>
            <Animated.View style={[styles.btnGlow, { opacity: glowPulse }]} />
            <Pressable
              onPress={handleStart}
              style={styles.btnPressable}
              android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
            >
              <LinearGradient
                colors={Colors.gradientGold}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <Text style={styles.btnText}>{t.ui.start}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

        </Animated.View>
      </View>
    </View>
  );
}

// ─── Mobile styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.bg },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'flex-end',
    paddingBottom: Platform.OS === 'android' ? 80 : 60,
  },
  bottomSection: { alignItems: 'center' },
  subtitle: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: Spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  title: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: 10,
  },
  dividerLine: { width: 32, height: 1, backgroundColor: Colors.accent, opacity: 0.5 },
  dividerStar: { color: Colors.accent, fontSize: 12, opacity: 0.7 },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    maxWidth: 300,
  },
  btnWrapper: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    alignItems: 'center',
    position: 'relative',
    marginTop: Spacing.sm,
  },
  btnGlow: {
    position: 'absolute',
    top: 4, left: 20, right: 20, bottom: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    // No elevation — keeps it below the button on Android (elevation is z-order)
  },
  btnPressable: { width: '100%', borderRadius: BorderRadius.full, overflow: 'hidden' },
  btnGradient: {
    height: 62,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accentDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  btnText: {
    color: '#1A0A35',
    fontSize: FontSize.lg,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
});

// ─── Web styles ────────────────────────────────────────────────────────────────
const ws = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 860,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.55,
    shadowRadius: 56,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.18)',
  },

  // Left panel
  leftPanel: {
    width: 280,
    padding: 36,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
  },
  orb: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  orbSmall: {
    position: 'absolute',
    bottom: 40,
    left: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245,197,66,0.08)',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 36,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  logoIconText: { color: '#1A0A35', fontSize: 22, fontWeight: '900' },
  logoTitle: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '900',
    letterSpacing: 3,
    lineHeight: 18,
  },
  logoSub: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
  },
  featureList: { gap: 12, flex: 1 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(245,197,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.2)',
  },
  featureLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  decText: {
    color: 'rgba(245,197,66,0.2)',
    fontSize: 11,
    letterSpacing: 5,
    textAlign: 'center',
    marginTop: 24,
  },

  // Right panel
  rightPanel: {
    flex: 1,
    backgroundColor: 'rgba(8, 5, 22, 0.98)',
    padding: 44,
    justifyContent: 'center',
  },
  tagline: {
    color: Colors.accent,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 4,
    marginBottom: 12,
  },
  headline: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(245,197,66,0.2)' },
  dividerStar: { color: Colors.accent, fontSize: 12, opacity: 0.7 },
  desc: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.sm,
    lineHeight: 22,
    marginBottom: 32,
  },
  btnWrap: {
    alignSelf: 'flex-start',
    position: 'relative',
    marginBottom: 16,
  },
  btnGlow: {
    position: 'absolute',
    top: 6, left: 10, right: 10, bottom: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  btnPress: {},
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: BorderRadius.full,
  },
  btnText: {
    color: '#1A0A35',
    fontSize: FontSize.md,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  disclaimer: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
  },
});
