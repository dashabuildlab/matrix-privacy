import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';
import { useAppStore } from '@/stores/useAppStore';
import { AIConsentModal } from './AIConsentModal';

interface AIGuideButtonProps {
  context: 'matrix';
  question?: string;
}

const CONSENT_KEY = 'ai_consent_accepted';

export function AIGuideButton({ context, question }: AIGuideButtonProps) {
  const { locale } = useI18n();
  const isUk = locale === 'uk';
  const router = useRouter();
  const isPremium = useAppStore((s) => s.isPremium);
  const [consentAccepted, setConsentAccepted] = useState<boolean | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setConsentAccepted(localStorage.getItem(CONSENT_KEY) === 'true');
    } else {
      import('../../lib/storage').then((SecureStore) => {
        SecureStore.getItemAsync(CONSENT_KEY).then((v) => setConsentAccepted(v === 'true'));
      });
    }
  }, []);

  const saveConsent = async () => {
    setConsentAccepted(true);
    if (Platform.OS === 'web') {
      localStorage.setItem(CONSENT_KEY, 'true');
    } else {
      const SecureStore = await import('../../lib/storage');
      await SecureStore.setItemAsync(CONSENT_KEY, 'true');
    }
  };

  const handlePress = () => {
    if (!isPremium) {
      router.push('/paywall' as any);
      return;
    }
    if (!consentAccepted) {
      setShowConsent(true);
      return;
    }
    navigateToChat();
  };

  const handleConsentAccept = async () => {
    await saveConsent();
    setShowConsent(false);
    navigateToChat();
  };

  const navigateToChat = () => {
    const contextMsg = isUk ? 'Проаналізуй мою Матрицю Дня детальніше' : 'Analyze my Matrix of the Day in more detail';
    const title = question?.trim()
      ? `${question.trim().substring(0, 40)}${question.trim().length > 40 ? '…' : ''}`
      : (isUk ? 'Аналіз розкладу' : 'Spread analysis');
    router.push({
      pathname: '/ai/chat',
      params: { initialQuestion: contextMsg, sessionTitle: title, context: 'matrix' },
    } as any);
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
        <LinearGradient
          colors={isPremium ? ['#1E0B55', '#2E1F80'] : ['#1A1040', '#1A1040']}
          style={styles.button}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={16} color={isPremium ? '#F5C542' : Colors.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, !isPremium && { color: Colors.textMuted }]}>
              {isUk ? 'Глибокий аналіз від Провідника' : 'Deep Analysis from Guide'}
            </Text>
            {!isPremium && (
              <Text style={styles.hint}>
                {isUk ? 'Доступно з Premium' : 'Available with Premium'}
              </Text>
            )}
          </View>
          <Ionicons
            name={isPremium ? 'arrow-forward' : 'lock-closed'}
            size={16}
            color={isPremium ? '#F5C542' : Colors.textMuted}
          />
        </LinearGradient>
      </TouchableOpacity>
      <AIConsentModal
        visible={showConsent}
        onAccept={handleConsentAccept}
        onDecline={() => setShowConsent(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    marginTop: Spacing.md,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(245,197,66,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  hint: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});
