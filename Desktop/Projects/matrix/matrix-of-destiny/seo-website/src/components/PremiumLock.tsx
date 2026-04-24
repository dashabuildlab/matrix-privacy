// Premium-lock was coupled to Tarot daily-spread limits.
// With Tarot removed there are no daily limits, so this is a pass-through wrapper.

import type { ReactNode } from 'react';

export default function PremiumLock({ children }: { locale?: string; children: ReactNode }) {
  return <>{children}</>;
}
