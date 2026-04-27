import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { StarBackground } from '@/components/ui/StarBackground';
import { useI18n } from '@/lib/i18n';
import { Card } from '@/components/ui/Card';

const POSITIONS_UK = [
  {
    key: 'personality',
    title: 'Особистість',
    icon: 'person-outline',
    color: '#F59E0B',
    desc: 'Ваше число Особистості — це ваша соціальна маска, перше враження яке ви справляєте. Воно визначає основні риси характеру, темперамент та спосіб взаємодії зі світом. Це енергія яку ви випромінюєте кожного дня.',
  },
  {
    key: 'soul',
    title: 'Душа',
    icon: 'heart-outline',
    color: '#818CF8',
    desc: 'Енергія Душі — це ваші глибинні бажання, істинна мотивація та внутрішній світ. Часто вона відрізняється від Особистості — створюючи конфлікт між тим ким ви здаєтесь і ким є насправді. Розуміння Душі допомагає знайти внутрішню гармонію.',
  },
  {
    key: 'destiny',
    title: 'Доля',
    icon: 'compass-outline',
    color: '#34D399',
    desc: 'Число Долі показує вашу глобальну місію в цьому житті. Це напрямок руху, ваша мета та призначення. Коли ви живете відповідно до своєї Долі — відчуваєте задоволення та сенс. Коли ігноруєте — з\'являються кризи та невдоволення.',
  },
  {
    key: 'spiritual',
    title: 'Духовне / Вища Суть',
    icon: 'sunny-outline',
    color: '#FBBF24',
    desc: 'Точка Духовного зв\'язку — ваш канал до вищих сил, інтуїції та натхнення. Вона показує через що ви отримуєте духовну енергію: медитації, природа, творчість чи служіння іншим. Це ваш ангел-охоронець у числовому вираженні.',
  },
  {
    key: 'material',
    title: 'Матеріальне / Фінансовий канал',
    icon: 'cash-outline',
    color: '#10B981',
    desc: 'Грошовий канал визначає через які сфери, дії та емоційні стани до вас приходять гроші. Він показує ідеальні професії, стиль заробітку та фінансові блоки. Знаючи свій канал — ви можете розблокувати потік достатку.',
  },
  {
    key: 'maleFemale',
    title: 'Стосунки / Чоловічо-жіноче',
    icon: 'heart-circle-outline',
    color: '#EC4899',
    desc: 'Канал стосунків показує вашу модель кохання: якого партнера ви підсвідомо шукаєте, як проявляєтесь у стосунках, чому вони можуть не складатися. Розуміння цієї точки допомагає побудувати гармонійний союз.',
  },
  {
    key: 'karmicTail',
    title: 'Кармічний хвіст',
    icon: 'infinite-outline',
    color: '#D97706',
    desc: 'Кармічний хвіст — це уроки з минулих життів та негативні сценарії які ви принесли з собою. Він показує глибинні страхи, блоки та патерни поведінки що повторюються. Усвідомлення кармічного хвоста — перший крок до звільнення від нього.',
  },
  {
    key: 'parentKarma',
    title: 'Батьківська карма',
    icon: 'people-outline',
    color: '#8B5CF6',
    desc: 'Програми та переконання успадковані від роду: батьків, бабусь, дідусів. Це може бути як дар (сильні якості роду) так і тягар (родові сценарії бідності, самотності, хвороб). Розуміння батьківської карми допомагає розірвати негативні цикли.',
  },
  {
    key: 'talentFromGod',
    title: 'Талант від Бога',
    icon: 'star-outline',
    color: '#0D9488',
    desc: 'Ваш унікальний духовний дар — те що дається вам легше ніж іншим людям. Це вроджена здібність яку варто розвивати та використовувати. Коли ви реалізуєте цей талант — відчуваєте потік та натхнення.',
  },
  {
    key: 'talentFromFamily',
    title: 'Талант від Роду',
    icon: 'leaf-outline',
    color: '#059669',
    desc: 'Сильні якості передані по лінії роду. Це практичні навички та здібності які ваші предки розвивали поколіннями. Поєднання Таланту від Бога та від Роду створює вашу унікальну суперсилу.',
  },
  {
    key: 'purpose',
    title: 'Призначення',
    icon: 'flag-outline',
    color: '#6366F1',
    desc: 'Ваша життєва місія розділена на три етапи: особисте призначення (до 40 років) — що змінити в собі; соціальне (40-60) — що віддати світу; духовне (після 60) — мудрість зрілості. Це дорожня карта вашого життя.',
  },
  {
    key: 'center',
    title: 'Центр Матриці',
    icon: 'radio-button-on-outline',
    color: '#F472B6',
    desc: 'Центральна точка об\'єднує всі енергії матриці. Вона показує загальний тон вашого життя та ключовий урок який потрібно засвоїти. Це точка балансу між усіма аспектами вашої долі.',
  },
];

const POSITIONS_EN = [
  { key: 'personality', title: 'Personality', icon: 'person-outline', color: '#F59E0B', desc: 'Your Personality number is your social mask, the first impression you make. It defines your core character traits, temperament and how you interact with the world.' },
  { key: 'soul', title: 'Soul', icon: 'heart-outline', color: '#818CF8', desc: 'Soul energy represents your deep desires, true motivation and inner world. Understanding it helps find inner harmony.' },
  { key: 'destiny', title: 'Destiny', icon: 'compass-outline', color: '#34D399', desc: 'Your Destiny number shows your global mission in this life — your direction, goal and purpose.' },
  { key: 'spiritual', title: 'Spiritual / Higher Self', icon: 'sunny-outline', color: '#FBBF24', desc: 'Your spiritual connection channel — how you receive intuition, inspiration and guidance from higher forces.' },
  { key: 'material', title: 'Material / Money Channel', icon: 'cash-outline', color: '#10B981', desc: 'Your money channel determines through which areas and actions money flows to you. It reveals ideal careers and financial blocks.' },
  { key: 'maleFemale', title: 'Relationships', icon: 'heart-circle-outline', color: '#EC4899', desc: 'Your relationship model: what partner you subconsciously seek, how you express love, and why relationships may struggle.' },
  { key: 'karmicTail', title: 'Karmic Tail', icon: 'infinite-outline', color: '#D97706', desc: 'Lessons from past lives and negative patterns you carry. It shows deep fears and recurring behavioral patterns.' },
  { key: 'parentKarma', title: 'Parent Karma', icon: 'people-outline', color: '#8B5CF6', desc: 'Programs inherited from your family line — both gifts (strong qualities) and burdens (poverty, loneliness patterns).' },
  { key: 'talentFromGod', title: 'God-given Talent', icon: 'star-outline', color: '#0D9488', desc: 'Your unique spiritual gift — what comes easier to you than to others. An innate ability worth developing.' },
  { key: 'talentFromFamily', title: 'Family Talent', icon: 'leaf-outline', color: '#059669', desc: 'Strong qualities passed through your family line. Practical skills your ancestors developed over generations.' },
  { key: 'purpose', title: 'Purpose', icon: 'flag-outline', color: '#6366F1', desc: 'Your life mission in three stages: personal (before 40), social (40-60), spiritual (after 60). A roadmap for your life.' },
  { key: 'center', title: 'Matrix Center', icon: 'radio-button-on-outline', color: '#F472B6', desc: 'The central point unites all matrix energies. It shows the overall tone of your life and the key lesson to learn.' },
];

export default function MatrixGuideScreen() {
  const router = useRouter();
  const { locale } = useI18n();
  const isUk = locale === 'uk';
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const POSITIONS = isUk ? POSITIONS_UK : POSITIONS_EN;

  return (
    <StarBackground style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{isUk ? 'Матриця Долі' : 'Destiny Matrix'}</Text>
        </View>

        {/* Intro */}
        <Card style={styles.introCard}>
          <LinearGradient
            colors={['rgba(139,92,246,0.15)', 'rgba(91,33,182,0.08)']}
            style={styles.introGradient}
          >
            <Text style={styles.introTitle}>
              {isUk ? 'Що таке Матриця Долі?' : 'What is the Destiny Matrix?'}
            </Text>
            <Text style={styles.introText}>
              {isUk
                ? 'Матриця Долі — це система самопізнання, що базується на дат народження та 22 енергіях Старших Арканів матриці. Кожна людина має унікальну комбінацію чисел-енергій, які визначають її характер, таланти, кармічні уроки, фінансовий потенціал та стосунки.'
                : 'The Destiny Matrix is a self-knowledge system based on your birth date and the 22 energies of the Major Arcana. Each person has a unique combination of number-energies that define character, talents, karmic lessons, financial potential and relationships.'}
            </Text>
          </LinearGradient>
        </Card>

        <Card style={styles.introCard}>
          <LinearGradient
            colors={['rgba(245,197,66,0.12)', 'rgba(200,144,26,0.06)']}
            style={styles.introGradient}
          >
            <Text style={styles.introTitle}>
              {isUk ? 'Навіщо знати свою Матрицю?' : 'Why know your Matrix?'}
            </Text>
            <Text style={styles.introText}>
              {isUk
                ? 'Знання своєї Матриці допомагає зрозуміти справжні причини подій у вашому житті: чому повторюються одні й ті самі ситуації, де шукати своє призначення, як розблокувати фінансовий потік і побудувати гармонійні стосунки. Це як карта вашого життя — з конкретними точками сили та зонами росту.'
                : 'Knowing your Matrix helps understand the true reasons behind life events: why the same situations repeat, where to find your purpose, how to unlock financial flow and build harmonious relationships. It is like a map of your life — with specific power points and growth zones.'}
            </Text>
          </LinearGradient>
        </Card>

        {/* Section title */}
        <Text style={styles.sectionTitle}>
          {isUk ? 'Точки Матриці — 12 ключових енергій' : 'Matrix Points — 12 key energies'}
        </Text>
        <Text style={styles.sectionSub}>
          {isUk ? 'Натисніть на будь-яку точку щоб дізнатися більше' : 'Tap any point to learn more'}
        </Text>

        {/* Positions */}
        {POSITIONS.map((pos) => {
          const isOpen = expandedKey === pos.key;
          return (
            <TouchableOpacity
              key={pos.key}
              activeOpacity={0.8}
              onPress={() => setExpandedKey(isOpen ? null : pos.key)}
            >
              <Card style={[styles.posCard, isOpen && styles.posCardOpen]}>
                <View style={styles.posHeader}>
                  <View style={[styles.posIcon, { backgroundColor: pos.color + '20' }]}>
                    <Ionicons name={pos.icon as any} size={20} color={pos.color} />
                  </View>
                  <Text style={[styles.posTitle, { color: pos.color }]}>{pos.title}</Text>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </View>
                {isOpen && (
                  <Text style={styles.posDesc}>{pos.desc}</Text>
                )}
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* How to read */}
        <Card style={[styles.introCard, { marginTop: Spacing.lg }]}>
          <LinearGradient
            colors={['rgba(16,185,129,0.12)', 'rgba(5,150,105,0.06)']}
            style={styles.introGradient}
          >
            <Text style={styles.introTitle}>
              {isUk ? 'Як читати Матрицю?' : 'How to read the Matrix?'}
            </Text>
            <Text style={styles.introText}>
              {isUk
                ? 'Кожне число від 1 до 22 відповідає одному зі Старших Арканів матриці. Число має позитивний прояв (коли енергія в плюсі) та негативний (коли в мінусі). Ви маєте можливість усвідомити свої енергії та перевести їх у позитивний прояв через самопізнання та практику.'
                : 'Each number from 1 to 22 corresponds to a Major Arcana card. Each has a positive expression (energy in plus) and negative (in minus). Your goal is to become aware of your energies and shift them to positive expression through self-knowledge and practice.'}
            </Text>
          </LinearGradient>
        </Card>

        {/* AI guide reminder */}
        <Card style={styles.aiReminderCard}>
          <LinearGradient
            colors={['rgba(139,92,246,0.18)', 'rgba(91,33,182,0.10)']}
            style={styles.aiReminderGradient}
          >
            <View style={styles.aiReminderRow}>
              <Ionicons name="sparkles" size={18} color={Colors.accent} />
              <Text style={styles.aiReminderText}>
                {isUk
                  ? 'Наш AI-провідник проаналізує вашу матрицю та пояснить кожну точку простою мовою — він значно спростить для вас це завдання!'
                  : 'Our AI guide will analyze your matrix and explain every point in plain language — it will make reading your matrix much easier!'}
              </Text>
            </View>
          </LinearGradient>
        </Card>

      </ScrollView>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  backBtn: { padding: Spacing.sm, marginLeft: -Spacing.xs },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },

  introCard: { marginBottom: Spacing.md },
  introGradient: { borderRadius: BorderRadius.lg, padding: Spacing.lg },
  introTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  introText: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24 },

  sectionTitle: { color: Colors.accent, fontSize: FontSize.lg, fontWeight: '700', marginTop: Spacing.md, marginBottom: 4 },
  sectionSub: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.md },

  posCard: { marginBottom: Spacing.sm },
  posCardOpen: { borderColor: 'rgba(139,92,246,0.3)', borderWidth: 1 },
  posHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  posIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  posTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '700' },
  posDesc: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 22, marginTop: Spacing.sm, paddingLeft: 48 },

  aiReminderCard: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  aiReminderGradient: { borderRadius: BorderRadius.lg, padding: Spacing.md },
  aiReminderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  aiReminderText: { flex: 1, color: Colors.text, fontSize: FontSize.sm, lineHeight: 20, fontWeight: '500' },
});
