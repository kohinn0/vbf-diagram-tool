import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { fetchReports, fetchReportById, type ReportSummaryDto } from "../lib/api";
import { applyServerReportToDraft } from "../lib/hydrateReport";
import { toast } from "../lib/toast";
import { Skeleton } from "../components/ui/Skeleton";
import { SignedOutCallout } from "../components/ui/SignedOutCallout";
import { PageHeader } from "../components/ui/PageHeader";
import { vbf } from "../lib/vbfUi";

const PAGE_LIMIT = 400;

type StatusFilter = "all" | "DRAFT" | "FINAL";
type SortKey = "updated_desc" | "updated_asc" | "created_desc" | "title_asc";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("hu-HU", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function normalizeType(t: string) {
  return (t || "").trim() || "—";
}

export default function ReportsListTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<ReportSummaryDto[]>([]);
  const [openingId, setOpeningId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");

  useEffect(() => {
    if (!localStorage.getItem("vbf_token")) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchReports(PAGE_LIMIT, 0)
      .then((list) => {
        if (!cancelled) setRaw(list);
      })
      .catch(() => {
        if (!cancelled) toast.error("Lista betöltése sikertelen.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const typeOptions = useMemo(() => {
    const s = new Set<string>();
    raw.forEach((r) => {
      const t = normalizeType(r.report_type);
      if (t !== "—") s.add(r.report_type.trim());
    });
    return [...s].sort((a, b) => a.localeCompare(b, "hu"));
  }, [raw]);

  const filtered = useMemo(() => {
    let list = [...raw];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => (r.title || "").toLowerCase().includes(q) || String(r.id).includes(q));
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter((r) => r.report_type.trim() === typeFilter);
    }
    const cmp = (a: ReportSummaryDto, b: ReportSummaryDto) => {
      switch (sortKey) {
        case "updated_asc":
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case "created_desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "title_asc":
          return (a.title || "").localeCompare(b.title || "", "hu");
        case "updated_desc":
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    };
    list.sort(cmp);
    return list;
  }, [raw, search, statusFilter, typeFilter, sortKey]);

  const openReport = async (id: number) => {
    setOpeningId(id);
    try {
      const r = await fetchReportById(String(id));
      applyServerReportToDraft(r);
      localStorage.setItem("vbf_last_report_id", String(id));
      window.dispatchEvent(new Event("vbf-report-id-changed"));
      navigate("/app/report");
      toast.success("Jegyzőkönyv betöltve.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Betöltés sikertelen.");
    } finally {
      setOpeningId(null);
    }
  };

  if (!localStorage.getItem("vbf_token")) {
    return <SignedOutCallout featureLabel="a jegyzőkönyvek listája" />;
  }

  return (
    <div className="min-h-0 flex-1 flex flex-col overflow-hidden bg-[var(--bg-main)]">
      <div className="shrink-0 p-[var(--vbf-panel-padding)] pb-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
        <PageHeader
          eyebrow="Dokumentumok"
          title="Jegyzőkönyvek"
          description={`Szűrés és rendezés a betöltött riportokon (max. ${PAGE_LIMIT} db egy lekérésben). Finomabb szerveroldali szűrés később bővíthető.`}
          className="mb-4"
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-semibold text-[var(--color-text-muted-strong)] mb-1 block">Keresés (cím vagy ID)</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pl. VBF vagy 42"
              className="min-h-11 w-full"
              disabled={loading}
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[160px]">
            <label className="text-xs font-semibold text-[var(--color-text-muted-strong)] mb-1 block">Státusz</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="min-h-11 w-full"
              disabled={loading}
            >
              <option value="all">Mind</option>
              <option value="DRAFT">Piszkozat</option>
              <option value="FINAL">Véglegesített</option>
            </Select>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[180px]">
            <label className="text-xs font-semibold text-[var(--color-text-muted-strong)] mb-1 block">Típus</label>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="min-h-11 w-full"
              disabled={loading}
            >
              <option value="all">Mind</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[200px]">
            <label className="text-xs font-semibold text-[var(--color-text-muted-strong)] mb-1 block">Rendezés</label>
            <Select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="min-h-11 w-full"
              disabled={loading}
            >
              <option value="updated_desc">Módosítva (újabb elöl)</option>
              <option value="updated_asc">Módosítva (régebbi elöl)</option>
              <option value="created_desc">Létrehozva (újabb elöl)</option>
              <option value="title_asc">Cím A–Z</option>
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto border border-[var(--border-color)]"
            disabled={loading}
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setTypeFilter("all");
              setSortKey("updated_desc");
            }}
          >
            Szűrők törlése
          </Button>
        </div>

        {!loading && (
          <p className="text-xs text-[var(--color-text-muted)] mt-3">
            Találat: <strong className="text-[var(--color-text-main)]">{filtered.length}</strong> / {raw.length} betöltött
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] pt-4">
        {loading ? (
          <div className="space-y-2 max-w-5xl">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Nincs megjeleníthető jegyzőkönyv a szűrők szerint.</p>
        ) : (
          <div className="max-w-5xl overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--color-bg-card)]">
            <table className="w-full min-w-[640px] text-sm text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)]/50">
                  <th className="px-3 py-2 font-semibold text-[var(--color-text-main)]">Cím</th>
                  <th className="px-3 py-2 font-semibold text-[var(--color-text-main)] w-[100px]">Típus</th>
                  <th className="px-3 py-2 font-semibold text-[var(--color-text-main)] w-[110px]">Státusz</th>
                  <th className="px-3 py-2 font-semibold text-[var(--color-text-main)] w-[160px]">Módosítva</th>
                  <th className="px-3 py-2 font-semibold text-[var(--color-text-main)] w-[100px] text-right">Művelet</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--color-bg-input)]/40">
                    <td className="px-3 py-2.5 font-medium text-[var(--color-text-main)]">
                      {r.title?.trim() || `Jegyzőkönyv #${r.id}`}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--color-text-muted)] text-xs uppercase">{normalizeType(r.report_type)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          r.status === "FINAL"
                            ? vbf.badgeFinal
                            : vbf.badgeDraft
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--color-text-muted)] text-xs whitespace-nowrap">
                      {formatDate(r.updated_at)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={openingId === r.id}
                        onClick={() => openReport(r.id)}
                        className="min-h-11 min-w-[88px] rounded-lg bg-primary px-3 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                      >
                        {openingId === r.id ? "…" : "Megnyitás"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
