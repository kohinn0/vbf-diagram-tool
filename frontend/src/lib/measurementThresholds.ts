/** Tájékoztató jellegű határértékek — tükör: `backend/measurement_thresholds.py` (Word/PDF). */

export const MEASUREMENT_THRESHOLDS_SECTION_TITLE =
  'Határértékek (MSZ HD 60364-6:2017 — tájékoztató)';

export const MEASUREMENT_THRESHOLDS_BULLETS: readonly string[] = [
  'Védővezető folytonosság (Rpe), §61.3.2: tipikusan Rpe ≤ 1,0 Ω szerződéses körülmények között.',
  'Szigetelési ellenállás (Riso), 500 V DC, §61.3.3: legalább 1,0 MΩ (L–N, L–PE, N–PE a táblázat szerint).',
  'Hurokellenállás (Zs), §61.3.6: Zs ≤ U0×0,95/Ia (Ia = védőberendezés névleges oldási árama).',
  'FI-relé (ÁVK), §61.3.7: 1×IΔn próba — tipikusan kioldási idő ≤ 300 ms; személyvédelemnél gyakran ≤ 40 ms (típus szerint).',
  'EPH / fővezető folytonosság: MSZ HD 60364-5-54 §544 szerint.',
];
