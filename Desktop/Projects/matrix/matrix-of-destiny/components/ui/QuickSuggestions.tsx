// ─────────────────────────────────────────────────────────────────────────────
// QuickSuggestions — horizontal chip list shown above the chat input.
// Tapping a chip fills it as input (or can send immediately via onSelect).
// Shown only when the chat is empty so it doesn't clutter ongoing conversation.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

interface Props {
  onSelect: (text: string) => void;
  hasMatrix: boolean;
}

export function QuickSuggestions({ onSelect, hasMatrix }: Props) {
  const { locale } = useI18n();
  const isUk = locale === 'uk';

  const suggestions = isUk
    ? [
        hasMatrix ? 'Проаналізуй мою матрицю долі' : 'Що таке Матриця Долі і як її розрахувати?',
        'Яка енергія дня сьогодні і як її використати?',
        'Розкажи про моє призначення та таланти',
        'Поради на сьогодні',
        'Розшифруй енергію 7 (Колісниця)',
        'Як підвищити рівень енергії?',
      ]
    : [
        hasMatrix ? 'Analyze my destiny matrix' : 'What is Matrix of Destiny and how to calculate it?',
        'What is today\'s energy and how to use it?',
        'Tell me about my purpose and talents',
        'Advice for today',
        'Decode energy 7 (The Chariot)',
        'How to raise my energy level?',
      ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {suggestions.map((s) => (
        <TouchableOpacity key={s} style={styles.chip} activeOpacity={0.7} onPress={() => onSelect(s)}>
          <Text style={styles.chipText} numberOfLines={1}>{s}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 44 },
  container: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.28)',
    marginRight: Spacing.sm,
  },
  chipText: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
