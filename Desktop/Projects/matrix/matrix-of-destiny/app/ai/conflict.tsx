import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { askClaude } from '@/lib/claude';
import { FormattedText } from '@/components/ui/FormattedText';

type Step = 1 | 2 | 3 | 4 | 'result';

const PEOPLE_OPTIONS = ['2', '3', '4', '5+'];

const getOtherCount = (count: string) => {
  if (count === '2') return 1;
  if (count === '3') return 2;
  if (count === '4') return 3;
  return 4; // 5+
};
const SITUATION_TYPES_UK = ['Конфлікт', 'Непорозуміння', 'Вибір', 'Образа', 'Зрада', 'Ревнощі', 'Маніпуляція', 'Інше'];
const SITUATION_TYPES_EN = ['Conflict', 'Misunderstanding', 'Choice', 'Resentment', 'Betrayal', 'Jealousy', 'Manipulation', 'Other'];

interface ConflictData {
  peopleCount: string;
  myRole: string;
  otherRoles: string[];
  situationType: string;
  description: string;
  responseFormat: string;
}

interface ConflictResult {
  objectiveView: string;
  outsideView: string;
  recommendations: { person: string; advice: string }[];
  righteousnessAnalysis: string;
  mainAdvice: string;
}

async function generateConflictResultAI(data: ConflictData, langInstr: string, locale: string): Promise<ConflictResult> {
  const otherRoles = data.otherRoles.join(', ');
  const systemPrompt = `${locale === 'uk' ? 'Ти — AI психолог-езотерик' : 'You are an AI psychologist-esoteric advisor'} у застосунку "Matrix of Destiny". ${langInstr} Аналізуй конфлікти глибоко, з емпатією та мудрістю. Якщо опис ситуації не стосується реального конфлікту чи міжособистісної проблеми, або містить нецензурну лексику — поверни JSON з mainAdvice: "Будь ласка, опишіть реальну конфліктну ситуацію для аналізу."`;
  const userMsg = `Проаналізуй конфліктну ситуацію:
- Тип: ${data.situationType}
- Учасники: ${data.peopleCount} людей
- Моя роль: ${data.myRole}
- Інші: ${otherRoles}
- Формат відповіді: ${data.responseFormat}
- Опис ситуації: ${data.description}

Відповідь у JSON форматі:
{
  "objectiveView": "об'єктивний погляд на ситуацію (3-4 пункти)",
  "outsideView": "погляд стороннього спостерігача з емодзі (3-4 пункти)",
  "recommendations": [{"person": "Ви (роль)", "advice": "порада для вас"}, {"person": "інша сторона", "advice": "порада для них"}],
  "righteousnessAnalysis": "аналіз правоти сторін з емодзі",
  "mainAdvice": "головне послання та наступний крок"
}
Тільки JSON, без markdown.`;

  const result = await askClaude(systemPrompt, [], userMsg);
  return JSON.parse(result.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
}

export default function ConflictScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const langInstr = locale === 'uk' ? 'Відповідай УКРАЇНСЬКОЮ.' : 'Respond ONLY in English. Never use Russian.';
  const SITUATION_TYPES = locale === 'uk' ? SITUATION_TYPES_UK : SITUATION_TYPES_EN;
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConflictResult | null>(null);
  const tokens = useAppStore((s) => s.tokens);
  const isPremium = useAppStore((s) => s.isPremium);
  const spendCrystals = useAppStore((s) => s.spendCrystals);

  const ROLE_OPTIONS = [t.conflict.partner, t.conflict.friend, t.conflict.colleague, t.conflict.relative, t.conflict.stranger, t.conflict.boss];
  const RESPONSE_FORMATS = [
    { label: t.conflict.softAdvice, desc: t.conflict.softAdviceDesc },
    { label: t.conflict.hardTruth, desc: t.conflict.hardTruthDesc },
    { label: t.conflict.stepByStep, desc: t.conflict.stepByStepDesc },
    { label: t.conflict.sideAnalysis, desc: t.conflict.sideAnalysisDesc },
  ];

  const [data, setData] = useState<ConflictData>({
    peopleCount: '2',
    myRole: '',
    otherRoles: [],
    situationType: '',
    description: '',
    responseFormat: '',
  });

  const handleAnalyze = async () => {
    const desc = data.description.trim();
    if (!desc) {
      Alert.alert(
        locale === 'uk' ? 'Опишіть ситуацію' : 'Describe the situation',
        locale === 'uk' ? 'Введіть короткий опис ситуації' : 'Enter a short description of the situation'
      );
      return;
    }
    if (desc.length < 20) {
      Alert.alert(
        locale === 'uk' ? 'Опис занадто короткий' : 'Description too short',
        locale === 'uk' ? 'Опишіть ситуацію детальніше (мінімум 20 символів), щоб AI-провідник міг дати якісний аналіз.' : 'Describe the situation in more detail (at least 20 characters) so AI can provide a quality analysis.',
        [{ text: locale === 'uk' ? 'Доповнити' : 'Add more', onPress: () => setStep(3) }]
      );
      return;
    }
    if (!/[а-яА-ЯіІїЇєЄґҐa-zA-Z]{3,}/.test(desc)) {
      Alert.alert(
        locale === 'uk' ? 'Сформулюйте ситуацію краще' : 'Please rephrase the situation',
        locale === 'uk' ? 'Опишіть конфліктну ситуацію зрозумілими словами.' : 'Describe the conflict situation in clear words.',
        [{ text: locale === 'uk' ? 'Переписати' : 'Rewrite', onPress: () => setStep(3) }]
      );
      return;
    }
    if (!isPremium && tokens < 3) {
      Alert.alert(
        locale === 'uk' ? 'Потрібно 3 кристали' : '3 crystals needed',
        locale === 'uk' ? 'Поповніть баланс або оформіть Premium' : 'Top up your balance or get Premium',
        [
          { text: locale === 'uk' ? 'Скасувати' : 'Cancel', style: 'cancel' },
          { text: locale === 'uk' ? 'Преміум' : 'Premium', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    setLoading(true);
    if (!isPremium) { spendCrystals(3); }
    try {
      const aiResult = await generateConflictResultAI(data, langInstr, locale);
      // Check if AI returned a clarification/rejection instead of real analysis
      const isRejection = (text: string) => {
        const markers = ['опишіть', 'опис', 'недостатньо', 'неможливо', 'не вдалося', 'не стосується', 'незрозумілий', 'нецензурн', 'describe', 'insufficient', 'unclear'];
        const lower = (text || '').toLowerCase();
        return markers.some(m => lower.includes(m)) && lower.length < 200;
      };
      if (isRejection(aiResult.objectiveView) || isRejection(aiResult.mainAdvice)) {
        const msg = aiResult.mainAdvice || aiResult.objectiveView || (locale === 'uk' ? 'Опишіть ситуацію детальніше' : 'Please describe the situation in more detail');
        Alert.alert(
          locale === 'uk' ? 'Уточніть ситуацію' : 'Clarify the situation',
          msg,
          [{ text: locale === 'uk' ? 'Переписати' : 'Rewrite', onPress: () => { setStep(3); setLoading(false); } }]
        );
        if (!isPremium) {
          useAppStore.setState({ tokens: 3 });
        }
        return;
      }
      setResult(aiResult);
    } catch {
      setResult({
        objectiveView: locale === 'uk' ? `На жаль, не вдалось з'єднатися з AI-провідником. Спробуйте ще раз пізніше.` : 'Unfortunately, we could not connect to AI. Please try again later.',
        outsideView: '',
        recommendations: [],
        righteousnessAnalysis: '',
        mainAdvice: '',
      });
    }
    setLoading(false);
    setStep('result');
  };

  const progressPercent = step === 'result' ? 100 : ((step as number) / 4) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2D1B69', '#4C1D95']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => step === 1 || step === 'result' ? router.back() : setStep((s) => (s as number) - 1 as Step)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === 'result' ? (locale === 'uk' ? 'Аналіз ситуації' : 'Situation Analysis') : (locale === 'uk' ? 'Вирішення конфлікту' : 'Conflict Resolution')}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {/* Progress bar */}
      {step !== 'result' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>{locale === 'uk' ? `Крок ${step} з 4` : `Step ${step} of 4`}</Text>
        </View>
      )}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>

        {/* Step 1: People count & roles */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>{locale === 'uk' ? 'Хто бере участь?' : 'Who is involved?'}</Text>
            <Text style={styles.stepSubtitle}>{locale === 'uk' ? 'Оберіть кількість людей у ситуації' : 'Select the number of people in the situation'}</Text>

            <View style={styles.optionsRow}>
              {PEOPLE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionChip, data.peopleCount === opt && styles.optionChipSelected]}
                  onPress={() => setData({ ...data, peopleCount: opt, otherRoles: [] })}
                >
                  <Text style={[styles.optionChipText, data.peopleCount === opt && styles.optionChipTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{locale === 'uk' ? 'Ваша роль' : 'Your role'}</Text>
            <View style={styles.optionsWrap}>
              {ROLE_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.optionChip, data.myRole === r && styles.optionChipSelected]}
                  onPress={() => setData({ ...data, myRole: r })}
                >
                  <Text style={[styles.optionChipText, data.myRole === r && styles.optionChipTextSelected]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {Array.from({ length: getOtherCount(data.peopleCount) }).map((_, idx) => (
              <View key={idx}>
                <Text style={styles.fieldLabel}>
                  {getOtherCount(data.peopleCount) === 1
                    ? (locale === 'uk' ? 'Роль іншої людини' : 'Other person\'s role')
                    : (locale === 'uk' ? `Роль учасника ${idx + 2}` : `Participant ${idx + 2}'s role`)}
                </Text>
                <View style={styles.optionsWrap}>
                  {ROLE_OPTIONS.map((r) => {
                    const isSelected = data.otherRoles[idx] === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[styles.optionChip, isSelected && styles.optionChipSelected]}
                        onPress={() => {
                          const newRoles = [...data.otherRoles];
                          newRoles[idx] = isSelected ? '' : r;
                          setData({ ...data, otherRoles: newRoles });
                        }}
                      >
                        <Text style={[styles.optionChipText, isSelected && styles.optionChipTextSelected]}>{r}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <Button title={locale === 'uk' ? 'Далі →' : 'Next →'} onPress={() => setStep(2)} style={styles.nextBtn} />
          </View>
        )}

        {/* Step 2: Situation type */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>{locale === 'uk' ? 'Тип ситуації' : 'Situation type'}</Text>
            <Text style={styles.stepSubtitle}>{locale === 'uk' ? 'Що найкраще описує вашу ситуацію?' : 'What best describes your situation?'}</Text>

            <View style={styles.optionsWrap}>
              {SITUATION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.optionChipLarge, data.situationType === t && styles.optionChipSelected]}
                  onPress={() => setData({ ...data, situationType: t })}
                >
                  <Text style={[styles.optionChipText, data.situationType === t && styles.optionChipTextSelected]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={locale === 'uk' ? 'Далі →' : 'Next →'}
              onPress={() => data.situationType ? setStep(3) : Alert.alert('', locale === 'uk' ? 'Оберіть тип ситуації' : 'Select a situation type')}
              style={styles.nextBtn}
            />
          </View>
        )}

        {/* Step 3: Description */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>{locale === 'uk' ? 'Опишіть ситуацію' : 'Describe the situation'}</Text>
            <Text style={styles.stepSubtitle}>
              {locale === 'uk' ? 'Коротко опишіть, що сталось. Що ви відчуваєте? Що вас найбільше турбує?' : 'Briefly describe what happened. How do you feel? What concerns you the most?'}
            </Text>

            <TextInput
              style={styles.descriptionInput}
              multiline
              numberOfLines={6}
              placeholder={locale === 'uk' ? "Наприклад: Мій партнер не відповідав на дзвінки цілий вечір, а коли повернувся, сказав що просто хотів побути на самоті. Я відчуваю образу і тривогу..." : "For example: My partner didn't answer calls all evening, and when they came back, they said they just wanted to be alone. I feel hurt and anxious..."}
              placeholderTextColor={Colors.textMuted}
              value={data.description}
              onChangeText={(t) => setData({ ...data, description: t })}
              maxLength={2000}
            />
            <Text style={styles.charCount}>{data.description.length}/2000</Text>
            {data.description.trim().length > 0 && data.description.trim().length < 20 && (
              <Text style={styles.minLengthHint}>
                {locale === 'uk' ? `Мінімум 20 символів (ще ${20 - data.description.trim().length})` : `Minimum 20 characters (${20 - data.description.trim().length} more)`}
              </Text>
            )}

            <Button
              title={locale === 'uk' ? 'Далі →' : 'Next →'}
              onPress={() => {
                const desc = data.description.trim();
                if (!desc) {
                  Alert.alert('', locale === 'uk' ? 'Опишіть ситуацію' : 'Describe the situation');
                } else if (desc.length < 20) {
                  Alert.alert(
                    locale === 'uk' ? 'Опис занадто короткий' : 'Description too short',
                    locale === 'uk' ? 'Опишіть ситуацію детальніше (мінімум 20 символів), щоб AI-провідник міг дати якісний аналіз.' : 'Describe the situation in more detail (at least 20 characters) so AI can provide a quality analysis.',
                  );
                } else {
                  setStep(4);
                }
              }}
              style={styles.nextBtn}
            />
          </View>
        )}

        {/* Step 4: Response format */}
        {step === 4 && (
          <View>
            <Text style={styles.stepTitle}>{locale === 'uk' ? 'Формат відповіді' : 'Response format'}</Text>
            <Text style={styles.stepSubtitle}>{locale === 'uk' ? 'Який тип аналізу вам потрібен?' : 'What type of analysis do you need?'}</Text>

            {RESPONSE_FORMATS.map((f) => (
              <TouchableOpacity
                key={f.label}
                style={[styles.formatCard, data.responseFormat === f.label && styles.formatCardSelected]}
                onPress={() => setData({ ...data, responseFormat: f.label })}
                activeOpacity={0.7}
              >
                <View style={styles.formatLeft}>
                  <Text style={styles.formatLabel}>{f.label}</Text>
                  <Text style={styles.formatDesc}>{f.desc}</Text>
                </View>
                {data.responseFormat === f.label && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>{locale === 'uk' ? 'Виконується аналіз конфлікту...' : 'Analyzing the conflict...'}</Text>
              </View>
            ) : (
              <Button
                title={locale === 'uk' ? 'Отримати аналіз' : 'Get analysis'}
                onPress={handleAnalyze}
                style={styles.nextBtn}
              />
            )}
            {!isPremium && <Text style={styles.tokenHint}>{locale === 'uk' ? '3 кристали' : '3 crystals'}</Text>}
          </View>
        )}

        {/* Result */}
        {step === 'result' && result && (
          <View>
            <Card style={styles.resultCard}>
              <Text style={styles.resultSectionTitle}>{locale === 'uk' ? '🔍 Об\'єктивна оцінка' : '🔍 Objective Assessment'}</Text>
              <FormattedText style={styles.resultText}>{result.objectiveView}</FormattedText>
            </Card>

            <Card style={styles.resultCard}>
              <Text style={styles.resultSectionTitle}>{locale === 'uk' ? '👁 Погляд збоку' : '👁 Outside Perspective'}</Text>
              <FormattedText style={styles.resultText}>{result.outsideView}</FormattedText>
            </Card>

            <Card style={styles.resultCard}>
              <Text style={styles.resultSectionTitle}>{locale === 'uk' ? '💬 Рекомендації' : '💬 Recommendations'}</Text>
              {result.recommendations.map((rec, i) => (
                <View key={i} style={styles.recommendationBlock}>
                  <Text style={styles.recommendationPerson}>{rec.person}</Text>
                  <FormattedText style={styles.resultText}>{rec.advice}</FormattedText>
                </View>
              ))}
            </Card>

            <Card style={styles.resultCard}>
              <Text style={styles.resultSectionTitle}>{locale === 'uk' ? '⚖️ Аналіз правоти' : '⚖️ Righteousness Analysis'}</Text>
              <FormattedText style={styles.resultText}>{result.righteousnessAnalysis}</FormattedText>
            </Card>

            <LinearGradient
              colors={['#2D1B69', '#4C1D95', '#6D28D9']}
              style={styles.mainAdviceCard}
            >
              <FormattedText style={styles.mainAdviceText}>{result.mainAdvice}</FormattedText>
            </LinearGradient>

            <Button
              title={locale === 'uk' ? 'Нова ситуація' : 'New situation'}
              variant="secondary"
              onPress={() => {
                setStep(1);
                setResult(null);
                setData({ peopleCount: '2', myRole: '', otherRoles: [], situationType: '', description: '', responseFormat: '' });
              }}
              style={styles.nextBtn}
            />

            <Button
              title={locale === 'uk' ? 'Обговорити з AI' : 'Discuss with AI'}
              onPress={() => router.push('/ai/chat')}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  backBtn: { padding: Spacing.xs, width: 36 },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  progressBg: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'right',
  },
  content: { flex: 1 },
  contentInner: { padding: Spacing.lg, paddingBottom: 40 },

  stepTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionChipLarge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionChipSelected: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  optionChipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  optionChipTextSelected: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: Colors.bgInput,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlignVertical: 'top',
    minHeight: 140,
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  minLengthHint: {
    color: '#F59E0B',
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  formatCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  formatLeft: { flex: 1 },
  formatLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  formatDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontStyle: 'italic',
  },
  tokenHint: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  nextBtn: { marginTop: Spacing.lg },

  resultCard: { marginBottom: Spacing.md },
  resultSectionTitle: {
    color: Colors.primaryLight,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  recommendationBlock: {
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  recommendationPerson: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  mainAdviceCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  mainAdviceText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    lineHeight: 24,
  },
});
