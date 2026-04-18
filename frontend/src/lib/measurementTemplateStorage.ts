/**
 * Mérési sablon — localStorage alapú mentés/betöltés.
 * Csak a struktúrát (áramkör nevek, készülék típusok) tárolja, a mért értékeket nem.
 */

const STORAGE_KEY = 'vbf_meas_templates_v1';

export interface MeasurementTemplate {
  id: string;
  name: string;
  createdAt: string;
  /** Rpe mérési pontok (pont + helyszín leírás) */
  rpePoints: { point: string; location: string }[];
  /** Zs hurokellenállás áramkörök */
  loopCircuits: { circuit: string; device: string; device_type: string; in_rating: string; loc: string }[];
  /** Riso szigetelési áramkörök */
  insulationCircuits: { circuit: string }[];
  /** RCD / FI-relé készülékek */
  rcdCircuits: { circ: string; type: string; idn: string }[];
}

export function loadTemplates(): MeasurementTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persistTemplates(templates: MeasurementTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch { /* quota exceeded — silent */ }
}

export function saveNewTemplate(
  name: string,
  data: Omit<MeasurementTemplate, 'id' | 'name' | 'createdAt'>
): MeasurementTemplate {
  const template: MeasurementTemplate = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  const all = loadTemplates();
  persistTemplates([...all, template]);
  return template;
}

export function deleteTemplate(id: string): void {
  persistTemplates(loadTemplates().filter((t) => t.id !== id));
}
