import type { fabric } from 'fabric';

/**
 * Egysoros elvi rajz / vázlat — vezeték jelölés a HD 308 S2 (IEC 60445) szerinti
 * színazonosítással összhangban (LV: fázis, N, PE, PEN).
 * RPE folytonossági lánc: MSZ HD 60364-6:2017 §61.3.2 (védővezető) — rajzon PE jelölés.
 */
export type CircuitKind = 'phase' | 'n' | 'pe' | 'pen';

interface IecConductorVisual {
  stroke: string;
  strokeWidth: number;
  /** üres = folytonos vonal */
  strokeDashArray: number[] | null;
}

/** Képernyőn olvasható színek; nyomtatáskor a jegyzőkönyv fekete vonalat is használhat. */
const IEC_CONDUCTOR_STYLE: Record<CircuitKind, IecConductorVisual> = {
  phase: {
    stroke: '#111827',
    strokeWidth: 2.5,
    strokeDashArray: null,
  },
  n: {
    stroke: '#1d4ed8',
    strokeWidth: 2.5,
    strokeDashArray: null,
  },
  pe: {
    stroke: '#15803d',
    strokeWidth: 2.5,
    strokeDashArray: [7, 5],
  },
  pen: {
    stroke: '#1e40af',
    strokeWidth: 2.5,
    strokeDashArray: [14, 4, 2, 4],
  },
};

export const CIRCUIT_KIND_OPTIONS: { value: CircuitKind; label: string; hint: string }[] = [
  { value: 'phase', label: 'Fázis / töltött', hint: 'HD 308 S2 — fázisvezető (egysoros ábrán gyakran fekete/sötét)' },
  { value: 'n', label: 'N semleges', hint: 'HD 308 S2 — kék' },
  { value: 'pe', label: 'PE védővezető', hint: 'HD 308 S2 — zöld-sárga (rajzon zöld); §61.3.2 RPE' },
  { value: 'pen', label: 'PEN', hint: 'PEN: funkció szerinti jelölés (vegyes)' },
];

export function applyCircuitStyleToPath(path: fabric.Path, kind: CircuitKind): void {
  const v = IEC_CONDUCTOR_STYLE[kind];
  path.set({
    stroke: v.stroke,
    strokeWidth: v.strokeWidth,
    strokeDashArray: v.strokeDashArray ?? undefined,
    strokeLineCap: 'butt',
    strokeLineJoin: 'miter',
  });
  path.setCoords();
}

function isCircuitKind(x: string | undefined): x is CircuitKind {
  return x === 'phase' || x === 'n' || x === 'pe' || x === 'pen';
}

export function normalizeCircuitKind(
  raw: string | undefined,
  fallback: CircuitKind
): CircuitKind {
  if (raw && isCircuitKind(raw)) return raw;
  return fallback;
}

/** Rövid szabványos tájékoztató a rajz UI-hoz. */
export const IEC_DIAGRAM_LEGEND_SHORT =
  'Vezeték: HD 308 S2 / IEC 60445 (szín és vonalkép). RPE lánc: PE (zöld, szaggatott). Szimbólumok: IEC 60617 / HD 637.';
