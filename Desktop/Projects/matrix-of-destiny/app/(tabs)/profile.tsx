import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useResponsive, MAX_CONTENT_WIDTH } from '@/hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { getLastTabPress } from '@/lib/tabState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const XP_PER_LEVEL = 500;

export default function ProfileScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { isWide: wide } = useResponsive();
  const isPremium = useAppStore((s) => s.isPremium);
  const userName = useAppStore((s) => s.userName);
  const userBirthDate = useAppStore((s) => s.userBirthDate);
  const xp = useAppStore((s) => s.xp);
  const level = useAppStore((s) => s.level);
  const streak = useAppStore((s) => s.streak);
  const tokens = useAppStore((s) => s.tokens);
  const unlockedIds = useAppStore((s) => s.unlockedAchievementIds);
  const viewedIds = useAppStore((s) => s.viewedAchievementIds);
  const savedMatrices = useAppStore((s) => s.savedMatrices);
  const notifications = useAppStore((s) => s.notifications);
  const newAchievements = unlockedIds.filter((id) => !viewedIds.includes(id)).length;

  const xpInLevel = xp % XP_PER_LEVEL;
  const progressPercent = xpInLevel / XP_PER_LEVEL;

  const { t, locale } = useI18n();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const getRankTitle = (lvl: number): string =>
    t.ranks[Math.min(lvl, 20) as keyof typeof t.ranks] || t.ranks[1];
  const userId = useAppStore((s) => s.userId);
  const isLoggedIn = useAppStore((s) => s.isAuthenticated) && !!userId && !userId.startsWith('guest_');

  useFocusEffect(
    useCallback(() => {
      const lastTabPress = getLastTabPress();
      if (lastTabPress?.tab === 'profile' && Date.now() - lastTabPress.ts < 500) {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    }, [])
  );

  const SETTINGS = [
    { icon: 'trophy-outline' as const, label: t.profile.achievements, badge: newAchievements > 0 ? `${newAchievements}` : null, isNew: newAchievements > 0, route: '/profile/achievements' },
    { icon: 'diamond-outline' as const, label: t.profile.crystalsPremium, badge: null, isNew: false, route: '/paywall' },
  ];

  const APP_SETTINGS = [
    { icon: 'person-outline' as const, label: t.profile.account, badge: null, isNew: false, route: '/profile/account' },
    { icon: 'notifications-outline' as const, label: t.profile.notifications, badge: null, isNew: false, route: '/profile/notifications' },
    { icon: 'shield-outline' as const, label: t.profile.privacy, badge: null, isNew: false, route: '/profile/privacy' },
    { icon: 'information-circle-outline' as const, label: t.profile.about, badge: null, isNew: false, route: '/profile/about' },
  ];

  // ── Shared blocks ──────────────────────────────────────────────

  const heroBlock = (
    <LinearGradient colors={['#1E1B4B', '#312E81']} style={[styles.hero, wide && styles.heroWide, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {userName ? userName[0].toUpperCase() : '✦'}
          </Text>
        </View>
        {isPremium && (
          <View style={styles.premiumAvatarBadge}>
            <Ionicons name="star" size={12} color={Colors.bg} />
          </View>
        )}
      </View>
      <Text style={styles.heroName}>{userName ?? t.profile.traveler}</Text>
      {userBirthDate && <Text style={styles.heroBirthDate}>{userBirthDate}</Text>}

      <View style={[styles.levelContainer, { marginTop: Spacing.sm }]}>
        <View style={styles.levelRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelNum}>{level}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rankTitle}>{getRankTitle(level)}</Text>
            <Text style={styles.xpText}>{xpInLevel}/{XP_PER_LEVEL} XP</Text>
          </View>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${progressPercent * 100}%` }]} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="flame" size={18} color="#F97316" />
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>{t.profile.streak}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="grid-outline" size={18} color={Colors.accent} />
          <Text style={styles.statValue}>{savedMatrices.length}</Text>
          <Text style={styles.statLabel}>{t.profile.matrices}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="trophy-outline" size={18} color={Colors.primary} />
          <Text style={styles.statValue}>{unlockedIds.length}</Text>
          <Text style={styles.statLabel}>{t.profile.rewards}</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const premiumBlock = (
    <>
      {!isPremium && (
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/paywall')}>
          <LinearGradient
            colors={['#78350F', '#D97706', '#F59E0B']}
            style={styles.premiumBanner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.premiumIconWrap}>
              <Ionicons name="diamond-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.premiumInfo}>
              <Text style={styles.premiumTitle}>{t.profile.getPremium}</Text>
              <Text style={styles.premiumSubtitle}>{t.profile.premiumSubtitle}</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </>
  );

  const streakBlock = (
    <Card style={styles.streakCard}>
      <View style={styles.streakHeader}>
        <Ionicons name="flame" size={24} color="#F97316" />
        <View>
          <Text style={styles.streakTitle}>{locale === 'uk' ? 'Поточна серія' : 'Current streak'}</Text>
          <Text style={styles.streakDays}>
            {streak}{' '}
            {locale === 'uk'
              ? streak === 1 ? 'день' : streak < 5 ? 'дні' : 'днів'
              : streak === 1 ? 'day' : 'days'}{' '}
            {locale === 'uk' ? 'поспіль' : 'in a row'}
          </Text>
        </View>
      </View>
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
                {isActive
                  ? <Ionicons name="flame" size={14} color={isToday ? Colors.accent : '#FFFFFF'} />
                  : <Ionicons name="ellipse-outline" size={14} color={Colors.textMuted} />}
              </View>
              <Text style={[styles.dayLabel, isActive && styles.dayLabelActive]}>{dayName}</Text>
            </View>
          );
        })}
      </View>
      {streak >= 7 && (
        <View style={styles.streakReward}>
          <Ionicons name="diamond" size={14} color={Colors.accent} />
          <Text style={styles.streakRewardText}>{locale === 'uk' ? 'Бонус за 7 днів: +5 кристалів' : '7-day bonus: +5 crystals'}</Text>
        </View>
      )}
    </Card>
  );

  const settingsBlock = (
    <>
      <Text style={styles.sectionTitle}>{t.profile.quickAccess}</Text>
      {SETTINGS.map((item) => (
        <TouchableOpacity key={item.label} activeOpacity={0.7} onPress={() => item.route && router.push(item.route as any)}>
          <Card style={[styles.settingItem, wide && styles.settingItemWide]}>
            <View style={{ position: 'relative' }}>
              <Ionicons name={item.icon} size={wide ? 26 : 22} color={Colors.primary} />
              {item.isNew && <View style={styles.newDot} />}
            </View>
            <Text style={styles.settingLabel}>{item.label}</Text>
            {item.isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>{t.ui.newBadge}</Text></View>}
            {item.badge && (
              <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View>
            )}
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Card>
        </TouchableOpacity>
      ))}

      <Text style={styles.sectionTitle}>{t.profile.appSettings}</Text>

      {APP_SETTINGS.map((item) => (
        <TouchableOpacity key={item.label} activeOpacity={0.7} onPress={() => item.route && router.push(item.route as any)}>
          <Card style={[styles.settingItem, wide && styles.settingItemWide]}>
            <Ionicons name={item.icon} size={wide ? 26 : 22} color={Colors.textSecondary} />
            <Text style={styles.settingLabel}>{item.label}</Text>
            {item.badge && (
              <View style={[styles.badge, { backgroundColor: Colors.error }]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Card>
        </TouchableOpacity>
      ))}

      {!isLoggedIn ? (
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/auth/login' as any)}>
          <Card style={[styles.settingItem, wide && styles.settingItemWide, { marginTop: Spacing.md }]}>
            <Ionicons name="log-in-outline" size={wide ? 26 : 22} color={Colors.primary} />
            <Text style={[styles.settingLabel, { color: Colors.primary }]}>{t.profile.login}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Card>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            const doLogout = () => { useAppStore.getState().logout(); };
            if (Platform.OS === 'web') {
              if (window.confirm(t.profile.logoutMsg)) doLogout();
            } else {
              Alert.alert(t.profile.logoutAlert, t.profile.logoutMsg, [
                { text: t.common.cancel, style: 'cancel' },
                { text: t.profile.logoutBtn, style: 'destructive', onPress: doLogout },
              ]);
            }
          }}
        >
          <Card style={[styles.settingItem, wide && styles.settingItemWide, { marginTop: Spacing.md, marginBottom: Spacing.sm }]}>
            <Ionicons name="log-out-outline" size={wide ? 26 : 22} color={Colors.error} />
            <Text style={[styles.settingLabel, { color: Colors.error }]}>{t.profile.logout}</Text>
          </Card>
        </TouchableOpacity>
      )}

      <TouchableOpacity activeOpacity={0.7} onPress={() => setShowDeleteModal(true)}>
        <Card style={[styles.settingItem, wide && styles.settingItemWide, { marginBottom: Spacing.sm }]}>
          <Ionicons name="trash-outline" size={wide ? 26 : 22} color={Colors.error} />
          <Text style={[styles.settingLabel, { color: Colors.error }]}>{t.profile.deleteAccount}</Text>
        </Card>
      </TouchableOpacity>

      {/* Delete Account Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning-outline" size={36} color="#EF4444" />
            </View>
            <Text style={styles.deleteModalTitle}>
              {locale === 'uk' ? 'Видалення акаунту' : 'Delete account'}
            </Text>
            <Text style={styles.deleteModalDesc}>
              {locale === 'uk'
                ? 'Після видалення акаунту буде стерто:'
                : 'After deleting your account, the following will be erased:'}
            </Text>
            <View style={styles.deleteModalList}>
              {(locale === 'uk'
                ? [
                    'Всі збережені матриці долі',
                    'Історія AI-чатів та чатів з AI',
                    'Прогрес, досягнення та рекорди',
                    'Налаштування та персональні дані',
                    'Premium-підписка (якщо є)',
                  ]
                : [
                    'All saved destiny matrices',
                    'AI chat history',
                    'Progress, achievements, and records',
                    'Settings and personal data',
                    'Premium subscription (if any)',
                  ]
              ).map((item, i) => (
                <View key={i} style={styles.deleteModalListItem}>
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                  <Text style={styles.deleteModalListText}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={styles.deleteModalNote}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.deleteModalNoteText}>
                {locale === 'uk'
                  ? 'Ви зможете зареєструватися знову з тією ж поштою та почати з чистого аркуша.'
                  : 'You can register again with the same email and start fresh.'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteModalBtn}
              activeOpacity={0.85}
              onPress={async () => {
                setShowDeleteModal(false);
                await useAppStore.getState().deleteAccount();
                router.replace('/welcome');
              }}
            >
              <LinearGradient colors={['#DC2626', '#991B1B']} style={styles.deleteModalBtnGrad}>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteModalBtnText}>
                  {locale === 'uk' ? 'Видалити акаунт назавжди' : 'Delete account permanently'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={styles.deleteModalCancel}>
              <Text style={styles.deleteModalCancelText}>
                {locale === 'uk' ? 'Скасувати' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Text style={styles.version}>{t.profile.version}</Text>
    </>
  );

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={[styles.content, wide && styles.contentWide]} showsVerticalScrollIndicator={false}>
      {wide ? (
        /* ── Desktop / Tablet: two columns ── */
        <View style={styles.twoColRow}>
          <View style={styles.colLeft}>
            {heroBlock}
            {streakBlock}
            {premiumBlock}
          </View>
          <View style={styles.colRight}>
            {settingsBlock}
          </View>
        </View>
      ) : (
        /* ── Mobile: single column ── */
        <>
          {heroBlock}
          {streakBlock}
          {premiumBlock}
          {settingsBlock}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // Streak calendar
  streakCard: { marginTop: Spacing.sm, marginBottom: Spacing.xs },
  streakHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  streakTitle: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  streakDays: { color: Colors.accent, fontSize: FontSize.md, fontWeight: '800' },
  weekGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  dayItem: { alignItems: 'center', gap: 4 },
  dayCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  dayCircleActive: { backgroundColor: '#F97316', borderColor: '#F97316' },
  dayCircleToday: { backgroundColor: 'rgba(245,197,66,0.15)', borderColor: Colors.accent },
  dayLabel: { color: Colors.textMuted, fontSize: 9 },
  dayLabelActive: { color: Colors.text },
  streakReward: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.sm, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  streakRewardText: { color: Colors.accent, fontSize: FontSize.xs },
  content: { paddingBottom: 20, paddingHorizontal: Spacing.md },
  contentWide: { padding: Spacing.xl, paddingBottom: Spacing.xl, maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', width: '100%' },

  // Two-column layout
  twoColRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    alignItems: 'flex-start',
  },
  colLeft: { flex: 1, minWidth: 280, maxWidth: 380 },
  colRight: { flex: 1.4, minWidth: 0 },

  hero: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 6,
    paddingBottom: Spacing.xl,
    marginHorizontal: -Spacing.md,
  },
  heroWide: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryMuted,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: Colors.text, fontSize: 36, fontWeight: '800' },
  premiumAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bg,
  },
  heroName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  heroBirthDate: { color: 'rgba(255,255,255,0.5)', fontSize: FontSize.sm },

  levelContainer: { width: '100%', gap: 6 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(245,197,66,0.18)',
    borderWidth: 1.5, borderColor: 'rgba(245,197,66,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  levelNum: { color: Colors.accent, fontSize: 14, fontWeight: '800' },
  rankTitle: { color: Colors.primaryLight, fontSize: FontSize.sm, fontWeight: '700' },
  xpText: { color: 'rgba(255,255,255,0.45)', fontSize: FontSize.xs },
  xpBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.full,
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    width: '100%',
    marginTop: Spacing.xs,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  premiumIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  premiumInfo: { flex: 1, gap: 3 },
  premiumTitle: { color: '#FFFFFF', fontSize: FontSize.lg, fontWeight: '800' },
  premiumSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm },

  premiumActiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    borderColor: Colors.success,
  },
  premiumActiveText: { flex: 1, color: Colors.success, fontSize: FontSize.md, fontWeight: '700' },

  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: 0,
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: 0,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.md,
    maxWidth: 480,
  },
  settingItemWide: {
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  settingLabel: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontWeight: '500' },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: FontSize.xs, fontWeight: '700' },
  newDot: {
    position: 'absolute', top: -2, right: -4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: Colors.bg,
  },
  newBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },

  version: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  deleteModal: {
    backgroundColor: '#1C1040',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%', maxWidth: 380,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  deleteModalIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.12)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  deleteModalTitle: {
    color: '#fff', fontSize: FontSize.xl, fontWeight: '800',
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  deleteModalDesc: {
    color: Colors.textSecondary, fontSize: FontSize.sm,
    textAlign: 'center', marginBottom: Spacing.md,
  },
  deleteModalList: { gap: 8, marginBottom: Spacing.md },
  deleteModalListItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteModalListText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  deleteModalNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  deleteModalNoteText: { color: Colors.textSecondary, fontSize: FontSize.xs, flex: 1, lineHeight: 18 },
  deleteModalBtn: { marginBottom: Spacing.sm },
  deleteModalBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md,
  },
  deleteModalBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  deleteModalCancel: { alignSelf: 'center', paddingVertical: Spacing.sm },
  deleteModalCancelText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
});
