import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

type PageHeaderProps = {
  /** Rövid, nagybetűs címke (pl. „Fiók”, „Vezérlőpult”) */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8 max-w-3xl", className)}>
      {eyebrow ? (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/75">{eyebrow}</p>
      ) : null}
      <h1 className="text-balance text-2xl font-semibold tracking-tight text-[var(--color-text-main)] sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">{description}</p>
      ) : null}
    </header>
  );
}
