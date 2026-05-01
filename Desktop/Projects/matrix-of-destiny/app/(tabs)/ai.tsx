import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { StarBackground } from '@/components/ui/StarBackground';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { getLastTabPress } from '@/lib/tabState';
import { useResponsive } from '@/hooks/useResponsive';

/** AI/chat screens benefit from more horizontal space than content screens */
const MAX_CHAT_WIDTH = 860;
import { getSessionsSync, type SessionRow } from '@/lib/chatDb';

const STARTER_ICONS = [
  'sunny-outline' as const,
  'flash-outline' as const,
  'heart-outline' as const,
  'briefcase-outline' as const,
  'leaf-outline' as const,
  'compass-outline' as const,
];

const SCAN_STEPS_UK = [
  { icon: 'camera-outline' as const, label: 'Фото' },
  { icon: 'analytics-outline' as const, label: 'Аналіз' },
  { icon: 'layers-outline' as const, label: 'Аркан' },
  { icon: 'sparkles-outline' as const, label: 'Вище Я' },
];
const SCAN_STEPS_EN = [
  { icon: 'camera-outline' as const, label: 'Photo' },
  { icon: 'analytics-outline' as const, label: 'Analysis' },
  { icon: 'layers-outline' as const, label: 'Arcana' },
  { icon: 'sparkles-outline' as const, label: 'Higher Self' },
];

export default function AIScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { t, locale } = useI18n();
  const isUk = locale === 'uk';

  const starterQuestions = t.aiQuestions.map((q, i) => ({
    icon: STARTER_ICONS[i],
    text: q.q,
  }));
  const tokens = useAppStore((s) => s.tokens);
  const isPremium = useAppStore((s) => s.isPremium);
  const [chatSessions, setChatSessions] = useState<SessionRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { isWide } = useResponsive();

  useEffect(() => { setChatSessions(getSessionsSync(10)); }, []);
  const wide = isWide;

  const pendingChatNav = useAppStore((s) => s.pendingChatNav);
  const setPendingChatNav = useAppStore((s) => s.setPendingChatNav);

  useFocusEffect(
    useCallback(() => {
      setChatSessions(getSessionsSync(10));
      if (pendingChatNav) {
        const { question, title } = pendingChatNav;
        setPendingChatNav(null);
        useAppStore.setState({ activeSessionId: null });
        router.push({ pathname: '/ai/chat', params: { initialQuestion: question, sessionTitle: title } } as any);
        return;
      }
      const lastTabPress = getLastTabPress();
      if (lastTabPress?.tab === 'ai' && Date.now() - lastTabPress.ts < 500) {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    }, [pendingChatNav])
  );

  const openChatWithQuestion = (question: string) => {
    if (!isPremium && tokens < 1) { router.push('/paywall' as any); return; }
    useAppStore.setState({ activeSessionId: null });
    router.push({ pathname: '/ai/chat', params: { initialQuestion: question, withCards: '1' } } as any);
  };

  const scanSteps = isUk ? SCAN_STEPS_UK : SCAN_STEPS_EN;

  return (
    <StarBackground style={styles.root}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, wide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Хедер сторінки ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{isUk ? 'AI Магія' : 'AI Magic'}</Text>
          <Text style={styles.pageSub}>
            {isUk ? 'Пізнай себе за допомогою штучного інтелекту' : 'Discover yourself with artificial intelligence'}
          </Text>
        </View>

        {/* ── Hero: AI Scan ── */}
        <TouchableOpacity activeOpacity={0.88} onPress={() => router.push('/ai-scan' as any)}>
          <LinearGradient
            colors={['rgba(15,5,40,0.98)', 'rgba(70,20,160,0.97)', 'rgba(40,10,90,0.98)']}
            style={styles.scanHero}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            {/* декоративні оби */}
            <View style={styles.scanOrbTop} />
            <View style={styles.scanOrbBottom} />

            {/* іконка + заголовок */}
            <View style={styles.scanHeroTop}>
              <LinearGradient
                colors={[Colors.accentDark, Colors.accent]}
                style={styles.scanHeroIcon}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Ionicons name="scan-outline" size={30} color="#1A0A00" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.scanHeroTitle}>
                  {isUk ? 'AI-сканування Долі' : 'Destiny AI Scan'}
                </Text>
                <Text style={styles.scanHeroSub}>
                  {isUk ? 'Відкрий свій архетип Вищого Я' : 'Reveal your Higher Self archetype'}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={26} color={Colors.accent} />
            </View>

            {/* опис */}
            <Text style={styles.scanHeroDesc}>
              {isUk
                ? 'AI-провідник аналізує риси твого обличчя, розраховує Аркан Душі за датою народження і складає персональний духовний портрет — хто ти є насправді.'
                : 'AI guide analyzes your facial features, calculates your Soul Arcana by birth date, and creates a personal spiritual portrait — who you truly are.'}
            </Text>

            {/* кроки */}
            <View style={styles.scanStepsRow}>
              {scanSteps.map((step, idx) => (
                <React.Fragment key={step.label}>
                  <View style={styles.scanStep}>
                    <View style={styles.scanStepIcon}>
                      <Ionicons name={step.icon} size={15} color={Colors.accent} />
                    </View>
                    <Text style={styles.scanStepLabel}>{step.label}</Text>
                  </View>
                  {idx < scanSteps.length - 1 && (
                    <Ionicons name="chevron-forward" size={12} color="rgba(245,197,66,0.35)" style={{ marginTop: 2 }} />
                  )}
                </React.Fragment>
              ))}
            </View>

            {/* CTA */}
            <LinearGradient
              colors={[Colors.accentDark, Colors.accent]}
              style={styles.scanCtaBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name="camera-outline" size={16} color="#1A0A00" />
              <Text style={styles.scanCtaText}>
                {isUk ? 'Завантажити фото' : 'Upload photo'}
              </Text>
            </LinearGradient>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── AI Чат ── */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => { if (!isPremium && tokens < 1) { router.push('/paywall' as any); return; } useAppStore.setState({ activeSessionId: null }); router.push('/ai/chat' as any); }}
        >
          <LinearGradient
            colors={['rgba(45,15,100,0.97)', 'rgba(109,40,217,0.97)']}
            style={styles.chatCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.chatOrb} />

            {/* верхній рядок: іконка + заголовок + стрілка */}
            <View style={styles.chatCardTop}>
              <View style={styles.chatIconWrap}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color="#DDD6FE" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.chatLabel}>{t.ui.aiEsoteric}</Text>
                <Text style={styles.chatTitle}>{t.ui.askAi}</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={26} color="rgba(221,214,254,0.8)" />
            </View>

            {/* опис */}
            <Text style={styles.chatDesc}>
              {isUk
                ? 'Це AI-езотерик і провідник, навчений на основі вашої Матриці Долі. Задавайте будь-які запитання — про характер, стосунки, призначення, карму — і отримуйте персональні поради на основі вашого унікального розрахунку.'
                : 'This is an AI esoteric guide trained on your Destiny Matrix. Ask any question — about character, relationships, purpose, karma — and receive personal advice based on your unique reading.'}
            </Text>

            {/* теги тем */}
            <View style={styles.chatTags}>
              {(isUk
                ? ['💫 Призначення', '❤️ Стосунки', '🔮 Карма', '💼 Кар\'єра']
                : ['💫 Purpose', '❤️ Relationships', '🔮 Karma', '💼 Career']
              ).map((tag) => (
                <View key={tag} style={styles.chatTag}>
                  <Text style={styles.chatTagText}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* статус доступу */}
            <Text style={styles.chatSub}>
              {isPremium
                ? (isUk ? '✨ Безліміт · Premium' : '✨ Unlimited · Premium')
                : tokens > 0
                  ? (isUk ? `💎 ${tokens} кристалів · 1 за повідомлення` : `💎 ${tokens} crystals · 1 per message`)
                  : (isUk ? '🔒 Потрібен Premium або кристали' : '🔒 Premium or crystals required')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Стартові питання ── */}
        <Text style={styles.sectionTitle}>{t.ui.standardQuestions}</Text>
        <View style={[styles.questionsGrid, wide && styles.questionsGridWide]}>
          {starterQuestions.map((q) => (
            <TouchableOpacity
              key={q.text}
              style={[styles.questionCard, wide && styles.questionCardWide]}
              activeOpacity={0.75}
              onPress={() => openChatWithQuestion(q.text)}
            >
              <View style={styles.questionIcon}>
                <Ionicons name={q.icon} size={16} color={Colors.primary} />
              </View>
              <Text style={styles.questionText}>{q.text}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Історія чатів (згортається) ── */}
        <View style={styles.historySection}>
          <TouchableOpacity
            style={styles.historySectionHeader}
            activeOpacity={0.7}
            onPress={() => setHistoryOpen((v) => !v)}
          >
            <Text style={[styles.sectionTitle, { marginTop: 0, flex: 1 }]}>{t.ui.chatHistoryTitle}</Text>
            {chatSessions.length > 0 && (
              <Text style={styles.historyCount}>{chatSessions.length}</Text>
            )}
            <Ionicons
              name={historyOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {historyOpen && (
            <>
              {chatSessions.length === 0 ? (
                <Card style={styles.emptyHistory}>
                  <Ionicons name="chatbubbles-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.emptyHistoryText}>{t.ui.noChatsYet}</Text>
                </Card>
              ) : (
                chatSessions.slice(0, 3).map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    activeOpacity={0.75}
                    onPress={() => { if (!isPremium && tokens < 1) { router.push('/paywall' as any); return; } useAppStore.getState().setActiveSession(session.id); router.push('/ai/chat' as any); }}
                  >
                    <Card style={styles.historyItem}>
                      <View style={styles.historyItemIcon}>
                        <Ionicons
                          name={session.context === 'matrix' ? 'layers-outline' : 'chatbubble-outline'}
                          size={18}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.historyItemTitle} numberOfLines={1}>{session.title}</Text>
                        <Text style={styles.historyItemSub}>
                          {session.msg_count} {t.ui.messages} · {new Date(session.created_at).toLocaleDateString('uk-UA')}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                    </Card>
                  </TouchableOpacity>
                ))
              )}

              {chatSessions.length > 3 && (
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/ai/history' as any)}>
                  <Card style={styles.viewAllCard}>
                    <Text style={styles.viewAllCardText}>{t.ui.viewAllChats(chatSessions.length)}</Text>
                  </Card>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </StarBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: 32 },
  contentWide: { paddingHorizontal: Spacing.xl, maxWidth: MAX_CHAT_WIDTH, alignSelf: 'center', width: '100%' },

  // ── Page header ──
  pageHeader: { marginBottom: Spacing.lg },
  pageTitle: { color: Colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSub: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 4 },

  // ── AI Scan Hero ──
  scanHero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1.5, borderColor: 'rgba(245,197,66,0.3)',
    overflow: 'hidden', position: 'relative',
    gap: Spacing.md,
  },
  scanOrbTop: {
    position: 'absolute', top: -40, right: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(245,197,66,0.08)',
  },
  scanOrbBottom: {
    position: 'absolute', bottom: -30, left: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(139,92,246,0.1)',
  },
  scanHeroTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  scanHeroIcon: {
    width: 56, height: 56, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  scanHeroTitle: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  scanHeroSub: { color: Colors.accent, fontSize: FontSize.xs, marginTop: 2, fontWeight: '600' },
  scanHeroDesc: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: FontSize.sm,
    lineHeight: 20,
  },

  // steps row
  scanStepsRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  scanStep: { alignItems: 'center', flex: 1, gap: 4 },
  scanStepIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(245,197,66,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanStepLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' },

  // CTA button
  scanCtaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
  },
  scanCtaText: { color: '#1A0A00', fontSize: FontSize.sm, fontWeight: '800' },

  // ── AI Chat card ──
  chatCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg,
    marginBottom: Spacing.lg, gap: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
    overflow: 'hidden', position: 'relative',
  },
  chatOrb: {
    position: 'absolute', top: -30, right: -30,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  chatCardTop: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
  },
  chatIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(167,139,250,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  chatLabel: { color: 'rgba(167,139,250,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  chatTitle: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  chatDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  chatTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chatTag: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
  },
  chatTagText: { color: 'rgba(221,214,254,0.8)', fontSize: 11, fontWeight: '600' },
  chatSub: { color: 'rgba(255,255,255,0.4)', fontSize: FontSize.xs },

  // ── Section title ──
  sectionTitle: {
    color: Colors.text, fontSize: FontSize.lg, fontWeight: '700',
    marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },

  // ── Questions grid ──
  questionsGrid: { gap: Spacing.sm, marginBottom: Spacing.lg },
  questionsGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  questionCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  questionCardWide: { width: '48%', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg },
  questionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  questionText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },

  // ── History ──
  historySection: { marginTop: Spacing.xs },
  historySectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs, marginBottom: Spacing.xs,
  },
  historyCount: {
    color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: BorderRadius.full,
  },
  viewAllBtn: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  emptyHistory: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  emptyHistoryText: { color: Colors.textMuted, fontSize: FontSize.sm },
  historyItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  historyItemIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  historyItemTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  historyItemSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  viewAllCard: { alignItems: 'center', paddingVertical: Spacing.md },
  viewAllCardText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
});
