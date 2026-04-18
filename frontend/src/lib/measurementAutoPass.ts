/**
 * Automatikus átment/bukott kalkuláció — MSZ HD 60364-6:2017
 *
 * Zs:   §61.3.6  Zs_max = U0 × 0,95 / Ia  (Ia = biztosítékos kikapcsolási áram)
 * Riso: §61.3.3  minden mért érték ≥ 1,0 MΩ (500 V DC)
 * RCD:  §61.3.7  t1 (1×IΔn) ≤ 300 ms, t5 (5×IΔn) ≤ 150 ms (általános AC/A/F/B típus)
 */

// ── Zs ──────────────────────────────────────────────────────────────────────

const U0 = 230; // Névleges fázisfeszültség [V]
const ZS_CF = 0.95; // Korrekciós tényező (MSZ HD 60364-6 §61.3.6)

/** Pillanatnyi kikapcsolási áram szorzó (IEC 60898-1 felső határ, konzervatív) */
const IA_MULT: Record<string, number> = {
  B: 5,
  C: 10,
  D: 20,
  GG: 6,  // gG/gL biztosíték — kb. 6× konzervatív közelítés
  GL: 6,
};

/** TN rendszerek, ahol a Zs ≤ U0×0,95/Ia formula alkalmazható */
const TN_SYSTEMS = new Set(['TN-S', 'TN-C', 'TN-C-S', 'TN']);

/**
 * TT/IT rendszernél a Zs formula nem alkalmazható — TT-nél Ra×IΔn ≤ 50V
 * (IEC 60364-4-41 §411.5.3), IT-nél szigetelt semleges. Visszatér null-lal.
 */
export function calcZsMax(
  deviceType: string,
  inRating: string,
  systemType = ''
): number | null {
  const sys = systemType?.trim().toUpperCase();
  if (sys && !TN_SYSTEMS.has(sys.replace('-', '-'))) {
    // TT, IT, vagy ismeretlen — TN-alapú formula nem alkalmazható
    if (sys === 'TT' || sys === 'IT') return null;
  }
  const mult = IA_MULT[deviceType?.trim().toUpperCase()];
  const inA = parseFloat(String(inRating ?? '').replace(',', '.'));
  if (!mult || !isFinite(inA) || inA <= 0) return null;
  return (U0 * ZS_CF) / (mult * inA);
}

export function zsAutoPass(
  zs: string,
  deviceType: string,
  inRating: string,
  systemType = ''
): 'Igen' | 'Nem' | null {
  const zsMax = calcZsMax(deviceType, inRating, systemType);
  if (zsMax === null) return null;
  const zsVal = parseFloat(String(zs ?? '').replace(',', '.'));
  if (!isFinite(zsVal)) return null;
  return zsVal <= zsMax ? 'Igen' : 'Nem';
}

// ── Riso ────────────────────────────────────────────────────────────────────

const RISO_MIN = 1.0; // MΩ

function parseRisoMOhm(val: string): number | null {
  const t = String(val ?? '').trim().toUpperCase();
  if (!t) return null;
  // Határtalan / OL / ∞ → átmegy
  if (t === 'OL' || t === 'INF' || t === '∞' || t.startsWith('>')) return Infinity;
  const n = parseFloat(t.replace(',', '.'));
  return isFinite(n) ? n : null;
}

export function risoAutoPass(
  ln: string,
  lpe: string,
  npe: string
): 'Igen' | 'Nem' | null {
  const vals = [ln, lpe, npe].map(parseRisoMOhm).filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return vals.every((v) => v >= RISO_MIN) ? 'Igen' : 'Nem';
}

// ── RCD ─────────────────────────────────────────────────────────────────────

const RCD_T1_MAX = 300; // ms  (1×IΔn — általános AC/A/F/B)
const RCD_T5_MAX = 150; // ms  (5×IΔn — általános)

function parseMs(val: string): number | null {
  const n = parseFloat(String(val ?? '').replace(',', '.'));
  return isFinite(n) ? n : null;
}

export function rcdAutoPass(t1: string, t5: string): 'Igen' | 'Nem' | null {
  const v1 = parseMs(t1);
  const v5 = parseMs(t5);
  if (v1 === null && v5 === null) return null;
  const ok1 = v1 === null || v1 <= RCD_T1_MAX;
  const ok5 = v5 === null || v5 <= RCD_T5_MAX;
  return ok1 && ok5 ? 'Igen' : 'Nem';
}
