import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, BorderRadius } from '@/constants/theme';
import { SIDEBAR_WIDTH } from '@/hooks/useResponsive';
import { useI18n } from '@/lib/i18n';

export function WebSidebar() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const isUk = locale === 'uk';
  const insets = useSafeAreaInsets();

  const NAV_ITEMS = [
    {
      label: isUk ? 'Сьогодні' : 'Today',
      icon: 'home-outline'  as const,
      iconActive: 'home'    as const,
      route: '/',
    },
    {
      label: isUk ? 'Матриця' : 'Matrix',
      icon: 'sparkles-outline'  as const,
      iconActive: 'sparkles'    as const,
      route: '/matrix',
    },
    {
      label: isUk ? 'Навчання' : 'Learn',
      icon: 'school-outline'  as const,
      iconActive: 'school'    as const,
      route: '/learn',
    },
    {
      label: isUk ? 'Профіль' : 'Profile',
      icon: 'person-outline'  as const,
      iconActive: 'person'    as const,
      route: '/profile',
    },
  ];

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  };

  return (
    <View style={[styles.sidebar, { paddingTop: Math.max(28, insets.top + 8), paddingBottom: Math.max(20, insets.bottom + 8) }]}>

      {/* ── Logo ── */}
      <View style={styles.logoSection}>
        <LinearGradient
          colors={['#C8901A', '#F5C542']}
          style={styles.logoIcon}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.logoIconText}>✦</Text>
        </LinearGradient>
        <View>
          <Text style={styles.logoTitle}>MATRIX OF</Text>
          <Text style={styles.logoSub}>DESTINY</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* ── Navigation label ── */}
      <Text style={styles.navSectionLabel}>{isUk ? 'НАВІГАЦІЯ' : 'NAVIGATION'}</Text>

      {/* ── Navigation ── */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.navigate(item.route as any)}
              activeOpacity={0.7}
            >
              {active && (
                <LinearGradient
                  colors={['rgba(245,197,66,0.14)', 'rgba(245,197,66,0.03)']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                />
              )}
              {/* Active indicator bar */}
              {active && <View style={styles.activeBar} />}

              <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                <Ionicons
                  name={active ? item.iconActive : item.icon}
                  size={19}
                  color={active ? Colors.accent : 'rgba(255,255,255,0.38)'}
                />
              </View>

              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>

              {active && (
                <View style={styles.activeDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Bottom section ── */}
      <View style={styles.sidebarBottom}>
        <View style={styles.bottomDivider} />
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomAppName}>Matrix of Destiny</Text>
          <Text style={styles.bottomVersion}>v1.0.0</Text>
        </View>
        <Text style={styles.sidebarBottomDec}>✦  ·  ✦  ·  ✦</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#07061A',
    borderRightWidth: 1,
    borderRightColor: 'rgba(245,197,66,0.12)',
    flexShrink: 0,
    flexDirection: 'column',
  },

  // Logo
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F5C542',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  logoIconText: {
    color: '#1A0A35',
    fontSize: 22,
    fontWeight: '900',
  },
  logoTitle: {
    color: Colors.accent,
    fontSize: FontSize.sm,
    fontWeight: '900',
    letterSpacing: 3,
    lineHeight: 18,
  },
  logoSub: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(245,197,66,0.10)',
    marginHorizontal: 20,
    marginBottom: 18,
  },

  navSectionLabel: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 22,
    marginBottom: 8,
  },

  // Nav
  nav: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 3,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  navItemActive: {},
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '15%',
    bottom: '15%',
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  navIconWrapActive: {
    backgroundColor: 'rgba(245,197,66,0.14)',
  },
  navLabel: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: FontSize.sm,
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    opacity: 0.7,
  },

  // Bottom
  sidebarBottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    alignItems: 'center',
  },
  bottomDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginBottom: 4,
  },
  bottomInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  bottomAppName: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
    fontWeight: '600',
  },
  bottomVersion: {
    color: 'rgba(255,255,255,0.15)',
    fontSize: 10,
  },
  sidebarBottomDec: {
    color: 'rgba(245,197,66,0.18)',
    fontSize: 10,
    letterSpacing: 4,
  },
});
