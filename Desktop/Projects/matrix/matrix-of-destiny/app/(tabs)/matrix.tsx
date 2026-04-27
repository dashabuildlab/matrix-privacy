import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { EnergyBadge } from '@/components/ui/EnergyBadge';
import { StarBackground } from '@/components/ui/StarBackground';
import { MatrixDiagram } from '@/components/matrix/MatrixDiagram';
import { DownloadAnalysisButton } from '@/components/matrix/DownloadAnalysisButton';
import { getEnergyById } from '@/constants/energies';
import { getDailyEnergy, calculateMatrix } from '@/lib/matrix-calc';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { getLastTabPress } from '@/lib/tabState';
import { useResponsive } from '@/hooks/useResponsive';
import { trackFeatureUsed, FEATURES, trackPushClaimTap, trackPushClaimSuccess, trackPushExpiredView } from '@/lib/analytics';

const { width } = Dimensions.get('window');

export default function MatrixScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isDesktop, isTablet } = useResponsive();
  const wide = isDesktop || isTablet;
  const savedMatrices = useAppStore((s) => s.savedMatrices);
  const personalMatrix = useAppStore((s) => s.personalMatrix);
  const matrixGenerated = useAppStore((s) => s.matrixGenerated);
  const isPremium = useAppStore((s) => s.isPremium);
  const userName = useAppStore((s) => s.userName);
  const userBirthDate = useAppStore((s) => s.userBirthDate);
  const streak  = useAppStore((s) => s.streak);
  const xp      = useAppStore((s) => s.xp);
  const level   = useAppStore((s) => s.level);
  const tokens  = useAppStore((s) => s.tokens);
  const pendingGift = useAppStore((s) => s.pendingGift);
  const claimedGiftToday = useAppStore((s) => s.claimedGiftToday);
  const claimPendingGift = useAppStore((s) => s.claimPendingGift);
  const useClaimedGift = useAppStore((s) => s.useClaimedGift);
  const setPersonalMatrix = useAppStore((s) => s.setPersonalMatrix);

  // Якщо personalMatrix не встановлена але є дата народження — обчислюємо
  React.useEffect(() => {
    trackFeatureUsed(FEATURES.MATRIX_VIEW, 'matrix');
    if (!personalMatrix && userBirthDate && isPremium) {
      try {
        // userBirthDate може бути DD.MM.YYYY — конвертуємо
        const parts = userBirthDate.split('.');
        const dateStr = parts.length === 3
          ? `${parts[2]}-${parts[1]}-${parts[0]}`
          : userBirthDate;
        const m = calculateMatrix(dateStr);
        setPersonalMatrix(m);
      } catch {}
    }
  }, [personalMatrix, userBirthDate, isPremium]);

  useFocusEffect(
    useCallback(() => {
      const lastTabPress = getLastTabPress();
      if (lastTabPress?.tab === 'matrix' && Date.now() - lastTabPress.ts < 500) {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    }, [])
  );

  // ── Матриця долі: до покупки (заблюрена демо + CTA) ──────
  const demoMatrix = React.useMemo(() => {
    try { return calculateMatrix('01.01.1990'); } catch { return null; }
  }, []);

  const lockedMatrixBlock = (
    <View style={{ marginBottom: Spacing.lg }}>
      {/* Blurred demo matrix */}
      <Card style={{ padding: Spacing.md, alignItems: 'center', overflow: 'hidden' }}>
        <Text style={{ color: Colors.accent, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 3, marginBottom: Spacing.sm }}>
          {locale === 'uk' ? '✦ МАТРИЦЯ ДОЛІ ✦' : '✦ DESTINY MATRIX ✦'}
        </Text>
        <View style={{ position: 'relative' }}>
          {demoMatrix && <MatrixDiagram data={demoMatrix} size={width - Spacing.lg * 4} />}
          {/* Blur overlay */}
          <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
            <LinearGradient
              colors={['rgba(13,11,30,0.4)', 'rgba(13,11,30,0.7)', 'rgba(13,11,30,0.95)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
          {/* Lock icon centered */}
          <View style={[StyleSheet.absoluteFill, { zIndex: 2, alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(245,197,66,0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="lock-closed" size={28} color="#F5C542" />
            </View>
          </View>
        </View>
      </Card>

      {/* CTA button */}
      <TouchableOpacity testID="matrix-unlock-btn" activeOpacity={0.85} onPress={() => router.push('/paywall' as any)} style={{ marginTop: Spacing.md }}>
        <LinearGradient
          colors={['#C8901A', '#F5C542', '#C8901A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 56, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
        >
          <Ionicons name="sparkles" size={18} color="#1A0800" />
          <Text style={{ color: '#1A0800', fontSize: FontSize.md, fontWeight: '800', letterSpacing: 1 }}>
            {locale === 'uk' ? 'Розкрити мою Матрицю' : 'Unlock my Matrix'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.sm }}>
        {locale === 'uk' ? 'Дізнайтесь свою долю, таланти та кармічні уроки' : 'Discover your destiny, talents and karmic lessons'}
      </Text>
    </View>
  );

  // ── Матриця долі: після покупки ────────────────────────────
  const personalityEnergy = personalMatrix ? getEnergyById(personalMatrix.personality) : null;
  const unlockedMatrixBlock = personalMatrix ? (
    <>
      {/* Діаграма */}
      <Card style={{ padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' }}>
        <Text style={{ color: Colors.accent, fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 3, marginBottom: 4 }}>{locale === 'uk' ? '✦ МАТРИЦЯ ДОЛІ ✦' : '✦ DESTINY MATRIX ✦'}</Text>
        <Text style={{ color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: 4 }}>{userName}</Text>
        <Text style={{ color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.md }}>{userBirthDate}</Text>
        <MatrixDiagram data={personalMatrix} size={width - Spacing.lg * 4} />
      </Card>

      {/* Завантажити аналіз */}
      <DownloadAnalysisButton
        matrixData={personalMatrix}
        name={userName ?? ''}
        birthDate={userBirthDate ?? ''}
        locale={locale}
        isPremium={isPremium}
      />

      {/* Кнопка чату */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          router.push({ pathname: '/ai/chat', params: { context: 'destiny-matrix' } } as any);
        }}
      >
        <LinearGradient
          colors={['rgba(91,33,182,0.85)', 'rgba(55,10,120,0.85)']}
          style={styles.aiRecommBanner}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Text style={styles.aiRecommDecor}>✦  ✧  ✦</Text>
          <View style={styles.aiRecommIconWrap}>
            <Ionicons name="chatbubbles" size={24} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiRecommTitle}>{locale === 'uk' ? 'Запитати AI-провідника про матрицю' : 'Ask AI about matrix'}</Text>
            <Text style={styles.aiRecommSubtitle}>{locale === 'uk' ? 'Обговоріть вашу долю з AI-езотериком' : 'Discuss your destiny with AI esoteric'}</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.accent} />
        </LinearGradient>
      </TouchableOpacity>
    </>
  ) : null;

  // ── Сумісність ────────────────────────────────────────────
  const compatibilityBlock = (
    <TouchableOpacity
      testID="matrix-compatibility-btn"
      activeOpacity={0.8}
      onPress={() => isPremium ? router.push('/matrix/compatibility' as any) : router.push('/paywall' as any)}
      style={{ borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md }}
    >
      <LinearGradient
        colors={['#831843', '#BE185D']}
        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, minHeight: 80 }}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', flexShrink: 0 }}>
          <Ionicons name="heart-outline" size={26} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '800', marginBottom: 3 }}>{locale === 'uk' ? 'Сумісність' : 'Compatibility'}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: FontSize.xs }}>{locale === 'uk' ? 'Порівняти матриці двох людей' : 'Compare two destiny matrices'}</Text>
        </View>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // ── AI Рекомендації ────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const dailyEnergy = getDailyEnergy();
  const energy = getEnergyById(dailyEnergy);
  const freeMatrixAI = claimedGiftToday?.date === today && claimedGiftToday?.type === 'matrix-ai';
  const aiRecommBlock = (
    <TouchableOpacity testID="matrix-ai-recommendations-btn" activeOpacity={0.85} onPress={() => {
      const q = locale === 'uk'
        ? `Енергія дня — ${dailyEnergy}. ${energy?.name}. Дай персональні рекомендації на основі матриці дня.`
        : `Energy of the day — ${dailyEnergy}. ${energy?.name}. Give personal recommendations based on the matrix of the day.`;
      if (freeMatrixAI) useClaimedGift();
      router.push({ pathname: '/ai/chat', params: { initialQuestion: q, freeGift: freeMatrixAI ? '1' : undefined } } as any);
    }}>
      <LinearGradient
        colors={['rgba(91,33,182,0.85)', 'rgba(55,10,120,0.85)']}
        style={styles.aiRecommBanner}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <Text style={styles.aiRecommDecor}>✦  ✧  ✦</Text>
        <View style={styles.aiRecommIconWrap}>
          <Ionicons name="sparkles" size={26} color={Colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiRecommTitle}>{locale === 'uk' ? 'Рекомендації AI' : 'AI Recommendations'}</Text>
          <Text style={styles.aiRecommSubtitle}>{locale === 'uk' ? 'Персональний аналіз вашої матриці' : 'Personal analysis of your matrix'}</Text>
        </View>
        {freeMatrixAI ? (
          <View style={[styles.aiRecommCost, { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.5)' }]}>
            <Ionicons name="gift" size={12} color="#10B981" />
            <Text style={[styles.aiRecommCostText, { color: '#10B981' }]}>{locale === 'uk' ? 'БЕЗКОШТОВНО' : 'FREE'}</Text>
          </View>
        ) : (
          <View style={styles.aiRecommCost}>
            <Ionicons name="diamond" size={12} color={Colors.accent} />
            <Text style={styles.aiRecommCostText}>3</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );

  const showMatrix = isPremium && !!personalMatrix;

  const hasGiftPending = pendingGift?.date === today;
  const hasExpiredGift = pendingGift && pendingGift.date !== today;

  // Track expired gift view
  React.useEffect(() => {
    if (hasExpiredGift) {
      trackPushExpiredView('gift_' + pendingGift?.date);
    }
  }, [hasExpiredGift]);
  const hasClaimedGift = claimedGiftToday?.date === today;

  const isUk = locale === 'uk';

  const handleClaimGift = () => {
    trackPushClaimTap();
    claimPendingGift();
    trackPushClaimSuccess(pendingGift?.type ?? 'unknown');
    if (pendingGift?.type === 'matrix-ai') {
      setTimeout(() => router.push('/matrix/daily' as any), 400);
    }
  };

  // Gift banner: shown when push notification was tapped today
  const giftBanner = hasGiftPending ? (
    <TouchableOpacity activeOpacity={0.9} onPress={handleClaimGift} style={styles.giftBannerWrap}>
      <LinearGradient
        colors={['#6D28D9', '#BE185D']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.giftBanner}
      >
        <Text style={styles.giftEmoji}>🎁</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.giftTitle}>
            {t.gift.pushMatrixTitle}
          </Text>
          <Text style={styles.giftExpiry}>{t.gift.pushExpiry}</Text>
        </View>
        <View style={styles.giftClaimBtn}>
          <Text style={styles.giftClaimText}>{t.gift.pushClaim}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  ) : null;

  // Claimed gift banner: shown after claim, guides user to use it
  const claimedBanner = !hasGiftPending && hasClaimedGift ? (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.giftBannerWrap}
      onPress={() => {
        if (claimedGiftToday.type === 'matrix-ai') router.push('/matrix/daily' as any);
      }}
    >
      <LinearGradient
        colors={['#059669', '#0D9488']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.giftBanner}
      >
        <Text style={styles.giftEmoji}>✅</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.giftTitle}>
            {t.gift.claimedMatrixTitle}
          </Text>
          <Text style={styles.giftExpiry}>
            {t.gift.claimedMatrixSub}
          </Text>
        </View>
        {claimedGiftToday.type === 'matrix-ai' && (
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        )}
      </LinearGradient>
    </TouchableOpacity>
  ) : null;

  return (
    <StarBackground style={styles.root}>
      <ScrollView
        ref={scrollRef}
        testID="matrix-view"
        style={styles.container}
        contentContainerStyle={[styles.content, wide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >
        {giftBanner}
        {claimedBanner}
        {showMatrix ? unlockedMatrixBlock : lockedMatrixBlock}
        {compatibilityBlock}

        {/* Conflict analysis */}
        <TouchableOpacity
          testID="matrix-conflict-btn"
          activeOpacity={0.8}
          onPress={() => isPremium ? router.push('/ai/conflict' as any) : router.push('/paywall' as any)}
          style={{ borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md }}
        >
          <LinearGradient
            colors={['rgba(60,10,100,0.9)', 'rgba(120,40,200,0.85)']}
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, minHeight: 80 }}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', flexShrink: 0 }}>
              <Ionicons name="people-outline" size={26} color="#DDD6FE" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '800', marginBottom: 3 }}>{t.ui.conflictAnalysis}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: FontSize.xs }}>{t.ui.conflictDesc}</Text>
            </View>
            <Ionicons name={isPremium ? 'chevron-forward' : 'lock-closed'} size={18} color="rgba(221,214,254,0.6)" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 20 },
  contentWide: { padding: 28, paddingBottom: 40 },

  // ── Two-column layout ────────────────────────────────────
  twoColRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  colLeft: { flex: 1.05, minWidth: 0 },
  colRight: { flex: 0.95, minWidth: 280 },

  // ── Gamify ──────────────────────────────────────────────
  gamifyBanner: {
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
    overflow: 'hidden',
    gap: Spacing.sm,
  },
  gamifyDecorTR: {
    position: 'absolute', top: 8, right: 12,
    color: 'rgba(245,197,66,0.18)', fontSize: 11, letterSpacing: 3,
  },
  gamifyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  gamifyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gamifyTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  gamifyViewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(139,92,246,0.22)',
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.45)',
  },
  gamifyViewText: { color: Colors.primaryLight, fontSize: FontSize.xs, fontWeight: '600' },
  gamifyStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gamifyStatItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  gamifyIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  gamifyValue: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  gamifyLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '500' },
  gamifyDivider: { width: 1, height: 24, backgroundColor: 'rgba(139,92,246,0.25)' },

  // ── Create Matrix (primary big button) ──────────────────
  createBtn: {
    borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md,
  },
  createBtnGrad: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, padding: Spacing.lg,
    minHeight: 80,
  },
  createBtnDecor: {
    position: 'absolute', top: 8, right: 16,
    color: 'rgba(255,255,255,0.12)', fontSize: 18,
  },
  createBtnIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    flexShrink: 0,
  },
  createBtnTitle: {
    color: '#fff', fontSize: FontSize.lg, fontWeight: '800', marginBottom: 3,
  },
  createBtnSub: {
    color: 'rgba(255,255,255,0.65)', fontSize: FontSize.xs, lineHeight: 16,
  },
  createBtnArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  // ── Secondary row ────────────────────────────────────────
  secondaryRow: {
    flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md,
  },
  secondaryCard: {
    borderRadius: BorderRadius.xl, overflow: 'hidden',
  },
  secondaryGrad: {
    padding: Spacing.md, gap: Spacing.xs,
    height: 120, justifyContent: 'center', overflow: 'hidden',
  },
  secondaryDecor: {
    position: 'absolute', top: 7, right: 9,
    color: 'rgba(255,255,255,0.12)', fontSize: 14,
  },
  secondaryIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  secondaryTitle: {
    color: '#fff', fontSize: FontSize.md, fontWeight: '700',
  },
  secondarySub: {
    color: 'rgba(255,255,255,0.55)', fontSize: FontSize.xs,
  },

  // ── AI Recommendations ───────────────────────────────────
  aiRecommBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.45)',
    overflow: 'hidden',
  },
  aiRecommDecor: {
    position: 'absolute', top: 7, right: 80,
    color: 'rgba(245,197,66,0.20)', fontSize: 11, letterSpacing: 3,
  },
  aiRecommIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(245,197,66,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.25)',
  },
  aiRecommTitle: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  aiRecommSubtitle: { color: Colors.textMuted, fontSize: FontSize.xs },
  aiRecommCost: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(245,197,66,0.15)',
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.40)',
  },
  aiRecommCostText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '800' },

  // ── Gift banner ──────────────────────────────────────────
  giftBannerWrap: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md },
  giftBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  giftEmoji: { fontSize: 28 },
  giftTitle: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '700', flexShrink: 1 },
  giftExpiry: { color: 'rgba(255,255,255,0.75)', fontSize: FontSize.xs, marginTop: 2 },
  giftClaimBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  giftClaimText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '700' },

  // ── History ──────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: Spacing.md, marginTop: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '700',
  },
  sectionBadge: {
    backgroundColor: 'rgba(139,92,246,0.25)',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.40)',
  },
  sectionBadgeText: {
    color: Colors.primaryLight, fontSize: 11, fontWeight: '700',
  },
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  historyAvatar: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  historyName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  historyDate: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  historyMore: {
    color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center',
    marginTop: Spacing.xs, paddingBottom: Spacing.sm,
  },

  // ── Empty state ──────────────────────────────────────────
  emptyCard: {
    alignItems: 'center', paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  emptyText: {
    color: Colors.textMuted, fontSize: FontSize.sm,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.md,
  },
});
