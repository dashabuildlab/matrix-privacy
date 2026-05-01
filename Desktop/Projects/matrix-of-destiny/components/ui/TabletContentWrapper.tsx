/**
 * TabletContentWrapper
 *
 * Centres scroll-view content on wide iPad / desktop screens by constraining
 * it to MAX_CONTENT_WIDTH. Transparent on phones — no layout change.
 *
 * Usage:
 *   <ScrollView contentContainerStyle={styles.scroll}>
 *     <TabletContentWrapper>
 *       ...your cards / sections...
 *     </TabletContentWrapper>
 *   </ScrollView>
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MAX_CONTENT_WIDTH, useResponsive } from '@/hooks/useResponsive';

interface Props {
  children: React.ReactNode;
  /** Extra horizontal padding on top of the built-in 16 pt */
  extraPadding?: number;
}

export function TabletContentWrapper({ children, extraPadding = 0 }: Props) {
  const { isWideContent } = useResponsive();

  if (!isWideContent) return <>{children}</>;

  return (
    <View style={[styles.wrapper, { paddingHorizontal: 16 + extraPadding }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
});
