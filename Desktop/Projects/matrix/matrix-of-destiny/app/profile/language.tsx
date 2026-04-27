import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/lib/i18n';

const LANGUAGES = [
  { code: 'en', label: 'English (US)', flag: '🇺🇸', native: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧', native: 'English (UK)' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', native: 'Українська' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F0820', '#1E1B4B']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="language-outline" size={28} color="#A78BFA" />
          <Text style={styles.headerTitle}>{t.language.title}</Text>
          <Text style={styles.headerSubtitle}>{t.language.subtitle}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.infoText}>{t.language.infoText}</Text>
        </Card>

        {LANGUAGES.map((lang) => {
          const isActive = locale === lang.code;
          return (
            <TouchableOpacity key={lang.code} activeOpacity={0.7} onPress={() => setLocale(lang.code)}>
              <Card style={[styles.langRow, isActive && styles.langRowActive]}>
                <Text style={styles.flag}>{lang.flag}</Text>
                <View style={styles.langInfo}>
                  <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>{lang.native}</Text>
                  <Text style={styles.langSub}>{lang.label}</Text>
                </View>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </Card>
            </TouchableOpacity>
          );
        })}

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
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.lg,
    backgroundColor: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.25)',
  },
  infoText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  langRowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted },
  flag: { fontSize: 28 },
  langInfo: { flex: 1 },
  langLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  langLabelActive: { color: Colors.primaryLight },
  langSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
});
