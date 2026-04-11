import type { DefectItem, RpeRow } from '../store/draftStore';

type AutoDefectPayload = Omit<DefectItem, 'id'> & { autoSourceKey: string };

function passIsFail(pass: string | undefined): boolean {
  const p = (pass ?? 'Igen').trim().toLowerCase();
  return p === 'nem' || p === 'no';
}

function rowId(row: Record<string, string>, index: number): string {
  const id = (row as { id?: string }).id;
  return id && id.trim() !== '' ? id : `idx-${index}`;
}

/**
 * „Nem megfelelő” mérési sorokból szabványos szövegű hibák (Hibák fül / jegyzőkönyv).
 */
export function collectAutoDefectsFromMeasurements(params: {
  rpeRows: RpeRow[];
  loopRows: Record<string, string>[];
  insulationRows: Record<string, string>[];
  rcdRows: Record<string, string>[];
  globalLocation: string;
}): AutoDefectPayload[] {
  const { rpeRows, loopRows, insulationRows, rcdRows, globalLocation } = params;
  const out: AutoDefectPayload[] = [];
  const gl = globalLocation.trim();

  for (const row of rpeRows) {
    if (row.isOk !== 'no') continue;
    const loc = [gl, row.location?.trim()].filter(Boolean).join(' · ') || '—';
    const val = row.rpeValue?.trim() || '—';
    const desc =
      `[Automata] Védővezető folytonosság (Rpe): nem megfelelő. Pont ${row.point?.trim() || '—'}, mért: ${val} Ω. ` +
      `Határérték (tipikus, szerződéses körülmények): Rpe ≤ 1,0 Ω (MSZ HD 60364-6:2017 §61.3.2).`;
    out.push({
      description: desc,
      location: loc,
      severity: 'sulyos',
      isFixed: false,
      autoSourceKey: `rpe:${row.id}`,
    });
  }

  loopRows.forEach((row, i) => {
    if (!passIsFail(row.pass)) return;
    const loc = [gl, row.loc?.trim(), row.circuit?.trim()].filter(Boolean).join(' · ') || '—';
    const zs = row.zs?.trim() || '—';
    const desc =
      `[Automata] Hurokellenállás (Zs): nem megfelelő. Áramkör: ${row.circuit?.trim() || '—'}, Zs = ${zs} Ω. ` +
      `Határérték: Zs ≤ U0×0,95/Ia (Ia = hibavédelmi készülék névleges oldási árama; MSZ HD 60364-6:2017 §61.3.6; MSZ HD 60364-4-41 §411.4).`;
    out.push({
      description: desc,
      location: loc,
      severity: 'sulyos',
      isFixed: false,
      autoSourceKey: `loop:${rowId(row, i)}`,
    });
  });

  insulationRows.forEach((row, i) => {
    if (!passIsFail(row.pass)) return;
    const loc = [gl, row.circuit?.trim()].filter(Boolean).join(' · ') || '—';
    const desc =
      `[Automata] Szigetelési ellenállás (Riso, 500 V DC): nem megfelelő. Áramkör: ${row.circuit?.trim() || '—'}. ` +
      `Határérték: a mért értékeknek legalább 1,0 MΩ-nak kell lenniük (MSZ HD 60364-6:2017 §61.3.3).`;
    out.push({
      description: desc,
      location: loc,
      severity: 'sulyos',
      isFixed: false,
      autoSourceKey: `ins:${rowId(row, i)}`,
    });
  });

  rcdRows.forEach((row, i) => {
    if (!passIsFail(row.pass)) return;
    const loc = [gl, row.circ?.trim()].filter(Boolean).join(' · ') || '—';
    const desc =
      `[Automata] FI-relé (ÁVK) próba: nem megfelelő. Áramkör: ${row.circ?.trim() || '—'}. ` +
      `Határérték (tipikus, 1×IΔn): kioldási idő ≤ 300 ms (általános); személyvédelem esetén gyakran ≤ 40 ms (MSZ HD 60364-6:2017 §61.3.7; típusadatlap szerint).`;
    out.push({
      description: desc,
      location: loc,
      severity: 'sulyos',
      isFixed: false,
      autoSourceKey: `rcd:${rowId(row, i)}`,
    });
  });

  return out;
}
