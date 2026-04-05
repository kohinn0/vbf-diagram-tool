import { type ReactNode, useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

// ── Inline SVG icons ────────────────────────────────────────────────────────

function IconDiagram() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <rect x="2" y="2" width="7" height="7" rx="1.2" />
      <rect x="11" y="2" width="7" height="7" rx="1.2" />
      <rect x="2" y="11" width="7" height="7" rx="1.2" />
      <path d="M14.5 11v2m0 4v-2m0 0h-2m2 0h2" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d="M4 4a1 1 0 0 1 1-1h7l4 4v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4z" />
      <path d="M11 3v4h4M7 9h6M7 12h6M7 15h4" />
    </svg>
  );
}

function IconDefects() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <path d="M10 2.5 2.5 16h15L10 2.5z" />
      <path d="M10 8.5v3.5" />
      <circle cx="10" cy="14.5" r=".75" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconMeasurements() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
      <polyline points="2,14 6,9 10,11 14,5 18,8" />
      <line x1="2" y1="17" x2="18" y2="17" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-5 h-5">
      <line x1="3" y1="5" x2="17" y2="5" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="13,4 7,10 13,16" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="7,4 13,10 7,16" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M3 5a2 2 0 0 1 2-2h8l4 4v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" />
      <path d="M7 3v4h7V3M7 13h6v4H7v-4z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <rect x="4" y="9" width="12" height="9" rx="1.5" />
      <path d="M7 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="10" cy="7" r="3" />
      <path d="M3 17c0-3.3 3.1-6 7-6s7 2.7 7 6" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M7 3H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3" />
      <polyline points="13,14 17,10 13,6" />
      <line x1="17" y1="10" x2="7" y2="10" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2v1.5M10 16.5V18M2 10h1.5M16.5 10H18M4.1 4.1l1.1 1.1M14.8 14.8l1.1 1.1M4.1 15.9l1.1-1.1M14.8 5.2l1.1-1.1" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M3 9.5L10 3l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M7 18v-6h6v6" />
    </svg>
  );
}

// ── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: "/app/diagram", label: "Rajz & Alaprajz", icon: <IconDiagram /> },
  { to: "/app/report", label: "Adatok", icon: <IconReport /> },
  { to: "/app/defects", label: "Hibajegyzék", icon: <IconDefects /> },
  { to: "/app/measurements", label: "Mérések", icon: <IconMeasurements /> },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/app/diagram": "Rajz & Alaprajz",
  "/app/report": "Adatok",
  "/app/defects": "Hibajegyzék & Képek",
  "/app/measurements": "Mérési adatok",
};

// ── Main Layout ──────────────────────────────────────────────────────────────

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [storageSync, setStorageSync] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("vbf_sidebar_collapsed") === "1"; } catch { return false; }
  });

  const reportData = useDraftStore((s) => s.reportData);
  const reportStatus = useDraftStore((s) => s.reportStatus);
  const locked = reportStatus === "FINAL";

  const pageTitle = PAGE_TITLES[location.pathname] ?? "VBF";

  // Derive display name / initials from stored email (set by login flow)
  const storedEmail = (() => { try { return localStorage.getItem("vbf_email") ?? ""; } catch { return ""; } })();
  const userInitials = storedEmail
    ? storedEmail.slice(0, 2).toUpperCase()
    : "VF";
  const userDisplayName = storedEmail || "Felhasználó";

  useEffect(() => {
    try { localStorage.setItem("vbf_sidebar_collapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

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
    if (!token || !id) { setIsHydrating(false); return; }
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
        if (!serverUnchanged) toast.success("Jegyzőkönyv szinkronizálva a szerverrel.");
      } catch (e: unknown) {
        if (cancelled) return;
        const status = typeof e === "object" && e !== null && "status" in e
          ? (e as { status: number }).status : undefined;
        if (status === 401 || status === 403) {
          toast.error("Bejelentkezés lejárt vagy nincs jogosultság — a helyi piszkozat megmaradt.");
          return;
        }
        if (status === 404) { toast.error("A jegyzőkönyv már nem elérhető a szerveren."); return; }
        if (isLikelyNetworkError(e)) {
          toast.error("Nem sikerült kapcsolódni a szerverhez — a piszkozat helyben maradt.");
          return;
        }
        toast.error("Szinkronizálás sikertelen — a piszkozat helyben maradt.");
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storageSync]);

  // Click-outside → close user menu
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    try {
      localStorage.removeItem("vbf_token");
      localStorage.removeItem("vbf_last_report_id");
      localStorage.removeItem("vbf_email");
    } catch { /* ignore */ }
    toast.success("Kijelentkeztél.");
    navigate("/");
  };

  const handleSave = async () => {
    const errs = validateForSave(reportData);
    if (errs.length) { toast.error(errs.join(" ")); return; }
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
      toast.error("Mentés sikertelen: " + (e instanceof Error ? e.message : "Ismeretlen hiba"));
    } finally { setIsSaving(false); }
  };

  const handleExport = async (type: "pdf" | "word") => {
    const reportId = localStorage.getItem("vbf_last_report_id");
    if (!reportId) { toast.error("Előbb mentsd el a jegyzőkönyvet a felhőbe."); return; }
    if (type === "word" && locked) { toast.error("Véglegesített jegyzőkönyvhöz csak PDF exportálható."); return; }
    const errs = validateForExport(reportData);
    if (errs.length) { toast.error(errs.join(" ")); return; }
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
      toast.error(e instanceof Error ? e.message : "Export hiba");
    } finally { setIsSaving(false); }
  };

  const handleFinalize = async () => {
    const reportId = localStorage.getItem("vbf_last_report_id");
    if (!reportId) { toast.error("Előbb mentsd el a jegyzőkönyvet."); return; }
    const errs = validateForFinalize(reportData);
    if (errs.length) { toast.error(errs.join(" ")); return; }
    if (!window.confirm("Véglegesíted a jegyzőkönyvet? Utána nem szerkeszthető, csak PDF export és megosztás.")) return;
    setIsSaving(true);
    try {
      const data = await finalizeReport(reportId);
      applyServerReportToDraft(data as ServerReport);
      toast.success("Jegyzőkönyv véglegesítve.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Véglegesítés hiba");
    } finally { setIsSaving(false); }
  };

  const hasReportId = !!localStorage.getItem("vbf_last_report_id");

  // ── Sidebar content (shared between desktop + mobile drawer) ──────────────
  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-3 h-14 border-b border-[var(--border-color)] shrink-0",
        collapsed && "justify-center px-0"
      )}>
        <Link
          to="/"
          className="flex items-center gap-2.5 min-w-0 group"
          title="VBF Premium – Főoldal"
        >
          <span className="w-7 h-7 bg-primary rounded-md flex items-center justify-center text-white text-[11px] font-bold shrink-0 group-hover:bg-primary-hover transition-colors">
            VBF
          </span>
          {!collapsed && (
            <span className="font-semibold text-sm text-[var(--text-main)] truncate">
              VBF Premium
            </span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            Munkaterület
          </p>
        )}
        {NAV_ITEMS.map(({ to, label, icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavClick}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors min-h-[36px]",
                collapsed && "justify-center px-2",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]"
              )}
            >
              <span className={cn(active ? "text-primary" : "text-[var(--text-muted)]")}>
                {icon}
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: legal + user stub */}
      <div className={cn(
        "shrink-0 border-t border-[var(--border-color)] px-2 py-3 space-y-1"
      )}>
        {!collapsed && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-2 pb-2">
            {[
              ["Feltételek", legalUrls.terms],
              ["ÁSZF", legalUrls.aszf],
              ["Adatvédelem", legalUrls.privacy],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-[var(--bg-input)] transition-colors cursor-default",
            collapsed && "justify-center px-0"
          )}
          title="Felhasználói fiók"
        >
          <span className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <IconUser />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text-main)] truncate">Fiók</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">Premium</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden">

      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-[var(--bg-card)] border-r border-[var(--border-color)] shrink-0 transition-all duration-200 relative",
          collapsed ? "w-14" : "w-52"
        )}
      >
        <SidebarContent />

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-[52px] z-10 w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-input)] transition-colors shadow-sm"
          title={collapsed ? "Sidebar kinyitása" : "Sidebar összecsukása"}
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </aside>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-64 bg-[var(--bg-card)] border-r border-[var(--border-color)] flex flex-col h-full z-10">
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* TopBar */}
        <header className="h-14 flex items-center gap-3 px-4 bg-[var(--bg-card)] border-b border-[var(--border-color)] shrink-0 z-40">
          {/* Hamburger (mobile) */}
          <button
            type="button"
            className="md:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-main)] transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Menü megnyitása"
          >
            <IconMenu />
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-[var(--text-main)] truncate">{pageTitle}</h1>
            {locked && (
              <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                Véglegesített
              </span>
            )}
          </div>

          {/* Sync progress indicator */}
          {isHydrating && (
            <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline animate-pulse">
              Szinkronizálás…
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleExport("word")}
              disabled={isSaving || locked}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border-color)] text-[var(--text-muted)] hover:border-blue-400 hover:text-blue-400 transition-colors disabled:opacity-40 hidden sm:flex items-center gap-1.5"
              title="Word export"
            >
              Word
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={isSaving}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border-color)] text-[var(--text-muted)] hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-40 flex items-center gap-1.5"
              title="PDF export"
            >
              PDF
            </button>

            <div className="w-px h-5 bg-[var(--border-color)] mx-0.5 hidden sm:block" />

            {!locked && (
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isSaving || !hasReportId}
                className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-[var(--border-color)] text-[var(--text-muted)] hover:border-amber-400 hover:text-amber-400 transition-colors disabled:opacity-40 hidden sm:flex items-center gap-1.5"
                title="Véglegesítés"
              >
                <IconLock />
                <span className="hidden lg:inline">Véglegesítés</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || locked}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 flex items-center gap-1.5 min-w-[80px] justify-center"
            >
              <IconSave />
              <span>{isSaving ? "…" : "Mentés"}</span>
            </button>

            {/* Avatar + user menu */}
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0",
                  "bg-primary/20 text-primary hover:bg-primary/30",
                  userMenuOpen && "ring-2 ring-primary/50"
                )}
                aria-label="Felhasználói menü"
                aria-expanded={userMenuOpen}
              >
                {userInitials}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg z-50 overflow-hidden">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {userInitials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-main)] truncate">{userDisplayName}</p>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/15 text-primary mt-0.5">
                          Premium
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-input)] transition-colors disabled:opacity-40 cursor-not-allowed"
                    >
                      <IconSettings />
                      <span>Beállítások</span>
                      <span className="ml-auto text-[10px] opacity-60">Hamarosan</span>
                    </button>
                    <Link
                      to="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-main)] transition-colors"
                    >
                      <IconHome />
                      <span>Főoldal</span>
                    </Link>
                  </div>

                  <div className="border-t border-[var(--border-color)] py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <IconLogout />
                      <span>Kijelentkezés</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Sync progress bar */}
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

        {/* Locked banner */}
        {locked && (
          <div
            className="shrink-0 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs text-center"
            role="status"
          >
            Ez a jegyzőkönyv <strong>véglegesített</strong> — szerkesztés és Word export nem elérhető.
          </div>
        )}

        {/* Page content */}
        <main
          aria-busy={isHydrating}
          className="flex-1 overflow-hidden relative"
        >
          {children}
        </main>

        {/* Mobile bottom action bar */}
        {!locked && (
          <div className="md:hidden shrink-0 flex gap-2 px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-card)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 min-h-10 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <IconSave />
              Mentés
            </button>
            <button
              type="button"
              onClick={() => handleExport("pdf")}
              disabled={isSaving}
              className="flex-1 min-h-10 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] text-sm font-semibold disabled:opacity-50"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              disabled={isSaving || !hasReportId}
              className="flex-1 min-h-10 rounded-lg border border-amber-300 text-amber-700 text-sm font-semibold disabled:opacity-50"
            >
              Zárás
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
