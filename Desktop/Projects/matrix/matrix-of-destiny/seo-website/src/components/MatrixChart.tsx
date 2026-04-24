type NodeData = { x: number; y: number; value: number; r?: number; main?: boolean };

const C = 300;
const R_OUTER = 250;
const R_INNER = 160;

const diamond: NodeData[] = [
  { x: C, y: C - R_OUTER, value: 5, main: true },
  { x: C + R_OUTER, y: C, value: 3, main: true },
  { x: C, y: C + R_OUTER, value: 3, main: true },
  { x: C - R_OUTER, y: C, value: 5, main: true },
];

const square: NodeData[] = [
  { x: C + R_OUTER * 0.707, y: C - R_OUTER * 0.707, value: 1, main: true },
  { x: C + R_OUTER * 0.707, y: C + R_OUTER * 0.707, value: 6, main: true },
  { x: C - R_OUTER * 0.707, y: C + R_OUTER * 0.707, value: 1, main: true },
  { x: C - R_OUTER * 0.707, y: C - R_OUTER * 0.707, value: 4, main: true },
];

const innerDiamond: NodeData[] = [
  { x: C, y: C - R_INNER, value: 6 },
  { x: C + R_INNER, y: C, value: 7 },
  { x: C, y: C + R_INNER, value: 3 },
  { x: C - R_INNER, y: C, value: 1 },
];

const midNodes: NodeData[] = [
  { x: (C + (C + R_OUTER * 0.707)) / 2, y: (C - R_OUTER + (C - R_OUTER * 0.707)) / 2, value: 3 },
  { x: ((C + R_OUTER) + (C + R_OUTER * 0.707)) / 2, y: (C + (C - R_OUTER * 0.707)) / 2, value: 8 },
  { x: ((C + R_OUTER) + (C + R_OUTER * 0.707)) / 2, y: (C + (C + R_OUTER * 0.707)) / 2, value: 4 },
  { x: ((C + R_OUTER * 0.707) + C) / 2, y: ((C + R_OUTER * 0.707) + (C + R_OUTER)) / 2, value: 6 },
  { x: (C + (C - R_OUTER * 0.707)) / 2, y: ((C + R_OUTER) + (C + R_OUTER * 0.707)) / 2, value: 2 },
  { x: ((C - R_OUTER) + (C - R_OUTER * 0.707)) / 2, y: (C + (C + R_OUTER * 0.707)) / 2, value: 5 },
  { x: ((C - R_OUTER) + (C - R_OUTER * 0.707)) / 2, y: (C + (C - R_OUTER * 0.707)) / 2, value: 7 },
  { x: (C + (C - R_OUTER * 0.707)) / 2, y: ((C - R_OUTER) + (C - R_OUTER * 0.707)) / 2, value: 2 },
];

const tinyNumbers = [
  { x: C, y: C - R_INNER * 0.55, value: 2 },
  { x: C + R_INNER * 0.55, y: C, value: 4 },
  { x: C, y: C + R_INNER * 0.55, value: 4 },
  { x: C - R_INNER * 0.55, y: C, value: 2 },
];

type Props = { className?: string };

export default function MatrixChart({ className }: Props) {
  const diamondPath = diamond.map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x},${n.y}`).join(' ') + ' Z';
  const squarePath = square.map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x},${n.y}`).join(' ') + ' Z';

  const spokes = [
    ...diamond.map(n => ({ x1: C, y1: C, x2: n.x, y2: n.y })),
    ...square.map(n => ({ x1: C, y1: C, x2: n.x, y2: n.y })),
  ];

  return (
    <svg
      className={className}
      viewBox="0 0 600 600"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Декоративна Матриця Долі"
    >
      <defs>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="strongGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="nodeFill" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#3d1f6e" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0f0428" stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id="centerFill" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor="#6b34c9" stopOpacity="1" />
          <stop offset="60%" stopColor="#3d1f6e" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0f0428" stopOpacity="0.9" />
        </radialGradient>
      </defs>

      {/* Outer decorative circle */}
      <circle
        cx={C}
        cy={C}
        r={R_OUTER + 20}
        fill="none"
        stroke="rgba(245, 197, 66, 0.25)"
        strokeWidth="1"
        strokeDasharray="2 6"
      />
      <circle
        cx={C}
        cy={C}
        r={R_OUTER + 8}
        fill="none"
        stroke="rgba(245, 197, 66, 0.4)"
        strokeWidth="1.2"
        filter="url(#softGlow)"
      />

      {/* Inner decorative circle */}
      <circle
        cx={C}
        cy={C}
        r={R_INNER}
        fill="none"
        stroke="rgba(245, 197, 66, 0.3)"
        strokeWidth="1"
        strokeDasharray="3 5"
      />

      {/* Spokes from center */}
      <g stroke="rgba(245, 197, 66, 0.55)" strokeWidth="1.2" filter="url(#softGlow)">
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
        ))}
      </g>

      {/* Octagram (two squares) */}
      <path d={diamondPath} fill="none" stroke="rgba(245, 197, 66, 0.75)" strokeWidth="1.6" filter="url(#softGlow)" />
      <path d={squarePath} fill="none" stroke="rgba(245, 197, 66, 0.75)" strokeWidth="1.6" filter="url(#softGlow)" />

      {/* Tiny numbers along spokes */}
      <g fill="rgba(245, 197, 66, 0.85)" fontSize="13" fontWeight="600" textAnchor="middle" dominantBaseline="central" fontFamily="Inter, sans-serif">
        {tinyNumbers.map((n, i) => (
          <text key={`t-${i}`} x={n.x} y={n.y}>{n.value}</text>
        ))}
      </g>

      {/* Mid nodes */}
      <g>
        {midNodes.map((n, i) => (
          <g key={`m-${i}`}>
            <circle cx={n.x} cy={n.y} r="14" fill="url(#nodeFill)" stroke="rgba(245, 197, 66, 0.55)" strokeWidth="1.2" filter="url(#softGlow)" />
            <text x={n.x} y={n.y} fill="rgba(245, 197, 66, 0.95)" fontSize="12" fontWeight="700" textAnchor="middle" dominantBaseline="central" fontFamily="Inter, sans-serif">
              {n.value}
            </text>
          </g>
        ))}
      </g>

      {/* Inner diamond nodes */}
      <g>
        {innerDiamond.map((n, i) => (
          <g key={`id-${i}`}>
            <circle cx={n.x} cy={n.y} r="18" fill="url(#nodeFill)" stroke="rgba(245, 197, 66, 0.7)" strokeWidth="1.5" filter="url(#softGlow)" />
            <text x={n.x} y={n.y} fill="#FFFFFF" fontSize="15" fontWeight="700" textAnchor="middle" dominantBaseline="central" fontFamily="Inter, sans-serif">
              {n.value}
            </text>
          </g>
        ))}
      </g>

      {/* 8 main outer nodes */}
      <g>
        {[...diamond, ...square].map((n, i) => (
          <g key={`o-${i}`}>
            <circle cx={n.x} cy={n.y} r="26" fill="url(#nodeFill)" stroke="rgba(245, 197, 66, 0.9)" strokeWidth="2" filter="url(#softGlow)" />
            <text x={n.x} y={n.y} fill="#FFFFFF" fontSize="20" fontWeight="800" textAnchor="middle" dominantBaseline="central" fontFamily="Inter, sans-serif">
              {n.value}
            </text>
          </g>
        ))}
      </g>

      {/* Center node */}
      <circle cx={C} cy={C} r="38" fill="url(#centerFill)" stroke="rgba(245, 197, 66, 1)" strokeWidth="2.5" filter="url(#strongGlow)" />
      <text x={C} y={C} fill="#FFFFFF" fontSize="30" fontWeight="900" textAnchor="middle" dominantBaseline="central" fontFamily="Inter, sans-serif">
        9
      </text>
    </svg>
  );
}
