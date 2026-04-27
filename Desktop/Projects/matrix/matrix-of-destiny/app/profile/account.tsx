import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { getCurrentUser, signOut } from '@/lib/firebaseAuth';

export default function AccountScreen() {
  const { t, locale } = useI18n();
  const userName      = useAppStore((s) => s.userName);
  const userBirthDate = useAppStore((s) => s.userBirthDate);
  const currentLevel  = useAppStore((s) => s.knowledgeLevel);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const pushToServer   = useAppStore((s) => s.pushToServer);

  const [name, setName]         = useState(userName ?? '');
  const [birth, setBirth]       = useState(userBirthDate ?? '');
  const [birthError, setBirthError] = useState('');
  const [knowledgeLevel, setKnowledgeLevel] = useState<'beginner' | 'intermediate' | 'advanced'>(currentLevel ?? 'beginner');
  const [saved, setSaved]       = useState(false);
  const [deleting, setDeleting] = useState(false);
  const logout = useAppStore((s) => s.logout);

  const formatBirth = (text: string) => {
    let v = text.replace(/[^\d.]/g, '');
    if (v.length === 2 && birth.length === 1) v = v + '.';
    if (v.length === 5 && birth.length === 4) v = v + '.';
    if (v.length > 10) v = v.slice(0, 10);
    setBirth(v);
    setBirthError('');
  };

  const validateBirth = (val: string): string | null => {
    const parts = val.split('.');
    if (parts.length !== 3 || parts[2].length !== 4) {
      return locale === 'uk' ? 'Формат: ДД.ММ.РРРР (наприклад 15.06.1990)' : 'Format: DD.MM.YYYY (e.g. 15.06.1990)';
    }
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const y = parseInt(parts[2]);
    if (d < 1 || d > 31 || m < 1 || m > 12) {
      return locale === 'uk' ? 'Невірний день або місяць' : 'Invalid day or month';
    }
    const today = new Date();
    const inputDate = new Date(y, m - 1, d);
    if (inputDate > today) {
      return locale === 'uk' ? 'Дата народження не може бути в майбутньому' : 'Date of birth cannot be in the future';
    }
    if (y < 1920) {
      return locale === 'uk' ? 'Рік має бути не раніше 1920' : 'Year must be 1920 or later';
    }
    const age = today.getFullYear() - y;
    if (age < 5) {
      return locale === 'uk' ? 'Вкажіть коректну дату народження' : 'Please enter a valid date of birth';
    }
    return null;
  };

  const handleDeleteAccount = () => {
    const title = locale === 'uk' ? 'Видалити акаунт' : 'Delete Account';
    const message = locale === 'uk'
      ? 'Усі ваші дані будуть безповоротно видалені. Цю дію неможливо скасувати.'
      : 'All your data will be permanently deleted. This action cannot be undone.';
    const cancel = locale === 'uk' ? 'Скасувати' : 'Cancel';
    const confirm = locale === 'uk' ? 'Видалити' : 'Delete';

    Alert.alert(title, message, [
      { text: cancel, style: 'cancel' },
      {
        text: confirm,
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            const user = getCurrentUser();
            if (user) {
              await user.delete();
            }
            await signOut();
            logout();
            router.replace('/welcome');
          } catch (e: any) {
            setDeleting(false);
            const needsReauth = e?.code === 'auth/requires-recent-login';
            Alert.alert(
              locale === 'uk' ? 'Помилка' : 'Error',
              needsReauth
                ? (locale === 'uk'
                  ? 'Будь ласка, вийдіть і увійдіть знову, а потім повторіть видалення акаунту.'
                  : 'Please sign out and sign in again, then retry account deletion.')
                : (locale === 'uk' ? 'Не вдалося видалити акаунт. Спробуйте ще раз.' : 'Failed to delete account. Please try again.'),
            );
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      if (Platform.OS === 'web') {
        window.alert(t.profileExtra.enterName);
      } else {
        Alert.alert(t.common.error, t.profileExtra.enterName);
      }
      return;
    }
    if (birth) {
      const err = validateBirth(birth);
      if (err) { setBirthError(err); return; }
    }
    setUserProfile(name.trim(), birth || userBirthDate || '');
    useAppStore.setState({ knowledgeLevel });
    await pushToServer();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.back();
    }, 1200);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {name ? name[0].toUpperCase() : '✦'}
          </Text>
        </View>
      </View>

      {/* Name */}
      <Text style={styles.fieldLabel}>{locale === 'uk' ? "Ім'я" : 'Name'}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={locale === 'uk' ? "Ваше ім'я" : 'Your name'}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
          maxLength={40}
        />
      </View>

      {/* Birth date */}
      <Text style={styles.fieldLabel}>{locale === 'uk' ? 'Дата народження' : 'Date of birth'}</Text>
      <View style={[styles.inputWrap, birthError ? styles.inputWrapError : null]}>
        <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={birth}
          onChangeText={formatBirth}
          placeholder={locale === 'uk' ? 'ДД.ММ.РРРР' : 'DD.MM.YYYY'}
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          maxLength={10}
        />
      </View>
      {birthError ? <Text style={styles.errorText}>{birthError}</Text> : null}

      {/* Info note */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.infoText}>
          {locale === 'uk' ? 'Дата народження використовується для розрахунку матриці долі та персоналізованих прогнозів.' : 'Date of birth is used to calculate the destiny matrix and personalized forecasts.'}
        </Text>
      </View>

      {/* Knowledge level */}
      <Text style={styles.fieldLabel}>{locale === 'uk' ? 'Рівень знань в езотериці' : 'Esoteric knowledge level'}</Text>
      <View style={styles.knowledgeRow}>
        {([
          { key: 'beginner' as const, icon: 'leaf-outline' as const, label: locale === 'uk' ? 'Початківець' : 'Beginner' },
          { key: 'intermediate' as const, icon: 'compass-outline' as const, label: locale === 'uk' ? 'Середній' : 'Intermediate' },
          { key: 'advanced' as const, icon: 'star-outline' as const, label: locale === 'uk' ? 'Досвідчений' : 'Advanced' },
        ]).map((lv) => {
          const active = knowledgeLevel === lv.key;
          return (
            <TouchableOpacity
              key={lv.key}
              style={[styles.knowledgeChip, active && styles.knowledgeChipActive]}
              activeOpacity={0.7}
              onPress={() => setKnowledgeLevel(lv.key)}
            >
              <Ionicons name={lv.icon} size={16} color={active ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.knowledgeChipText, active && styles.knowledgeChipTextActive]}>{lv.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save button */}
      <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={{ marginTop: Spacing.xl }}>
        <LinearGradient
          colors={saved ? ['#16a34a', '#15803d'] : [Colors.primary, Colors.primaryDark ?? '#6D28D9']}
          style={styles.saveBtn}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saved ? (locale === 'uk' ? 'Збережено!' : 'Saved!') : (locale === 'uk' ? 'Зберегти зміни' : 'Save changes')}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Danger zone */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerTitle}>{locale === 'uk' ? 'Небезпечна зона' : 'Danger Zone'}</Text>
        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={deleting}
          activeOpacity={0.8}
          style={[styles.deleteBtn, deleting && { opacity: 0.5 }]}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
          <Text style={styles.deleteBtnText}>
            {deleting
              ? (locale === 'uk' ? 'Видалення...' : 'Deleting...')
              : (locale === 'uk' ? 'Видалити акаунт' : 'Delete Account')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.dangerNote}>
          {locale === 'uk'
            ? 'Усі дані буде безповоротно видалено.'
            : 'All data will be permanently removed.'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 60 },

  avatarWrap: { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.md },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: Colors.text, fontSize: 36, fontWeight: '800' },

  fieldLabel: {
    color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: Spacing.md,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    marginBottom: 4,
  },
  inputWrapError: { borderColor: Colors.error },
  inputIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1, color: Colors.text, fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  errorText: { color: Colors.error, fontSize: FontSize.xs, marginBottom: 4 },

  knowledgeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  knowledgeChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  knowledgeChipActive: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderColor: 'rgba(139,92,246,0.4)',
  },
  knowledgeChipText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  knowledgeChipTextActive: { color: Colors.primary },

  infoNote: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },
  infoText: { flex: 1, color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md,
  },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  dangerZone: {
    marginTop: Spacing.xxl ?? 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.2)',
    paddingTop: Spacing.lg,
  },
  dangerTitle: {
    color: Colors.error,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(239,68,68,0.07)',
  },
  deleteBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: '600' },
  dangerNote: {
    marginTop: Spacing.sm,
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});
