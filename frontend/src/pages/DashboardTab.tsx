import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchDashboardStats,
  fetchReports,
  fetchReportById,
  fetchUsage,
  type DashboardStatsDto,
  type ReportSummaryDto,
  type UsageDto,
} from "../lib/api";
import { applyServerReportToDraft } from "../lib/hydrateReport";
import { toast } from "../lib/toast";
import { Skeleton, SkeletonText } from "../components/ui/Skeleton";
import { SignedOutCallout } from "../components/ui/SignedOutCallout";
import { PageHeader } from "../components/ui/PageHeader";
import { vbf } from "../lib/vbfUi";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("hu-HU", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function DashboardTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [statsForbidden, setStatsForbidden] = useState(false);
  const [usage, setUsage] = useState<UsageDto | null>(null);
  const [reports, setReports] = useState<ReportSummaryDto[]>([]);
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!localStorage.getItem("vbf_token")) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [u, list] = await Promise.all([fetchUsage(), fetchReports(80)]);
        if (cancelled) return;
        setUsage(u);
        setReports(list);
      } catch {
        if (!cancelled) toast.error("Alapadatok betöltése sikertelen.");
      }
      try {
        const s = await fetchDashboardStats();
        if (!cancelled) {
          setStats(s);
          setStatsForbidden(false);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const st = typeof e === "object" && e !== null && "status" in e ? (e as { status?: number }).status : undefined;
        if (st === 403) {
          setStats(null);
          setStatsForbidden(true);
        } else {
          toast.error(e instanceof Error ? e.message : "Statisztika hiba");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recentReports = useMemo(() => {
    return [...reports]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 12);
  }, [reports]);

  const openReport = async (id: number) => {
    setOpeningId(id);
    try {
      const r = await fetchReportById(String(id));
      applyServerReportToDraft(r);
      localStorage.setItem("vbf_last_report_id", String(id));
      window.dispatchEvent(new Event("vbf-report-id-changed"));
      navigate("/app/report");
      toast.success("Jegyzőkönyv betöltve.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Betöltés sikertelen.");
    } finally {
      setOpeningId(null);
    }
  };

  if (!localStorage.getItem("vbf_token")) {
    return <SignedOutCallout featureLabel="a dashboard" />;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <PageHeader
        eyebrow="Vezérlőpult"
        title="Dashboard"
        description="Áttekintés, gyors műveletek és legutóbb módosított jegyzőkönyvek."
      />

      {loading ? (
        <div className="space-y-6 max-w-4xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-40 w-full max-w-2xl" />
          <SkeletonText lines={4} />
        </div>
      ) : (
        <>
          {/* Kihasználtság */}
          {usage && (
            <div className="mb-6 max-w-2xl rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-4 shadow-[var(--shadow-premium-sm)] ring-1 ring-white/[0.04]">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">Cég / csomag</h2>
              <p className="text-sm text-[var(--color-text-main)]">
                Csomag: <strong>{usage.plan}</strong>
                {usage.reports_limit != null ? (
                  <>
                    {" "}
                    — e hónap: {usage.reports_this_month} / {usage.reports_limit} jegyzőkönyv
                  </>
                ) : (
                  <> — e hónap: {usage.reports_this_month} jegyzőkönyv</>
                )}
              </p>
              {usage.users_limit != null && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Felhasználók: {usage.users_count} / {usage.users_limit}
                </p>
              )}
            </div>
          )}

          {/* Statisztikák (admin / cégvezető) */}
          {statsForbidden && (
            <div className={`mb-6 max-w-2xl rounded-xl px-4 py-3 text-sm ${vbf.surfaceWarning}`}>
              A részletes cégstatisztikák csak <strong className="font-semibold">cég admin</strong> vagy{" "}
              <strong className="font-semibold">főadmin</strong> jogkörrel érhetők el. Technikusként lentebb a saját
              jogköröd szerinti jegyzőkönyvek listája látható.
            </div>
          )}

          {stats && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-3">Statisztikák</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                <StatCard label="Összes jegyzőkönyv" value={stats.total_reports} />
                <StatCard label="E hónap" value={stats.monthly_reports} />
                <StatCard label="Véglegesített" value={stats.finalized_reports} />
                <StatCard label="Piszkozat" value={stats.draft_reports} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm text-[var(--color-text-muted)] max-w-2xl">
                <p>
                  Aktív felhasználók (szűrt): <strong className="text-[var(--color-text-main)]">{stats.active_users}</strong>
                </p>
                <p>
                  Függő feladatok: <strong className="text-[var(--color-text-main)]">{stats.pending_jobs}</strong>
                </p>
              </div>
              {Object.keys(stats.type_breakdown).length > 0 && (
                <div className="mt-4 text-sm">
                  <span className="font-semibold text-[var(--color-text-main)]">Típus szerint: </span>
                  {Object.entries(stats.type_breakdown).map(([t, c]) => (
                    <span key={t} className="mr-3">
                      {t}: {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Gyors műveletek */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-3">Gyors műveletek</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/app/diagram"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow hover:opacity-95"
              >
                Új / szerkesztés — rajz
              </Link>
              <Link
                to="/app/report"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-card)] px-4 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)]"
              >
                Jegyzőkönyv adatok
              </Link>
              <Link
                to="/app/measurements"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-card)] px-4 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)]"
              >
                Mérések
              </Link>
              <Link
                to="/app/defects"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-card)] px-4 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)]"
              >
                Hibák
              </Link>
            </div>
          </div>

          {/* Utolsó riportok */}
          <div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3 max-w-3xl">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Legutóbb módosított jegyzőkönyvek</h2>
              <Link
                to="/app/reports"
                className="text-sm font-semibold text-primary hover:underline min-h-11 inline-flex items-center"
              >
                Teljes lista és szűrés →
              </Link>
            </div>
            {recentReports.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Még nincs jegyzőkönyv a listában.</p>
            ) : (
              <ul className="divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] bg-[var(--color-bg-card)] max-w-3xl overflow-hidden">
                {recentReports.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={openingId === r.id}
                      onClick={() => openReport(r.id)}
                      className="flex w-full min-h-11 flex-col items-start gap-0.5 px-4 py-3 text-left text-sm hover:bg-[var(--color-bg-input)] disabled:opacity-60 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium text-[var(--color-text-main)]">
                        {r.title || `Jegyzőkönyv #${r.id}`}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {r.status} · {r.report_type} · {formatDate(r.updated_at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--color-text-main)]">{value}</p>
    </div>
  );
}
