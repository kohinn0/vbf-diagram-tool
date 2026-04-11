import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../lib/apiBaseUrl';
import {
  fetchCurrentUser,
  fetchDashboardStats,
  fetchPendingOrdersAdmin,
  fetchAdminCompanies,
  isSuperAdminRole,
  type CurrentUserDto,
  type DashboardStatsDto,
  type PendingOrderDto,
  type CompanyAdminRowDto,
} from '../lib/api';
import { SignedOutCallout } from '../components/ui/SignedOutCallout';
import { PageHeader } from '../components/ui/PageHeader';
import { vbf } from '../lib/vbfUi';
import { SkeletonText } from '../components/ui/Skeleton';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function OpsTab() {
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [pending, setPending] = useState<PendingOrderDto[]>([]);
  const [companies, setCompanies] = useState<CompanyAdminRowDto[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('vbf_token');
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setErr(null);
    (async () => {
      try {
        const u = await fetchCurrentUser();
        if (cancelled) return;
        setUser(u);
        if (!isSuperAdminRole(u.role)) {
          setLoading(false);
          return;
        }
        const [s, p, c] = await Promise.all([
          fetchDashboardStats().catch(() => null),
          fetchPendingOrdersAdmin().catch(() => []),
          fetchAdminCompanies().catch(() => []),
        ]);
        if (cancelled) return;
        setStats(s);
        setPending(p);
        setCompanies(c);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Betöltés sikertelen.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!localStorage.getItem('vbf_token')) {
    return <SignedOutCallout featureLabel="az üzemeltetői oldal" />;
  }

  const canOps = user && isSuperAdminRole(user.role);
  const docsUrl = `${API_BASE_URL.replace(/\/$/, '')}/docs`;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <PageHeader
        eyebrow="Üzemeltetés"
        title="Ops"
        description={
          <>
            Platform üzemeltető: áttekintés, függő utalásos megrendelések, cégek száma. A részletes API-k a{' '}
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline">
              OpenAPI / Swagger
            </a>{' '}
            dokumentációban.
          </>
        }
      />

      {loading && (
        <div className="max-w-3xl space-y-2" role="status">
          <SkeletonText lines={2} />
        </div>
      )}

      {err && !loading && (
        <div className={`mb-6 max-w-xl rounded-xl px-4 py-3 text-sm ${vbf.surfaceDanger}`}>{err}</div>
      )}

      {!loading && user && !canOps && (
        <div className={`max-w-xl rounded-xl px-4 py-3 text-sm ${vbf.surfaceWarning}`}>
          Ez az oldal csak a <strong className="font-semibold">SUPER_ADMIN</strong> szerepkör számára elérhető. A
          szerepköröd: <code className="rounded bg-[var(--color-bg-input)] px-1">{user.role}</code>.
        </div>
      )}

      {canOps && !loading && (
        <div className="flex flex-col gap-6 max-w-5xl">
          <div className="flex flex-wrap gap-3">
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow hover:opacity-95"
            >
              Swagger megnyitása
            </a>
            <Link
              to="/app/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-card)] px-4 text-sm font-semibold text-[var(--color-text-main)] hover:bg-white/[0.04]"
            >
              Felhasználói dashboard
            </Link>
            <Link
              to="/app/admin"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-card)] px-4 text-sm font-semibold text-[var(--color-text-main)] hover:bg-white/[0.04]"
            >
              Cég / admin
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Jegyzőkönyvek</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">{stats?.total_reports ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Ez a hónap</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">{stats?.monthly_reports ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Cégek</p>
              <p className="mt-1 text-2xl font-semibold text-[var(--color-text-main)]">{companies.length}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Függő utalás</p>
              <p className="mt-1 text-2xl font-semibold text-amber-200">{pending.length}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-4">Függőben lévő utalásos megrendelések</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Nincs nyitott tétel.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-color)] text-[var(--color-text-muted)]">
                      <th className="pb-2 pr-3 font-medium">Idő</th>
                      <th className="pb-2 pr-3 font-medium">Vevő</th>
                      <th className="pb-2 pr-3 font-medium">E-mail</th>
                      <th className="pb-2 pr-3 font-medium">Csomag</th>
                      <th className="pb-2 pr-3 font-medium text-right">Összeg (Ft)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.slice(0, 20).map((row) => (
                      <tr key={row.id} className="border-b border-[var(--border-color)]/60">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(row.created_at)}</td>
                        <td className="py-2 pr-3">{row.customer_name}</td>
                        <td className="py-2 pr-3 break-all">{row.email}</td>
                        <td className="py-2 pr-3">{row.plan_type}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{row.amount_huf.toLocaleString('hu-HU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pending.length > 20 && (
                  <p className="mt-3 text-xs text-[var(--color-text-muted)]">Első 20 sor megjelenítve; teljes lista: API / Swagger.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
