import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n';

const APP_VERSION = '1.0.28';
const BUILD = '28';

export default function AboutScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#0F0820', '#1E1B4B']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <LinearGradient colors={['#C8901A', '#F5C542', '#C8901A']} style={styles.logoRing}>
          <LinearGradient colors={['#1C1040', '#0D0B1E']} style={styles.logoInner}>
            <Ionicons name="sparkles" size={30} color="#F5C542" />
          </LinearGradient>
        </LinearGradient>
        <Text style={styles.appName}>Matrix of Destiny</Text>
        <Text style={styles.version}>{locale === 'uk' ? 'Версія' : 'Version'} {APP_VERSION} ({BUILD})</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.descCard}>
          <Text style={styles.descText}>
            {t.profileExtra.aboutDesc}
          </Text>
        </Card>

        <Text style={styles.sectionLabel}>{locale === 'uk' ? 'Можливості' : 'Features'}</Text>
        {[
          { icon: 'grid-outline' as const, title: t.profileExtra.aboutFeature1, desc: t.profileExtra.aboutFeature1Desc },
          { icon: 'layers-outline' as const, title: t.profileExtra.aboutFeature2, desc: t.profileExtra.aboutFeature2Desc },
          { icon: 'musical-notes-outline' as const, title: t.profileExtra.aboutFeature3, desc: t.profileExtra.aboutFeature3Desc },
          { icon: 'sunny-outline' as const, title: t.profileExtra.aboutFeature4, desc: t.profileExtra.aboutFeature4Desc },
          { icon: 'heart-outline' as const, title: t.profileExtra.aboutFeature5, desc: t.profileExtra.aboutFeature5Desc },
          { icon: 'chatbubble-ellipses-outline' as const, title: t.profileExtra.aboutFeature6, desc: t.profileExtra.aboutFeature6Desc },
          { icon: 'flash-outline' as const, title: t.profileExtra.aboutFeature7, desc: t.profileExtra.aboutFeature7Desc },
          { icon: 'school-outline' as const, title: t.profileExtra.aboutFeature8, desc: t.profileExtra.aboutFeature8Desc },
        ].map((item, i) => (
          <Card key={i} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={item.icon} size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.desc}</Text>
            </View>
          </Card>
        ))}

        <Text style={styles.sectionLabel}>{locale === 'uk' ? 'Контакти' : 'Contact'}</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('mailto:support@yourmatrixofdestiny.com')}>
          <Card style={styles.linkRow}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            <Text style={styles.linkText}>support@yourmatrixofdestiny.com</Text>
            <Ionicons name="open-outline" size={16} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
          </Card>
        </TouchableOpacity>

        <Card style={styles.legalRow}>
          <Text style={styles.legalText}>
            © Matrix of Destiny{'\n'}
            {locale === 'uk' ? 'Всі права захищені' : 'All rights reserved'}
          </Text>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { padding: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.xl, alignItems: 'center', gap: 8 },
  backBtn: { position: 'absolute', top: 56, left: Spacing.lg, zIndex: 1, padding: 8 },
  logoRing: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  appName: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', textAlign: 'center' },
  version: { color: 'rgba(167,139,250,0.65)', fontSize: FontSize.sm },
  content: { padding: Spacing.lg },
  descCard: { marginBottom: Spacing.lg },
  descText: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 24, textAlign: 'center' },
  sectionLabel: {
    color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: Spacing.sm, marginTop: Spacing.sm,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm, paddingVertical: Spacing.sm },
  featureIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.12)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 },
  featureDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 18 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  linkText: { flex: 1, color: Colors.primary, fontSize: FontSize.md },
  legalRow: { alignItems: 'center', marginTop: Spacing.md, backgroundColor: 'rgba(255,255,255,0.03)' },
  legalText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
});
