import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface PremiumLockOverlayProps {
  visible: boolean;
  title?: string;
  description?: string;
  onUnlock: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function PremiumLockOverlay({ visible, title, description, onUnlock, children, style }: PremiumLockOverlayProps) {
  return (
    <View style={[styles.container, style]}>
      {children}
      {visible && (
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['rgba(13,11,30,0.3)', 'rgba(13,11,30,0.85)', 'rgba(13,11,30,0.97)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.lockContent}>
            <View style={styles.lockIconWrap}>
              <Ionicons name="lock-closed" size={22} color="#F5C542" />
            </View>
            {title && <Text style={styles.lockTitle}>{title}</Text>}
            {description && <Text style={styles.lockDesc}>{description}</Text>}
            <TouchableOpacity onPress={onUnlock} activeOpacity={0.85}>
              <LinearGradient
                colors={['#C8901A', '#F5C542', '#C8901A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.unlockBtn}
              >
                <Ionicons name="diamond" size={14} color="#1A0800" />
                <Text style={styles.unlockBtnText}>Premium</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', overflow: 'hidden', borderRadius: BorderRadius.lg },
  lockContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  lockIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(245,197,66,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  lockTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  lockDesc: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  unlockBtnText: {
    color: '#1A0800',
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
