import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Dimensions,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { getEnergyById } from '@/constants/energies';
import { getDailyEnergy, calculateMatrix } from '@/lib/matrix-calc';
import { MatrixDiagram } from '@/components/matrix/MatrixDiagram';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');
const CARD_W = width - Spacing.lg * 2;

const AFFIRMATIONS_UK = [
  'Я відкритий до всіх можливостей, які несе цей день',
  'Я живу у гармонії з собою та Всесвітом',
  'Мої таланти та здібності приносять користь світу',
  'Я достатній, щоб здійснити свої мрії',
  'Любов і достаток течуть у моє життя природно',
  'Я відпускаю минуле та приймаю нові можливості',
  'Кожен день — це подарунок та новий початок',
  'Я сильний, мудрий та повний любові',
];

const AFFIRMATIONS_EN = [
  'I am open to all the possibilities this day brings',
  'I live in harmony with myself and the Universe',
  'My talents and abilities benefit the world',
  'I am enough to fulfill my dreams',
  'Love and abundance flow into my life naturally',
  'I release the past and embrace new opportunities',
  'Every day is a gift and a fresh start',
  'I am strong, wise, and full of love',
];

export default function ShareScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cardRef = useRef<ViewShot>(null);

  const CARD_TYPES = [
    { id: 'energy', label: t.share.energyOfDay, icon: 'flash-outline' as const, gradient: ['#1E1B4B', '#4338CA'] as [string, string] },
    { id: 'affirmation', label: t.share.affirmation, icon: 'heart-outline' as const, gradient: ['#831843', '#BE185D'] as [string, string] },
    { id: 'matrix', label: t.share.matrix, icon: 'grid-outline' as const, gradient: ['#1E1B4B', '#4C1D95'] as [string, string] },
  ];

  const [selectedType, setSelectedType] = useState('energy');
  const [matrixGenerated, setMatrixGenerated] = useState(false);
  const AFFIRMATIONS = locale === 'uk' ? AFFIRMATIONS_UK : AFFIRMATIONS_EN;
  const [affirmationIndex] = useState(() => Math.floor(Math.random() * AFFIRMATIONS_UK.length));
  const affirmation = AFFIRMATIONS[affirmationIndex];
  const userName = useAppStore((s) => s.userName);
  const dailyEnergyId = getDailyEnergy();
  const energy = getEnergyById(dailyEnergyId);
  const savedMatrices = useAppStore((s) => s.savedMatrices);
  const myMatrix = savedMatrices[0];

  const getShareText = () => {
    switch (selectedType) {
      case 'energy':
        return `✨ ${locale === 'uk' ? 'Енергія дня' : 'Energy of the Day'}: ${dailyEnergyId}. ${energy?.name}\n\n"${energy?.advice}"\n\n🔮 Matrix of Destiny`;
      case 'affirmation':
        return `💫 ${locale === 'uk' ? 'Афірмація дня' : 'Affirmation'}:\n\n"${affirmation}"\n\n🔮 Matrix of Destiny`;
      case 'matrix':
        return myMatrix
          ? `🌟 ${locale === 'uk' ? 'Моя матриця долі' : 'My Matrix of Destiny'} — ${locale === 'uk' ? 'число особистості' : 'personality number'} ${myMatrix.data.personality}\n\n${locale === 'uk' ? 'Відкрий свою матрицю в' : 'Discover your matrix in'} Matrix of Destiny!`
          : `🌟 ${locale === 'uk' ? 'Дізнайся свою матрицю долі в' : 'Discover your destiny matrix in'} Matrix of Destiny!`;
      default:
        return '🔮 Matrix of Destiny';
    }
  };

  /** Capture the card as an image and share via native share sheet (includes Instagram) */
  const handleShare = async () => {
    if (Platform.OS === 'web') {
      // Web: just share text
      try {
        await Share.share({ message: getShareText(), title: 'Matrix of Destiny' });
      } catch {}
      return;
    }

    try {
      // Capture card as image
      const uri = await (cardRef.current as any)?.capture?.();
      if (!uri) {
        await Share.share({ message: getShareText(), title: 'Matrix of Destiny' });
        return;
      }

      // Share the image — this opens the native share sheet (Instagram, Telegram, etc.)
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Matrix of Destiny',
          UTI: 'public.png',
        });
      } else {
        await Share.share({ message: getShareText(), title: 'Matrix of Destiny' });
      }
    } catch (err) {
      console.warn('Share error:', err);
      // Fallback
      try {
        await Share.share({ message: getShareText(), title: 'Matrix of Destiny' });
      } catch {}
    }
  };

  const renderCard = () => {
    switch (selectedType) {
      case 'energy':
        return (
          <LinearGradient colors={['#1E1B4B', '#4338CA', '#6D28D9']} style={styles.shareCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.shareCardBrandInline}>Matrix of Destiny</Text>
            <View style={styles.energyNumber}>
              <Text style={styles.energyNumText}>{dailyEnergyId}</Text>
            </View>
            <Text style={styles.shareCardTitle}>{energy?.name}</Text>
            <Text style={styles.shareCardSubtitle}>{t.share.energyOfDay}</Text>
            <Text style={styles.shareCardText} numberOfLines={2}>"{energy?.advice}"</Text>
            <View style={styles.shareCardKeywords}>
              {energy?.keywords.slice(0, 3).map((kw) => (
                <View key={kw} style={styles.shareKeyword}>
                  <Text style={styles.shareKeywordText}>{kw}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.shareCardDateInline}>{new Date().toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </LinearGradient>
        );

      case 'affirmation':
        return (
          <LinearGradient colors={['#831843', '#BE185D', '#EC4899']} style={styles.shareCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.shareCardBrandInline}>Matrix of Destiny</Text>
            <Text style={styles.affirmationEmoji}>💫</Text>
            <Text style={styles.affirmationLabel}>{locale === 'uk' ? 'Афірмація дня' : 'Affirmation'}</Text>
            <Text style={styles.affirmationText} numberOfLines={3}>"{affirmation}"</Text>
            <Text style={styles.shareCardDateInline}>{new Date().toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </LinearGradient>
        );

      case 'matrix': {
        if (!matrixGenerated) {
          return (
            <LinearGradient colors={['#1E1B4B', '#4C1D95', '#6D28D9']} style={styles.shareCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.shareCardBrand}>Matrix of Destiny</Text>
              <Ionicons name="sparkles" size={48} color="rgba(168,132,252,0.6)" />
              <Text style={styles.shareCardTitle}>{locale === 'uk' ? 'Матриця дня' : 'Matrix of the Day'}</Text>
              <Text style={styles.shareCardText}>{locale === 'uk' ? 'Згенеруйте матрицю дня щоб поділитися нею' : 'Generate daily matrix to share'}</Text>
              <TouchableOpacity
                style={styles.generateMatrixBtn}
                onPress={() => setMatrixGenerated(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={18} color="#FFF" />
                <Text style={styles.generateMatrixBtnText}>{locale === 'uk' ? 'Згенерувати матрицю' : 'Generate Matrix'}</Text>
              </TouchableOpacity>
            </LinearGradient>
          );
        }
        const todayStr = new Date().toISOString().split('T')[0];
        const dailyMatrix = calculateMatrix(todayStr);
        return (
          <LinearGradient colors={['#1E1B4B', '#4C1D95', '#6D28D9']} style={styles.shareCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.shareCardBrand}>Matrix of Destiny</Text>
            <Text style={styles.shareCardSubtitle}>{locale === 'uk' ? 'Матриця дня' : 'Matrix of the Day'}</Text>
            <View style={{ width: 180, height: 180 }}>
              <MatrixDiagram data={dailyMatrix} size={180} />
            </View>
            <View style={styles.matrixNumbers}>
              <View style={styles.matrixNumItem}>
                <Text style={styles.matrixNumValue}>{dailyMatrix.personality}</Text>
                <Text style={styles.matrixNumLabel}>{locale === 'uk' ? 'Особистість' : 'Personality'}</Text>
              </View>
              <View style={styles.matrixNumItem}>
                <Text style={styles.matrixNumValue}>{dailyMatrix.destiny}</Text>
                <Text style={styles.matrixNumLabel}>{locale === 'uk' ? 'Доля' : 'Destiny'}</Text>
              </View>
              <View style={styles.matrixNumItem}>
                <Text style={styles.matrixNumValue}>{dailyMatrix.talentFromGod}</Text>
                <Text style={styles.matrixNumLabel}>{locale === 'uk' ? 'Талант' : 'Talent'}</Text>
              </View>
            </View>
            <Text style={styles.shareCardDateInline}>{new Date().toLocaleDateString(locale === 'uk' ? 'uk-UA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </LinearGradient>
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card type selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          <View style={styles.typeRow}>
            {CARD_TYPES.map((ct) => (
              <TouchableOpacity
                key={ct.id}
                style={[styles.typeChip, selectedType === ct.id && styles.typeChipActive]}
                onPress={() => setSelectedType(ct.id)}
              >
                <Ionicons name={ct.icon} size={16} color={selectedType === ct.id ? Colors.text : Colors.textMuted} />
                <Text style={[styles.typeChipText, selectedType === ct.id && styles.typeChipTextActive]}>
                  {ct.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Preview card wrapped in ViewShot for image capture */}
        <View style={styles.preview}>
          <ViewShot ref={cardRef} options={{ format: 'png', quality: 1.0 }}>
            {renderCard()}
          </ViewShot>
        </View>

        {/* Info */}
        <Card style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.infoText}>
            {t.share.shareHint}
          </Text>
        </Card>

        {/* Single share button */}
        <TouchableOpacity style={styles.mainShareBtn} onPress={handleShare} activeOpacity={0.8}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.mainShareGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="share-social-outline" size={22} color="#FFFFFF" />
            <Text style={styles.mainShareText}>{locale === 'uk' ? 'Поділитися' : 'Share'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 20, paddingTop: 16 },
  closeBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 16, right: Spacing.lg, zIndex: 10,
  },
  closeBtnInner: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },

  typeScroll: { marginTop: Spacing.sm },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingRight: 56,
    paddingBottom: Spacing.md,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  typeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  typeChipText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  typeChipTextActive: { color: Colors.text },

  preview: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  shareCard: {
    width: CARD_W,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 280,
    justifyContent: 'center',
  },
  shareCardBrand: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.lg,
  },
  shareCardBrandInline: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  energyNumber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  energyNumText: {
    color: Colors.accent,
    fontSize: FontSize.xxl,
    fontWeight: '900',
  },
  shareCardTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  shareCardSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  shareCardText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  shareCardKeywords: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  shareKeyword: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  shareKeywordText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.xs,
  },
  shareCardDateInline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    marginTop: 4,
  },

  affirmationEmoji: { fontSize: 40 },
  affirmationLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  affirmationText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
  },

  generateMatrixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139,92,246,0.4)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.5)',
  },
  generateMatrixBtnText: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  matrixNumbers: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.sm,
  },
  matrixNumItem: { alignItems: 'center', gap: 4 },
  matrixNumValue: {
    color: Colors.accent,
    fontSize: FontSize.xxl,
    fontWeight: '900',
  },
  matrixNumLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.xs,
  },

  infoCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    flex: 1,
  },

  mainShareBtn: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  mainShareGradient: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  mainShareText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
