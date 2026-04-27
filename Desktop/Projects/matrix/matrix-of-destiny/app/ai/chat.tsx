// ─────────────────────────────────────────────────────────────────────────────
// AI Chat — minimal, matrix-aware, with voice input (ElevenLabs STT)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useAppStore, type AIChatSession, type ChatMessage } from '@/stores/useAppStore';
import {
  upsertSessionSync, addMessageSync, getMessagesSync, getSessionSync, renameSessionSync,
} from '@/lib/chatDb';
import { getDailyEnergy } from '@/lib/matrix-calc';
import { askClaude, askClaudeStream, buildEsotericSystemPrompt, type ClaudeMessage } from '@/lib/claude';
import { useI18n } from '@/lib/i18n';
import { FormattedText } from '@/components/ui/FormattedText';
import { MicButton } from '@/components/ui/MicButton';
import { QuickSuggestions } from '@/components/ui/QuickSuggestions';
import { speak, stop as stopTts } from '@/lib/textToSpeech';

type ChatContext = AIChatSession['context'];

export default function ChatScreen() {
  const { t, locale } = useI18n();
  const isUk = locale === 'uk';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    initialQuestion?: string;
    sessionTitle?: string;
    context?: ChatContext;
  }>();

  // ── Store subscriptions ────────────────────────────────────────────────
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const setActiveSession = useAppStore((s) => s.setActiveSession);
  const userName = useAppStore((s) => s.userName);
  const userBirthDate = useAppStore((s) => s.userBirthDate);
  const personalMatrix = useAppStore((s) => s.personalMatrix);
  const isPremium = useAppStore((s) => s.isPremium);
  const tokens = useAppStore((s) => s.tokens);
  const spendCrystals = useAppStore((s) => s.spendCrystals);
  const userId = useAppStore((s) => s.userId);
  const pendingChatNav = useAppStore((s) => s.pendingChatNav);
  const setPendingChatNav = useAppStore((s) => s.setPendingChatNav);

  // ── Local state ────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionContext, setSessionContext] = useState<ChatContext>('general');
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameText, setRenameText] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const welcomeText = isUk
    ? '🌟 Привіт! Я твій AI-провідник. Я бачу твою Матрицю Долі та щоденну енергію — задавай будь-яке питання про призначення, енергії, стосунки чи духовний шлях. ✨'
    : '🌟 Hello! I am your AI guide. I can see your Destiny Matrix and today\'s energy — ask me anything about your purpose, energies, relationships, or spiritual path. ✨';

  // ── Load / create session ──────────────────────────────────────────────
  useEffect(() => {
    if (!activeSessionId) {
      // Create fresh session
      const id = `s_${Date.now()}`;
      const title = (params.sessionTitle as string | undefined) ?? (isUk ? 'Новий чат' : 'New chat');
      const ctx: ChatContext = (params.context as ChatContext) ?? 'general';
      const session: AIChatSession = {
        id,
        userId: userId ?? undefined,
        title,
        context: ctx,
        messages: [],
        createdAt: new Date().toISOString(),
      };
      upsertSessionSync(session);
      setActiveSession(id);
      setSessionTitle(title);
      setSessionContext(ctx);
      setMessages([]);
      return;
    }
    const loaded = getMessagesSync(activeSessionId);
    setMessages(loaded);
    const s = getSessionSync(activeSessionId);
    if (s) {
      setSessionTitle(s.title);
      setSessionContext(s.context);
    }
  }, [activeSessionId]);

  // ── Handle deferred/params-driven initial question ─────────────────────
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;
    const q = (params.initialQuestion as string | undefined) ?? pendingChatNav?.question;
    if (q && messages.length === 0 && activeSessionId) {
      autoSentRef.current = true;
      setPendingChatNav(null);
      // Small delay so the session upsert in the prior effect settles
      setTimeout(() => handleSend(q), 80);
    }
  }, [activeSessionId, messages.length]);

  // ── Send flow ──────────────────────────────────────────────────────────
  const handleSend = async (override?: string) => {
    if (!activeSessionId || isTyping) return;
    const content = (override ?? inputText).trim();
    if (!content) return;

    // Gate: premium (free) OR crystals (1 per message)
    if (!isPremium) {
      if (tokens < 1) {
        router.push('/paywall' as any);
        return;
      }
      spendCrystals(1);
    }

    Keyboard.dismiss();
    setInputText('');
    const userMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    addMessageSync(activeSessionId, userMsg);
    setIsTyping(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    try {
      const dailyEnergyId = getDailyEnergy(new Date());
      const systemPrompt = buildEsotericSystemPrompt({
        userName,
        userBirthDate,
        personalMatrix: personalMatrix
          ? {
              personality: personalMatrix.personality,
              soul: personalMatrix.soul,
              destiny: personalMatrix.destiny,
              spiritual: (personalMatrix as any).spiritual,
              material: (personalMatrix as any).material,
            }
          : null,
        dailyEnergyId,
        locale: isUk ? 'uk' : 'en',
        recentUserMessage: content,
        context: sessionContext,
      });
      const history: ClaudeMessage[] = messages
        .slice(-20) // cap context — last 20 turns
        .map((m) => ({ role: m.role, content: m.content }));

      // Streaming: create placeholder assistant message and append deltas as they arrive.
      const aiId = `m_${Date.now() + 1}`;
      const aiCreatedAt = new Date().toISOString();
      setMessages((prev) => [...prev, { id: aiId, role: 'assistant', content: '', createdAt: aiCreatedAt }]);
      // React Native fetch streaming isn't fully supported on all runtimes; fall back to non-stream if needed.
      let fullText = '';
      try {
        fullText = await askClaudeStream(systemPrompt, history, content, (delta) => {
          fullText += delta;
          setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: fullText } : m)));
        }, 900);
      } catch (streamErr) {
        console.warn('[Chat] stream failed, falling back to non-stream:', (streamErr as any)?.message);
        fullText = await askClaude(systemPrompt, history, content, 900);
        setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: fullText } : m)));
      }
      // Persist the final message once stream is done (avoids thrashing SQLite on every delta)
      addMessageSync(activeSessionId, { id: aiId, role: 'assistant', content: fullText, createdAt: aiCreatedAt });

      // Auto-title the session from the first user message
      if (messages.length === 0) {
        const derived = content.slice(0, 40).trim() + (content.length > 40 ? '…' : '');
        renameSessionSync(activeSessionId, derived);
        setSessionTitle(derived);
      }
    } catch (e: any) {
      console.warn('[Chat] send error:', e?.message ?? e);
      const errMsg: ChatMessage = {
        id: `m_${Date.now() + 2}`,
        role: 'assistant',
        content: isUk ? 'Не вдалося отримати відповідь. Спробуй ще раз за хвилину.' : 'Could not get a response. Please try again in a moment.',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
      if (activeSessionId) addMessageSync(activeSessionId, errMsg);
    } finally {
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────
  const handleCopy = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Alert.alert('', isUk ? 'Скопійовано' : 'Copied', [{ text: 'OK' }]);
  };

  const openRename = () => {
    setRenameText(sessionTitle);
    setRenameVisible(true);
  };

  const saveRename = () => {
    if (!activeSessionId) return setRenameVisible(false);
    const next = renameText.trim();
    if (next) {
      renameSessionSync(activeSessionId, next);
      setSessionTitle(next);
    }
    setRenameVisible(false);
  };

  const handleTranscript = (text: string) => {
    setInputText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const handleSpeak = async (id: string, text: string) => {
    if (speakingId === id) {
      await stopTts();
      setSpeakingId(null);
      return;
    }
    try {
      setSpeakingId(id);
      await speak(text);
    } catch (e: any) {
      console.warn('[Chat] TTS error:', e?.message ?? e);
      Alert.alert(isUk ? 'Не вдалося озвучити' : 'TTS failed', String(e?.message ?? e));
    } finally {
      setSpeakingId((curr) => (curr === id ? null : curr));
    }
  };
  useEffect(() => () => { stopTts(); }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  const showWelcome = messages.length === 0 && !isTyping;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerTitleWrap} onPress={openRename} activeOpacity={0.7}>
          <Text style={styles.headerTitle} numberOfLines={1}>{sessionTitle || (isUk ? 'AI-провідник' : 'AI guide')}</Text>
          <Ionicons name="pencil" size={12} color={Colors.textMuted} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/ai/history' as any)} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="time-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        testID="chat-messages-list"
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {showWelcome && (
          <View testID="chat-empty-state" style={styles.welcomeBox}>
            <Text style={styles.welcomeText}>{welcomeText}</Text>
          </View>
        )}

        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isSpeaking = speakingId === m.id;
          return (
            <View key={m.id} testID={isUser ? 'chat-user-message' : 'chat-assistant-message'} style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
              <View style={{ maxWidth: '82%' }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onLongPress={() => handleCopy(m.content)}
                  style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}
                >
                  {isUser ? (
                    <Text style={styles.bubbleUserText}>{m.content}</Text>
                  ) : (
                    <FormattedText style={styles.bubbleAssistantText}>{m.content}</FormattedText>
                  )}
                </TouchableOpacity>
                {!isUser && m.content.length > 0 && (
                  <View style={styles.messageActions}>
                    <TouchableOpacity
                      testID="chat-speak-btn"
                      onPress={() => handleSpeak(m.id, m.content)}
                      style={styles.messageActionBtn}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={isSpeaking ? 'stop-circle' : 'volume-medium-outline'}
                        size={16}
                        color={isSpeaking ? '#EF4444' : Colors.textMuted}
                      />
                      <Text style={[styles.messageActionText, isSpeaking && { color: '#EF4444' }]}>
                        {isSpeaking ? (isUk ? 'Стоп' : 'Stop') : (isUk ? 'Озвучити' : 'Speak')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="chat-copy-btn" onPress={() => handleCopy(m.content)} style={styles.messageActionBtn} hitSlop={8}>
                      <Ionicons name="copy-outline" size={16} color={Colors.textMuted} />
                      <Text style={styles.messageActionText}>{isUk ? 'Копія' : 'Copy'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {isTyping && (
          <View testID="chat-typing-indicator" style={styles.bubbleRow}>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={styles.typingText}>{isUk ? 'Друкую…' : 'Typing…'}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick suggestions — shown only on empty chat */}
      {showWelcome && (
        <QuickSuggestions
          hasMatrix={!!personalMatrix}
          onSelect={(text) => { setInputText(text); }}
        />
      )}

      {/* Input row */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) + 6 }]}>
        <TextInput
          testID="chat-input"
          value={inputText}
          onChangeText={setInputText}
          placeholder={isUk ? 'Твоє питання…' : 'Your question…'}
          placeholderTextColor={Colors.textMuted}
          multiline
          style={styles.input}
          editable={!isTyping}
        />
        <MicButton onTranscript={handleTranscript} disabled={isTyping} />
        <TouchableOpacity
          testID="chat-send-btn"
          onPress={() => handleSend()}
          disabled={isTyping || !inputText.trim()}
          style={[styles.sendBtn, (!inputText.trim() || isTyping) && { opacity: 0.4 }]}
        >
          <Ionicons name="arrow-up" size={20} color="#1A0A00" />
        </TouchableOpacity>
      </View>

      {/* Rename modal */}
      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View testID="chat-rename-modal" style={styles.modalCard}>
            <Text style={styles.modalTitle}>{isUk ? 'Перейменувати чат' : 'Rename chat'}</Text>
            <TextInput
              testID="chat-rename-input"
              value={renameText}
              onChangeText={setRenameText}
              style={styles.modalInput}
              autoFocus
              placeholder={isUk ? 'Назва чату' : 'Chat name'}
              placeholderTextColor={Colors.textMuted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity testID="chat-rename-cancel-btn" onPress={() => setRenameVisible(false)} style={[styles.modalBtn, styles.modalBtnGhost]}>
                <Text style={styles.modalBtnGhostText}>{isUk ? 'Скасувати' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="chat-rename-save-btn" onPress={saveRename} style={[styles.modalBtn, styles.modalBtnPrimary]}>
                <Text style={styles.modalBtnPrimaryText}>{isUk ? 'Зберегти' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(245,197,66,0.15)',
    backgroundColor: '#100C28',
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.accent, fontSize: FontSize.md, fontWeight: '700', maxWidth: 240 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl },

  welcomeBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.18)',
    marginBottom: Spacing.md,
  },
  welcomeText: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 22 },

  bubbleRow: { flexDirection: 'row', marginVertical: 6 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.lg,
  },
  bubbleUser: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleUserText: { color: '#1A0A00', fontSize: FontSize.sm, lineHeight: 20, fontWeight: '500' },
  bubbleAssistant: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.12)',
  },
  bubbleAssistantText: { color: Colors.text, fontSize: FontSize.sm, lineHeight: 22 },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typingText: { color: Colors.textMuted, fontSize: FontSize.xs, fontStyle: 'italic' },

  messageActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingLeft: 6,
    paddingTop: 4,
  },
  messageActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  messageActionText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '500' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245,197,66,0.15)',
    backgroundColor: '#100C28',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    color: Colors.text,
    fontSize: FontSize.sm,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.18)',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accent,
  },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#1A0F40',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,197,66,0.25)',
  },
  modalTitle: {
    color: Colors.text, fontSize: FontSize.md, fontWeight: '700',
    marginBottom: Spacing.md,
  },
  modalInput: {
    color: Colors.text, fontSize: FontSize.sm,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.2)',
    marginBottom: Spacing.md,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.md },
  modalBtnGhost: { backgroundColor: 'transparent' },
  modalBtnGhostText: { color: Colors.textMuted, fontWeight: '600' },
  modalBtnPrimary: { backgroundColor: Colors.accent },
  modalBtnPrimaryText: { color: '#1A0A00', fontWeight: '700' },
});
