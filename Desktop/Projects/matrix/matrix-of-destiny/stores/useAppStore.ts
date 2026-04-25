import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fileStorage } from '@/lib/persistStorage';
import { UserSyncPayloadSchema } from '@/lib/syncSchema';
import { exportSessionsSync, importSessionsSync, clearAllSessionsSync, updateSessionUserIdSync } from '@/lib/chatDb';
import { MatrixData } from '@/lib/matrix-calc';

import { Platform } from 'react-native';
import { trackSpendCurrency, trackLevelUp, trackAchievementUnlocked, trackAccountSwitch, trackAccountDelete } from '@/lib/analytics';

const API_BASE = Platform.OS === 'web' ? '' : 'https://yourmatrixofdestiny.com';

export interface SavedMatrix {
  id: string;
  userId?: string;
  name: string;
  birthDate: string;
  group?: string;
  data: MatrixData;
  createdAt: string;
  aiInterpretation?: string;
  aiInterpretationLocale?: string;
  aiInterpretationAt?: string;
}

export interface CompatibilityReading {
  id: string;
  date1: string;
  date2: string;
  locale: string;
  aiInterpretation: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AIChatSession {
  id: string;
  userId?: string;
  title: string;
  context: 'matrix' | 'general' | 'destiny-matrix' | 'daily-matrix';
  matrixId?: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  unlockedAt?: string;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_matrix', title: 'Перший крок', description: 'Створіть свою першу матрицю', icon: '🌟', xp: 50 },
  { id: 'streak_3', title: '3 дні поспіль', description: 'Відвідайте додаток 3 дні підряд', icon: '🔥', xp: 100 },
  { id: 'streak_7', title: 'Тиждень практики', description: 'Відвідайте додаток 7 днів підряд', icon: '💎', xp: 250 },
  { id: 'streak_30', title: 'Місяць мудрості', description: 'Відвідайте додаток 30 днів підряд', icon: '👑', xp: 1000 },
  { id: 'first_ai', title: 'Діалог з Всесвітом', description: 'Поставте перше питання AI', icon: '🤖', xp: 40 },
  { id: 'invite_1', title: 'Перший реферал', description: 'Запросіть першого друга', icon: '🤝', xp: 150 },
];

interface AppState {
  // Auth
  isAuthenticated: boolean;
  userId: string | null;

  // User profile
  userName: string | null;
  userBirthDate: string | null;
  userGender: 'male' | 'female' | null;
  setUserProfile: (name: string, birthDate: string) => void;
  setUserGender: (gender: 'male' | 'female') => void;

  // Onboarding preferences
  knowledgeLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  lifeFocus: string[];
  /** Daily "Energy of the Day" push reminder toggle. */
  dailyEnergyEnabled: boolean;
  setDailyEnergyEnabled: (v: boolean) => void;
  setOnboardingPreferences: (prefs: {
    knowledgeLevel: 'beginner' | 'intermediate' | 'advanced';
    lifeFocus: string[];
    dailyEnergyEnabled?: boolean;
  }) => void;

  // Personal matrix
  personalMatrix: MatrixData | null;
  setPersonalMatrix: (m: MatrixData) => void;
  matrixGenerated: boolean;
  setMatrixGenerated: (v: boolean) => void;
  dailyMatrixUsedFree: boolean;

  // Matrices
  savedMatrices: SavedMatrix[];
  addMatrix: (matrix: SavedMatrix) => void;
  removeMatrix: (id: string) => void;
  updateMatrixInterpretation: (id: string, interpretation: string, locale: string) => void;

  // Compatibility readings cache
  compatibilityReadings: CompatibilityReading[];
  addCompatibilityReading: (reading: CompatibilityReading) => void;
  getCompatibilityReading: (date1: string, date2: string, locale: string) => CompatibilityReading | null;

  // AI chat — session list lives in SQLite (lib/chatDb.ts), only active ID tracked here
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
  pendingChatNav: { question: string; title: string } | null;
  setPendingChatNav: (nav: { question: string; title: string } | null) => void;

  // Tokens / premium currency
  tokens: number;
  addTokens: (n: number) => void;
  useToken: () => boolean;
  spendCrystals: (amount: number) => boolean;

  // Subscription
  isPremium: boolean;
  premiumPlan: 'yearly' | 'monthly' | 'weekly' | null;
  setPremium: (val: boolean, plan?: 'yearly' | 'monthly' | 'weekly') => void;

  // Referral
  referralCode: string | null;
  referralCount: number;
  setReferralCode: (code: string) => void;
  incrementReferral: () => void;

  // Onboarding
  onboardingCompleted: boolean;
  setOnboardingCompleted: () => void;

  // Gamification
  xp: number;
  level: number;
  streak: number;
  lastVisitDate: string | null;
  achievements: Achievement[];
  unlockedAchievementIds: string[];
  viewedAchievementIds: string[];
  markAchievementsViewed: () => void;
  addXP: (amount: number) => void;
  checkAndUpdateStreak: () => { isNewDay: boolean; streakBroken: boolean; newStreak: number; bonusTokens?: number };
  unlockAchievement: (id: string) => Achievement | null;
  checkAchievements: () => Achievement[];
  notifications: NotificationItem[];
  addNotification: (notif: NotificationItem) => void;
  markNotificationRead: (id: string) => void;

  // Auth helpers
  logout: () => void;
  deleteAccount: () => Promise<void>;
  migrateGuestData: (newUserId: string) => void;

  // Server sync
  isSyncing: boolean;
  lastSyncedAt: string | null;
  showRegistrationPrompt: boolean;
  dismissRegistrationPrompt: () => void;
  syncWithServer: () => Promise<void>;
  pushToServer: () => Promise<void>;

  // ── Push notifications / daily gift ──
  firstOpenDate: string | null;
  pushEnabled: boolean;
  lastNotificationScheduledDate: string | null;
  lastGiftClaimedDate: string | null;
  consecutiveMissedGifts: number;
  pendingGift: { type: 'matrix-ai'; date: string } | null;
  claimedGiftToday: { type: 'matrix-ai'; date: string } | null;
  setFirstOpenDate: (date: string) => void;
  setPushEnabled: (v: boolean) => void;
  setLastNotificationScheduledDate: (date: string) => void;
  claimDailyGift: (diamondAmount: number) => void;
  incrementMissedGifts: () => void;
  canClaimGift: () => boolean;
  setPendingGift: (gift: { type: 'matrix-ai'; date: string } | null) => void;
  claimPendingGift: () => void;
  useClaimedGift: () => void;
  clearExpiredGifts: () => void;

  // ── Daily matrix history ──
  dailyMatrixHistory: DailyMatrixEntry[];
  addDailyMatrixEntry: (entry: DailyMatrixEntry) => void;
  getDailyMatrixEntry: (date: string) => DailyMatrixEntry | null;

  // ── Game high scores ──
  gameRecords: Record<string, number>;
  setGameRecord: (game: string, score: number) => boolean;
  setGameRecordMin: (game: string, score: number) => boolean;
  getGameRecord: (game: string) => number;

  // ── AI-generated content cache ──
  aiCache: Record<string, { text: string; ts: number }>;
  setAiCache: (key: string, text: string) => void;
  getAiCache: (key: string, maxAgeMs?: number) => string | null;

  // ── Pending PDF analysis ──
  pendingAnalysis: {
    matrixId: string;
    matrixName: string;
    matrixBirthDate: string;
    sections: string[];
    status: 'generating' | 'done' | 'error';
  } | null;
  setPendingAnalysis: (a: AppState['pendingAnalysis']) => void;
  clearPendingAnalysis: () => void;

}

export interface DailyMatrixEntry {
  date: string;
  dailyEnergyId: number;
  energyName: string;
  matrixPersonality: number;
  matrixSoul: number;
  matrixDestiny: number;
  matrixSpiritual: number;
  aiAnalysis: string;
  locale: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'affirmation' | 'streak' | 'achievement' | 'energy';
  read: boolean;
  createdAt: string;
}

const XP_PER_LEVEL = 500;

const getLevel = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  isAuthenticated: false,
  userId: null,

  userName: null,
  userBirthDate: null,
  userGender: null,
  setUserProfile: (name, birthDate) => set({ userName: name, userBirthDate: birthDate }),
  setUserGender: (gender) => set({ userGender: gender }),

  knowledgeLevel: null,
  lifeFocus: [],
  dailyEnergyEnabled: true,
  setDailyEnergyEnabled: (v) => set({ dailyEnergyEnabled: v }),
  setOnboardingPreferences: (prefs) => set({
    knowledgeLevel: prefs.knowledgeLevel,
    lifeFocus: prefs.lifeFocus,
    ...(prefs.dailyEnergyEnabled !== undefined ? { dailyEnergyEnabled: prefs.dailyEnergyEnabled } : {}),
  }),

  personalMatrix: null,
  setPersonalMatrix: (m) => set({ personalMatrix: m }),
  matrixGenerated: false,
  setMatrixGenerated: (v) => set({ matrixGenerated: v }),
  dailyMatrixUsedFree: false,

  savedMatrices: [],
  addMatrix: (matrix) =>
    set((state) => ({ savedMatrices: [{ ...matrix, userId: matrix.userId || state.userId || undefined }, ...state.savedMatrices] })),
  removeMatrix: (id) =>
    set((state) => ({
      savedMatrices: state.savedMatrices.filter((m) => m.id !== id),
    })),

  updateMatrixInterpretation: (id, interpretation, locale) =>
    set((state) => ({
      savedMatrices: state.savedMatrices.map((m) =>
        m.id === id
          ? { ...m, aiInterpretation: interpretation, aiInterpretationLocale: locale, aiInterpretationAt: new Date().toISOString() }
          : m
      ),
    })),

  compatibilityReadings: [],
  addCompatibilityReading: (reading) =>
    set((state) => ({
      compatibilityReadings: [
        reading,
        ...state.compatibilityReadings.filter((r) => r.id !== reading.id),
      ].slice(0, 100),
    })),
  getCompatibilityReading: (date1, date2, locale) => {
    const sorted = [date1, date2].sort();
    const id = `${sorted[0]}_${sorted[1]}_${locale}`;
    return get().compatibilityReadings.find((r) => r.id === id) ?? null;
  },

  activeSessionId: null,
  setActiveSession: (id) => set({ activeSessionId: id }),
  pendingChatNav: null,
  setPendingChatNav: (nav) => set({ pendingChatNav: nav }),

  tokens: 0,
  addTokens: (n) => set({ tokens: n }),
  useToken: () => {
    const state = get();
    if (state.isPremium) return true;
    if (state.tokens <= 0) return false;
    set({ tokens: 0 });
    trackSpendCurrency('ai_chat', state.tokens);
    return true;
  },
  spendCrystals: (amount) => {
    const state = get();
    if (state.isPremium) return true;
    if (state.tokens < amount) return false;
    set({ tokens: 0 });
    trackSpendCurrency('crystals', state.tokens);
    return true;
  },

  isPremium: false,
  premiumPlan: null,
  setPremium: (val, plan = undefined) =>
    set({ isPremium: val, premiumPlan: plan ?? null }),

  referralCode: null,
  referralCount: 0,
  setReferralCode: (code) => set({ referralCode: code }),
  incrementReferral: () =>
    set((state) => ({ referralCount: state.referralCount + 1 })),

  onboardingCompleted: false,
  setOnboardingCompleted: () => set({ onboardingCompleted: true }),

  xp: 0,
  level: 1,
  streak: 0,
  lastVisitDate: null,
  achievements: ALL_ACHIEVEMENTS,
  unlockedAchievementIds: [],
  viewedAchievementIds: [],
  markAchievementsViewed: () => set((s) => ({ viewedAchievementIds: [...s.unlockedAchievementIds] })),
  addXP: (amount) =>
    set((state) => {
      const newXP = state.xp + amount;
      const newLevel = getLevel(newXP);
      if (newLevel > state.level) trackLevelUp(newLevel);
      return { xp: newXP, level: newLevel };
    }),

  checkAndUpdateStreak: () => {
    const state = get();
    const today = new Date().toDateString();
    const lastVisit = state.lastVisitDate;

    if (lastVisit === today) {
      return { isNewDay: false, streakBroken: false, newStreak: state.streak };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    let newStreak = state.streak;
    let streakBroken = false;

    if (lastVisit === yesterdayStr) {
      newStreak = state.streak + 1;
    } else if (lastVisit !== null) {
      newStreak = 1;
      streakBroken = true;
    } else {
      newStreak = 1;
    }

    set({ streak: newStreak, lastVisitDate: today });

    get().addXP(20);

    return { isNewDay: true, streakBroken, newStreak };
  },

  unlockAchievement: (id: string) => {
    const state = get();
    if (state.unlockedAchievementIds.includes(id)) return null;
    const achievement = ALL_ACHIEVEMENTS.find((a) => a.id === id);
    if (!achievement) return null;

    const unlocked = { ...achievement, unlockedAt: new Date().toISOString() };
    set((s) => ({
      unlockedAchievementIds: [...s.unlockedAchievementIds, id],
      achievements: s.achievements.map((a) => a.id === id ? unlocked : a),
    }));
    get().addXP(achievement.xp);
    trackAchievementUnlocked(id, achievement.title);
    return unlocked;
  },

  checkAchievements: () => {
    const state = get();
    const newlyUnlocked: Achievement[] = [];

    const tryUnlock = (id: string) => {
      if (!state.unlockedAchievementIds.includes(id)) {
        const result = get().unlockAchievement(id);
        if (result) newlyUnlocked.push(result);
      }
    };

    if (state.savedMatrices.length >= 1) tryUnlock('first_matrix');
    if (state.streak >= 3) tryUnlock('streak_3');
    if (state.streak >= 7) tryUnlock('streak_7');
    if (state.streak >= 30) tryUnlock('streak_30');
    if (state.referralCount >= 1) tryUnlock('invite_1');
    return newlyUnlocked;
  },

  notifications: [],
  addNotification: (notif) =>
    set((state) => ({ notifications: [notif, ...state.notifications].slice(0, 50) })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  // ── Auth helpers ─────────────────────────────────────────────────
  logout: () => {
    set({
      isAuthenticated: false,
      userId: null,
      userName: null,
      userBirthDate: null,
      userGender: null,
      knowledgeLevel: null,
      lifeFocus: [],
      matrixGenerated: false,
      personalMatrix: null,
      savedMatrices: [],
      activeSessionId: null,
      tokens: 0,
      isPremium: false,
      premiumPlan: null,
      referralCode: null,
      referralCount: 0,
      xp: 0,
      level: 1,
      streak: 0,
      lastVisitDate: null,
      unlockedAchievementIds: [],
      achievements: ALL_ACHIEVEMENTS,
      notifications: [],
      compatibilityReadings: [],
      lastSyncedAt: null,
      showRegistrationPrompt: false,
      firstOpenDate: null,
      ...(clearAllSessionsSync(), {}),
      pushEnabled: true,
      lastGiftClaimedDate: null,
      consecutiveMissedGifts: 0,
      pendingGift: null,
      claimedGiftToday: null,
    });
  },

  deleteAccount: async () => {
    const userId = get().userId;
    trackAccountDelete(userId ?? 'unknown', get().isPremium);
    if (userId) {
      try {
        const { getIdToken } = await import('@/lib/firebaseAuth');
        const token = await getIdToken();
        await fetch(`${API_BASE}/api/user/${userId}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch (_) { /* server may be unreachable, still clear local data */ }
    }
    // Sign out from RevenueCat so the customer is unlinked
    try {
      if (Platform.OS !== 'web') {
        const mod = require('react-native-purchases');
        const RC = mod.default ?? mod;
        await RC.logOut().catch(() => {});
      }
    } catch (_) {}
    // Sign out from Firebase
    try {
      const { signOut } = await import('@/lib/firebaseAuth');
      await signOut();
    } catch (_) {}
    get().logout();
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('welcome_seen');
        localStorage.removeItem('onboarding_done');
      } else {
        const storage = require('@/lib/storage');
        await storage.deleteItemAsync('welcome_seen').catch(() => {});
        await storage.deleteItemAsync('onboarding_done').catch(() => {});
      }
    } catch (_) {}
  },

  migrateGuestData: (newUserId: string) => {
    const state = get();
    trackAccountSwitch(state.userId ?? 'guest', newUserId);
    set({
      userId: newUserId,
      savedMatrices: state.savedMatrices.map((m) => ({ ...m, userId: newUserId })),
    });
    const prevId = state.userId;
    if (prevId) updateSessionUserIdSync(prevId, newUserId);
  },

  // ── Server sync ────────────────────────────────────────────────────
  isSyncing: false,
  lastSyncedAt: null,
  showRegistrationPrompt: false,
  dismissRegistrationPrompt: () => set({ showRegistrationPrompt: false }),

  pushToServer: async () => {
    const state = get();
    if (!state.userId) return;
    try {
      const raw = {
        userName: state.userName,
        userBirthDate: state.userBirthDate,
        userGender: state.userGender,
        personalMatrix: state.personalMatrix,
        knowledgeLevel: state.knowledgeLevel,
        lifeFocus: state.lifeFocus,
        xp: state.xp,
        level: state.level,
        streak: state.streak,
        lastVisitDate: state.lastVisitDate,
        tokens: state.tokens,
        isPremium: state.isPremium,
        premiumPlan: state.premiumPlan,
        referralCode: state.referralCode,
        referralCount: state.referralCount,
        onboardingCompleted: state.onboardingCompleted,
        unlockedAchievementIds: state.unlockedAchievementIds,
        savedMatrices: state.savedMatrices,
        chatSessions: exportSessionsSync(20),
        notifications: state.notifications,
        compatibilityReadings: state.compatibilityReadings,
      };

      const payload = UserSyncPayloadSchema.parse(raw);

      const { getIdToken } = await import('@/lib/firebaseAuth');
      const token = await getIdToken();
      await fetch(`${API_BASE}/api/sync/${state.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ state: payload }),
      });
      set({ lastSyncedAt: new Date().toISOString() });
    } catch (err) {
      if (__DEV__) console.warn('[pushToServer] payload validation failed', err);
    }
  },

  syncWithServer: async () => {
    const state = get();
    if (!state.userId || state.isSyncing) return;
    set({ isSyncing: true });
    try {
      const { getIdToken } = await import('@/lib/firebaseAuth');
      const token = await getIdToken();
      const res = await fetch(`${API_BASE}/api/sync/${state.userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const { state: srv } = await res.json();
      if (!srv && !state.isAuthenticated) {
        set({ showRegistrationPrompt: true });
      }
      if (srv) {
        const mergeById = <T extends { id: string }>(a: T[], b: T[]): T[] => {
          const map = new Map<string, T>();
          [...a, ...b].forEach((x) => map.set(x.id, x));
          return Array.from(map.values());
        };
        set({
          userName: srv.userName ?? state.userName,
          userBirthDate: srv.userBirthDate ?? state.userBirthDate,
          userGender: srv.userGender ?? state.userGender,
          personalMatrix: srv.personalMatrix ?? state.personalMatrix,
          knowledgeLevel: srv.knowledgeLevel ?? state.knowledgeLevel,
          lifeFocus: srv.lifeFocus?.length ? srv.lifeFocus : state.lifeFocus,
          xp: Math.max(srv.xp ?? 0, state.xp),
          level: Math.max(srv.level ?? 1, state.level),
          streak: srv.streak ?? state.streak,
          lastVisitDate: srv.lastVisitDate ?? state.lastVisitDate,
          tokens: Math.max(srv.tokens ?? 0, state.tokens),
          isPremium: srv.isPremium || state.isPremium,
          premiumPlan: srv.premiumPlan ?? state.premiumPlan,
          referralCode: srv.referralCode ?? state.referralCode,
          referralCount: Math.max(srv.referralCount ?? 0, state.referralCount),
          onboardingCompleted: srv.onboardingCompleted || state.onboardingCompleted,
          unlockedAchievementIds: Array.from(new Set([...(srv.unlockedAchievementIds ?? []), ...state.unlockedAchievementIds])),
          savedMatrices: mergeById(srv.savedMatrices ?? [], state.savedMatrices),
          notifications: mergeById(srv.notifications ?? [], state.notifications),
          compatibilityReadings: mergeById(
            (srv.compatibilityReadings ?? []) as CompatibilityReading[],
            state.compatibilityReadings
          ).slice(0, 100),
        });
        if (srv.chatSessions?.length) {
          importSessionsSync(srv.chatSessions);
        }
      }
      await get().pushToServer();
    } catch {
      /* silent — offline or server unavailable */
    } finally {
      set({ isSyncing: false });
    }
  },

  // ── Push notifications / daily gift ──
  firstOpenDate: null,
  pushEnabled: true,
  lastNotificationScheduledDate: null,
  lastGiftClaimedDate: null,
  consecutiveMissedGifts: 0,
  pendingGift: null,
  claimedGiftToday: null,
  setFirstOpenDate: (date) => set({ firstOpenDate: date }),
  setPushEnabled: (v) => set({ pushEnabled: v }),
  setLastNotificationScheduledDate: (date) => set({ lastNotificationScheduledDate: date }),
  claimDailyGift: (diamondAmount) => {
    const today = new Date().toISOString().split('T')[0];
    set({
      lastGiftClaimedDate: today,
      tokens: diamondAmount,
      consecutiveMissedGifts: 0,
    });
  },
  incrementMissedGifts: () => set((s) => ({ consecutiveMissedGifts: s.consecutiveMissedGifts + 1 })),
  canClaimGift: () => {
    const state = get();
    if (!state.firstOpenDate) return false;
    const today = new Date().toISOString().split('T')[0];
    if (today <= state.firstOpenDate) return false;
    if (state.lastGiftClaimedDate === today) return false;
    return true;
  },
  setPendingGift: (gift) => set({ pendingGift: gift }),
  claimPendingGift: () => {
    const state = get();
    if (!state.pendingGift) return;
    const today = new Date().toISOString().split('T')[0];
    set({
      claimedGiftToday: { type: state.pendingGift.type, date: today },
      pendingGift: null,
    });
  },
  useClaimedGift: () => set({ claimedGiftToday: null }),
  clearExpiredGifts: () => {
    const today = new Date().toISOString().split('T')[0];
    const state = get();
    const updates: any = {};
    if (state.pendingGift && state.pendingGift.date < today) updates.pendingGift = null;
    if (state.claimedGiftToday && state.claimedGiftToday.date < today) updates.claimedGiftToday = null;
    if (Object.keys(updates).length > 0) set(updates);
  },

  dailyMatrixHistory: [],
  addDailyMatrixEntry: (entry) => set((s) => {
    const exists = s.dailyMatrixHistory.find((e) => e.date === entry.date && e.locale === entry.locale);
    if (exists) return {};
    return { dailyMatrixHistory: [entry, ...s.dailyMatrixHistory].slice(0, 30) };
  }),
  getDailyMatrixEntry: (date) => get().dailyMatrixHistory.find((e) => e.date === date) ?? null,

  gameRecords: {},
  setGameRecord: (game, score) => {
    const current = get().gameRecords[game] ?? 0;
    if (score > current) {
      set((s) => ({ gameRecords: { ...s.gameRecords, [game]: score } }));
      return true;
    }
    return false;
  },
  setGameRecordMin: (game, score) => {
    const current = get().gameRecords[game];
    if (current === undefined || score < current) {
      set((s) => ({ gameRecords: { ...s.gameRecords, [game]: score } }));
      return true;
    }
    return false;
  },
  getGameRecord: (game) => get().gameRecords[game] ?? 0,

  aiCache: {},
  setAiCache: (key, text) => set((s) => ({
    aiCache: { ...s.aiCache, [key]: { text, ts: Date.now() } },
  })),
  getAiCache: (key, maxAgeMs = 24 * 60 * 60 * 1000) => {
    const entry = get().aiCache[key];
    if (!entry) return null;
    if (Date.now() - entry.ts > maxAgeMs) return null;
    return entry.text;
  },

  pendingAnalysis: null,
  setPendingAnalysis: (a) => set({ pendingAnalysis: a }),
  clearPendingAnalysis: () => set({ pendingAnalysis: null }),
    }),
    {
      name: 'matrix-of-destiny-v1',
      version: 1,
      migrate: (persistedState: any, _version: number) => {
        return persistedState as AppState;
      },
      merge: (persistedState: any, currentState: AppState) => ({
        ...currentState,
        ...persistedState,
      }),
      storage: createJSONStorage(() => fileStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        userName: state.userName,
        userBirthDate: state.userBirthDate,
        userGender: state.userGender,
        knowledgeLevel: state.knowledgeLevel,
        lifeFocus: state.lifeFocus,
        savedMatrices: state.savedMatrices,
        tokens: state.tokens,
        isPremium: state.isPremium,
        premiumPlan: state.premiumPlan,
        referralCode: state.referralCode,
        referralCount: state.referralCount,
        onboardingCompleted: state.onboardingCompleted,
        xp: state.xp,
        level: state.level,
        streak: state.streak,
        lastVisitDate: state.lastVisitDate,
        achievements: state.achievements,
        unlockedAchievementIds: state.unlockedAchievementIds,
        viewedAchievementIds: state.viewedAchievementIds,
        notifications: state.notifications,
        lastSyncedAt: state.lastSyncedAt,
        firstOpenDate: state.firstOpenDate,
        pushEnabled: state.pushEnabled,
        lastGiftClaimedDate: state.lastGiftClaimedDate,
        consecutiveMissedGifts: state.consecutiveMissedGifts,
        personalMatrix: state.personalMatrix,
        matrixGenerated: state.matrixGenerated,
        aiCache: state.aiCache,
        gameRecords: state.gameRecords,
        dailyMatrixHistory: state.dailyMatrixHistory,
        compatibilityReadings: state.compatibilityReadings,
        pendingAnalysis: state.pendingAnalysis,
        _lastAppVersion: (state as any)._lastAppVersion,
      }),
    }
  )
);
