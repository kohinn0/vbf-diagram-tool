import { type ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import { useDraftStore } from "../../store/draftStore";
import {
  saveReportToCloud,
  finalizeReport,
  fetchReportById,
  exportPdf,
  exportWord,
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
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  /** Másik fülön változott token / jegyzőkönyv ID → újrahydrate */
  const [storageSync, setStorageSync] = useState(0);
  const reportData = useDraftStore((s) => s.reportData);
  const reportStatus = useDraftStore((s) => s.reportStatus);
  const locked = reportStatus === "FINAL";

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "vbf_last_report_id" || e.key === "vbf_token") {
        setStorageSync((n) => n + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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

  const isDiagramTab = location.pathname.includes("/diagram");
  const isReportTab = location.pathname.includes("/report");
  const isDefectsTab = location.pathname.includes("/defects");
  const isMeasurementsTab = location.pathname.includes("/measurements");

  const hasReportId = !!localStorage.getItem("vbf_last_report_id");

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden">
      <header className="h-[60px] flex items-center justify-between px-4 bg-[var(--bg-card)] border-b border-[var(--border-color)] shrink-0 z-50">
        <nav className="flex items-center gap-6 w-full h-full">
          <div className="flex items-center h-full gap-4 min-w-0">
            <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg hover:opacity-80 transition-opacity shrink-0">
              <span className="w-7 h-7 bg-primary rounded shadow-sm flex items-center justify-center text-white text-xs">VBF</span>
              <span className="hidden sm:inline">VBF Premium</span>
            </Link>

            <div className="hidden md:flex items-center h-full ml-6 space-x-1">
              <Link
                to="/app/diagram"
                className={cn(
                  "h-full px-4 flex items-center text-sm font-medium border-b-2 transition-colors",
                  isDiagramTab
                    ? "border-primary text-primary"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)]"
                )}
              >
                Rajz & Alaprajz
              </Link>
              <Link
                to="/app/report"
                className={cn(
                  "h-full px-4 flex items-center text-sm font-medium border-b-2 transition-colors",
                  isReportTab
                    ? "border-primary text-primary"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)]"
                )}
              >
                Jegyzőkönyv adatok
              </Link>
              <Link
                to="/app/defects"
                className={cn(
                  "h-full px-4 flex items-center text-sm font-medium border-b-2 transition-colors",
                  isDefectsTab
                    ? "border-primary text-primary"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)]"
                )}
              >
                Hibajegyzék & Képek
              </Link>
              <Link
                to="/app/measurements"
                className={cn(
                  "h-full px-4 flex items-center text-sm font-medium border-b-2 transition-colors",
                  isMeasurementsTab
                    ? "border-primary text-primary"
                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)]"
                )}
              >
                Mérési adatok
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => handleExport("word")}
              disabled={isSaving || locked}
              className="px-2 sm:px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded shadow hover:bg-blue-100 transition-colors disabled:opacity-50 min-h-11"
            >
              📄 Word
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={isSaving}
              className="px-2 sm:px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded shadow hover:bg-red-100 transition-colors disabled:opacity-50 inline-flex items-center justify-center min-w-[56px] sm:min-w-[70px] border border-red-200 min-h-11"
            >
              PDF
            </button>

            <div className="w-px h-6 bg-[var(--border-color)] hidden sm:block mx-1" />

            {!locked && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isSaving || !hasReportId}
                className="px-2 sm:px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-900 rounded border border-amber-200 hover:bg-amber-100 disabled:opacity-50 min-h-11"
                title="Zárolt jegyzőkönyv — csak PDF"
              >
                Véglegesítés
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || locked}
              className="px-3 sm:px-4 py-1.5 text-xs font-semibold bg-primary text-white rounded shadow hover:bg-primary-hover transition-colors disabled:opacity-50 min-w-[80px] sm:min-w-[90px] min-h-11"
            >
              {isSaving ? "…" : "Mentés ☁️"}
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
          className="shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-950 text-sm text-center"
          role="status"
        >
          Ez a jegyzőkönyv <strong>véglegesített</strong> — szerkesztés és Word export nem elérhető; PDF továbbra is letölthető.
        </div>
      )}

      <main
        aria-busy={isHydrating}
        className={cn("flex-1 flex overflow-hidden relative", !locked && "pb-[72px] md:pb-0")}
      >
        {children}
      </main>

      <footer
        className={cn(
          "shrink-0 border-t border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2.5 text-[11px] sm:text-xs text-[var(--text-muted)] flex flex-wrap items-center justify-center gap-x-4 gap-y-1",
          !locked && "pb-[max(5rem,env(safe-area-inset-bottom))] md:pb-2.5"
        )}
      >
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
        <Link to="/" className="hover:text-primary font-medium min-h-11 inline-flex items-center sm:min-h-0">
          Főoldal
        </Link>
      </footer>

      {!locked && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex gap-2 p-2 border-t border-[var(--border-color)] bg-[var(--bg-card)] min-h-[56px] items-center justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 min-h-11 rounded-lg bg-primary text-white text-sm font-semibold px-3 disabled:opacity-50"
          >
            Mentés
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={isSaving || !hasReportId}
            className="flex-1 min-h-11 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 text-sm font-semibold px-3 disabled:opacity-50"
          >
            Véglegesítés
          </button>
        </div>
      )}
    </div>
  );
}
