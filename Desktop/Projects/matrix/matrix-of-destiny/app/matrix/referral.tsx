import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';

const getRewards = (locale: string) => locale === 'uk' ? [
  { count: 1, reward: '5 кристалів', icon: '💎', unlocked: false },
  { count: 3, reward: '20 кристалів', icon: '💎💎', unlocked: false },
  { count: 5, reward: '1 тиждень Premium', icon: '⭐', unlocked: false },
  { count: 10, reward: '1 місяць Premium', icon: '👑', unlocked: false },
] : [
  { count: 1, reward: '5 crystals', icon: '💎', unlocked: false },
  { count: 3, reward: '20 crystals', icon: '💎💎', unlocked: false },
  { count: 5, reward: '1 week Premium', icon: '⭐', unlocked: false },
  { count: 10, reward: '1 month Premium', icon: '👑', unlocked: false },
];

const getHowItWorks = (locale: string) => locale === 'uk' ? [
  { step: '1', icon: 'share-social-outline' as const, title: 'Поділіться кодом', desc: 'Надішліть свій унікальний код друзям або опублікуйте в соцмережах' },
  { step: '2', icon: 'person-add-outline' as const, title: 'Друг реєструється', desc: 'Ваш друг завантажує Matrix of Destiny та вводить ваш код' },
  { step: '3', icon: 'diamond-outline' as const, title: 'Обидва отримують нагороди', desc: 'Ви отримуєте кристали, ваш друг — бонусні кристали на старт' },
] : [
  { step: '1', icon: 'share-social-outline' as const, title: 'Share your code', desc: 'Send your unique code to friends or post it on social media' },
  { step: '2', icon: 'person-add-outline' as const, title: 'Friend signs up', desc: 'Your friend downloads Matrix of Destiny and enters your code' },
  { step: '3', icon: 'diamond-outline' as const, title: 'Both get rewards', desc: 'You get crystals, your friend gets bonus crystals to start' },
];

export default function ReferralScreen() {
  const { locale } = useI18n();
  const isUk = locale === 'uk';
  const referralCode = useAppStore((s) => s.referralCode);
  const referralCount = useAppStore((s) => s.referralCount);
  const setReferralCode = useAppStore((s) => s.setReferralCode);
  const tokens = useAppStore((s) => s.tokens);

  const REWARDS = getRewards(locale);
  const HOW_IT_WORKS = getHowItWorks(locale);

  // Generate a code if not set
  const userId = useAppStore((s) => s.userId);
  const code = referralCode ?? `SOUL${(userId ?? 'USER').substring(0, 6).toUpperCase()}`;

  const inviteLink = `https://matrixofsoul.app/invite/${code}`;

  const copyCode = () => {
    Clipboard.setString(code);
    Alert.alert(
      isUk ? 'Скопійовано!' : 'Copied!',
      isUk ? `Код ${code} скопійовано в буфер обміну` : `Code ${code} copied to clipboard`,
    );
  };

  const shareInvite = async () => {
    try {
      await Share.share({
        message: isUk
          ? `✨ Відкрий своє призначення разом зі мною в Matrix of Destiny!\n\nВикористай мій код ${code} при реєстрації та отримай 5 безкоштовних кристалів 💎\n\nЗавантажити: ${inviteLink}`
          : `✨ Discover your destiny with me in Matrix of Destiny!\n\nUse my code ${code} when signing up and get 5 free crystals 💎\n\nDownload: ${inviteLink}`,
        title: isUk ? 'Matrix of Destiny — Запрошення' : 'Matrix of Destiny — Invitation',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const rewardProgress = REWARDS.map((r) => ({
    ...r,
    unlocked: referralCount >= r.count,
    progress: Math.min(referralCount / r.count, 1),
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#4338CA']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.heroIcon}>🎁</Text>
        <Text style={styles.heroTitle}>{isUk ? 'Запроси Друзів' : 'Invite Friends'}</Text>
        <Text style={styles.heroSubtitle}>
          {isUk ? 'Отримуй кристали та Premium за кожного запрошеного друга' : 'Earn crystals and Premium for every friend you invite'}
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{referralCount}</Text>
            <Text style={styles.statLabel}>{isUk ? 'Запрошено' : 'Invited'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tokens}</Text>
            <Text style={styles.statLabel}>{isUk ? 'Кристалів' : 'Crystals'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rewardProgress.filter((r) => r.unlocked).length}</Text>
            <Text style={styles.statLabel}>{isUk ? 'Нагород' : 'Rewards'}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Referral code */}
      <Card style={styles.codeCard}>
        <Text style={styles.codeLabel}>{isUk ? 'Ваш реферальний код' : 'Your referral code'}</Text>
        <View style={styles.codeRow}>
          <Text style={styles.code}>{code}</Text>
          <TouchableOpacity style={styles.copyBtn} onPress={copyCode}>
            <Ionicons name="copy-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.codeHint}>{isUk ? 'Ваш друг отримає +5 кристалів при реєстрації' : 'Your friend will receive +5 crystals on sign-up'}</Text>
      </Card>

      {/* Share buttons */}
      <View style={styles.shareSection}>
        <TouchableOpacity style={styles.mainShareBtn} onPress={shareInvite} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.mainShareGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
            <Text style={styles.mainShareText}>{isUk ? 'Поділитися запрошенням' : 'Share Invitation'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.socialRow}>
          {[
            { label: 'Telegram', icon: '✈️', color: '#0088CC' },
            { label: 'WhatsApp', icon: '💬', color: '#25D366' },
            { label: 'Instagram', icon: '📸', color: '#E1306C' },
            { label: 'TikTok', icon: '🎵', color: '#FF0050' },
          ].map((s) => (
            <TouchableOpacity
              key={s.label}
              style={[styles.socialBtn, { borderColor: `${s.color}40`, backgroundColor: `${s.color}15` }]}
              onPress={shareInvite}
            >
              <Text style={styles.socialIcon}>{s.icon}</Text>
              <Text style={[styles.socialLabel, { color: s.color }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Rewards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{isUk ? 'Нагороди' : 'Rewards'}</Text>
        <View style={styles.rewardsList}>
          {rewardProgress.map((reward, i) => (
            <View
              key={i}
              style={[styles.rewardCard, reward.unlocked && styles.rewardCardUnlocked]}
            >
              <View style={styles.rewardLeft}>
                <Text style={styles.rewardIcon}>{reward.icon}</Text>
                <View>
                  <Text style={styles.rewardTitle}>{reward.count} {isUk ? (reward.count === 1 ? 'друг' : reward.count < 5 ? 'друга' : 'друзів') : (reward.count === 1 ? 'friend' : 'friends')}</Text>
                  <Text style={styles.rewardValue}>{reward.reward}</Text>
                </View>
              </View>
              {reward.unlocked ? (
                <View style={styles.unlockedBadge}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                  <Text style={styles.unlockedText}>{isUk ? 'Отримано' : 'Claimed'}</Text>
                </View>
              ) : (
                <View style={styles.progressBox}>
                  <Text style={styles.progressText}>{referralCount}/{reward.count}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${reward.progress * 100}%` }]} />
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{isUk ? 'Як це працює' : 'How it works'}</Text>
        {HOW_IT_WORKS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>{step.step}</Text>
            </View>
            <View style={styles.stepLine} />
            <Card style={styles.stepCard}>
              <Ionicons name={step.icon} size={24} color={Colors.primary} />
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </Card>
          </View>
        ))}
      </View>

      {/* Invite link */}
      <Card style={styles.linkCard}>
        <Text style={styles.linkLabel}>{isUk ? 'Ваше унікальне посилання' : 'Your unique link'}</Text>
        <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
        <TouchableOpacity
          style={styles.copyLinkBtn}
          onPress={() => {
            Clipboard.setString(inviteLink);
            Alert.alert(isUk ? 'Скопійовано!' : 'Copied!', isUk ? 'Посилання скопійовано' : 'Link copied to clipboard');
          }}
        >
          <Ionicons name="copy-outline" size={16} color={Colors.primary} />
          <Text style={styles.copyLinkText}>{isUk ? 'Копіювати посилання' : 'Copy link'}</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 20 },

  hero: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heroIcon: { fontSize: 56 },
  heroTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: Colors.accent,
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  codeCard: {
    margin: Spacing.lg,
    gap: Spacing.sm,
  },
  codeLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCardLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  code: {
    color: Colors.primary,
    fontSize: FontSize.xxl,
    fontWeight: '900',
    letterSpacing: 4,
  },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeHint: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },

  shareSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  mainShareBtn: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  mainShareGradient: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  mainShareText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  socialBtn: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  socialIcon: { fontSize: 20 },
  socialLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },

  rewardsList: { gap: Spacing.sm },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rewardCardUnlocked: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(52, 211, 153, 0.05)',
  },
  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rewardIcon: { fontSize: 28 },
  rewardTitle: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  rewardValue: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unlockedText: {
    color: Colors.success,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  progressBox: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 80,
  },
  progressText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  progressBar: {
    width: 80,
    height: 6,
    backgroundColor: Colors.bgCardLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  stepLine: {
    position: 'absolute',
    left: 17,
    top: 36,
    width: 2,
    height: 60,
    backgroundColor: Colors.border,
  },
  stepCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepInfo: { flex: 1, gap: 2 },
  stepTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  stepDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },

  linkCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  linkLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  copyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  copyLinkText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
