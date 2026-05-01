import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  ScrollView, Alert, TouchableOpacity,
  Animated, Easing, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { StarBackground } from '@/components/ui/StarBackground';
import { MatrixDiagram } from '@/components/matrix/MatrixDiagram';
import { calculateMatrix } from '@/lib/matrix-calc';
import { getEnergyById } from '@/constants/energies';
import { useAppStore } from '@/stores/useAppStore';
import { trackFeatureUsed, FEATURES } from '@/lib/analytics';
import { useI18n } from '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';


const PANEL_HEIGHT = 300;

// ── Mystical loading messages ─────────────────────────────────────────────────
const MYSTICAL_MSGS_UK = [
  'Налаштовуємо зв\'язок з вашими Арканами...',
  'Аналізуємо кармічний хвіст...',
  'Формуємо прогноз фінансового потоку...',
  'Зчитуємо нумерологічний код долі...',
  'Майже готово. Збираємо вашу унікальну Матрицю...',
];
const MYSTICAL_MSGS_EN = [
  'Establishing connection with your Arcana...',
  'Analysing the karmic tail...',
  'Mapping your financial energy flow...',
  'Reading the numerological code of destiny...',
  'Almost done. Building your unique Matrix...',
];

const getNodeLabels = (locale: string): Record<string, string> => locale === 'uk' ? {
  center:    'Особистість',
  left_0:    'Початок шляху (0 р.)',
  left_1:    'Ліва вісь — зовнішня',
  left_2:    'Духовне начало',
  left_3:    'Духовно-особистісний вузол',
  right_0:   'Здоров\'я / Матеріальне (40 р.)',
  right_1:   'Права вісь — зовнішня',
  right_2:   'Матеріальне',
  right_3:   'Матеріально-особистісний вузол',
  top_0:     'Доля / Призначення (20 р.)',
  top_1:     'Верхня вісь — зовнішня',
  top_2:     'Верхня вісь — внутрішня',
  top_3:     'Верхній вузол',
  bot_0:     'Кармічний хвіст (60 р.)',
  bot_1:     'Нижня вісь — зовнішня',
  bot_2:     'Кармічний хвіст',
  bot_3:     'Нижній вузол',
  topLeft:   'Талант від Бога (10 р.)',
  topRight:  'Талант від Роду (30 р.)',
  botRight:  'Призначення (50 р.)',
  botLeft:   'Батьківська карма (70 р.)',
} : {
  center:    'Personality',
  left_0:    'Beginning of path (age 0)',
  left_1:    'Left axis — outer',
  left_2:    'Spiritual origin',
  left_3:    'Spiritual-personal node',
  right_0:   'Health / Material (age 40)',
  right_1:   'Right axis — outer',
  right_2:   'Material',
  right_3:   'Material-personal node',
  top_0:     'Destiny / Purpose (age 20)',
  top_1:     'Top axis — outer',
  top_2:     'Top axis — inner',
  top_3:     'Top node',
  bot_0:     'Karmic tail (age 60)',
  bot_1:     'Bottom axis — outer',
  bot_2:     'Karmic tail',
  bot_3:     'Bottom node',
  topLeft:   'God-given talent (age 10)',
  topRight:  'Family talent (age 30)',
  botRight:  'Purpose (age 50)',
  botLeft:   'Parental karma (age 70)',
};

// ─────────────────────────────────────────────────────────────────────────────
// MatrixSummary — загальний аналіз матриці
// ─────────────────────────────────────────────────────────────────────────────
function MatrixSummary({ result }: { result: ReturnType<typeof calculateMatrix> }) {
  const { locale } = useI18n();
  const personality = getEnergyById(result.personality);
  const soul        = getEnergyById(result.soul);
  const destiny     = getEnergyById(result.destiny);
  const spiritual   = getEnergyById(result.spiritual);
  const material    = getEnergyById(result.material);
  const talentGod   = getEnergyById(result.talentFromGod);
  const talentFamily= getEnergyById(result.talentFromFamily);
  const purpose     = getEnergyById(result.purpose);
  const karmic      = getEnergyById(result.karmicTail);
  const parentKarma = getEnergyById(result.parentKarma);

  const CARDS = [
    {
      key: 'personality',
      label: locale === 'uk' ? 'Особистість' : 'Personality',
      icon: 'person-outline' as const,
      iconBg: 'rgba(245,159,11,0.15)',
      iconColor: '#F59E0B',
      accent: '#F59E0B',
      border: 'rgba(245,159,11,0.22)',
      gradColors: ['rgba(245,159,11,0.08)', 'rgba(10,10,26,0)'] as [string,string],
      value: result.personality,
      energy: personality,
      desc: locale === 'uk' ? `Ваша особистість проявляється через енергію ${personality?.name}. ${personality?.positive}` : `Your personality manifests through the energy of ${personality?.name}. ${personality?.positive}`,
    },
    {
      key: 'soul',
      label: locale === 'uk' ? 'Душа та призначення' : 'Soul & Purpose',
      icon: 'heart-outline' as const,
      iconBg: 'rgba(129,140,248,0.15)',
      iconColor: '#818CF8',
      accent: '#818CF8',
      border: 'rgba(129,140,248,0.22)',
      gradColors: ['rgba(129,140,248,0.08)', 'rgba(10,10,26,0)'] as [string,string],
      value: result.soul,
      energy: soul,
      desc: locale === 'uk' ? `Душа прагне до ${soul?.name?.toLowerCase()}. ${soul?.advice}` : `The soul strives towards ${soul?.name?.toLowerCase()}. ${soul?.advice}`,
    },
    {
      key: 'destiny',
      label: locale === 'uk' ? 'Лінія долі' : 'Destiny Line',
      icon: 'compass-outline' as const,
      iconBg: 'rgba(37,99,235,0.15)',
      iconColor: '#2563EB',
      accent: '#60A5FA',
      border: 'rgba(37,99,235,0.22)',
      gradColors: ['rgba(37,99,235,0.08)', 'rgba(10,10,26,0)'] as [string,string],
      value: result.destiny,
      energy: destiny,
      desc: locale === 'uk' ? `Ваша доля пов'язана з темою «${destiny?.name}». ${destiny?.positive}` : `Your destiny is connected to the theme of "${destiny?.name}". ${destiny?.positive}`,
    },
    {
      key: 'spiritual',
      label: locale === 'uk' ? 'Духовний шлях' : 'Spiritual Path',
      icon: 'infinite-outline' as const,
      iconBg: 'rgba(124,58,237,0.15)',
      iconColor: '#7C3AED',
      accent: '#A78BFA',
      border: 'rgba(124,58,237,0.22)',
      gradColors: ['rgba(124,58,237,0.08)', 'rgba(10,10,26,0)'] as [string,string],
      value: result.spiritual,
      energy: spiritual,
      desc: locale === 'uk' ? `Духовний розвиток через ${spiritual?.name?.toLowerCase()}. ${spiritual?.advice}` : `Spiritual development through ${spiritual?.name?.toLowerCase()}. ${spiritual?.advice}`,
    },
    {
      key: 'material',
      label: locale === 'uk' ? 'Матеріальна сфера' : 'Material Sphere',
      icon: 'diamond-outline' as const,
      iconBg: 'rgba(249,115,22,0.15)',
      iconColor: '#F97316',
      accent: '#FB923C',
      border: 'rgba(249,115,22,0.22)',
      gradColors: ['rgba(249,115,22,0.08)', 'rgba(10,10,26,0)'] as [string,string],
      value: result.material,
      energy: material,
      desc: locale === 'uk' ? `Матеріальний потенціал: ${material?.positive} Остерігайтесь: ${material?.negative?.toLowerCase()}` : `Material potential: ${material?.positive} Beware of: ${material?.negative?.toLowerCase()}`,
    },
  ];

  const TIMELINE = locale === 'uk' ? [
    { age: '0–7', dot: '#F59E0B', energy: personality, label: 'Формування особистості' },
    { age: '7–14', dot: '#818CF8', energy: soul,        label: 'Розвиток душі' },
    { age: '14–21', dot: '#2563EB', energy: destiny,    label: 'Пошук призначення' },
    { age: '21–28', dot: '#7C3AED', energy: spiritual,  label: 'Духовне пробудження' },
    { age: '28–40', dot: '#10B981', energy: talentGod,  label: 'Розкриття таланту від Бога' },
    { age: '40–50', dot: '#F97316', energy: material,   label: 'Матеріальна реалізація' },
    { age: '50–60', dot: '#0D9488', energy: purpose,    label: 'Виконання місії' },
    { age: '60+',   dot: '#6B7280', energy: karmic,     label: 'Кармічне завершення' },
  ] : [
    { age: '0–7', dot: '#F59E0B', energy: personality, label: 'Personality formation' },
    { age: '7–14', dot: '#818CF8', energy: soul,        label: 'Soul development' },
    { age: '14–21', dot: '#2563EB', energy: destiny,    label: 'Seeking purpose' },
    { age: '21–28', dot: '#7C3AED', energy: spiritual,  label: 'Spiritual awakening' },
    { age: '28–40', dot: '#10B981', energy: talentGod,  label: 'God-given talent revealed' },
    { age: '40–50', dot: '#F97316', energy: material,   label: 'Material realization' },
    { age: '50–60', dot: '#0D9488', energy: purpose,    label: 'Mission fulfillment' },
    { age: '60+',   dot: '#6B7280', energy: karmic,     label: 'Karmic completion' },
  ];

  return (
    <View style={styles.summaryWrap}>
      <Text style={styles.summaryTitle}>{locale === 'uk' ? 'Загальний аналіз' : 'General Analysis'}</Text>

      {/* ── Main energy cards ── */}
      {CARDS.map((card) => (
        <View key={card.key} style={[styles.summaryCard, { borderColor: card.border }]}>
          <LinearGradient colors={card.gradColors} style={styles.summaryCardGrad}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.summaryIconWrap, { backgroundColor: card.iconBg }]}>
                <Ionicons name={card.icon} size={18} color={card.iconColor} />
              </View>
              <Text style={[styles.summaryCardLabel, { color: card.accent }]}>{card.label}</Text>
            </View>

            <View style={styles.summaryEnergyRow}>
              <LinearGradient
                colors={['rgba(245,197,66,0.6)', 'rgba(200,144,26,0.6)']}
                style={styles.summaryEnergyBadge}
              >
                <Text style={styles.summaryEnergyNum}>{card.value}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryEnergyName}>{card.energy?.name}</Text>
                <Text style={[styles.summaryKeywords, { color: card.accent }]}>
                  {card.energy?.keywords.join(' · ')}
                </Text>
              </View>
              <Text style={[styles.panelPlanet, { color: card.accent, borderColor: card.border }]}>
                {card.energy?.planet}
              </Text>
            </View>

            <Text style={styles.summaryDescription}>{card.desc}</Text>

            <View style={[styles.summaryAdvice, { borderColor: card.border }]}>
              <Ionicons name="bulb-outline" size={13} color={card.accent} />
              <Text style={[styles.summaryAdviceText, { color: card.accent }]}>
                {card.energy?.advice}
              </Text>
            </View>
          </LinearGradient>
        </View>
      ))}

      {/* ── Talents & Purpose ── */}
      <Text style={[styles.summaryTitle, { marginTop: 4 }]}>{locale === 'uk' ? 'Таланти та місія' : 'Talents & Mission'}</Text>
      <View style={styles.karmaGrid}>
        {[
          { label: locale === 'uk' ? 'Талант від Бога' : 'God-given Talent', val: result.talentFromGod,    en: talentGod,   color: '#0D9488', bg: 'rgba(13,148,136,0.1)', border: 'rgba(13,148,136,0.22)' },
          { label: locale === 'uk' ? 'Талант від Роду' : 'Family Talent', val: result.talentFromFamily,  en: talentFamily,color: '#0D9488', bg: 'rgba(13,148,136,0.1)', border: 'rgba(13,148,136,0.22)' },
          { label: locale === 'uk' ? 'Призначення' : 'Purpose',     val: result.purpose,           en: purpose,     color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.22)' },
        ].map((item) => (
          <View key={item.label} style={[styles.karmaItem, { borderColor: item.border }]}>
            <LinearGradient
              colors={[item.bg, 'rgba(10,10,26,0)'] as [string,string]}
              style={styles.karmaItemGrad}
            >
              <View style={[styles.karmaIcon, { backgroundColor: item.bg }]}>
                <Ionicons name="sparkles" size={14} color={item.color} />
              </View>
              <Text style={[styles.karmaLabel, { color: item.color }]}>{item.label}</Text>
              <Text style={[styles.karmaNum, { color: item.color }]}>{item.val}</Text>
              <Text style={[styles.karmaName, { color: Colors.text }]}>{item.en?.name}</Text>
              <Text style={[styles.karmaDesc, { color: Colors.textMuted }]}>
                {item.en?.advice}
              </Text>
            </LinearGradient>
          </View>
        ))}
      </View>

      {/* ── Karmic lessons ── */}
      <Text style={[styles.summaryTitle, { marginTop: 4 }]}>{locale === 'uk' ? 'Кармічні уроки' : 'Karmic Lessons'}</Text>
      <View style={styles.karmaGrid}>
        {[
          { label: locale === 'uk' ? 'Кармічний хвіст' : 'Karmic Tail',  val: result.karmicTail,   en: karmic,      color: '#D97706', bg: 'rgba(217,119,6,0.1)',  border: 'rgba(217,119,6,0.22)' },
          { label: locale === 'uk' ? 'Батьківська карма' : 'Parental Karma', val: result.parentKarma,  en: parentKarma, color: '#B45309', bg: 'rgba(180,83,9,0.1)',   border: 'rgba(180,83,9,0.22)' },
        ].map((item) => (
          <View key={item.label} style={[styles.karmaItem, { borderColor: item.border }]}>
            <LinearGradient
              colors={[item.bg, 'rgba(10,10,26,0)'] as [string,string]}
              style={styles.karmaItemGrad}
            >
              <View style={[styles.karmaIcon, { backgroundColor: item.bg }]}>
                <Ionicons name="refresh-circle-outline" size={14} color={item.color} />
              </View>
              <Text style={[styles.karmaLabel, { color: item.color }]}>{item.label}</Text>
              <Text style={[styles.karmaNum, { color: item.color }]}>{item.val}</Text>
              <Text style={[styles.karmaName, { color: Colors.text }]}>{item.en?.name}</Text>
              <Text style={[styles.karmaDesc, { color: Colors.textMuted }]}>
                {item.en?.negative}
              </Text>
            </LinearGradient>
          </View>
        ))}
      </View>

      {/* ── Life timeline ── */}
      <Text style={[styles.summaryTitle, { marginTop: 4 }]}>{locale === 'uk' ? 'Часова шкала життя' : 'Life Timeline'}</Text>
      <View style={styles.timelineWrap}>
        {TIMELINE.map((t, i) => (
          <View key={t.age} style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: t.dot }]}>
              <Text style={styles.timelineDotText}>{t.energy?.name?.substring(0, 2)}</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineAge, { color: t.dot }]}>
                {t.age} {locale === 'uk' ? 'р.' : 'y.'} — {t.label}
              </Text>
              <Text style={styles.timelineText}>
                {locale === 'uk' ? 'Енергія' : 'Energy'} {t.energy?.name}: {t.energy?.keywords.join(', ')}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CreateMatrixScreen() {
  const router = useRouter();
  const { locale } = useI18n();
  const NODE_LABELS = getNodeLabels(locale);
  const addMatrix = useAppStore((s) => s.addMatrix);
  const isPremium = useAppStore((s) => s.isPremium);
  const savedMatrices = useAppStore((s) => s.savedMatrices);

  const [name, setName]   = useState('');
  const [day, setDay]     = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear]   = useState('');
  const [result, setResult] = useState<ReturnType<typeof calculateMatrix> | null>(null);

  const [errors, setErrors] = useState<{ name?: boolean; day?: boolean; month?: boolean; year?: boolean }>({});
  const [selectedNode, setSelectedNode] = useState<{ key: string; value: number } | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  // ── Video transition phase ──────────────────────────────────
  const [phase, setPhase] = useState<'form' | 'video' | 'result'>('form');
  const videoFadeAnim = useRef(new Animated.Value(1)).current;
  const pendingResult = useRef<ReturnType<typeof calculateMatrix> | null>(null);

  // ── Mini widget state ──────────────────────────────────────────────────────
  const [miniMode, setMiniMode]       = useState(false);
  const [matrixReady, setMatrixReady] = useState(false);
  const [msgIdx, setMsgIdx]           = useState(0);
  const miniModeRef  = useRef(false);
  const msgIdxRef    = useRef(0);
  const msgOpacity   = useRef(new Animated.Value(0)).current;
  const miniPulse    = useRef(new Animated.Value(1)).current;
  const miniNotifOpacity = useRef(new Animated.Value(0)).current;
  const miniNotifScale   = useRef(new Animated.Value(0.8)).current;

  const createPlayer = useVideoPlayer(require('../../assets/matrix_create.mp4'), (player) => {
    player.loop = false;
    if ('audioMixingMode' in player) (player as any).audioMixingMode = 'mixWithOthers';
  });

  useEffect(() => {
    const sub = createPlayer.addListener('playToEnd', () => {
      if (miniModeRef.current) {
        // User minimised — show "ready" badge on mini widget
        setMatrixReady(true);
        Animated.parallel([
          Animated.timing(miniNotifOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(miniNotifScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        ]).start();
      } else {
        // Normal flow — fade out video, show result
        Animated.timing(videoFadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          setPhase('result');
          setResult(pendingResult.current);
          setSelectedNode(null);
          resultAnim.setValue(0);
          Animated.spring(resultAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
        });
      }
    });
    return () => sub.remove();
  }, [createPlayer]);

  // ── Mystical text cycling during video phase ───────────────────────────────
  useEffect(() => {
    if (phase !== 'video') return;
    msgIdxRef.current = 0;
    setMsgIdx(0);
    msgOpacity.setValue(0);
    miniNotifOpacity.setValue(0);
    miniNotifScale.setValue(0.8);
    // Fade in first message
    Animated.timing(msgOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const MSGS = locale === 'uk' ? MYSTICAL_MSGS_UK : MYSTICAL_MSGS_EN;
    const timer = setInterval(() => {
      if (msgIdxRef.current >= MSGS.length - 1) { clearInterval(timer); return; }
      Animated.timing(msgOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        msgIdxRef.current += 1;
        setMsgIdx(msgIdxRef.current);
        Animated.timing(msgOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      });
    }, 2400);
    return () => clearInterval(timer);
  }, [phase]);

  // ── Handlers: minimise / expand ───────────────────────────────────────────
  const goMini = useCallback(() => {
    miniModeRef.current = true;
    setMiniMode(true);
    Animated.timing(videoFadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    // Pulse orb
    miniPulse.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(miniPulse, { toValue: 1.18, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(miniPulse, { toValue: 1.0,  duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const expandFromMini = useCallback(() => {
    miniModeRef.current = false;
    setMiniMode(false);
    miniPulse.stopAnimation();
    if (matrixReady) {
      // Matrix is ready — jump to result
      setPhase('result');
      setResult(pendingResult.current);
      setSelectedNode(null);
      resultAnim.setValue(0);
      Animated.spring(resultAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
    } else {
      // Video still playing — restore full-screen overlay
      videoFadeAnim.setValue(0);
      Animated.timing(videoFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [matrixReady]);

  const { diagramSize } = useResponsive();

  // ── Calculate ──────────────────────────────────────────────
  const handleCalculate = () => {
    Keyboard.dismiss();
    // Non-premium users can only have 1 saved matrix (auto-created from onboarding)
    if (!isPremium && savedMatrices.length >= 1) {
      Alert.alert(
        locale === 'uk' ? 'Потрібен Premium' : 'Premium Required',
        locale === 'uk' ? 'Безкоштовно доступна лише одна матриця. Оформіть Premium для створення необмеженої кількості матриць.' : 'Only one matrix is available for free. Get Premium to create unlimited matrices.',
        [
          { text: locale === 'uk' ? 'Скасувати' : 'Cancel', style: 'cancel' },
          { text: 'Premium ✨', onPress: () => router.push('/paywall' as any) },
        ]
      );
      return;
    }
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);
    const fieldErrors = {
      name: !name.trim(),
      day: !d || d > 31,
      month: !m || m > 12,
      year: !y || y < 1900 || y > 2030,
    };
    if (fieldErrors.name || fieldErrors.day || fieldErrors.month || fieldErrors.year) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    pendingResult.current = calculateMatrix(dateStr);

    // Start video phase
    videoFadeAnim.setValue(1);
    miniModeRef.current = false;
    setMiniMode(false);
    setMatrixReady(false);
    setMsgIdx(0);
    msgIdxRef.current = 0;
    setPhase('video');
    try { createPlayer.currentTime = 0; createPlayer.play(); } catch {}
  };

  // ── Save ──────────────────────────────────────────────────
  const handleSave = () => {
    if (!result) return;
    const id = Date.now().toString();
    addMatrix({
      id,
      name: name.trim() || (locale === 'uk' ? `Матриця ${result.birthDate}` : `Matrix ${result.birthDate}`),
      birthDate: result.birthDate,
      data: result,
      createdAt: new Date().toISOString(),
    });
    trackFeatureUsed(FEATURES.MATRIX_CREATE, 'matrix_create');
    // Navigate directly to the new matrix's detail page
    router.replace(`/matrix/${id}` as any);
  };

  // ── Node tap ──────────────────────────────────────────────
  const handleNodePress = (key: string, value: number) => {
    if (selectedNode?.key === key) {
      closePanel();
    } else {
      setSelectedNode({ key, value });
      Animated.spring(panelAnim, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }).start();
    }
  };

  const closePanel = () => {
    Animated.timing(panelAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start(
      () => setSelectedNode(null)
    );
  };

  const panelTranslate = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [PANEL_HEIGHT, 0] });
  const energy = selectedNode ? getEnergyById(selectedNode.value) : null;
  const label  = selectedNode ? (NODE_LABELS[selectedNode.key] ?? selectedNode.key) : '';

  return (
    <StarBackground style={styles.root}>
      {/* ─── Video Phase (fullscreen) ──────────── */}
      {phase === 'video' && !miniMode && (
        <Animated.View style={[styles.videoOverlay, { opacity: videoFadeAnim }]}>
          <VideoView
            player={createPlayer}
            style={styles.createVideo}
            nativeControls={false}
            contentFit="cover"
          />
          {/* Minimise to floating widget */}
          <TouchableOpacity style={styles.videoMinimizeBtn} onPress={goMini} activeOpacity={0.7}>
            <Ionicons name="contract-outline" size={18} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <View style={styles.videoTextOverlay}>
            <Animated.View style={{ opacity: msgOpacity }}>
              <Text style={styles.videoTitle}>
                {(locale === 'uk' ? MYSTICAL_MSGS_UK : MYSTICAL_MSGS_EN)[msgIdx]}
              </Text>
            </Animated.View>
            <Text style={styles.videoSubtitle}>{name.trim() || (locale === 'uk' ? 'Матриця' : 'Matrix')}</Text>
          </View>
        </Animated.View>
      )}

      {/* ─── Mini floating widget (while video runs in bg) ─────── */}
      {phase === 'video' && miniMode && (
        <TouchableOpacity style={styles.miniWidget} onPress={expandFromMini} activeOpacity={0.85}>
          <LinearGradient
            colors={['rgba(139,92,246,0.97)', 'rgba(62,28,154,0.97)']}
            style={styles.miniWidgetGrad}
          >
            {/* Pulsing orb */}
            <Animated.View style={[styles.miniOrb, { transform: [{ scale: miniPulse }] }]}>
              <LinearGradient colors={['#C8901A', '#F5C542', '#8B5CF6']} style={styles.miniOrbInner} />
            </Animated.View>

            {matrixReady ? (
              <Animated.View style={{ opacity: miniNotifOpacity, transform: [{ scale: miniNotifScale }] }}>
                <Text style={styles.miniTitle}>✦ {locale === 'uk' ? 'Матриця готова!' : 'Matrix ready!'}</Text>
                <Text style={styles.miniSubtitle}>{locale === 'uk' ? 'Натисни, щоб відкрити' : 'Tap to open'}</Text>
              </Animated.View>
            ) : (
              <View>
                <Text style={styles.miniTitle}>{locale === 'uk' ? 'Генерація...' : 'Generating...'}</Text>
                <Text style={styles.miniSubtitle}>{name.trim() || (locale === 'uk' ? 'Матриця' : 'Matrix')}</Text>
              </View>
            )}

            <Ionicons name="expand-outline" size={14} color="rgba(255,255,255,0.4)" style={{ marginLeft: 4 }} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: selectedNode ? PANEL_HEIGHT + 60 : 60 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Header row ──────────────────────── */}
          {phase !== 'video' && (
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{phase === 'result' ? (locale === 'uk' ? 'Матриця Долі' : 'Destiny Matrix') : (locale === 'uk' ? 'Створити матрицю' : 'Create Matrix')}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
          )}

          {/* ─── Form Card ─────────────────────────── */}
          {phase === 'form' && (
          <View style={styles.formCard}>
            <LinearGradient
              colors={['rgba(139,92,246,0.14)', 'rgba(10,10,26,0.0)']}
              style={styles.formCardGrad}
            >
              {/* Name */}
              <Text style={styles.fieldLabel}>{locale === 'uk' ? "ІМ'Я" : 'NAME'}</Text>
              <View style={[styles.inputRow, errors.name && styles.inputError]}>
                <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: false })); }}
                  placeholder={locale === 'uk' ? "Наприклад: Моя матриця" : "E.g.: My matrix"}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="words"
                  maxLength={40}
                />
              </View>

              {/* Date */}
              <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>{locale === 'uk' ? 'ДАТА НАРОДЖЕННЯ' : 'DATE OF BIRTH'}</Text>
              <View style={styles.dateRow}>
                <View style={[styles.inputRow, { flex: 1 }, errors.day && styles.inputError]}>
                  <TextInput
                    style={[styles.input, styles.dateInput]}
                    value={day}
                    onChangeText={(v) => { const d = v.replace(/\D/g,'').slice(0,2); if (d.length===2 && parseInt(d)>31) { setDay('31'); } else if (d.length===2 && parseInt(d)<1) { setDay('01'); } else { setDay(d); } setErrors((e) => ({ ...e, day: false })); }}
                    placeholder={locale === 'uk' ? "ДД" : "DD"}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                </View>
                <Text style={styles.dateSep}>·</Text>
                <View style={[styles.inputRow, { flex: 1 }, errors.month && styles.inputError]}>
                  <TextInput
                    style={[styles.input, styles.dateInput]}
                    value={month}
                    onChangeText={(v) => { const m = v.replace(/\D/g,'').slice(0,2); if (m.length===2 && parseInt(m)>12) { setMonth('12'); } else if (m.length===2 && parseInt(m)<1) { setMonth('01'); } else { setMonth(m); } setErrors((e) => ({ ...e, month: false })); }}
                    placeholder={locale === 'uk' ? "ММ" : "MM"}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    textAlign="center"
                  />
                </View>
                <Text style={styles.dateSep}>·</Text>
                <View style={[styles.inputRow, { flex: 2 }, errors.year && styles.inputError]}>
                  <TextInput
                    style={[styles.input, styles.dateInput]}
                    value={year}
                    onChangeText={(v) => { const y = v.replace(/\D/g,'').slice(0,4); if (y.length===4 && parseInt(y)>2015) { setYear('2015'); } else if (y.length===4 && parseInt(y)<1920) { setYear('1920'); } else { setYear(y); } setErrors((e) => ({ ...e, year: false })); }}
                    placeholder={locale === 'uk' ? "РРРР" : "YYYY"}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                  />
                </View>
              </View>

              {/* Calculate button */}
              <TouchableOpacity onPress={handleCalculate} activeOpacity={0.85} style={styles.calcBtnWrap}>
                <LinearGradient
                  colors={['#4C1D95', '#7C3AED', '#8B5CF6']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.calcBtn}
                >
                  <Text style={styles.calcBtnText}>{locale === 'uk' ? 'РОЗРАХУВАТИ МАТРИЦЮ' : 'CALCULATE MATRIX'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
          )}

          {/* ─── Matrix Diagram Result ─────────────── */}
          {phase === 'result' && result && (
            <Animated.View
              style={[
                styles.resultWrap,
                {
                  opacity: resultAnim,
                  transform: [{
                    translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
                  }],
                },
              ]}
            >
              {/* Diagram header */}
              <View style={styles.resultHeader}>
                <View style={styles.resultTitleRow}>
                  <View style={styles.resultTitleDot} />
                  <Text style={styles.resultTitle}>
                    {name.trim() || (locale === 'uk' ? 'Матриця душі' : 'Soul Matrix')}
                  </Text>
                </View>
                <Text style={styles.resultDate}>{result.birthDate}</Text>
              </View>

              {/* Diagram card */}
              <View style={styles.diagramCard}>
                <LinearGradient
                  colors={['#1A1040', '#0E0830', '#0A0A1A']}
                  style={styles.diagramGradient}
                >
                  {/* Glow */}
                  <View style={styles.diagramGlow} />

                  {/* Hint */}
                  <View style={styles.hintRow}>
                    <Ionicons name="hand-left-outline" size={13} color="rgba(245,197,66,0.55)" />
                    <Text style={styles.hintText}>{locale === 'uk' ? 'Натисни на кулю для аналізу' : 'Tap any orb for analysis'}</Text>
                  </View>

                  <MatrixDiagram
                    data={result}
                    size={diagramSize}
                    selectedNode={selectedNode?.key}
                    onNodePress={handleNodePress}
                  />

                  {/* Key values */}
                  <View style={styles.keyVals}>
                    {[
                      { label: locale === 'uk' ? 'Особистість' : 'Personality', val: result.personality },
                      { label: locale === 'uk' ? 'Душа' : 'Soul',        val: result.soul },
                      { label: locale === 'uk' ? 'Доля' : 'Destiny',        val: result.destiny },
                      { label: locale === 'uk' ? 'Центр' : 'Center',       val: result.center },
                    ].map(({ label: l, val }) => {
                      const en = getEnergyById(val);
                      return (
                        <View key={l} style={styles.keyValItem}>
                          <Text style={styles.keyValNum}>{val}</Text>
                          <Text style={styles.keyValLabel}>{en?.name}</Text>
                          <Text style={styles.keyValPos}>{l}</Text>
                        </View>
                      );
                    })}
                  </View>
                </LinearGradient>
              </View>

              {/* ─── General Analysis ──────────────── */}
              <MatrixSummary result={result} />

              {/* Save button */}
              <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={styles.saveBtnWrap}>
                <LinearGradient
                  colors={['#C8901A', '#F5C542', '#C8901A']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  <Ionicons name="bookmark-outline" size={18} color="#1A0A00" />
                  <Text style={styles.saveBtnText}>{locale === 'uk' ? 'ЗБЕРЕГТИ ТА ВІДКРИТИ' : 'SAVE & OPEN'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Analysis Panel ──────────────────────── */}
      {selectedNode && energy && (
        <>
          <Animated.View
            style={[styles.overlay, {
              opacity: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
            }]}
            pointerEvents="box-none"
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closePanel} />
          </Animated.View>

          <Animated.View style={[styles.panel, { transform: [{ translateY: panelTranslate }] }]}>
            <LinearGradient
              colors={['#1E1350', '#130D3A', '#0D0825']}
              style={styles.panelGrad}
            >
              <View style={styles.panelHandle} />
              <TouchableOpacity style={styles.panelClose} onPress={closePanel}>
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>

              <Text style={styles.panelPosition}>{label}</Text>

              <View style={styles.panelHeader}>
                <LinearGradient
                  colors={['#C8901A', '#F5C542', '#C8901A']}
                  style={styles.panelEnergyBadge}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.panelEnergyNum}>{selectedNode.value}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.panelEnergyName}>{energy.name}</Text>
                  <Text style={styles.panelKeywords}>{energy.keywords.join(' · ')}</Text>
                </View>
                <Text style={styles.panelPlanet}>{energy.planet}</Text>
              </View>

              <View style={styles.panelTraits}>
                <View style={[styles.traitRow, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)' }]}>
                  <Ionicons name="add-circle-outline" size={15} color="#10B981" />
                  <Text style={[styles.traitText, { color: '#10B981' }]}>{energy.positive}</Text>
                </View>
                <View style={[styles.traitRow, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)' }]}>
                  <Ionicons name="remove-circle-outline" size={15} color="#EF4444" />
                  <Text style={[styles.traitText, { color: '#EF4444' }]}>{energy.negative}</Text>
                </View>
              </View>

              <View style={styles.panelAdvice}>
                <Ionicons name="bulb-outline" size={14} color={Colors.accent} />
                <Text style={styles.panelAdviceText}>{energy.advice}</Text>
              </View>
            </LinearGradient>
          </Animated.View>
        </>
      )}
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: '#0A0A1A',
  },
  createVideo: {
    width: '100%',
    height: '100%',
  },
  videoTextOverlay: {
    position: 'absolute',
    bottom: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  videoTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.md,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  videoSubtitle: {
    color: Colors.accent,
    fontSize: FontSize.xl,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    color: '#fff',
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Form ──────────────────────────────────────────────────
  formCard: {
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.22)',
    marginBottom: Spacing.lg,
  },
  formCardGrad: { padding: Spacing.lg },
  fieldLabel: {
    color: Colors.accent, fontSize: 10, fontWeight: '800',
    letterSpacing: 1.5, marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: Spacing.md, minHeight: 56,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: 14 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { textAlign: 'center', paddingVertical: 16 },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: 'rgba(239,68,68,0.08)' },
  dateSep: { color: Colors.textMuted, fontSize: FontSize.xl, fontWeight: '300' },
  calcBtnWrap: { borderRadius: BorderRadius.full, overflow: 'hidden', marginTop: Spacing.lg },
  calcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 52, borderRadius: BorderRadius.full,
  },
  calcBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 1 },

  // ── Result ────────────────────────────────────────────────
  resultWrap: { gap: Spacing.md },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  resultTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitleDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 6, elevation: 4,
  },
  resultTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  resultDate: { color: Colors.textMuted, fontSize: FontSize.sm },

  // ── Diagram Card ──────────────────────────────────────────
  diagramCard: {
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.30)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  diagramGradient: { alignItems: 'center', paddingVertical: Spacing.lg },
  diagramGlow: {
    position: 'absolute', width: 220, height: 220,
    top: '15%', left: '20%', borderRadius: 110,
    backgroundColor: 'rgba(139,92,246,0.07)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 80, elevation: 0,
  },
  hintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(245,197,66,0.08)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.18)',
  },
  hintText: { color: 'rgba(245,197,66,0.7)', fontSize: 11 },

  keyVals: {
    flexDirection: 'row', gap: 8,
    paddingTop: Spacing.sm, marginTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: Spacing.md, width: '100%',
  },
  keyValItem: { flex: 1, alignItems: 'center', gap: 2 },
  keyValNum: {
    color: Colors.accent, fontSize: FontSize.xl, fontWeight: '900',
    lineHeight: 26,
  },
  keyValLabel: { color: Colors.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  keyValPos: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },

  // ── Save button ───────────────────────────────────────────
  saveBtnWrap: { borderRadius: BorderRadius.full, overflow: 'hidden' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, height: 54, borderRadius: BorderRadius.full,
  },
  saveBtnText: { color: '#1A0A00', fontSize: FontSize.sm, fontWeight: '900', letterSpacing: 1 },

  // ── Overlay ───────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000', zIndex: 10,
  },

  // ── Analysis Panel ────────────────────────────────────────
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: PANEL_HEIGHT, zIndex: 20,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 20,
  },
  panelGrad: {
    flex: 1, padding: Spacing.lg, paddingTop: Spacing.md,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
    borderBottomWidth: 0,
  },
  panelHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center', marginBottom: Spacing.sm,
  },
  panelClose: {
    position: 'absolute', top: Spacing.md, right: Spacing.md,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  panelPosition: {
    color: Colors.accent, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: Spacing.sm,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, marginBottom: Spacing.sm,
  },
  panelEnergyBadge: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  panelEnergyNum: { color: '#1A0A00', fontSize: FontSize.xl, fontWeight: '900' },
  panelEnergyName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '800' },
  panelKeywords: { color: Colors.primaryLight, fontSize: FontSize.xs, marginTop: 2 },
  panelPlanet: {
    color: Colors.textMuted, fontSize: FontSize.xs,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  panelTraits: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  traitRow: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start',
    gap: 5, borderRadius: BorderRadius.md,
    borderWidth: 1, padding: 8,
  },
  traitText: { flex: 1, fontSize: 11, lineHeight: 15, fontWeight: '500' },
  panelAdvice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: 'rgba(245,197,66,0.06)',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.18)',
    padding: 8,
  },
  panelAdviceText: {
    flex: 1, color: Colors.textSecondary, fontSize: 12,
    lineHeight: 16, fontStyle: 'italic',
  },

  // ── Matrix Summary ────────────────────────────────────────
  summaryWrap: { gap: Spacing.sm },
  summaryTitle: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '800',
    marginBottom: 4, textAlign: 'center',
  },
  summaryCard: {
    borderRadius: BorderRadius.xl, overflow: 'hidden',
    borderWidth: 1,
  },
  summaryCardGrad: { padding: Spacing.lg, gap: Spacing.sm },
  summaryCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: 4,
  },
  summaryIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryCardLabel: {
    fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1.2,
  },
  summaryEnergyRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, marginBottom: 4,
  },
  summaryEnergyBadge: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryEnergyNum: { color: '#1A0A00', fontSize: FontSize.lg, fontWeight: '900' },
  summaryEnergyName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '800' },
  summaryKeywords: { fontSize: FontSize.xs, marginTop: 1 },
  summaryDescription: {
    color: Colors.textSecondary, fontSize: FontSize.sm,
    lineHeight: 20,
  },
  summaryAdvice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.md, padding: 8,
    marginTop: 4,
  },
  summaryAdviceText: {
    flex: 1, fontSize: FontSize.sm, lineHeight: 18,
    fontStyle: 'italic',
  },

  // ── Karma grid ────────────────────────────────────────────
  karmaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  karmaItem: {
    flex: 1, minWidth: '45%', borderRadius: BorderRadius.lg, overflow: 'hidden',
    borderWidth: 1,
  },
  karmaItemGrad: { padding: Spacing.lg, alignItems: 'center', gap: 6 },
  karmaIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  karmaLabel: {
    fontSize: 10, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center',
  },
  karmaNum: { fontSize: FontSize.xxl, fontWeight: '900' },
  karmaName: { fontSize: FontSize.sm, fontWeight: '700', textAlign: 'center' },
  karmaDesc: { fontSize: 11, textAlign: 'center', lineHeight: 16 },

  // ── Life timeline ─────────────────────────────────────────
  timelineWrap: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  timelineItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
  },
  timelineDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  timelineDotText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  timelineContent: { flex: 1 },
  timelineAge: { fontSize: 11, fontWeight: '800', marginBottom: 1 },
  timelineText: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },

  // ── Video overlay extras ──────────────────────────────────────
  videoMinimizeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 44,
    right: 20,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    zIndex: 10,
  },

  // ── Mini floating widget ──────────────────────────────────────
  miniWidget: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 16,
    zIndex: 200,
  },
  miniWidgetGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  miniOrb: {
    width: 40, height: 40, borderRadius: 20,
    overflow: 'hidden',
  },
  miniOrbInner: { flex: 1, borderRadius: 20 },
  miniTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  miniSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 2,
  },
});
