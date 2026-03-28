import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DefectItem {
  id: string;
  location: string;
  description: string;
  severity: "kritikus" | "sulyos" | "kozepes" | "egyedi";
  isFixed: boolean;
}

export interface RpeRow {
  id: string;
  point: string;
  location: string;
  rpeValue: string;
  isOk: "yes" | "no";
}

export interface DraftState {
  reportData: Record<string, string>;
  measurementsData: Record<string, string>;
  rpeRows: RpeRow[];
  defects: DefectItem[];
  activeCanvas: any | null;
  
  // Actions
  setActiveCanvas: (canvas: any) => void;
  updateReportData: (key: string, value: string) => void;
  updateMeasurementData: (key: string, value: string) => void;
  
  addRpeRow: () => void;
  updateRpeRow: (id: string, updates: Partial<RpeRow>) => void;
  removeRpeRow: (id: string) => void;

  addDefect: (defect: Omit<DefectItem, "id">) => void;
  updateDefect: (id: string, updates: Partial<DefectItem>) => void;
  removeDefect: (id: string) => void;
  
  clearDraft: () => void;

  // Hasznos segédfüggvény a mentéshez
  buildApiPayload: () => any;
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      reportData: {},
      measurementsData: {},
      rpeRows: [{ id: crypto.randomUUID(), point: "1", location: "", rpeValue: "", isOk: "yes" }],
      defects: [],
      activeCanvas: null,

      setActiveCanvas: (canvas) => set({ activeCanvas: canvas }),

      updateReportData: (key, value) => set((state) => ({
        reportData: { ...state.reportData, [key]: value }
      })),

      updateMeasurementData: (key, value) => set((state) => ({
        measurementsData: { ...state.measurementsData, [key]: value }
      })),

      addRpeRow: () => set((state) => ({
        rpeRows: [...state.rpeRows, { id: crypto.randomUUID(), point: String(state.rpeRows.length + 1), location: "", rpeValue: "", isOk: "yes" }]
      })),

      updateRpeRow: (id, updates) => set((state) => ({
        rpeRows: state.rpeRows.map(r => r.id === id ? { ...r, ...updates } : r)
      })),

      removeRpeRow: (id) => set((state) => ({
        rpeRows: state.rpeRows.filter(r => r.id !== id)
      })),

      addDefect: (defect) => set((state) => ({
        defects: [
          ...state.defects,
          { ...defect, id: crypto.randomUUID() }
        ]
      })),

      updateDefect: (id, updates) => set((state) => ({
        defects: state.defects.map(d => d.id === id ? { ...d, ...updates } : d)
      })),

      removeDefect: (id) => set((state) => ({
        defects: state.defects.filter(d => d.id !== id)
      })),

      buildApiPayload: () => {
        const state = get();
        let diagram_data = null;
        let diagram_image = null;

        if (state.activeCanvas) {
          try {
            diagram_data = state.activeCanvas.toJSON(['vbfData']);
            diagram_image = state.activeCanvas.toDataURL({ format: 'png', multiplier: 1 });
          } catch (e) {
            console.error('Canvas serialization error', e);
          }
        }

        return {
          title: state.reportData['siteAddress'] ? `VBF - ${state.reportData['siteAddress']}` : 'Új Jegyzőkönyv',
          report_type: state.reportData['docType']?.toLowerCase() || 'vbf_idoszakos',
          client_data: {
            customerName: state.reportData['customerName'] || '',
            siteAddress: state.reportData['siteAddress'] || '',
            siteHrsz: state.reportData['siteHrsz'] || '',
            type: state.reportData['docType'] || 'VBF',
          },
          measurements_data: [
            {
              rpe: state.rpeRows,
              insulation: [], // Todo
              loop: [], // Todo
            }
          ],
          incoming_phases: state.measurementsData,
          defects_data: state.defects.map(d => ({
            templateId: d.description,
            description: d.description,
            location: d.location,
            standard: d.severity
          })),
          notes: state.reportData['reportNotes'] || '',
          inspector_notes: state.reportData['inspectorNotes'] || '',
          diagram_data,
          diagram_image,
        };
      },

      clearDraft: () => set({ reportData: {}, measurementsData: {}, rpeRows: [], defects: [] })
    }),
    {
      name: 'vbf-draft-storage', // Ez a LocalStorage kulcs neve
    }
  )
);
