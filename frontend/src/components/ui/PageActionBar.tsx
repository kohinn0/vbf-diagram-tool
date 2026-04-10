/**
 * PageActionBar — sticky sub-header used by each app page for
 * page-specific actions (save, export, finalize, etc.).
 */
import { type ReactNode } from "react";
import { useAppActions } from "../../lib/appActionsContext";
import { cn } from "../../lib/utils";

// ── Inline icons ────────────────────────────────────────────────────────────

function IconSave() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <path d="M3 5a2 2 0 0 1 2-2h8l4 4v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z" />
      <path d="M7 3v4h7V3M7 13h6v4H7v-4z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
      <rect x="4" y="9" width="12" height="9" rx="1.5" />
      <path d="M7 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface PageActionBarProps {
  /** Left side: page title + optional description */
  title: string;
  description?: string;
  /** Extra buttons rendered between description and save actions */
  children?: ReactNode;
  /** Hide the global save/export/finalize buttons (e.g. DiagramTab) */
  hideSaveActions?: boolean;
}

export function PageActionBar({ title, description, children, hideSaveActions }: PageActionBarProps) {
  const { isSaving, locked, hasReportId, handleSave, handleExport, handleFinalize } = useAppActions();

  return (
    <div className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-3 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-[var(--text-main)] truncate">{title}</h2>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{description}</p>
        )}
      </div>

      {/* Slot for page-specific extra buttons */}
      {children && <div className="flex items-center gap-2">{children}</div>}

      {/* Global save / export / finalize */}
      {!hideSaveActions && (
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
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors disabled:opacity-40",
              "bg-primary text-white hover:bg-primary-hover flex items-center gap-1.5 min-w-[76px] justify-center"
            )}
          >
            <IconSave />
            <span>{isSaving ? "…" : "Mentés"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
