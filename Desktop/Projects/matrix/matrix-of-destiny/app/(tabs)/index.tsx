import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform, Modal, Pressable, ActivityIndicator, Animated,
  Image, Dimensions, Easing,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Asset } from 'expo-asset';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { FormattedText } from '@/components/ui/FormattedText';
import { StarBackground } from '@/components/ui/StarBackground';
import { getDailyEnergy, calculateMatrix } from '@/lib/matrix-calc';
import { getEnergyById } from '@/constants/energies';
import { MatrixDiagram } from '@/components/matrix/MatrixDiagram';
import { useAppStore } from '@/stores/useAppStore';
import { trackFeatureUsed, FEATURES, trackEarnCurrency, trackPushLandingView, trackPushClaimFailed, trackPushExpiredView } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { getLastTabPress } from '@/lib/tabState';
import { useResponsive } from '@/hooks/useResponsive';
import { askClaude } from '@/lib/claude';
import { GIFT_DIAMONDS } from '@/lib/notifications';

const { width, height: SCREEN_H } = Dimensions.get('window');

export default function TodayScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { t, locale } = useI18n();
  const langInstr = locale === 'uk' ? 'Відповідай УКРАЇНСЬКОЮ.' : 'Respond ONLY in English. Never use Russian.';
  const { isDesktop, isTablet, isWeb } = useResponsive();
  const today = new Date();

  const dailyEnergy = getDailyEnergy(today);
  const energy = getEnergyById(dailyEnergy);
  const savedMatrices = useAppStore((s) => s.savedMatrices);
  const personalMatrix = useAppStore((s) => s.personalMatrix);
  const dailyMatrixUsedFree = useAppStore((s) => s.dailyMatrixUsedFree);
  const userName = useAppStore((s) => s.userName);
  const streak = useAppStore((s) => s.streak);
  const notifications = useAppStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const affirmation = notifications.find((n) => n.type === 'affirmation');
  const isPremium = useAppStore((s) => s.isPremium);
  const tokens = useAppStore((s) => s.tokens);
  const spendCrystals = useAppStore((s) => s.spendCrystals);
  const setAiCache = useAppStore((s) => s.setAiCache);
  const getAiCache = useAppStore((s) => s.getAiCache);
  const canClaimGift = useAppStore((s) => s.canClaimGift);
  const claimDailyGift = useAppStore((s) => s.claimDailyGift);
  const firstOpenDate = useAppStore((s) => s.firstOpenDate);
  const lastGiftClaimedDate = useAppStore((s) => s.lastGiftClaimedDate);

  // Gift state
  const todayDate = today.toISOString().split('T')[0];
  const giftClaimedToday = lastGiftClaimedDate === todayDate;
  const giftAvailable = canClaimGift();
  // Show block if: can claim OR already claimed today (but not on day 1)
  const showGiftBlock = (giftAvailable || giftClaimedToday) && !!firstOpenDate && firstOpenDate < todayDate;

  // Track gift block visibility
  useEffect(() => {
    if (showGiftBlock && giftAvailable) {
      trackPushLandingView('daily_gift_' + todayDate);
    }
  }, [showGiftBlock, giftAvailable]);

  // Gift animation
  const [giftAnimating, setGiftAnimating] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const giftScale = useRef(new Animated.Value(1)).current;
  const giftGlow = useRef(new Animated.Value(0)).current;
  const giftCheck = useRef(new Animated.Value(0)).current;

  // (notifications initialized in _layout.tsx at app level)

  const handleClaimGift = () => {
    if (giftClaimedToday) {
      trackPushClaimFailed('gift_already_claimed');
      return;
    }
    if (!giftAvailable) {
      trackPushClaimFailed('gift_expired');
      return;
    }
    if (giftAnimating) return;
    setGiftAnimating(true);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(giftScale, { toValue: 1.2, tension: 200, friction: 5, useNativeDriver: true }),
        Animated.timing(giftGlow, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.spring(giftScale, { toValue: 0.9, tension: 200, friction: 8, useNativeDriver: true }),
      Animated.spring(giftScale, { toValue: 1, tension: 150, friction: 10, useNativeDriver: true }),
    ]).start(() => {
      claimDailyGift(GIFT_DIAMONDS);
      trackFeatureUsed(FEATURES.DAILY_CARD, 'home', 'gift');
      trackEarnCurrency('daily_gift', GIFT_DIAMONDS);
      setJustClaimed(true);
      Animated.timing(giftCheck, { toValue: 1, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }).start();
      setTimeout(() => setGiftAnimating(false), 500);
      // Auto-hide gift block after 20 minutes
      setTimeout(() => setJustClaimed(false), 20 * 60 * 1000);
    });
  };

  useFocusEffect(
    useCallback(() => {
      const lastTabPress = getLastTabPress();
      if (lastTabPress?.tab === 'index' && Date.now() - lastTabPress.ts < 500) {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    }, [])
  );

  const dateStr = today.toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-US', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const capitalDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  const wide = isDesktop || isTablet;

  // ── Avatar Modal ─────────────────────────────────────────────────
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarPhase, setAvatarPhase] = useState<'start' | 'loop'>('start');
  const [videosReady, setVideosReady] = useState({ start: false, loop: false });
  const todayStr = today.toISOString().split('T')[0];
  const dailyMatrix = useMemo(() => calculateMatrix(todayStr), [todayStr]);
  const matrixAnim = useRef(new Animated.Value(0)).current;
  const matrixScale = useRef(new Animated.Value(0.7)).current;

  // ── Transition animation values ───────────────────────────────────────
  const bgScale      = useRef(new Animated.Value(1)).current;
  const bgDim        = useRef(new Animated.Value(0)).current;
  const modalScale   = useRef(new Animated.Value(0.92)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // AI short summary for modal
  const [modalSummary, setModalSummary] = useState<string | null>(null);
  const [modalSummaryLoading, setModalSummaryLoading] = useState(false);

  const MODAL_SUMMARY_COST = 3;

  const generateModalSummary = async () => {
    const cacheKey = `modal-summary-${todayStr}-${dailyEnergy}`;
    const cached = getAiCache(cacheKey);
    if (cached) { setModalSummary(cached); return; }

    // Block if not premium and not enough crystals
    if (!isPremium && tokens < MODAL_SUMMARY_COST) return;

    // Deduct crystals for non-premium users
    if (!isPremium) {
      if (!spendCrystals(MODAL_SUMMARY_COST)) return;
    }

    setModalSummaryLoading(true);
    const isUk = locale === 'uk';
    try {
      const personalData = personalMatrix
        ? (isUk
          ? `Матриця долі користувача: особистість=${personalMatrix.personality} (${getEnergyById(personalMatrix.personality)?.name ?? ''}), душа=${personalMatrix.soul} (${getEnergyById(personalMatrix.soul)?.name ?? ''}), доля=${personalMatrix.destiny} (${getEnergyById(personalMatrix.destiny)?.name ?? ''}).`
          : `User's destiny matrix: personality=${personalMatrix.personality} (${getEnergyById(personalMatrix.personality)?.name ?? ''}), soul=${personalMatrix.soul} (${getEnergyById(personalMatrix.soul)?.name ?? ''}), destiny=${personalMatrix.destiny} (${getEnergyById(personalMatrix.destiny)?.name ?? ''}).`)
        : '';
      const result = await askClaude(
        isUk
          ? `Ти — AI Езотерик у застосунку "Matrix of Destiny". ${langInstr} Коротко, 3-4 речення.`
          : `You are an AI Esoteric advisor in the "Matrix of Destiny" app. ${langInstr} Keep it brief, 3-4 sentences.`,
        [],
        isUk
          ? `Енергія дня: ${dailyEnergy}. ${energy?.name ?? ''} (${energy?.arcana ?? ''}).
Планета: ${energy?.planet ?? ''}.
${personalData}
${userName ? `Ім'я: ${userName}.` : ''}

Напиши підсумок матриці дня (3-4 речення). ОБОВ'ЯЗКОВО порівняй з матрицею долі користувача — наприклад "Сьогодні порівняно з вашою Матрицею долі у вас неймовірний потенціал до [конкретна сфера на основі порівняння енергій]". Останнє речення ЗАВЖДИ має бути: "Подивіться свою повну Матрицю долі, щоб розкрити весь потенціал." Без заголовків, без списків.`
          : `Energy of the day: ${dailyEnergy}. ${energy?.name ?? ''} (${energy?.arcana ?? ''}).
Planet: ${energy?.planet ?? ''}.
${personalData}
${userName ? `Name: ${userName}.` : ''}

Write a summary of the daily matrix (3-4 sentences). ALWAYS compare with the user's destiny matrix — for example "Today compared to your Destiny Matrix, you have incredible potential in [specific area based on energy comparison]". The last sentence MUST be: "View your full Destiny Matrix to unlock your full potential." No headings, no lists.`
      );
      setModalSummary(result);
      setAiCache(cacheKey, result);
    } catch {
      setModalSummary(isUk
        ? `Сьогодні день під впливом енергії ${energy?.name ?? dailyEnergy}. ${energy?.positive ?? 'Прислухайтесь до свого серця.'}`
        : `Today is a day influenced by the energy of ${energy?.name ?? dailyEnergy}. ${energy?.positive ?? 'Listen to your heart.'}`);
    }
    setModalSummaryLoading(false);
  };

  // Safe wrappers — expo-video on iOS throws NativeSharedObjectNotFoundException
  // if play/pause is called after the native object is released.
  const safePlay  = (p: any) => { try { p?.play?.();  } catch {} };
  const safePause = (p: any) => { try { p?.pause?.(); } catch {} };
  const safeSeek  = (p: any, t: number) => { try { if (p) p.currentTime = t; } catch {} };

  const easeOut = Easing.bezier(0.25, 1, 0.5, 1);

  const openModal = useCallback(() => {
    // Check access: premium OR crystals OR cached
    const cached = getAiCache(`modal-summary-${todayStr}-${dailyEnergy}`);
    if (!isPremium && tokens < MODAL_SUMMARY_COST && !cached) {
      router.push('/paywall' as any);
      return;
    }
    safePause(crystalPlayer);
    setAvatarModalVisible(true);
    Animated.parallel([
      Animated.timing(bgScale,      { toValue: 0.93, duration: 380, easing: easeOut, useNativeDriver: true }),
      Animated.timing(bgDim,        { toValue: 1,    duration: 350, useNativeDriver: true }),
      Animated.timing(modalScale,   { toValue: 1,    duration: 380, easing: easeOut, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 1,    duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);

  const startPlayer = useVideoPlayer(require('../../assets/avatar_start.mp4'), (player) => {
    player.muted = true;
    player.loop = false;
    if ('audioMixingMode' in player) (player as any).audioMixingMode = 'mixWithOthers';
  });
  const loopPlayer = useVideoPlayer(require('../../assets/avatar_loop.mp4'), (player) => {
    player.muted = true;
    player.loop = true;
    if ('audioMixingMode' in player) (player as any).audioMixingMode = 'mixWithOthers';
  });
  const crystalPlayer = useVideoPlayer(require('../../assets/crystal_btn.mp4'), (player) => {
    player.muted = true;
    player.loop = true;
    if ('audioMixingMode' in player) (player as any).audioMixingMode = 'mixWithOthers';
    player.play();
  });

  const closeModal = useCallback(() => {
    // Stop videos immediately — don't wait for animation to finish
    safePause(startPlayer);
    safePause(loopPlayer);
    const easeIn = Easing.in(Easing.ease);
    Animated.parallel([
      Animated.timing(bgScale,      { toValue: 1,    duration: 280, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(bgDim,        { toValue: 0,    duration: 260, easing: easeIn, useNativeDriver: true }),
      Animated.timing(modalScale,   { toValue: 0.92, duration: 240, easing: easeIn, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 0,    duration: 220, easing: easeIn, useNativeDriver: true }),
    ]).start(() => {
      setAvatarModalVisible(false);
      modalScale.setValue(0.92);
      modalOpacity.setValue(0);
      safePlay(crystalPlayer);
    });
  }, [startPlayer, loopPlayer, crystalPlayer]);

  useEffect(() => {
    const sub = startPlayer.addListener('statusChange', (ev: any) => {
      if (ev.status === 'readyToPlay') setVideosReady((p) => ({ ...p, start: true }));
    });
    const sub2 = startPlayer.addListener('playToEnd', () => {
      setAvatarPhase('loop');
      safeSeek(loopPlayer, 0);
      safePlay(loopPlayer);
    });
    const sub3 = loopPlayer.addListener('statusChange', (ev: any) => {
      if (ev.status === 'readyToPlay') setVideosReady((p) => ({ ...p, loop: true }));
    });
    return () => { sub.remove(); sub2.remove(); sub3.remove(); };
  }, [startPlayer, loopPlayer]);

  useEffect(() => {
    Asset.loadAsync([
      require('../../assets/avatar_start.mp4'),
      require('../../assets/avatar_loop.mp4'),
    ]);
  }, []);

  useEffect(() => {
    if (avatarModalVisible) {
      setAvatarPhase('start');
      safeSeek(startPlayer, 0);
      safePlay(startPlayer);
      // Fallback: if start video doesn't finish within 4s, switch to loop
      const fallbackTimer = setTimeout(() => {
        setAvatarPhase((p) => {
          if (p === 'start') {
            safeSeek(loopPlayer, 0);
            safePlay(loopPlayer);
            return 'loop';
          }
          return p;
        });
      }, 4000);
      Animated.parallel([
        Animated.timing(matrixAnim, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
        Animated.spring(matrixScale, { toValue: 1, tension: 60, friction: 8, delay: 200, useNativeDriver: true }),
      ]).start();
      if (!modalSummary) generateModalSummary();
      return () => clearTimeout(fallbackTimer);
    } else {
      matrixAnim.setValue(0);
      matrixScale.setValue(0.7);
      safePause(startPlayer);
      safePause(loopPlayer);
    }
  }, [avatarModalVisible]);

  const avatarModal = (
    <Modal
      visible={avatarModalVisible}
      transparent
      animationType="none"
      onRequestClose={closeModal}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop — closes modal when tapped outside */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closeModal} activeOpacity={1} />
        <Animated.View style={[styles.modalAnimBox, { opacity: modalOpacity, transform: [{ scale: modalScale }] }]}>
          {/* Close button */}
          <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
            <View nativeID="avatarVid" style={styles.avatarVideoWrap}>
              <VideoView
                player={startPlayer}
                style={[styles.avatarVideo, { opacity: avatarPhase === 'start' ? 1 : 0 }]}
                contentFit="cover"
                nativeControls={false}
              />
              <VideoView
                player={loopPlayer}
                style={[styles.avatarVideo, { opacity: avatarPhase === 'loop' ? 1 : 0 }]}
                contentFit="cover"
                nativeControls={false}
              />
              {Platform.OS === 'web' && (
                <style
                  dangerouslySetInnerHTML={{
                    __html: '#avatarVid video { width:100%!important; height:100%!important; object-fit:cover!important; }',
                  }}
                />
              )}
              {/* Edge gradients — hide video borders */}
              <LinearGradient
                colors={['#0D0B1E', 'transparent']}
                style={styles.avatarVideoFadeTop}
                pointerEvents="none"
              />
              <LinearGradient
                colors={['transparent', '#0D0B1E']}
                style={styles.avatarVideoFade}
                pointerEvents="none"
              />
              <LinearGradient
                colors={['#0D0B1E', 'transparent', 'transparent', '#0D0B1E']}
                locations={[0, 0.15, 0.85, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.avatarVideoSideFade}
                pointerEvents="none"
              />
            </View>

            {/* Title */}
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>{t.today.matrixDayModal}</Text>
            </View>

            {/* Matrix diagram */}
            <Animated.View style={[styles.modalMatrixWrap, { opacity: matrixAnim, transform: [{ scale: matrixScale }] }]}>
              <MatrixDiagram data={dailyMatrix} size={width * 0.55} />
            </Animated.View>

            {/* AI Summary */}
            <View style={styles.modalSummaryWrap}>
              {modalSummaryLoading ? (
                <View style={styles.modalSummaryLoading}>
                  <ActivityIndicator size="small" color={Colors.accent} />
                  <Text style={styles.modalSummaryLoadingText}>{t.today.aiAnalyzing}</Text>
                </View>
              ) : modalSummary ? (
                <FormattedText style={styles.modalSummaryText}>{modalSummary}</FormattedText>
              ) : null}
            </View>

            {/* CTA */}
            <View style={styles.modalCtaWrap}>
              <TouchableOpacity
                style={[styles.modalCtaBtn, { backgroundColor: Colors.accentMuted }]}
                onPress={() => {
                  closeModal();
                  if (isPremium) {
                    router.push('/matrix/create' as any);
                  } else {
                    router.push('/paywall' as any);
                  }
                }}
              >
                <Ionicons name={isPremium ? 'grid-outline' : 'lock-closed'} size={18} color={Colors.accent} />
                <Text style={[styles.modalCtaText, { color: Colors.accent }]}>
                  {isPremium ? t.today.myDestinyMatrix : t.today.unlockDestinyMatrix}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  // ── MAIN RENDER ──────────────────────────────────────────────────
  return (
    <StarBackground style={styles.root}>
      {avatarModal}
      {/* Depth-of-field dim overlay — shows through transparent Modal */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: bgDim }]}>
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      {/* Content — scales back when modal opens */}
      <Animated.View style={[styles.mainContentWrap, { transform: [{ scale: bgScale }] }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, wide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {userName ? t.today.greeting(userName) : t.today.goodDay}
            </Text>
            <Text style={styles.dateText}>{capitalDate}</Text>
          </View>
          <View style={styles.greetingRight}>
            <TouchableOpacity style={styles.crystalBtn} onPress={() => router.push('/paywall')}>
              <View pointerEvents="none" style={styles.crystalVideo}>
                <VideoView player={crystalPlayer} style={styles.crystalVideo} nativeControls={false} />
              </View>
              {unreadCount > 0 && <View style={styles.notifDot} />}
            </TouchableOpacity>
            <View style={styles.tokenBadge}>
              <Ionicons name="diamond-outline" size={14} color={Colors.accent} />
              <Text style={styles.tokenBadgeText}>{tokens}</Text>
            </View>
          </View>
        </View>

        {/* ── Числа матриці (плаваючі) ── */}
        <View style={styles.matrixNums}>
          {([
            { val: dailyMatrix?.personality, label: locale === 'uk' ? 'ОСОБИСТІСТЬ' : 'PERSONALITY' },
            { val: dailyMatrix?.soul,        label: locale === 'uk' ? 'ДУША' : 'SOUL' },
            { val: dailyMatrix?.destiny,     label: locale === 'uk' ? 'ДОЛЯ' : 'DESTINY' },
          ] as { val: number | undefined; label: string }[]).map((item) => (
            <View key={item.label} style={styles.matrixNumItem}>
              <Text style={styles.matrixNumVal}>{item.val ?? '—'}</Text>
              <Text style={styles.matrixNumLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Велика CTA кнопка ── */}
        <TouchableOpacity activeOpacity={0.88} onPress={openModal} style={styles.heroCta}>
          <LinearGradient
            colors={[Colors.accentLight, Colors.accent, Colors.accentDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroCtaGrad}
          >
            {/* Фіолетова іконка зі свіченням */}
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={styles.heroCtaIconWrap}
            >
              <Text style={styles.heroCtaIconNum}>{dailyEnergy}</Text>
            </LinearGradient>
            <Text style={styles.heroCtaText}>
              {locale === 'uk'
                ? 'ВІДКРИТИ МАТРИЦЮ\nСЬОГОДНІ'
                : 'OPEN MATRIX\nTODAY'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Енергія дня ── */}
        <View style={styles.energyDayWrap}>
          <View style={styles.energyDayHeader}>
            <Text style={styles.energyDayLabel}>
              {locale === 'uk' ? 'ЕНЕРГІЯ ДНЯ' : 'ENERGY OF DAY'}
            </Text>
            <TouchableOpacity onPress={() => router.push('/share')}>
              <Ionicons name="share-outline" size={16} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          </View>
          <View style={styles.energyDayMain}>
            <View style={styles.energyDayNumWrap}>
              <Text style={styles.energyDayNum}>{dailyEnergy}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.energyDayName}>
                {locale === 'uk' ? energy?.name : energy?.arcana}
                {energy?.planet ? `  ${energy.planet}` : ''}
              </Text>
              <Text style={styles.energyDayKeywords} numberOfLines={1}>
                {(locale === 'uk' ? energy?.keywords : energy?.keywordsEn ?? energy?.keywords)?.slice(0, 3).join(' · ')}
              </Text>
              <Text style={styles.energyDayAdvice} numberOfLines={2}>
                {locale === 'uk' ? energy?.advice : energy?.adviceEn ?? energy?.advice}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Матриця дня від AI Провідника (подарунок) ── */}
        {showGiftBlock && (
          <Animated.View style={[styles.giftCard, { transform: [{ scale: giftScale }] }]}>
            <Animated.View style={[styles.giftGlowOverlay, { opacity: giftGlow }]} />

            <View style={styles.giftTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.giftTitle}>
                  {(giftClaimedToday || justClaimed)
                    ? (locale === 'uk' ? 'Кристали отримано! ✨' : 'Crystals received! ✨')
                    : (locale === 'uk' ? 'Матриця дня від AI Провідника' : 'Daily Matrix from AI Guide')}
                </Text>
                <Text style={styles.giftSubtitle}>
                  {(giftClaimedToday || justClaimed)
                    ? t.gift.claimedSub(GIFT_DIAMONDS)
                    : (locale === 'uk'
                        ? `Забери ${GIFT_DIAMONDS} кристали для генерації Матриці дня`
                        : `Claim ${GIFT_DIAMONDS} crystals to generate your daily Matrix`)}
                </Text>
              </View>
              {(giftClaimedToday || justClaimed) && (
                <Animated.View style={justClaimed ? { transform: [{ scale: giftCheck }] } : undefined}>
                  <Ionicons name="checkmark-circle" size={32} color="#34D399" />
                </Animated.View>
              )}
            </View>

            {!(giftClaimedToday || justClaimed) && (
              <TouchableOpacity
                style={styles.giftClaimBtn}
                activeOpacity={0.8}
                onPress={handleClaimGift}
                disabled={giftAnimating}
              >
                <Text style={styles.giftEmoji}>🎁</Text>
                <Text style={styles.giftClaimText}>{t.gift.claim}</Text>
              </TouchableOpacity>
            )}

            {(giftClaimedToday || justClaimed) && (
              <View style={styles.giftHint}>
                <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.5)" />
                <Text style={styles.giftHintText}>
                  {locale === 'uk'
                    ? 'Використайте кристали на AI-аналіз. Невикористані зникнуть вночі.'
                    : 'Use crystals for AI analysis. Unused ones expire at midnight.'}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* ── Affirmation ── */}
        {affirmation && (
          <Card style={styles.affirmationCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.affirmationLabel}>
                {locale === 'uk' ? 'Порада дня' : 'Daily tip'}
              </Text>
              <Text style={styles.affirmationText}>{affirmation.body}</Text>
            </View>
          </Card>
        )}
      </ScrollView>
      </Animated.View>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 20 },
  contentWide: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl },

  // Greeting
  greetingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md,
  },
  greeting: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  dateText: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 2, textTransform: 'capitalize' },
  greetingRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(249,115,22,0.15)', paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: '#F97316',
  },
  streakEmoji: { fontSize: 16 },
  streakCount: { color: '#F97316', fontSize: FontSize.sm, fontWeight: '800' },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.bgCard,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  crystalBtn: {
    width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  crystalVideo: {
    width: 44, height: 58,
  },
  tokenBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accentMuted, paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.accentMuted,
  },
  tokenBadgeText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '800' },
  notifDot: {
    position: 'absolute', top: 6, right: 6, width: 8, height: 8,
    borderRadius: 4, backgroundColor: Colors.error, borderWidth: 1, borderColor: Colors.bg,
  },

  // Affirmation
  affirmationCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginBottom: Spacing.md, borderColor: Colors.accentMuted, paddingVertical: Spacing.sm,
  },
  affirmationLabel: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 },
  affirmationText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18, fontStyle: 'italic' },

  // ── Числа матриці (плаваючі) ──
  matrixNums: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  matrixNumItem: { alignItems: 'center', gap: 6, flex: 1 },
  matrixNumVal: {
    color: Colors.accent, fontSize: 44, fontWeight: '800',
    textShadowColor: Colors.accentDark, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14,
  },
  matrixNumLabel: {
    color: Colors.textMuted, fontSize: 9, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  // ── Велика CTA кнопка ──
  heroCta: {
    marginHorizontal: Spacing.xs, marginBottom: Spacing.lg,
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 18,
    elevation: 10,
  },
  heroCtaGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, paddingVertical: 22, paddingHorizontal: Spacing.xl,
  },
  heroCtaIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 12,
  },
  heroCtaIconNum: { color: Colors.primaryLight, fontSize: 22, fontWeight: '900' },
  heroCtaText: {
    color: Colors.bg, fontSize: FontSize.lg, fontWeight: '900',
    letterSpacing: 0.5, lineHeight: 24, textAlign: 'center',
  },

  // ── Енергія дня ──
  energyDayWrap: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  energyDayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  energyDayLabel: {
    color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  energyDayMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  energyDayNumWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.bgCardLight,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  energyDayNum: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  energyDayName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  energyDayKeywords: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 3 },
  energyDayAdvice: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 16 },

  // Section
  sectionTitle: {
    color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.sm, marginTop: Spacing.sm,
  },


  // Quick grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  quickItem: {
    width: (width - Spacing.lg * 2 - Spacing.sm) / 2, borderRadius: BorderRadius.lg, overflow: 'hidden',
  },
  quickItemFull: {
    borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.md,
  },
  quickGradient: { padding: Spacing.md, minHeight: 100, gap: Spacing.xs },
  quickTitle: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '700', marginTop: Spacing.xs },
  quickSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs },

  // AI promo
  aiPromoCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, padding: Spacing.lg, marginTop: Spacing.sm, marginBottom: Spacing.lg,
  },
  aiPromoInfo: { flex: 1 },
  aiPromoTitle: { color: '#FFFFFF', fontSize: FontSize.lg, fontWeight: '700' },
  aiPromoText: { color: '#A5B4FC', fontSize: FontSize.sm, marginTop: 2 },

  // Modal
  // Depth-of-field dim overlay (behind modal, above content)
  bgDimOverlay: {},
  mainContentWrap: { flex: 1 },

  // Modal transition
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  modalAnimBox: { width: '92%', height: SCREEN_H * 0.68, backgroundColor: '#0D0B1E', borderRadius: BorderRadius.xl, overflow: 'hidden' },
  avatarModalBox: { flex: 1 },
  modalCloseBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  avatarVideoWrap: { width: '100%', height: 160, backgroundColor: '#0D0B1E', overflow: 'hidden' },
  avatarVideo: { position: 'absolute', top: 0, left: -20, width: '110%', height: '100%' },
  avatarPlaceholder: { backgroundColor: '#0D0B1E', alignItems: 'center', justifyContent: 'center', zIndex: 0 },
  avatarVideoFadeTop: { position: 'absolute', top: 0, left: 0, width: '100%', height: 40, zIndex: 1 },
  avatarVideoFade: { position: 'absolute', bottom: 0, left: 0, width: '100%', height: 60, zIndex: 1 },
  avatarVideoSideFade: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 },
  modalTitleWrap: { alignItems: 'center', paddingTop: Spacing.sm, paddingHorizontal: Spacing.md },
  modalTitle: { color: '#FFF', fontSize: FontSize.lg, fontWeight: '700' },
  modalMatrixWrap: { alignItems: 'center', paddingVertical: Spacing.sm },
  modalSummaryWrap: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  modalSummaryLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  modalSummaryLoadingText: { color: Colors.textMuted, fontSize: FontSize.xs },
  modalSummaryText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  modalCtaWrap: { padding: Spacing.md, paddingTop: 0 },
  modalCtaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: BorderRadius.full,
    paddingVertical: 14, paddingHorizontal: Spacing.xl,
  },
  modalCtaText: { color: '#FFF', fontSize: FontSize.md, fontWeight: '700' },

  // ── Gift / Матриця дня від AI Провідника ──
  giftCard: {
    marginBottom: Spacing.md, borderRadius: BorderRadius.xl,
    backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.borderLight,
    padding: Spacing.md, overflow: 'hidden',
  },
  giftGlowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.accentMuted, borderRadius: BorderRadius.xl,
  },
  giftTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  giftEmoji: { fontSize: 18 },
  giftTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 3 },
  giftSubtitle: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 17 },
  giftClaimBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.bgCardLight, borderRadius: BorderRadius.lg,
    paddingVertical: 11,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  giftClaimText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  giftHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: Spacing.sm,
  },
  giftHintText: { flex: 1, color: Colors.textMuted, fontSize: 11, lineHeight: 15 },
});
