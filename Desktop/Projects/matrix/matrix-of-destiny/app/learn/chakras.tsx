import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n';

type Localized = { uk: string; en: string };

const CHAKRAS = [
  {
    number: 1,
    name: { uk: 'Муладхара', en: 'Muladhara' },
    english: 'Root Chakra',
    color: '#DC2626',
    element: { uk: 'Земля', en: 'Earth' },
    location: { uk: 'Основа хребта', en: 'Base of the spine' },
    desc: {
      uk: 'Відповідає за безпеку, стабільність та базові потреби виживання. Коли збалансована — ви відчуваєте себе заземленим і захищеним.',
      en: 'Governs safety, stability, and the fundamental needs of survival. When balanced, you feel grounded and protected.',
    },
    positive: {
      uk: 'Стабільність, безпека, витривалість, матеріальний достаток',
      en: 'Stability, security, endurance, material abundance',
    },
    negative: {
      uk: 'Страх, тривога, невпевненість, фінансові проблеми',
      en: 'Fear, anxiety, insecurity, financial difficulties',
    },
    affirmation: {
      uk: 'Я в безпеці. Земля підтримує мене. Я маю все необхідне.',
      en: 'I am safe. The Earth supports me. I have everything I need.',
    },
    icon: 'leaf-outline' as const,
  },
  {
    number: 2,
    name: { uk: 'Свадхістхана', en: 'Svadhisthana' },
    english: 'Sacral Chakra',
    color: '#EA580C',
    element: { uk: 'Вода', en: 'Water' },
    location: { uk: 'Нижня частина живота', en: 'Lower abdomen' },
    desc: {
      uk: 'Центр творчості, сексуальності та емоцій. Відповідає за здатність відчувати задоволення і радість від життя.',
      en: 'The center of creativity, sensuality, and emotion. Governs the capacity to experience pleasure and the joy of living.',
    },
    positive: {
      uk: 'Творчість, пристрасть, радість, здорові стосунки',
      en: 'Creativity, passion, joy, healthy relationships',
    },
    negative: {
      uk: 'Залежності, почуття провини, емоційна нестабільність',
      en: 'Addictions, guilt, emotional instability',
    },
    affirmation: {
      uk: 'Я дозволяю собі відчувати. Творчість тече через мене вільно.',
      en: 'I allow myself to feel. Creativity flows through me freely.',
    },
    icon: 'water-outline' as const,
  },
  {
    number: 3,
    name: { uk: 'Маніпура', en: 'Manipura' },
    english: 'Solar Plexus',
    color: '#CA8A04',
    element: { uk: 'Вогонь', en: 'Fire' },
    location: { uk: 'Сонячне сплетіння', en: 'Solar plexus' },
    desc: {
      uk: 'Центр особистої сили, волі та самооцінки. Звідси виходить ваша впевненість у собі та здатність приймати рішення.',
      en: 'The center of personal power, willpower, and self-worth. From here arises your confidence and ability to make decisions.',
    },
    positive: {
      uk: 'Впевненість, сила волі, самодисципліна, лідерство',
      en: 'Confidence, willpower, self-discipline, leadership',
    },
    negative: {
      uk: 'Безсилля, низька самооцінка, контроль через страх',
      en: 'Powerlessness, low self-esteem, control through fear',
    },
    affirmation: {
      uk: 'Я сильний. Я вірю в себе та свої рішення.',
      en: 'I am strong. I believe in myself and in my decisions.',
    },
    icon: 'sunny-outline' as const,
  },
  {
    number: 4,
    name: { uk: 'Анахата', en: 'Anahata' },
    english: 'Heart Chakra',
    color: '#16A34A',
    element: { uk: 'Повітря', en: 'Air' },
    location: { uk: 'Центр грудей', en: 'Center of the chest' },
    desc: {
      uk: 'Місце любові, співчуття та зцілення. Поєднує нижні (матеріальні) та верхні (духовні) чакри.',
      en: 'The seat of love, compassion, and healing. It bridges the lower (material) and upper (spiritual) chakras.',
    },
    positive: {
      uk: 'Безумовна любов, прощення, емпатія, гармонія',
      en: 'Unconditional love, forgiveness, empathy, harmony',
    },
    negative: {
      uk: 'Горе, ревнощі, нездатність пробачити, ізоляція',
      en: 'Grief, jealousy, inability to forgive, isolation',
    },
    affirmation: {
      uk: 'Моє серце відкрите. Я даю і приймаю любов вільно.',
      en: 'My heart is open. I give and receive love freely.',
    },
    icon: 'heart-outline' as const,
  },
  {
    number: 5,
    name: { uk: 'Вішуддха', en: 'Vishuddha' },
    english: 'Throat Chakra',
    color: '#0284C7',
    element: { uk: 'Ефір', en: 'Ether' },
    location: { uk: 'Горло', en: 'Throat' },
    desc: {
      uk: 'Центр спілкування, самовираження та правди. Допомагає говорити свою істину та слухати інших.',
      en: 'The center of communication, self-expression, and truth. It empowers you to speak your truth and to listen deeply to others.',
    },
    positive: {
      uk: 'Чітке спілкування, творче вираження, чесність',
      en: 'Clear communication, creative expression, honesty',
    },
    negative: {
      uk: 'Страх говорити, брехня, нездатність висловити себе',
      en: 'Fear of speaking, dishonesty, inability to express oneself',
    },
    affirmation: {
      uk: 'Я говорю свою правду з любов\'ю і ясністю.',
      en: 'I speak my truth with love and clarity.',
    },
    icon: 'mic-outline' as const,
  },
  {
    number: 6,
    name: { uk: 'Аджна', en: 'Ajna' },
    english: 'Third Eye',
    color: '#4F46E5',
    element: { uk: 'Світло', en: 'Light' },
    location: { uk: 'Між бровами', en: 'Between the brows' },
    desc: {
      uk: 'Центр інтуїції, мудрості та внутрішнього зору. Відповідає за ясне бачення, уяву та духовне усвідомлення.',
      en: 'The center of intuition, wisdom, and inner vision. Governs clarity of sight, imagination, and spiritual awareness.',
    },
    positive: {
      uk: 'Інтуїція, ясновидіння, мудрість, духовне розуміння',
      en: 'Intuition, clairvoyance, wisdom, spiritual insight',
    },
    negative: {
      uk: 'Ілюзії, нав\'язливі думки, відірваність від реальності',
      en: 'Illusions, obsessive thoughts, detachment from reality',
    },
    affirmation: {
      uk: 'Я довіряю своїй інтуїції. Моє внутрішнє бачення ясне.',
      en: 'I trust my intuition. My inner vision is clear.',
    },
    icon: 'eye-outline' as const,
  },
  {
    number: 7,
    name: { uk: 'Сахасрара', en: 'Sahasrara' },
    english: 'Crown Chakra',
    color: '#7C3AED',
    element: { uk: 'Космос', en: 'Cosmos' },
    location: { uk: "Тім'я", en: 'Crown of the head' },
    desc: {
      uk: 'Вища чакра, місце з\'єднання з Всесвітом та вищим "Я". Відповідає за духовне просвітлення та єдність з усім сущим.',
      en: 'The highest chakra, the point of union with the Universe and the Higher Self. Governs spiritual enlightenment and oneness with all that exists.',
    },
    positive: {
      uk: 'Просвітлення, єднання з Богом, внутрішній спокій',
      en: 'Enlightenment, divine connection, inner peace',
    },
    negative: {
      uk: 'Духовна криза, відчуття відірваності, нігілізм',
      en: 'Spiritual crisis, sense of disconnection, nihilism',
    },
    affirmation: {
      uk: 'Я єдиний з Всесвітом. Я відкритий до вищої мудрості.',
      en: 'I am one with the Universe. I am open to higher wisdom.',
    },
    icon: 'sparkles-outline' as const,
  },
];

export default function ChakrasScreen() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { locale } = useI18n();

  const L = (field: Localized) => locale === 'uk' ? field.uk : field.en;

  const introText = locale === 'uk'
    ? '7 основних енергетичних центрів тіла. Натисніть на чакру щоб дізнатись більше.'
    : '7 primary energy centers of the body. Tap a chakra to learn more.';

  const balancedLabel = locale === 'uk' ? 'В балансі' : 'In balance';
  const imbalanceLabel = locale === 'uk' ? 'Дисбаланс' : 'Imbalance';
  const affirmationLabel = locale === 'uk' ? 'АФІРМАЦІЯ' : 'AFFIRMATION';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.intro}>{introText}</Text>

      {CHAKRAS.map((c) => {
        const open = expanded === c.number;
        return (
          <TouchableOpacity key={c.number} activeOpacity={0.8} onPress={() => setExpanded(open ? null : c.number)}>
            <Card style={[styles.card, open ? { borderColor: c.color + '60', borderWidth: 1.5 } : undefined]}>
              <View style={styles.cardHeader}>
                <View style={[styles.chakraNum, { backgroundColor: c.color + '22', borderColor: c.color + '55' }]}>
                  <Text style={[styles.chakraNumText, { color: c.color }]}>{c.number}</Text>
                </View>
                <View style={[styles.iconCircle, { backgroundColor: c.color + '18' }]}>
                  <Ionicons name={c.icon} size={20} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chakraName}>{L(c.name)}</Text>
                  <Text style={styles.chakraEnglish}>{c.english} · {L(c.location)}</Text>
                </View>
                <View style={[styles.elementBadge, { backgroundColor: c.color + '18' }]}>
                  <Text style={[styles.elementText, { color: c.color }]}>{L(c.element)}</Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
              </View>

              {open && (
                <View style={styles.detail}>
                  <Text style={styles.desc}>{L(c.desc)}</Text>

                  <View style={styles.row}>
                    <View style={[styles.pill, { backgroundColor: '#16A34A22' }]}>
                      <Ionicons name="checkmark-circle-outline" size={13} color="#16A34A" />
                      <Text style={[styles.pillText, { color: '#16A34A' }]}>{balancedLabel}</Text>
                    </View>
                  </View>
                  <Text style={styles.pillDesc}>{L(c.positive)}</Text>

                  <View style={[styles.pill, { backgroundColor: '#DC262622', marginTop: Spacing.sm }]}>
                    <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                    <Text style={[styles.pillText, { color: '#DC2626' }]}>{imbalanceLabel}</Text>
                  </View>
                  <Text style={styles.pillDesc}>{L(c.negative)}</Text>

                  <View style={[styles.affirmBox, { borderLeftColor: c.color }]}>
                    <Text style={styles.affirmLabel}>{affirmationLabel}</Text>
                    <Text style={styles.affirmText}>"{L(c.affirmation)}"</Text>
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
  chakraNum: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  chakraNumText: { fontSize: FontSize.md, fontWeight: '800' },
  iconCircle: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  chakraName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  chakraEnglish: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 1 },
  elementBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  elementText: { fontSize: 10, fontWeight: '700' },

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
  affirmBox: {
    borderLeftWidth: 3, paddingLeft: Spacing.md,
    marginTop: Spacing.sm,
  },
  affirmLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  affirmText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18, fontStyle: 'italic' },
});
