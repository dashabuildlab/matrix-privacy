/**
 * Zod schema for the server sync payload.
 * Any new field added to Zustand state that should be synced MUST be added here.
 * TypeScript will error at pushToServer() if the payload doesn't match.
 */
import { z } from 'zod';

const SavedMatrixSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  name: z.string(),
  birthDate: z.string(),
  group: z.string().optional(),
  data: z.any(),
  createdAt: z.string(),
  aiInterpretation: z.string().optional(),
  aiInterpretationLocale: z.string().optional(),
  aiInterpretationAt: z.string().optional(),
});

const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.string(),
});

const AIChatSessionSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  title: z.string(),
  context: z.enum(['matrix', 'general', 'destiny-matrix', 'daily-matrix']),
  matrixId: z.string().optional(),
  messages: z.array(ChatMessageSchema),
  createdAt: z.string(),
});

const CompatibilityReadingSchema = z.object({
  id: z.string(),
  date1: z.string(),
  date2: z.string(),
  locale: z.string(),
  aiInterpretation: z.string(),
  createdAt: z.string(),
});

const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  type: z.enum(['affirmation', 'streak', 'achievement', 'energy']),
  read: z.boolean(),
  createdAt: z.string(),
});

export const UserSyncPayloadSchema = z.object({
  // Profile
  userName: z.string().nullable(),
  userBirthDate: z.string().nullable(),
  userGender: z.enum(['male', 'female']).nullable(),
  personalMatrix: z.any().nullable(),
  // Onboarding prefs
  knowledgeLevel: z.enum(['beginner', 'intermediate', 'advanced']).nullable(),
  lifeFocus: z.array(z.string()),
  // Gamification
  xp: z.number(),
  level: z.number(),
  streak: z.number(),
  lastVisitDate: z.string().nullable(),
  tokens: z.number(),
  isPremium: z.boolean(),
  premiumPlan: z.enum(['yearly', 'monthly', 'weekly']).nullable(),
  referralCode: z.string().nullable(),
  referralCount: z.number(),
  onboardingCompleted: z.boolean(),
  unlockedAchievementIds: z.array(z.string()),
  // Collections
  savedMatrices: z.array(SavedMatrixSchema),
  chatSessions: z.array(AIChatSessionSchema),
  notifications: z.array(NotificationSchema),
  compatibilityReadings: z.array(CompatibilityReadingSchema),
});

export type UserSyncPayload = z.infer<typeof UserSyncPayloadSchema>;
