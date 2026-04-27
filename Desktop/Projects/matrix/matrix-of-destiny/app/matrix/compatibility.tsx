import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { calculateMatrix, calculateCompatibility } from '@/lib/matrix-calc';
import { getEnergyById } from '@/constants/energies';
import { useI18n } from '@/lib/i18n';
import { FormattedText } from '@/components/ui/FormattedText';
import { useAppStore } from '@/stores/useAppStore';
import { askClaude } from '@/lib/claude';
import { trackFeatureUsed, FEATURES } from '@/lib/analytics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const digitsOnly = (v: string, maxLen: number): string => v.replace(/\D/g, '').slice(0, maxLen);

const isFieldInvalid = (value: string, min: number, max: number, maxLen: number): boolean => {
  if (!value || value.length < maxLen) return false;
  const num = parseInt(value, 10);
  return num < min || num > max;
};

const DateInputGroup = ({
  label,
  value,
  onChange,
  locale,
}: {
  label: string;
  value: { day: string; month: string; year: string };
  onChange: (v: { day: string; month: string; year: string }) => void;
  locale: string;
}) => {
  const dayInvalid = isFieldInvalid(value.day, 1, 31, 2);
  const monthInvalid = isFieldInvalid(value.month, 1, 12, 2);
  const yearInvalid = isFieldInvalid(value.year, 1920, 2015, 4);
  const hasError = dayInvalid || monthInvalid || yearInvalid;
  const isUk = locale === 'uk';

  return (
  <View>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.dateRow}>
      <TextInput
        style={[styles.input, styles.dateInput, dayInvalid && styles.inputError]}
        value={value.day}
        onChangeText={(t) => onChange({ ...value, day: digitsOnly(t, 2) })}
        placeholder={isUk ? 'ДД' : 'DD'}
        placeholderTextColor={Colors.textMuted}
        keyboardType="number-pad"
        maxLength={2}
      />
      <TextInput
        style={[styles.input, styles.dateInput, monthInvalid && styles.inputError]}
        value={value.month}
        onChangeText={(t) => onChange({ ...value, month: digitsOnly(t, 2) })}
        placeholder={isUk ? 'ММ' : 'MM'}
        placeholderTextColor={Colors.textMuted}
        keyboardType="number-pad"
        maxLength={2}
      />
      <TextInput
        style={[styles.input, styles.yearInput, yearInvalid && styles.inputError]}
        value={value.year}
        onChangeText={(t) => onChange({ ...value, year: digitsOnly(t, 4) })}
        placeholder={isUk ? 'РРРР' : 'YYYY'}
        placeholderTextColor={Colors.textMuted}
        keyboardType="number-pad"
        maxLength={4}
      />
    </View>
    {hasError && (
      <Text style={styles.errorHint}>
        {dayInvalid ? (isUk ? 'День: 01–31' : 'Day: 01–31') : monthInvalid ? (isUk ? 'Місяць: 01–12' : 'Month: 01–12') : (isUk ? 'Рік: 1920–2015' : 'Year: 1920–2015')}
      </Text>
    )}
  </View>
  );
};

export default function CompatibilityScreen() {
  const { locale } = useI18n();
  const isUk = locale === 'uk';
  const router = useRouter();
  const [date1, setDate1] = useState({ day: '', month: '', year: '' });
  const [date2, setDate2] = useState({ day: '', month: '', year: '' });
  const [result, setResult] = useState<ReturnType<typeof calculateCompatibility> | null>(null);
  const [dateStr1, setDateStr1] = useState('');
  const [dateStr2, setDateStr2] = useState('');

  // AI interpretation
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const addCompatibilityReading = useAppStore((s) => s.addCompatibilityReading);
  const getCompatibilityReading = useAppStore((s) => s.getCompatibilityReading);

  // ── Build deterministic cache ID from sorted dates + locale ──
  const makeCacheId = (d1: string, d2: string, loc: string) => {
    const sorted = [d1, d2].sort();
    return `${sorted[0]}_${sorted[1]}_${loc}`;
  };

  const isPremium = useAppStore((s) => s.isPremium);

  const handleCalculate = () => {
    if (!isPremium) {
      Alert.alert(
        isUk ? 'Преміум функція' : 'Premium Feature',
        isUk ? 'Аналіз сумісності доступний з Premium підпискою' : 'Compatibility analysis is available with Premium subscription',
        [
          { text: 'Premium', onPress: () => router.push('/paywall' as any) },
          { text: isUk ? 'Закрити' : 'Close', style: 'cancel' },
        ]
      );
      return;
    }

    const d1 = parseInt(date1.day), m1 = parseInt(date1.month), y1 = parseInt(date1.year);
    const d2 = parseInt(date2.day), m2 = parseInt(date2.month), y2 = parseInt(date2.year);

    // Validate ranges
    const hasInvalid = (d: number, m: number, y: number) =>
      !d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1920 || y > 2015;
    if (hasInvalid(d1, m1, y1) || hasInvalid(d2, m2, y2)) {
      Alert.alert(
        isUk ? 'Перевірте дати' : 'Check dates',
        isUk ? 'Введіть коректні дати (рік 1920–2015, місяць 01–12, день 01–31)' : 'Enter valid dates (year 1920–2015, month 01–12, day 01–31)',
      );
      return;
    }

    if (!d1 || !m1 || !y1 || !d2 || !m2 || !y2) {
      Alert.alert(
        isUk ? 'Помилка' : 'Error',
        isUk ? 'Заповніть обидві дати' : 'Fill in both dates',
      );
      return;
    }

    const ds1 = `${y1}-${String(m1).padStart(2, '0')}-${String(d1).padStart(2, '0')}`;
    const ds2 = `${y2}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
    setDateStr1(ds1);
    setDateStr2(ds2);

    const matrix1 = calculateMatrix(ds1);
    const matrix2 = calculateMatrix(ds2);
    const calc = calculateCompatibility(matrix1, matrix2);
    setResult(calc);

    // ── Check cache first ──
    const cached = getCompatibilityReading(ds1, ds2, locale);
    if (cached) {
      setAiText(cached.aiInterpretation);
      return;
    }

    // ── No cache: auto-generate AI interpretation ──
    generateAI(ds1, ds2, matrix1, matrix2, calc);
  };

  const generateAI = async (
    ds1: string,
    ds2: string,
    m1: ReturnType<typeof calculateMatrix>,
    m2: ReturnType<typeof calculateMatrix>,
    calc: ReturnType<typeof calculateCompatibility>,
  ) => {
    setAiLoading(true);
    try {
      const overallE = getEnergyById(calc.overall);
      const soulE = getEnergyById(calc.soulConnection);
      const destinyE = getEnergyById(calc.destinyConnection);
      const karmicE = getEnergyById(calc.karmicLesson);

      const systemPrompt = isUk
        ? 'Ти — AI Езотерик у застосунку "Matrix of Destiny". Відповідай УКРАЇНСЬКОЮ, тепло та з мудрістю.'
        : 'You are an AI Esoteric advisor in the "Matrix of Destiny" app. Respond ONLY in English, warmly and with wisdom.';

      const userMsg = isUk
        ? `Проаналізуй сумісність двох людей за Матрицею Долі:\n\n` +
          `Людина 1 (${ds1}): Особистість=${m1.personality}, Душа=${m1.soul}, Доля=${m1.destiny}\n` +
          `Людина 2 (${ds2}): Особистість=${m2.personality}, Душа=${m2.soul}, Доля=${m2.destiny}\n\n` +
          `Показники сумісності:\n` +
          `• Загальна сумісність: ${calc.overall}. ${overallE?.name} — ${overallE?.positive}\n` +
          `• Зв'язок Душ: ${calc.soulConnection}. ${soulE?.name} — ${soulE?.positive}\n` +
          `• Зв'язок Доль: ${calc.destinyConnection}. ${destinyE?.name} — ${destinyE?.positive}\n` +
          `• Кармічний Урок: ${calc.karmicLesson}. ${karmicE?.name} — ${karmicE?.positive}\n\n` +
          `Дай детальний аналіз пари: сильні сторони стосунків, спільні виклики, кармічні уроки, практичні поради для розвитку відносин. 5-8 речень.`
        : `Analyze the compatibility of two people using the Destiny Matrix:\n\n` +
          `Person 1 (${ds1}): Personality=${m1.personality}, Soul=${m1.soul}, Destiny=${m1.destiny}\n` +
          `Person 2 (${ds2}): Personality=${m2.personality}, Soul=${m2.soul}, Destiny=${m2.destiny}\n\n` +
          `Compatibility scores:\n` +
          `• Overall: ${calc.overall}. ${overallE?.name} — ${overallE?.positive}\n` +
          `• Soul Connection: ${calc.soulConnection}. ${soulE?.name} — ${soulE?.positive}\n` +
          `• Destiny Connection: ${calc.destinyConnection}. ${destinyE?.name} — ${destinyE?.positive}\n` +
          `• Karmic Lesson: ${calc.karmicLesson}. ${karmicE?.name} — ${karmicE?.positive}\n\n` +
          `Provide a detailed analysis: relationship strengths, shared challenges, karmic lessons, and practical advice for growth. 5-8 sentences.`;

      const raw = await askClaude(systemPrompt, [], userMsg);
      const text = raw.replace(/\*\*/g, '').replace(/\*/g, '');

      setAiText(text);

      // ── Save to store (local + synced to server for registered users) ──
      const id = makeCacheId(ds1, ds2, locale);
      addCompatibilityReading({
        id,
        date1: ds1,
        date2: ds2,
        locale,
        aiInterpretation: text,
        createdAt: new Date().toISOString(),
      });
      trackFeatureUsed(FEATURES.COMPATIBILITY, 'compatibility', 'premium');
    } catch {
      setAiText(isUk
        ? '🔮 Не вдалося отримати AI-аналіз. Спробуйте ще раз.'
        : '🔮 Could not fetch AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRetryAI = () => {
    if (!result || !dateStr1 || !dateStr2) return;
    const m1 = calculateMatrix(dateStr1);
    const m2 = calculateMatrix(dateStr2);
    generateAI(dateStr1, dateStr2, m1, m2, result);
  };

  const isCached = !!getCompatibilityReading(dateStr1, dateStr2, locale);

  return (
    <View style={styles.container}>
      {/* Close button moved to header via _layout.tsx */}
      <ScrollView contentContainerStyle={styles.content}>
      <DateInputGroup
        label={isUk ? 'Партнер 1' : 'Partner 1'}
        value={date1}
        onChange={setDate1}
        locale={locale}
      />
      <DateInputGroup
        label={isUk ? 'Партнер 2' : 'Partner 2'}
        value={date2}
        onChange={setDate2}
        locale={locale}
      />

      <Button
        title={isUk ? 'Розрахувати сумісність' : 'Calculate Compatibility'}
        onPress={handleCalculate}
        style={{ marginTop: Spacing.lg }}
      />

      {result && (
        <>
          {/* ── Numeric results ── */}
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>{isUk ? 'Сумісність' : 'Compatibility'}</Text>
            {[
              { label: isUk ? 'Загальна' : 'Overall', value: result.overall },
              { label: isUk ? "Зв'язок Душ" : 'Soul Connection', value: result.soulConnection },
              { label: isUk ? "Зв'язок Доль" : 'Destiny Connection', value: result.destinyConnection },
              { label: isUk ? 'Кармічний Урок' : 'Karmic Lesson', value: result.karmicLesson },
            ].map((item) => {
              const energy = getEnergyById(item.value);
              return (
                <Card key={item.label} style={styles.resultCard}>
                  <Text style={styles.resultLabel}>{item.label}</Text>
                  <View style={styles.resultRow}>
                    <View style={styles.cardImageWrap}>
                      <Text style={styles.cardImageName}>{energy?.name}</Text>
                    </View>
                    <Text style={styles.resultDesc}>{energy?.advice}</Text>
                  </View>
                </Card>
              );
            })}
          </View>

          {/* ── AI Interpretation ── */}
          <View style={styles.aiSection}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={16} color={Colors.accent} />
              <Text style={styles.aiTitle}>
                {isUk ? 'AI-аналіз сумісності' : 'AI Compatibility Analysis'}
              </Text>
            </View>

            {aiLoading ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={styles.aiLoadingText}>
                  {isUk ? 'AI аналізує пару...' : 'AI is analyzing the pair...'}
                </Text>
              </View>
            ) : aiText ? (
              <LinearGradient
                colors={['rgba(139,92,246,0.10)', 'rgba(91,33,182,0.06)']}
                style={styles.aiCard}
              >
                <FormattedText style={styles.aiText}>{aiText}</FormattedText>
                <TouchableOpacity style={styles.retryBtn} onPress={handleRetryAI}>
                  <Ionicons name="refresh-outline" size={16} color={Colors.primaryLight} />
                  <Text style={styles.retryText}>{isUk ? 'Оновити аналіз' : 'Refresh analysis'}</Text>
                </TouchableOpacity>
              </LinearGradient>
            ) : null}
          </View>
        </>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    right: Spacing.lg,
    zIndex: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 20,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateRow: { flexDirection: 'row', gap: Spacing.sm },
  dateInput: { flex: 1 },
  yearInput: { flex: 1.5 },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5 },
  errorHint: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 },

  resultSection: { marginTop: Spacing.xl },
  resultTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  resultCard: { marginBottom: Spacing.md },
  resultLabel: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardImageWrap: {
    alignItems: 'center',
    width: 64,
  },
  cardImage: {
    width: 56,
    height: 92,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  cardImageName: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  resultDesc: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },

  // ── AI section ──
  aiSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  aiTitle: {
    color: Colors.accent,
    fontSize: FontSize.md,
    fontWeight: '700',
    flex: 1,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cachedText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aiLoadingText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
  aiCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    padding: Spacing.lg,
  },
  aiText: {
    color: Colors.text,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.4)',
    backgroundColor: 'rgba(139,92,246,0.1)',
    alignSelf: 'center',
  },
  retryText: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
