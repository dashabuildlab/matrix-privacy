import { useWindowDimensions, Platform } from 'react-native';

/** Width of the left sidebar on tablet / desktop web */
export const SIDEBAR_WIDTH = 240;

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
 * - Reacts to window resize / orientation changes (useWindowDimensions).
 * - On web >= 768 px the sidebar is shown; content width is screen – sidebar.
 */
export function useResponsive() {
  const { width: screenWidth, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const isMobile  = screenWidth < BREAKPOINTS.md;
  const isTablet  = screenWidth >= BREAKPOINTS.md && screenWidth < BREAKPOINTS.lg;
  const isDesktop = screenWidth >= BREAKPOINTS.lg;
  const isXL      = screenWidth >= BREAKPOINTS.xl;

  /** Sidebar visible on tablet and desktop web */
  const showSidebar = isWeb && !isMobile;

  /** Usable content width after subtracting the sidebar */
  const contentWidth = showSidebar ? screenWidth - SIDEBAR_WIDTH : screenWidth;

  /** Number of columns for a 4-max grid */
  const cols4 = contentWidth >= 1000 ? 4 : contentWidth >= 680 ? 2 : 1;

  /** Number of columns for a 3-max grid (features, spreads …) */
  const cols3 = contentWidth >= 900 ? 3 : contentWidth >= 560 ? 2 : 1;

  /** Number of columns for a 2-max grid (action cards, banners …) */
  const cols2 = contentWidth >= 560 ? 2 : 1;

  return {
    /** Effective content width (screen width minus sidebar if present) */
    width: contentWidth,
    screenWidth,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    isXL,
    showSidebar,
    cols4,
    cols3,
    cols2,
  };
}
