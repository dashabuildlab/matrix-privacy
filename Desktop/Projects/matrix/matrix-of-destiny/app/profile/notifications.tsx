import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n';
import { useAppStore } from '@/stores/useAppStore';
import {
  scheduleDailyCardNotification,
  cancelDailyCardNotification,
  scheduleDailyGiftNotification,
  cancelGiftNotifications,
} from '@/lib/notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const pushEnabled = useAppStore((s) => s.pushEnabled);
  const setPushEnabled = useAppStore((s) => s.setPushEnabled);
  const dailyEnergyEnabled = useAppStore((s) => s.dailyEnergyEnabled);
  const setDailyEnergyEnabled = useAppStore((s) => s.setDailyEnergyEnabled);

  const toggleDailyCard = async (val: boolean) => {
    setDailyEnergyEnabled(val);
    if (val) {
      await scheduleDailyCardNotification(locale);
    } else {
      await cancelDailyCardNotification();
    }
  };

  const togglePush = async (val: boolean) => {
    setPushEnabled(val);
    if (val) {
      await scheduleDailyGiftNotification(locale);
      if (dailyEnergyEnabled) await scheduleDailyCardNotification(locale);
    } else {
      await cancelGiftNotifications();
      await cancelDailyCardNotification();
    }
  };

  const NOTIF_SETTINGS = [
    {
      key: 'push_main',
      icon: 'notifications-outline' as const,
      label: t.pushNotifications.title,
      description: t.pushNotifications.subtitle,
      value: pushEnabled,
      onToggle: togglePush,
    },
    {
      key: 'daily_card',
      icon: 'layers-outline' as const,
      label: t.profileExtra.notifDailyCard,
      description: t.profileExtra.notifDailyCardDesc,
      value: dailyEnergyEnabled,
      onToggle: toggleDailyCard,
      disabled: !pushEnabled,
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F0820', '#1E1B4B']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="notifications-outline" size={28} color="#A78BFA" />
          <Text style={styles.headerTitle}>{t.pushNotifications.title}</Text>
          <Text style={styles.headerSubtitle}>{t.pushNotifications.subtitle}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {Platform.OS === 'web' && (
          <Card style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.infoText}>
              {locale === 'uk'
                ? 'Push-сповіщення доступні лише на мобільних пристроях.'
                : 'Push notifications are only available on mobile devices.'}
            </Text>
          </Card>
        )}

        {NOTIF_SETTINGS.map((item) => (
          <Card key={item.key} style={[styles.settingCard, item.disabled && styles.settingDisabled]}>
            <View style={styles.settingIconWrap}>
              <Ionicons name={item.icon} size={20} color={item.disabled ? Colors.textMuted : Colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, item.disabled && { color: Colors.textMuted }]}>{item.label}</Text>
              <Text style={styles.settingDesc}>{item.description}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              disabled={item.disabled}
              trackColor={{ false: Colors.border, true: Colors.primaryMuted }}
              thumbColor={item.value ? Colors.primary : 'rgba(255,255,255,0.6)'}
            />
          </Card>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { padding: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.lg },
  backBtn: { position: 'absolute', top: 56, left: Spacing.lg, zIndex: 1, padding: 8 },
  headerContent: { alignItems: 'center', gap: 6 },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800', marginTop: 4 },
  headerSubtitle: { color: 'rgba(167,139,250,0.75)', fontSize: FontSize.sm },
  content: { padding: Spacing.lg },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.md,
    backgroundColor: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.25)',
  },
  infoText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  settingCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  settingDisabled: { opacity: 0.5 },
  settingIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  settingDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
});
