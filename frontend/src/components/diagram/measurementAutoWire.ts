import type { fabric } from 'fabric';
import type { RpeRow } from '../../store/draftStore';
import {
  connectionPairExists,
  createConnectionLineObject,
  isConnectionLine,
} from './orthogonalWire';

export interface RpeAutoWireResult {
  ok: boolean;
  created: number;
  /** RPE sorok, amelyekhez nem találtunk egyező feliratú szimbólumot a rajzon */
  unmatchedPoints: string[];
  /** Pár kihagyva, mert már létezik vonal */
  skippedExisting: number;
  detail: string;
}

function sortKeyForPoint(point: string): number {
  const t = point.replace(',', '.').trim();
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/**
 * Rajzi elem, amelynek a „Felirat” (label) mezője megegyezik az RPE „Pont” értékével.
 */
export function findSymbolByRpePoint(canvas: fabric.Canvas, point: string): fabric.Object | undefined {
  const key = point.trim();
  if (!key) return undefined;
  const objs = canvas.getObjects();
  for (const obj of objs) {
    if (isConnectionLine(obj)) continue;
    const vd = (obj as { vbfData?: { label?: string; type?: string } }).vbfData;
    if (!vd || vd.type === 'connectionLine') continue;
    const label = (vd.label ?? '').toString().trim();
    if (label === key) {
      return obj as fabric.Object;
    }
  }
  return undefined;
}

export function removeRpeAutoConnectionLines(canvas: fabric.Canvas): number {
  let n = 0;
  const objs = canvas.getObjects().slice();
  for (const obj of objs) {
    const v = (obj as { vbfData?: { type?: string; source?: string } }).vbfData;
    if (v?.type === 'connectionLine' && v.source === 'rpeAuto') {
      canvas.remove(obj);
      n++;
    }
  }
  return n;
}

/**
 * RPE sorok „Pont” szerint rendezve; minden olyan szimbólum, amelynek felirata = pont,
 * láncba kötve (1→2→3…). Előző RPE-automatikus vonalak törlődnek.
 */
export function applyRpeMeasurementAutoWire(canvas: fabric.Canvas, rpeRows: RpeRow[]): RpeAutoWireResult {
  removeRpeAutoConnectionLines(canvas);

  const rows = [...rpeRows].filter((r) => r.point.trim() !== '');
  rows.sort((a, b) => sortKeyForPoint(a.point) - sortKeyForPoint(b.point));

  const unmatchedPoints: string[] = [];
  const chain: fabric.Object[] = [];

  for (const row of rows) {
    const sym = findSymbolByRpePoint(canvas, row.point);
    if (!sym) {
      unmatchedPoints.push(row.point.trim());
    } else {
      chain.push(sym);
    }
  }

  if (chain.length < 2) {
    canvas.requestRenderAll();
    return {
      ok: false,
      created: 0,
      unmatchedPoints,
      skippedExisting: 0,
      detail:
        chain.length === 0
          ? 'Legalább két RPE ponthoz kell rajzi elem, felirattal megegyező pontszámmal.'
          : 'Csak egy elem illeszkedik — a láncoláshoz legalább kettő kell.',
    };
  }

  let created = 0;
  let skippedExisting = 0;

  for (let i = 0; i < chain.length - 1; i++) {
    const a = chain[i];
    const b = chain[i + 1];
    if (a === b) continue;

    const ida = (a as { vbfData?: { elementId?: string } }).vbfData?.elementId;
    const idb = (b as { vbfData?: { elementId?: string } }).vbfData?.elementId;
    if (!ida || !idb) continue;

    if (connectionPairExists(canvas, ida, idb)) {
      skippedExisting++;
      continue;
    }

    const pathObj = createConnectionLineObject(a, b, {
      name: `RPE ${i + 1}→${i + 2} (PE)`,
      source: 'rpeAuto',
      circuitKind: 'pe',
    });
    canvas.add(pathObj);
    canvas.sendToBack(pathObj);
    created++;
  }

  canvas.requestRenderAll();

  const ok = created > 0 || skippedExisting > 0;
  const detail = [
    created ? `${created} új vonal` : null,
    skippedExisting ? `${skippedExisting} már létező pár kihagyva` : null,
    unmatchedPoints.length ? `Nincs felirat: ${[...new Set(unmatchedPoints)].join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    ok,
    created,
    unmatchedPoints: [...new Set(unmatchedPoints)],
    skippedExisting,
    detail: detail || 'Kész.',
  };
}

/** Rajz / Mérések lap gombjaihoz: vászon + RPE sorok. */
export function runRpeAutoWire(
  canvas: fabric.Canvas | null | undefined,
  rpeRows: RpeRow[]
): RpeAutoWireResult {
  if (!canvas) {
    return {
      ok: false,
      created: 0,
      unmatchedPoints: [],
      skippedExisting: 0,
      detail: 'Nincs aktív vászon. Nyisd meg előbb a Rajz fület.',
    };
  }
  return applyRpeMeasurementAutoWire(canvas, rpeRows);
}
