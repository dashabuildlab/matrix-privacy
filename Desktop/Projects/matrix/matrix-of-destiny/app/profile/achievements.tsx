import React, { useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';

const { width } = Dimensions.get('window');
const XP_PER_LEVEL = 500;

export default function AchievementsScreen() {
  const { t, locale } = useI18n();

  const getRankTitle = (level: number): string => {
    return t.ranks[level] ?? t.ranks[1];
  };
  const xp = useAppStore((s) => s.xp);
  const level = useAppStore((s) => s.level);
  const streak = useAppStore((s) => s.streak);
  const achievements = useAppStore((s) => s.achievements);
  const unlockedIds = useAppStore((s) => s.unlockedAchievementIds);
  const viewedIds = useAppStore((s) => s.viewedAchievementIds);
  const markAchievementsViewed = useAppStore((s) => s.markAchievementsViewed);
  const tokens = useAppStore((s) => s.tokens);
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);

  const newIds = unlockedIds.filter((id) => !viewedIds.includes(id));

  // Mark all as viewed when leaving screen
  useFocusEffect(
    useCallback(() => {
      notifications
        .filter((n) => n.type === 'achievement' && !n.read)
        .forEach((n) => markNotificationRead(n.id));
      return () => { markAchievementsViewed(); };
    }, [notifications])
  );

  const xpInCurrentLevel = xp % XP_PER_LEVEL;
  const progressPercent = xpInCurrentLevel / XP_PER_LEVEL;

  const unlocked = achievements.filter((a) => unlockedIds.includes(a.id));
  const locked = achievements.filter((a) => !unlockedIds.includes(a.id));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* XP & Level card */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4338CA']}
        style={styles.levelCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.levelTop}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNum}>{level}</Text>
            <Text style={styles.levelLabel}>{locale === 'uk' ? 'Рівень' : 'Level'}</Text>
          </View>
          <View style={styles.levelInfo}>
            <Text style={styles.levelTitle}>{getRankTitle(level)}</Text>
            <Text style={styles.xpText}>{xp} XP {locale === 'uk' ? 'загалом' : 'total'}</Text>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${progressPercent * 100}%` }]} />
            </View>
            <Text style={styles.xpNext}>{xpInCurrentLevel}/{XP_PER_LEVEL} {locale === 'uk' ? `до ${level + 1} рівня` : `to level ${level + 1}`}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>{locale === 'uk' ? 'Серія' : 'Streak'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unlocked.length}</Text>
            <Text style={styles.statLabel}>{locale === 'uk' ? 'Нагороди' : 'Awards'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tokens}</Text>
            <Text style={styles.statLabel}>{locale === 'uk' ? 'Кристали' : 'Crystals'}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* How it works */}
      <View style={styles.howItWorks}>
        <Ionicons name="information-circle-outline" size={18} color={Colors.primaryLight} />
        <Text style={styles.howItWorksText}>
          {locale === 'uk'
            ? 'Виконуйте дії в додатку — створюйте матриці, робіть розклади, медитуйте та спілкуйтесь з AI. За кожну дію ви отримуєте XP та відкриваєте нагороди. Щоденні візити формують серію — не пропускайте жодного дня!'
            : 'Use the app — create matrices, do spreads, meditate and chat with AI. Every action earns XP and unlocks achievements. Daily visits build your streak — don\'t miss a day!'}
        </Text>
      </View>

      {/* Streak section */}
      <Card style={styles.streakCard}>
        <View style={styles.streakHeader}>
          <Ionicons name="flame" size={28} color="#F97316" />
          <View>
            <Text style={styles.streakTitle}>{locale === 'uk' ? 'Поточна серія' : 'Current streak'}</Text>
            <Text style={styles.streakDays}>{streak} {locale === 'uk' ? (streak === 1 ? 'день' : streak < 5 ? 'дні' : 'днів') : (streak === 1 ? 'day' : 'days')} {locale === 'uk' ? 'поспіль' : 'in a row'}</Text>
          </View>
        </View>

        {/* 7-day grid */}
        <View style={styles.weekGrid}>
          {Array.from({ length: 7 }, (_, i) => {
            const day = new Date();
            day.setDate(day.getDate() - (6 - i));
            const dayName = day.toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB', { weekday: 'short' });
            const isActive = i >= 7 - Math.min(streak, 7);
            const isToday = i === 6;

            return (
              <View key={i} style={styles.dayItem}>
                <View style={[styles.dayCircle, isActive && styles.dayCircleActive, isToday && styles.dayCircleToday]}>
                  {isActive ? (
                    <Ionicons name="flame" size={16} color={isToday ? Colors.accent : '#FFFFFF'} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={16} color={Colors.textMuted} />
                  )}
                </View>
                <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>{dayName}</Text>
              </View>
            );
          })}
        </View>

        {streak >= 7 && (
          <View style={styles.streakReward}>
            <Ionicons name="diamond" size={16} color={Colors.accent} />
            <Text style={styles.streakRewardText}>{locale === 'uk' ? 'Бонус за 7 днів: +5 кристалів' : '7-day bonus: +5 crystals'}</Text>
          </View>
        )}
      </Card>

      {/* Unlocked achievements */}
      {unlocked.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{locale === 'uk' ? 'Отримані нагороди' : 'Unlocked achievements'} ({unlocked.length})</Text>
          {unlocked.map((a) => {
            const isNew = newIds.includes(a.id);
            return (
              <Card key={a.id} style={[styles.achievementCard, isNew && styles.achievementNew]}>
                <Text style={styles.achievementIcon}>{a.icon}</Text>
                <View style={styles.achievementInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.achievementTitle}>{a.title}</Text>
                    {isNew && <View style={styles.newDot} />}
                  </View>
                  <Text style={styles.achievementDesc}>{a.description}</Text>
                </View>
                <View style={styles.achievementXP}>
                  <Ionicons name="star" size={14} color={Colors.accent} />
                  <Text style={styles.achievementXPText}>+{a.xp}</Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Locked achievements */}
      {locked.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{locale === 'uk' ? 'Ще попереду' : 'Locked'} ({locked.length})</Text>
          {locked.map((a) => (
            <Card key={a.id} style={[styles.achievementCard, styles.achievementLocked]}>
              <View style={styles.lockedIcon}>
                <Ionicons name="lock-closed" size={18} color={Colors.textMuted} />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={[styles.achievementTitle, { color: Colors.textMuted }]}>{a.title}</Text>
                <Text style={styles.achievementDesc}>{a.description}</Text>
              </View>
              <View style={styles.achievementXP}>
                <Ionicons name="star-outline" size={14} color={Colors.textMuted} />
                <Text style={[styles.achievementXPText, { color: Colors.textMuted }]}>+{a.xp}</Text>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 20 },

  levelCard: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  levelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  levelBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 3,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNum: {
    color: Colors.accent,
    fontSize: FontSize.xxl,
    fontWeight: '900',
  },
  levelLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  levelInfo: { flex: 1, gap: 6 },
  levelTitle: { color: '#FFFFFF', fontSize: FontSize.md, fontWeight: '700' },
  xpText: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.xs },
  xpBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
  },
  xpNext: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.xs },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.xs },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  howItWorks: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  howItWorksText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },

  streakCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.md },
  streakHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  streakEmoji: { fontSize: 40 },
  streakTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  streakDays: { color: Colors.accent, fontSize: FontSize.lg, fontWeight: '800' },

  weekGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  dayItem: { alignItems: 'center', gap: 6 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgCardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: Colors.primary },
  dayCircleToday: { backgroundColor: Colors.accent },
  dayLabel: { color: Colors.textMuted, fontSize: 10 },
  dayLabelActive: { color: Colors.text },

  streakReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accentMuted,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  streakRewardText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg, gap: Spacing.sm },
  sectionTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.xs },

  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  achievementNew: {
    borderWidth: 1,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  newDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  achievementLocked: { opacity: 0.6 },
  achievementIcon: { fontSize: 32 },
  lockedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgCardLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementInfo: { flex: 1, gap: 2 },
  achievementTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  achievementDesc: { color: Colors.textMuted, fontSize: FontSize.sm },
  achievementXP: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  achievementXPText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' },
});
