/**
 * AI Scan & Higher Self — «Сканування Долі»
 * Flow: фото + дата → Claude Vision аналіз → текстовий портрет Вищого Я
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Animated,
  ScrollView, Platform, Alert, Dimensions, ActivityIndicator,
  TextInput as RNTextInput, Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { StarBackground } from '@/components/ui/StarBackground';
import { useAppStore } from '@/stores/useAppStore';
import { useI18n } from '@/lib/i18n';
import { getIdToken } from '@/lib/firebaseAuth';

const { width: SW } = Dimensions.get('window');
const API_BASE = Platform.OS === 'web' ? '' : 'https://yourmatrixofdestiny.com';
const PHOTO_SIZE = Math.min(SW - Spacing.lg * 2, 340);

const SCAN_STEPS_UK = [
  'Аналізую риси обличчя...',
  'Розраховую матрицю долі...',
  'Визначаю Аркан Душі...',
  'Формую опис Вищого Я...',
];
const SCAN_STEPS_EN = [
  'Analyzing facial features...',
  'Calculating destiny matrix...',
  'Determining Soul Arcana...',
  'Composing Higher Self portrait...',
];

interface ScanResult {
  arcanaId: number;
  arcanaName: string;
  description: string;
}

type Step = 'photo' | 'processing' | 'result';

export default function AiScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale } = useI18n();
  const isUk = locale === 'uk';
  const userBirthDate = useAppStore((s) => s.userBirthDate);
  const isPremium = useAppStore((s) => s.isPremium);

  const [step, setStep] = useState<Step>('photo');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState(userBirthDate ?? '');
  const [scanStepIdx, setScanStepIdx] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(0.3)).current;
  const resultFade   = useRef(new Animated.Value(0)).current;
  const scanLoopRef  = useRef<Animated.CompositeAnimation | null>(null);
  const stepTimer    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step !== 'processing') return;

    scanLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1600, useNativeDriver: false }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    scanLoopRef.current.start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    setScanStepIdx(0);
    stepTimer.current = setInterval(() => {
      setScanStepIdx((i) => {
        const steps = isUk ? SCAN_STEPS_UK : SCAN_STEPS_EN;
        return Math.min(i + 1, steps.length - 1);
      });
    }, 4000);

    return () => {
      scanLoopRef.current?.stop();
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, [step]);

  useEffect(() => {
    if (step === 'result') {
      Animated.timing(resultFade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [step]);

  // ── Photo picker ────────────────────────────────────────────────────────
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(isUk ? 'Доступ заборонено' : 'Permission denied',
        isUk ? 'Потрібен доступ до галереї фото.' : 'Photo library access is required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(isUk ? 'Доступ заборонено' : 'Permission denied',
        isUk ? 'Потрібен доступ до камери.' : 'Camera access is required.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

  const showPhotoPicker = () => {
    if (Platform.OS === 'web') { pickFromGallery(); return; }
    Alert.alert(isUk ? 'Оберіть фото' : 'Choose photo', '', [
      { text: isUk ? 'Зробити селфі' : 'Take selfie', onPress: pickFromCamera },
      { text: isUk ? 'З галереї' : 'From gallery', onPress: pickFromGallery },
      { text: isUk ? 'Скасувати' : 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Start scan ──────────────────────────────────────────────────────────
  const startScan = async () => {
    if (!isPremium) {
      Alert.alert(
        isUk ? 'Преміум функція' : 'Premium Feature',
        isUk ? 'AI-сканування Долі доступне з Premium підпискою' : 'AI Destiny Scan is available with a Premium subscription',
        [
          { text: isUk ? 'Отримати Premium' : 'Get Premium', onPress: () => router.push('/paywall' as any) },
          { text: isUk ? 'Закрити' : 'Close', style: 'cancel' },
        ]
      );
      return;
    }

    let date = birthDate || userBirthDate || '';

    // Нормалізуємо формат: DD.MM.YYYY → YYYY-MM-DD
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
      const [d, m, y] = date.split('.');
      date = `${y}-${m}-${d}`;
    }

    if (!photoUri || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert(isUk ? 'Заповніть всі поля' : 'Fill in all fields',
        isUk ? 'Потрібні фото та дата народження' : 'Photo and birth date required');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const token = await getIdToken();
      const form = new FormData();

      if (Platform.OS === 'web') {
        const blob = await (await fetch(photoUri)).blob();
        form.append('photo', blob, 'photo.jpg');
      } else {
        // @ts-ignore
        form.append('photo', { uri: photoUri, type: 'image/jpeg', name: 'photo.jpg' });
      }
      form.append('birthDate', date);

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);

      const response = await fetch(`${API_BASE}/api/ai-scan`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${response.status}`);
      }

      setResult(await response.json());
      setStep('result');
    } catch (e: any) {
      setError(e?.message ?? 'Error');
      setStep('photo');
      Alert.alert(
        isUk ? 'Помилка' : 'Error',
        e?.message || (isUk ? 'Щось пішло не так.' : 'Something went wrong.')
      );
    }
  };

  // ── Share ────────────────────────────────────────────────────────────────
  const handleShare = () => {
    if (!result) return;
    const text = isUk
      ? `🔮 Мій Аркан Душі — ${result.arcanaId}. ${result.arcanaName}\n\n${result.description}\n\n✨ Matrix of Destiny`
      : `🔮 My Soul Arcana — ${result.arcanaId}. ${result.arcanaName}\n\n${result.description}\n\n✨ Matrix of Destiny`;
    Share.share({ message: text, title: 'Matrix of Destiny' });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {step === 'photo' && (
        <PhotoStep
          isUk={isUk} insets={insets} photoUri={photoUri}
          birthDate={birthDate} setBirthDate={setBirthDate}
          userBirthDate={userBirthDate} onShowPicker={showPhotoPicker}
          onScan={startScan} onBack={() => router.back()} error={error}
        />
      )}
      {step === 'processing' && (
        <ProcessingStep
          isUk={isUk} insets={insets} photoUri={photoUri!}
          scanLineAnim={scanLineAnim} pulseAnim={pulseAnim}
          scanStepText={(isUk ? SCAN_STEPS_UK : SCAN_STEPS_EN)[scanStepIdx]}
        />
      )}
      {step === 'result' && (
        <ResultStep
          isUk={isUk} insets={insets} photoUri={photoUri!}
          result={result!} fadeAnim={resultFade}
          onShare={handleShare}
          onRedo={() => { setResult(null); setPhotoUri(null); setStep('photo'); }}
          onBack={() => router.back()}
        />
      )}
    </>
  );
}

// ── Step 1: Фото + дата ───────────────────────────────────────────────────────
function PhotoStep({ isUk, insets, photoUri, birthDate, setBirthDate, userBirthDate, onShowPicker, onScan, onBack, error }: any) {
  const canScan = !!photoUri && !!(birthDate || userBirthDate);
  return (
    <StarBackground style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.photoContent, { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Хедер */}
        <View style={s.header}>
          <TouchableOpacity testID="scan-back-btn" onPress={onBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isUk ? 'AI-сканування долі' : 'Destiny AI Scan'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Опис фічі */}
        <View style={s.descSection}>
          <Text style={s.descSectionText}>
            {isUk
              ? 'Завантажте своє фото — AI проаналізує риси обличчя, розрахує Аркан Душі за датою народження і складе персональний опис вашого Вищого Я.'
              : 'Upload your photo — AI analyzes your facial features, calculates your Soul Arcana by birth date, and composes a personal description of your Higher Self.'}
          </Text>
        </View>

        {/* Блоки цінності */}
        <View style={s.valueSection}>
          {(isUk ? [
            { ionicon: 'layers-outline' as const,    title: 'Аркан душі',         desc: 'Один з 22 архетипів Матриці Долі, що визначає вашу глибинну природу і таланти' },
            { ionicon: 'person-outline' as const,    title: 'Портрет вищого я',   desc: 'Персональний опис від AI: які якості і сили закладені у вас від народження' },
            { ionicon: 'eye-outline' as const,       title: 'Читання обличчя',    desc: 'AI зчитує погляд, вираз і риси та зіставляє їх з вашим архетипом' },
          ] : [
            { ionicon: 'layers-outline' as const,    title: 'Soul arcana',        desc: 'One of 22 archetypes from the Destiny Matrix that defines your true nature and talents' },
            { ionicon: 'person-outline' as const,    title: 'Higher self portrait', desc: 'A personal AI description: what qualities and strengths you were born with' },
            { ionicon: 'eye-outline' as const,       title: 'Face reading',       desc: 'AI reads your gaze, expression and features and matches them to your archetype' },
          ]).map((item) => (
            <View key={item.title} style={s.valueCard}>
              <View style={s.valueCardIcon}>
                <Ionicons name={item.ionicon} size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.valueCardTitle}>{item.title}</Text>
                <Text style={s.valueCardDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Фото */}
        <Text style={s.fieldLabel}>{isUk ? 'Ваше фото' : 'Your photo'}</Text>
        <TouchableOpacity testID="scan-add-photo-btn" activeOpacity={0.8} onPress={onShowPicker} style={s.photoPicker}>
          {photoUri ? (
            <>
              <Image source={{ uri: photoUri }} style={s.photoPreview} />
              <View style={s.photoOverlay}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={s.photoOverlayText}>{isUk ? 'Змінити фото' : 'Change photo'}</Text>
              </View>
            </>
          ) : (
            <LinearGradient colors={['rgba(91,33,182,0.2)', 'rgba(30,15,65,0.45)']} style={s.photoEmpty}>
              <View style={s.photoIcon}>
                <Ionicons name="camera-outline" size={36} color={Colors.accent} />
              </View>
              <Text style={s.photoEmptyTitle}>{isUk ? 'Додати фото' : 'Add photo'}</Text>
              <Text style={s.photoEmptyHint}>
                {isUk ? 'Зробіть селфі або виберіть з галереї' : 'Take a selfie or choose from gallery'}
              </Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* Вимоги до фото */}
        <View style={s.instructions}>
          <View style={s.instrRow}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#22C55E" />
            <Text style={s.instrText}>{isUk ? 'Чітке обличчя, дивитись у камеру' : 'Clear face, looking at camera'}</Text>
          </View>
          <View style={s.instrRow}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#22C55E" />
            <Text style={s.instrText}>{isUk ? 'Хороше рівномірне освітлення' : 'Good, even lighting'}</Text>
          </View>
          <View style={s.instrRow}>
            <Ionicons name="alert-circle-outline" size={15} color={Colors.textMuted} />
            <Text style={s.instrText}>{isUk ? 'Бажано без маски, окулярів і головного убору' : 'Preferably no mask, glasses, or hat'}</Text>
          </View>
        </View>

        {/* Дата народження */}
        {!userBirthDate ? (
          <View style={s.dateBlock}>
            <Text style={s.fieldLabel}>{isUk ? 'Дата народження' : 'Date of birth'}</Text>
            <Text style={s.fieldHint}>
              {isUk
                ? 'Потрібна для розрахунку Аркану Душі за Матрицею Долі'
                : 'Required to calculate your Soul Arcana from the Destiny Matrix'}
            </Text>
            <View style={s.dateInputRow}>
              <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
              <RNTextInput
                testID="scan-birthdate-input"
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder={isUk ? 'рррр-мм-дд, напр. 1990-05-21' : 'yyyy-mm-dd, e.g. 1990-05-21'}
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                style={s.dateInput}
              />
            </View>
          </View>
        ) : (
          <View style={s.datePrefilled}>
            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
            <Text style={s.datePrefText}>
              {isUk
                ? `Дата народження: ${userBirthDate}`
                : `Date of birth: ${userBirthDate}`}
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity testID="scan-start-btn" activeOpacity={0.85} onPress={onScan} disabled={!canScan} style={{ opacity: canScan ? 1 : 0.4 }}>
          <LinearGradient
            colors={[Colors.accentDark, Colors.accent]}
            style={s.scanBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Ionicons name="scan-outline" size={20} color="#1A0A00" />
            <Text style={s.scanBtnText}>{isUk ? 'Запустити сканування' : 'Start scanning'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {error && (
          <View testID="scan-error-msg" style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </StarBackground>
  );
}

// ── Step 2: Анімація обробки ──────────────────────────────────────────────────
function ProcessingStep({ isUk, insets, photoUri, scanLineAnim, pulseAnim, scanStepText }: any) {
  return (
    <View testID="scan-processing-view" style={[s.processingRoot, { paddingTop: insets.top + 32 }]}>
      <Text style={s.processingTitle}>{isUk ? 'Аналіз...' : 'Analyzing...'}</Text>

      <View style={s.scanContainer}>
        <Image source={{ uri: photoUri }} style={s.scanPhoto} />

        {/* Scan line */}
        <Animated.View style={[s.scanLine, {
          top: scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, PHOTO_SIZE - 3] })
        }]} />

        {/* Corner brackets */}
        <View style={[s.corner, s.cTL]} /><View style={[s.corner, s.cTR]} />
        <View style={[s.corner, s.cBL]} /><View style={[s.corner, s.cBR]} />

        {/* Pulse border */}
        <Animated.View style={[s.scanBorder, { opacity: pulseAnim }]} />

        <View style={s.centerBadge}>
          <Ionicons name="scan-outline" size={22} color={Colors.accent} />
        </View>
      </View>

      <View style={s.statusBox}>
        <ActivityIndicator size="small" color={Colors.accent} />
        <Text style={s.statusText}>{scanStepText}</Text>
      </View>

      <Text style={s.disclaimer}>
        {isUk ? 'Не закривай екран — займе ~10–20 сек' : 'Keep screen open — takes ~10–20 sec'}
      </Text>
    </View>
  );
}

// ── Step 3: Результат ─────────────────────────────────────────────────────────
function ResultStep({ isUk, insets, photoUri, result, fadeAnim, onShare, onRedo, onBack }: any) {
  return (
    <StarBackground style={{ flex: 1 }}>
      <Animated.ScrollView
        testID="scan-result-view"
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={[s.resultContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isUk ? 'Твоє Вище Я' : 'Your Higher Self'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Photo + arcana overlay */}
        <View style={s.resultPhotoWrap}>
          <Image source={{ uri: photoUri }} style={s.resultPhoto} />
          <LinearGradient
            colors={['transparent', 'rgba(13,11,30,0.92)']}
            style={s.resultPhotoGrad}
          />
          <LinearGradient
            colors={[Colors.accentDark, Colors.accent]}
            style={s.resultArcanaBadge}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Text style={s.resultArcanaNum}>{result.arcanaId}</Text>
            <Text testID="scan-arcana-name" style={s.resultArcanaName}>{result.arcanaName}</Text>
          </LinearGradient>
        </View>

        {/* Description */}
        <LinearGradient
          colors={['rgba(91,33,182,0.3)', 'rgba(20,10,50,0.6)']}
          style={s.descCard}
        >
          <Text style={s.descLabel}>
            {isUk ? 'AI бачить у вас' : 'AI sees in you'}
          </Text>
          <Text testID="scan-description" style={s.descText}>{result.description}</Text>
        </LinearGradient>

        {/* Share */}
        <TouchableOpacity testID="scan-share-btn" activeOpacity={0.85} onPress={onShare}>
          <LinearGradient
            colors={[Colors.accentDark, Colors.accent]}
            style={s.shareBtn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            <Ionicons name="share-social-outline" size={20} color="#1A0A00" />
            <Text style={s.shareBtnText}>{isUk ? 'Поділитися' : 'Share'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity testID="scan-again-btn" onPress={onRedo} style={s.redoBtn}>
          <Ionicons name="refresh-outline" size={18} color={Colors.textMuted} />
          <Text style={s.redoText}>{isUk ? 'Зробити знову' : 'Scan again'}</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </StarBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  photoContent: { padding: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  backBtn: { padding: Spacing.xs },
  headerTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },

  // Опис фічі
  descSection: { marginBottom: Spacing.md },
  descSectionText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },

  // Мітка поля
  fieldLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 },
  fieldHint: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: Spacing.sm },

  // Блоки цінності
  valueSection: { marginBottom: Spacing.md, gap: 6 },
  valueCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
    padding: Spacing.sm,
  },
  valueCardIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  valueCardTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 1 },
  valueCardDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },

  // Фото picker
  photoPicker: {
    alignSelf: 'center', width: PHOTO_SIZE, height: PHOTO_SIZE,
    borderRadius: BorderRadius.xl, overflow: 'hidden', marginTop: Spacing.sm, marginBottom: Spacing.sm,
  },
  photoPreview: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: Spacing.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoOverlayText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '600' },
  photoEmpty: {
    width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: BorderRadius.xl,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(245,197,66,0.3)',
  },
  photoIcon: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(245,197,66,0.08)', borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  photoEmptyTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  photoEmptyHint: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', paddingHorizontal: Spacing.lg },

  // Вимоги до фото
  instructions: { marginBottom: Spacing.md, gap: 4 },
  instrRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  instrText: { color: Colors.textSecondary, fontSize: FontSize.xs },

  // Дата
  dateBlock: { marginBottom: Spacing.md },
  dateInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: 'rgba(245,197,66,0.2)',
    marginTop: 2,
  },
  dateInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm, paddingVertical: 12 },
  datePrefilled: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  datePrefText: { color: '#22C55E', fontSize: FontSize.sm },

  // Кнопка сканування
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 15, borderRadius: BorderRadius.full,
    marginTop: Spacing.sm, marginBottom: Spacing.sm,
  },
  scanBtnText: { color: '#1A0A00', fontSize: FontSize.md, fontWeight: '800' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  errorText: { color: '#EF4444', fontSize: FontSize.sm, flex: 1 },

  // Processing
  processingRoot: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', paddingHorizontal: Spacing.lg },
  processingTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.lg },
  scanContainer: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: BorderRadius.xl, overflow: 'hidden', position: 'relative', marginBottom: Spacing.lg },
  scanPhoto: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  scanLine: {
    position: 'absolute', left: 0, right: 0, height: 2,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8, elevation: 8,
  },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: Colors.accent, borderWidth: 2.5 },
  cTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanBorder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: BorderRadius.xl, borderWidth: 2, borderColor: Colors.accent },
  centerBadge: { position: 'absolute', top: '50%', left: '50%', marginLeft: -24, marginTop: -24, width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  statusBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(245,197,66,0.1)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.25)', marginBottom: Spacing.sm,
  },
  statusText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' },
  disclaimer: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },

  // Result
  resultContent: { padding: Spacing.lg },
  resultPhotoWrap: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md, position: 'relative' },
  resultPhoto: { width: '100%', aspectRatio: 1 },
  resultPhotoGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
  resultArcanaBadge: {
    position: 'absolute', bottom: Spacing.md, left: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  resultArcanaNum: { color: '#1A0A00', fontSize: FontSize.lg, fontWeight: '900' },
  resultArcanaName: { color: '#1A0A00', fontSize: FontSize.sm, fontWeight: '700' },

  descCard: {
    borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  descLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600', marginBottom: Spacing.sm },
  descText: { color: Colors.textSecondary, fontSize: FontSize.md, lineHeight: 26 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 15, borderRadius: BorderRadius.full, marginBottom: Spacing.sm,
  },
  shareBtnText: { color: '#1A0A00', fontSize: FontSize.md, fontWeight: '800' },
  redoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md },
  redoText: { color: Colors.textMuted, fontSize: FontSize.sm },
});
