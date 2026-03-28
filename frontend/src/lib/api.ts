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

  return res.json();
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
