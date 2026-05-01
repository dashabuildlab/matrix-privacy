import { useWindowDimensions, Platform } from 'react-native';

/** Width of the left sidebar on tablet / desktop */
export const SIDEBAR_WIDTH = 240;

/** Maximum width for centred content on wide screens (iPad Pro landscape etc.) */
export const MAX_CONTENT_WIDTH = 680;

/** Standard horizontal inset used when computing MatrixDiagram size */
export const DIAGRAM_INSET = 64; // Spacing.lg * 4 — kept in sync with call sites

export const BREAKPOINTS = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// Platform.OS is constant per build — compute once at module level.
const IS_WEB = Platform.OS === 'web';

export function useResponsive() {
  const { width: screenWidth, height } = useWindowDimensions();

  const isWeb    = IS_WEB;
  const isNative = !IS_WEB;

  const isMobile  = screenWidth < BREAKPOINTS.md;
  const isTablet  = screenWidth >= BREAKPOINTS.md && screenWidth < BREAKPOINTS.lg;
  const isDesktop = screenWidth >= BREAKPOINTS.lg;
  const isXL      = screenWidth >= BREAKPOINTS.xl;

  // True on iPad / Android tablet (native device width >= 768 pt).
  const isNativeTablet = isNative && !isMobile;

  // Sidebar shown on web tablet/desktop and on native tablet (replaces bottom tab bar).
  const showSidebar = (isWeb && !isMobile) || isNativeTablet;

  // True on any tablet-or-larger screen regardless of platform.
  const isWide = isTablet || isDesktop;

  const contentWidth  = showSidebar ? screenWidth - SIDEBAR_WIDTH : screenWidth;
  const isWideContent = contentWidth > MAX_CONTENT_WIDTH;

  const cols4 = contentWidth >= 1000 ? 4 : contentWidth >= 680 ? 2 : 1;
  const cols3 = contentWidth >= 900  ? 3 : contentWidth >= 560 ? 2 : 1;
  const cols2 = contentWidth >= 560  ? 2 : 1;

  // Optimal MatrixDiagram size: content width minus horizontal insets, capped at 400 pt.
  const diagramSize = Math.min(contentWidth - DIAGRAM_INSET, 400);

  return {
    width: contentWidth,
    screenWidth,
    height,
    isWeb,
    isNative,
    isMobile,
    isTablet,
    isDesktop,
    isXL,
    isNativeTablet,
    isWide,
    showSidebar,
    isWideContent,
    cols4,
    cols3,
    cols2,
    diagramSize,
  };
}
