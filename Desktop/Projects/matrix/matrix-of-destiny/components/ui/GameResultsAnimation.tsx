// ─────────────────────────────────────────────────────────────────────────────
// GameResultsAnimation — magical results screen with star stamps, XP counter,
// 3D flip entrance, and ethereal dust particles
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

// ── Magical Dust Particles ──────────────────────────────────────────────────

function MagicDust({ count = 20, width = 300, height = 400 }: { count?: number; width?: number; height?: number }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      startY: height + Math.random() * 40,
      size: 2 + Math.random() * 3,
      duration: 3000 + Math.random() * 4000,
      delay: Math.random() * 3000,
      color: i % 3 === 0 ? '#F5C542' : i % 3 === 1 ? '#A78BFA' : '#C4B5FD',
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    particles.forEach((p) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, { toValue: 1, duration: p.duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(p.anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      loop.start();
    });
    return () => particles.forEach((p) => p.anim.stopAnimation());
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: p.color,
            opacity: p.anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0, 0.8, 0.6, 0] }),
            transform: [{
              translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [p.startY, -50] }),
            }],
            shadowColor: p.color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: p.size * 2,
          }}
        />
      ))}
    </View>
  );
}

// ── Star Stamp Animation ────────────────────────────────────────────────────

function StampedStars({ count, total = 3 }: { count: number; total?: number }) {
  const anims = useRef(Array.from({ length: total }, () => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    anims.forEach((a, i) => {
      if (i < count) {
        Animated.sequence([
          Animated.delay(600 + i * 400), // stagger
          Animated.parallel([
            Animated.spring(a.scale, {
              toValue: 1,
              tension: 200,
              friction: 6,
              useNativeDriver: true,
            }),
            Animated.timing(a.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      }
    });
  }, [count]);

  return (
    <View style={styles.starsRow}>
      {anims.map((a, i) => {
        const filled = i < count;
        return (
          <Animated.Text
            key={i}
            style={[
              styles.star,
              {
                opacity: filled ? a.opacity : 0.3,
                transform: filled ? [{ scale: a.scale.interpolate({ inputRange: [0, 0.5, 1], outputRange: [2.5, 0.85, 1] }) }] : [],
              },
            ]}
          >
            {filled ? '★' : '☆'}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ── XP Counter Animation ────────────────────────────────────────────────────

function AnimatedXP({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Entrance
    Animated.spring(scaleAnim, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true }).start();

    // Count up
    const duration = 1200;
    const steps = 30;
    const stepMs = duration / steps;
    let current = 0;
    const interval = setInterval(() => {
      current++;
      const progress = current / steps;
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      setDisplayValue(Math.round(eased * value));
      if (current >= steps) clearInterval(interval);
    }, stepMs);

    // Glow pulse during counting
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]),
      { iterations: Math.ceil(duration / 600) }
    ).start();

    return () => clearInterval(interval);
  }, [value]);

  const textColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#F5C542'],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Animated.Text style={[styles.xpText, { color: textColor }]}>
        +{displayValue} XP
      </Animated.Text>
    </Animated.View>
  );
}

// ── 3D Flip Card ────────────────────────────────────────────────────────────

interface GameResultsProps {
  title: string;
  stars: number; // 0-3
  xp: number;
  stats: { label: string; value: string }[];
  children?: React.ReactNode; // action buttons
}

export function GameResultsAnimation({ title, stars, xp, stats, children }: GameResultsProps) {
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 2D scale + fade entrance — no perspective/rotateY (avoids Android touch bugs)
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 130,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <MagicDust />

      <Animated.View style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}>
        <LinearGradient
          colors={['rgba(35,16,72,0.95)', 'rgba(18,8,45,0.95)']}
          style={styles.cardGradient}
        >
          {/* Liquid gradient border effect */}
          <View style={styles.borderGlow} />

          <Text style={styles.title}>{title}</Text>

          <StampedStars count={stars} />

          {/* Stats */}
          {stats.map((s, i) => (
            <View key={i} style={styles.statRow}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}

          {/* XP */}
          <AnimatedXP value={xp} />

          {/* Actions */}
          <View style={styles.actions}>
            {children}
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(245,197,66,0.3)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  cardGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  borderGlow: {
    position: 'absolute',
    top: -1, left: -1, right: -1, bottom: -1,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  star: {
    fontSize: 44,
    color: '#F5C542',
    textShadowColor: 'rgba(245,197,66,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  statValue: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  xpText: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    textShadowColor: 'rgba(245,197,66,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
});
