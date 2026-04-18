import { type ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useDraftStore } from "../../store/draftStore";
import {
  saveReportToCloud,
  finalizeReport,
  fetchReportById,
  exportPdf,
  exportWord,
  clearSession,
  fetchCurrentUser,
  isSuperAdminRole,
} from "../../lib/api";
import { validateForExport, validateForFinalize, validateForSave } from "../../lib/validateReport";
import { toast } from "../../lib/toast";
import { legalUrls } from "../../lib/legalUrls";
import { applyServerReportToDraft, normalizeServerUpdatedAt, type ServerReport } from "../../lib/hydrateReport";

interface LayoutProps {
  children: ReactNode;
}

function isLikelyNetworkError(e: unknown): boolean {
  if (typeof TypeError !== "undefined" && e instanceof TypeError) return true;
  const m = e instanceof Error ? e.message : String(e);
  return /failed to fetch|networkerror|load failed|network request failed/i.test(m);
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  /** Másik fülön változott token / jegyzőkönyv ID → újrahydrate */
  const [storageSync, setStorageSync] = useState(0);
  /** Csak SUPER_ADMIN — Ops menü */
  const [showOpsNav, setShowOpsNav] = useState(false);
  const reportData = useDraftStore((s) => s.reportData);
  const reportStatus = useDraftStore((s) => s.reportStatus);
  const locked = reportStatus === "FINAL";

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "vbf_last_report_id" || e.key === "vbf_token") {
        setStorageSync((n) => n + 1);
      }
    };
    /** Ugyanabban a lapon másik nézet állította a `vbf_last_report_id`-t (pl. dashboard). */
    const onReportIdLocal = () => setStorageSync((n) => n + 1);
    window.addEventListener("storage", onStorage);
    window.addEventListener("vbf-report-id-changed", onReportIdLocal);
    const onToken = () => setStorageSync((n) => n + 1);
    window.addEventListener("vbf-token-changed", onToken);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("vbf-report-id-changed", onReportIdLocal);
      window.removeEventListener("vbf-token-changed", onToken);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("vbf_token");
    if (!token) {
      setShowOpsNav(false);
      return;
    }
    fetchCurrentUser()
      .then((u) => setShowOpsNav(isSuperAdminRole(u.role)))
      .catch(() => setShowOpsNav(false));
  }, [storageSync]);

  useEffect(() => {
    const token = localStorage.getItem("vbf_token");
    const id = localStorage.getItem("vbf_last_report_id");
    if (!token || !id) {
      setIsHydrating(false);
      return;
    }
    let cancelled = false;
    setIsHydrating(true);
    (async () => {
      try {
        const r = await fetchReportById(id);
        if (cancelled) return;
        const prev = useDraftStore.getState().lastKnownServerUpdatedAt;
        const incoming = normalizeServerUpdatedAt(r.updated_at);
        const serverUnchanged = incoming !== null && prev !== null && incoming === prev;
        applyServerReportToDraft(r);
        if (!serverUnchanged) {
          toast.success("Jegyzőkönyv szinkronizálva a szerverrel.");
        }
      } catch (e: unknown) {
        if (cancelled) return;
        const status =
          typeof e === "object" && e !== null && "status" in e
            ? (e as { status: number }).status
            : undefined;
        if (status === 401 || status === 403) {
          toast.error("Bejelentkezés lejárt vagy nincs jogosultság — a helyi piszkozat megmaradt.");
          return;
        }
        if (status === 404) {
          toast.error("A jegyzőkönyv már nem elérhető a szerveren.");
          return;
        }
        if (isLikelyNetworkError(e)) {
          toast.error("Nem sikerült kapcsolódni a szerverhez — a piszkozat helyben maradt.");
          return;
        }
        toast.error("Szinkronizálás sikertelen — a piszkozat helyben maradt.");
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageSync]);

  const handleSave = async () => {
    const errs = validateForSave(reportData);
    if (errs.length) {
      toast.error(errs.join(" "));
      return;
    }
    setIsSaving(true);
    try {
      const payload = useDraftStore.getState().buildApiPayload();
      const currentReportId = localStorage.getItem("vbf_last_report_id") || undefined;
      const data = await saveReportToCloud(payload, currentReportId);
      if (data && (data as { id?: number }).id) {
        const id = (data as { id: number }).id;
        localStorage.setItem("vbf_last_report_id", String(id));
        applyServerReportToDraft(data as ServerReport);
        toast.success("Mentés sikeres.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ismeretlen hiba";
      toast.error("Mentés sikertelen: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (type: "pdf" | "word") => {
    const reportId = localStorage.getItem("vbf_last_report_id");
    if (!reportId) {
      toast.error("Előbb mentsd el a jegyzőkönyvet a felhőbe.");
      return;
    }
    if (type === "word" && locked) {
      toast.error("Véglegesített jegyzőkönyvhöz csak PDF exportálható.");
      return;
    }
    const errs = validateForExport(reportData);
    if (errs.length) {
      toast.error(errs.join(" "));
      return;
    }
    setIsSaving(true);
    try {
      const blob = type === "pdf" ? await exportPdf(reportId) : await exportWord(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VBF_Jegyzkokonyv_${reportId}.${type === "pdf" ? "pdf" : "docx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(type === "pdf" ? "PDF letöltve." : "Word letöltve.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Export hiba";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    const reportId = localStorage.getItem("vbf_last_report_id");
    if (!reportId) {
      toast.error("Előbb mentsd el a jegyzőkönyvet.");
      return;
    }
    const errs = validateForFinalize(reportData);
    if (errs.length) {
      toast.error(errs.join(" "));
      return;
    }
    if (!window.confirm("Véglegesíted a jegyzőkönyvet? Utána nem szerkeszthető, csak PDF export és megosztás.")) {
      return;
    }
    setIsSaving(true);
    try {
      const data = await finalizeReport(reportId);
      applyServerReportToDraft(data as ServerReport);
      toast.success("Jegyzőkönyv véglegesítve.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Véglegesítés hiba";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const pathNorm = location.pathname.replace(/\/$/, "") || "/";
  const isDashboardTab = pathNorm === "/app/dashboard";
  const isReportsListTab = pathNorm === "/app/reports";
  const isSubscriptionTab = pathNorm === "/app/subscription";
  const isDiagramTab = pathNorm === "/app/diagram";
  const isReportTab = pathNorm === "/app/report";
  const isDefectsTab = pathNorm === "/app/defects";
  const isMeasurementsTab = pathNorm === "/app/measurements";
  const isAdminTab = pathNorm === "/app/admin";
  const isOpsTab = pathNorm === "/app/ops";
  const isProfileTab = pathNorm === "/app/profile";
  const isDataPrivacyTab = pathNorm === "/app/data";

  const hasReportId = !!localStorage.getItem("vbf_last_report_id");

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
      <header className="z-50 flex h-[60px] shrink-0 items-center justify-between border-b border-white/[0.08] bg-[var(--bg-card)]/85 px-4 shadow-[var(--shadow-premium-sm)] backdrop-blur-xl backdrop-saturate-150">
        <nav className="flex h-full w-full items-center gap-6">
          <div className="flex h-full min-w-0 items-center gap-4">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2.5 text-lg font-semibold text-primary transition-opacity hover:opacity-90"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-sky-600 text-[11px] font-bold text-white shadow-[0_4px_14px_rgba(59,130,246,0.45)] ring-1 ring-white/20">
                VBF
              </span>
              <span className="hidden tracking-tight sm:inline">VBF Premium</span>
            </Link>

            <div className="ml-4 hidden h-full items-center space-x-0.5 md:flex">
              <Link
                to="/app/dashboard"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isDashboardTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Dashboard
              </Link>
              <Link
                to="/app/reports"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isReportsListTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Lista
              </Link>
              <Link
                to="/app/subscription"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isSubscriptionTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Előfizetés
              </Link>
              <Link
                to="/app/diagram"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isDiagramTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Rajz & Alaprajz
              </Link>
              <Link
                to="/app/report"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isReportTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Jegyzőkönyv adatok
              </Link>
              <Link
                to="/app/defects"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isDefectsTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Hibajegyzék & Képek
              </Link>
              <Link
                to="/app/measurements"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isMeasurementsTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Mérési adatok
              </Link>
              <Link
                to="/app/admin"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isAdminTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Cég / admin
              </Link>
              {showOpsNav && (
                <Link
                  to="/app/ops"
                  className={cn(
                    "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                    isOpsTab
                      ? "bg-amber-500/15 text-amber-200"
                      : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                  )}
                >
                  Ops
                </Link>
              )}
              <Link
                to="/app/profile"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isProfileTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Profil
              </Link>
              <Link
                to="/app/data"
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-all duration-200",
                  isDataPrivacyTab
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]"
                )}
              >
                Adatok
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => {
                clearSession();
                window.dispatchEvent(new Event("vbf-token-changed"));
                navigate("/");
              }}
              className="inline-flex min-h-11 items-center rounded-lg border border-transparent px-2 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:border-rose-500/35 hover:bg-rose-500/10 hover:text-rose-200 sm:px-3"
            >
              Kijelentkezés
            </button>
            <div className="w-px h-6 bg-[var(--border-color)] mx-0.5" />
            <button
              type="button"
              onClick={() => handleExport("word")}
              disabled={isSaving || locked}
              className="min-h-11 rounded-lg border border-sky-500/35 bg-sky-500/10 px-2 py-1.5 text-xs font-semibold text-sky-200 shadow-sm transition-colors hover:bg-sky-500/20 disabled:opacity-50 sm:px-3"
            >
              Word
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={isSaving}
              className="inline-flex min-h-11 min-w-[56px] items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs font-semibold text-red-200 shadow-sm transition-colors hover:bg-red-500/20 disabled:opacity-50 sm:min-w-[70px] sm:px-3"
            >
              PDF
            </button>

            <div className="w-px h-6 bg-[var(--border-color)] hidden sm:block mx-1" />

            {!locked && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isSaving || !hasReportId}
                className="min-h-11 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:opacity-50 sm:px-3"
                title="Zárolt jegyzőkönyv — csak PDF"
              >
                Véglegesítés
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || locked}
              className="min-h-11 min-w-[80px] rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_4px_18px_rgba(59,130,246,0.35)] transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-[0_6px_22px_rgba(59,130,246,0.45)] active:scale-[0.98] disabled:opacity-50 sm:min-w-[90px] sm:px-4"
            >
              {isSaving ? "…" : "Mentés"}
            </button>
          </div>
        </nav>
      </header>

      {isHydrating && (
        <div
          className="h-0.5 w-full shrink-0 bg-primary/20 overflow-hidden"
          role="progressbar"
          aria-busy="true"
          aria-label="Szinkronizálás a szerverrel"
        >
          <div className="h-full w-full bg-primary animate-pulse" />
        </div>
      )}

      {locked && (
        <div
          className="shrink-0 border-b border-amber-500/35 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100"
          role="status"
        >
          Ez a jegyzőkönyv <strong className="font-semibold">véglegesített</strong> — szerkesztés és Word export nem elérhető;
          PDF továbbra is letölthető.
        </div>
      )}

      <main
        aria-busy={isHydrating}
        className={cn("min-h-0 flex-1 flex overflow-hidden relative", !locked && "pb-[72px] md:pb-0")}
      >
        {children}
      </main>

      <footer
        className={cn(
          "flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/[0.08] bg-[var(--bg-card)]/90 px-3 py-2.5 text-[11px] text-[var(--text-muted)] shadow-[0_-4px_28px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 sm:text-xs",
          !locked && "pb-[max(5rem,env(safe-area-inset-bottom))] md:pb-2.5"
        )}
      >
        <Link to="/status" className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0">
          Állapot
        </Link>
        <span className="text-[var(--border-color)]" aria-hidden>
          |
        </span>
        <a href={legalUrls.terms} className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0">
          Feltételek
        </a>
        <span className="text-[var(--border-color)]" aria-hidden>
          |
        </span>
        <a href={legalUrls.aszf} className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0">
          ÁSZF
        </a>
        <span className="text-[var(--border-color)]" aria-hidden>
          |
        </span>
        <a href={legalUrls.privacy} className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0">
          Adatvédelem
        </a>
        <span className="text-[var(--border-color)]" aria-hidden>
          |
        </span>
        <a href={legalUrls.imprint} className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0">
          Impresszum
        </a>
        <span className="text-[var(--border-color)]" aria-hidden>
          |
        </span>
        <a href={legalUrls.legalNotice} className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0">
          Jogi
        </a>
        <span className="text-[var(--border-color)] hidden sm:inline" aria-hidden>
          |
        </span>
        <Link
          to="/app/reports"
          className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0 md:hidden"
        >
          Lista
        </Link>
        <span className="text-[var(--border-color)] md:hidden" aria-hidden>
          |
        </span>
        <Link
          to="/app/subscription"
          className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0 md:hidden"
        >
          Előfizetés
        </Link>
        <span className="text-[var(--border-color)] md:hidden" aria-hidden>
          |
        </span>
        <Link
          to="/app/dashboard"
          className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0 md:hidden"
        >
          Dashboard
        </Link>
        <span className="text-[var(--border-color)] md:hidden" aria-hidden>
          |
        </span>
        <Link
          to="/app/profile"
          className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0 md:hidden"
        >
          Profil
        </Link>
        <span className="text-[var(--border-color)] md:hidden" aria-hidden>
          |
        </span>
        <Link
          to="/app/data"
          className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0 md:hidden"
        >
          Adatok
        </Link>
        {showOpsNav && (
          <>
            <span className="text-[var(--border-color)] md:hidden" aria-hidden>
              |
            </span>
            <Link
              to="/app/ops"
              className="hover:text-amber-200 font-medium min-h-11 inline-flex items-center sm:min-h-0 md:hidden"
            >
              Ops
            </Link>
          </>
        )}
        <span className="text-[var(--border-color)] md:hidden" aria-hidden>
          |
        </span>
        <Link to="/" className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0">
          Főoldal
        </Link>
      </footer>

      {!locked && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex min-h-[56px] items-center justify-center gap-2 border-t border-white/[0.08] bg-[var(--bg-card)]/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="min-h-11 flex-1 rounded-lg bg-[var(--color-primary)] px-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(59,130,246,0.35)] transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.99] disabled:opacity-50"
          >
            Mentés
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={isSaving || !hasReportId}
            className="min-h-11 flex-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
          >
            Véglegesítés
          </button>
        </div>
      )}
    </div>
  );
}
