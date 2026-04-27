import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { getSessionsSync, type SessionRow } from '@/lib/chatDb';

export default function ChatHistoryScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [chatSessions, setChatSessions] = useState<SessionRow[]>([]);

  const loadSessions = useCallback(() => {
    setChatSessions(getSessionsSync(50));
  }, []);

  useEffect(() => { loadSessions(); }, []);

  // Refresh when navigating back to this screen
  useFocusEffect(useCallback(() => { loadSessions(); }, []));

  const isUk = locale === 'uk';
  const CONTEXT_ICONS: Record<string, { icon: 'grid-outline' | 'chatbubble-ellipses-outline' | 'sunny-outline'; color: string; label: string }> = {
    matrix:          { icon: 'grid-outline',                color: '#F59E0B', label: t.aiHistory.matrix },
    'destiny-matrix':{ icon: 'grid-outline',                color: '#F59E0B', label: t.aiHistory.matrix },
    'daily-matrix':  { icon: 'sunny-outline',               color: '#F97316', label: isUk ? 'Матриця дня' : 'Daily Matrix' },
    general:         { icon: 'chatbubble-ellipses-outline', color: '#10B981', label: t.aiHistory.general },
  };

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t.aiHistory.today;
    if (diffDays === 1) return t.aiHistory.yesterday;
    if (diffDays < 7) return t.aiHistory.daysAgo(diffDays);
    return d.toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'short' });
  }

  const todayDate = new Date().toISOString().split('T')[0];

  const openSession = (session: SessionRow) => {
    // Block continuing daily-matrix chats from previous days
    if (session.context === 'daily-matrix') {
      const sessionDate = session.created_at.split('T')[0];
      if (sessionDate !== todayDate) {
        // Read-only — show messages but don't allow new ones
        Alert.alert(
          isUk ? 'Чат завершено' : 'Chat ended',
          isUk ? 'Цей чат був прив\'язаний до матриці дня та вже недоступний для продовження. Ви можете переглянути історію повідомлень.' : 'This chat was tied to a daily matrix and can no longer be continued. You can view the message history.',
          [
            { text: isUk ? 'Переглянути' : 'View', onPress: () => { useAppStore.getState().setActiveSession(session.id); router.push('/ai/chat' as any); } },
            { text: isUk ? 'Закрити' : 'Close', style: 'cancel' },
          ]
        );
        return;
      }
    }
    useAppStore.getState().setActiveSession(session.id);
    router.push('/ai/chat' as any);
  };

  if (chatSessions.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>{t.aiHistory.noChats}</Text>
        <Text style={styles.emptyHint}>{t.aiHistory.noChatsHint}</Text>
        <TouchableOpacity
          style={styles.startBtn}
          activeOpacity={0.8}
          onPress={() => router.push('/ai/chat')}
        >
          <Ionicons name="add" size={18} color={Colors.bg} />
          <Text style={styles.startBtnText}>{t.aiHistory.newChat}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.countLabel}>{locale === 'uk' ? `${chatSessions.length} розмов збережено` : `${chatSessions.length} chats saved`}</Text>

      {chatSessions.map((session) => {
        const ctx = CONTEXT_ICONS[session.context] ?? CONTEXT_ICONS.general;
        const count = session.msg_count;
        const isDailyExpired = session.context === 'daily-matrix' && session.created_at.split('T')[0] !== todayDate;

        return (
          <TouchableOpacity key={session.id} activeOpacity={0.75} onPress={() => openSession(session)} style={isDailyExpired ? { opacity: 0.6 } : undefined}>
            <Card style={styles.item}>
              <View style={[styles.iconBox, { backgroundColor: ctx.color + '22' }]}>
                <Ionicons name={ctx.icon} size={22} color={ctx.color} />
              </View>

              <View style={styles.info}>
                <View style={styles.topRow}>
                  <Text style={styles.title} numberOfLines={1}>{session.title}</Text>
                  <Text style={styles.date}>{formatDate(session.created_at)}</Text>
                </View>
                <View style={styles.bottomRow}>
                  <View style={[styles.ctxBadge, { backgroundColor: ctx.color + '18' }]}>
                    <Text style={[styles.ctxText, { color: ctx.color }]}>{ctx.label}</Text>
                  </View>
                  <Text style={styles.lastMsg} numberOfLines={1}>
                    {session.last_message ?? (locale === 'uk' ? 'Порожній чат' : 'Empty chat')}
                  </Text>
                </View>
                <Text style={styles.msgCount}>
                  {count} {locale === 'uk' ? (count === 1 ? 'повідомлення' : 'повідомлень') : (count === 1 ? 'message' : 'messages')}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Card>
          </TouchableOpacity>
        );
      })}

      {/* New Chat button at the bottom */}
      <TouchableOpacity
        style={styles.newChatBtn}
        activeOpacity={0.8}
        onPress={() => router.push('/ai/chat')}
      >
        <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
        <Text style={styles.newChatText}>{t.aiHistory.newChat}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 20 },

  countLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    flex: 1,
  },
  date: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 3,
  },
  ctxBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    flexShrink: 0,
  },
  ctxText: {
    fontSize: 10,
    fontWeight: '700',
  },
  lastMsg: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    flex: 1,
  },
  msgCount: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },

  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.accentMuted,
    borderStyle: 'dashed',
  },
  newChatText: {
    color: Colors.accent,
    fontSize: FontSize.md,
    fontWeight: '600',
  },

  // Empty state
  empty: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(139,92,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  emptyHint: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  startBtnText: {
    color: Colors.bg,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
