import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  /** Kötelező csillag a címkénél */
  requiredMark?: boolean;
};

/**
 * Mező címke + opcionális hibaüzenet (rose) — a gyerek input/select kapjon `id={htmlFor}`-et.
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
  requiredMark,
}: FormFieldProps) {
  const hasErr = Boolean(error?.trim());

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-[var(--color-text-muted-strong)]"
      >
        {label}
        {requiredMark ? <span className="text-rose-600"> *</span> : null}
      </label>
      {hint ? <p className="text-xs text-[var(--color-text-muted)]">{hint}</p> : null}
      <div
        className={cn(
          "rounded-[var(--radius-vbf)] transition-shadow",
          hasErr && "ring-2 ring-rose-500/80 ring-offset-1 ring-offset-[var(--bg-main)]"
        )}
      >
        {children}
      </div>
      {hasErr ? (
        <p className="text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
