/** Backend `analyzer2.parse_padfx_xml` válasz eleme */
export interface PadfxXmlMeasurement {
  mid: string;
  type: string;
  location: string;
  date: string;
  params: Record<string, string>;
  results: Record<string, string>;
}

function firstNumericResult(results: Record<string, string> | undefined): string {
  if (!results) return '';
  for (const v of Object.values(results)) {
    if (v == null || String(v).trim() === '') continue;
    const t = String(v).replace(',', '.').trim();
    const n = parseFloat(t);
    if (!Number.isNaN(n)) return t;
  }
  return Object.values(results).find((v) => v != null && String(v).trim() !== '') || '';
}

/** MSZ HD 60364-6 §61.3.2 tipikus Rpe határ (Ω): ≤ 1,0 megfelelő (egyszerűsített) */
function rpeIsOkOhm(val: string): 'yes' | 'no' {
  const n = parseFloat(String(val).replace(',', '.'));
  if (Number.isNaN(n)) return 'yes';
  return n <= 1.0 ? 'yes' : 'no';
}

interface PadfxRpeRow {
  id: string;
  point: string;
  location: string;
  rpeValue: string;
  isOk: 'yes' | 'no';
}

interface MergedPadfxTables {
  rpeRows: PadfxRpeRow[];
  loopRows: Record<string, string>[];
  insulationRows: Record<string, string>[];
  rcdRows: Record<string, string>[];
}

/**
 * Metrel PADFX XML mérések szétválasztása a generator.py által várt kulcsokra.
 * A MID kódok az analyzer2.py szerint vannak csoportosítva.
 */
export function mergePadfxMeasurements(measurements: PadfxXmlMeasurement[]): MergedPadfxTables {
  const rpeRows: PadfxRpeRow[] = [];
  const loopRows: Record<string, string>[] = [];
  const insulationRows: Record<string, string>[] = [];
  const rcdRows: Record<string, string>[] = [];

  let rpeN = 0;
  for (const m of measurements) {
    const mid = String(m.mid || '');
    const loc = m.location || '';
    const val = firstNumericResult(m.results);

    if (mid === '20' || m.type.includes('Rpe')) {
      rpeN += 1;
      rpeRows.push({
        id: crypto.randomUUID(),
        point: String(rpeN),
        location: loc,
        rpeValue: val,
        isOk: rpeIsOkOhm(val),
      });
      continue;
    }

    if (['16', '17', '111'].includes(mid) || m.type.includes('Zs') || m.type.includes('Hurok')) {
      loopRows.push({
        circuit: loc,
        device: m.params?.p_2 || m.params?.p_3 || '',
        loc,
        zs: val,
        pass: 'Igen',
      });
      continue;
    }

    if (mid === '22' || m.type.includes('Riso') || m.type.includes('Szigetel')) {
      insulationRows.push({
        circuit: loc,
        ln: val,
        lpe: m.results?.r_2 || '',
        npe: m.results?.r_3 || '',
        pass: 'Igen',
      });
      continue;
    }

    if (['11', '12', '14'].includes(mid) || m.type.includes('RCD') || m.type.includes('FI')) {
      rcdRows.push({
        circ: loc,
        type: 'A',
        idn: m.params?.p_2 || '',
        test05: m.results?.r_1 || '',
        t1: m.results?.r_2 || val,
        t5: m.results?.r_3 || '',
        ramp: m.results?.r_4 || '',
        uc: m.results?.r_5 || '',
        pass: 'Igen',
      });
    }
  }

  return { rpeRows, loopRows, insulationRows, rcdRows };
}
