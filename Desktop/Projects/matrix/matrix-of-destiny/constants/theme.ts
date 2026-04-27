// ─────────────────────────────────────────────────────────────
//  Matrix of Destiny — Dark Cosmic Theme
//  Reference: deep purple space + gold accents + glassmorphism
// ─────────────────────────────────────────────────────────────

export const Colors = {
  // ── Backgrounds ───────────────────────────────────────────
  bg: '#0D0B1E',
  bgCard: 'rgba(25, 12, 55, 0.80)',
  bgCardLight: 'rgba(40, 20, 80, 0.65)',
  bgInput: 'rgba(255, 255, 255, 0.09)',

  // ── Primary — violet/purple ───────────────────────────────
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',
  primaryMuted: 'rgba(139, 92, 246, 0.20)',

  // ── Accent — gold (key design accent) ─────────────────────
  accent: '#F5C542',
  accentLight: '#FFE082',
  accentDark: '#C8901A',
  accentMuted: 'rgba(245, 197, 66, 0.15)',

  // ── Text ──────────────────────────────────────────────────
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.82)',
  textMuted: 'rgba(255,255,255,0.55)',

  // ── Status — purple family ────────────────────────────────
  success: '#A78BFA',
  warning: '#F5C542',
  error: '#C026D3',
  info: '#8B5CF6',

  // ── Mood — gold → deep purple ─────────────────────────────
  moodGreat: '#F5C542',
  moodGood: '#A78BFA',
  moodNeutral: '#8B5CF6',
  moodBad: '#6D28D9',
  moodTerrible: '#4C1D95',

  // ── Borders ───────────────────────────────────────────────
  border: 'rgba(245, 197, 66, 0.28)',      // gold border
  borderLight: 'rgba(255, 255, 255, 0.12)',

  // ── Gradients ─────────────────────────────────────────────
  gradientPurple: ['#5B21B6', '#8B5CF6'] as const,
  gradientGold: ['#C8901A', '#F5C542'] as const,
  gradientDark: ['#0D0B1E', '#1C1040', '#0D0B1E'] as const,
  gradientCard: ['rgba(30,15,65,0.85)', 'rgba(15,8,40,0.85)'] as const,

  // ── Overlay ───────────────────────────────────────────────
  overlay: 'rgba(0, 0, 0, 0.55)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

import { Platform, Dimensions } from 'react-native';

const _isWeb = Platform.OS === 'web';
const _isDesktopWeb = _isWeb && Dimensions.get('window').width >= 768;

export const FontSize = {
  xs: _isDesktopWeb ? 13 : 12,
  sm: _isDesktopWeb ? 15 : 14,
  md: _isDesktopWeb ? 17 : 15,
  lg: _isDesktopWeb ? 20 : 17,
  xl: _isDesktopWeb ? 26 : 22,
  xxl: _isDesktopWeb ? 32 : 28,
  title: _isDesktopWeb ? 38 : 34,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
