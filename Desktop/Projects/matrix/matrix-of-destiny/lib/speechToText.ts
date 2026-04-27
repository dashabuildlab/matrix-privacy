// ─────────────────────────────────────────────────────────────────────────────
// Speech-to-Text client — records audio with expo-av and uploads it to our
// backend proxy, which forwards to ElevenLabs. Returns the transcript.
// ─────────────────────────────────────────────────────────────────────────────

import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { getIdToken } from '@/lib/firebaseAuth';

const API_BASE = Platform.OS === 'web' ? '' : 'https://yourmatrixofdestiny.com';
const STT_URL = `${API_BASE}/api/speech-to-text`;

/** Prepare audio session for recording (iOS needs this). */
export async function prepareAudioSession(): Promise<boolean> {
  try {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) return false;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    return true;
  } catch (e) {
    console.warn('[STT] prepareAudioSession failed:', e);
    return false;
  }
}

export class VoiceRecorder {
  private recording: Audio.Recording | null = null;

  async start(): Promise<void> {
    if (this.recording) return;
    const ok = await prepareAudioSession();
    if (!ok) throw new Error('Microphone permission denied');

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    this.recording = recording;
  }

  /** Stop and return the file URI (file:///...). */
  async stop(): Promise<string | null> {
    if (!this.recording) return null;
    const rec = this.recording;
    this.recording = null;
    try {
      await rec.stopAndUnloadAsync();
    } catch (e) {
      console.warn('[STT] stop error:', e);
    }
    return rec.getURI();
  }

  /** Abandon the recording without returning audio. */
  async cancel(): Promise<void> {
    if (!this.recording) return;
    const rec = this.recording;
    this.recording = null;
    try {
      await rec.stopAndUnloadAsync();
    } catch {}
  }

  isRecording(): boolean {
    return this.recording !== null;
  }
}

/** Upload a local audio URI to the STT endpoint and return the transcript. */
export async function transcribe(audioUri: string, languageCode?: string): Promise<string> {
  const form = new FormData();
  // On native, FormData accepts a { uri, name, type } object — RN handles the upload.
  // On web, we fetch the blob first.
  if (Platform.OS === 'web') {
    const res = await fetch(audioUri);
    const blob = await res.blob();
    form.append('audio', blob, 'audio.webm');
  } else {
    // @ts-ignore — React Native FormData type differs from web's
    form.append('audio', {
      uri: audioUri,
      name: 'audio.m4a',
      type: 'audio/m4a',
    } as any);
  }
  if (languageCode) form.append('language_code', languageCode);

  const token = await getIdToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);

  try {
    const response = await fetch(STT_URL, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Do NOT set Content-Type — fetch will set the multipart boundary.
      },
      body: form,
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let detail = errText;
      try { detail = JSON.parse(errText)?.error ?? errText; } catch {}
      throw new Error(`STT ${response.status}: ${detail}`);
    }
    const data = await response.json();
    return (data?.text ?? '').trim();
  } finally {
    clearTimeout(timer);
  }
}
