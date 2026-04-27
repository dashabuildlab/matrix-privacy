// ─────────────────────────────────────────────────────────────────────────────
// Text-to-Speech — ElevenLabs Voices via our backend proxy.
// Returns an audio file URI that can be played with expo-av / expo-audio.
// ─────────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { getIdToken } from '@/lib/firebaseAuth';

const API_BASE = Platform.OS === 'web' ? '' : 'https://yourmatrixofdestiny.com';
const TTS_URL = `${API_BASE}/api/text-to-speech`;

// Default multilingual v2 voice — same as scripts/generate_meditations.py
export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel (multilingual)

let currentSound: Audio.Sound | null = null;

/**
 * Fetch TTS audio for the given text and play it.
 * Stops any currently playing TTS clip first.
 */
export async function speak(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<void> {
  if (!text?.trim()) return;
  await stop();

  const token = await getIdToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);

  const response = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text, voice_id: voiceId }),
    signal: ctrl.signal,
  });
  clearTimeout(timer);

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`TTS ${response.status}: ${err.slice(0, 200)}`);
  }

  if (Platform.OS === 'web') {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new (globalThis as any).Audio(url);
    await audio.play();
    return;
  }

  // Native: save bytes to a temp file, then play via expo-av
  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const fileUri = `${FileSystem.cacheDirectory}tts-${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
  currentSound = sound;
  sound.setOnPlaybackStatusUpdate(async (status) => {
    if ('didJustFinish' in status && status.didJustFinish) {
      await sound.unloadAsync().catch(() => {});
      currentSound = null;
      FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
    }
  });
}

export async function stop(): Promise<void> {
  if (currentSound) {
    try { await currentSound.stopAsync(); } catch {}
    try { await currentSound.unloadAsync(); } catch {}
    currentSound = null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  // btoa is available on RN 0.73+ / Hermes; polyfill if not
  if (typeof btoa !== 'undefined') return btoa(binary);
  return Buffer.from(binary, 'binary').toString('base64');
}
