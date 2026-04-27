import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';
import { FALLBACK_ENERGIES } from '@/lib/fallbackData';
import { ENERGIES } from '@/lib/staticData';
import { useI18n } from '@/lib/i18n';
import { GameInstructions } from '@/components/ui/GameInstructions';
import { GameResultsAnimation } from '@/components/ui/GameResultsAnimation';
import { trackFeatureUsed } from '@/lib/analytics';

// ── Helpers ────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Constants ──────────────────────────────────────────────────

const PAIRS = 6;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COL_WIDTH = (SCREEN_WIDTH - Spacing.md * 3) / 2;

type Pair = {
  id: number;
  name: string;
  planet: string;
};

// ── Component ──────────────────────────────────────────────────

export default function MatchPairsScreen() {
  const router = useRouter();
  const { locale } = useI18n();
  const isUk = locale === 'uk';
  const energies = ENERGIES?.length ? ENERGIES : FALLBACK_ENERGIES;
  const addXP = useAppStore((s) => s.addXP);

  // ── Game state ───────────────────────────────────────────────
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [leftItems, setLeftItems] = useState<Pair[]>([]);
  const [rightItems, setRightItems] = useState<Pair[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [wrongLeft, setWrongLeft] = useState<number | null>(null);
  const [wrongRight, setWrongRight] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  // Animated fade values per pair id
  const fadeAnims = useRef<Map<number, Animated.Value>>(new Map());

  // ── Init game ────────────────────────────────────────────────
  const initGame = useCallback(() => {
    // Pick unique name-planet combos (deduplicate by planet)
    const seen = new Set<string>();
    const unique = energies.filter((e) => {
      if (seen.has(e.name + e.planet)) return false;
      seen.add(e.name + e.planet);
      return true;
    });
    const picked = shuffle(unique).slice(0, PAIRS);
    const pairData: Pair[] = picked.map((e, i) => ({
      id: i,
      name: isUk ? e.name : ((e as any).arcana ?? e.name),
      planet: isUk ? e.planet : ((e as any).planetEn ?? e.planet),
    }));

    setPairs(pairData);
    setLeftItems(shuffle([...pairData]));
    setRightItems(shuffle([...pairData]));
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedIds(new Set());
    setWrongLeft(null);
    setWrongRight(null);
    setTimer(0);
    setFinished(false);
    setXpEarned(0);

    // Reset fade animations
    const fades = new Map<number, Animated.Value>();
    pairData.forEach((p) => fades.set(p.id, new Animated.Value(1)));
    fadeAnims.current = fades;
  }, [energies]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // ── Timer (paused during instructions) ──────────────────────
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (finished || pairs.length === 0 || paused) return;
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [finished, pairs.length, paused]);

  // ── Check match ──────────────────────────────────────────────
  useEffect(() => {
    if (selectedLeft === null || selectedRight === null) return;

    if (selectedLeft === selectedRight) {
      const id = selectedLeft;

      // Fade out animation
      const anim = fadeAnims.current.get(id);
      if (anim) {
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }

      setTimeout(() => {
        // Functional update — always based on latest state, no stale closure
        setMatchedIds((prev) => new Set([...prev, id]));
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 400);
    } else {
      // Wrong match — red flash
      setWrongLeft(selectedLeft);
      setWrongRight(selectedRight);
      setTimeout(() => {
        setWrongLeft(null);
        setWrongRight(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 500);
    }
  }, [selectedLeft, selectedRight]);

  // ── Check game completion (separate effect — always sees fresh matchedIds) ──
  useEffect(() => {
    if (pairs.length === 0 || finished) return;
    if (matchedIds.size === PAIRS) {
      const baseXP = 20;
      const bonus = timer < 30 ? 20 : timer < 60 ? 10 : 0;
      const total = baseXP + bonus;
      setXpEarned(total);
      addXP(total);
      trackFeatureUsed('match_game', 'learn', 'free');
      setFinished(true);
    }
  }, [matchedIds.size]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleLeftPress = (id: number) => {
    if (matchedIds.has(id) || wrongLeft !== null) return;
    setSelectedLeft(id);
  };

  const handleRightPress = (id: number) => {
    if (matchedIds.has(id) || wrongRight !== null) return;
    setSelectedRight(id);
  };

  const screenHeader = <Stack.Screen options={{ headerShown: false }} />;

  // ── Result screen ────────────────────────────────────────────
  if (finished) {
    const stars = timer < 30 ? 3 : timer < 60 ? 2 : 1;
    return (
      <LinearGradient colors={[...Colors.gradientDark]} style={styles.container}>
        {screenHeader}
        <GameResultsAnimation
          title={isUk ? 'Чудово!' : 'Excellent!'}
          stars={stars}
          xp={xpEarned}
          stats={[
            { label: isUk ? 'Час:' : 'Time:', value: formatTime(timer) },
            { label: isUk ? 'Пари:' : 'Pairs:', value: `${matchedIds.size}/${PAIRS}` },
          ]}
        >
          <TouchableOpacity style={styles.retryBtn} onPress={initGame}>
            <LinearGradient colors={[...Colors.gradientPurple]} style={styles.retryGradient}>
              <Ionicons name="reload" size={20} color={Colors.text} />
              <Text style={styles.retryText}>{isUk ? 'Грати знову' : 'Play again'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLinkText}>{isUk ? 'Повернутися' : 'Go back'}</Text>
          </TouchableOpacity>
        </GameResultsAnimation>
      </LinearGradient>
    );
  }

  // ── Main game screen ─────────────────────────────────────────
  return (
    <LinearGradient colors={[...Colors.gradientDark]} style={styles.container}>
      {screenHeader}
      <GameInstructions
        gameId="match"
        title="Астро-матч"
        steps={[
          'Зліва — назви енергій, справа — планети.',
          'Натисніть на карту зліва, потім на її планету справа.',
          'Якщо пара правильна — вона зникає.',
          'З\'єднайте всі пари якомога швидше!',
        ]}
        onStart={() => {}}
        onPause={() => setPaused(true)}
        onResume={() => setPaused(false)}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isUk ? 'Астро-матч' : 'Astro Match'}</Text>
        <View style={styles.timerBadge}>
          <Ionicons name="time" size={16} color={Colors.primaryLight} />
          <Text style={styles.timerText}>{formatTime(timer)}</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <Text style={styles.progressText}>
          {matchedIds.size}/{PAIRS} {isUk ? 'пар' : 'pairs'}
        </Text>
      </View>

      {/* Two columns */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.columnsContainer}
      >
        {/* Left column — card names */}
        <View style={styles.column}>
          <Text style={styles.columnTitle}>{isUk ? 'Енергія' : 'Energy'}</Text>
          {leftItems.map((item) => {
            const isMatched = matchedIds.has(item.id);
            const isSelected = selectedLeft === item.id;
            const isWrong = wrongLeft === item.id;
            const fadeAnim = fadeAnims.current.get(item.id);

            return (
              <Animated.View
                key={`left-${item.id}`}
                style={[
                  { opacity: fadeAnim ?? 1 },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleLeftPress(item.id)}
                  disabled={isMatched}
                  style={[
                    styles.itemCard,
                    styles.itemLeft,
                    isSelected && styles.itemSelected,
                    isWrong && styles.itemWrong,
                    isMatched && styles.itemMatched,
                  ]}
                >
                  <Text
                    style={[
                      styles.itemText,
                      isMatched && styles.itemTextMatched,
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Right column — planets */}
        <View style={styles.column}>
          <Text style={styles.columnTitle}>{isUk ? 'Планета' : 'Planet'}</Text>
          {rightItems.map((item) => {
            const isMatched = matchedIds.has(item.id);
            const isSelected = selectedRight === item.id;
            const isWrong = wrongRight === item.id;
            const fadeAnim = fadeAnims.current.get(item.id);

            return (
              <Animated.View
                key={`right-${item.id}`}
                style={[
                  { opacity: fadeAnim ?? 1 },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleRightPress(item.id)}
                  disabled={isMatched}
                  style={[
                    styles.itemCard,
                    styles.itemRight,
                    isSelected && styles.itemSelected,
                    isWrong && styles.itemWrong,
                    isMatched && styles.itemMatched,
                  ]}
                >
                  <Text
                    style={[
                      styles.itemText,
                      isMatched && styles.itemTextMatched,
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                  >
                    {item.planet}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: Spacing.md,
    paddingRight: 52,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  timerText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },

  // Progress
  progressBar: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  progressText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Columns
  scrollArea: {
    flex: 1,
  },
  columnsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  column: {
    flex: 1,
    gap: Spacing.md,
  },
  columnTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },

  // Items
  itemCard: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  itemLeft: {
    backgroundColor: 'rgba(91, 33, 182, 0.45)',
    borderColor: 'rgba(139, 92, 246, 0.30)',
  },
  itemRight: {
    backgroundColor: 'rgba(49, 46, 129, 0.50)',
    borderColor: 'rgba(99, 102, 241, 0.30)',
  },
  itemSelected: {
    borderColor: Colors.accent,
    borderWidth: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  itemWrong: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 2,
  },
  itemMatched: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.40)',
  },
  itemText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  itemTextMatched: {
    color: Colors.textMuted,
  },

  // Result screen
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  resultCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resultLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  resultValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    width: '100%',
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  retryText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  backLink: {
    marginTop: Spacing.md,
  },
  backLinkText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});
