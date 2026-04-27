// ─────────────────────────────────────────────────────────────────────────────
// MicButton — press to record, release (or press again) to stop + transcribe.
// Returns the transcript via onTranscript(text).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View, Platform, Alert, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { VoiceRecorder, transcribe } from '@/lib/speechToText';
import { useI18n } from '@/lib/i18n';

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  /** BCP-47-like code hint, e.g. 'ukr' or 'eng'. ElevenLabs Scribe auto-detects if omitted. */
  languageHint?: string;
  size?: number;
}

export function MicButton({ onTranscript, disabled, languageHint, size = 40 }: Props) {
  const { locale } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false); // uploading / transcribing
  const recorder = useRef(new VoiceRecorder()).current;

  // Pulse animation while recording
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(0);
  }, [isRecording]);

  const handlePress = async () => {
    if (disabled || isBusy) return;
    if (isRecording) {
      setIsRecording(false);
      setIsBusy(true);
      try {
        const uri = await recorder.stop();
        if (!uri) return;
        const lang = languageHint ?? (locale === 'uk' ? 'ukr' : 'eng');
        const text = await transcribe(uri, lang);
        if (text) onTranscript(text);
      } catch (e: any) {
        console.warn('[MicButton] transcribe error:', e?.message ?? e);
        Alert.alert(
          locale === 'uk' ? 'Не вдалося розпізнати' : 'Transcription failed',
          e?.message ?? String(e),
        );
      } finally {
        setIsBusy(false);
      }
      return;
    }
    // Start
    try {
      await recorder.start();
      setIsRecording(true);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      Alert.alert(
        locale === 'uk' ? 'Мікрофон недоступний' : 'Microphone unavailable',
        msg.includes('permission') || msg.includes('denied')
          ? (locale === 'uk' ? 'Дозвольте доступ до мікрофона у налаштуваннях.' : 'Grant microphone permission in settings.')
          : msg,
      );
    }
  };

  const iconName: keyof typeof Ionicons.glyphMap = isBusy ? 'hourglass-outline' : isRecording ? 'stop' : 'mic-outline';
  const color = isRecording ? '#EF4444' : isBusy ? Colors.textMuted : Colors.accent;
  const bg = isRecording ? 'rgba(239,68,68,0.12)' : 'rgba(245,197,66,0.10)';
  const border = isRecording ? 'rgba(239,68,68,0.35)' : 'rgba(245,197,66,0.35)';

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || isBusy}
      activeOpacity={0.7}
      accessibilityLabel={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
        {isRecording && (
          <Animated.View
            style={[
              styles.glow,
              { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, opacity: glowOpacity },
            ]}
          />
        )}
        <Animated.View
          style={[
            styles.btn,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bg,
              borderColor: border,
              transform: [{ scale: isRecording ? scale : 1 }],
            },
          ]}
        >
          <Ionicons name={iconName} size={size * 0.5} color={color} />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(239,68,68,0.35)',
  },
});
