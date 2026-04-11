/**
 * Egységes felületi tokenek — sötét téma, VBF Premium (Tailwind utility stringek).
 * Banner, badge, inline figyelmeztetés: ugyanaz a minta mindenhol.
 */
export const vbf = {
  surfaceSuccess: "border border-emerald-500/35 bg-emerald-500/10 text-emerald-100",
  surfaceWarning: "border border-amber-500/35 bg-amber-500/10 text-amber-100",
  surfaceDanger: "border border-rose-500/35 bg-rose-500/10 text-rose-100",
  badgeFinal:
    "inline-flex rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-200",
  badgeDraft:
    "inline-flex rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-100",
  btnDangerOutline:
    "min-h-11 border-rose-500/40 bg-rose-500/5 text-rose-200 hover:bg-rose-500/15 hover:border-rose-500/50",
} as const;

/** Sonner — sötét, a kártyákhoz illeszkedő toast hátterek */
export const vbfToast = {
  success:
    "border border-emerald-500/40 bg-emerald-950/92 text-emerald-50 shadow-lg backdrop-blur-sm",
  error: "border border-rose-500/40 bg-rose-950/92 text-rose-50 shadow-lg backdrop-blur-sm",
  neutral:
    "border border-[var(--border-color)] bg-[var(--color-bg-card)] text-[var(--color-text-main)] shadow-xl",
} as const;
