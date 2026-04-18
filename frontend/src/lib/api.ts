import type { ServerReport } from './hydrateReport';
import { API_BASE_URL } from './apiBaseUrl';

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

export type ReportSummaryDto = {
  id: number;
  title: string;
  report_type: string;
  status: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
  finalized_at?: string | null;
};

export async function fetchReports(limit = 100, skip = 0): Promise<ReportSummaryDto[]> {
  const q = new URLSearchParams({ limit: String(limit), skip: String(skip) });
  const res = await fetch(`${API_BASE_URL}/api/reports?${q}`, {
    headers: getAuthHeader()
  });

  if (!res.ok) throw new Error('Hiba a jegyzőkönyvek letöltésekor');
  return res.json();
}

export type DashboardStatsDto = {
  total_reports: number;
  monthly_reports: number;
  finalized_reports: number;
  draft_reports: number;
  type_breakdown: Record<string, number>;
  monthly_trend: { year: number; month: number; count: number }[];
  defect_stats: unknown;
  result_stats: unknown;
  active_users: number;
  pending_jobs: number;
};

export async function fetchDashboardStats(): Promise<DashboardStatsDto> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
    headers: getAuthHeader(),
  });
  if (res.status === 403) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error((err as { detail?: string }).detail || 'Nincs jogosultság.'), {
      status: 403,
    });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Statisztika betöltése sikertelen.');
  }
  return res.json();
}

export type UsageDto = {
  plan: string;
  reports_this_month: number;
  reports_limit?: number | null;
  users_count: number;
  users_limit?: number | null;
};

export async function fetchUsage(): Promise<UsageDto> {
  const res = await fetch(`${API_BASE_URL}/api/usage`, { headers: getAuthHeader() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Kihasználtság betöltése sikertelen.');
  }
  return res.json();
}

/** Csak platform tulajdonos (Ops menü / üzemeltetői oldal). Az `ADMIN` szerep nem látja. */
export function isSuperAdminRole(role: string | undefined | null): boolean {
  return role === 'SUPER_ADMIN';
}

export type PendingOrderDto = {
  id: number;
  email: string;
  customer_name: string;
  plan_type: string;
  amount_huf: number;
  status: string;
  created_at: string;
};

export async function fetchPendingOrdersAdmin(): Promise<PendingOrderDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/pending-orders`, { headers: getAuthHeader() });
  if (res.status === 403) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error((err as { detail?: string }).detail || 'Nincs jogosultság.'), { status: 403 });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Megrendelések betöltése sikertelen.');
  }
  return res.json();
}

export type CompanyAdminRowDto = {
  id: number;
  name: string;
  plan?: string | null;
};

export async function fetchAdminCompanies(): Promise<CompanyAdminRowDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/admin/companies`, { headers: getAuthHeader() });
  if (res.status === 403) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error((err as { detail?: string }).detail || 'Nincs jogosultság.'), { status: 403 });
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Cégek betöltése sikertelen.');
  }
  return res.json();
}

/** Nyilvános csomaglista — `GET /api/plans` (auth nélkül), SSOT: `SubscriptionPlanResponse` */
export type SubscriptionPlanPublicDto = {
  plan_key: string;
  display_name: string;
  price_monthly?: number | null;
  price_yearly?: number | null;
  reports_per_month_limit?: number | null;
  max_users?: number | null;
  features?: string[] | null;
  sort_order: number;
};

export async function fetchPublicPlans(): Promise<SubscriptionPlanPublicDto[]> {
  const res = await fetch(`${API_BASE_URL}/api/plans`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Csomagok betöltése sikertelen.');
  }
  return res.json();
}

export async function fetchCardPaymentsEnabled(): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/payments/card-payments-enabled`);
  if (!res.ok) return false;
  const d = (await res.json()) as { enabled?: boolean };
  return Boolean(d.enabled);
}

/** Nyilvános probe — auth nélkül, `GET /health` (DB ping). */
type HealthResponse = { status: string; detail?: string };

export async function fetchHealth(): Promise<{ ok: boolean; body: HealthResponse; latencyMs: number }> {
  const t0 = performance.now();
  const res = await fetch(`${API_BASE_URL}/health`, { method: "GET" });
  const latencyMs = Math.round(performance.now() - t0);
  const body = (await res.json().catch(() => ({}))) as HealthResponse;
  const ok = res.ok && body.status === "ok";
  if (!ok && !body.detail && !res.ok) {
    body.detail = body.detail || `HTTP ${res.status}`;
  }
  return { ok, body, latencyMs };
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

type PadfxParseResult =
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

/** Bejelentkezett felhasználó — SSOT: backend `UserResponse` */
export type CurrentUserDto = {
  id: number;
  username: string;
  email?: string | null;
  is_active: boolean;
  role: string;
  company_id?: number | null;
  company_name?: string | null;
  subscription_expires?: string | null;
  company_plan?: string | null;
  pdf_export_watermarked?: boolean;
};

export async function fetchCurrentUser(): Promise<CurrentUserDto> {
  const res = await fetch(`${API_BASE_URL}/api/users/me`, { headers: getAuthHeader() });
  if (res.status === 401 || res.status === 403) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Bejelentkezés szükséges.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Profil betöltése sikertelen.');
  }
  return res.json();
}

/** OAuth2 jelszó flow — `username` a backend felhasználónév (nem feltétlenül e-mail). */
type TokenResponse = { access_token: string; token_type: string };

export async function loginWithPassword(username: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set('username', username.trim());
  body.set('password', password);
  const res = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { detail?: string }).detail || 'Bejelentkezés sikertelen.');
  }
  return data as TokenResponse;
}

export function clearSession() {
  localStorage.removeItem('vbf_token');
}

export async function updateMyProfile(body: { email?: string | null }): Promise<CurrentUserDto> {
  const res = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: 'PATCH',
    headers: getAuthHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Profil mentése sikertelen.');
  }
  return res.json();
}

export async function changeMyPassword(current_password: string, new_password: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/password`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify({ current_password, new_password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { detail?: string }).detail || 'Jelszócsere sikertelen.');
  }
  return data as { message: string };
}

/** Elfelejtett jelszó — a backend egységes választ ad (biztonság). */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/request-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { detail?: string }).detail || 'Kérés sikertelen.');
  }
  return data as { message: string };
}

/** GDPR 20. cikk — géppel olvasható JSON letöltése. */
export async function downloadMyDataJsonFile(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/data-export`, { headers: getAuthHeader() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || 'Export sikertelen.');
  }
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vbf-adatexport-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** GDPR — teljes ZIP (jegyzőkönyvek, képek). */
export async function downloadMyDataZipFile(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/users/me/data-export-zip`, { headers: getAuthHeader() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "ZIP export sikertelen.");
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition");
  let filename = `vbf-adatexport-${Date.now()}.zip`;
  const m = cd && /filename="([^"]+)"/.exec(cd);
  if (m) filename = m[1];
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** GDPR 17. cikk — fiók törlése (visszavonhatatlan). */
export async function deleteMyAccount(): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/users/me`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { detail?: string }).detail || "Fiók törlése sikertelen.");
  }
  return data as { message: string };
}

// ── Verziókezelés ─────────────────────────────────────────────────────────────

export interface ReportVersionMeta {
  id: number;
  version_num: number;
  note: string | null;
  created_by: number | null;
  created_at: string | null;
}

export async function listReportVersions(reportId: number): Promise<ReportVersionMeta[]> {
  const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/versions`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Verziók lekérése sikertelen.');
  return res.json();
}

export async function createReportSnapshot(reportId: number, note?: string): Promise<ReportVersionMeta> {
  const url = new URL(`${API_BASE_URL}/api/reports/${reportId}/snapshot`);
  if (note) url.searchParams.set('note', note);
  const res = await fetch(url.toString(), { method: 'POST', headers: getAuthHeader() });
  if (!res.ok) throw new Error('Snapshot mentése sikertelen.');
  return res.json();
}

export async function restoreReportVersion(reportId: number, versionId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/versions/${versionId}/restore`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { detail?: string }).detail || 'Visszaállítás sikertelen.');
  return data as { message: string };
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  action: string;
  detail: string | null;
  ip: string | null;
  created_at: string | null;
}

export interface AuditLogsResponse {
  total: number;
  items: AuditLogItem[];
}

export async function fetchAuditLogs(params?: { skip?: number; limit?: number; action?: string; user_id?: number }): Promise<AuditLogsResponse> {
  const url = new URL(`${API_BASE_URL}/api/audit-logs`);
  if (params?.skip) url.searchParams.set('skip', String(params.skip));
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.action) url.searchParams.set('action', params.action);
  if (params?.user_id) url.searchParams.set('user_id', String(params.user_id));
  const res = await fetch(url.toString(), { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Audit napló lekérése sikertelen.');
  return res.json();
}
