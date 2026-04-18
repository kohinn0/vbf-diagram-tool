/**
 * GET /api/reports/:id válasz → Zustand draft (státusz, űrlap, mérések, rajz).
 */
import { useDraftStore, type DefectItem, type RpeRow, type VisualChecksState } from '../store/draftStore';
import { splitDiagramPayload, type SiteTreeNode } from './diagramPayload';

export type ServerReport = {
  id: number;
  status: string;
  report_type: string;
  /** `ReportResponse.updated_at` — toast / szinkron összevetéshez */
  updated_at?: string | null;
  client_data?: Record<string, unknown> | null;
  measurements_data?: unknown;
  defects_data?: unknown;
  incoming_phases?: Record<string, unknown> | null;
  notes?: string | null;
  inspector_notes?: string | null;
  diagram_data?: Record<string, unknown> | null;
};

/** Szerver datetime → stabil ISO string (toast: ugyanaz a pillanat = nincs zaj). */
export function normalizeServerUpdatedAt(v: unknown): string | null {
  if (v == null || v === '') return null;
  const d =
    typeof v === 'string' || typeof v === 'number'
      ? new Date(v)
      : v instanceof Date
        ? v
        : new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function valToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

function defaultVisual(): VisualChecksState {
  return {
    id_marks: false,
    protection: false,
    fire: false,
    conduction: false,
    connection: false,
    access: false,
  };
}

function defaultRpe(): RpeRow[] {
  return [{ id: crypto.randomUUID(), point: '1', location: '', rpeValue: '', isOk: 'yes' }];
}

function normalizeMeasurements(raw: unknown): {
  rpeRows: RpeRow[];
  loopRows: Record<string, string>[];
  insulationRows: Record<string, string>[];
  rcdRows: Record<string, string>[];
  ephContRows: Record<string, string>[];
} {
  let block: Record<string, unknown> | null = null;
  if (Array.isArray(raw) && raw.length > 0) {
    block = raw[0] as Record<string, unknown>;
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    block = raw as Record<string, unknown>;
  }
  if (!block) {
    return {
      rpeRows: defaultRpe(),
      loopRows: [],
      insulationRows: [],
      rcdRows: [],
      ephContRows: [],
    };
  }

  const rpeArr = Array.isArray(block.rpe) ? block.rpe : [];
  const rpeRows: RpeRow[] =
    rpeArr.length > 0
      ? rpeArr.map((row: Record<string, unknown>, i: number) => {
          const pass = row.pass;
          const ok =
            pass === 'Igen' ||
            pass === 'igen' ||
            pass === true ||
            row.isOk === 'yes' ||
            String(pass).toLowerCase() === 'igen';
          const nid = row.node_id != null && String(row.node_id).trim() !== '' ? String(row.node_id) : undefined;
          return {
            id: crypto.randomUUID(),
            point: String(row.point ?? i + 1),
            location: String(row.loc ?? row.location ?? ''),
            rpeValue: String(row.val ?? row.rpeValue ?? ''),
            isOk: ok ? 'yes' : 'no',
            ...(nid ? { node_id: nid } : {}),
          };
        })
      : defaultRpe();

  const toStrRows = (x: unknown): Record<string, string>[] => {
    if (!Array.isArray(x)) return [];
    return x.map((row) => {
      const o = row && typeof row === 'object' ? (row as Record<string, unknown>) : {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(o)) {
        out[k] = valToString(v);
      }
      return out;
    });
  };

  return {
    rpeRows,
    loopRows: toStrRows(block.loop),
    insulationRows: toStrRows(block.insulation),
    rcdRows: toStrRows(block.rcd),
    ephContRows: toStrRows(block.eph_cont),
  };
}

function normalizeDefects(raw: unknown): DefectItem[] {
  if (!Array.isArray(raw)) return [];
  const allowed: DefectItem['severity'][] = ['kritikus', 'sulyos', 'kozepes', 'egyedi'];
  return raw.map((d) => {
    const o = d && typeof d === 'object' ? (d as Record<string, unknown>) : {};
    const explicitSev = String(o.severity ?? '').trim();
    const legacyStd = String(o.standard ?? '').trim();
    let severity: DefectItem['severity'] = 'kozepes';
    if (allowed.includes(explicitSev as DefectItem['severity'])) {
      severity = explicitSev as DefectItem['severity'];
    } else if (allowed.includes(legacyStd as DefectItem['severity'])) {
      severity = legacyStd as DefectItem['severity'];
    }
    let standardRef: string | undefined;
    if (legacyStd && !allowed.includes(legacyStd as DefectItem['severity'])) {
      standardRef = legacyStd;
    }
    return {
      id: crypto.randomUUID(),
      description: String(o.description ?? o.templateId ?? ''),
      location: String(o.location ?? ''),
      severity,
      isFixed: Boolean(o.isFixed),
      standardRef,
      autoSourceKey: o.autoSourceKey != null ? String(o.autoSourceKey) : undefined,
    };
  });
}

function incomingToMeasurementsData(ip: Record<string, unknown> | null | undefined): Record<string, string> {
  if (!ip) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(ip)) {
    out[k] = valToString(v);
  }
  return out;
}

/**
 * Szerver jegyzőkönyv → store (felülírja a draft megfelelő részeit).
 */
export function applyServerReportToDraft(report: ServerReport): void {
  const cd = report.client_data || {};
  const reportData: Record<string, string> = {};

  let visualChecks = defaultVisual();
  const vc = cd.visualChecks;
  if (vc && typeof vc === 'object' && !Array.isArray(vc)) {
    visualChecks = { ...defaultVisual(), ...(vc as Partial<VisualChecksState>) };
  }

  for (const [k, v] of Object.entries(cd)) {
    if (k === 'visualChecks') continue;
    if (k === 'type') continue;
    reportData[k] = valToString(v);
  }

  if (cd.docType != null && String(cd.docType).trim() !== '') {
    reportData.docType = String(cd.docType);
  } else if (cd.type != null && String(cd.type).trim() !== '') {
    reportData.docType = String(cd.type);
  } else if (report.report_type) {
    const rt = report.report_type.toUpperCase();
    if (rt.includes('EPH')) reportData.docType = 'EPH';
    else if (rt.includes('ELSO')) reportData.docType = 'VBF_ELSO';
    else if (rt.includes('BERB')) reportData.docType = 'VBF_BERBEADAS';
    else if (rt.includes('ELAD')) reportData.docType = 'VBF_ELADAS';
    else reportData.docType = 'VBF_IDOSZAKOS';
  }

  if (report.notes) reportData.reportNotes = String(report.notes);
  if (report.inspector_notes) reportData.inspectorNotes = String(report.inspector_notes);

  const meas = normalizeMeasurements(report.measurements_data);
  const defects = normalizeDefects(report.defects_data);
  const measurementsData = incomingToMeasurementsData(report.incoming_phases || undefined);

  const st = report.status === 'FINAL' ? 'FINAL' : 'DRAFT';

  const withRowIds = (rows: Record<string, string>[]) =>
    rows.map((r) => ({ ...r, id: crypto.randomUUID() }));

  let pendingDiagramData: Record<string, unknown> | null = null;
  let siteTree: SiteTreeNode[] = [];
  if (report.diagram_data && Object.keys(report.diagram_data).length > 0) {
    const { fabricJson, siteTree: st } = splitDiagramPayload(report.diagram_data as Record<string, unknown>);
    siteTree = st;
    pendingDiagramData = fabricJson && Object.keys(fabricJson).length > 0 ? fabricJson : null;
  }

  useDraftStore.setState({
    reportData,
    visualChecks,
    rpeRows: meas.rpeRows,
    loopRows: withRowIds(meas.loopRows),
    insulationRows: withRowIds(meas.insulationRows),
    rcdRows: withRowIds(meas.rcdRows),
    ephContRows: withRowIds(meas.ephContRows),
    defects,
    measurementsData,
    reportStatus: st,
    lastKnownServerUpdatedAt: normalizeServerUpdatedAt(report.updated_at),
    pendingDiagramData,
    siteTree,
  });
}
