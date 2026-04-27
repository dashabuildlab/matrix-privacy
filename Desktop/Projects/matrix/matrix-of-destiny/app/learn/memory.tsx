import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
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

// ── Types ──────────────────────────────────────────────────────

type CardTile = {
  id: number;        // unique tile index
  pairId: number;    // shared by two identical tiles
  label: string;     // text shown on face
};

const PAIRS = 8;
const COLS = 4;
const ROWS = 4;
const GAP = Spacing.sm;

// ── Component ──────────────────────────────────────────────────

export default function MemoryMatchScreen() {
  const router = useRouter();
  const { locale } = useI18n();
  const isUk = locale === 'uk';
  const energies = ENERGIES?.length ? ENERGIES : FALLBACK_ENERGIES;
  const addXP = useAppStore((s) => s.addXP);
  const setGameRecordMin = useAppStore((s) => s.setGameRecordMin);
  const getGameRecord = useAppStore((s) => s.getGameRecord);

  // ── Board setup ────────────────────────────────────────────
  const tiles = useMemo<CardTile[]>(() => {
    const picked = shuffle(energies).slice(0, PAIRS);
    const pairs: CardTile[] = [];
    picked.forEach((e, idx) => {
      const name = isUk ? e.name : ((e as any).arcana ?? e.name);
      pairs.push({ id: idx * 2, pairId: idx, label: name });
      pairs.push({ id: idx * 2 + 1, pairId: idx, label: name });
    });
    return shuffle(pairs);
  }, [energies, isUk]);

  // ── Game state ─────────────────────────────────────────────
  const [flipped, setFlipped] = useState<number[]>([]);      // currently flipped (max 2)
  const flippedRef = useRef<number[]>([]);                   // sync ref for fast-click guard
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const matchedRef = useRef<Set<number>>(new Set());         // sync ref for matched tiles
  const [attempts, setAttempts] = useState(0);
  const [timer, setTimer] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const lockRef = useRef(false);

  // ── Flip animations (one per tile) ─────────────────────────
  const flipAnims = useRef<Animated.Value[]>(
    tiles.map(() => new Animated.Value(0)),
  ).current;

  // ── Timer (paused during instructions) ─────────────────────
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (finished || paused) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [finished, paused]);

  // ── Completion check ───────────────────────────────────────
  useEffect(() => {
    if (matched.size === PAIRS * 2 && !finished) {
      setFinished(true);
      const base = 50;
      const bonus = Math.max(0, 30 - (attempts - PAIRS) * 2);
      const total = base + bonus;
      setXpEarned(total);
      addXP(total);
      trackFeatureUsed('memory_game', 'learn', 'free');
      setIsNewRecord(setGameRecordMin('memory', attempts));
    }
  }, [matched.size]);

  // ── Tile press handler ─────────────────────────────────────
  const handlePress = (tileIndex: number) => {
    if (lockRef.current) return;
    // Belt-and-suspenders: never allow a 3rd card to flip even if lockRef
    // hasn't been set yet (can happen with rapid multi-touch on Android)
    if (flippedRef.current.length >= 2) return;
    // Use refs for synchronous fast-click guard (state updates are async)
    if (flippedRef.current.includes(tileIndex)) return;
    if (matchedRef.current.has(tileIndex)) return;

    // Lock immediately so any subsequent rapid taps are blocked
    const willBePairComplete = flippedRef.current.length === 1;
    if (willBePairComplete) lockRef.current = true;

    // Flip card face-up
    Animated.spring(flipAnims[tileIndex], {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();

    const next = [...flippedRef.current, tileIndex];
    flippedRef.current = next;     // update ref synchronously
    setFlipped(next);

    if (next.length === 2) {
      setAttempts((a) => a + 1);

      const [first, second] = next;
      const t1 = tiles[first];
      const t2 = tiles[second];

      if (t1.pairId === t2.pairId && first !== second) {
        // Match found
        setTimeout(() => {
          matchedRef.current = new Set([...matchedRef.current, first, second]);
          setMatched(new Set(matchedRef.current));
          flippedRef.current = [];
          setFlipped([]);
          lockRef.current = false;
        }, 400);
      } else {
        // No match — flip back after 1s
        setTimeout(() => {
          Animated.parallel([
            Animated.spring(flipAnims[first], {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 100,
            }),
            Animated.spring(flipAnims[second], {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 100,
            }),
          ]).start();
          flippedRef.current = [];
          setFlipped([]);
          lockRef.current = false;
        }, 1000);
      }
    }
  };

  // ── Reset game ─────────────────────────────────────────────
  const resetGame = () => {
    flipAnims.forEach((a) => a.setValue(0));
    flippedRef.current = [];
    matchedRef.current = new Set();
    setFlipped([]);
    setMatched(new Set());
    setAttempts(0);
    setTimer(0);
    setFinished(false);
    setXpEarned(0);
    setIsNewRecord(false);
    lockRef.current = false;
  };

  // ── Dimensions ─────────────────────────────────────────────
  const screenWidth = Dimensions.get('window').width;
  const boardPadding = Spacing.md * 2;
  const totalGap = GAP * (COLS - 1);
  const tileSize = Math.floor(
    (screenWidth - boardPadding - totalGap) / COLS,
  );

  // ── Render tile ────────────────────────────────────────────
  const renderTile = (tileIndex: number) => {
    const tile = tiles[tileIndex];
    const isMatched = matched.has(tileIndex);
    const anim = flipAnims[tileIndex];

    const frontRotate = anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });
    const backRotate = anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['180deg', '360deg'],
    });
    const frontOpacity = anim.interpolate({
      inputRange: [0, 0.5, 0.5, 1],
      outputRange: [1, 1, 0, 0],
    });
    const backOpacity = anim.interpolate({
      inputRange: [0, 0.5, 0.5, 1],
      outputRange: [0, 0, 1, 1],
    });

    return (
      <View
        key={tile.id}
        style={[styles.tileWrapper, { width: tileSize, height: tileSize }]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handlePress(tileIndex)}
          style={StyleSheet.absoluteFill}
        >
          {/* Back of card (face-down) */}
          <Animated.View
            style={[
              styles.tileFace,
              styles.tileBack,
              {
                width: tileSize,
                height: tileSize,
                transform: [{ rotateY: frontRotate }],
                opacity: frontOpacity,
              },
            ]}
          >
            <Ionicons name="help" size={28} color={Colors.primaryLight} />
          </Animated.View>

          {/* Front of card (face-up) */}
          <Animated.View
            style={[
              styles.tileFace,
              styles.tileFront,
              isMatched && styles.tileMatched,
              {
                width: tileSize,
                height: tileSize,
                transform: [{ rotateY: backRotate }],
                opacity: backOpacity,
              },
            ]}
          >
            <Text
              style={styles.tileLabel}
              numberOfLines={2}
              adjustsFontSizeToFit
            >
              {tile.label}
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Result screen ──────────────────────────────────────────
  const screenHeader = <Stack.Screen options={{ headerShown: false }} />;

  if (finished) {
    const stars = attempts <= PAIRS + 2 ? 3 : attempts <= PAIRS + 5 ? 2 : 1;
    return (
      <LinearGradient colors={[...Colors.gradientDark]} style={styles.container}>
        {screenHeader}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isUk ? 'Енергетичний пазл' : 'Energy Puzzle'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <GameResultsAnimation
          title={isUk ? 'Вітаємо!' : 'Congratulations!'}
          stars={stars}
          xp={xpEarned}
          stats={[
            { label: isUk ? 'Спроби:' : 'Attempts:', value: String(attempts) },
            { label: isUk ? 'Час:' : 'Time:', value: formatTime(timer) },
            ...(isNewRecord ? [{ label: '🏆', value: isUk ? 'Новий рекорд!' : 'New record!' }] : []),
            ...(!isNewRecord && getGameRecord('memory') > 0 ? [{ label: isUk ? 'Рекорд:' : 'Record:', value: `${getGameRecord('memory')} ${isUk ? 'спроб' : 'attempts'}` }] : []),
          ]}
        >

            <TouchableOpacity style={styles.retryBtn} onPress={resetGame}>
              <LinearGradient
                colors={[...Colors.gradientPurple]}
                style={styles.retryGradient}
              >
                <Ionicons name="reload" size={20} color={Colors.text} />
                <Text style={styles.retryText}>{isUk ? 'Грати знову' : 'Play again'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.back()}
            >
              <Text style={styles.backLinkText}>{isUk ? 'Повернутися' : 'Go back'}</Text>
            </TouchableOpacity>
        </GameResultsAnimation>
      </LinearGradient>
    );
  }

  // ── Main game screen ───────────────────────────────────────
  return (
    <LinearGradient colors={[...Colors.gradientDark]} style={styles.container}>
      {screenHeader}
      <GameInstructions
        gameId="memory"
        title="Енергетичний пазл"
        steps={[
          'На екрані карти — перевернуті рубашкою вгору.',
          'Натисніть на карту щоб відкрити її.',
          'Знайдіть дві картки з однаковим словом.',
          'Чим менше спроб — тим більше досвіду!',
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
        <Text style={styles.headerTitle}>{isUk ? 'Енергетичний пазл' : 'Energy Puzzle'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Ionicons name="refresh" size={16} color={Colors.primaryLight} />
          <Text style={styles.statText}>{attempts}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time" size={16} color={Colors.primaryLight} />
          <Text style={styles.statText}>{formatTime(timer)}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.statText}>
            {matched.size / 2}/{PAIRS}
          </Text>
        </View>
      </View>

      {/* Board */}
      <View style={styles.board}>
        {Array.from({ length: ROWS }, (_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: COLS }, (_, col) => {
              const idx = row * COLS + col;
              return renderTile(idx);
            })}
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

// ── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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

  // Stats
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },

  // Board
  board: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
    marginBottom: GAP,
  },

  // Tiles
  tileWrapper: {
    transform: [{ perspective: 800 }],
  },
  tileFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    padding: Spacing.xs,
  },
  tileBack: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tileFront: {
    backgroundColor: Colors.primaryDark,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  tileMatched: {
    backgroundColor: 'rgba(34, 197, 94, 0.20)',
    borderColor: '#22C55E',
  },
  tileLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },

  // Record
  recordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: 'rgba(245,197,66,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.3)',
  },
  recordBadgeText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' },
  prevRecord: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },

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
