'use client';

import { useId, useMemo, type ReactElement } from 'react';

import type { RollCut as RollCutData, RollFillingKind } from '@/types';

// Drawing area: the roll in the middle, labels on both sides
const W = 360;
const H = 250;
const CX = W / 2;
const CY = H / 2;
/** Outer edge of the roll */
const R = 88;
/** Edge of the filling */
const RF = 50;
const LABEL_LEFT_X = CX - R - 6;
const LABEL_RIGHT_X = CX + R + 6;
const LINE_HEIGHT = 14;

// Food colors: the drawing is the only place they appear
const RICE = '#e6dfd1';
const RICE_GRAINS = ['#f6f1e7', '#d6cebf'];
const NORI = '#1c2620';
const CRUNCHY_SPICY = ['#e0a24a', '#c9782f', '#f0c46a', '#b8362c', '#d9542f'];
const TEMPURA_CRUMBS = ['#e0a24a', '#c9822f', '#f0c46a'];

/** Deterministic random numbers, so a roll is drawn the same on every render */
function makeRandom(seedText: string): () => number {
  let seed = 7;
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) % 2147483647;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

const pointAt = (angle: number, radius: number): [number, number] => [
  CX + Math.cos(angle) * radius,
  CY + Math.sin(angle) * radius,
];

const sectorPath = (from: number, to: number): string => {
  const [x0, y0] = pointAt(from, RF);
  const [x1, y1] = pointAt(to, RF);
  const large = to - from > Math.PI ? 1 : 0;
  return `M${CX} ${CY} L${x0} ${y0} A${RF} ${RF} 0 ${large} 1 ${x1} ${y1}Z`;
};

/** Points on a jittered grid over the filling */
function grid(random: () => number, step: number): [number, number][] {
  const points: [number, number][] = [];
  for (let y = CY - RF; y <= CY + RF; y += step)
    for (let x = CX - RF; x <= CX + RF; x += step)
      points.push([x + (random() - 0.5) * step * 0.4, y + (random() - 0.5) * step * 0.4]);
  return points;
}

/** Curved stripes across the filling, like the grain of raw fish */
const stripes = (color: string, key: string): ReactElement[] =>
  Array.from({ length: 8 }, (_, i) => {
    const offset = -RF + i * 12;
    return (
      <path
        key={`${key}${i}`}
        d={`M${CX - RF + offset} ${CY - RF} Q${CX + offset - 10} ${CY} ${CX + offset + 8} ${CY + RF}`}
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    );
  });

/** Base color and texture of each filling, drawn over the whole filling disk and clipped to its slice */
function fillingTexture(kind: RollFillingKind, random: () => number, key: string): ReactElement[] {
  const base = (color: string) => <circle key={`${key}base`} cx={CX} cy={CY} r={RF} fill={color} />;
  switch (kind) {
    case 'salmon':
      return [base('#e8845e'), ...stripes('#f6c2a8', key)];
    case 'tuna':
      return [base('#a8303c'), ...stripes('#c95561', key)];
    case 'salmon-cooked':
      return [
        base('#eaa68a'),
        ...Array.from({ length: 46 }, (_, i) => {
          const [x, y] = [CX + (random() - 0.5) * 2 * RF, CY + (random() - 0.5) * 2 * RF];
          const angle = random() * Math.PI;
          return (
            <path
              key={`${key}${i}`}
              d={`M${x} ${y} l${Math.cos(angle) * 9} ${Math.sin(angle) * 9}`}
              stroke="#f8d6c6"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        }),
      ];
    case 'salmon-tempura':
      // Salmon in the middle, a golden crust around it
      return [
        base('#e8845e'),
        ...stripes('#f6c2a8', key),
        ...Array.from({ length: 170 }, (_, i) => {
          const angle = random() * Math.PI * 2;
          const [x, y] = pointAt(angle, RF * (0.55 + random() * 0.47));
          return (
            <circle
              key={`${key}c${i}`}
              cx={x}
              cy={y}
              r={1.6 + random() * 2}
              fill={TEMPURA_CRUMBS[Math.floor(random() * TEMPURA_CRUMBS.length)]}
            />
          );
        }),
      ];
    case 'avocado':
      return [
        base('#a9c062'),
        ...Array.from({ length: 4 }, (_, i) => (
          <circle key={`${key}${i}`} cx={CX} cy={CY} r={RF - 6 - i * 10} stroke="#d7e39a" strokeWidth={2.5} fill="none" />
        )),
      ];
    case 'cucumber':
      return [
        base('#dfe6c9'),
        ...grid(random, 15).map(([x, y], i) => (
          <rect
            key={`${key}${i}`}
            x={x - 6}
            y={y - 6}
            width={12}
            height={12}
            rx={2}
            fill="#6f9e4f"
            stroke="#cfe0a6"
            strokeWidth={1.5}
            transform={`rotate(${random() * 30 - 15} ${x} ${y})`}
          />
        )),
      ];
    case 'carrot':
      return [
        base('#f0e9dc'),
        ...grid(random, 9).map(([x, y], i) => (
          <rect
            key={`${key}${i}`}
            x={x - 3}
            y={y - 10}
            width={6}
            height={20}
            rx={1.5}
            fill="#e8833a"
            transform={`rotate(${35 + random() * 12} ${x} ${y})`}
          />
        )),
      ];
    case 'cream-cheese':
      return [
        base('#f5f1e8'),
        ...Array.from({ length: 3 }, (_, i) => (
          <path
            key={`${key}${i}`}
            d={`M${CX - RF} ${CY - 20 + i * 20} Q${CX} ${CY - 34 + i * 20} ${CX + RF} ${CY - 18 + i * 20}`}
            stroke="#e4ddcf"
            strokeWidth={3}
            fill="none"
          />
        )),
      ];
    case 'scallion':
      return [
        base('#eef1df'),
        ...grid(random, 11).map(([x, y], i) => (
          <circle key={`${key}${i}`} cx={x} cy={y} r={4} fill="#cfe3a8" stroke="#5f9a46" strokeWidth={2.2} />
        )),
      ];
    case 'chive':
      return [
        base('#e9efd9'),
        ...grid(random, 7).map(([x, y], i) => (
          <rect key={`${key}${i}`} x={x - 1.5} y={y - 9} width={3} height={18} rx={1.5} fill="#5f9a46" />
        )),
      ];
  }
}

/** Rice band between two radii, grain by grain */
function riceBand(random: () => number, from: number, to: number, count: number): ReactElement[] {
  return Array.from({ length: count }, (_, i) => {
    const [x, y] = pointAt(random() * Math.PI * 2, from + random() * (to - from));
    return (
      <ellipse
        key={`rice${i}`}
        cx={x}
        cy={y}
        rx={3.4}
        ry={2}
        fill={RICE_GRAINS[i % 2]}
        transform={`rotate(${random() * 180} ${x} ${y})`}
      />
    );
  });
}

interface Label {
  lines: string[];
  side: 'left' | 'right';
  y: number;
  anchor: [number, number];
}

/** "Queso crema" → ["QUESO", "CREMA"]: long labels go in two lines so they fit beside the roll */
const splitLabel = (text: string): string[] => {
  const upper = text.toUpperCase();
  const space = upper.indexOf(' ');
  return upper.length > 10 && space > 0 ? [upper.slice(0, space), upper.slice(space + 1)] : [upper];
};

/** Labels on both sides of the roll, spread so they never overlap */
function placeLabels(cut: RollCutData, sliceAngle: number, start: number): Label[] {
  const labels: Label[] = [];
  const count = { left: 0, right: 0 };
  const add = (text: string, angle: number, radius: number, preferred?: 'left' | 'right') => {
    const cos = Math.cos(angle);
    const side = preferred ?? (cos > 0.2 ? 'right' : cos < -0.2 ? 'left' : count.left <= count.right ? 'left' : 'right');
    count[side] += 1;
    labels.push({ lines: splitLabel(text), side, y: CY + Math.sin(angle) * (R + 6), anchor: pointAt(angle, radius) });
  };

  if (cut.topping) add(cut.topping.label, -Math.PI / 4, R - 4, 'right');
  cut.fillings.forEach((filling, i) => {
    const middle = start + sliceAngle * (i + 0.5);
    add(filling.label, middle, cut.fillings.length === 1 ? RF * 0.75 : RF * 0.58);
  });

  for (const side of ['left', 'right'] as const) {
    const column = labels.filter((label) => label.side === side).sort((a, b) => a.y - b.y);
    // Push down to keep a gap, then back up if the last one fell off the bottom
    for (let i = 0; i < column.length; i++) {
      const label = column[i];
      const previous = column[i - 1];
      const min = previous ? previous.y + previous.lines.length * LINE_HEIGHT + 12 : 24;
      label.y = Math.max(label.y, min);
    }
    for (let i = column.length - 1; i >= 0; i--) {
      const label = column[i];
      const next = column[i + 1];
      const max = next ? next.y - label.lines.length * LINE_HEIGHT - 12 : H - 10 - (label.lines.length - 1) * LINE_HEIGHT;
      label.y = Math.min(label.y, max);
    }
  }
  return labels;
}

interface RollCutProps {
  cut: RollCutData;
  /** Read by screen readers instead of the drawing */
  description: string;
  /** Seeds the texture, so each roll keeps its own look */
  seed: string;
}

/** Cross-section of a roll with each ingredient pointed out, until the roll has a photo */
export function RollCut({ cut, description, seed }: RollCutProps) {
  const clipId = useId();

  const drawing = useMemo(() => {
    const random = makeRandom(seed);
    const count = cut.fillings.length;
    const sliceAngle = (Math.PI * 2) / count;
    const start = -Math.PI / 2 - sliceAngle / 2;
    const uramaki = cut.wrap === 'uramaki';

    const shell: ReactElement[] = uramaki
      ? [
          <circle key="rice" cx={CX} cy={CY} r={R} fill={RICE} />,
          ...riceBand(random, RF + 8, R, 260),
          <circle key="nori" cx={CX} cy={CY} r={RF + 6} fill={NORI} />,
          <circle key="inner" cx={CX} cy={CY} r={RF + 2} fill={RICE} />,
        ]
      : [
          // A lighter edge, so the nori reads over the dark background
          <circle key="nori" cx={CX} cy={CY} r={R} fill={NORI} stroke="#4f6656" strokeWidth={1.5} />,
          <circle key="rice" cx={CX} cy={CY} r={R - 5} fill={RICE} />,
          ...riceBand(random, RF + 2, R - 5, 230),
        ];

    const topping = cut.topping
      ? Array.from({ length: 180 }, (_, i) => {
          const [x, y] = pointAt(random() * Math.PI * 2, R - 9 + random() * 12);
          return (
            <circle
              key={`top${i}`}
              cx={x}
              cy={y}
              r={1.6 + random() * 2.2}
              fill={CRUNCHY_SPICY[Math.floor(random() * CRUNCHY_SPICY.length)]}
            />
          );
        })
      : [];

    const slices = cut.fillings.map((filling, i) => {
      const from = start + sliceAngle * i;
      return {
        path: count === 1 ? null : sectorPath(from, from + sliceAngle),
        texture: fillingTexture(filling.kind, random, `f${i}`),
        edge: pointAt(from, RF),
      };
    });

    return { shell, topping, slices, labels: placeLabels(cut, sliceAngle, start) };
  }, [cut, seed]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={description} className="block h-auto w-full font-ui">
      {drawing.shell}
      {drawing.topping}
      <defs>
        {drawing.slices.map((slice, i) => (
          <clipPath key={i} id={`${clipId}-${i}`}>
            {slice.path ? <path d={slice.path} /> : <circle cx={CX} cy={CY} r={RF} />}
          </clipPath>
        ))}
      </defs>
      {drawing.slices.map((slice, i) => (
        <g key={i} clipPath={`url(#${clipId}-${i})`}>
          {slice.texture}
        </g>
      ))}
      {/* Without nori around it, the filling needs an edge to stand out from the rice */}
      {cut.wrap === 'hosomaki' && <circle cx={CX} cy={CY} r={RF} fill="none" stroke="#c9bfae" strokeWidth={1.5} />}
      {/* Rice between the slices */}
      {drawing.slices.length > 1 &&
        drawing.slices.map((slice, i) => (
          <line key={i} x1={CX} y1={CY} x2={slice.edge[0]} y2={slice.edge[1]} stroke={RICE} strokeWidth={3} />
        ))}

      {drawing.labels.map((label, i) => {
        const left = label.side === 'left';
        const startX = left ? LABEL_LEFT_X + 4 : LABEL_RIGHT_X - 4;
        const startY = label.y - 4;
        const [ax, ay] = label.anchor;
        const path = `M${startX} ${startY} Q${(startX + ax) / 2} ${startY} ${ax} ${ay}`;
        return (
          <g key={i}>
            {/* Dark under light: the line reads over the ink and over the rice */}
            <path d={path} fill="none" strokeWidth={3.5} strokeLinecap="round" className="stroke-sumi" />
            <path d={path} fill="none" strokeWidth={1.5} strokeLinecap="round" className="stroke-washi" />
            <circle cx={ax} cy={ay} r={3} strokeWidth={1.5} className="fill-washi stroke-sumi" />
            <text
              x={left ? LABEL_LEFT_X : LABEL_RIGHT_X}
              y={label.y}
              textAnchor={left ? 'end' : 'start'}
              fontSize={12}
              fontWeight={700}
              letterSpacing="0.06em"
              className="fill-washi"
            >
              {label.lines.map((line, j) => (
                <tspan key={line} x={left ? LABEL_LEFT_X : LABEL_RIGHT_X} dy={j === 0 ? 0 : LINE_HEIGHT}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
