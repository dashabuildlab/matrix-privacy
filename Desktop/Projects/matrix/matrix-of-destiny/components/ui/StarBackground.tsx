import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// ── Static dim stars ──
const STARS = Array.from({ length: 50 }, (_, i) => ({
  x: (i * 97 + (i % 7) * 53 + (i % 3) * 29) % (width - 4),
  y: (i * 113 + (i % 5) * 71 + (i % 4) * 37) % (height - 4),
  size: 1 + (i % 3) * 0.5,
  opacity: 0.15 + (i % 5) * 0.06,
}));

// ── Bright twinkling stars ──
const TWINKLE_COUNT = 25;
const TWINKLE_DATA = Array.from({ length: TWINKLE_COUNT }, (_, i) => ({
  x: (i * 131 + (i % 5) * 67 + 23) % (width - 8),
  y: (i * 157 + (i % 3) * 89 + 41) % (height - 8),
  size: 2 + (i % 4) * 0.7,
  delay: (i * 350) % 3500,
  duration: 1800 + (i % 6) * 500,
  maxOpacity: 0.5 + (i % 4) * 0.15,
}));

// ── Large floating orbs ──
const ORBS = [
  { x: width * 0.15, startY: height * 0.6, size: 6, duration: 7000, delay: 0, color: 'rgba(167,139,250,0.35)' },
  { x: width * 0.75, startY: height * 0.4, size: 5, duration: 9000, delay: 1500, color: 'rgba(245,197,66,0.30)' },
  { x: width * 0.45, startY: height * 0.8, size: 7, duration: 8000, delay: 800, color: 'rgba(139,92,246,0.35)' },
  { x: width * 0.85, startY: height * 0.7, size: 4, duration: 10000, delay: 3000, color: 'rgba(245,197,66,0.25)' },
  { x: width * 0.25, startY: height * 0.3, size: 5, duration: 7500, delay: 2000, color: 'rgba(167,139,250,0.30)' },
  { x: width * 0.6, startY: height * 0.55, size: 6, duration: 8500, delay: 500, color: 'rgba(110,40,190,0.30)' },
];

// ── Small rising particles ──
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  x: (i * 67 + 20) % (width - 10),
  startY: height * 0.2 + (i * 83) % (height * 0.7),
  size: 2 + (i % 3),
  duration: 5000 + (i % 5) * 2000,
  delay: (i * 800) % 4000,
  color: i % 3 === 0 ? 'rgba(245,197,66,0.40)' : i % 3 === 1 ? 'rgba(167,139,250,0.45)' : 'rgba(139,92,246,0.40)',
}));

// ── Twinkling star component ──
function TwinkleStar({ x, y, size, delay, duration, maxOpacity }: typeof TWINKLE_DATA[0]) {
  const anim = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: maxOpacity, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.08, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        opacity: anim,
        top: y, left: x,
      }}
    />
  );
}

// ── Floating orb — big, slow, very visible ──
function FloatingOrb({ x, startY, size, duration, delay, color }: typeof ORBS[0]) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const driftY = -100 - Math.random() * 80;
    const driftX = -20 + Math.random() * 40;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, { toValue: driftY, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(translateX, { toValue: driftX, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.2, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: duration * 0.25, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.delay(duration * 0.5),
            Animated.timing(opacity, { toValue: 0, duration: duration * 0.25, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ]),
        // Reset
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        top: startY, left: x,
        opacity,
        transform: [{ translateY }, { translateX }, { scale }],
        ...(Platform.OS !== 'web' ? {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: size * 2,
          elevation: 3,
        } : {}),
      }}
    />
  );
}

// ── Small rising particle ──
function RisingParticle({ x, startY, size, duration, delay, color }: typeof PARTICLES[0]) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drift = -70 - Math.random() * 50;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, { toValue: drift, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.9, duration: duration * 0.2, easing: Easing.out(Easing.sin), useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: duration * 0.8, easing: Easing.in(Easing.sin), useNativeDriver: true }),
          ]),
        ]),
        Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color,
        top: startY, left: x,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ── Breathing nebula ──
function BreathingNebula({ colors, style, delay = 0 }: { colors: string[]; style: any; delay?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.15, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
      <LinearGradient colors={colors as [string, string, ...string[]]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
    </Animated.View>
  );
}

// ── Pulsing geo ring ──
function PulsingRing({ size: ringSize, top, opacity: baseOpacity }: { size: number; top: number; opacity: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(baseOpacity)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: baseOpacity * 2.5, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: baseOpacity, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[styles.geoRing, {
        width: ringSize, height: ringSize,
        top, left: (width - ringSize) / 2,
        opacity: opacityAnim,
        transform: [{ scale }],
      }]}
    />
  );
}

interface Props {
  children?: React.ReactNode;
  style?: object;
}

export function StarBackground({ children, style }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }, style]}>
      {/* ── Base gradient ── */}
      <LinearGradient
        colors={['#0D0B1E', '#130C30', '#1C1040', '#0D0B1E']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* ── Breathing nebulas ── */}
      <BreathingNebula
        colors={['rgba(90, 35, 160, 0.50)', 'transparent']}
        style={[styles.nebula, { width: 320, height: 320, top: -80, right: -60 }]}
        delay={0}
      />
      <BreathingNebula
        colors={['rgba(60, 20, 130, 0.42)', 'transparent']}
        style={[styles.nebula, { width: 280, height: 280, top: height * 0.25, left: -90 }]}
        delay={2000}
      />
      <BreathingNebula
        colors={['rgba(110, 40, 190, 0.35)', 'transparent']}
        style={[styles.nebula, { width: 240, height: 240, bottom: height * 0.1, right: -30 }]}
        delay={4000}
      />
      <BreathingNebula
        colors={['rgba(50, 15, 100, 0.32)', 'transparent']}
        style={[styles.nebula, { width: 200, height: 200, bottom: -40, left: 40 }]}
        delay={1000}
      />

      {/* ── Pulsing geometry ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <PulsingRing size={340} top={height * 0.15} opacity={0.04} />
        <PulsingRing size={240} top={height * 0.15 + 50} opacity={0.06} />
        <PulsingRing size={140} top={height * 0.15 + 100} opacity={0.08} />
      </View>

      {/* ── Static stars ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {STARS.map((s, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: s.size, height: s.size, borderRadius: s.size / 2,
              backgroundColor: '#FFFFFF',
              opacity: s.opacity,
              top: s.y, left: s.x,
            }}
          />
        ))}
      </View>

      {/* ── Twinkling stars ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {TWINKLE_DATA.map((s, i) => (
          <TwinkleStar key={`tw-${i}`} {...s} />
        ))}
      </View>

      {/* ── Floating orbs (large, visible) ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {ORBS.map((o, i) => (
          <FloatingOrb key={`orb-${i}`} {...o} />
        ))}
      </View>

      {/* ── Rising particles ── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {PARTICLES.map((p, i) => (
          <RisingParticle key={`rp-${i}`} {...p} />
        ))}
      </View>

      {/* ── Content ── */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0B1E',
  },
  nebula: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  geoRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#A78BFA',
  },
});
