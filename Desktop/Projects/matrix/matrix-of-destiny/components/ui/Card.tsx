import React from 'react';
import { StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BorderRadius, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'gold' | 'glow';
}

export function Card({ children, style, variant = 'default' }: CardProps) {
  return (
    <LinearGradient
      colors={['rgba(35, 16, 72, 0.88)', 'rgba(18, 8, 45, 0.88)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        Platform.OS === 'web' && styles.cardWeb,
        variant === 'gold'  && styles.goldBorder,
        variant === 'glow'  && styles.glowBorder,
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 66, 0.28)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 6,
  },
  cardWeb: {
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  goldBorder: {
    borderColor: 'rgba(245, 197, 66, 0.65)',
    shadowColor: '#F5C542',
    shadowOpacity: 0.35,
  },
  glowBorder: {
    borderColor: 'rgba(139, 92, 246, 0.70)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.45,
  },
});
