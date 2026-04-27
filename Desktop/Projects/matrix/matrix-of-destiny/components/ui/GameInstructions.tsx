// ─────────────────────────────────────────────────────────────────────────────
// GameInstructions — shows instructions before first play + help button always
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const SEEN_KEY_PREFIX = 'game_instructions_seen_';

interface Props {
  gameId: string;
  title: string;
  steps: string[];
  onStart: () => void;
  /** Called when instructions modal opens (pause timer) */
  onPause?: () => void;
  /** Called when instructions modal closes (resume timer) */
  onResume?: () => void;
}

export function GameInstructions({ gameId, title, steps, onStart, onPause, onResume }: Props) {
  const [seen, setSeen] = useState<boolean | null>(null);
  // null = storage check not yet done → modal stays hidden (no flash for returning users).
  // true  = first-time user confirmed → show modal.
  // false = already seen → modal stays hidden, game runs.
  const [modalVisible, setModalVisible] = useState<boolean | null>(null);
  // Track whether the current modal open is the initial instructions (needs onStart on close)
  // vs. a mid-game help re-open (should only resume, not restart).
  const isInitialOpenRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const key = SEEN_KEY_PREFIX + gameId;

    const check = async () => {
      let wasSeen = false;
      if (Platform.OS === 'web') {
        wasSeen = localStorage.getItem(key) === 'true';
      } else {
        const SecureStore = await import('@/lib/storage');
        const v = await SecureStore.getItemAsync(key);
        wasSeen = v === 'true';
      }
      if (!mounted) return;
      setSeen(wasSeen);
      if (wasSeen) {
        // Returning user: no flash, start game immediately
        setModalVisible(false);
        onStart();
      } else {
        // First-time user: show modal and pause any running timers
        isInitialOpenRef.current = true;
        setModalVisible(true);
        onPause?.();
      }
    };

    check();
    return () => { mounted = false; };
  }, []);

  const markSeen = async () => {
    const key = SEEN_KEY_PREFIX + gameId;
    if (Platform.OS === 'web') {
      localStorage.setItem(key, 'true');
    } else {
      const SecureStore = await import('@/lib/storage');
      await SecureStore.setItemAsync(key, 'true');
    }
    setSeen(true);
  };

  const handleClose = () => {
    if (!seen) markSeen();
    setModalVisible(false);
    onResume?.();
    // Only call onStart when closing the initial instructions — not mid-game help re-opens
    if (isInitialOpenRef.current) {
      isInitialOpenRef.current = false;
      onStart();
    }
  };

  return (
    <>
      {/* Help button — ALWAYS visible */}
      <TouchableOpacity onPress={() => { isInitialOpenRef.current = false; onPause?.(); setModalVisible(true); }} style={styles.helpBtn} activeOpacity={0.7}>
        <Ionicons name="help-circle-outline" size={22} color={Colors.accent} />
      </TouchableOpacity>

      {/* Instructions modal */}
      <Modal visible={modalVisible === true} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="book-outline" size={28} color={Colors.accent} />
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>Як грати:</Text>
            {steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}

            <TouchableOpacity onPress={handleClose} activeOpacity={0.85} style={{ marginTop: Spacing.lg }}>
              <LinearGradient
                colors={['#C8901A', '#F5C542', '#C8901A']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.startBtn}
              >
                <Text style={styles.startBtnText}>{seen ? 'Продовжити' : 'Почати'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#1A0A00" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  helpBtn: {
    position: 'absolute', top: 58, right: 14, zIndex: 50,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(139,92,246,0.2)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#1E1350',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalTitle: { flex: 1, color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  subtitle: {
    color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700',
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(245,197,66,0.15)',
    borderWidth: 1, borderColor: 'rgba(245,197,66,0.3)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  stepNumText: { color: Colors.accent, fontSize: 12, fontWeight: '700' },
  stepText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, flex: 1 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: 14, borderRadius: BorderRadius.full,
  },
  startBtnText: { color: '#1A0A00', fontSize: FontSize.md, fontWeight: '800' },
});
