// ─────────────────────────────────────────────────────────────────────────────
// DownloadAnalysisButton — generates full AI PDF analysis of a destiny matrix
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, ScrollView, Dimensions, AppState as RNAppState, Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useAppStore } from '@/stores/useAppStore';
import { trackFeatureUsed, FEATURES } from '@/lib/analytics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
import { MatrixData } from '@/lib/matrix-calc';
import { askClaude, ClaudeMessage } from '@/lib/claude';
import {
  DOCUMENT_SECTIONS,
  getSystemPrompt,
  buildDocumentHTML,
} from '@/lib/matrixDocument';

interface Props {
  matrixId?: string;
  matrixData: MatrixData;
  name: string;
  birthDate: string;
  locale?: string;
  isPremium?: boolean;
}

type Phase = 'idle' | 'generating' | 'printing' | 'done' | 'error';

export function DownloadAnalysisButton({ matrixId, matrixData, name, birthDate, locale = 'uk', isPremium = false }: Props) {
  // Check if there's a completed analysis waiting in store
  const pendingAnalysis = useAppStore(s => s.pendingAnalysis);
  const setPendingAnalysis = useAppStore(s => s.setPendingAnalysis);
  const clearPendingAnalysis = useAppStore(s => s.clearPendingAnalysis);
  const effectiveId = matrixId || `${name}_${birthDate}`;

  const [modalVisible, setModalVisible] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentSection, setCurrentSection] = useState(0);
  // Cache generated section texts so re-download doesn't need new AI calls
  const [cachedSections, setCachedSections] = useState<string[] | null>(null);
  // Track if background retry is running after error
  const [retryingInBackground, setRetryingInBackground] = useState(false);
  const [debugError, setDebugError] = useState('');
  // Whether user opted to get notified (can leave app)
  const [notifyWhenDone, setNotifyWhenDone] = useState(false);

  // Restore completed analysis from store on mount
  useEffect(() => {
    if (pendingAnalysis?.matrixId === effectiveId && pendingAnalysis.status === 'done') {
      setCachedSections(pendingAnalysis.sections);
    }
  }, [pendingAnalysis, effectiveId]);

  // Refs to coordinate video end + generation end
  const videoEndedRef = useRef(false);
  const videoEndResolveRef = useRef<(() => void) | null>(null);

  const videoPlayer = useVideoPlayer(require('../../assets/matrix_create.mp4'), (p) => {
    p.loop = false;
    p.muted = false;
  });

  // Listen for video reaching its end → mark as ended, resolve any waiting promise
  useEffect(() => {
    const sub = videoPlayer.addListener('playToEnd', () => {
      videoEndedRef.current = true;
      if (videoEndResolveRef.current) {
        videoEndResolveRef.current();
        videoEndResolveRef.current = null;
      }
    });
    return () => sub.remove();
  }, [videoPlayer]);

  /** Smoothly fade volume from current → 0 over `durationMs` */
  function fadeOutAudio(durationMs = 1500): Promise<void> {
    return new Promise((resolve) => {
      const steps = 15;
      const stepMs = durationMs / steps;
      let current = steps;
      const iv = setInterval(() => {
        current--;
        videoPlayer.volume = Math.max(0, current / steps);
        if (current <= 0) {
          clearInterval(iv);
          resolve();
        }
      }, stepMs);
    });
  }

  /** Wait until the video finishes (resolves immediately if already ended) */
  function waitForVideoEnd(): Promise<void> {
    if (videoEndedRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      videoEndResolveRef.current = resolve;
    });
  }

  const totalSections = DOCUMENT_SECTIONS.length;

  const t = locale === 'uk' ? {
    btn: cachedSections ? 'Завантажити готовий аналіз' : 'Завантажити детальний аналіз',
    modalTitle: 'Генерація аналізу',
    generating: 'AI-провідник генерує аналіз...',
    sectionOf: (cur: number, total: number) => `Розділ ${cur} з ${total}`,
    printing: 'Створення PDF...',
    done: 'Готово! Документ збережено.',
    errorTitle: 'Щось пішло не так',
    errorBody: 'Вибачте, під час генерації сталася помилка. Ми вже намагаємося згенерувати ваш аналіз повторно — як тільки він буде готовий, ви зможете завантажити його тут.',
    retrying: 'Генеруємо повторно...',
    retry: 'Спробувати знову',
    close: 'Закрити',
    premium: 'Тільки для Premium',
    readyToDownload: 'Аналіз готовий! Натисніть, щоб завантажити.',
    download: 'Завантажити PDF',
    analysisHint: 'Ви отримаєте детальний аналіз вашої Матриці Долі: особистість, таланти, призначення, кармічні уроки, стосунки та рекомендації.',
  } : {
    btn: cachedSections ? 'Download ready analysis' : 'Download detailed analysis',
    modalTitle: 'Generating analysis',
    generating: 'AI is generating analysis...',
    sectionOf: (cur: number, total: number) => `Section ${cur} of ${total}`,
    printing: 'Creating PDF...',
    done: 'Done! Document saved.',
    errorTitle: 'Something went wrong',
    errorBody: 'Sorry, an error occurred during generation. We are already trying to regenerate your analysis — once it\'s ready, you can download it here.',
    retrying: 'Regenerating...',
    retry: 'Try again',
    close: 'Close',
    premium: 'Premium only',
    readyToDownload: 'Analysis is ready! Tap to download.',
    download: 'Download PDF',
    analysisHint: 'You will receive a detailed analysis of your Destiny Matrix: personality, talents, purpose, karmic lessons, relationships and recommendations.',
  };

  async function runGeneration(isRetry = false): Promise<string[]> {
    const systemPrompt = getSystemPrompt();
    const sectionTexts: string[] = [];

    // Mark generation in progress in store (survives app backgrounding)
    if (!isRetry) {
      setPendingAnalysis({
        matrixId: effectiveId,
        matrixName: name,
        matrixBirthDate: birthDate,
        sections: [],
        status: 'generating',
      });
    }

    for (let i = 0; i < DOCUMENT_SECTIONS.length; i++) {
      if (!isRetry) setCurrentSection(i + 1);
      const section = DOCUMENT_SECTIONS[i];
      const prompt = section.buildPrompt(matrixData, name);

      // Per-section retry — up to 3 attempts with increasing backoff
      let text = '';
      let sectionAttempt = 0;
      while (true) {
        sectionAttempt++;
        try {
          text = await askClaude(
            systemPrompt,
            [] as ClaudeMessage[],
            prompt,
            section.maxTokens,
          );
          break; // success
        } catch (sectionErr: any) {
          const msg = sectionErr?.message ?? String(sectionErr);
          console.warn(`[DownloadAnalysis] section ${i + 1} attempt ${sectionAttempt} failed: ${msg}`);
          if (sectionAttempt >= 3) throw sectionErr;
          const backoff = sectionAttempt * 5000;
          console.log(`[DownloadAnalysis] retrying section ${i + 1} in ${backoff}ms...`);
          await new Promise(r => setTimeout(r, backoff));
        }
      }

      sectionTexts.push(text);
      // Save progress to store after each section
      setPendingAnalysis({
        matrixId: effectiveId,
        matrixName: name,
        matrixBirthDate: birthDate,
        sections: [...sectionTexts],
        status: 'generating',
      });
    }
    return sectionTexts;
  }

  /** Send a local push notification that analysis is ready */
  async function sendCompletionNotification() {
    if (Platform.OS === 'web') return;
    try {
      const Constants = require('expo-constants').default;
      if (Constants.appOwnership === 'expo') return; // skip in Expo Go
      const Notifications = await import('expo-notifications');
      await Notifications.scheduleNotificationAsync({
        content: {
          title: locale === 'uk' ? 'Аналіз готовий! \u2728' : 'Analysis ready! \u2728',
          body: locale === 'uk'
            ? `Аналіз для "${name}" згенеровано. Натисніть, щоб завантажити.`
            : `Analysis for "${name}" is ready. Tap to download.`,
          data: { type: 'analysis-ready', matrixId: effectiveId },
          sound: true,
        },
        trigger: null, // immediate
      });
    } catch (e) {
      console.warn('[DownloadAnalysis] notification error:', e);
    }
  }

  async function sharePDF(sectionTexts: string[]) {
    setPhase('printing');
    const html = buildDocumentHTML(name, birthDate, matrixData, sectionTexts);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    // Rename to a meaningful filename
    const safeName = name.replace(/[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9]/g, '_').replace(/_+/g, '_');
    const pdfName = `Матриця_Долі_${safeName}.pdf`;
    let finalUri = uri;
    try {
      const FileSystem = require('expo-file-system') as typeof import('expo-file-system');
      const dir = uri.substring(0, uri.lastIndexOf('/') + 1);
      const newUri = dir + pdfName;
      await FileSystem.moveAsync({ from: uri, to: newUri });
      finalUri = newUri;
    } catch {}
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(finalUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Матриця Долі — ${name}`,
        UTI: 'com.adobe.pdf',
      });
    }
    setPhase('done');
    trackFeatureUsed(FEATURES.PDF_ANALYSIS, 'matrix', 'premium');
  }

  async function generate() {
    setPhase('generating');
    // trackFeatureUsed already called in sharePDF on completion
    setCurrentSection(0);
    // Reset video state for fresh playback
    videoEndedRef.current = false;
    videoEndResolveRef.current = null;
    // Close the download modal first, then show fullscreen video
    // (two stacked Modals conflict on iOS)
    setModalVisible(false);
    // Small delay so the first modal finishes closing before video opens
    await new Promise(r => setTimeout(r, 350));
    setVideoVisible(true);
    videoPlayer.volume = 1;
    videoPlayer.currentTime = 0;
    videoPlayer.play();

    try {
      const sectionTexts = await runGeneration();
      setCachedSections(sectionTexts);
      // Save completed analysis to store (survives app close)
      setPendingAnalysis({
        matrixId: effectiveId,
        matrixName: name,
        matrixBirthDate: birthDate,
        sections: sectionTexts,
        status: 'done',
      });
      // If user opted for notification (may have left app)
      if (notifyWhenDone) {
        await sendCompletionNotification();
      }
      // Check if app is in foreground — if so, show PDF directly
      const appState = RNAppState.currentState;
      if (appState === 'active' && !notifyWhenDone) {
        // Fade audio out smoothly, then wait for video to finish (poster)
        await fadeOutAudio(1500);
        await waitForVideoEnd();
        // Video stays as poster (last frame) briefly
        await new Promise(r => setTimeout(r, 800));
        setVideoVisible(false);
        await sharePDF(sectionTexts);
      } else {
        // App is backgrounded or user chose notify — just hide video
        videoPlayer.pause();
        videoPlayer.volume = 0;
        setVideoVisible(false);
      }
    } catch (err: any) {
      // Fade audio and let video become poster before showing error
      await fadeOutAudio(800).catch(() => {});
      await waitForVideoEnd().catch(() => {});
      setVideoVisible(false);
      setModalVisible(true); // reopen download modal to show error
      const errMsg = err?.message ?? String(err);
      console.warn('[DownloadAnalysis] generation failed:', errMsg);
      setDebugError(errMsg);
      setPhase('error');
      setPendingAnalysis({
        matrixId: effectiveId,
        matrixName: name,
        matrixBirthDate: birthDate,
        sections: [],
        status: 'error',
      });
      // Auto-retry silently in background
      setRetryingInBackground(true);
      try {
        const sectionTexts = await runGeneration(true);
        setCachedSections(sectionTexts);
        setPendingAnalysis({
          matrixId: effectiveId,
          matrixName: name,
          matrixBirthDate: birthDate,
          sections: sectionTexts,
          status: 'done',
        });
        if (notifyWhenDone) await sendCompletionNotification();
        setRetryingInBackground(false);
        setDebugError('');
        setPhase('idle'); // Ready to download — user sees the "ready" state
      } catch (retryErr: any) {
        const retryMsg = retryErr?.message ?? String(retryErr);
        console.warn('[DownloadAnalysis] retry also failed:', retryMsg);
        setDebugError(retryMsg);
        setRetryingInBackground(false);
        // Still in error phase, user can manually retry
      }
    }
  }

  async function downloadCached() {
    if (!cachedSections) return;
    try {
      await sharePDF(cachedSections);
      clearPendingAnalysis();
    } catch {
      setPhase('error');
    }
  }

  /** User tapped "Notify me" — allow leaving the app */
  async function handleNotifyWhenDone() {
    setNotifyWhenDone(true);
    // Request notification permissions if needed
    if (Platform.OS !== 'web') {
      try {
        const Constants = require('expo-constants').default;
        if (Constants.appOwnership === 'expo') return; // skip in Expo Go
        const Notifications = await import('expo-notifications');
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch {}
    }
  }

  function handleOpen() {
    if (!isPremium) {
      router.push('/paywall' as any);
      return;
    }
    // If we have cached sections, go straight to download
    if (cachedSections) {
      setModalVisible(true);
      setPhase('idle');
      return;
    }
    setPhase('idle');
    setCurrentSection(0);
    setModalVisible(true);
  }

  function handleClose() {
    if (phase === 'generating' || phase === 'printing') return; // don't allow closing mid-generation
    setModalVisible(false);
    if (phase !== 'error') setPhase('idle');
  }

  const progress = totalSections > 0 ? currentSection / totalSections : 0;

  return (
    <>
      {/* ── Trigger Button ── */}
      <TouchableOpacity onPress={handleOpen} activeOpacity={0.82} style={styles.btnWrap}>
        <LinearGradient
          colors={['#C8901A', '#F5C542', '#C8901A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btn}
        >
          <Ionicons name="document-text-outline" size={18} color="#1A0A00" />
          <Text style={styles.btnText}>{t.btn}</Text>
          <Ionicons name="download-outline" size={18} color="#1A0A00" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Fullscreen generation video overlay ── */}
      <Modal visible={videoVisible} transparent={false} animationType="fade" statusBarTranslucent>
        <View style={styles.videoOverlay}>
          <VideoView
            player={videoPlayer}
            style={styles.videoFull}
            contentFit="cover"
            nativeControls={false}
          />
          {/* Dark gradient overlay for text legibility */}
          <LinearGradient
            colors={['rgba(5,2,20,0.35)', 'rgba(5,2,20,0.7)', 'rgba(5,2,20,0.9)']}
            locations={[0, 0.6, 1]}
            style={styles.videoGradient}
          />
          {/* Centered label */}
          <View style={styles.videoLabelWrap}>
            <Text style={styles.videoTitle}>
              {locale === 'uk' ? 'Генерація аналізу' : 'Generating Analysis'}
            </Text>
            <Text style={styles.videoSubtitle}>
              {locale === 'uk'
                ? `Розділ ${currentSection} з ${totalSections}`
                : `Section ${currentSection} of ${totalSections}`}
            </Text>
            {/* Progress bar */}
            <View style={styles.videoPbarBg}>
              <View style={[styles.videoPbarFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.videoSectionName}>
              {currentSection > 0 && currentSection <= DOCUMENT_SECTIONS.length
                ? DOCUMENT_SECTIONS[currentSection - 1].title
                : ''}
            </Text>
            {/* ── Notify me button ── */}
            {!notifyWhenDone ? (
              <TouchableOpacity onPress={handleNotifyWhenDone} activeOpacity={0.82} style={styles.notifyBtn}>
                <Ionicons name="notifications-outline" size={16} color="#F5C542" />
                <Text style={styles.notifyBtnText}>
                  {locale === 'uk' ? 'Сповістити коли готово' : 'Notify when ready'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.notifyConfirm}>
                <Ionicons name="checkmark-circle" size={16} color="#4ADE80" />
                <Text style={styles.notifyConfirmText}>
                  {locale === 'uk'
                    ? 'Ви отримаєте сповіщення. Можете згорнути додаток.'
                    : 'You will be notified. You can leave the app.'}
                </Text>
              </View>
            )}
            {/* Minimize button — continue using the app */}
            <TouchableOpacity
              onPress={() => { setNotifyWhenDone(true); handleNotifyWhenDone(); setVideoVisible(false); videoPlayer.pause(); videoPlayer.volume = 0; }}
              style={styles.minimizeBtn}
            >
              <Ionicons name="chevron-down-outline" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.minimizeBtnText}>
                {locale === 'uk' ? 'Продовжити використання' : 'Continue using app'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <LinearGradient
              colors={['#1E1350', '#130D3A', '#0D0825']}
              style={styles.modalInner}
            >
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t.modalTitle}</Text>
                {phase !== 'generating' && phase !== 'printing' && (
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Idle state ── */}
              {phase === 'idle' && (
                <>
                  {cachedSections ? (
                    // Report already generated — offer direct download
                    <View style={styles.resultWrap}>
                      <View style={styles.doneIcon}>
                        <Ionicons name="document-text" size={52} color="#F5C542" />
                      </View>
                      <Text style={styles.doneText}>{t.readyToDownload}</Text>
                      <TouchableOpacity onPress={downloadCached} activeOpacity={0.82} style={styles.startBtnWrap}>
                        <LinearGradient
                          colors={['#C8901A', '#F5C542', '#C8901A']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={styles.startBtn}
                        >
                          <Ionicons name="download-outline" size={16} color="#1A0A00" />
                          <Text style={styles.startBtnText}>{t.download}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 19, marginBottom: 14, textAlign: 'center' }}>
                        {t.analysisHint}
                      </Text>
                      <ScrollView style={styles.sectionList} showsVerticalScrollIndicator={false}>
                        {DOCUMENT_SECTIONS.map((s, i) => (
                          <View key={s.key} style={styles.sectionItem}>
                            <View style={styles.sectionNum}>
                              <Text style={styles.sectionNumText}>{i + 1}</Text>
                            </View>
                            <Text style={styles.sectionItemText}>{s.title}</Text>
                          </View>
                        ))}
                      </ScrollView>
                      <TouchableOpacity onPress={generate} activeOpacity={0.82} style={styles.startBtnWrap}>
                        <LinearGradient
                          colors={['#C8901A', '#F5C542', '#C8901A']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={styles.startBtn}
                        >
                          <Ionicons name="sparkles" size={16} color="#1A0A00" />
                          <Text style={styles.startBtnText}>{locale === 'uk' ? 'Генерувати' : 'Generate'}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {/* ── Generating state ── */}
              {(phase === 'generating' || phase === 'printing') && (
                <View style={styles.generatingWrap}>
                  <ActivityIndicator size="large" color={Colors.accent} style={{ marginBottom: 20 }} />

                  {phase === 'generating' && (
                    <>
                      <Text style={styles.genLabel}>{t.generating}</Text>
                      <Text style={styles.genSectionLabel}>
                        {currentSection > 0 && currentSection <= DOCUMENT_SECTIONS.length
                          ? DOCUMENT_SECTIONS[currentSection - 1].title
                          : ''}
                      </Text>
                      <Text style={styles.genProgress}>
                        {t.sectionOf(currentSection, totalSections)}
                      </Text>

                      {/* Progress bar */}
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                      </View>

                      {/* Section list with status */}
                      <ScrollView style={styles.sectionListSm} showsVerticalScrollIndicator={false}>
                        {DOCUMENT_SECTIONS.map((s, i) => {
                          const done = i < currentSection - 1;
                          const active = i === currentSection - 1;
                          return (
                            <View key={s.key} style={styles.sectionItemSm}>
                              <View style={[
                                styles.sectionNumSm,
                                done && styles.sectionNumDone,
                                active && styles.sectionNumActive,
                              ]}>
                                {done
                                  ? <Ionicons name="checkmark" size={11} color="#1A0A00" />
                                  : <Text style={[styles.sectionNumText, { fontSize: 10 }]}>{i + 1}</Text>
                                }
                              </View>
                              <Text style={[
                                styles.sectionItemTextSm,
                                done && styles.sectionTextDone,
                                active && styles.sectionTextActive,
                              ]}>
                                {s.title}
                              </Text>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </>
                  )}

                  {phase === 'printing' && (
                    <Text style={styles.genLabel}>{t.printing}</Text>
                  )}
                </View>
              )}

              {/* ── Done state ── */}
              {phase === 'done' && (
                <View style={styles.resultWrap}>
                  <View style={styles.doneIcon}>
                    <Ionicons name="checkmark-circle" size={52} color="#F5C542" />
                  </View>
                  <Text style={styles.doneText}>{t.done}</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.startBtnWrap}>
                    <LinearGradient
                      colors={['rgba(139,92,246,0.3)', 'rgba(91,33,182,0.3)']}
                      style={styles.startBtn}
                    >
                      <Text style={[styles.startBtnText, { color: Colors.accent }]}>{t.close}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Error state ── */}
              {phase === 'error' && (
                <View style={styles.resultWrap}>
                  {retryingInBackground ? (
                    <>
                      <ActivityIndicator size="large" color={Colors.accent} style={{ marginBottom: 16 }} />
                      <Text style={styles.errorTitle}>{t.errorTitle}</Text>
                      <Text style={styles.errorBody}>{t.errorBody}</Text>
                      <Text style={styles.retryingLabel}>{t.retrying}</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
                      <Text style={styles.errorTitle}>{t.errorTitle}</Text>
                      <Text style={styles.errorBody}>{t.errorBody}</Text>
                      <TouchableOpacity onPress={generate} style={styles.startBtnWrap}>
                        <LinearGradient
                          colors={['#C8901A', '#F5C542', '#C8901A']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={styles.startBtn}
                        >
                          <Text style={styles.startBtnText}>{t.retry}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                  {/* Debug error — only in Metro console, hidden from users */}
                  {!retryingInBackground && (
                    <TouchableOpacity onPress={handleClose} style={{ marginTop: 8 }}>
                      <Text style={styles.closeLinkText}>{t.close}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  btnWrap: {
    marginHorizontal: 0,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
  },
  btnText: {
    color: '#1A0A00',
    fontSize: FontSize.md,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },

  // ── Modal ──
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  modalInner: {
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },

  // ── Section list (idle) ──
  sectionList: {
    maxHeight: 280,
    marginBottom: Spacing.lg,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  sectionNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionNumText: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  sectionItemText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
  },

  // ── Start / action button ──
  startBtnWrap: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: Spacing.xl,
  },
  startBtnText: {
    color: '#1A0A00',
    fontSize: FontSize.md,
    fontWeight: '800',
  },

  // ── Generating ──
  generatingWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  genLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  genSectionLabel: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  genProgress: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(139,92,246,0.15)',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  sectionListSm: {
    width: '100%',
    maxHeight: 200,
  },
  sectionItemSm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionNumSm: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sectionNumDone: {
    backgroundColor: '#C8901A',
    borderColor: '#F5C542',
  },
  sectionNumActive: {
    backgroundColor: 'rgba(139,92,246,0.35)',
    borderColor: Colors.accent,
  },
  sectionItemTextSm: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  sectionTextDone: {
    color: 'rgba(245,197,66,0.7)',
  },
  sectionTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },

  // ── Done / Error ──
  resultWrap: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  doneIcon: {
    marginBottom: 4,
  },
  doneText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorBody: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: Spacing.sm,
  },
  retryingLabel: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: 4,
  },
  closeLinkText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textDecorationLine: 'underline',
  },
  debugErrorText: {
    color: '#F87171',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginHorizontal: 4,
    marginTop: 6,
    opacity: 0.8,
  },

  // ── Fullscreen video generation overlay ──
  videoOverlay: {
    flex: 1,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#050214',
  },
  videoFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
  },
  videoGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
  },
  videoLabelWrap: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 8,
    textShadowColor: 'rgba(139,92,246,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  videoSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  videoPbarBg: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  videoPbarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  videoSectionName: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  minimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
  },
  minimizeBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.4)',
    backgroundColor: 'rgba(245,197,66,0.1)',
  },
  notifyBtnText: {
    color: '#F5C542',
    fontSize: 14,
    fontWeight: '700',
  },
  notifyConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  notifyConfirmText: {
    color: '#4ADE80',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
