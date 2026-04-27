import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n';

type Localized = { uk: string; en: string };

const SIGNS = [
  {
    name: { uk: 'Овен', en: 'Aries' } as Localized, symbol: '♈', color: '#EF4444',
    dates: { uk: '21 бер – 19 квіт', en: 'Mar 21 – Apr 19' } as Localized,
    element: { uk: 'Вогонь', en: 'Fire' } as Localized,
    quality: { uk: 'Кардинальний', en: 'Cardinal' } as Localized,
    ruler: { uk: 'Марс', en: 'Mars' } as Localized,
    stone: { uk: 'Діамант, рубін', en: 'Diamond, Ruby' } as Localized,
    desc: { uk: 'Перший знак зодіаку, символ початку та нових старт. Овни — природжені лідери, сповнені ентузіазму та бажання підкорювати нові вершини.', en: 'The first sign of the zodiac, a symbol of new beginnings. Aries are natural-born leaders, full of enthusiasm and a drive to conquer new heights.' } as Localized,
    positive: { uk: 'Сміливість, ентузіазм, ініціативність, незалежність, чесність', en: 'Courage, enthusiasm, initiative, independence, honesty' } as Localized,
    negative: { uk: 'Імпульсивність, нетерплячість, агресія, егоїзм', en: 'Impulsiveness, impatience, aggression, selfishness' } as Localized,
    icon: 'flame' as const,
  },
  {
    name: { uk: 'Телець', en: 'Taurus' } as Localized, symbol: '♉', color: '#84CC16',
    dates: { uk: '20 квіт – 20 трав', en: 'Apr 20 – May 20' } as Localized,
    element: { uk: 'Земля', en: 'Earth' } as Localized,
    quality: { uk: 'Фіксований', en: 'Fixed' } as Localized,
    ruler: { uk: 'Венера', en: 'Venus' } as Localized,
    stone: { uk: 'Смарагд, малахіт', en: 'Emerald, Malachite' } as Localized,
    desc: { uk: 'Знак стабільності та матеріального добробуту. Тельці цінують красу, комфорт та стабільність. Вони надійні та витривалі.', en: 'A sign of stability and material well-being. Taurus values beauty, comfort, and stability. They are reliable and resilient.' } as Localized,
    positive: { uk: 'Надійність, терплячість, наполегливість, практичність, вірність', en: 'Reliability, patience, perseverance, practicality, loyalty' } as Localized,
    negative: { uk: 'Впертість, матеріалізм, ревнивість, опір змінам', en: 'Stubbornness, materialism, jealousy, resistance to change' } as Localized,
    icon: 'leaf' as const,
  },
  {
    name: { uk: 'Близнята', en: 'Gemini' } as Localized, symbol: '♊', color: '#F59E0B',
    dates: { uk: '21 трав – 20 черв', en: 'May 21 – Jun 20' } as Localized,
    element: { uk: 'Повітря', en: 'Air' } as Localized,
    quality: { uk: 'Мінливий', en: 'Mutable' } as Localized,
    ruler: { uk: 'Меркурій', en: 'Mercury' } as Localized,
    stone: { uk: 'Агат, цитрин', en: 'Agate, Citrine' } as Localized,
    desc: { uk: 'Знак комунікації та інтелекту. Близнята мають двоїсту природу — вони одночасно цікаві й поверхневі, товариські й мінливі.', en: 'A sign of communication and intellect. Gemini have a dual nature — they are simultaneously curious and superficial, sociable and changeable.' } as Localized,
    positive: { uk: 'Інтелект, комунікабельність, адаптивність, кмітливість, різноплановість', en: 'Intellect, sociability, adaptability, quick wit, versatility' } as Localized,
    negative: { uk: 'Непостійність, поверховість, нервозність, двоїстість', en: 'Inconsistency, superficiality, nervousness, duality' } as Localized,
    icon: 'chatbubbles-outline' as const,
  },
  {
    name: { uk: 'Рак', en: 'Cancer' } as Localized, symbol: '♋', color: '#94A3B8',
    dates: { uk: '21 черв – 22 лип', en: 'Jun 21 – Jul 22' } as Localized,
    element: { uk: 'Вода', en: 'Water' } as Localized,
    quality: { uk: 'Кардинальний', en: 'Cardinal' } as Localized,
    ruler: { uk: 'Місяць', en: 'Moon' } as Localized,
    stone: { uk: 'Місячний камінь, перли', en: 'Moonstone, Pearl' } as Localized,
    desc: { uk: 'Знак сім\'ї та емоційної глибини. Раки дуже чутливі та інтуїтивні, глибоко пов\'язані з домом і близькими людьми.', en: 'A sign of family and emotional depth. Cancers are highly sensitive and intuitive, deeply connected to home and loved ones.' } as Localized,
    positive: { uk: 'Турботливість, інтуїція, вірність, уявлення, емпатія', en: 'Nurturing, intuition, loyalty, imagination, empathy' } as Localized,
    negative: { uk: 'Надмірна чутливість, замкнутість, настирливість, страхи', en: 'Oversensitivity, withdrawal, clinginess, fearfulness' } as Localized,
    icon: 'home-outline' as const,
  },
  {
    name: { uk: 'Лев', en: 'Leo' } as Localized, symbol: '♌', color: '#F59E0B',
    dates: { uk: '23 лип – 22 серп', en: 'Jul 23 – Aug 22' } as Localized,
    element: { uk: 'Вогонь', en: 'Fire' } as Localized,
    quality: { uk: 'Фіксований', en: 'Fixed' } as Localized,
    ruler: { uk: 'Сонце', en: 'Sun' } as Localized,
    stone: { uk: 'Рубін, онікс', en: 'Ruby, Onyx' } as Localized,
    desc: { uk: 'Знак сяйва та творчості. Леви — природжені артисти і лідери, які прагнуть визнання та обожнюють бути в центрі уваги.', en: 'A sign of radiance and creativity. Leos are natural performers and leaders who crave recognition and love being the center of attention.' } as Localized,
    positive: { uk: 'Щедрість, харизма, творчість, лідерство, вірність', en: 'Generosity, charisma, creativity, leadership, loyalty' } as Localized,
    negative: { uk: 'Зарозумілість, надмірна потреба у увазі, впертість, домінування', en: 'Arrogance, excessive need for attention, stubbornness, domineering' } as Localized,
    icon: 'sunny' as const,
  },
  {
    name: { uk: 'Діва', en: 'Virgo' } as Localized, symbol: '♍', color: '#10B981',
    dates: { uk: '23 серп – 22 вер', en: 'Aug 23 – Sep 22' } as Localized,
    element: { uk: 'Земля', en: 'Earth' } as Localized,
    quality: { uk: 'Мінливий', en: 'Mutable' } as Localized,
    ruler: { uk: 'Меркурій', en: 'Mercury' } as Localized,
    stone: { uk: 'Сапфір, яшма', en: 'Sapphire, Jasper' } as Localized,
    desc: { uk: 'Знак досконалості та служіння. Діви аналітичні та уважні до деталей. Вони прагнуть порядку та готові допомагати іншим.', en: 'A sign of perfection and service. Virgos are analytical and detail-oriented. They strive for order and are always ready to help others.' } as Localized,
    positive: { uk: 'Аналітичність, старанність, скромність, практичність, точність', en: 'Analytical mind, diligence, modesty, practicality, precision' } as Localized,
    negative: { uk: 'Надмірна критичність, перфекціонізм, тривожність, педантизм', en: 'Overcritical, perfectionism, anxiety, pedantry' } as Localized,
    icon: 'analytics-outline' as const,
  },
  {
    name: { uk: 'Терези', en: 'Libra' } as Localized, symbol: '♎', color: '#EC4899',
    dates: { uk: '23 вер – 22 жовт', en: 'Sep 23 – Oct 22' } as Localized,
    element: { uk: 'Повітря', en: 'Air' } as Localized,
    quality: { uk: 'Кардинальний', en: 'Cardinal' } as Localized,
    ruler: { uk: 'Венера', en: 'Venus' } as Localized,
    stone: { uk: 'Опал, лазурит', en: 'Opal, Lapis Lazuli' } as Localized,
    desc: { uk: 'Знак гармонії та справедливості. Терези шукають баланс у всьому — у стосунках, роботі та житті. Вони дипломатичні та естетично розвинені.', en: 'A sign of harmony and justice. Libras seek balance in everything — in relationships, work, and life. They are diplomatic and aesthetically refined.' } as Localized,
    positive: { uk: 'Дипломатичність, справедливість, гармонійність, краса, об\'єктивність', en: 'Diplomacy, fairness, harmony, grace, objectivity' } as Localized,
    negative: { uk: 'Нерішучість, залежність від думки інших, поверховість', en: 'Indecisiveness, dependence on others\' opinions, superficiality' } as Localized,
    icon: 'scale-outline' as const,
  },
  {
    name: { uk: 'Скорпіон', en: 'Scorpio' } as Localized, symbol: '♏', color: '#7C3AED',
    dates: { uk: '23 жовт – 21 лист', en: 'Oct 23 – Nov 21' } as Localized,
    element: { uk: 'Вода', en: 'Water' } as Localized,
    quality: { uk: 'Фіксований', en: 'Fixed' } as Localized,
    ruler: { uk: 'Марс, Плутон', en: 'Mars, Pluto' } as Localized,
    stone: { uk: 'Топаз, гранат', en: 'Topaz, Garnet' } as Localized,
    desc: { uk: 'Знак трансформації та таємниць. Скорпіони — найінтенсивніші та найпроникливіші з усіх знаків. Вони здатні на глибокі перетворення.', en: 'A sign of transformation and mystery. Scorpios are the most intense and perceptive of all signs. They are capable of profound transformation.' } as Localized,
    positive: { uk: 'Інтуїція, рішучість, пристрасть, глибина, відданість', en: 'Intuition, determination, passion, depth, devotion' } as Localized,
    negative: { uk: 'Ревнивість, мстивість, маніпулятивність, підозрілість', en: 'Jealousy, vindictiveness, manipulativeness, suspicion' } as Localized,
    icon: 'eye' as const,
  },
  {
    name: { uk: 'Стрілець', en: 'Sagittarius' } as Localized, symbol: '♐', color: '#8B5CF6',
    dates: { uk: '22 лист – 21 груд', en: 'Nov 22 – Dec 21' } as Localized,
    element: { uk: 'Вогонь', en: 'Fire' } as Localized,
    quality: { uk: 'Мінливий', en: 'Mutable' } as Localized,
    ruler: { uk: 'Юпітер', en: 'Jupiter' } as Localized,
    stone: { uk: 'Бірюза, аметист', en: 'Turquoise, Amethyst' } as Localized,
    desc: { uk: 'Знак свободи та пригод. Стрільці — вічні мандрівники духу, які шукають сенс і мудрість. Вони оптимістичні та відкриті до нового.', en: 'A sign of freedom and adventure. Sagittarians are eternal wanderers of the spirit, seeking meaning and wisdom. They are optimistic and open to new experiences.' } as Localized,
    positive: { uk: 'Оптимізм, відкритість, філософія, пригодництво, щирість', en: 'Optimism, open-mindedness, philosophy, adventurousness, sincerity' } as Localized,
    negative: { uk: 'Безвідповідальність, нетактовність, непостійність, надмірна прямолінійність', en: 'Irresponsibility, tactlessness, inconsistency, excessive bluntness' } as Localized,
    icon: 'compass-outline' as const,
  },
  {
    name: { uk: 'Козеріг', en: 'Capricorn' } as Localized, symbol: '♑', color: '#64748B',
    dates: { uk: '22 груд – 19 січ', en: 'Dec 22 – Jan 19' } as Localized,
    element: { uk: 'Земля', en: 'Earth' } as Localized,
    quality: { uk: 'Кардинальний', en: 'Cardinal' } as Localized,
    ruler: { uk: 'Сатурн', en: 'Saturn' } as Localized,
    stone: { uk: 'Гранат, онікс', en: 'Garnet, Onyx' } as Localized,
    desc: { uk: 'Знак амбіцій та досягнень. Козероги — найбільш цілеспрямовані та дисципліновані. Вони прагнуть до вершин і готові наполегливо працювати.', en: 'A sign of ambition and achievement. Capricorns are the most goal-oriented and disciplined. They aim for the top and are willing to work tirelessly.' } as Localized,
    positive: { uk: 'Амбіційність, дисципліна, відповідальність, практичність, наполегливість', en: 'Ambition, discipline, responsibility, practicality, perseverance' } as Localized,
    negative: { uk: 'Холодність, надмірна обережність, консерватизм, матеріалізм', en: 'Coldness, excessive caution, conservatism, materialism' } as Localized,
    icon: 'trending-up' as const,
  },
  {
    name: { uk: 'Водолій', en: 'Aquarius' } as Localized, symbol: '♒', color: '#38BDF8',
    dates: { uk: '20 січ – 18 лют', en: 'Jan 20 – Feb 18' } as Localized,
    element: { uk: 'Повітря', en: 'Air' } as Localized,
    quality: { uk: 'Фіксований', en: 'Fixed' } as Localized,
    ruler: { uk: 'Сатурн, Уран', en: 'Saturn, Uranus' } as Localized,
    stone: { uk: 'Аметист, аквамарин', en: 'Amethyst, Aquamarine' } as Localized,
    desc: { uk: 'Знак інновацій та гуманізму. Водолії — вільнодумці та реформатори. Вони живуть майбутнім і прагнуть зробити світ кращим.', en: 'A sign of innovation and humanism. Aquarians are free thinkers and reformers. They live for the future and strive to make the world a better place.' } as Localized,
    positive: { uk: 'Оригінальність, гуманізм, незалежність, прогресивність, дружелюбність', en: 'Originality, humanism, independence, progressiveness, friendliness' } as Localized,
    negative: { uk: 'Відчуженість, упертість, непередбачуваність, бунтарство', en: 'Detachment, stubbornness, unpredictability, rebelliousness' } as Localized,
    icon: 'water-outline' as const,
  },
  {
    name: { uk: 'Риби', en: 'Pisces' } as Localized, symbol: '♓', color: '#6366F1',
    dates: { uk: '19 лют – 20 бер', en: 'Feb 19 – Mar 20' } as Localized,
    element: { uk: 'Вода', en: 'Water' } as Localized,
    quality: { uk: 'Мінливий', en: 'Mutable' } as Localized,
    ruler: { uk: 'Юпітер, Нептун', en: 'Jupiter, Neptune' } as Localized,
    stone: { uk: 'Аквамарин, опал', en: 'Aquamarine, Opal' } as Localized,
    desc: { uk: 'Знак мрій та духовності. Риби — найбільш містичний знак зодіаку. Вони живуть між двома світами — реальним і духовним.', en: 'A sign of dreams and spirituality. Pisces is the most mystical sign of the zodiac. They live between two worlds — the real and the spiritual.' } as Localized,
    positive: { uk: 'Інтуїція, співчуття, художність, духовність, альтруїзм', en: 'Intuition, compassion, artistry, spirituality, altruism' } as Localized,
    negative: { uk: 'Втеча від реальності, жертовність, нерішучість, надмірна мрійливість', en: 'Escapism, self-sacrifice, indecisiveness, excessive daydreaming' } as Localized,
    icon: 'fish-outline' as const,
  },
];

const ELEMENT_COLORS: Record<string, string> = {
  'Fire': '#EF4444', 'Вогонь': '#EF4444',
  'Earth': '#84CC16', 'Земля': '#84CC16',
  'Air': '#F59E0B', 'Повітря': '#F59E0B',
  'Water': '#38BDF8', 'Вода': '#38BDF8',
};

export default function SignsScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { locale } = useI18n();
  const L = (field: Localized) => locale === 'uk' ? field.uk : field.en;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.intro}>{locale === 'uk' ? '12 знаків зодіаку, їх характеристики та вплив. Натисніть на знак для деталей.' : '12 zodiac signs, their characteristics and influence. Tap a sign for details.'}</Text>

      {SIGNS.map((s) => {
        const name = L(s.name);
        const open = expanded === name;
        const elemColor = ELEMENT_COLORS[L(s.element)] ?? s.color;
        return (
          <TouchableOpacity key={s.symbol} activeOpacity={0.8} onPress={() => setExpanded(open ? null : name)}>
            <Card style={[styles.card, open ? { borderColor: s.color + '60', borderWidth: 1.5 } : undefined]}>
              <View style={styles.cardHeader}>
                <View style={[styles.symbolBox, { backgroundColor: s.color + '22', borderColor: s.color + '55' }]}>
                  <Text style={[styles.symbolText, { color: s.color }]}>{s.symbol}</Text>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: s.color + '18' }]}>
                  <Ionicons name={s.icon} size={18} color={s.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.signName}>{name}</Text>
                  <Text style={styles.signDates}>{L(s.dates)}</Text>
                </View>
                <View style={[styles.elemBadge, { backgroundColor: elemColor + '22' }]}>
                  <Text style={[styles.elemText, { color: elemColor }]}>{L(s.element)}</Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
              </View>

              {open && (
                <View style={styles.detail}>
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>{locale === 'uk' ? 'ЯКІСТЬ' : 'QUALITY'}</Text>
                      <Text style={styles.metaValue}>{L(s.quality)}</Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>{locale === 'uk' ? 'ПЛАНЕТА' : 'RULER'}</Text>
                      <Text style={styles.metaValue}>{L(s.ruler)}</Text>
                    </View>
                    <View style={styles.metaDivider} />
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>{locale === 'uk' ? 'КАМІНЬ' : 'STONE'}</Text>
                      <Text style={styles.metaValue}>{L(s.stone)}</Text>
                    </View>
                  </View>

                  <Text style={styles.desc}>{L(s.desc)}</Text>

                  <View style={styles.row}>
                    <View style={[styles.pill, { backgroundColor: '#16A34A22' }]}>
                      <Ionicons name="checkmark-circle-outline" size={13} color="#16A34A" />
                      <Text style={[styles.pillText, { color: '#16A34A' }]}>{locale === 'uk' ? 'Сильні сторони' : 'Strengths'}</Text>
                    </View>
                  </View>
                  <Text style={styles.pillDesc}>{L(s.positive)}</Text>

                  <View style={[styles.pill, { backgroundColor: '#DC262622', marginTop: Spacing.sm }]}>
                    <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                    <Text style={[styles.pillText, { color: '#DC2626' }]}>{locale === 'uk' ? 'Слабкі сторони' : 'Weaknesses'}</Text>
                  </View>
                  <Text style={styles.pillDesc}>{L(s.negative)}</Text>
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
  signName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  signDates: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  elemBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  elemText: { fontSize: 10, fontWeight: '700' },

  detail: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  metaRow: { flexDirection: 'row', marginBottom: Spacing.md },
  metaItem: { flex: 1, alignItems: 'center' },
  metaDivider: { width: 1, backgroundColor: Colors.borderLight },
  metaLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 2 },
  metaValue: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', textAlign: 'center' },

  desc: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  row: { flexDirection: 'row' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start',
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 18, marginTop: 4, marginBottom: Spacing.sm },
});
