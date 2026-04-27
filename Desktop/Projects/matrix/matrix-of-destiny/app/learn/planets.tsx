import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n';

type LocalizedString = { uk: string; en: string };

const PLANETS = [
  {
    name: { uk: 'Сонце', en: 'Sun' } as LocalizedString,
    symbol: '☉', color: '#F59E0B',
    rules: { uk: 'Лев', en: 'Leo' } as LocalizedString,
    element: { uk: 'Вогонь', en: 'Fire' } as LocalizedString,
    cycle: { uk: '1 рік', en: '1 year' } as LocalizedString,
    desc: {
      uk: 'Символізує ваше справжнє "Я", свідомість, волю та творчу силу. Визначає вашу ідентичність і те, як ви самовиражаєтесь у світі.',
      en: 'Represents your true Self, consciousness, willpower, and creative force. Defines your identity and how you express yourself in the world.',
    } as LocalizedString,
    positive: {
      uk: 'Лідерство, творчість, харизма, впевненість, великодушність',
      en: 'Leadership, creativity, charisma, confidence, generosity',
    } as LocalizedString,
    negative: {
      uk: 'Егоїзм, зарозумілість, надмірне самозакоханість',
      en: 'Egoism, arrogance, excessive self-absorption',
    } as LocalizedString,
    body: {
      uk: 'Серце, очі, спина, життєва сила',
      en: 'Heart, eyes, spine, vital force',
    } as LocalizedString,
    icon: 'sunny' as const,
  },
  {
    name: { uk: 'Місяць', en: 'Moon' } as LocalizedString,
    symbol: '☽', color: '#94A3B8',
    rules: { uk: 'Рак', en: 'Cancer' } as LocalizedString,
    element: { uk: 'Вода', en: 'Water' } as LocalizedString,
    cycle: { uk: '28 днів', en: '28 days' } as LocalizedString,
    desc: {
      uk: 'Керує підсвідомістю, емоціями, інстинктами та пам\'яттю. Відображає вашу емоційну природу та ставлення до минулого.',
      en: 'Governs the subconscious, emotions, instincts, and memory. Reflects your emotional nature and relationship with the past.',
    } as LocalizedString,
    positive: {
      uk: 'Інтуїція, чуйність, турботливість, уява, адаптивність',
      en: 'Intuition, sensitivity, nurturing, imagination, adaptability',
    } as LocalizedString,
    negative: {
      uk: 'Мінливість настрою, надмірна чутливість, залежність від минулого',
      en: 'Mood swings, oversensitivity, attachment to the past',
    } as LocalizedString,
    body: {
      uk: 'Шлунок, матка, рідини організму',
      en: 'Stomach, uterus, bodily fluids',
    } as LocalizedString,
    icon: 'moon' as const,
  },
  {
    name: { uk: 'Меркурій', en: 'Mercury' } as LocalizedString,
    symbol: '☿', color: '#10B981',
    rules: { uk: 'Близнята, Діва', en: 'Gemini, Virgo' } as LocalizedString,
    element: { uk: 'Повітря/Земля', en: 'Air/Earth' } as LocalizedString,
    cycle: { uk: '88 днів', en: '88 days' } as LocalizedString,
    desc: {
      uk: 'Планета комунікації, розуму та навчання. Управляє тим, як ви думаєте, говорите, пишете та сприймаєте інформацію.',
      en: 'The planet of communication, intellect, and learning. Governs how you think, speak, write, and process information.',
    } as LocalizedString,
    positive: {
      uk: 'Гострий розум, красномовство, аналітичність, адаптивність',
      en: 'Sharp mind, eloquence, analytical ability, adaptability',
    } as LocalizedString,
    negative: {
      uk: 'Непостійність, поверховість, схильність до маніпуляцій',
      en: 'Inconsistency, superficiality, tendency to manipulate',
    } as LocalizedString,
    body: {
      uk: 'Нервова система, легені, руки, мова',
      en: 'Nervous system, lungs, hands, speech',
    } as LocalizedString,
    icon: 'chatbubble-outline' as const,
  },
  {
    name: { uk: 'Венера', en: 'Venus' } as LocalizedString,
    symbol: '♀', color: '#EC4899',
    rules: { uk: 'Телець, Терези', en: 'Taurus, Libra' } as LocalizedString,
    element: { uk: 'Земля/Повітря', en: 'Earth/Air' } as LocalizedString,
    cycle: { uk: '225 днів', en: '225 days' } as LocalizedString,
    desc: {
      uk: 'Богиня любові та краси. Керує романтичними стосунками, естетикою, задоволенням та матеріальними цінностями.',
      en: 'The goddess of love and beauty. Governs romantic relationships, aesthetics, pleasure, and material values.',
    } as LocalizedString,
    positive: {
      uk: 'Краса, гармонія, любов, дипломатичність, творчість',
      en: 'Beauty, harmony, love, diplomacy, creativity',
    } as LocalizedString,
    negative: {
      uk: 'Лінь, надмірне задоволення, залежність від схвалення',
      en: 'Laziness, overindulgence, dependence on approval',
    } as LocalizedString,
    body: {
      uk: 'Горло, нирки, поперек, шкіра',
      en: 'Throat, kidneys, lower back, skin',
    } as LocalizedString,
    icon: 'heart' as const,
  },
  {
    name: { uk: 'Марс', en: 'Mars' } as LocalizedString,
    symbol: '♂', color: '#EF4444',
    rules: { uk: 'Овен, Скорпіон', en: 'Aries, Scorpio' } as LocalizedString,
    element: { uk: 'Вогонь', en: 'Fire' } as LocalizedString,
    cycle: { uk: '687 днів', en: '687 days' } as LocalizedString,
    desc: {
      uk: 'Планета дії, бажання та енергії. Визначає вашу здатність досягати цілей, боротися та відстоювати себе.',
      en: 'The planet of action, desire, and energy. Defines your ability to achieve goals, fight, and assert yourself.',
    } as LocalizedString,
    positive: {
      uk: 'Мужність, рішучість, пристрасть, ініціативність, сила',
      en: 'Courage, determination, passion, initiative, strength',
    } as LocalizedString,
    negative: {
      uk: 'Агресія, імпульсивність, конфліктність, жорстокість',
      en: 'Aggression, impulsiveness, conflict, cruelty',
    } as LocalizedString,
    body: {
      uk: 'М\'язи, кров, залізо, нирки, голова',
      en: 'Muscles, blood, iron, adrenal glands, head',
    } as LocalizedString,
    icon: 'flash' as const,
  },
  {
    name: { uk: 'Юпітер', en: 'Jupiter' } as LocalizedString,
    symbol: '♃', color: '#8B5CF6',
    rules: { uk: 'Стрілець, Риби', en: 'Sagittarius, Pisces' } as LocalizedString,
    element: { uk: 'Вогонь/Вода', en: 'Fire/Water' } as LocalizedString,
    cycle: { uk: '12 років', en: '12 years' } as LocalizedString,
    desc: {
      uk: 'Велика Удача. Планета розширення, мудрості та процвітання. Приносить зростання та можливості у сфери, які торкається.',
      en: 'The Great Benefic. The planet of expansion, wisdom, and prosperity. Brings growth and opportunity to the areas it touches.',
    } as LocalizedString,
    positive: {
      uk: 'Щедрість, оптимізм, мудрість, успіх, духовність',
      en: 'Generosity, optimism, wisdom, success, spirituality',
    } as LocalizedString,
    negative: {
      uk: 'Надмірність, розтринькування, самовдоволення',
      en: 'Excess, wastefulness, complacency',
    } as LocalizedString,
    body: {
      uk: 'Печінка, стегна, жир, кров',
      en: 'Liver, thighs, fat, blood',
    } as LocalizedString,
    icon: 'star' as const,
  },
  {
    name: { uk: 'Сатурн', en: 'Saturn' } as LocalizedString,
    symbol: '♄', color: '#64748B',
    rules: { uk: 'Козеріг, Водолій', en: 'Capricorn, Aquarius' } as LocalizedString,
    element: { uk: 'Земля/Повітря', en: 'Earth/Air' } as LocalizedString,
    cycle: { uk: '29 років', en: '29 years' } as LocalizedString,
    desc: {
      uk: 'Великий Учитель. Планета дисципліни, відповідальності та карми. Там де Сатурн — там уроки та структура.',
      en: 'The Great Teacher. The planet of discipline, responsibility, and karma. Where Saturn resides, there are lessons and structure.',
    } as LocalizedString,
    positive: {
      uk: 'Дисципліна, відповідальність, мудрість, наполегливість, структура',
      en: 'Discipline, responsibility, wisdom, perseverance, structure',
    } as LocalizedString,
    negative: {
      uk: 'Обмеження, страхи, жорсткість, депресія, ізоляція',
      en: 'Restriction, fears, rigidity, depression, isolation',
    } as LocalizedString,
    body: {
      uk: 'Кістки, зуби, шкіра, коліна, селезінка',
      en: 'Bones, teeth, skin, knees, spleen',
    } as LocalizedString,
    icon: 'time-outline' as const,
  },
  {
    name: { uk: 'Уран', en: 'Uranus' } as LocalizedString,
    symbol: '⛢', color: '#38BDF8',
    rules: { uk: 'Водолій', en: 'Aquarius' } as LocalizedString,
    element: { uk: 'Повітря', en: 'Air' } as LocalizedString,
    cycle: { uk: '84 роки', en: '84 years' } as LocalizedString,
    desc: {
      uk: 'Планета революцій та пробуджень. Приносить раптові зміни, інновації та звільнення від застарілих обмежень.',
      en: 'The planet of revolutions and awakenings. Brings sudden changes, innovation, and liberation from outdated restrictions.',
    } as LocalizedString,
    positive: {
      uk: 'Оригінальність, геніальність, свобода, гуманізм, прогрес',
      en: 'Originality, genius, freedom, humanitarianism, progress',
    } as LocalizedString,
    negative: {
      uk: 'Нестабільність, ексцентричність, бунтарство, відчуженість',
      en: 'Instability, eccentricity, rebelliousness, detachment',
    } as LocalizedString,
    body: {
      uk: 'Нервова система, гомілки, судоми',
      en: 'Nervous system, ankles, spasms',
    } as LocalizedString,
    icon: 'thunderstorm-outline' as const,
  },
  {
    name: { uk: 'Нептун', en: 'Neptune' } as LocalizedString,
    symbol: '♆', color: '#6366F1',
    rules: { uk: 'Риби', en: 'Pisces' } as LocalizedString,
    element: { uk: 'Вода', en: 'Water' } as LocalizedString,
    cycle: { uk: '165 років', en: '165 years' } as LocalizedString,
    desc: {
      uk: 'Планета мрій та духовності. Розчиняє межі між реальністю та ілюзією, відкриваючи вищі виміри свідомості.',
      en: 'The planet of dreams and spirituality. Dissolves the boundaries between reality and illusion, opening higher dimensions of consciousness.',
    } as LocalizedString,
    positive: {
      uk: 'Духовність, інтуїція, уява, натхнення, співчуття',
      en: 'Spirituality, intuition, imagination, inspiration, compassion',
    } as LocalizedString,
    negative: {
      uk: 'Ілюзії, самообман, залежності, втрата реальності',
      en: 'Illusions, self-deception, addictions, loss of reality',
    } as LocalizedString,
    body: {
      uk: 'Ноги, лімфатична система, рідини',
      en: 'Feet, lymphatic system, fluids',
    } as LocalizedString,
    icon: 'water' as const,
  },
  {
    name: { uk: 'Плутон', en: 'Pluto' } as LocalizedString,
    symbol: '♇', color: '#7C3AED',
    rules: { uk: 'Скорпіон', en: 'Scorpio' } as LocalizedString,
    element: { uk: 'Вода', en: 'Water' } as LocalizedString,
    cycle: { uk: '248 років', en: '248 years' } as LocalizedString,
    desc: {
      uk: 'Планета трансформації та влади. Символізує смерть старого і відродження нового, глибинні психологічні зміни.',
      en: 'The planet of transformation and power. Symbolizes the death of the old and rebirth of the new, profound psychological changes.',
    } as LocalizedString,
    positive: {
      uk: 'Трансформація, глибина, відродження, сила, дослідження таємниць',
      en: 'Transformation, depth, rebirth, power, uncovering mysteries',
    } as LocalizedString,
    negative: {
      uk: 'Деструктивність, обсесія, маніпуляції, криза влади',
      en: 'Destructiveness, obsession, manipulation, power struggles',
    } as LocalizedString,
    body: {
      uk: 'Статеві органи, кишечник, клітини',
      en: 'Reproductive organs, intestines, cells',
    } as LocalizedString,
    icon: 'skull-outline' as const,
  },
];

export default function PlanetsScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { locale } = useI18n();

  const L = (field: { uk: string; en: string }) => locale === 'uk' ? field.uk : field.en;

  const introText = locale === 'uk'
    ? '10 планет астрології та їх вплив на людину. Натисніть на планету для детальної інформації.'
    : '10 planets of astrology and their influence on people. Tap a planet for detailed information.';

  const positiveLabel = locale === 'uk' ? 'Позитивний вплив' : 'Positive influence';
  const negativeLabel = locale === 'uk' ? 'Негативний вплив' : 'Negative influence';
  const bodyLabel = locale === 'uk' ? "ТІЛО І ЗДОРОВ'Я" : 'BODY & HEALTH';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.intro}>{introText}</Text>

      {PLANETS.map((p) => {
        const pName = L(p.name);
        const open = expanded === pName;
        return (
          <TouchableOpacity key={pName} activeOpacity={0.8} onPress={() => setExpanded(open ? null : pName)}>
            <Card style={[styles.card, open ? { borderColor: p.color + '60', borderWidth: 1.5 } : undefined]}>
              <View style={styles.cardHeader}>
                <View style={[styles.symbolBox, { backgroundColor: p.color + '22', borderColor: p.color + '55' }]}>
                  <Text style={[styles.symbolText, { color: p.color }]}>{p.symbol}</Text>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: p.color + '18' }]}>
                  <Ionicons name={p.icon} size={18} color={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planetName}>{pName}</Text>
                  <Text style={styles.planetSub}>{L(p.rules)} · {L(p.element)}</Text>
                </View>
                <View style={[styles.cycleBadge, { backgroundColor: p.color + '18' }]}>
                  <Text style={[styles.cycleText, { color: p.color }]}>{L(p.cycle)}</Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
              </View>

              {open && (
                <View style={styles.detail}>
                  <Text style={styles.desc}>{L(p.desc)}</Text>

                  <View style={styles.row}>
                    <View style={[styles.pill, { backgroundColor: '#16A34A22' }]}>
                      <Ionicons name="checkmark-circle-outline" size={13} color="#16A34A" />
                      <Text style={[styles.pillText, { color: '#16A34A' }]}>{positiveLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.pillDesc}>{L(p.positive)}</Text>

                  <View style={[styles.pill, { backgroundColor: '#DC262622', marginTop: Spacing.sm }]}>
                    <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                    <Text style={[styles.pillText, { color: '#DC2626' }]}>{negativeLabel}</Text>
                  </View>
                  <Text style={styles.pillDesc}>{L(p.negative)}</Text>

                  <View style={[styles.bodyBox, { borderLeftColor: p.color }]}>
                    <Text style={styles.bodyLabel}>{bodyLabel}</Text>
                    <Text style={styles.bodyText}>{L(p.body)}</Text>
                  </View>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 20 },
  intro: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.lg },

  card: { marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  symbolBox: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  symbolText: { fontSize: 16, fontWeight: '700' },
  iconCircle: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  planetName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  planetSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  cycleBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  cycleText: { fontSize: 10, fontWeight: '700' },

  detail: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  desc: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  row: { flexDirection: 'row' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start',
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 18, marginTop: 4, marginBottom: Spacing.sm },
  bodyBox: {
    borderLeftWidth: 3, paddingLeft: Spacing.md,
    marginTop: Spacing.sm,
  },
  bodyLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  bodyText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18 },
});
