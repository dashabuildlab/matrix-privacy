import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing, FontSize } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'gold' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  testID,
}: ButtonProps) {

  // ── Gold gradient button (primary CTA) ──────────────────
  if (variant === 'gold') {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={style}>
        <LinearGradient
          colors={['#C8901A', '#F5C542', '#C8901A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, Platform.OS === 'web' && styles.buttonWeb, styles.goldShadow, disabled && styles.disabled]}
        >
          {loading
            ? <ActivityIndicator color="#1A0A00" />
            : <Text style={[styles.textGold, Platform.OS === 'web' && styles.textWeb]} numberOfLines={1}>{title}</Text>}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // ── Purple gradient button (secondary CTA) ───────────────
  if (variant === 'primary') {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} disabled={disabled || loading} activeOpacity={0.85} style={style}>
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, Platform.OS === 'web' && styles.buttonWeb, styles.primaryShadow, disabled && styles.disabled]}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={[styles.textPrimary, Platform.OS === 'web' && styles.textWeb]} numberOfLines={1}>{title}</Text>}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // ── Secondary / Ghost ────────────────────────────────────
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        Platform.OS === 'web' && styles.buttonWeb,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost'     && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={Colors.accent} />
        : (
          <Text style={[
            styles.textPrimary,
            Platform.OS === 'web' && styles.textWeb,
            variant === 'secondary' && styles.textSecondary,
            variant === 'ghost'     && styles.textGhost,
          ]} numberOfLines={1}>
            {title}
          </Text>
        )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonWeb: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    minHeight: 64,
  },
  textWeb: {
    fontSize: FontSize.lg,
    letterSpacing: 0.6,
  },
  goldShadow: {
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  primaryShadow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  secondary: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  textPrimary: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textGold: {
    color: '#1A0A00',
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  textSecondary: {
    color: Colors.accent,
  },
  textGhost: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
});
