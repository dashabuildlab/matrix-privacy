import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Linking, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { setCrashlyticsEnabled } from '@/lib/crashlytics';
import { clearAllSessionsSync } from '@/lib/chatDb';

export default function PrivacyScreen() {
  const router = useRouter();
  const { locale } = useI18n();
  const [analytics, setAnalytics] = useState(true);
  const [crashReports, setCrashReports] = useState(true);
  const handleCrashReportsToggle = (val: boolean) => {
    setCrashReports(val);
    setCrashlyticsEnabled(val);
  };
  const [personalization, setPersonalization] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleClearData = () => {
    const store = useAppStore.getState();
    // Clear activity data but keep account (name, birthDate, email, premium, tokens)
    useAppStore.setState({
      savedMatrices: [],
      dailyMatrixHistory: [],
      activeSessionId: null,
      gameRecords: {},
      xp: 0,
      level: 1,
      streak: 0,
      lastVisitDate: null,
      unlockedAchievementIds: [],
      viewedAchievementIds: [],
    });
    // Chat sessions live in SQLite, not Zustand — clear them separately
    clearAllSessionsSync();
    setShowClearModal(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F0820', '#1E1B4B']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="shield-checkmark-outline" size={28} color="#A78BFA" />
          <Text style={styles.headerTitle}>{locale === 'uk' ? 'Конфіденційність' : 'Privacy'}</Text>
          <Text style={styles.headerSubtitle}>{locale === 'uk' ? 'Управління вашими даними' : 'Manage your data'}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.infoCard}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
          <Text style={styles.infoText}>
            {locale === 'uk'
              ? 'Ваші особисті дані зберігаються локально на пристрої та захищені шифруванням. Ми ніколи не передаємо їх третім особам.'
              : 'Your personal data is stored locally on the device and protected by encryption. We never share it with third parties.'}
          </Text>
        </Card>

        <Text style={styles.sectionLabel}>{locale === 'uk' ? 'Збір даних' : 'Data collection'}</Text>

        {[
          { label: locale === 'uk' ? 'Аналітика використання' : 'Usage analytics', desc: locale === 'uk' ? 'Допомагає покращити додаток' : 'Helps improve the app', val: analytics, set: setAnalytics },
          { label: locale === 'uk' ? 'Звіти про помилки' : 'Crash reports', desc: locale === 'uk' ? 'Автоматичні звіти про збої' : 'Automatic crash reports', val: crashReports, set: handleCrashReportsToggle },
          { label: locale === 'uk' ? 'Персоналізація' : 'Personalization', desc: locale === 'uk' ? 'Рекомендації на основі активності' : 'Recommendations based on activity', val: personalization, set: setPersonalization },
        ].map((item) => (
          <Card key={item.label} style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowDesc}>{item.desc}</Text>
            </View>
            <Switch
              value={item.val}
              onValueChange={item.set}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#FFFFFF"
            />
          </Card>
        ))}

        <Text style={styles.sectionLabel}>{locale === 'uk' ? 'Дії' : 'Actions'}</Text>

        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowClearModal(true)}>
          <Card style={[styles.row, styles.dangerRow]}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.dangerLabel}>{locale === 'uk' ? 'Очистити дані активності' : 'Clear activity data'}</Text>
              <Text style={styles.rowDesc}>
                {locale === 'uk' ? 'Матриці, розклади, чати, прогрес' : 'Matrices, spreads, chats, progress'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </Card>
        </TouchableOpacity>

        {cleared && (
          <Card style={[styles.row, { borderColor: 'rgba(34,197,94,0.3)', backgroundColor: 'rgba(34,197,94,0.08)' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={[styles.rowLabel, { color: '#22C55E' }]}>
              {locale === 'uk' ? 'Дані очищено' : 'Data cleared'}
            </Text>
          </Card>
        )}

        <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://dashabuildlab.github.io/matrix-privacy/uk/privacy/')}>
          <Card style={styles.row}>
            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
            <Text style={styles.rowLabel}>{locale === 'uk' ? 'Політика конфіденційності' : 'Privacy policy'}</Text>
            <Ionicons name="open-outline" size={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
          </Card>
        </TouchableOpacity>

        <Card style={[styles.infoCard, { marginTop: Spacing.md }]}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.infoText}>
            {locale === 'uk'
              ? 'Очищення даних видаляє лише вашу активність (матриці, розклади, чати, прогрес). Акаунт, ім\'я, дата народження та Premium залишаються. Для повного видалення акаунту скористайтесь відповідною кнопкою в профілі.'
              : 'Clearing data removes only your activity (matrices, spreads, chats, progress). Your account, name, birth date and Premium remain. To fully delete your account, use the button in your profile.'}
          </Text>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Clear Data Modal */}
      <Modal visible={showClearModal} transparent animationType="fade" onRequestClose={() => setShowClearModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.clearModal}>
            <View style={styles.clearModalIcon}>
              <Ionicons name="refresh-outline" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.clearModalTitle}>
              {locale === 'uk' ? 'Очистити дані?' : 'Clear data?'}
            </Text>
            <Text style={styles.clearModalDesc}>
              {locale === 'uk'
                ? 'Буде видалено вашу активність у додатку:'
                : 'Your app activity will be removed:'}
            </Text>
            <View style={styles.clearModalList}>
              {(locale === 'uk'
                ? ['Збережені матриці долі', 'Розклади матриці та чати з AI', 'Прогрес, досягнення та рекорди']
                : ['Saved destiny matrices', 'AI chats and AI chats', 'Progress, achievements, and records']
              ).map((item, i) => (
                <View key={i} style={styles.clearModalListItem}>
                  <Ionicons name="close-circle" size={16} color="#F59E0B" />
                  <Text style={styles.clearModalListText}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={styles.clearModalKeep}>
              <Text style={styles.clearModalKeepTitle}>
                {locale === 'uk' ? 'Залишиться:' : 'Will remain:'}
              </Text>
              {(locale === 'uk'
                ? ['Ваш акаунт (ім\'я, пошта, дата народження)', 'Premium-підписка та кристали']
                : ['Your account (name, email, birth date)', 'Premium subscription and crystals']
              ).map((item, i) => (
                <View key={i} style={styles.clearModalListItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                  <Text style={styles.clearModalListText}>{item}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={styles.clearModalBtn} activeOpacity={0.85} onPress={handleClearData}>
              <LinearGradient colors={['#D97706', '#92400E']} style={styles.clearModalBtnGrad}>
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.clearModalBtnText}>
                  {locale === 'uk' ? 'Очистити дані' : 'Clear data'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowClearModal(false)} style={styles.clearModalCancel}>
              <Text style={styles.clearModalCancelText}>
                {locale === 'uk' ? 'Скасувати' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.lg,
    backgroundColor: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.25)',
  },
  infoText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  sectionLabel: {
    color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: Spacing.sm, marginTop: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  rowInfo: { flex: 1 },
  rowLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  rowDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  dangerRow: { borderColor: 'rgba(248,113,113,0.25)' },
  dangerLabel: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.lg,
  },
  clearModal: {
    backgroundColor: '#1C1040',
    borderRadius: BorderRadius.xl, padding: Spacing.xl,
    width: '100%', maxWidth: 380,
    borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)',
  },
  clearModalIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(245,158,11,0.12)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: Spacing.md,
  },
  clearModalTitle: {
    color: '#fff', fontSize: FontSize.xl, fontWeight: '800',
    textAlign: 'center', marginBottom: Spacing.sm,
  },
  clearModalDesc: {
    color: Colors.textSecondary, fontSize: FontSize.sm,
    textAlign: 'center', marginBottom: Spacing.md,
  },
  clearModalList: { gap: 8, marginBottom: Spacing.md },
  clearModalListItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearModalListText: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  clearModalKeep: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
    gap: 8, marginBottom: Spacing.lg,
  },
  clearModalKeepTitle: { color: '#22C55E', fontSize: FontSize.xs, fontWeight: '700', marginBottom: 2 },
  clearModalBtn: { marginBottom: Spacing.sm },
  clearModalBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md,
  },
  clearModalBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  clearModalCancel: { alignSelf: 'center', paddingVertical: Spacing.sm },
  clearModalCancelText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
});
