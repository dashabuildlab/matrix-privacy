import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n';
import { getLastTabPress } from '@/lib/tabState';
import { StarBackground } from '@/components/ui/StarBackground';

// ── Data ────────────────────────────────────────────────────────────────────

const getEncyclopedia = (isUk: boolean) => [
  {
    icon: 'grid-outline' as const, title: isUk ? 'Енергії Матриці' : 'Matrix Energies', count: 22, route: '/learn/matrix-guide',
    desc: isUk ? 'Глибокий розбір кожної з 22 точок' : 'Deep breakdown of each of the 22 points',
    result: isUk ? 'Розуміння свого коду долі' : 'Understanding your destiny code',
    color: '#8B5CF6',
  },
  {
    icon: 'flower-outline' as const, title: isUk ? 'Мапа чакр' : 'Chakra Map', count: 7, route: '/learn/chakras',
    desc: isUk ? 'Як енергія циркулює по тілу' : 'How energy circulates in the body',
    result: isUk ? 'Баланс здоров\'я та емоцій' : 'Health and emotional balance',
    color: '#10B981',
  },
  {
    icon: 'planet-outline' as const, title: isUk ? 'Космічний зв\'язок' : 'Cosmic Connection', count: 22, route: '/learn/planets',
    desc: isUk ? 'Планети та знаки зодіаку' : 'Planets and zodiac signs',
    result: isUk ? 'Повна картина особистості' : 'Complete personality picture',
    color: '#6366F1',
  },
  {
    icon: 'partly-sunny-outline' as const, title: isUk ? 'Знаки зодіаку' : 'Zodiac Signs', count: 12, route: '/learn/signs',
    desc: isUk ? 'Астрологічний контекст матриці' : 'Astrological context of the matrix',
    result: isUk ? 'Зв\'язок зірок та долі' : 'Connection of stars and destiny',
    color: '#0D9488',
  },
];

const getGames = (isUk: boolean) => [
  {
    id: 'memory', title: isUk ? 'Енергетичний пазл' : 'Energy puzzle',
    desc: isUk ? 'Перевертай картки та знаходь однакові пари енергій' : 'Flip cards and find matching energy pairs',
    icon: 'grid-outline' as const, route: '/learn/memory',
    badge: null,
  },
  {
    id: 'match', title: isUk ? 'Астро-матч' : 'Astro match',
    desc: isUk ? 'З\'єднай назву енергії з її планетою у двох колонках' : 'Connect energy names with their planets in two columns',
    icon: 'link-outline' as const, route: '/learn/match',
    badge: null,
  },
];

const getTests = (_isUk: boolean) => [] as {
  id: string; title: string; desc: string; icon: 'book-outline'; route: string;
}[];

// ── Component ───────────────────────────────────────────────────────────────

export default function LearnScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const { t, locale } = useI18n();
  const router = useRouter();
  const isUk = locale === 'uk';
  const ENCYCLOPEDIA = getEncyclopedia(isUk);
  const GAMES = getGames(isUk);
  const TESTS = getTests(isUk);

  useFocusEffect(
    useCallback(() => {
      const lastTabPress = getLastTabPress();
      if (lastTabPress?.tab === 'learn' && Date.now() - lastTabPress.ts < 500) {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    }, [])
  );

  return (
    <StarBackground style={{ flex: 1 }}>
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Hero ──────────────────────────────────────── */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4338CA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroTitle}>
          {isUk ? 'Таємниці вашої матриці' : 'Secrets of your matrix'}
        </Text>
        <Text style={styles.heroText}>
          {isUk
            ? 'Знання матриці = інструкція до власного життя. Розкрийте свій потенціал у кар\'єрі, стосунках, здоров\'ї та зрозумійте своє призначення.'
            : 'Knowing your matrix = manual to your life. Unlock your potential in career, relationships, health and understand your purpose.'}
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/learn/matrix-guide' as any)}
        >
          <LinearGradient colors={['#C8901A', '#F5C542', '#C8901A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heroCtaGrad}>
            <Text style={styles.heroCtaText}>{isUk ? 'Що таке матриця долі?' : 'What is the destiny matrix?'}</Text>
            <Ionicons name="arrow-forward" size={16} color="#1A0A00" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Довідник ──────────────────────────────────── */}
      <Text style={styles.sectionTitle}>
        {isUk ? 'Інтерактивний довідник' : 'Interactive reference'}
      </Text>
      <Text style={styles.subtitle}>
        {isUk ? 'Від теорії матриці до інструментів' : 'From matrix theory to tools'}
      </Text>

      {ENCYCLOPEDIA.map((item) => (
        <TouchableOpacity key={item.title} activeOpacity={0.7} onPress={() => router.push(item.route as any)}>
          <LinearGradient
            colors={['#160D40', '#241660']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.refRow}
          >
            <View style={[styles.refIcon, { backgroundColor: item.color + '1A' }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.refInfo}>
              <Text style={styles.refTitle}>{item.title}</Text>
              <Text style={styles.refDesc}>{item.desc}</Text>
            </View>
            <View style={styles.refRight}>
              <Text style={[styles.refCount, { color: item.color }]}>{item.count}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ))}

      {/* ── Практика (Ігри) — centered cards ─────────── */}
      <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>
        {isUk ? 'Практика та тренування' : 'Practice & training'}
      </Text>
      <Text style={styles.subtitle}>
        {isUk ? 'Вивчаємо матрицю через гру' : 'Learn the matrix through play'}
      </Text>

      <View style={styles.gamesGrid}>
        {GAMES.map((g) => (
          <TouchableOpacity key={g.id} style={styles.gameCard} activeOpacity={0.8} onPress={() => router.push(g.route as any)}>
            <LinearGradient colors={['#1A1050', '#2E1F80']} style={styles.gameGradient}>
              {/* Decorative stars */}
              <Text style={styles.decorStar1}>✦</Text>
              <Text style={styles.decorStar2}>✦</Text>
              {/* Badge */}
              {g.badge && (
                <View style={styles.gameBadge}>
                  <Text style={styles.gameBadgeText}>{g.badge}</Text>
                </View>
              )}
              {/* Icon with glow */}
              <View style={styles.gameIconGlow}>
                <View style={styles.gameIconWrap}>
                  <Ionicons name={g.icon} size={32} color={Colors.accent} />
                </View>
              </View>
              <Text style={styles.gameTitle}>{g.title}</Text>
              <Text style={styles.gameDesc}>{g.desc}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Тести — hidden when empty ──────────────── */}
      {TESTS.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            {isUk ? 'Перевірка знань' : 'Knowledge check'}
          </Text>
          <Text style={styles.subtitle}>
            {isUk ? 'Пройдіть іспит та отримайте досвід' : 'Pass the exam and earn experience'}
          </Text>
          <View style={styles.testsGrid}>
            {TESTS.map((g) => (
              <TouchableOpacity key={g.id} style={styles.testCard} activeOpacity={0.8} onPress={() => router.push(g.route as any)}>
                <LinearGradient colors={['#1A1050', '#2E1F80']} style={styles.testGradient}>
                  <View style={styles.testIconWrap}>
                    <Ionicons name={g.icon} size={28} color={Colors.accent} />
                  </View>
                  <View style={styles.testInfo}>
                    <Text style={styles.testTitle}>{g.title}</Text>
                    <Text style={styles.testDesc}>{g.desc}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── XP hint ──────────────────────────────────── */}
      <LinearGradient colors={['#160D40', '#241660']} style={styles.xpCard}>
        <Ionicons name="diamond" size={24} color={Colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.xpTitle}>
            {isUk ? 'Отримуйте досвід за навчання' : 'Earn experience for learning'}
          </Text>
          <Text style={styles.xpDesc}>
            {isUk
              ? 'Кожна прочитана стаття, пройдена гра та тест додає досвід. Піднімайте рівень від новачка до магістра матриці!'
              : 'Every article read, game played and test passed adds experience. Level up from novice to matrix magister!'}
          </Text>
        </View>
      </LinearGradient>

    </ScrollView>
    </StarBackground>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 40 },

  // Hero
  heroCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  heroTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.sm,
    textAlign: 'left',
  },
  heroText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroPillText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: '600' },
  heroCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  heroCtaText: { color: '#1A0A00', fontSize: FontSize.md, fontWeight: '800' },

  // Sections
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },

  // Reference list (horizontal rows like the design)
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  refIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  refInfo: { flex: 1 },
  refTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  refDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  refRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refCount: { fontSize: FontSize.sm, fontWeight: '700' },

  // Games grid — centered content, big icons
  gamesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg,
    alignItems: 'stretch',
  },
  gameCard: { width: '48%', flexGrow: 1, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  gameGradient: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg, paddingVertical: Spacing.xl,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  gameIconGlow: {
    marginBottom: Spacing.md,
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  gameIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(245,197,66,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(245,197,66,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  gameTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  gameDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 16, textAlign: 'center' },
  decorStar1: {
    position: 'absolute', top: 8, right: 10,
    color: 'rgba(245,197,66,0.15)', fontSize: 14,
  },
  decorStar2: {
    position: 'absolute', bottom: 10, left: 10,
    color: 'rgba(139,92,246,0.2)', fontSize: 10,
  },
  gameBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: Colors.accent,
    borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  gameBadgeText: {
    color: '#1A0A00', fontSize: 9, fontWeight: '800', letterSpacing: 0.5,
  },

  // Tests — horizontal cards with icon left
  testsGrid: { gap: Spacing.sm, marginBottom: Spacing.lg },
  testCard: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
  testGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  testIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(245,197,66,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(245,197,66,0.35)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  testInfo: { flex: 1 },
  testTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  testDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },

  // XP hint
  xpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  xpTitle: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 2 },
  xpDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 16 },
});
