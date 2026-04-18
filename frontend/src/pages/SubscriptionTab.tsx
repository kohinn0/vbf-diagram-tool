import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import {
  fetchCurrentUser,
  fetchUsage,
  fetchPublicPlans,
  fetchCardPaymentsEnabled,
  type CurrentUserDto,
  type UsageDto,
  type SubscriptionPlanPublicDto,
} from "../lib/api";
import { toast } from "../lib/toast";
import { SignedOutCallout } from "../components/ui/SignedOutCallout";
import { PageHeader } from "../components/ui/PageHeader";
import { vbf } from "../lib/vbfUi";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("hu-HU", {
      dateStyle: "long",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

export default function SubscriptionTab() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const [usage, setUsage] = useState<UsageDto | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlanPublicDto[]>([]);
  const [cardPay, setCardPay] = useState<boolean | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("vbf_token")) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [u, us, pl, cp] = await Promise.all([
          fetchCurrentUser(),
          fetchUsage().catch(() => null),
          fetchPublicPlans().catch(() => []),
          fetchCardPaymentsEnabled().catch(() => false),
        ]);
        if (cancelled) return;
        setUser(u);
        setUsage(us);
        setPlans(pl);
        setCardPay(cp);
      } catch (e: unknown) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Betöltés hiba");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!localStorage.getItem("vbf_token")) {
    return <SignedOutCallout featureLabel="az előfizetés és a csomag adatok" />;
  }

  if (loading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)] space-y-4 max-w-3xl">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const currentKey = (user?.company_plan || usage?.plan || "FREE").toUpperCase();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <PageHeader
        eyebrow="Licenc"
        title="Előfizetés és csomag"
        description="Aktuális jogosultság, kihasználtság és nyilvános csomaglista. Vásárlás és utalás a főoldalon (árazás, kosár)."
      />

      {user && (
        <div className="grid gap-6 max-w-3xl mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Jelenlegi állapot</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>
                <span className="text-[var(--color-text-muted)]">Aktív csomag (cég):</span>{" "}
                <strong className="text-lg text-primary">{currentKey}</strong>
              </p>
              <p>
                <span className="text-[var(--color-text-muted)]">Előfizetés lejárata (ha van):</span>{" "}
                {formatDate(user.subscription_expires)}
              </p>
              {user.pdf_export_watermarked && (
                <p className={`rounded-lg px-3 py-2 text-xs ${vbf.surfaceWarning}`}>
                  A PDF export jelenleg vízjeles (demó / korlátozott csomag).
                </p>
              )}
            </CardContent>
          </Card>

          {usage && (
            <Card>
              <CardHeader>
                <CardTitle>Kihasználtság (e hónap / limitek)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>
                  Jegyzőkönyvek:{" "}
                  <strong>
                    {usage.reports_this_month}
                    {usage.reports_limit != null ? ` / ${usage.reports_limit}` : " (korlátlan)"}
                  </strong>
                </p>
                <p>
                  Felhasználók a cégnél:{" "}
                  <strong>
                    {usage.users_count}
                    {usage.users_limit != null ? ` / ${usage.users_limit}` : ""}
                  </strong>
                </p>
                {usage.reports_limit != null && usage.reports_this_month >= usage.reports_limit && (
                  <p className={`rounded-lg px-3 py-2 text-xs ${vbf.surfaceDanger}`}>
                    Elérted a havi jegyzőkönyv limitet — frissíts csomagot vagy várd meg a következő hónapot.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Vásárlás és fizetés</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="text-[var(--color-text-muted)]">
                Új előfizetés, csomagváltás és utalásos megrendelés a{" "}
                <strong>főoldali árazáson és kosáron</strong> keresztül történik.
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Bankkártya (Stripe):{" "}
                {cardPay === true
                  ? "engedélyezve a környezetben — a kosárban elérhető lehet."
                  : "jelenleg kikapcsolva vagy nem konfigurált — elsősorban utalás."}
              </p>
              <Link
                to="/#pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow hover:opacity-95 w-full sm:w-auto"
              >
                Ugrás az árazáshoz és vásárláshoz
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-4xl">
        <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-3">Nyilvános csomagok (referencia)</h2>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">
          Adatok a szerverről (`GET /api/plans`). A pontos szerződésfeltételek az ÁSZF-ben.
        </p>
        {plans.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Nincs betölthető csomaglista.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--color-bg-card)]">
            <table className="w-full min-w-[640px] text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)]/50">
                  <th className="px-3 py-2 font-semibold">Csomag</th>
                  <th className="px-3 py-2 font-semibold">Havi (Ft)</th>
                  <th className="px-3 py-2 font-semibold">Éves (Ft)</th>
                  <th className="px-3 py-2 font-semibold">Riport / hó</th>
                  <th className="px-3 py-2 font-semibold">Max. user</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => {
                  const active = p.plan_key.toUpperCase() === currentKey;
                  return (
                    <tr
                      key={p.plan_key}
                      className={
                        active
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "border-b border-[var(--border-color)] last:border-0"
                      }
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-[var(--color-text-main)]">{p.display_name}</span>
                        <span className="block text-xs text-[var(--color-text-muted)]">{p.plan_key}</span>
                        {active && (
                          <span className="mt-1 inline-block text-xs font-semibold text-primary">← jelenlegi</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">{p.price_monthly != null ? `${p.price_monthly.toLocaleString("hu-HU")}` : "—"}</td>
                      <td className="px-3 py-2.5">{p.price_yearly != null ? `${p.price_yearly.toLocaleString("hu-HU")}` : "—"}</td>
                      <td className="px-3 py-2.5">{p.reports_per_month_limit ?? "—"}</td>
                      <td className="px-3 py-2.5">{p.max_users ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {plans.some((p) => (p.features?.length ?? 0) > 0) && (
          <div className="mt-6 space-y-4">
            {plans.map(
              (p) =>
                p.features &&
                p.features.length > 0 && (
                  <div key={`f-${p.plan_key}`} className="rounded-lg border border-[var(--border-color)] p-4 bg-[var(--color-bg-card)]">
                    <p className="font-semibold text-[var(--color-text-main)] mb-2">{p.display_name}</p>
                    <ul className="list-disc list-inside text-sm text-[var(--color-text-muted)] space-y-1">
                      {p.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
