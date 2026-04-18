import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../lib/apiBaseUrl";
import { fetchHealth } from "../lib/api";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";

/**
 * Nyilvános „status page” — a backend `/health` (adatbázis elérhetőség) megjelenítése.
 * Nem helyettesíti a külső monitoringot (Prometheus, uptime robot), de felhasználóknak átlátható jelzés.
 */
export default function StatusPage() {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchHealth();
      setOk(r.ok);
      setLatencyMs(r.latencyMs);
      setDetail(r.body.detail ?? null);
      setCheckedAt(new Date().toLocaleString("hu-HU"));
      if (!r.ok) {
        setError(r.body.detail || "A szolgáltatás átmenetileg nem elérhető.");
      }
    } catch (e: unknown) {
      setOk(false);
      setLatencyMs(null);
      setDetail(null);
      setCheckedAt(new Date().toLocaleString("hu-HU"));
      setError(
        e instanceof Error
          ? e.message
          : "Hálózati hiba — nem sikerült elérni az API-t (CORS, DNS vagy a szerver nem fut)."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col">
      <header className="border-b border-white/[0.08] bg-[var(--bg-card)]/85 px-4 py-4 shadow-[var(--shadow-premium-sm)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-primary transition-colors hover:underline">
            ← VBF Premium főoldal
          </Link>
          <Link to="/app/dashboard" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-primary">
            Alkalmazás
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <PageHeader
            eyebrow="Állapot"
            title="Rendszer állapot"
            description={
              <>
                Az API <code className="rounded bg-[var(--color-bg-input)] px-1 text-xs">{API_BASE_URL}/health</code>{" "}
                végpontja ellenőrzi, hogy az adatbázis elérhető-e. Nem fed le minden alrendszert (e-mail, Stripe, stb.).
              </>
            }
          />

          <div
            className={`mb-6 rounded-2xl border p-6 shadow-[var(--shadow-premium-sm)] ring-1 ring-white/[0.04] ${
              loading
                ? "border-[var(--border-color)] bg-[var(--color-bg-card)] text-[var(--text-main)]"
                : ok
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-100"
            }`}
            role="status"
            aria-live="polite"
          >
            {loading ? (
              <p className="font-medium">Ellenőrzés folyamatban…</p>
            ) : (
              <>
                <p className="text-lg font-bold mb-2">
                  {ok ? "Minden rendben (adatbázis OK)" : "Probléma van vagy nem elérhető az API"}
                </p>
                {latencyMs != null && (
                  <p className="text-sm opacity-90 mb-1">
                    Válaszidő: <strong>{latencyMs} ms</strong>
                  </p>
                )}
                {detail && <p className="text-sm mt-2 font-mono break-all">{detail}</p>}
                {error && <p className="text-sm mt-2">{error}</p>}
                {checkedAt && (
                  <p className="text-xs mt-4 opacity-80">Utolsó ellenőrzés: {checkedAt}</p>
                )}
              </>
            )}
          </div>

          <Button type="button" variant="secondary" className="min-h-11 mb-8 border border-[var(--border-color)]" onClick={() => runCheck()} disabled={loading}>
            Frissítés
          </Button>

          <div className="text-sm text-[var(--text-muted)] space-y-3 border-t border-[var(--border-color)] pt-8">
            <p>
              <strong className="text-[var(--text-main)]">Üzemeltetőknek:</strong> a konténer / orchestrator healthcheckje
              ugyanezt a végpontot használhatja. Részletek: <code className="text-xs">ELESITES.md</code> a repóban.
            </p>
            <p>
              Sentry / napló aggregáció: állítsd be a <code className="text-xs">SENTRY_DSN</code> környezeti változót a
              backendhez (ha támogatott a buildben).
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
