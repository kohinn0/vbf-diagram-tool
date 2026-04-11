import { flattenSiteTreeOptions, type SiteTreeNode } from './diagramPayload';

function escapeCell(v: string): string {
  const s = v == null ? '' : String(v);
  if (/[;\r\n"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowLine(cells: string[]): string {
  return cells.map(escapeCell).join(';') + '\r\n';
}

function nodeLabel(tree: SiteTreeNode[], nodeId: string | undefined): string {
  if (!nodeId) return '';
  const flat = flattenSiteTreeOptions(tree);
  const hit = flat.find((x) => x.id === nodeId);
  if (!hit) return nodeId;
  return hit.label.replace(/\u00A0/g, ' ').replace(/^\s*↳\s*/, '').trim();
}

const IN_KEYS: { key: string; label: string }[] = [
  { key: 'inPhaseL1', label: 'L1 feszültség [V]' },
  { key: 'inPhaseL2', label: 'L2 feszültség [V]' },
  { key: 'inPhaseL3', label: 'L3 feszültség [V]' },
  { key: 'inSystemType', label: 'Rendszer típusa' },
  { key: 'inPhaseCount', label: 'Fázisszám' },
  { key: 'inMainFuse', label: 'Főbiztosíték [A]' },
  { key: 'inMainFuseType', label: 'Főbiztosíték karakterisztika' },
  { key: 'inPhaseNote', label: 'Megjegyzés (bejövő)' },
  { key: 'globalLocation', label: 'Aktív helyszín / elosztó' },
  { key: 'globalDevice', label: 'Kikapcsoló szerv' },
];

export type MeasurementsCsvSnapshot = {
  reportData: Record<string, string>;
  measurementsData: Record<string, string>;
  rpeRows: Array<{
    id: string;
    point: string;
    location: string;
    rpeValue: string;
    isOk: string;
    node_id?: string;
  }>;
  loopRows: Record<string, string>[];
  insulationRows: Record<string, string>[];
  rcdRows: Record<string, string>[];
  /** EPH `eph_cont` sorok */
  ephContRows: Record<string, string>[];
  siteTree: SiteTreeNode[];
};

/** UTF-8 BOM + pontosvessző — magyar Excellel kompatibilis */
export function buildMeasurementsCsv(s: MeasurementsCsvSnapshot): string {
  const { reportData, measurementsData, rpeRows, loopRows, insulationRows, rcdRows, ephContRows, siteTree } = s;
  let out = '';

  out += rowLine(['VBF Premium — mérési adatok export']);
  out += rowLine(['Jegyzőkönyv / cím', reportData.siteAddress || reportData.customerName || '—']);
  out += rowLine(['Export időpont', new Date().toISOString()]);
  out += rowLine([]);

  out += rowLine(['Bejövő hálózati paraméterek']);
  out += rowLine(['Mező', 'Érték']);
  for (const { key, label } of IN_KEYS) {
    const v = measurementsData[key];
    if (v !== undefined && v !== '') out += rowLine([label, v]);
  }
  out += rowLine([]);

  out += rowLine(['1. Védővezető folytonosság (Rpe)']);
  out += rowLine(['Pont', 'Helyszín (fa)', 'Mérés helye', 'Rpe [Ω]', 'Megfelel (igen/nem)']);
  for (const r of rpeRows) {
    out += rowLine([
      r.point,
      nodeLabel(siteTree, r.node_id),
      r.location,
      r.rpeValue,
      r.isOk === 'yes' ? 'igen' : 'nem',
    ]);
  }
  out += rowLine([]);

  out += rowLine(['2. Hurokellenállás (Zs)']);
  out += rowLine(['Helyszín (fa)', 'Áramkör', 'Kikapcsoló', 'Hely', 'Zs [Ω]', 'Megfelel']);
  for (const r of loopRows) {
    out += rowLine([
      nodeLabel(siteTree, r.node_id),
      r.circuit || '',
      r.device || '',
      r.loc || '',
      r.zs || '',
      r.pass || '',
    ]);
  }
  out += rowLine([]);

  out += rowLine(['3. Szigetelés (Riso)']);
  out += rowLine(['Helyszín (fa)', 'Áramkör', 'Riso L-N', 'Riso L-PE', 'Riso N-PE', 'Megfelel']);
  for (const r of insulationRows) {
    out += rowLine([
      nodeLabel(siteTree, r.node_id),
      r.circuit || '',
      r.ln || '',
      r.lpe || '',
      r.npe || '',
      r.pass || '',
    ]);
  }
  out += rowLine([]);

  out += rowLine(['4. FI-relé / ÁVK']);
  out += rowLine([
    'Helyszín (fa)',
    'Áramkör',
    'Típus',
    'IΔn mA',
    '0.5×IΔn',
    '1× ms',
    '5× ms',
    'IΔ',
    'Uc',
    'Megfelel',
  ]);
  for (const r of rcdRows) {
    out += rowLine([
      nodeLabel(siteTree, r.node_id),
      r.circ || '',
      r.type || '',
      r.idn || '',
      r.test05 || '',
      r.t1 || '',
      r.t5 || '',
      r.ramp || '',
      r.uc || '',
      r.pass || '',
    ]);
  }
  out += rowLine([]);

  out += rowLine(['EPH bekötések folytonossága (eph_cont)']);
  out += rowLine(['Helyszín (fa)', 'Sorszám', 'Bekötött elem', 'Hely', 'Vezető (keresztm.)', 'Kötés módja', 'Folytonosság [Ω]', 'Megfelel']);
  for (const r of ephContRows) {
    out += rowLine([
      nodeLabel(siteTree, r.node_id),
      r.idx || '',
      r.elem || '',
      r.loc || '',
      r.mat || '',
      r.conn || '',
      r.val || '',
      r.pass || '',
    ]);
  }

  return '\ufeff' + out;
}

export function downloadMeasurementsCsv(s: MeasurementsCsvSnapshot, filenameBase = 'VBF_meresek'): void {
  const csv = buildMeasurementsCsv(s);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenameBase}_${d}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
