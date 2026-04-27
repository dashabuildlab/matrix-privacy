import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useI18n } from '@/lib/i18n';
import { trackFeatureUsed, FEATURES } from '@/lib/analytics';

type TabKey = 'dailyMatrix' | 'matrices';

// Track history view on import
setTimeout(() => trackFeatureUsed(FEATURES.HISTORY, 'profile'), 0);

export default function HistoryScreen() {
  const { t, locale } = useI18n();

  const TABS = [
    { key: 'dailyMatrix' as const, label: locale === 'uk' ? 'Матриці дня' : 'Daily Matrices', icon: 'calendar-outline' as const },
    { key: 'matrices' as const, label: t.profileExtra.historyTabs[2], icon: 'grid-outline' as const },
  ];

  const [tab, setTab] = useState<TabKey>('dailyMatrix');
  const { isDesktop, isTablet } = useResponsive();
  const wide = isDesktop || isTablet;

  const dailyMatrixHistory = useAppStore((s) => s.dailyMatrixHistory);
  const savedMatrices = useAppStore((s) => s.savedMatrices);

  // ── Empty state ──
  const emptyState = (icon: any, text: string) => (
    <View style={styles.emptyWrap}>
      <Ionicons name={icon} size={48} color="rgba(139,92,246,0.3)" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );

  // ── Daily Matrix tab ──
  const dailyMatrixTab = dailyMatrixHistory.length === 0
    ? emptyState('calendar-outline', locale === 'uk' ? 'Ще немає матриць дня' : 'No daily matrices yet')
    : (
      <View style={[styles.listWrap, wide && styles.listWrapWide]}>
        {dailyMatrixHistory.map((entry) => (
          <TouchableOpacity
            key={entry.date + entry.locale}
            style={styles.historyRow}
            activeOpacity={0.7}
            onPress={() => {
              // Show full analysis in alert (or navigate)
              Alert.alert(
                `${entry.energyName} (${entry.dailyEnergyId})`,
                entry.aiAnalysis || (locale === 'uk' ? 'Аналіз недоступний' : 'Analysis unavailable'),
              );
            }}
          >
            <View style={styles.spreadIconWrap}>
              <Ionicons name="calendar-outline" size={20} color={Colors.accent} />
            </View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyName}>{entry.energyName}</Text>
              <Text style={styles.historyDate}>
                {new Date(entry.date + 'T00:00:00Z').toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              <Text style={styles.historyQuestion} numberOfLines={2}>
                {entry.aiAnalysis?.substring(0, 80) ?? ''}...
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    );

  // ── Matrices tab ──
  const matricesTab = savedMatrices.length === 0
    ? emptyState('grid-outline', 'Ще немає збережених матриць')
    : (
      <View style={[styles.listWrap, wide && styles.listWrapWide]}>
        {savedMatrices.map((matrix) => {
          const d = new Date(matrix.createdAt);
          return (
            <View key={matrix.id} style={styles.historyRow}>
              <View style={styles.matrixIconWrap}>
                <Ionicons name="grid-outline" size={20} color={Colors.accent} />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>{matrix.name}</Text>
                <Text style={styles.historyDate}>
                  {matrix.birthDate} · {d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                {matrix.group ? (
                  <Text style={styles.historyQuestion} numberOfLines={1}>{matrix.group}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    );

  return (
    <View style={styles.root}>
      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarWrap}
        contentContainerStyle={styles.tabBar}
      >
        {TABS.map((tabItem) => {
          const active = tab === tabItem.key;
          return (
            <TouchableOpacity
              key={tabItem.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(tabItem.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tabItem.icon}
                size={15}
                color={active ? Colors.accent : Colors.textMuted}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tabItem.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'dailyMatrix' && dailyMatrixTab}
        {tab === 'matrices' && matricesTab}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 20,
  },

  // ── Tab bar ──
  tabBarWrap: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139,92,246,0.15)',
  },
  tabBar: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabActive: {
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },

  // ── List ──
  listWrap: {
    gap: Spacing.sm,
  },
  listWrapWide: {
    maxWidth: 600,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(25,12,55,0.80)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.20)',
  },
  historyRowToday: {
    borderColor: 'rgba(139,92,246,0.50)',
  },

  // Mini card
  miniCard: {
    width: 38,
    height: 54,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.4)',
    gap: 1,
    flexShrink: 0,
  },
  miniMoon: { color: 'rgba(245,197,66,0.9)', fontSize: 14, lineHeight: 16 },
  miniNum: { color: 'rgba(245,197,66,0.75)', fontSize: 9, fontWeight: '900' },

  // Icons for spreads/matrices
  spreadIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.30)',
    flexShrink: 0,
  },
  matrixIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(245,197,66,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.25)',
    flexShrink: 0,
  },

  // Info
  historyInfo: { flex: 1, gap: 2 },
  historyName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  historyDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  historyQuestion: { color: 'rgba(255,255,255,0.4)', fontSize: FontSize.xs, marginTop: 1 },

  // Badges
  todayBadge: {
    backgroundColor: 'rgba(139,92,246,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.40)',
  },
  todayBadgeText: { color: Colors.primaryLight, fontSize: 9, fontWeight: '700' },
  aiBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(245,197,66,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.25)',
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
});
