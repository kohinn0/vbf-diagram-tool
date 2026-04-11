import { Link } from "react-router-dom";

type SignedOutCalloutProps = {
  /** pl. „a dashboard”, „a jegyzőkönyvek listája” */
  featureLabel: string;
};

export function SignedOutCallout({ featureLabel }: SignedOutCalloutProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-main)]">
      <div className="mx-auto flex min-h-[min(70vh,36rem)] max-w-lg flex-col justify-center px-[var(--vbf-panel-padding)] py-10">
        <div className="rounded-[var(--radius-vbf)] border border-[var(--border-color)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-premium-sm)] ring-1 ring-white/[0.06] sm:p-8">
          <div
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text-main)]">
            Bejelentkezés szükséges
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            A(z) <span className="font-medium text-[var(--color-text-main)]">{featureLabel}</span> eléréséhez lépj be a
            főoldalon — ugyanazzal a fiókkal éred el a felhőmentést és az exportot.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-vbf)] bg-[var(--color-primary)] px-5 font-semibold text-white shadow-[0_4px_22px_rgba(59,130,246,0.4)] transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-[0_6px_28px_rgba(59,130,246,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.99]"
            >
              Bejelentkezés a főoldalon
            </Link>
            <Link
              to="/status"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-vbf)] border border-[var(--border-color)] bg-transparent px-5 font-semibold text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-bg-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Rendszer állapot
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
