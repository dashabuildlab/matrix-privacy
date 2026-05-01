import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Animated, Easing } from 'react-native';
import React, { useEffect, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';
import { WebSidebar } from '@/components/ui/WebSidebar';
import { useResponsive } from '@/hooks/useResponsive';
import { setLastTabPress } from '@/lib/tabState';

function CenterTabIcon({ focused }: { focused: boolean }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      // Pulse once on focus
      Animated.sequence([
        Animated.spring(pulseAnim, { toValue: 1.15, tension: 300, friction: 5, useNativeDriver: true }),
        Animated.spring(pulseAnim, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true }),
      ]).start();
    }
    // Subtle continuous glow
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [focused]);

  return (
    <Animated.View style={[styles.centerIconWrapper, { transform: [{ scale: pulseAnim }] }]}>
      {focused && (
        <Animated.View style={[styles.centerGlow, { opacity: glowAnim }]} />
      )}
      <LinearGradient
        colors={focused ? ['#C8901A', '#F5C542'] : ['transparent', 'transparent']}
        style={styles.centerIconGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons
          name="sparkles"
          size={24}
          color={focused ? '#1A0A00' : 'rgba(255,255,255,0.45)'}
        />
      </LinearGradient>
    </Animated.View>
  );
}

export default function TabLayout() {
  const { t } = useI18n();
  const { showSidebar, isWeb, isMobile } = useResponsive();
  const insets = useSafeAreaInsets();

  /**
   * "Mobile web" needs slightly different tab-bar padding (no iOS safe-area
   * insets on web). On native (phone or iPad), we rely on useSafeAreaInsets.
   */
  // Web mobile needs different padding (no native safe-area insets).
  const isMobileWeb   = isWeb && isMobile;
  const bottomInset   = insets.bottom;

  const tabBarStyle = useMemo(() => {
    if (showSidebar) return { display: 'none' } as const;
    return {
      backgroundColor: '#100C28',
      borderTopColor:  'rgba(245,197,66,0.18)',
      borderTopWidth:  1,
      paddingBottom:   isMobileWeb ? 12 : Math.max(bottomInset, 8),
      paddingTop:      8,
      height:          isMobileWeb ? 64 : (60 + Math.max(bottomInset, 8)),
    };
  }, [showSidebar, isMobileWeb, bottomInset]);

  return (
    <View style={styles.root}>
      {showSidebar && <WebSidebar />}

      <View style={styles.content}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors.accent,
            tabBarInactiveTintColor: 'rgba(255,255,255,0.40)',
            tabBarStyle,
            tabBarLabelStyle: {
              fontSize: FontSize.xs,
              fontWeight: '600',
            },
            tabBarItemStyle: Platform.OS === 'android' ? {
              paddingTop: 4,
              paddingBottom: 10,
              minHeight: 64,
              paddingHorizontal: 8,
            } : undefined,
            tabBarIconStyle: Platform.OS === 'android' ? {
              marginBottom: 2,
            } : undefined,
            headerShown: false,
            headerStyle: { backgroundColor: '#0D0B1E' },
            headerTintColor: Colors.accent,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: FontSize.xl,
              color: Colors.accent,
            },
            headerShadowVisible: false,
            sceneStyle: {
              backgroundColor: Colors.bg,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t.tabs.today,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
            listeners={{ tabPress: () => setLastTabPress('index') }}
          />
          <Tabs.Screen
            name="ai"
            options={{
              title: t.tabs.ai,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="sparkles-outline" size={size} color={color} />
              ),
            }}
            listeners={{ tabPress: () => setLastTabPress('ai') }}
          />
          <Tabs.Screen
            name="matrix"
            options={{
              title: t.tabs.matrix,
              tabBarIcon: ({ focused }) => <CenterTabIcon focused={focused} />,
              tabBarLabelStyle: {
                fontSize: FontSize.xs,
                fontWeight: '600',
                color: Colors.accent,
              },
              tabBarStyle,
            }}
            listeners={{ tabPress: () => setLastTabPress('matrix') }}
          />
          <Tabs.Screen
            name="learn"
            options={{
              title: t.tabs.learn,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="school-outline" size={size} color={color} />
              ),
            }}
            listeners={{ tabPress: () => setLastTabPress('learn') }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: t.tabs.profile,
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
            }}
            listeners={{ tabPress: () => setLastTabPress('profile') }}
          />
          {/* Hidden tabs */}
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.bg,
  },
  centerIconWrapper: {
    top: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245,197,66,0.25)',
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  centerIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'ios' ? {
      shadowColor: '#F5C542',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
    } : {}),
  },
});
