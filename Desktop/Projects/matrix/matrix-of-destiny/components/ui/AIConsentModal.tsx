import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

interface AIConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function AIConsentModal({ visible, onAccept, onDecline }: AIConsentModalProps) {
  const { locale } = useI18n();
  const isUk = locale === 'uk';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={28} color="#F5C542" />
          </View>
          <Text style={styles.title}>
            {isUk ? 'АІ Провідник' : 'AI Guide'}
          </Text>
          <Text style={styles.body}>
            {isUk
              ? 'АІ Провідник використовує штучний інтелект для формування максимально точного розбору на основі ваших карт та Матриці Долі.'
              : 'AI Guide uses artificial intelligence to create a precise analysis based on your cards and Destiny Matrix.'}
          </Text>
          <TouchableOpacity onPress={onAccept} activeOpacity={0.85} style={{ width: '100%' }}>
            <LinearGradient
              colors={['#C8901A', '#F5C542', '#C8901A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.acceptBtn}
            >
              <Text style={styles.acceptText}>
                {isUk ? 'Погоджуюсь · Продовжити' : 'I agree · Continue'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDecline} style={styles.declineBtn}>
            <Text style={styles.declineText}>
              {isUk ? 'Скасувати' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: '#1A1040',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.2)',
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(245,197,66,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  acceptBtn: {
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#1A0800',
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  declineBtn: {
    marginTop: Spacing.md,
    paddingVertical: 8,
  },
  declineText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
});
