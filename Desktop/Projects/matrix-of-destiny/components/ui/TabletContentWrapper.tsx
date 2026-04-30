/**
 * TabletContentWrapper
 *
 * Centres scroll-view content on wide iPad / desktop screens by constraining
 * it to MAX_CONTENT_WIDTH and adding symmetrical horizontal padding.
 *
 * Usage — wrap the *inner content* of a ScrollView's contentContainerStyle:
 *
 *   <ScrollView contentContainerStyle={styles.scroll}>
 *     <TabletContentWrapper>
 *       ...your cards / sections...
 *     </TabletContentWrapper>
 *   </ScrollView>
 *
 * On phones the wrapper is transparent — no layout change.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MAX_CONTENT_WIDTH, useResponsive } from '@/hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  /** Extra horizontal padding added on top of the default 16 pt sides */
  extraPadding?: number;
}

export function TabletContentWrapper({ children, extraPadding = 0 }: Props) {
  const { isWideContent } = useResponsive();

  if (!isWideContent) {
    // Phone / small tablet — no centring, render children as-is
    return <>{children}</>;
  }

  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { paddingHorizontal: 16 + extraPadding }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  inner: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
  },
});
