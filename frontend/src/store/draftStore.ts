import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mergePadfxMeasurements, type PadfxXmlMeasurement } from '../lib/padfxMerge';
import {
  mergeDiagramPayload,
  splitDiagramPayload,
  stripMeasurementIds,
  type SiteTreeNode,
} from '../lib/diagramPayload';
import { collectAutoDefectsFromMeasurements } from '../lib/collectMeasurementDefects';

export interface DefectItem {
  id: string;
  location: string;
  description: string;
  severity: 'kritikus' | 'sulyos' | 'kozepes' | 'egyedi';
  isFixed: boolean;
  /** Automatikus gyűjtés: sorazonosító, duplikátum elkerülésére (nem megy a API payloadba). */
  autoSourceKey?: string;
}

export interface RpeRow {
  id: string;
  point: string;
  location: string;
  rpeValue: string;
  isOk: 'yes' | 'no';
  /** `site_nodes.id` — relációs szinkron; opcionális */
  node_id?: string;
}

/** MSZ HD 60364-6 §6.4.2 — generator `visualChecks` kulcsai */
export interface VisualChecksState {
  id_marks: boolean;
  protection: boolean;
  fire: boolean;
  conduction: boolean;
  connection: boolean;
  access: boolean;
}

const defaultVisualChecks = (): VisualChecksState => ({
  id_marks: false,
  protection: false,
  fire: false,
  conduction: false,
  connection: false,
  access: false,
});

/** `id`: React kulcs + kézi sor; mentéskor `stripMeasurementIds` */
export type LoopRow = Record<string, string>;
export type InsulationRow = Record<string, string>;
export type RcdRow = Record<string, string>;

export type { SiteTreeNode };

function ensureRowIds(rows: Record<string, string>[]): Record<string, string>[] {
  return rows.map((r) => {
    const x = r as Record<string, string> & { id?: string };
    return x.id ? r : { ...r, id: crypto.randomUUID() };
  });
}

export interface DraftState {
  reportData: Record<string, string>;
  measurementsData: Record<string, string>;
  rpeRows: RpeRow[];
  loopRows: LoopRow[];
  insulationRows: InsulationRow[];
  rcdRows: RcdRow[];
  defects: DefectItem[];
  activeCanvas: unknown | null;
  /** Backend `ReportResponse.status` — véglegesített jegyzőkönyv szerkesztése tiltva */
  reportStatus: 'DRAFT' | 'FINAL' | null;
  /** Utolsó ismert `ReportResponse.updated_at` (ISO) — háttér-hydrate toast csak ha változott */
  lastKnownServerUpdatedAt: string | null;
  visualChecks: VisualChecksState;
  /** Szerverről betöltött diagram JSON — a vászon init után `loadFromJSON` */
  pendingDiagramData: Record<string, unknown> | null;
  /** Helyszínfa — `diagram_data.site_tree` mentéskor; backend SiteNode szinkron */
  siteTree: SiteTreeNode[];

  setActiveCanvas: (canvas: unknown | null) => void;
  setSiteTree: (nodes: SiteTreeNode[]) => void;
  setPendingDiagramData: (data: Record<string, unknown> | null) => void;
  setReportStatus: (status: 'DRAFT' | 'FINAL' | null) => void;
  updateReportData: (key: string, value: string) => void;
  updateMeasurementData: (key: string, value: string) => void;
  updateVisualCheck: (key: keyof VisualChecksState, value: boolean) => void;

  addRpeRow: () => void;
  updateRpeRow: (id: string, updates: Partial<RpeRow>) => void;
  removeRpeRow: (id: string) => void;

  addLoopRow: () => void;
  updateLoopRow: (id: string, updates: Partial<Record<string, string>>) => void;
  removeLoopRow: (id: string) => void;

  addInsulationRow: () => void;
  updateInsulationRow: (id: string, updates: Partial<Record<string, string>>) => void;
  removeInsulationRow: (id: string) => void;

  addRcdRow: () => void;
  updateRcdRow: (id: string, updates: Partial<Record<string, string>>) => void;
  removeRcdRow: (id: string) => void;

  appendPadfxImport: (measurements: PadfxXmlMeasurement[]) => { added: number; message: string };

  addDefect: (defect: Omit<DefectItem, 'id'>) => void;
  updateDefect: (id: string, updates: Partial<DefectItem>) => void;
  removeDefect: (id: string) => void;
  /** „Nem megfelelő” Rpe / Zs / Riso / RCD sorok → hibajegyzék */
  collectDefectsFromMeasurements: () => { added: number; skipped: number; message: string };

  clearDraft: () => void;
  buildApiPayload: () => Record<string, unknown>;
}

const defaultRpe = (): RpeRow[] => [
  { id: crypto.randomUUID(), point: '1', location: '', rpeValue: '', isOk: 'yes' },
];

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      reportData: {},
      measurementsData: {},
      rpeRows: defaultRpe(),
      loopRows: [],
      insulationRows: [],
      rcdRows: [],
      defects: [],
      activeCanvas: null,
      reportStatus: null,
      lastKnownServerUpdatedAt: null,
      visualChecks: defaultVisualChecks(),
      pendingDiagramData: null,
      siteTree: [],

      setActiveCanvas: (canvas) => set({ activeCanvas: canvas }),
      setSiteTree: (nodes) => set({ siteTree: nodes }),

      setPendingDiagramData: (data) => set({ pendingDiagramData: data }),

      setReportStatus: (status) => set({ reportStatus: status }),

      updateReportData: (key, value) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return { reportData: { ...state.reportData, [key]: value } };
        }),

      updateMeasurementData: (key, value) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return { measurementsData: { ...state.measurementsData, [key]: value } };
        }),

      updateVisualCheck: (key, value) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return { visualChecks: { ...state.visualChecks, [key]: value } };
        }),

      addRpeRow: () =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            rpeRows: [
              ...state.rpeRows,
              {
                id: crypto.randomUUID(),
                point: String(state.rpeRows.length + 1),
                location: '',
                rpeValue: '',
                isOk: 'yes',
              },
            ],
          };
        }),

      updateRpeRow: (id, updates) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return { rpeRows: state.rpeRows.map((r) => (r.id === id ? { ...r, ...updates } : r)) };
        }),

      removeRpeRow: (id) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return { rpeRows: state.rpeRows.filter((r) => r.id !== id) };
        }),

      addLoopRow: () =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            loopRows: [
              ...state.loopRows,
              {
                id: crypto.randomUUID(),
                circuit: '',
                device: '',
                loc: '',
                zs: '',
                pass: 'Igen',
                node_id: '',
              },
            ],
          };
        }),

      updateLoopRow: (id, updates) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            loopRows: state.loopRows.map((r) => {
              const rid = (r as Record<string, string> & { id?: string }).id;
              return rid === id ? ({ ...r, ...updates } as LoopRow) : r;
            }),
          };
        }),

      removeLoopRow: (id) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            loopRows: state.loopRows.filter((r) => (r as Record<string, string> & { id?: string }).id !== id),
          };
        }),

      addInsulationRow: () =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            insulationRows: [
              ...state.insulationRows,
              {
                id: crypto.randomUUID(),
                circuit: '',
                ln: '',
                lpe: '',
                npe: '',
                pass: 'Igen',
                node_id: '',
              },
            ],
          };
        }),

      updateInsulationRow: (id, updates) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            insulationRows: state.insulationRows.map((r) => {
              const rid = (r as Record<string, string> & { id?: string }).id;
              return rid === id ? ({ ...r, ...updates } as InsulationRow) : r;
            }),
          };
        }),

      removeInsulationRow: (id) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            insulationRows: state.insulationRows.filter(
              (r) => (r as Record<string, string> & { id?: string }).id !== id
            ),
          };
        }),

      addRcdRow: () =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            rcdRows: [
              ...state.rcdRows,
              {
                id: crypto.randomUUID(),
                circ: '',
                type: 'A',
                idn: '',
                test05: '',
                t1: '',
                t5: '',
                ramp: '',
                uc: '',
                pass: 'Igen',
                node_id: '',
              },
            ],
          };
        }),

      updateRcdRow: (id, updates) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            rcdRows: state.rcdRows.map((r) => {
              const rid = (r as Record<string, string> & { id?: string }).id;
              return rid === id ? ({ ...r, ...updates } as RcdRow) : r;
            }),
          };
        }),

      removeRcdRow: (id) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return {
            rcdRows: state.rcdRows.filter((r) => (r as Record<string, string> & { id?: string }).id !== id),
          };
        }),

      appendPadfxImport: (measurements) => {
        if (get().reportStatus === 'FINAL') {
          return { added: 0, message: 'Véglegesített jegyzőkönyvhöz nem adható import.' };
        }
        const batch = mergePadfxMeasurements(measurements);
        const total =
          batch.rpeRows.length +
          batch.loopRows.length +
          batch.insulationRows.length +
          batch.rcdRows.length;
        if (total === 0) {
          return { added: 0, message: 'Nem található feldolgozható mérés (RPE/Zs/Riso/RCD).' };
        }
        set((state) => {
          const offset = state.rpeRows.length;
          const newRpe = batch.rpeRows.map((r, i) => ({
            ...r,
            point: String(offset + i + 1),
          }));
          const withId = (rows: Record<string, string>[]) =>
            rows.map((row) => ({ ...row, id: crypto.randomUUID() }));
          return {
            rpeRows: [...state.rpeRows, ...newRpe],
            loopRows: [...state.loopRows, ...withId(batch.loopRows)],
            insulationRows: [...state.insulationRows, ...withId(batch.insulationRows)],
            rcdRows: [...state.rcdRows, ...withId(batch.rcdRows)],
          };
        });
        const parts = [
          batch.rpeRows.length ? `${batch.rpeRows.length} RPE` : null,
          batch.loopRows.length ? `${batch.loopRows.length} Zs` : null,
          batch.insulationRows.length ? `${batch.insulationRows.length} Riso` : null,
          batch.rcdRows.length ? `${batch.rcdRows.length} RCD` : null,
        ].filter(Boolean);
        return { added: total, message: `Importálva: ${parts.join(', ')}.` };
      },

      addDefect: (defect) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return { defects: [...state.defects, { ...defect, id: crypto.randomUUID() }] };
        }),

      updateDefect: (id, updates) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return { defects: state.defects.map((d) => (d.id === id ? { ...d, ...updates } : d)) };
        }),

      removeDefect: (id) =>
        set((state) => {
          if (state.reportStatus === 'FINAL') return state;
          return { defects: state.defects.filter((d) => d.id !== id) };
        }),

      collectDefectsFromMeasurements: () => {
        const state = get();
        if (state.reportStatus === 'FINAL') {
          return {
            added: 0,
            skipped: 0,
            message: 'Véglegesített jegyzőkönyvhöz nem adható automatikus hiba.',
          };
        }
        const batch = collectAutoDefectsFromMeasurements({
          rpeRows: state.rpeRows,
          loopRows: state.loopRows,
          insulationRows: state.insulationRows,
          rcdRows: state.rcdRows,
          globalLocation: state.measurementsData.globalLocation || '',
        });
        const existingDesc = new Set(state.defects.map((d) => d.description));
        const existingAuto = new Set(
          state.defects.map((d) => d.autoSourceKey).filter((k): k is string => Boolean(k))
        );
        const toAppend: DefectItem[] = [];
        let skipped = 0;
        for (const b of batch) {
          if (existingAuto.has(b.autoSourceKey)) {
            skipped += 1;
            continue;
          }
          if (existingDesc.has(b.description)) {
            skipped += 1;
            continue;
          }
          existingAuto.add(b.autoSourceKey);
          existingDesc.add(b.description);
          toAppend.push({ ...b, id: crypto.randomUUID() });
        }
        if (toAppend.length > 0) {
          set((s) => ({ defects: [...s.defects, ...toAppend] }));
        }
        const added = toAppend.length;
        if (added === 0 && skipped === 0) {
          return {
            added: 0,
            skipped: 0,
            message: 'Nincs „Nem megfelelő” mérési sor (Rpe / Zs / Riso / RCD).',
          };
        }
        if (added === 0 && skipped > 0) {
          return {
            added: 0,
            skipped,
            message: `Minden releváns hiba már a listában (${skipped} sor egyezés).`,
          };
        }
        return {
          added,
          skipped,
          message:
            skipped > 0
              ? `Hozzáadva: ${added} automatikus hiba. Kihagyva (már szerepel): ${skipped}.`
              : `Hozzáadva: ${added} automatikus hiba.`,
        };
      },

      buildApiPayload: () => {
        const state = get();
        let fabricPart: Record<string, unknown> | null = null;
        let diagram_image: string | null = null;

        if (state.activeCanvas) {
          try {
            const c = state.activeCanvas as { toJSON: (a?: string[]) => unknown; toDataURL: (o?: object) => string };
            fabricPart = c.toJSON(['vbfData']) as Record<string, unknown>;
            diagram_image = c.toDataURL({ format: 'png', multiplier: 1 });
          } catch (e) {
            console.error('Canvas serialization error', e);
          }
        } else if (state.pendingDiagramData) {
          const { fabricJson } = splitDiagramPayload(state.pendingDiagramData);
          fabricPart = fabricJson;
        }

        const diagram_data = mergeDiagramPayload(fabricPart, state.siteTree);

        const rd = state.reportData;
        return {
          title: rd.siteAddress ? `VBF - ${rd.siteAddress}` : 'Új Jegyzőkönyv',
          report_type: (rd.docType || 'vbf_idoszakos').toLowerCase(),
          client_data: {
            ...rd,
            visualChecks: state.visualChecks,
            type: rd.docType || 'VBF',
          },
          measurements_data: [
            {
              rpe: state.rpeRows.map((r) => {
                const row: Record<string, unknown> = {
                  point: r.point,
                  loc: r.location,
                  val: r.rpeValue,
                  pass: r.isOk === 'yes' ? 'Igen' : 'Nem',
                };
                if (r.node_id?.trim()) row.node_id = r.node_id.trim();
                return row;
              }),
              insulation: stripMeasurementIds(state.insulationRows),
              loop: stripMeasurementIds(state.loopRows),
              rcd: stripMeasurementIds(state.rcdRows),
            },
          ],
          incoming_phases: state.measurementsData,
          defects_data: state.defects.map((d) => ({
            templateId: d.description,
            description: d.description,
            location: d.location,
            standard: d.severity,
          })),
          notes: rd.reportNotes || '',
          inspector_notes: rd.inspectorNotes || '',
          diagram_data,
          diagram_image,
        };
      },

      clearDraft: () =>
        set({
          reportData: {},
          measurementsData: {},
          rpeRows: defaultRpe(),
          loopRows: [],
          insulationRows: [],
          rcdRows: [],
          defects: [],
          reportStatus: null,
          lastKnownServerUpdatedAt: null,
          visualChecks: defaultVisualChecks(),
          pendingDiagramData: null,
          siteTree: [],
        }),
    }),
    {
      name: 'vbf-draft-storage',
      partialize: (s) => ({
        reportData: s.reportData,
        measurementsData: s.measurementsData,
        rpeRows: s.rpeRows,
        loopRows: s.loopRows,
        insulationRows: s.insulationRows,
        rcdRows: s.rcdRows,
        defects: s.defects,
        reportStatus: s.reportStatus,
        lastKnownServerUpdatedAt: s.lastKnownServerUpdatedAt,
        visualChecks: s.visualChecks,
        siteTree: s.siteTree,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<DraftState>;
        return {
          ...current,
          ...p,
          loopRows: ensureRowIds(p.loopRows ?? []),
          insulationRows: ensureRowIds(p.insulationRows ?? []),
          rcdRows: ensureRowIds(p.rcdRows ?? []),
          siteTree: p.siteTree ?? [],
          visualChecks: { ...defaultVisualChecks(), ...p.visualChecks },
          reportStatus: p.reportStatus ?? null,
          lastKnownServerUpdatedAt: p.lastKnownServerUpdatedAt ?? null,
          pendingDiagramData: null,
          activeCanvas: null,
        };
      },
    }
  )
);

export const useIsReportLocked = () => useDraftStore((s) => s.reportStatus === 'FINAL');
