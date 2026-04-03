import type { ServerReport } from './hydrateReport';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getAuthHeader() {
  const token = localStorage.getItem('vbf_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function saveReportToCloud(payload: any, reportId?: string) {
  const isUpdate = !!reportId;
  const method = isUpdate ? 'PUT' : 'POST';
  const url = isUpdate ? `${API_BASE_URL}/api/reports/${reportId}` : `${API_BASE_URL}/api/reports`;

  const res = await fetch(url, {
    method,
    headers: getAuthHeader(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Hiba a mentés során');
  }

  const data = await res.json();
  return data;
}

type ReportFetchError = Error & { status: number };

function throwReportFetchError(status: number, message: string): never {
  const e = new Error(message) as ReportFetchError;
  e.status = status;
  throw e;
}

/** Teljes jegyzőkönyv (szinkron a szerkesztőhöz) */
export async function fetchReportById(reportId: string) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}`, {
    headers: getAuthHeader(),
  });
  if (res.status === 404) {
    localStorage.removeItem('vbf_last_report_id');
    throwReportFetchError(404, 'Jegyzőkönyv nem található.');
  }
  if (res.status === 401 || res.status === 403) {
    const err = await res.json().catch(() => ({}));
    throwReportFetchError(
      res.status,
      (err as { detail?: string }).detail || 'Nincs jogosultság.'
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throwReportFetchError(
      res.status,
      (err as { detail?: string }).detail || `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<ServerReport>;
}

export async function finalizeReport(reportId: string) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/finalize`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Véglegesítés sikertelen');
  }
  return res.json() as Promise<{ status: string; id: number }>;
}

export async function fetchReports() {
  const res = await fetch(`${API_BASE_URL}/api/reports`, {
    headers: getAuthHeader()
  });

  if (!res.ok) throw new Error('Hiba a jegyzőkönyvek letöltésekor');
  return res.json();
}

export async function exportWord(reportId: string) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/export/docx`, {
    headers: getAuthHeader()
  });

  if (!res.ok) throw new Error('Hiba a Word generálásakor');
  const blob = await res.blob();
  return blob;
}

export async function exportPdf(reportId: string) {
  const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/export/pdf`, {
    headers: getAuthHeader()
  });

  if (!res.ok) throw new Error('Hiba a PDF generálásakor');
  const blob = await res.blob();
  return blob;
}

export async function generateAiSummary(payload: any) {
  const res = await fetch(`${API_BASE_URL}/api/reports/generate_ai_summary`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      defects: payload.defects_data,
      meas: payload.incoming_phases,
      system_type: payload.incoming_phases?.inSystemType,
      doc_type: payload.report_type
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Hiba az AI összefoglaló generálása során!');
  }

  const data = await res.json();
  return data.summary;
}

export type PadfxParseResult =
  | {
      status: 'success';
      is_sqlite: boolean;
      measurements?: Array<Record<string, unknown>>;
      tables?: string[];
      message?: string;
    }
  | { status: 'error'; message: string };

/** Metrel PADFX (ZIP/XML) feltöltése — bejelentkezés kötelező. */
export async function uploadPadfxFile(file: File): Promise<PadfxParseResult> {
  const token = localStorage.getItem('vbf_token');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE_URL}/api/padfx/parse`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      status: 'error',
      message: (data as { message?: string; detail?: string }).message ||
        (data as { detail?: string }).detail ||
        `HTTP ${res.status}`,
    };
  }
  return data as PadfxParseResult;
}

// --- Törzsadatok (masterdata) — SSOT: backend/schemas.py Customer*, Inspector* ---

export type CustomerDto = {
  id: number;
  owner_id: number;
  name: string;
  address?: string | null;
  hrsz?: string | null;
  building_purpose?: string | null;
};

export type InspectorDto = {
  id: number;
  owner_id: number;
  name: string;
  license?: string | null;
  instrument_type?: string | null;
  instrument_cal?: string | null;
};

export async function fetchCustomers(): Promise<CustomerDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/customers`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Ügyfelek betöltése sikertelen.');
  return res.json();
}

export async function fetchInspectors(): Promise<InspectorDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/inspectors`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Felülvizsgálók betöltése sikertelen.');
  return res.json();
}

export async function createCustomer(body: {
  name: string;
  address?: string;
  hrsz?: string;
  building_purpose?: string;
}): Promise<CustomerDto> {
  const res = await fetch(`${API_BASE_URL}/api/customers`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Ügyfél mentése sikertelen.');
  }
  return res.json();
}

export async function createInspector(body: {
  name: string;
  license?: string;
  instrument_type?: string;
  instrument_cal?: string;
}): Promise<InspectorDto> {
  const res = await fetch(`${API_BASE_URL}/api/inspectors`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Felülvizsgáló mentése sikertelen.');
  }
  return res.json();
}
