import { cn } from "../../lib/utils";

type SkeletonProps = {
  className?: string;
  /** Szöveghelyettesítő képernyőolvasóknak */
  label?: string;
};

/** Egysoros / blokk betöltési helyőrző — Tailwind animate-pulse */
export function Skeleton({ className, label = "Betöltés" }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--border-color)]/60", className)}
      role="status"
      aria-busy="true"
      aria-label={label}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} role="status" aria-busy="true" aria-label="Betöltés">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 w-full animate-pulse rounded-md bg-[var(--border-color)]/60" aria-hidden />
      ))}
    </div>
  );
}
