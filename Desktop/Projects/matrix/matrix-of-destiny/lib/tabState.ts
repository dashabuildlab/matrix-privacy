/**
 * Lightweight module-level state for tracking the last tab press.
 * Used by tab screens to decide whether to scroll-to-top on focus.
 * Kept outside _layout.tsx so screens don't require() a layout module.
 */

let _lastTabPress: { tab: string; ts: number } | null = null;

export function setLastTabPress(tab: string) {
  _lastTabPress = { tab, ts: Date.now() };
}

export function getLastTabPress() {
  return _lastTabPress;
}
