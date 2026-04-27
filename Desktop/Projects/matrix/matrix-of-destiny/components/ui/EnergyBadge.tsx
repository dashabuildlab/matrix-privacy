import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, BorderRadius, FontSize } from '@/constants/theme';
import { getEnergyById } from '@/constants/energies';

/** Same palette as MatrixDiagram */
const ENERGY_COLORS: Record<number, string> = {
  1: '#EF4444', 2: '#818CF8', 3: '#10B981', 4: '#B91C1C',
  5: '#6B7280', 6: '#FB7185', 7: '#F97316', 8: '#F59E0B',
  9: '#6B7280', 10: '#EAB308', 11: '#F59E0B', 12: '#3B82F6',
  13: '#374151', 14: '#14B8A6', 15: '#DC2626', 16: '#F97316',
  17: '#60A5FA', 18: '#818CF8', 19: '#D4A017', 20: '#7C8A96',
  21: '#A78BFA', 22: '#6B7280',
};

const LIGHT_ENERGIES = new Set([8, 10, 11, 19]);

function getColor(id: number) {
  return ENERGY_COLORS[id] ?? Colors.primary;
}

interface EnergyBadgeProps {
  energyId: number;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  showName?: boolean;
}

export function EnergyBadge({
  energyId,
  size = 'md',
  onPress,
  showName = false,
}: EnergyBadgeProps) {
  const energy = getEnergyById(energyId);
  const dim = size === 'sm' ? 36 : size === 'md' ? 48 : 64;
  const color = getColor(energyId);
  const isLight = LIGHT_ENERGIES.has(energyId);

  const content = (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: color + '20',
            borderColor: color,
          },
        ]}
      >
        <Text
          style={[
            styles.number,
            {
              fontSize: size === 'sm' ? FontSize.sm : size === 'md' ? FontSize.lg : FontSize.xl,
              color: color,
            },
          ]}
        >
          {energyId}
        </Text>
      </View>
      {showName && energy && (
        <Text style={styles.name} numberOfLines={1}>
          {energy.name}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontWeight: '700',
  },
  name: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    maxWidth: 80,
    textAlign: 'center',
  },
});
