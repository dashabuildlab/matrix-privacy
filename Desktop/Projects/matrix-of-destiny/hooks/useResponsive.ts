import { useWindowDimensions, Platform } from 'react-native';

/** Width of the left sidebar on tablet / desktop */
export const SIDEBAR_WIDTH = 240;

/** Maximum width for centred content on wide screens (iPad Pro landscape etc.) */
export const MAX_CONTENT_WIDTH = 680;

export const BREAKPOINTS = {
  /** Small phones */
  sm: 480,
  /** Tablet — sidebar appears */
  md: 768,
  /** Desktop */
  lg: 1024,
  /** Wide desktop */
  xl: 1280,
} as const;

/**
 * Central responsive hook.
 * - Reacts to window resize / orientation changes via useWindowDimensions.
 * - On web >= 768 px the sidebar is shown; content width is screen – sidebar.
 * - On native iPad (width >= 768) the sidebar replaces the bottom tab bar,
 *   exactly like the web tablet layout.
 */
export function useResponsive() {
  const { width: screenWidth, height } = useWindowDimensions();
  const isWeb    = Platform.OS === 'web';
  const isNative = !isWeb;

  const isMobile  = screenWidth < BREAKPOINTS.md;
  const isTablet  = screenWidth >= BREAKPOINTS.md && screenWidth < BREAKPOINTS.lg;
  const isDesktop = screenWidth >= BREAKPOINTS.lg;
  const isXL      = screenWidth >= BREAKPOINTS.xl;

  /**
   * True when running on a physical/simulated native tablet (iPad or Android
   * tablet with width >= 768 pt).  False on web (use isTablet / isDesktop there).
   */
  const isNativeTablet = isNative && !isMobile;

  /**
   * Show left sidebar instead of bottom tab bar.
   * Triggered by:
   *  – web at tablet/desktop width (>= 768 px)
   *  – native iPad / Android tablet (width >= 768 pt)
   */
  const showSidebar = (isWeb && !isMobile) || isNativeTablet;

  /** Usable content width after subtracting the sidebar */
  const contentWidth = showSidebar ? screenWidth - SIDEBAR_WIDTH : screenWidth;

  /**
   * True when the content area is wider than MAX_CONTENT_WIDTH.
   * Use this to centre content with alignSelf / maxWidth on wide iPads.
   */
  const isWideContent = contentWidth > MAX_CONTENT_WIDTH;

  /** Number of columns for a 4-max grid */
  const cols4 = contentWidth >= 1000 ? 4 : contentWidth >= 680 ? 2 : 1;

  /** Number of columns for a 3-max grid (features, spreads …) */
  const cols3 = contentWidth >= 900 ? 3 : contentWidth >= 560 ? 2 : 1;

  /** Number of columns for a 2-max grid (action cards, banners …) */
  const cols2 = contentWidth >= 560 ? 2 : 1;

  /**
   * Returns the optimal MatrixDiagram `size` for the current screen.
   * Caps at 400 on wide screens so the diagram stays readable.
   */
  const diagramSize = (padding = 0) =>
    Math.min(contentWidth - padding, 400);

  return {
    /** Effective content width (screen width minus sidebar if present) */
    width: contentWidth,
    screenWidth,
    height,
    isWeb,
    isNative,
    isMobile,
    isTablet,
    isDesktop,
    isXL,
    /** Native device with tablet-sized screen (iPad / Android tablet) */
    isNativeTablet,
    showSidebar,
    isWideContent,
    cols4,
    cols3,
    cols2,
    /** Helper: diagram size capped at 400 pt */
    diagramSize,
  };
}
