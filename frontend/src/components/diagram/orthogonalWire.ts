import { fabric } from 'fabric';
import {
  applyCircuitStyleToPath,
  normalizeCircuitKind,
  type CircuitKind,
} from './iecConductorStyle';

export type { CircuitKind } from './iecConductorStyle';

export interface Point {
  x: number;
  y: number;
}

/** Középpontok között ortogonális (vízszintes–függőleges) útvonal: egyenes vagy egy töréspont. */
export function computeOrthogonalRoute(a: fabric.Object, b: fabric.Object): Point[] {
  const ca = a.getCenterPoint();
  const cb = b.getCenterPoint();
  const x1 = ca.x;
  const y1 = ca.y;
  const x2 = cb.x;
  const y2 = cb.y;
  const tol = 0.5;
  if (Math.abs(x1 - x2) < tol) {
    return [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
  }
  if (Math.abs(y1 - y2) < tol) {
    return [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
  }
  const hFirst = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
  if (hFirst) {
    return [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
    ];
  }
  return [
    { x: x1, y: y1 },
    { x: x1, y: y2 },
    { x: x2, y: y2 },
  ];
}

export function pointsToPathString(points: Point[]): string {
  if (points.length === 0) {
    return '';
  }
  let s = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    s += ` L ${points[i].x} ${points[i].y}`;
  }
  return s;
}

export function isConnectionLine(obj: unknown): boolean {
  return Boolean((obj as { vbfData?: { type?: string } })?.vbfData?.type === 'connectionLine');
}

/** Bármely nem-vonal elem összeköthető (szimbólum + alaprajz). */
export function isWireEndpoint(obj: unknown): boolean {
  const d = (obj as { vbfData?: { type?: string } })?.vbfData;
  return Boolean(d && d.type !== 'connectionLine');
}

export type WireSource = 'manual' | 'rpeAuto';

export interface ConnectionLineVbfData {
  type: 'connectionLine';
  name: string;
  fromId: string;
  toId: string;
  locked: boolean;
  isArch: boolean;
  source?: WireSource;
  /** HD 308 S2 / IEC 60445 szerinti vezeték típus */
  circuitKind?: CircuitKind;
}

export function ensureElementId(obj: fabric.Object & { vbfData?: { elementId?: string } }): string {
  if (!obj.vbfData) {
    obj.vbfData = {} as Record<string, unknown>;
  }
  if (!obj.vbfData.elementId) {
    obj.vbfData.elementId = crypto.randomUUID();
  }
  return obj.vbfData.elementId;
}

/** Meglévő vonal ugyanarra a két elemre (bármilyen forrással). */
export function connectionPairExists(
  canvas: fabric.Canvas,
  id1: string,
  id2: string
): boolean {
  return canvas.getObjects().some((obj) => {
    const v = (obj as { vbfData?: { type?: string; fromId?: string; toId?: string } }).vbfData;
    if (v?.type !== 'connectionLine') return false;
    return (
      (v.fromId === id1 && v.toId === id2) ||
      (v.fromId === id2 && v.toId === id1)
    );
  });
}

function defaultCircuitKind(
  source: WireSource | undefined,
  explicit: CircuitKind | undefined
): CircuitKind {
  if (explicit) return explicit;
  if (source === 'rpeAuto') return 'pe';
  return 'phase';
}

/**
 * Ortogonális összekötő Path; a hívó adja hozzá a vászonhoz (sendToBack stb.).
 * Vonalkép: HD 308 S2 / IEC 60445 (circuitKind).
 */
export function createConnectionLineObject(
  o1: fabric.Object,
  o2: fabric.Object,
  options: { name?: string; source?: WireSource; circuitKind?: CircuitKind } = {}
): fabric.Path & { vbfData: ConnectionLineVbfData } {
  const id1 = ensureElementId(o1 as fabric.Object & { vbfData?: { elementId?: string } });
  const id2 = ensureElementId(o2 as fabric.Object & { vbfData?: { elementId?: string } });
  const pts = computeOrthogonalRoute(o1, o2);
  const d = pointsToPathString(pts);
  const pathObj = new fabric.Path(d, {
    fill: '',
    stroke: '#111827',
    strokeWidth: 2.5,
    objectCaching: false,
    selectable: true,
    padding: 12,
    perPixelTargetFind: false,
  }) as fabric.Path & { vbfData: ConnectionLineVbfData };
  const kind = defaultCircuitKind(options.source, options.circuitKind);
  pathObj.vbfData = {
    type: 'connectionLine',
    name: options.name ?? 'Vezeték (automatikus)',
    fromId: id1,
    toId: id2,
    locked: false,
    isArch: false,
    circuitKind: kind,
    ...(options.source ? { source: options.source } : {}),
  };
  applyCircuitStyleToPath(pathObj, kind);
  return pathObj;
}

/** Geometria frissítése után (mozgatás) — vonalkép megmarad. */
export function restyleConnectionPathFromVbfData(
  path: fabric.Path,
  vbfData: ConnectionLineVbfData | undefined
): void {
  if (!vbfData?.type || vbfData.type !== 'connectionLine') return;
  const fallback: CircuitKind = vbfData.source === 'rpeAuto' ? 'pe' : 'phase';
  const kind = normalizeCircuitKind(vbfData.circuitKind, fallback);
  applyCircuitStyleToPath(path, kind);
}
