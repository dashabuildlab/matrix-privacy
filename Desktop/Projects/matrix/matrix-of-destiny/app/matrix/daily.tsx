import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { EnergyBadge } from '@/components/ui/EnergyBadge';
import { getDailyEnergy, calculateMatrix } from '@/lib/matrix-calc';
import { getEnergyById } from '@/constants/energies';
import { useI18n } from '@/lib/i18n';
import { FormattedText } from '@/components/ui/FormattedText';
import { useAppStore } from '@/stores/useAppStore';
import { askClaude } from '@/lib/claude';
import { trackFeatureUsed, FEATURES } from '@/lib/analytics';

const DAILY_MATRIX_COST = 3;

export default function DailyMatrixScreen() {
  const { t, locale } = useI18n();
  const isUk = locale === 'uk';
  const router = useRouter();
  const isPremium = useAppStore((s) => s.isPremium);
  const tokens = useAppStore((s) => s.tokens);
  const spendCrystals = useAppStore((s) => s.spendCrystals);
  const userBirthDate = useAppStore((s) => s.userBirthDate);
  const personalMatrix = useAppStore((s) => s.personalMatrix);
  const getAiCache = useAppStore((s) => s.getAiCache);
  const setAiCache = useAppStore((s) => s.setAiCache);
  const addDailyMatrixEntry = useAppStore((s) => s.addDailyMatrixEntry);

  // Check if user has a gift (free daily from push)
  const claimedGiftToday = useAppStore((s) => s.claimedGiftToday);
  const todayStr = new Date().toISOString().split('T')[0];
  const hasGiftAccess = claimedGiftToday?.date === todayStr && claimedGiftToday?.type === 'matrix-ai';
  const hasCachedAnalysis = !!getAiCache(`daily_${todayStr}_${locale}`);

  // Already generated today — show cached, don't regenerate
  const alreadyGenerated = hasCachedAnalysis;
  // Can access: premium OR gift OR already generated OR has crystals
  const canAccess = isPremium || hasGiftAccess || alreadyGenerated || tokens >= DAILY_MATRIX_COST;
  const [crystalsSpent, setCrystalsSpent] = useState(false);

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dailyEnergyId = getDailyEnergy(today);
  const energy = getEnergyById(dailyEnergyId);
  const matrix = calculateMatrix(dateStr);

  // Personal matrix energies for cross-reference
  const persEnergy = personalMatrix ? getEnergyById(personalMatrix.personality) : null;
  const soulEnergy = personalMatrix ? getEnergyById(personalMatrix.soul) : null;

  // AI daily analysis
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    trackFeatureUsed(FEATURES.DAILY_MATRIX, 'matrix');
    if (!energy) return;

    // Check cache first — already generated today
    const cacheKey = `daily_${dateStr}_${locale}`;
    const cached = getAiCache(cacheKey);
    if (cached) { setAiAnalysis(cached); return; }

    // No crystals and not premium and no gift — block
    if (!canAccess) return;

    // Spend crystals for free users (not premium, not gift)
    if (!isPremium && !hasGiftAccess && !crystalsSpent) {
      if (!spendCrystals(DAILY_MATRIX_COST)) return;
      setCrystalsSpent(true);
    }

    const generate = async () => {
      setAiLoading(true);
      try {
        const generalE = getEnergyById(matrix.personality);
        const emotionsE = getEnergyById(matrix.soul);
        const actionsE = getEnergyById(matrix.destiny);
        const spiritE = getEnergyById(matrix.spiritual);

        const personalContext = personalMatrix && persEnergy && soulEnergy
          ? (isUk
            ? `\n\nОсобистий контекст користувача: Аркан Особистості — «${persEnergy.name}» (${persEnergy.keywords.join(', ')}), Аркан Душі — «${soulEnergy.name}». Як денні енергії впливають саме на цю людину з її унікальною матрицею.`
            : `\n\nUser's personal context: Personality Arcana — "${persEnergy.arcana}" (${(persEnergy.keywordsEn ?? persEnergy.keywords).join(', ')}), Soul Arcana — "${soulEnergy.arcana}". How daily energies affect this specific person.`)
          : '';

        const systemPrompt = isUk
          ? 'Ти — досвідчений езотерик-аналітик у застосунку "Матриця Долі". Пишеш розгорнуто, тепло, з конкретними рекомендаціями. Кожен абзац — окрема тема.'
          : 'You are an experienced esoteric analyst in the "Destiny Matrix" app. Write detailed, warm, specific recommendations. Each paragraph — separate topic.';

        const userMsg = isUk
          ? `Зроби детальний аналіз дня ${today.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}.

Денні енергії:
• Загальна: ${matrix.personality} — «${generalE?.name}» (${generalE?.keywords.join(', ')})
• Емоції: ${matrix.soul} — «${emotionsE?.name}» (${emotionsE?.keywords.join(', ')})
• Дії: ${matrix.destiny} — «${actionsE?.name}» (${actionsE?.keywords.join(', ')})
• Духовне: ${matrix.spiritual} — «${spiritE?.name}» (${spiritE?.keywords.join(', ')})
• Денна енергія: ${dailyEnergyId} — «${energy.name}» (${energy.keywords.join(', ')})
${personalContext}

${isPremium ? `Напиши ДЕТАЛЬНИЙ аналіз (6-8 абзаців) по КОЖНІЙ позиції матриці в контексті сьогоднішнього дня:
1. Загальна енергія дня — що несе цей день, яка атмосфера, головна тема
2. Емоційний фон (Душа дня) — як працюватимуть емоції, інтуїція, внутрішній стан
3. Дії та Рішення (Доля дня) — що варто робити, а чого уникати
4. Духовний аспект — зв'язок з вищими силами, медитації, знаки Всесвіту
5. Стосунки та спілкування — як будувати комунікацію
6. Робота та фінанси — на що звернути увагу
7. Здоров'я та тіло — як підтримати себе фізично
8. Персональна порада дня — конкретна дія з урахуванням вашої Матриці Долі` : `Напиши 4-5 абзаців:
1. Загальна енергія дня — що несе цей день, яка атмосфера
2. Стосунки та спілкування — як будувати комунікацію сьогодні
3. Робота та фінанси — на що звернути увагу в справах
4. Здоров'я та енергія — як підтримати себе
5. Порада дня — конкретна дія, яку варто зробити сьогодні`}

Пиши природно, ніби радиш другові. Без зайвої езотерики, але з містичним присмаком.`
          : `Provide a detailed analysis for ${today.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.

Daily energies:
• General: ${matrix.personality} — "${generalE?.arcana}" (${(generalE?.keywordsEn ?? generalE?.keywords ?? []).join(', ')})
• Emotions: ${matrix.soul} — "${emotionsE?.arcana}" (${(emotionsE?.keywordsEn ?? emotionsE?.keywords ?? []).join(', ')})
• Actions: ${matrix.destiny} — "${actionsE?.arcana}" (${(actionsE?.keywordsEn ?? actionsE?.keywords ?? []).join(', ')})
• Spiritual: ${matrix.spiritual} — "${spiritE?.arcana}" (${(spiritE?.keywordsEn ?? spiritE?.keywords ?? []).join(', ')})
• Daily energy: ${dailyEnergyId} — "${energy.arcana}" (${(energy.keywordsEn ?? energy.keywords).join(', ')})
${personalContext}

Write 4-5 paragraphs:
1. General day energy — what this day brings, the atmosphere
2. Relationships & communication — how to navigate interactions today
3. Work & finances — what to focus on
4. Health & energy — how to support yourself
5. Tip of the day — one specific action to take today

Write naturally, like advising a friend. Not overly esoteric, but with a mystical touch.`;

        const result = await askClaude(systemPrompt, [], userMsg);
        const cleaned = result.replace(/\*\*/g, '').replace(/\*/g, '').trim();
        setAiAnalysis(cleaned);
        setAiCache(cacheKey, cleaned);
        addDailyMatrixEntry({
          date: dateStr,
          dailyEnergyId,
          energyName: isUk ? energy.name : (energy.arcana ?? energy.name),
          matrixPersonality: matrix.personality,
          matrixSoul: matrix.soul,
          matrixDestiny: matrix.destiny,
          matrixSpiritual: matrix.spiritual,
          aiAnalysis: cleaned,
          locale,
        });
      } catch {
        setAiAnalysis(isUk
          ? 'Не вдалося завантажити аналіз. Спробуйте пізніше.'
          : 'Could not load analysis. Please try again later.');
      }
      setAiLoading(false);
    };
    generate();
  }, [canAccess, dateStr, locale]);

  // ── Locked state ──
  if (!canAccess) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.date}>
          {today.toLocaleDateString(isUk ? 'uk-UA' : 'en-US', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </Text>

        {/* Teaser — show energy name but lock the rest */}
        <Card style={styles.mainCard}>
          <EnergyBadge energyId={dailyEnergyId} size="lg" />
          <Text style={styles.energyName}>
            {dailyEnergyId}. {isUk ? energy?.name : energy?.arcana}
          </Text>
          <Text style={styles.keywords}>
            {(isUk ? energy?.keywords : energy?.keywordsEn ?? energy?.keywords)?.join(' · ')}
          </Text>
        </Card>

        {/* Premium CTA */}
        <LinearGradient colors={['#1E1B4B', '#0D0B1E']} style={styles.lockedCard}>
          <View style={styles.lockedIconWrap}>
            <Ionicons name="sparkles" size={28} color={Colors.accent} />
          </View>
          <Text style={styles.lockedTitle}>
            {isUk ? 'Детальний прогноз на сьогодні' : 'Detailed forecast for today'}
          </Text>
          <Text style={styles.lockedDesc}>
            {isUk
              ? 'Отримайте персональний AI-аналіз дня: стосунки, фінанси, здоров\'я та конкретна порада, що враховує вашу Матрицю Долі.'
              : 'Get a personal AI day analysis: relationships, finances, health and specific advice based on your Destiny Matrix.'}
          </Text>
          <View style={styles.lockedFeatures}>
            {[
              isUk ? 'Щоденний прогноз на основі вашої матриці' : 'Daily forecast based on your matrix',
              isUk ? 'Аналіз 4 сфер: стосунки, гроші, здоров\'я, дух' : 'Analysis of 4 areas: love, money, health, spirit',
              isUk ? 'Конкретна порада дня' : 'Specific daily advice',
            ].map((f) => (
              <View key={f} style={styles.lockedFeatureRow}>
                <Ionicons name="checkmark-circle" size={15} color="#22C55E" />
                <Text style={styles.lockedFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={{ gap: Spacing.sm }}>
            <View style={styles.lockedCrystalInfo}>
              <Ionicons name="diamond" size={14} color={Colors.accent} />
              <Text style={styles.lockedCrystalText}>
                {isUk
                  ? `Потрібно ${DAILY_MATRIX_COST} кристалів · У вас: ${tokens}. Заберіть подарунок або оформіть Premium.`
                  : `Need ${DAILY_MATRIX_COST} crystals · You have: ${tokens}. Claim a gift or get Premium.`}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/paywall' as any)}>
              <LinearGradient
                colors={['#C8901A', '#F5C542', '#C8901A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.lockedBtn}
              >
                <Ionicons name="diamond" size={16} color="#1A0A3E" />
                <Text style={styles.lockedBtnText}>{isUk ? 'Отримати Premium' : 'Get Premium'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    );
  }

  // ── Full access ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.date}>
        {today.toLocaleDateString(isUk ? 'uk-UA' : 'en-US', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })}
      </Text>

      {/* Main energy */}
      <Card style={styles.mainCard}>
        <EnergyBadge energyId={dailyEnergyId} size="lg" />
        <Text style={styles.energyName}>
          {dailyEnergyId}. {isUk ? energy?.name : energy?.arcana}
        </Text>
        <Text style={styles.keywords}>
          {(isUk ? energy?.keywords : energy?.keywordsEn ?? energy?.keywords)?.join(' · ')}
        </Text>
        <Text style={styles.advice}>{isUk ? energy?.advice : energy?.adviceEn ?? energy?.advice}</Text>
      </Card>

      {/* Energies grid */}
      <Text style={styles.sectionTitle}>{isUk ? 'Енергії Дня' : 'Energies of the Day'}</Text>
      <View style={styles.grid}>
        {[
          { label: isUk ? 'Загальна' : 'General', value: matrix.personality },
          { label: isUk ? 'Емоції' : 'Emotions', value: matrix.soul },
          { label: isUk ? 'Дії' : 'Actions', value: matrix.destiny },
          { label: isUk ? 'Духовне' : 'Spiritual', value: matrix.spiritual },
        ].map((item) => (
          <Card key={item.label} style={styles.gridItem}>
            <Text style={styles.gridLabel}>{item.label}</Text>
            <EnergyBadge energyId={item.value} size="md" showName />
          </Card>
        ))}
      </View>

      {/* AI Analysis */}
      <Text style={styles.sectionTitle}>
        <Ionicons name="sparkles" size={18} color={Colors.accent} />
        {'  '}{isUk ? 'AI-прогноз на сьогодні' : 'AI Forecast for Today'}
      </Text>
      {aiLoading ? (
        <Card style={styles.aiLoadingCard}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={styles.aiLoadingText}>
            {isUk ? 'AI аналізує енергії дня...' : 'AI is analyzing daily energies...'}
          </Text>
        </Card>
      ) : aiAnalysis ? (
        <>
          <Card style={styles.aiCard}>
            <FormattedText style={styles.aiText}>{aiAnalysis}</FormattedText>
          </Card>
          {alreadyGenerated && (
            <View style={{ backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 12, padding: 12, marginTop: Spacing.sm, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' }}>
              <Text style={{ color: Colors.primaryLight, fontSize: FontSize.sm, textAlign: 'center' }}>
                {isUk ? 'Матриця дня вже згенерована. Нова буде доступна завтра.' : 'Daily matrix already generated. A new one will be available tomorrow.'}
              </Text>
              <TouchableOpacity onPress={() => router.push('/profile/history' as any)} style={{ marginTop: 8 }}>
                <Text style={{ color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' }}>
                  {isUk ? 'Переглянути історію матриць' : 'View matrix history'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : null}

      {/* Ask AI button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          const question = isUk
            ? `Проаналізуй мій день ${today.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })} детальніше. Денна енергія: ${dailyEnergyId} (${energy?.name}). Загальна: ${matrix.personality}, Емоції: ${matrix.soul}, Дії: ${matrix.destiny}, Духовне: ${matrix.spiritual}.${personalMatrix ? ` Моя матриця: Особистість=${personalMatrix.personality}, Душа=${personalMatrix.soul}, Доля=${personalMatrix.destiny}.` : ''} Я хочу задати питання.`
            : `Analyze my day ${today.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })} in more detail. Daily energy: ${dailyEnergyId} (${energy?.arcana}). General: ${matrix.personality}, Emotions: ${matrix.soul}, Actions: ${matrix.destiny}, Spiritual: ${matrix.spiritual}.${personalMatrix ? ` My matrix: Personality=${personalMatrix.personality}, Soul=${personalMatrix.soul}, Destiny=${personalMatrix.destiny}.` : ''} I want to ask a question.`;
          router.push({ pathname: '/ai/chat', params: { initialQuestion: question, sessionTitle: isUk ? `Матриця дня ${today.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}` : `Daily matrix ${today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`, context: 'daily-matrix' } } as any);
        }}
      >
        <LinearGradient
          colors={['rgba(91,33,182,0.85)', 'rgba(55,10,120,0.85)']}
          style={styles.askBtn}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Ionicons name="chatbubbles" size={22} color={Colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.askBtnTitle}>{isUk ? 'Задати питання про цей день' : 'Ask about this day'}</Text>
            <Text style={styles.askBtnSub}>{isUk ? 'AI враховує ваші денні енергії та матрицю' : 'AI considers your daily energies & matrix'}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={Colors.accent} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Tip card */}
      <Card style={styles.tipCard}>
        <Text style={styles.tipTitle}>{isUk ? 'Позитивні якості дня' : 'Positive qualities'}</Text>
        <Text style={styles.tipText}>{isUk ? energy?.positive : energy?.positiveEn ?? energy?.positive}</Text>
        <Text style={styles.tipWarningLabel}>{isUk ? 'Чого варто уникати' : 'What to avoid'}</Text>
        <Text style={styles.tipWarning}>{isUk ? energy?.negative : energy?.negativeEn ?? energy?.negative}</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 20 },
  date: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginBottom: Spacing.lg,
    textTransform: 'capitalize',
  },
  mainCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  energyName: {
    color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginTop: Spacing.md,
  },
  keywords: {
    color: Colors.primaryLight, fontSize: FontSize.md, marginTop: Spacing.xs, textAlign: 'center',
  },
  advice: {
    color: Colors.textSecondary, fontSize: FontSize.md, marginTop: Spacing.md,
    textAlign: 'center', lineHeight: 22,
  },
  sectionTitle: {
    color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  gridItem: {
    width: '48%', alignItems: 'center', paddingVertical: Spacing.md,
  },
  gridLabel: {
    color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: Spacing.sm,
  },

  // AI section
  aiLoadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  aiLoadingText: { color: Colors.textMuted, fontSize: FontSize.sm, fontStyle: 'italic' },
  aiCard: { marginBottom: Spacing.lg },
  aiText: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24 },

  // Ask AI
  askBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderRadius: BorderRadius.xl, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  askBtnTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  askBtnSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },

  // Tip
  tipCard: { marginBottom: Spacing.lg },
  tipTitle: {
    color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm,
  },
  tipText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  tipWarningLabel: {
    color: '#FB923C', fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4,
  },
  tipWarning: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20 },

  // Locked state
  lockedCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  lockedIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(245,197,66,0.12)', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(245,197,66,0.25)',
  },
  lockedTitle: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '800',
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  lockedDesc: {
    color: Colors.textSecondary, fontSize: FontSize.sm,
    textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg,
  },
  lockedFeatures: { gap: Spacing.sm, width: '100%', marginBottom: Spacing.lg },
  lockedFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  lockedFeatureText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  lockedBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 52, paddingHorizontal: 32, borderRadius: BorderRadius.full,
  },
  lockedBtnText: { color: '#1A0A3E', fontSize: FontSize.md, fontWeight: '800' },
  lockedCrystalInfo: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  lockedCrystalText: { color: Colors.textMuted, fontSize: FontSize.sm },
});
