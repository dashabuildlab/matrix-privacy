import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Circle,
  Line,
  Text as SvgText,
  G,
  Defs,
  RadialGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { MatrixData, reduceToEnergy } from '@/lib/matrix-calc';

interface MatrixDiagramProps {
  data: MatrixData;
  onNodePress?: (key: string, value: number) => void;
  selectedNode?: string;
  size?: number;
  /** Replace numbers with mystical symbols (for blurred/teaser views) */
  mysteryMode?: boolean;
}

const DEFAULT_SIZE = 320;

/** Convert polar coords (angle from top, clockwise) to XY */
function polar(cx: number, cy: number, angle: number, r: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Energy-based color palette */
const ENERGY_COLORS: Record<number, string> = {
  1: '#EF4444', 2: '#818CF8', 3: '#10B981', 4: '#B91C1C',
  5: '#6B7280', 6: '#FB7185', 7: '#F97316', 8: '#F59E0B',
  9: '#6B7280', 10: '#EAB308', 11: '#F59E0B', 12: '#3B82F6',
  13: '#374151', 14: '#14B8A6', 15: '#DC2626', 16: '#F97316',
  17: '#60A5FA', 18: '#818CF8', 19: '#D4A017', 20: '#7C8A96',
  21: '#A78BFA', 22: '#6B7280',
};

/** Light colors need dark text */
const LIGHT_COLORS = new Set([8, 10, 11, 19]);

function energyColor(n: number) {
  return ENERGY_COLORS[n] ?? '#8B5CF6';
}

/** Axis node colors by position */
const AXIS_COLORS = {
  left:   '#7C3AED',
  top:    '#2563EB',
  right:  '#DC2626',
  bottom: '#D97706',
  center: '#F59E0B',
  corner: '#0D9488',
  mid:    '#6B7280',
};

interface NodeDef {
  key: string;
  x: number;
  y: number;
  value: number;
  r: number;
  color: string;
  textColor?: string;
  isOval?: boolean;
  labelBelow?: string;
  labelAbove?: string;
}

const MYSTERY_SYMBOLS = ['✦', '☽', '✧', '☆', '◇', '✶', '☾', '⟡', '◈', '✴', '⊛', '☿', '♃', '⚝', '✡', '☉', '♄', '⊹', '✺', '⟐', '◎'];

export function MatrixDiagram({
  data,
  onNodePress,
  selectedNode,
  size = DEFAULT_SIZE,
  mysteryMode = false,
}: MatrixDiagramProps) {
  // Multi-layer breathing + magic animations
  const breathe1 = useRef(new Animated.Value(0)).current;
  const breathe2 = useRef(new Animated.Value(0)).current;
  const nodePulse = useRef(new Animated.Value(0)).current;
  const linePulse = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(0)).current; // magical aura
  const sparkle1 = useRef(new Animated.Value(0)).current; // twinkling stars
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current; // slow rotation

  useEffect(() => {
    const anims = [
      Animated.loop(Animated.sequence([
        Animated.timing(breathe1, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(breathe1, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(breathe2, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(breathe2, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(nodePulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(nodePulse, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(linePulse, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(linePulse, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])),
      // Magical aura — large soft glow behind matrix
      Animated.loop(Animated.sequence([
        Animated.timing(auraPulse, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(auraPulse, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      // Twinkling sparkles — 3 different phases
      Animated.loop(Animated.sequence([
        Animated.timing(sparkle1, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sparkle1, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.delay(500),
        Animated.timing(sparkle2, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sparkle2, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.delay(1000),
        Animated.timing(sparkle3, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sparkle3, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])),
      // Slow rotation for aura
      Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })),
    ];
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  // Center glow interpolations
  const glow1Radius = breathe1.interpolate({ inputRange: [0, 1], outputRange: [4, 18] });
  const glow1Opacity = breathe1.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] });
  const glow2Radius = breathe2.interpolate({ inputRange: [0, 1], outputRange: [8, 28] });
  const glow2Opacity = breathe2.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.25] });
  // Node pulse — subtle stroke width change
  const nodeStroke = nodePulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] });
  const nodeGlowOpacity = nodePulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] });
  // Line pulse — opacity change
  const lineOpacity = linePulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] });

  const scale = size / DEFAULT_SIZE;
  const W = size;
  const H = size + 20 * scale;
  const CX = W / 2;
  const CY = H / 2;
  const R_OUTER = 125 * scale;
  const R_MID   = 82  * scale;
  const R_INNER = 46  * scale;
  const R_NEAR  = 24  * scale;

  const { positions } = data;
  const a = positions.a;
  const b = positions.b;
  const c = positions.c;
  const d = data.personality;
  const sp = data.spiritual;
  const mt = data.material;

  // LEFT axis  (outer → inner → center)
  const L0 = a;
  const L1 = reduceToEnergy(a + sp);
  const L2 = sp;
  const L3 = reduceToEnergy(sp + d);

  // RIGHT axis (center → inner → outer)
  const R3 = reduceToEnergy(mt + d);
  const R2 = mt;
  const R1 = reduceToEnergy(c + mt);
  const R0 = c;

  // TOP axis (outer → inner → center)
  const T0 = b;
  const T1 = reduceToEnergy(a + c);
  const T2 = reduceToEnergy(b + d);
  const T3 = reduceToEnergy(T2 + d);

  // BOTTOM axis (center → inner → outer)
  const B3 = reduceToEnergy(data.karmicTail + d);
  const B2 = data.karmicTail;
  const B1 = reduceToEnergy(B2 + data.soul);
  const B0 = reduceToEnergy(B1 + data.soul);

  // CORNER positions (diagonal)
  const TL = data.talentFromGod;
  const TR = data.talentFromFamily;
  const BR = data.purpose;
  const BL = data.parentKarma;

  // Outer octagon points
  const pTop       = polar(CX, CY, 0,   R_OUTER);
  const pTopRight  = polar(CX, CY, 45,  R_OUTER);
  const pRight     = polar(CX, CY, 90,  R_OUTER);
  const pBotRight  = polar(CX, CY, 135, R_OUTER);
  const pBot       = polar(CX, CY, 180, R_OUTER);
  const pBotLeft   = polar(CX, CY, 225, R_OUTER);
  const pLeft      = polar(CX, CY, 270, R_OUTER);
  const pTopLeft   = polar(CX, CY, 315, R_OUTER);

  // Intermediate axis points
  const lTop_1  = polar(CX, CY, 0,   R_MID);
  const lTop_2  = polar(CX, CY, 0,   R_INNER);
  const lTop_3  = polar(CX, CY, 0,   R_NEAR);
  const lBot_3  = polar(CX, CY, 180, R_NEAR);
  const lBot_2  = polar(CX, CY, 180, R_INNER);
  const lBot_1  = polar(CX, CY, 180, R_MID);
  const lLeft_1 = polar(CX, CY, 270, R_MID);
  const lLeft_2 = polar(CX, CY, 270, R_INNER);
  const lLeft_3 = polar(CX, CY, 270, R_NEAR);
  const lRight_3= polar(CX, CY, 90,  R_NEAR);
  const lRight_2= polar(CX, CY, 90,  R_INNER);
  const lRight_1= polar(CX, CY, 90,  R_MID);

  const lineColor  = 'rgba(139,92,246,0.25)';
  const line2Color = 'rgba(99,102,241,0.15)';

  const nodeSize = (r: number, selected: boolean) => r + (selected ? 3 : 0) * scale;

  const nodes: NodeDef[] = [
    // Center
    { key: 'center', x: CX, y: CY,        value: d,  r: 22*scale, color: AXIS_COLORS.center, textColor: '#000' },
    // Left axis
    { key: 'left_0', x: pLeft.x,   y: pLeft.y,   value: L0, r: 18*scale, color: AXIS_COLORS.left,   labelAbove: '0 р.' },
    { key: 'left_1', x: lLeft_1.x, y: lLeft_1.y, value: L1, r: 14*scale, color: energyColor(L1) },
    { key: 'left_2', x: lLeft_2.x, y: lLeft_2.y, value: L2, r: 13*scale, color: energyColor(L2) },
    { key: 'left_3', x: lLeft_3.x, y: lLeft_3.y, value: L3, r: 11*scale, color: energyColor(L3) },
    // Right axis
    { key: 'right_0', x: pRight.x,   y: pRight.y,   value: R0, r: 18*scale, color: AXIS_COLORS.right,  labelAbove: '40 р.' },
    { key: 'right_1', x: lRight_1.x, y: lRight_1.y, value: R1, r: 14*scale, color: energyColor(R1) },
    { key: 'right_2', x: lRight_2.x, y: lRight_2.y, value: R2, r: 13*scale, color: energyColor(R2) },
    { key: 'right_3', x: lRight_3.x, y: lRight_3.y, value: R3, r: 11*scale, color: energyColor(R3) },
    // Top axis
    { key: 'top_0', x: pTop.x,   y: pTop.y,   value: T0, r: 18*scale, color: AXIS_COLORS.top,    labelAbove: '20 р.' },
    { key: 'top_1', x: lTop_1.x, y: lTop_1.y, value: T1, r: 14*scale, color: energyColor(T1) },
    { key: 'top_2', x: lTop_2.x, y: lTop_2.y, value: T2, r: 13*scale, color: energyColor(T2) },
    { key: 'top_3', x: lTop_3.x, y: lTop_3.y, value: T3, r: 11*scale, color: energyColor(T3) },
    // Bottom axis
    { key: 'bot_3', x: lBot_3.x, y: lBot_3.y, value: B3, r: 11*scale, color: energyColor(B3) },
    { key: 'bot_2', x: lBot_2.x, y: lBot_2.y, value: B2, r: 13*scale, color: AXIS_COLORS.bottom },
    { key: 'bot_1', x: lBot_1.x, y: lBot_1.y, value: B1, r: 14*scale, color: energyColor(B1) },
    { key: 'bot_0', x: pBot.x,   y: pBot.y,   value: B0, r: 18*scale, color: AXIS_COLORS.right, labelBelow: '60 р.' },
    // Corner nodes
    { key: 'topLeft',  x: pTopLeft.x,  y: pTopLeft.y,  value: TL, r: 12*scale, color: AXIS_COLORS.corner, labelAbove: '10 р.' },
    { key: 'topRight', x: pTopRight.x, y: pTopRight.y, value: TR, r: 12*scale, color: AXIS_COLORS.corner, labelAbove: '30 р.' },
    { key: 'botRight', x: pBotRight.x, y: pBotRight.y, value: BR, r: 12*scale, color: AXIS_COLORS.corner, labelBelow: '50 р.' },
    { key: 'botLeft',  x: pBotLeft.x,  y: pBotLeft.y,  value: BL, r: 12*scale, color: AXIS_COLORS.corner, labelBelow: '70 р.' },
  ];

  const auraOp = auraPulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] });
  const auraScale = auraPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.05] });
  const rotateDeg = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ width: W, height: H }}>
      {/* ── Magical aura glow ── */}
      <Animated.View style={{
        position: 'absolute',
        width: W * 0.8, height: W * 0.8,
        left: W * 0.1, top: (H - W * 0.8) / 2,
        borderRadius: W * 0.4,
        backgroundColor: 'rgba(139,92,246,0.12)',
        opacity: auraOp,
        transform: [{ scale: auraScale }, { rotate: rotateDeg }],
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
        elevation: 10,
      }} />
      {/* Second aura — gold tint */}
      <Animated.View style={{
        position: 'absolute',
        width: W * 0.5, height: W * 0.5,
        left: W * 0.25, top: (H - W * 0.5) / 2,
        borderRadius: W * 0.25,
        backgroundColor: 'rgba(245,197,66,0.08)',
        opacity: auraPulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.3] }),
        transform: [{ scale: auraPulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.1] }) }],
      }} />

      {/* ── Twinkling sparkles ── */}
      {[
        { x: W * 0.12, y: H * 0.2, anim: sparkle1, size: 6 },
        { x: W * 0.85, y: H * 0.15, anim: sparkle2, size: 5 },
        { x: W * 0.08, y: H * 0.7, anim: sparkle3, size: 4 },
        { x: W * 0.9, y: H * 0.65, anim: sparkle1, size: 5 },
        { x: W * 0.5, y: H * 0.05, anim: sparkle2, size: 4 },
        { x: W * 0.3, y: H * 0.85, anim: sparkle3, size: 3 },
        { x: W * 0.75, y: H * 0.9, anim: sparkle1, size: 4 },
        { x: W * 0.15, y: H * 0.45, anim: sparkle2, size: 3 },
      ].map((s, i) => (
        <Animated.View key={`sparkle-${i}`} style={{
          position: 'absolute', left: s.x, top: s.y,
          width: s.size, height: s.size, borderRadius: s.size / 2,
          backgroundColor: i % 2 === 0 ? '#F5C542' : '#A78BFA',
          opacity: s.anim,
          shadowColor: i % 2 === 0 ? '#F5C542' : '#A78BFA',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: s.size * 2,
        }} />
      ))}

      {/* Pulsing glow layer behind lines */}
      <Animated.View style={{ position: 'absolute', width: W, height: H, opacity: lineOpacity }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {/* Bright octagon glow */}
          <Line x1={pTop.x} y1={pTop.y} x2={pTopRight.x} y2={pTopRight.y} stroke="rgba(167,139,250,0.5)" strokeWidth={2*scale} />
          <Line x1={pTopRight.x} y1={pTopRight.y} x2={pRight.x} y2={pRight.y} stroke="rgba(167,139,250,0.5)" strokeWidth={2*scale} />
          <Line x1={pRight.x} y1={pRight.y} x2={pBotRight.x} y2={pBotRight.y} stroke="rgba(167,139,250,0.5)" strokeWidth={2*scale} />
          <Line x1={pBotRight.x} y1={pBotRight.y} x2={pBot.x} y2={pBot.y} stroke="rgba(167,139,250,0.5)" strokeWidth={2*scale} />
          <Line x1={pBot.x} y1={pBot.y} x2={pBotLeft.x} y2={pBotLeft.y} stroke="rgba(167,139,250,0.5)" strokeWidth={2*scale} />
          <Line x1={pBotLeft.x} y1={pBotLeft.y} x2={pLeft.x} y2={pLeft.y} stroke="rgba(167,139,250,0.5)" strokeWidth={2*scale} />
          <Line x1={pLeft.x} y1={pLeft.y} x2={pTopLeft.x} y2={pTopLeft.y} stroke="rgba(167,139,250,0.5)" strokeWidth={2*scale} />
          <Line x1={pTopLeft.x} y1={pTopLeft.y} x2={pTop.x} y2={pTop.y} stroke="rgba(167,139,250,0.5)" strokeWidth={2*scale} />
          {/* Bright axes glow */}
          <Line x1={pLeft.x} y1={pLeft.y} x2={pRight.x} y2={pRight.y} stroke="rgba(167,139,250,0.4)" strokeWidth={2*scale} />
          <Line x1={pTop.x} y1={pTop.y} x2={pBot.x} y2={pBot.y} stroke="rgba(167,139,250,0.4)" strokeWidth={2*scale} />
          <Line x1={pTopLeft.x} y1={pTopLeft.y} x2={pBotRight.x} y2={pBotRight.y} stroke="rgba(139,92,246,0.35)" strokeWidth={1.5*scale} />
          <Line x1={pTopRight.x} y1={pTopRight.y} x2={pBotLeft.x} y2={pBotLeft.y} stroke="rgba(139,92,246,0.35)" strokeWidth={1.5*scale} />
        </Svg>
      </Animated.View>

      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* ── Structural lines ── */}
        {/* Outer octagon */}
        <Line x1={pTop.x}      y1={pTop.y}      x2={pTopRight.x}  y2={pTopRight.y}  stroke={lineColor} strokeWidth={1*scale} />
        <Line x1={pTopRight.x} y1={pTopRight.y} x2={pRight.x}     y2={pRight.y}     stroke={lineColor} strokeWidth={1*scale} />
        <Line x1={pRight.x}    y1={pRight.y}    x2={pBotRight.x}  y2={pBotRight.y}  stroke={lineColor} strokeWidth={1*scale} />
        <Line x1={pBotRight.x} y1={pBotRight.y} x2={pBot.x}       y2={pBot.y}       stroke={lineColor} strokeWidth={1*scale} />
        <Line x1={pBot.x}      y1={pBot.y}      x2={pBotLeft.x}   y2={pBotLeft.y}   stroke={lineColor} strokeWidth={1*scale} />
        <Line x1={pBotLeft.x}  y1={pBotLeft.y}  x2={pLeft.x}      y2={pLeft.y}      stroke={lineColor} strokeWidth={1*scale} />
        <Line x1={pLeft.x}     y1={pLeft.y}     x2={pTopLeft.x}   y2={pTopLeft.y}   stroke={lineColor} strokeWidth={1*scale} />
        <Line x1={pTopLeft.x}  y1={pTopLeft.y}  x2={pTop.x}       y2={pTop.y}       stroke={lineColor} strokeWidth={1*scale} />

        {/* Main axes */}
        <Line x1={pLeft.x}  y1={pLeft.y}  x2={pRight.x} y2={pRight.y} stroke={lineColor} strokeWidth={1*scale} />
        <Line x1={pTop.x}   y1={pTop.y}   x2={pBot.x}   y2={pBot.y}   stroke={lineColor} strokeWidth={1*scale} />

        {/* Diagonal cross */}
        <Line x1={pTopLeft.x}  y1={pTopLeft.y}  x2={pBotRight.x} y2={pBotRight.y} stroke={line2Color} strokeWidth={0.8*scale} />
        <Line x1={pTopRight.x} y1={pTopRight.y} x2={pBotLeft.x}  y2={pBotLeft.y}  stroke={line2Color} strokeWidth={0.8*scale} />

        {/* Inner square 1: cardinal corners */}
        <Line x1={pTop.x}   y1={pTop.y}   x2={pRight.x} y2={pRight.y} stroke={line2Color} strokeWidth={0.8*scale} />
        <Line x1={pRight.x} y1={pRight.y} x2={pBot.x}   y2={pBot.y}   stroke={line2Color} strokeWidth={0.8*scale} />
        <Line x1={pBot.x}   y1={pBot.y}   x2={pLeft.x}  y2={pLeft.y}  stroke={line2Color} strokeWidth={0.8*scale} />
        <Line x1={pLeft.x}  y1={pLeft.y}  x2={pTop.x}   y2={pTop.y}   stroke={line2Color} strokeWidth={0.8*scale} />

        {/* Inner square 2: diagonal corners */}
        <Line x1={pTopLeft.x}  y1={pTopLeft.y}  x2={pTopRight.x}  y2={pTopRight.y}  stroke={line2Color} strokeWidth={0.8*scale} />
        <Line x1={pTopRight.x} y1={pTopRight.y} x2={pBotRight.x}  y2={pBotRight.y}  stroke={line2Color} strokeWidth={0.8*scale} />
        <Line x1={pBotRight.x} y1={pBotRight.y} x2={pBotLeft.x}   y2={pBotLeft.y}   stroke={line2Color} strokeWidth={0.8*scale} />
        <Line x1={pBotLeft.x}  y1={pBotLeft.y}  x2={pTopLeft.x}   y2={pTopLeft.y}   stroke={line2Color} strokeWidth={0.8*scale} />

        {/* Male/Female diagonal lines (colored) */}
        <Line x1={pLeft.x}     y1={pLeft.y}     x2={pTop.x}       y2={pTop.y}       stroke="rgba(59,130,246,0.35)" strokeWidth={1*scale} strokeDasharray="4,3" />
        <Line x1={pTop.x}      y1={pTop.y}       x2={pRight.x}     y2={pRight.y}     stroke="rgba(236,72,153,0.35)" strokeWidth={1*scale} strokeDasharray="4,3" />

        {/* ── Nodes ── */}
        {nodes.map((node) => {
          const isSelected = selectedNode === node.key;
          const nr = nodeSize(node.r, isSelected);
          const fontSize = nr * 0.55;
          const textLen = String(node.value).length;
          const isCenter = node.key === 'center';

          return (
            <G key={node.key}>
              {/* Label above */}
              {node.labelAbove && (
                <SvgText
                  x={node.x}
                  y={node.y - nr - 5 * scale}
                  fontSize={8 * scale}
                  fill="rgba(156,163,175,0.9)"
                  textAnchor="middle"
                >
                  {node.labelAbove}
                </SvgText>
              )}

              {/* Center node — double glow rings */}
              {isCenter && (
                <>
                  <AnimatedCircle
                    cx={node.x}
                    cy={node.y}
                    r={Animated.add(nr + 6, glow2Radius)}
                    fill="none"
                    stroke="#F5C542"
                    strokeWidth={1 * scale}
                    opacity={glow2Opacity}
                  />
                  <AnimatedCircle
                    cx={node.x}
                    cy={node.y}
                    r={Animated.add(nr + 2, glow1Radius)}
                    fill="none"
                    stroke="#F5C542"
                    strokeWidth={2 * scale}
                    opacity={glow1Opacity}
                  />
                </>
              )}

              {/* All nodes — subtle glow ring */}
              {!isCenter && (
                <AnimatedCircle
                  cx={node.x}
                  cy={node.y}
                  r={nr + 3}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={nodeStroke}
                  opacity={nodeGlowOpacity}
                />
              )}

              {/* Shadow */}
              <Circle
                cx={node.x + 1 * scale}
                cy={node.y + 1 * scale}
                r={nr + 1}
                fill="rgba(0,0,0,0.3)"
              />

              {/* Main circle */}
              <Circle
                cx={node.x}
                cy={node.y}
                r={nr}
                fill={node.color}
                stroke={isSelected ? '#FFFFFF' : isCenter ? '#F5C542' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isSelected ? 2 * scale : isCenter ? 1.5 * scale : 1 * scale}
                onPress={() => onNodePress?.(node.key, node.value)}
              />

              {/* Number label */}
              <SvgText
                x={node.x}
                y={node.y + fontSize * 0.38}
                fontSize={fontSize}
                fontWeight="700"
                fill={node.textColor ?? (LIGHT_COLORS.has(node.value) ? '#1A0A35' : '#FFFFFF')}
                textAnchor="middle"
              >
                {mysteryMode ? MYSTERY_SYMBOLS[node.value % MYSTERY_SYMBOLS.length] : (isNaN(node.value) ? '' : node.value)}
              </SvgText>

              {/* Label below */}
              {node.labelBelow && (
                <SvgText
                  x={node.x}
                  y={node.y + nr + 12 * scale}
                  fontSize={8 * scale}
                  fill="rgba(156,163,175,0.9)"
                  textAnchor="middle"
                >
                  {node.labelBelow}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
