import { useEffect, useState } from "react";
import { legalUrls } from "../../lib/legalUrls";

const STORAGE_KEY = "vbf_cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = (choice: "essential" | "all") => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ v: 1, choice, at: Date.now() })
      );
    } catch {
      /* private mode / quota */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-white/[0.1] bg-[var(--color-bg-card)]/92 shadow-[0_-12px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4 sm:flex-row sm:items-end sm:gap-6 sm:p-5">
        <div className="min-w-0 flex-1">
          <h2
            id="cookie-consent-title"
            className="mb-1 text-base font-semibold text-[var(--color-text-main)]"
          >
            Sütik és helyi tárolás
          </h2>
          <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
            A bejelentkezéshez és a piszkozat szinkronhoz a böngésző helyi tárolóját használjuk (munkamenet,
            jegyzőkönyv-azonosító). Harmadik féltől származó marketingkövetőt nem helyezünk el. Részletek:{" "}
            <a
              href={legalUrls.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline"
            >
              adatvédelmi tájékoztató
            </a>
            .
          </p>
        </div>
        <div className="flex w-full flex-shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => dismiss("essential")}
            className="min-h-11 rounded-lg border border-[var(--border-color)] px-4 font-semibold text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-bg-input)]"
          >
            Csak szükséges
          </button>
          <button
            type="button"
            onClick={() => dismiss("all")}
            className="min-h-11 rounded-lg bg-[var(--color-primary)] px-4 font-semibold text-white shadow-[0_4px_18px_rgba(59,130,246,0.35)] transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.99]"
          >
            Elfogadom
          </button>
        </div>
      </div>
    </div>
  );
}
