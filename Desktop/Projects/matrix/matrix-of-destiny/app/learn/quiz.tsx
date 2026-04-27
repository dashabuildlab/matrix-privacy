import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { StarBackground } from '@/components/ui/StarBackground';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { ENERGIES } from '@/lib/staticData';
import { GameInstructions } from '@/components/ui/GameInstructions';
import { GameResultsAnimation } from '@/components/ui/GameResultsAnimation';
import { trackFeatureUsed } from '@/lib/analytics';

const TOTAL_QUESTIONS = 10;

type Question = {
  cardId: number;
  cardName: string;
  type: 'keywords' | 'meaning' | 'planet';
  question: string;
  correct: string;
  options: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TarotQuizScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const addXP = useAppStore((s) => s.addXP);
  const setGameRecord = useAppStore((s) => s.setGameRecord);
  const getGameRecord = useAppStore((s) => s.getGameRecord);

  const questions = useMemo(() => {
    if (!ENERGIES.length) return [];
    const qs: Question[] = [];
    const shuffled = shuffle(ENERGIES).slice(0, TOTAL_QUESTIONS);

    for (const card of shuffled) {
      const type = shuffle(['keywords', 'meaning', 'planet'] as const)[0];

      let question = '';
      let correct = '';
      let wrongAnswers: string[] = [];

      if (type === 'keywords') {
        const correctVal = card.keywords.slice(0, 2).join(', ');
        question = t.quizStrings.quizKeywordsQ(card.name);
        correct = correctVal;
        // Filter out cards with same keywords
        wrongAnswers = shuffle(
          ENERGIES.filter((e) => e.id !== card.id && e.keywords.slice(0, 2).join(', ') !== correctVal)
        ).slice(0, 3).map((r) => r.keywords.slice(0, 2).join(', '));
      } else if (type === 'meaning') {
        question = t.quizStrings.quizMeaningQ(card.name);
        correct = card.positive;
        // Filter out cards with same positive meaning
        wrongAnswers = shuffle(
          ENERGIES.filter((e) => e.id !== card.id && e.positive !== card.positive)
        ).slice(0, 3).map((r) => r.positive);
      } else {
        question = t.quizStrings.quizPlanetQ(card.name);
        correct = card.planet;
        // Filter out cards with same planet
        wrongAnswers = shuffle(
          ENERGIES.filter((e) => e.id !== card.id && e.planet !== card.planet)
        ).slice(0, 3).map((r) => r.planet);
      }

      // Ensure no duplicate answers
      const uniqueWrong = [...new Set(wrongAnswers)].filter((w) => w !== correct).slice(0, 3);
      const options = shuffle([correct, ...uniqueWrong]);
      qs.push({ cardId: card.id, cardName: card.name, type, question, correct, options });
    }
    return qs;
  }, [ENERGIES]);

  const [showMenu, setShowMenu] = useState(true);
  const [quizFilter, setQuizFilter] = useState<'keywords' | 'meaning' | 'planet' | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const countdownAnim = useRef(new Animated.Value(0)).current;

  const q = questions[current];

  const handleSelect = (option: string) => {
    if (selected) return; // already answered
    setSelected(option);
    const isCorrect = option === q.correct;
    if (isCorrect) setScore((s) => s + 1);

    countdownAnim.setValue(1);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(feedbackAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(feedbackAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]),
      Animated.timing(countdownAnim, { toValue: 0, duration: 1850, useNativeDriver: false }),
    ]).start(() => {
      if (current + 1 >= questions.length) {
        const finalScore = isCorrect ? score + 1 : score;
        setFinished(true);
        addXP(finalScore * 10 + 20);
        trackFeatureUsed('quiz', 'learn', 'free');
        setIsNewRecord(setGameRecord('quiz', finalScore));
      } else {
        setCurrent((c) => c + 1);
        setSelected(null);
      }
    });
  };

  const restart = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
    setIsNewRecord(false);
  };

  const startQuizType = (type: 'keywords' | 'meaning' | 'planet' | null) => {
    setQuizFilter(type);
    setShowMenu(false);
    restart();
  };

  // GameInstructions must render on every path to avoid hook count mismatch
  const instructionsEl = (
    <GameInstructions
      gameId="quiz"
      title="Іспит майстра"
      steps={[
        'Вам буде задано 10 питань про карти матриці та їх значення.',
        'Оберіть правильну відповідь з 4 варіантів.',
        'За кожну правильну відповідь ви отримуєте досвід.',
        'Спробуйте набрати максимальний бал!',
      ]}
      onStart={() => setGameStarted(true)}
    />
  );

  if (!questions.length) return <>{instructionsEl}</>;

  // ── Menu screen ──
  if (showMenu) {
    return (
      <StarBackground style={styles.root}>
        {instructionsEl}
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: 56 }]}>
          {/* Header with back button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.xs }}>
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: FontSize.xxl, fontWeight: '800', flex: 1, marginLeft: Spacing.md }}>{t.quizStrings.quizTestsTitle}</Text>
          </View>
          <Text style={{ color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.xl }}>{t.quizStrings.quizTestsSubtitle}</Text>

          <TouchableOpacity onPress={() => startQuizType(null)} style={{ marginBottom: Spacing.md }}>
            <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.menuCard}>
              <Ionicons name="shuffle-outline" size={28} color="#A78BFA" />
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{locale === 'uk' ? 'Всі типи питань' : 'All question types'}</Text>
                <Text style={styles.menuDesc}>{locale === 'uk' ? 'Мікс з ключових слів, значень та планет' : 'Mix of keywords, meanings and planets'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => startQuizType('keywords')} style={{ marginBottom: Spacing.md }}>
            <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.menuCard}>
              <Ionicons name="key-outline" size={28} color="#F9A8D4" />
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{locale === 'uk' ? 'Ключові слова' : 'Keywords'}</Text>
                <Text style={styles.menuDesc}>{locale === 'uk' ? 'Вгадайте карту за її ключовими словами' : 'Guess the card by its keywords'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => startQuizType('meaning')} style={{ marginBottom: Spacing.md }}>
            <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.menuCard}>
              <Ionicons name="book-outline" size={28} color="#34D399" />
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{locale === 'uk' ? 'Значення карт' : 'Card meanings'}</Text>
                <Text style={styles.menuDesc}>{locale === 'uk' ? 'Визначте карту за її позитивним значенням' : 'Identify the card by its positive meaning'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => startQuizType('planet')} style={{ marginBottom: Spacing.md }}>
            <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.menuCard}>
              <Ionicons name="planet-outline" size={28} color="#FCD34D" />
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{locale === 'uk' ? 'Планети та стихії' : 'Planets & elements'}</Text>
                <Text style={styles.menuDesc}>{locale === 'uk' ? 'Яка планета відповідає карті?' : 'Which planet corresponds to the card?'}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </StarBackground>
    );
  }

  // ── Finished screen ──
  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <StarBackground style={styles.root}>
        {instructionsEl}
        <GameResultsAnimation
          title={t.quizStrings.quizResult}
          stars={pct >= 80 ? 3 : pct >= 50 ? 2 : 1}
          xp={score * 10 + 20}
          stats={[
            { label: locale === 'uk' ? 'Правильних:' : 'Correct:', value: `${score}/${questions.length}` },
            { label: '', value: `${pct}%` },
            ...(isNewRecord ? [{ label: '🏆', value: locale === 'uk' ? 'Новий рекорд!' : 'New record!' }] : []),
          ]}
        >
          <TouchableOpacity onPress={restart}>
            <LinearGradient colors={[Colors.accent, Colors.accentDark]} style={styles.btn}>
              <Ionicons name="refresh" size={18} color="#1A0A3E" />
              <Text style={styles.btnText}>{t.quizStrings.quizRetry}</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowMenu(true); restart(); }}>
            <Text style={styles.backLink}>{locale === 'uk' ? 'Повернутись до меню' : 'Back to menu'}</Text>
          </TouchableOpacity>
        </GameResultsAnimation>
      </StarBackground>
    );
  }

  // ── Question screen ──
  return (
    <StarBackground style={styles.root}>
      {instructionsEl}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{locale === 'uk' ? 'Іспит майстра' : 'Master exam'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{current + 1} / {questions.length}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((current + 1) / questions.length) * 100}%` }]} />
          </View>
          <Text style={styles.scoreText}>✓ {score}</Text>
        </View>

        {/* Card badge */}
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeNum}>{q.cardId}</Text>
        </View>
        <Text style={styles.cardBadgeName}>{q.cardName}</Text>

        {/* Question */}
        <Text style={styles.question}>{q.question}</Text>

        {/* Options */}
        {q.options.map((option, i) => {
          const isSelected = selected === option;
          const isCorrect = option === q.correct;
          const showResult = selected !== null;

          let borderColor = 'rgba(139,92,246,0.3)';
          let bg = 'transparent';
          if (showResult && isCorrect) {
            borderColor = '#22C55E';
            bg = 'rgba(34,197,94,0.12)';
          } else if (showResult && isSelected && !isCorrect) {
            borderColor = '#EF4444';
            bg = 'rgba(239,68,68,0.12)';
          }

          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => handleSelect(option)}
              disabled={selected !== null}
            >
              <Card style={[styles.option, { borderColor, backgroundColor: bg }]}>
                <Text style={styles.optionLetter}>{String.fromCharCode(65 + i)}</Text>
                <Text style={styles.optionText} numberOfLines={3}>{option}</Text>
                {showResult && isCorrect && <Ionicons name="checkmark-circle" size={20} color="#22C55E" />}
                {showResult && isSelected && !isCorrect && <Ionicons name="close-circle" size={20} color="#EF4444" />}
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Countdown bar */}
        {selected !== null && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>
              {current + 1 < questions.length
                ? (locale === 'uk' ? 'Наступне питання...' : 'Next question...')
                : (locale === 'uk' ? 'Завершення...' : 'Finishing...')}
            </Text>
            <View style={styles.countdownBarBg}>
              <Animated.View
                style={[
                  styles.countdownBarFill,
                  {
                    width: countdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        )}

      </ScrollView>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  _unused_closeBtn: {
    alignSelf: 'flex-end',
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 50,
    marginBottom: Spacing.sm,
  },

  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  progressText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600', width: 45 },
  progressBar: { flex: 1, height: 6, backgroundColor: 'rgba(139,92,246,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 3 },
  scoreText: { color: '#22C55E', fontSize: FontSize.sm, fontWeight: '700', width: 35, textAlign: 'right' },

  // Card badge
  cardBadge: {
    alignSelf: 'center',
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(91,33,182,0.6)',
    borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  cardBadgeNum: { color: Colors.accent, fontSize: FontSize.xl, fontWeight: '900' },
  cardBadgeName: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.md },

  // Question
  question: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },

  // Options
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  optionLetter: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '800',
    width: 22,
  },
  optionText: { flex: 1, color: '#fff', fontSize: FontSize.sm, lineHeight: 20 },

  // Finished
  finishedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  finishedEmoji: { fontSize: 60, marginBottom: Spacing.md },
  finishedTitle: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  finishedScore: { color: '#fff', fontSize: 48, fontWeight: '900', marginTop: 4 },
  finishedPct: { color: Colors.accent, fontSize: FontSize.lg, fontWeight: '700', marginTop: 4 },
  finishedXP: { color: '#22C55E', fontSize: FontSize.md, fontWeight: '700', marginTop: Spacing.sm },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: BorderRadius.lg,
  },
  btnText: { color: '#1A0A3E', fontSize: FontSize.md, fontWeight: '800' },
  backLink: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },

  // Record
  recordBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: 'rgba(245,197,66,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.3)',
  },
  recordText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' as const },
  prevRecord: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },

  // Countdown
  countdownContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center' as const,
  },
  countdownLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600' as const,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  countdownBarBg: {
    width: '100%' as const,
    height: 4,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  countdownBarFill: {
    height: '100%' as const,
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },

  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  menuTitle: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  menuDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});
