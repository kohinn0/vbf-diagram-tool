import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../lib/apiBaseUrl';
import { fetchCurrentUser, fetchAuditLogs, type CurrentUserDto, type AuditLogItem } from '../lib/api';
import { SignedOutCallout } from '../components/ui/SignedOutCallout';
import { PageHeader } from '../components/ui/PageHeader';
import { vbf } from '../lib/vbfUi';

const AUDIT_ACTION_LABELS: Record<string, string> = {
  login_ok: '🔓 Bejelentkezés',
  login_fail: '⛔ Sikertelen belépés',
  register: '✅ Regisztráció',
  report_create: '📄 Jkv. létrehozva',
  report_finalize: '🔒 Jkv. véglegesítve',
  report_delete: '🗑️ Jkv. törölve',
  report_export_docx: '📥 DOCX export',
  report_export_pdf: '📥 PDF export',
  report_snapshot: '📷 Pillanatkép',
  report_restore: '↩️ Visszaállítás',
  delete_account: '❌ Fiók törlés',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
}

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN']);

export default function AdminTab() {
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('vbf_token');
    if (!token) {
      setLoading(false);
      return;
    }
    setErr(null);
    fetchCurrentUser()
      .then(setUser)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Profil nem elérhető.'))
      .finally(() => setLoading(false));
  }, []);

  if (!localStorage.getItem('vbf_token')) {
    return <SignedOutCallout featureLabel="a cég / admin oldal" />;
  }

  const isAdmin = user && ADMIN_ROLES.has(user.role);
  const docsUrl = `${API_BASE_URL.replace(/\/$/, '')}/docs`;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <PageHeader
        eyebrow="Üzemeltetés"
        title="Cég / admin"
        description={
          <>
            Az <code className="rounded bg-[var(--color-bg-input)] px-1 text-xs">/app/admin</code> útvonal — fiók adatok,
            API-hozzáférés és (jogosultság esetén) cégadmin feladatok.
          </>
        }
      />

      {loading && (
        <p className="text-sm text-[var(--color-text-muted)]" role="status">
          Betöltés…
        </p>
      )}

      {err && !loading && (
        <div className={`mb-6 max-w-xl rounded-xl px-4 py-3 text-sm ${vbf.surfaceDanger}`}>
          {err}{' '}
          <Link to="/" className="font-semibold text-primary underline">
            Főoldal
          </Link>
        </div>
      )}

      {user && !loading && (
        <div className="grid gap-4 max-w-2xl">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-3">Fiók</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <dt className="text-[var(--color-text-muted)]">Felhasználó:</dt>
                <dd className="font-medium text-[var(--color-text-main)]">{user.username}</dd>
              </div>
              {user.email && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-[var(--color-text-muted)]">E-mail:</dt>
                  <dd>{user.email}</dd>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <dt className="text-[var(--color-text-muted)]">Szerepkör:</dt>
                <dd className="font-medium">{user.role}</dd>
              </div>
              {user.company_name && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-[var(--color-text-muted)]">Cég:</dt>
                  <dd>{user.company_name}</dd>
                </div>
              )}
              {user.company_plan && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-[var(--color-text-muted)]">Csomag:</dt>
                  <dd>{user.company_plan}</dd>
                </div>
              )}
            </dl>
          </div>

          {isAdmin ? (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">Admin API és dokumentáció</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Felhasználók, cégbeállítások, megrendelések, csomagok — a backend{' '}
                <strong className="text-[var(--color-text-main)]">/api/admin/*</strong> végpontjain érhetők el. A
                böngészőben interaktív lista:
              </p>
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow hover:opacity-95"
              >
                OpenAPI / Swagger megnyitása
              </a>
              <p className="text-xs text-[var(--color-text-muted)] mt-3">
                Ha a link nem nyílik meg, ellenőrizd az <code className="bg-[var(--color-bg-input)] px-1 rounded">API_BASE_URL</code>{' '}
                beállítást (dev: proxy vagy <code className="bg-[var(--color-bg-input)] px-1 rounded">Vite</code> env).
              </p>
            </div>
          ) : (
            <div className={`rounded-2xl px-4 py-3 text-sm ${vbf.surfaceWarning}`}>
              A teljes cégadmin / főadmin funkciók (felhasználók, fizetések) csak{' '}
              <strong className="font-semibold">COMPANY_ADMIN</strong> vagy{' '}
              <strong className="font-semibold">SUPER_ADMIN</strong> jogkörrel érhetők el az API-n keresztül.
              Technikusi fiókkal a jegyzőkönyv-készítő és a saját feladataid maradnak elérhetők.
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[var(--color-text-main)] mb-2">Vissza a munkához</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/app/report"
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border-color)] px-4 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)]"
              >
                Jegyzőkönyv adatok
              </Link>
              <Link
                to="/app/diagram"
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border-color)] px-4 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)]"
              >
                Rajz
              </Link>
            </div>
          </div>
        </div>

        {/* Audit napló */}
        {ADMIN_ROLES.has(user?.role ?? '') && (
          <div className="mt-6 rounded-xl border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-panel)_80%,transparent)] overflow-hidden shadow-sm">
            <button
              type="button"
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--color-bg-input)] transition-colors"
              onClick={() => {
                setAuditOpen((v) => !v);
                if (!auditOpen) {
                  setAuditLoading(true);
                  fetchAuditLogs({ limit: 100 })
                    .then((r) => { setAuditLogs(r.items); setAuditTotal(r.total); })
                    .catch(() => {})
                    .finally(() => setAuditLoading(false));
                }
              }}
            >
              <span className="font-semibold text-[var(--color-text-main)]">🔍 Audit napló</span>
              <span className="text-xs text-[var(--color-text-muted)]">{auditOpen ? '▲ Összecsuk' : '▼ Megnyit'}</span>
            </button>
            {auditOpen && (
              <div className="px-6 pb-6 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    className="h-9 rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-input)] px-3 text-sm focus:outline-none focus:border-[var(--primary)]"
                    placeholder="Szűrés (pl. report_create, login...)"
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                  />
                  <button
                    type="button"
                    className="h-9 rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-card)] px-3 text-sm hover:bg-[var(--color-bg-input)] transition-colors"
                    onClick={() => {
                      setAuditLoading(true);
                      fetchAuditLogs({ limit: 200, action: auditFilter || undefined })
                        .then((r) => { setAuditLogs(r.items); setAuditTotal(r.total); })
                        .catch(() => {})
                        .finally(() => setAuditLoading(false));
                    }}
                  >
                    Frissítés
                  </button>
                  <span className="text-xs text-[var(--color-text-muted)]">Összes: {auditTotal}</span>
                </div>
                {auditLoading && <p className="text-xs text-[var(--color-text-muted)]">Betöltés…</p>}
                {!auditLoading && auditLogs.length === 0 && (
                  <p className="text-xs text-[var(--color-text-muted)]">Nincsenek naplóbejegyzések.</p>
                )}
                {auditLogs.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                    <table className="w-full text-xs text-left border-collapse min-w-[640px]">
                      <thead>
                        <tr className="bg-[var(--color-bg-card)] border-b border-[var(--border-color)]">
                          <th className="px-3 py-2 font-semibold w-36">Dátum</th>
                          <th className="px-3 py-2 font-semibold w-16">User ID</th>
                          <th className="px-3 py-2 font-semibold w-44">Esemény</th>
                          <th className="px-3 py-2 font-semibold">Részletek</th>
                          <th className="px-3 py-2 font-semibold w-28">IP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,var(--color-bg-input))] transition-colors">
                            <td className="px-3 py-2 whitespace-nowrap text-[var(--color-text-muted)]">{fmtDate(log.created_at)}</td>
                            <td className="px-3 py-2 text-[var(--color-text-muted)] text-center">{log.user_id ?? '—'}</td>
                            <td className="px-3 py-2 font-medium">
                              {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                            </td>
                            <td className="px-3 py-2 text-[var(--color-text-muted)] truncate max-w-[280px]" title={log.detail ?? ''}>{log.detail || '—'}</td>
                            <td className="px-3 py-2 text-[var(--color-text-muted)] font-mono">{log.ip || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      )}
    </div>
  );
}
