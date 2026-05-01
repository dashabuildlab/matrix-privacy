import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Animated, TouchableOpacity, Pressable, ActivityIndicator,
} from 'react-native';
import { DownloadAnalysisButton } from '@/components/matrix/DownloadAnalysisButton';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { getEnergyById } from '@/constants/energies';
import { useAppStore } from '@/stores/useAppStore';
import { MatrixDiagram } from '@/components/matrix/MatrixDiagram';
import { StarBackground } from '@/components/ui/StarBackground';
import { askClaude } from '@/lib/claude';
import { useI18n } from '@/lib/i18n';
import { useResponsive } from '@/hooks/useResponsive';
const PANEL_HEIGHT = 420;

// Maps node key → human label
const getNodeLabels = (locale: string): Record<string, string> => locale === 'uk' ? {
  center:    'Особистість',
  left_0:    'Дата народження (початок шляху)',
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
  left_0:    'Date of birth (beginning of path)',
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

interface SelectedNodeInfo {
  key: string;
  value: number;
}

// All matrix content is premium — no free fields
const FREE_FIELDS: string[] = [];

export default function MatrixDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale } = useI18n();
  const NODE_LABELS = getNodeLabels(locale);
  const langInstr = locale === 'uk' ? 'Відповідай УКРАЇНСЬКОЮ.' : 'Respond ONLY in English. Never use Russian.';
  const matrix = useAppStore((s) => s.savedMatrices.find((m) => m.id === id));
  const isPremium = useAppStore((s) => s.isPremium);

  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;
  const { diagramSize } = useResponsive();

  // AI-generated summary — cached inside the SavedMatrix object (no repeated Claude calls)
  const [aiSummary, setAiSummary] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const updateMatrixInterpretation = useAppStore((s) => s.updateMatrixInterpretation);

  useEffect(() => {
    if (!matrix) return;

    // ── Cache hit: interpretation already stored on the matrix and locale matches ──
    if (matrix.aiInterpretation && matrix.aiInterpretationLocale === locale) {
      try { setAiSummary(JSON.parse(matrix.aiInterpretation)); } catch {}
      return;
    }

    // ── Cache miss: generate via Claude, then persist on the matrix record ──
    const generate = async () => {
      setSummaryLoading(true);
      try {
        const { data: d } = matrix;
        const rows = getSummaryRows(locale).map((r) => {
          const val = (d as any)[r.field];
          const en = getEnergyById(val);
          return `${r.label}: ${val}. ${en?.name ?? ''} (${en?.arcana ?? ''})`;
        }).join('\n');

        const systemPrompt = `${locale === 'uk' ? 'Ти — AI Езотерик' : 'You are an AI Esoteric advisor'} у застосунку "Matrix of Destiny". ${langInstr}`;
        const userMsg = `Матриця долі для "${matrix.name}" (${matrix.birthDate}):\n${rows}\n\nДля кожної позиції напиши короткий персоналізований опис (1-2 речення) що означає ця енергія саме в цій позиції для цієї людини.\nВідповідь у форматі JSON: {"personality": "опис", "soul": "опис", "destiny": "опис", "spiritual": "опис", "material": "опис", "talentFromGod": "опис", "talentFromFamily": "опис", "purpose": "опис", "karmicTail": "опис", "parentKarma": "опис"}.\nТільки JSON, без markdown.`;

        const result = await askClaude(systemPrompt, [], userMsg);
        const parsed = JSON.parse(result.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        setAiSummary(parsed);
        // Save on the matrix object → persisted locally + synced to server on next push
        updateMatrixInterpretation(matrix.id, JSON.stringify(parsed), locale);
      } catch {
        // fallback: energy.positive shown by default
      }
      setSummaryLoading(false);
    };
    generate();
  // Re-run if matrix changes OR if user switches language (locale mismatch → regenerate)
  }, [matrix?.id, locale]);

  const openPanel = useCallback((info: SelectedNodeInfo) => {
    setSelectedNode(info);
    Animated.spring(panelAnim, {
      toValue: 1,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [panelAnim]);

  const closePanel = useCallback(() => {
    Animated.timing(panelAnim, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start(() => setSelectedNode(null));
  }, [panelAnim]);

  const handleNodePress = useCallback((key: string, value: number) => {
    // Check if this node's field is free
    const fieldForKey = getPositionRows(locale).find(r => r.field === key)?.field || key;
    const isFreeNode = FREE_FIELDS.includes(fieldForKey) || fieldForKey === 'center';
    if (!isFreeNode && !isPremium) {
      router.push('/paywall' as any);
      return;
    }
    if (selectedNode?.key === key) {
      closePanel();
    } else {
      openPanel({ key, value });
    }
  }, [selectedNode, openPanel, closePanel, isPremium]);

  if (!matrix) {
    return (
      <View style={styles.notFoundContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.notFound}>{locale === 'uk' ? 'Матрицю не знайдено' : 'Matrix not found'}</Text>
      </View>
    );
  }

  const { data } = matrix;
  const energy = selectedNode ? getEnergyById(selectedNode.value) : null;
  const label  = selectedNode ? (NODE_LABELS[selectedNode.key] ?? selectedNode.key) : '';

  const panelTranslate = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [PANEL_HEIGHT, 0],
  });
  const overlayOpacity = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

  return (
    <StarBackground style={styles.root}>
      {/* ─── Header ─────────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(139,92,246,0.18)', 'transparent']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{matrix.name}</Text>
          <Text style={styles.headerDate}>{matrix.birthDate}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            const personality = getEnergyById(data.personality);
            const soul = getEnergyById(data.soul);
            const destiny = getEnergyById(data.destiny);
            const spiritual = getEnergyById(data.spiritual);
            const material = getEnergyById(data.material);
            const talentGod = getEnergyById(data.talentFromGod);
            const talentFamily = getEnergyById(data.talentFromFamily);
            const purpose = getEnergyById(data.purpose);
            const karmic = getEnergyById(data.karmicTail);
            const parentKarma = getEnergyById(data.parentKarma);
            const q = locale === 'uk'
              ? `Проаналізуй детально матрицю долі для "${matrix.name}" (дата народження: ${matrix.birthDate}):\n\n` +
                `• Особистість: ${data.personality}. ${personality?.name} — ${personality?.positive}\n` +
                `• Душа: ${data.soul}. ${soul?.name} — ${soul?.positive}\n` +
                `• Доля: ${data.destiny}. ${destiny?.name} — ${destiny?.positive}\n` +
                `• Духовне: ${data.spiritual}. ${spiritual?.name} — ${spiritual?.positive}\n` +
                `• Матеріальне: ${data.material}. ${material?.name} — ${material?.positive}\n` +
                `• Талант від Бога: ${data.talentFromGod}. ${talentGod?.name}\n` +
                `• Талант від Роду: ${data.talentFromFamily}. ${talentFamily?.name}\n` +
                `• Призначення: ${data.purpose}. ${purpose?.name}\n` +
                `• Кармічний хвіст: ${data.karmicTail}. ${karmic?.name}\n` +
                `• Батьківська карма: ${data.parentKarma}. ${parentKarma?.name}\n\n` +
                `Дай загальний підсумок матриці: ключові сильні сторони, виклики, призначення та поради.`
              : `Analyze in detail the destiny matrix for "${matrix.name}" (birth date: ${matrix.birthDate}):\n\n` +
                `• Personality: ${data.personality}. ${personality?.name} — ${personality?.positive}\n` +
                `• Soul: ${data.soul}. ${soul?.name} — ${soul?.positive}\n` +
                `• Destiny: ${data.destiny}. ${destiny?.name} — ${destiny?.positive}\n` +
                `• Spiritual: ${data.spiritual}. ${spiritual?.name} — ${spiritual?.positive}\n` +
                `• Material: ${data.material}. ${material?.name} — ${material?.positive}\n` +
                `• God-given Talent: ${data.talentFromGod}. ${talentGod?.name}\n` +
                `• Family Talent: ${data.talentFromFamily}. ${talentFamily?.name}\n` +
                `• Purpose: ${data.purpose}. ${purpose?.name}\n` +
                `• Karmic Tail: ${data.karmicTail}. ${karmic?.name}\n` +
                `• Parental Karma: ${data.parentKarma}. ${parentKarma?.name}\n\n` +
                `Provide a general summary of the matrix: key strengths, challenges, purpose, and advice.`;
            router.push({ pathname: '/ai/chat', params: { initialQuestion: q } } as any);
          }}
          style={styles.aiBtn}
        >
          <LinearGradient
            colors={['rgba(139,92,246,0.4)', 'rgba(91,33,182,0.4)']}
            style={styles.aiBtnGrad}
          >
            <Ionicons name="sparkles" size={16} color={Colors.accent} />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: selectedNode ? PANEL_HEIGHT + 32 : 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Diagram Card ───────────────────────────── */}
        <View style={styles.diagramCard}>
          <LinearGradient
            colors={['#1A1040', '#0D0825', '#0A0A1A']}
            style={styles.diagramGradient}
          >
            {/* Glow effect */}
            <View style={styles.diagramGlow} />

            {/* Hint */}
            <View style={styles.hintRow}>
              <Ionicons name="hand-left-outline" size={13} color="rgba(245,197,66,0.55)" />
              <Text style={styles.hintText}>{locale === 'uk' ? 'Натисни на будь-яку кулю для аналізу' : 'Tap any orb for analysis'}</Text>
            </View>

            <MatrixDiagram
              data={data}
              size={diagramSize}
              selectedNode={selectedNode?.key}
              onNodePress={handleNodePress}
            />

            {/* Legend */}
            <View style={styles.legend}>
              <LegendDot color="#7C3AED" label={locale === 'uk' ? "Духовне" : "Spiritual"} />
              <LegendDot color="#2563EB" label={locale === 'uk' ? "Доля" : "Destiny"} />
              <LegendDot color="#D97706" label={locale === 'uk' ? "Карма" : "Karma"} />
              <LegendDot color="#0D9488" label={locale === 'uk' ? "Таланти" : "Talents"} />
              <LegendDot color="#F59E0B" label={locale === 'uk' ? "Центр" : "Center"} />
            </View>
          </LinearGradient>
        </View>

        {/* ─── How it works ──────────────────────────── */}
        <View style={styles.methodCard}>
          <View style={styles.methodHeader}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primaryLight} />
            <Text style={styles.methodTitle}>{locale === 'uk' ? 'Як створена матриця' : 'How the matrix was created'}</Text>
          </View>
          <Text style={styles.methodText}>
            {locale === 'uk'
              ? 'Матриця Долі розрахована на основі твоєї дати народження. День, місяць і рік перетворюються на числа від 1 до 22, кожне з яких відповідає одному з 22 архетипів-енергій. Ці числа формують 14 позицій матриці — від особистості та душі до кармічних уроків і талантів. Кожна позиція розкриває окремий аспект твого життєвого шляху.'
              : 'Your Destiny Matrix is calculated based on your date of birth. The day, month and year are transformed into numbers from 1 to 22, each corresponding to one of 22 archetype-energies. These numbers form 14 matrix positions — from personality and soul to karmic lessons and talents. Each position reveals a different aspect of your life path.'}
          </Text>
        </View>

        {/* ─── Download Full Analysis ────────────────── */}
        <DownloadAnalysisButton
          matrixData={data}
          name={matrix.name}
          birthDate={matrix.birthDate}
          locale={locale}
          isPremium={isPremium}
        />

      </ScrollView>

      {/* ─── Overlay dim ───────────────────────────────── */}
      {selectedNode && (
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable style={[StyleSheet.absoluteFill, { bottom: PANEL_HEIGHT }]} onPress={closePanel} />
        </Animated.View>
      )}

      {/* ─── Analysis Panel ────────────────────────────── */}
      {selectedNode && energy && (
        <Animated.View
          style={[
            styles.panel,
            { transform: [{ translateY: panelTranslate }] },
          ]}
        >
          <LinearGradient
            colors={['#1E1350', '#130D3A', '#0D0825']}
            style={styles.panelGrad}
          >
            {/* Drag handle */}
            <View style={styles.panelHandle} />

            {/* Node label */}
            <Text style={styles.panelPosition}>{label}</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Energy header */}
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

              {/* Traits */}
              <View style={styles.panelTraits}>
                <View style={[styles.traitRow, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.25)' }]}>
                  <Ionicons name="add-circle-outline" size={15} color="#10B981" />
                  <Text style={[styles.traitText, { color: '#10B981' }]}>{energy.positive}</Text>
                </View>
                <View style={[styles.traitRow, { backgroundColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.25)' }]}>
                  <Ionicons name="remove-circle-outline" size={15} color="#FB923C" />
                  <Text style={[styles.traitText, { color: '#FB923C' }]}>{energy.negative}</Text>
                </View>
              </View>

              {/* Advice */}
              <View style={styles.panelAdvice}>
                <Ionicons name="bulb-outline" size={14} color={Colors.accent} />
                <Text style={styles.panelAdviceText}>{energy.advice}</Text>
              </View>
            </ScrollView>
          </LinearGradient>

          {/* Close — outside LinearGradient to avoid touch clipping */}
          <TouchableOpacity
            style={styles.panelClose}
            onPress={closePanel}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </StarBackground>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const getSummaryRows = (locale: string) => locale === 'uk' ? [
  { field: 'personality',     label: 'Особистість',      icon: 'person-outline',   color: '#F59E0B' },
  { field: 'soul',            label: 'Душа',              icon: 'heart-outline',    color: '#818CF8' },
  { field: 'destiny',         label: 'Доля',              icon: 'compass-outline',  color: '#2563EB' },
  { field: 'spiritual',       label: 'Духовне',           icon: 'flame-outline',    color: '#7C3AED' },
  { field: 'material',        label: 'Матеріальне',       icon: 'diamond-outline',  color: '#F97316' },
  { field: 'talentFromGod',   label: 'Талант від Бога',   icon: 'star-outline',     color: '#0D9488' },
  { field: 'talentFromFamily',label: 'Талант від Роду',   icon: 'people-outline',   color: '#0D9488' },
  { field: 'purpose',         label: 'Призначення',       icon: 'rocket-outline',   color: '#0D9488' },
  { field: 'karmicTail',      label: 'Кармічний хвіст',  icon: 'infinite-outline',  color: '#D97706' },
  { field: 'parentKarma',     label: 'Батьківська карма', icon: 'git-branch-outline',color: '#D97706' },
] : [
  { field: 'personality',     label: 'Personality',       icon: 'person-outline',   color: '#F59E0B' },
  { field: 'soul',            label: 'Soul',               icon: 'heart-outline',    color: '#818CF8' },
  { field: 'destiny',         label: 'Destiny',            icon: 'compass-outline',  color: '#2563EB' },
  { field: 'spiritual',       label: 'Spiritual',          icon: 'flame-outline',    color: '#7C3AED' },
  { field: 'material',        label: 'Material',           icon: 'diamond-outline',  color: '#F97316' },
  { field: 'talentFromGod',   label: 'God-given Talent',   icon: 'star-outline',     color: '#0D9488' },
  { field: 'talentFromFamily',label: 'Family Talent',      icon: 'people-outline',   color: '#0D9488' },
  { field: 'purpose',         label: 'Purpose',            icon: 'rocket-outline',   color: '#0D9488' },
  { field: 'karmicTail',      label: 'Karmic Tail',       icon: 'infinite-outline',  color: '#D97706' },
  { field: 'parentKarma',     label: 'Parental Karma',    icon: 'git-branch-outline',color: '#D97706' },
];

const getPositionRows = (locale: string) => locale === 'uk' ? [
  { field: 'personality',    label: 'Особистість',       color: '#F59E0B' },
  { field: 'soul',           label: 'Душа',               color: '#818CF8' },
  { field: 'destiny',        label: 'Доля',               color: '#2563EB' },
  { field: 'spiritual',      label: 'Духовне',            color: '#7C3AED' },
  { field: 'material',       label: 'Матеріальне',        color: '#DC2626' },
  { field: 'talentFromGod',  label: 'Талант від Бога',    color: '#0D9488' },
  { field: 'talentFromFamily',label: 'Талант від Роду',   color: '#0D9488' },
  { field: 'purpose',        label: 'Призначення',        color: '#0D9488' },
  { field: 'karmicTail',     label: 'Кармічний хвіст',   color: '#D97706' },
  { field: 'parentKarma',    label: 'Батьківська карма',  color: '#D97706' },
  { field: 'maleFemale',     label: 'Чоловіче / Жіноче', color: '#EC4899' },
  { field: 'center',         label: 'Центр',              color: '#F59E0B' },
] : [
  { field: 'personality',    label: 'Personality',        color: '#F59E0B' },
  { field: 'soul',           label: 'Soul',                color: '#818CF8' },
  { field: 'destiny',        label: 'Destiny',             color: '#2563EB' },
  { field: 'spiritual',      label: 'Spiritual',           color: '#7C3AED' },
  { field: 'material',       label: 'Material',            color: '#DC2626' },
  { field: 'talentFromGod',  label: 'God-given Talent',    color: '#0D9488' },
  { field: 'talentFromFamily',label: 'Family Talent',      color: '#0D9488' },
  { field: 'purpose',        label: 'Purpose',             color: '#0D9488' },
  { field: 'karmicTail',     label: 'Karmic Tail',        color: '#D97706' },
  { field: 'parentKarma',    label: 'Parental Karma',     color: '#D97706' },
  { field: 'maleFemale',     label: 'Male / Female',      color: '#EC4899' },
  { field: 'center',         label: 'Center',              color: '#F59E0B' },
];

const styles = StyleSheet.create({
  root: { flex: 1 },

  notFoundContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bg, gap: Spacing.sm,
  },
  notFound: { color: Colors.textMuted, fontSize: FontSize.lg },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56, paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  headerDate: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 1 },
  aiBtn: { borderRadius: 12, overflow: 'hidden' },
  aiBtnGrad: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.3)',
  },

  // ── Scroll ────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },

  // ── Diagram Card ──────────────────────────────────────────
  diagramCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  diagramGradient: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  diagramGlow: {
    position: 'absolute',
    width: 200, height: 200,
    top: '20%', left: '25%',
    borderRadius: 100,
    backgroundColor: 'rgba(139,92,246,0.08)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 60, elevation: 0,
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

  legend: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: 8,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
    width: '100%',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },

  // ── Summary ──────────────────────────────────────────────
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  summaryLabel: {
    color: Colors.textMuted, fontSize: 10, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  summaryValue: {
    color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginTop: 1,
  },
  summaryDesc: {
    color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 17, marginTop: 2,
  },
  summaryLocked: {
    color: Colors.accent, fontSize: FontSize.xs, marginTop: 2, fontWeight: '600',
  },

  // ── Method card ──────────────────────────────────────────
  methodCard: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  methodTitle: {
    color: Colors.primaryLight,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  methodText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },

  // ── Positions Grid ────────────────────────────────────────
  sectionTitle: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '700',
    marginBottom: Spacing.md,
  },
  posGrid: { gap: 8 },
  posChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.sm,
  },
  posChipSelected: {
    borderColor: 'rgba(245,197,66,0.5)',
    backgroundColor: 'rgba(245,197,66,0.07)',
  },
  posChipDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  posChipLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  posChipVal: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginTop: 1 },

  // ── Overlay ───────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 10,
  },

  // ── Analysis Panel ─────────────────────────────────────────
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: PANEL_HEIGHT,
    zIndex: 20,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 30,
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
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  panelEnergyNum: {
    color: '#1A0A00', fontSize: FontSize.xl, fontWeight: '900',
  },
  panelEnergyName: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '800',
  },
  panelKeywords: {
    color: Colors.primaryLight, fontSize: FontSize.xs, marginTop: 2,
  },
  panelPlanet: {
    color: Colors.textMuted, fontSize: FontSize.xs,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  panelTraits: {
    flexDirection: 'row', gap: 8, marginBottom: 8,
  },
  traitRow: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start',
    gap: 5, borderRadius: BorderRadius.md,
    borderWidth: 1, padding: 8,
  },
  traitText: {
    flex: 1, fontSize: 11, lineHeight: 15, fontWeight: '500',
  },
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
});
