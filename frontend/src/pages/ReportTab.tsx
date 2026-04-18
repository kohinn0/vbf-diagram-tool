import { useEffect, useState } from "react";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { FormField } from "../components/ui/FormField";
import { Skeleton } from "../components/ui/Skeleton";
import { getFieldError, type ReportFieldKey } from "../lib/validateReport";
import { useDraftStore, useIsReportLocked, type VisualChecksState } from "../store/draftStore";
import { toast } from "../lib/toast";
import {
  BUILTIN_REPORT_TEMPLATES,
  loadUserReportTemplates,
  saveCurrentAsUserTemplate,
} from "../lib/reportTemplates";
import {
  fetchCustomers,
  fetchInspectors,
  createCustomer,
  createInspector,
  generateAiSummary,
  type CustomerDto,
  type InspectorDto,
} from "../lib/api";

const VISUAL_LABELS: { key: keyof VisualChecksState; label: string }[] = [
  { key: "id_marks", label: "Azonosító jelek, feliratok megléte" },
  { key: "protection", label: "Áramütés elleni védelem kialakítása" },
  { key: "fire", label: "Tűzvédelmi óvintézkedések" },
  { key: "conduction", label: "Vezetők kiválasztása, terhelhetőség" },
  { key: "connection", label: "Csatlakozások, kötések megfelelősége" },
  { key: "access", label: "Karbantarthatóság, hozzáférhetőség" },
];

export default function ReportTab() {
  const locked = useIsReportLocked();
  const { reportData, updateReportData, visualChecks, updateVisualCheck, applyReportTemplatePatch } =
    useDraftStore();
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [inspectors, setInspectors] = useState<InspectorDto[]>([]);
  const [masterLoading, setMasterLoading] = useState(false);
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newInspOpen, setNewInspOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: "", address: "", hrsz: "" });
  const [newInsp, setNewInsp] = useState({ name: "", license: "", instrument_type: "", instrument_cal: "" });
  const [templateSelect, setTemplateSelect] = useState("");
  const [userTemplates, setUserTemplates] = useState(() => loadUserReportTemplates());
  const [touched, setTouched] = useState<Partial<Record<ReportFieldKey, boolean>>>({});

  const touch = (k: ReportFieldKey) => setTouched((t) => ({ ...t, [k]: true }));

  const fieldErr = (k: ReportFieldKey): string | undefined => {
    if (!touched[k]) return undefined;
    const exportKeys: ReportFieldKey[] = ["inspectorName", "inspectorLicense", "instrumentType", "instrumentCal"];
    const phase = exportKeys.includes(k) ? "export" : "save";
    return getFieldError(k, reportData[k], phase) || undefined;
  };

  useEffect(() => {
    if (!localStorage.getItem("vbf_token")) return;
    setMasterLoading(true);
    Promise.all([fetchCustomers(), fetchInspectors()])
      .then(([c, i]) => {
        setCustomers(c);
        setInspectors(i);
      })
      .catch(() => toast.error("Törzsadatok betöltése sikertelen — jelentkezz be, vagy próbáld újra."))
      .finally(() => setMasterLoading(false));
  }, []);

  const applyCustomer = (c: CustomerDto) => {
    updateReportData("customerId", String(c.id));
    updateReportData("customerName", c.name);
    if (c.address) updateReportData("siteAddress", c.address);
    if (c.hrsz) updateReportData("siteHrsz", c.hrsz);
    if (c.building_purpose) updateReportData("buildingPurpose", c.building_purpose);
  };

  const applyInspector = (i: InspectorDto) => {
    updateReportData("inspectorId", String(i.id));
    updateReportData("inspectorName", i.name);
    if (i.license) updateReportData("inspectorLicense", i.license);
    if (i.instrument_type) updateReportData("instrumentType", i.instrument_type);
    if (i.instrument_cal) updateReportData("instrumentCal", i.instrument_cal);
  };

  return (
    <fieldset disabled={locked} className="min-h-0 border-0 p-0 m-0 flex flex-col flex-1">
      <div className="flex-1 w-full h-full overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
        <h2 className="text-2xl font-bold mb-2 text-[var(--color-text-main)]">Jegyzőkönyv típusa és alapadatok</h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">Rajz → Adatok → Hibák → Mérések → Mentés</p>

        <div className="mb-8 p-6 rounded-2xl border-l-[3px] border-primary bg-[var(--color-bg-card)] shadow-sm">
          <label className="mb-3 block text-[0.95rem] font-bold leading-snug text-primary">Gyorskitöltő sablon betöltése</label>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            {BUILTIN_REPORT_TEMPLATES.length} előre definiált + saját mentett sablon. A sablon a típust, OTSZ osztályt, környezetet és §6.4.2 jelölőket tölti — ügyfél és helyszín kézzel marad.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
            <Select
              className="flex-1 min-h-11"
              disabled={locked}
              value={templateSelect}
              onChange={(e) => {
                const v = e.target.value;
                setTemplateSelect(v);
                if (!v) return;
                if (v.startsWith("builtin:")) {
                  const id = v.slice("builtin:".length);
                  const t = BUILTIN_REPORT_TEMPLATES.find((x) => x.id === id);
                  if (t) {
                    applyReportTemplatePatch(t.patch);
                    toast.success("Sablon alkalmazva: " + t.label);
                  }
                } else if (v.startsWith("user:")) {
                  const id = v.slice("user:".length);
                  const t = userTemplates.find((x) => x.id === id);
                  if (t) {
                    applyReportTemplatePatch(t.patch);
                    toast.success("Saját sablon betöltve: " + t.name);
                  }
                }
                setTemplateSelect("");
              }}
            >
              <option value="">-- Válassz sablont (opcionális) --</option>
              <optgroup label="Előre definiált jegyzőkönyv sablonok">
                {BUILTIN_REPORT_TEMPLATES.map((t) => (
                  <option key={t.id} value={`builtin:${t.id}`}>
                    {t.label}
                    {t.hint ? ` — ${t.hint}` : ""}
                  </option>
                ))}
              </optgroup>
              {userTemplates.length > 0 && (
                <optgroup label="Saját mentett sablonok">
                  {userTemplates.map((t) => (
                    <option key={t.id} value={`user:${t.id}`}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
            <Button
              type="button"
              disabled={locked}
              className="min-h-11 shrink-0"
              onClick={() => {
                const name = window.prompt("Saját sablon neve (a jelenlegi jegyzőkönyv adatlap és §6.4.2 jelölők):");
                if (!name?.trim()) return;
                try {
                  const st = useDraftStore.getState();
                  saveCurrentAsUserTemplate(name.trim(), {
                    reportData: { ...st.reportData },
                    visualChecks: { ...st.visualChecks },
                  });
                  setUserTemplates(loadUserReportTemplates());
                  toast.success("Saját sablon elmentve a böngészőbe.");
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : "Mentés hiba");
                }
              }}
            >
              Mentés saját sablonként
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <FormField
            label="Vizsgálat típusa (MSZ HD 60364 / OTSZ)"
            htmlFor="report-docType"
            error={fieldErr("docType")}
            requiredMark
          >
            <Select
              id="report-docType"
              value={reportData["docType"] || ""}
              onChange={(e) => {
                touch("docType");
                updateReportData("docType", e.target.value);
              }}
              onBlur={() => touch("docType")}
              disabled={locked}
              className="min-h-11"
              aria-invalid={fieldErr("docType") ? true : undefined}
            >
              <option value="VBF_IDOSZAKOS">VBF - Időszakos felülvizsgálat (OTSZ szerint)</option>
              <option value="VBF_ELSO">VBF - Első felülvizsgálat (Üzembe helyezés előtti)</option>
              <option value="VBF_BERBEADAS">VBF - Bérbeadás előtti felülvizsgálat (40/2017. NGM)</option>
              <option value="VBF_ELADAS">VBF - Tulajdonosi jogváltás / Eladás előtti felülvizsgálat</option>
              <option value="EPH">EPH - Egyenpotenciálra Hozó Hálózat Felülvizsgálat Mérés</option>
            </Select>
          </FormField>
        </div>

        {reportData.docType === "EPH" && (
          <div className="mb-8 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] shadow-sm">
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2">EPH és földelés — specifikus adatok</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4 m-0">
              A Word és PDF „EPH és Földelés Specifikus Adatok” szakaszába kerülnek.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted-strong)]">
                  Gázszolgáltató (gázmérő) bevonása szükséges
                </label>
                <Select
                  className="min-h-11"
                  disabled={locked}
                  value={reportData.ephGasRequired === "Igen" ? "Igen" : "Nem"}
                  onChange={(e) => updateReportData("ephGasRequired", e.target.value)}
                >
                  <option value="Nem">Nem</option>
                  <option value="Igen">Igen</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted-strong)]">Gázmérő gyári száma</label>
                <Input
                  className="min-h-11"
                  disabled={locked}
                  value={reportData.ephGasMeter || ""}
                  onChange={(e) => updateReportData("ephGasMeter", e.target.value)}
                  placeholder="N/A"
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-[var(--color-text-muted-strong)]">PE–N szétválasztás helye</label>
                <Input
                  className="min-h-11"
                  disabled={locked}
                  value={reportData.ephPenSep || ""}
                  onChange={(e) => updateReportData("ephPenSep", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-[var(--color-text-muted-strong)]">
                  Földelési ellenállás mérési módszer
                </label>
                <Input
                  className="min-h-11"
                  disabled={locked}
                  value={reportData.ephEarthMethod || ""}
                  onChange={(e) => updateReportData("ephEarthMethod", e.target.value)}
                />
              </div>
              <label className="flex items-start gap-3 min-h-11 cursor-pointer md:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1.5 shrink-0 w-5 h-5 rounded border-[var(--border-color)]"
                  disabled={locked}
                  checked={Boolean(reportData.ephEarthNotMeasurable?.trim())}
                  onChange={(e) =>
                    updateReportData("ephEarthNotMeasurable", e.target.checked ? "1" : "")
                  }
                />
                <span className="text-sm text-[var(--color-text-main)] leading-snug">
                  A Ra mérés a helyszín adottságai miatt nem volt kivitelezhető (Rpe folytonosság mérve) — a generátor nem ír numerikus Ra értéket.
                </span>
              </label>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted-strong)]">Mért földelési ellenállás Ra [Ω]</label>
                <Input
                  className="min-h-11"
                  type="number"
                  step="any"
                  disabled={locked || Boolean(reportData.ephEarthNotMeasurable?.trim())}
                  value={reportData.ephRaValue || ""}
                  onChange={(e) => updateReportData("ephRaValue", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-muted-strong)]">EPH fővezeték keresztmetszete [mm²]</label>
                <Input
                  className="min-h-11"
                  disabled={locked}
                  value={reportData.ephConductor || ""}
                  onChange={(e) => updateReportData("ephConductor", e.target.value)}
                />
              </div>
              <label className="flex items-start gap-3 min-h-11 cursor-pointer md:col-span-2">
                <input
                  type="checkbox"
                  className="mt-1.5 shrink-0 w-5 h-5 rounded border-[var(--border-color)]"
                  disabled={locked}
                  checked={Boolean(reportData.ephDeclaration?.trim())}
                  onChange={(e) => updateReportData("ephDeclaration", e.target.checked ? "1" : "")}
                />
                <span className="text-sm text-[var(--color-text-main)] leading-snug">
                  EPH nyilatkozat: az egyidejűleg érinthető idegen fémszerkezetek bekötéséről (generátor szövege a dokumentumban).
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Helyszín és megrendelő</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Ügyfél a törzsből</label>
                {masterLoading ? (
                  <Skeleton className="h-11 w-full" label="Ügyfelek betöltése" />
                ) : (
                  <Select
                    disabled={locked || masterLoading}
                    value={reportData["customerId"] || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        updateReportData("customerId", "");
                        return;
                      }
                      const c = customers.find((x) => String(x.id) === v);
                      if (c) applyCustomer(c);
                    }}
                    className="min-h-11"
                  >
                    <option value="">— Válassz vagy írj kézzel alább —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
                {!locked && (
                  <div className="mt-1">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline min-h-11 py-1"
                      onClick={() => setNewCustOpen((o) => !o)}
                    >
                      {newCustOpen ? "Bezár" : "+ Új ügyfél mentése a törzsbe"}
                    </button>
                    {newCustOpen && (
                      <div className="mt-2 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-card)] flex flex-col gap-2">
                        <Input
                          placeholder="Cégnév / név *"
                          value={newCust.name}
                          onChange={(e) => setNewCust((s) => ({ ...s, name: e.target.value }))}
                          className="min-h-11"
                        />
                        <Input
                          placeholder="Cím (opcionális)"
                          value={newCust.address}
                          onChange={(e) => setNewCust((s) => ({ ...s, address: e.target.value }))}
                          className="min-h-11"
                        />
                        <Input
                          placeholder="HRSZ (opcionális)"
                          value={newCust.hrsz}
                          onChange={(e) => setNewCust((s) => ({ ...s, hrsz: e.target.value }))}
                          className="min-h-11"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="min-h-11 w-full sm:w-auto"
                          onClick={async () => {
                            if (!newCust.name.trim()) {
                              toast.error("Az ügyfél neve kötelező.");
                              return;
                            }
                            try {
                              const c = await createCustomer({
                                name: newCust.name.trim(),
                                address: newCust.address.trim() || undefined,
                                hrsz: newCust.hrsz.trim() || undefined,
                              });
                              setCustomers((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
                              applyCustomer(c);
                              setNewCust({ name: "", address: "", hrsz: "" });
                              setNewCustOpen(false);
                              toast.success("Ügyfél elmentve a törzsbe.");
                            } catch (e: unknown) {
                              toast.error(e instanceof Error ? e.message : "Mentés hiba");
                            }
                          }}
                        >
                          Törzsbe mentés
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <FormField
                label="Megrendelő neve / cégneve"
                htmlFor="report-customerName"
                error={fieldErr("customerName")}
                requiredMark
              >
                <Input
                  id="report-customerName"
                  value={reportData["customerName"] || ""}
                  onChange={(e) => updateReportData("customerName", e.target.value)}
                  onBlur={() => touch("customerName")}
                  placeholder="Pl. Kovács Kft. vagy Gipsz Jakab"
                  className="min-h-11"
                  aria-invalid={fieldErr("customerName") ? true : undefined}
                />
              </FormField>
              <FormField
                label="Vizsgált objektum címe"
                htmlFor="report-siteAddress"
                error={fieldErr("siteAddress")}
                requiredMark
              >
                <Input
                  id="report-siteAddress"
                  value={reportData["siteAddress"] || ""}
                  onChange={(e) => updateReportData("siteAddress", e.target.value)}
                  onBlur={() => touch("siteAddress")}
                  placeholder="Pl. 1011 Bp., Fő utca 1."
                  className="min-h-11"
                  aria-invalid={fieldErr("siteAddress") ? true : undefined}
                />
              </FormField>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Helyrajzi Szám (HRSZ) / Épület azonosító (OTSZ)</label>
                <Input
                  value={reportData["siteHrsz"] || ""}
                  onChange={(e) => updateReportData("siteHrsz", e.target.value)}
                  placeholder="Pl. 12345/6 / A Épület"
                />
              </div>

              <hr className="my-2 border-[var(--border-color)]" />
              <h3 className="font-semibold text-[var(--color-text-main)]">Környezeti Tényezők és Szabványok</h3>
              <FormField
                label="Hőmérséklet a vizsgálat idején (°C)"
                htmlFor="report-envTemp"
                hint="Opcionális; ha kitöltöd: -40 … 60 °C."
                error={fieldErr("envTemp")}
              >
                <Input
                  id="report-envTemp"
                  type="number"
                  value={reportData["envTemp"] || ""}
                  onChange={(e) => updateReportData("envTemp", e.target.value)}
                  onBlur={() => touch("envTemp")}
                  placeholder="Pl. 22"
                  className="min-h-11"
                  aria-invalid={fieldErr("envTemp") ? true : undefined}
                />
              </FormField>
              <FormField
                label="Relatív páratartalom (%)"
                htmlFor="report-envHumidity"
                hint="Opcionális; ha kitöltöd: 0–100%."
                error={fieldErr("envHumidity")}
              >
                <Input
                  id="report-envHumidity"
                  type="number"
                  value={reportData["envHumidity"] || ""}
                  onChange={(e) => updateReportData("envHumidity", e.target.value)}
                  onBlur={() => touch("envHumidity")}
                  placeholder="Pl. 45"
                  className="min-h-11"
                  aria-invalid={fieldErr("envHumidity") ? true : undefined}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Előadó és eszközök</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Felülvizsgáló a törzsből</label>
                {masterLoading ? (
                  <Skeleton className="h-11 w-full" label="Felülvizsgálók betöltése" />
                ) : (
                  <Select
                    disabled={locked || masterLoading}
                    value={reportData["inspectorId"] || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) {
                        updateReportData("inspectorId", "");
                        return;
                      }
                      const i = inspectors.find((x) => String(x.id) === v);
                      if (i) applyInspector(i);
                    }}
                    className="min-h-11"
                  >
                    <option value="">— Válassz vagy töltsd kézzel —</option>
                    {inspectors.map((i) => (
                      <option key={i.id} value={String(i.id)}>
                        {i.name}
                      </option>
                    ))}
                  </Select>
                )}
                {!locked && (
                  <div className="mt-1">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline min-h-11 py-1"
                      onClick={() => setNewInspOpen((o) => !o)}
                    >
                      {newInspOpen ? "Bezár" : "+ Új felülvizsgáló a törzsbe"}
                    </button>
                    {newInspOpen && (
                      <div className="mt-2 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-card)] flex flex-col gap-2">
                        <Input
                          placeholder="Név *"
                          value={newInsp.name}
                          onChange={(e) => setNewInsp((s) => ({ ...s, name: e.target.value }))}
                          className="min-h-11"
                        />
                        <Input
                          placeholder="Vizsgabizonyítvány száma"
                          value={newInsp.license}
                          onChange={(e) => setNewInsp((s) => ({ ...s, license: e.target.value }))}
                          className="min-h-11"
                        />
                        <Input
                          placeholder="Műszer típus"
                          value={newInsp.instrument_type}
                          onChange={(e) => setNewInsp((s) => ({ ...s, instrument_type: e.target.value }))}
                          className="min-h-11"
                        />
                        <Input
                          type="date"
                          placeholder="Kalibrálás"
                          value={newInsp.instrument_cal}
                          onChange={(e) => setNewInsp((s) => ({ ...s, instrument_cal: e.target.value }))}
                          className="min-h-11"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="min-h-11 w-full sm:w-auto"
                          onClick={async () => {
                            if (!newInsp.name.trim()) {
                              toast.error("A név kötelező.");
                              return;
                            }
                            try {
                              const i = await createInspector({
                                name: newInsp.name.trim(),
                                license: newInsp.license.trim() || undefined,
                                instrument_type: newInsp.instrument_type.trim() || undefined,
                                instrument_cal: newInsp.instrument_cal.trim() || undefined,
                              });
                              setInspectors((prev) => [...prev, i].sort((a, b) => a.name.localeCompare(b.name)));
                              applyInspector(i);
                              setNewInsp({ name: "", license: "", instrument_type: "", instrument_cal: "" });
                              setNewInspOpen(false);
                              toast.success("Felülvizsgáló elmentve a törzsbe.");
                            } catch (e: unknown) {
                              toast.error(e instanceof Error ? e.message : "Mentés hiba");
                            }
                          }}
                        >
                          Törzsbe mentés
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <FormField
                label="Felülvizsgáló cég / személy neve"
                htmlFor="report-inspectorName"
                hint="Export: kötelező."
                error={fieldErr("inspectorName")}
                requiredMark
              >
                <Input
                  id="report-inspectorName"
                  value={reportData["inspectorName"] || ""}
                  onChange={(e) => updateReportData("inspectorName", e.target.value)}
                  onBlur={() => touch("inspectorName")}
                  placeholder="Zöldfülű Vill Kft."
                  className="min-h-11"
                  aria-invalid={fieldErr("inspectorName") ? true : undefined}
                />
              </FormField>
              <FormField
                label="Vizsgabizonyítvány száma"
                htmlFor="report-inspectorLicense"
                hint="Export: kötelező."
                error={fieldErr("inspectorLicense")}
                requiredMark
              >
                <Input
                  id="report-inspectorLicense"
                  value={reportData["inspectorLicense"] || ""}
                  onChange={(e) => updateReportData("inspectorLicense", e.target.value)}
                  onBlur={() => touch("inspectorLicense")}
                  placeholder="Pl. VBF-12345/2023"
                  className="min-h-11"
                  aria-invalid={fieldErr("inspectorLicense") ? true : undefined}
                />
              </FormField>
              <FormField
                label="Mérőműszer (típus és gyári szám)"
                htmlFor="report-instrumentType"
                hint="Export: kötelező."
                error={fieldErr("instrumentType")}
                requiredMark
              >
                <Input
                  id="report-instrumentType"
                  value={reportData["instrumentType"] || ""}
                  onChange={(e) => updateReportData("instrumentType", e.target.value)}
                  onBlur={() => touch("instrumentType")}
                  placeholder="Pl. Metrel MI 3152, SN:123456"
                  className="min-h-11"
                  aria-invalid={fieldErr("instrumentType") ? true : undefined}
                />
              </FormField>
              <FormField
                label="Műszer kalibrálás érvényessége"
                htmlFor="report-instrumentCal"
                hint="Export: kötelező."
                error={fieldErr("instrumentCal")}
                requiredMark
              >
                <Input
                  id="report-instrumentCal"
                  type="date"
                  value={reportData["instrumentCal"] || ""}
                  onChange={(e) => updateReportData("instrumentCal", e.target.value)}
                  onBlur={() => touch("instrumentCal")}
                  className="min-h-11"
                  aria-invalid={fieldErr("instrumentCal") ? true : undefined}
                />
              </FormField>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Műszer Mérési Bizonytalansága</label>
                <Input
                  value={reportData["instrumentError"] || ""}
                  onChange={(e) => updateReportData("instrumentError", e.target.value)}
                  placeholder="Pl. ± 5%"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>OTSZ — épület és következő felülvizsgálat</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                A generált Word/PDF a következő kötelező felülvizsgálatot az OTSZ kockázati osztály szerint számítja ki; itt megadhatsz egy konkrét dátumot is (pl. szerződés szerint).
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Épület rendeltetése</label>
                <Input
                  value={reportData["buildingPurpose"] || ""}
                  onChange={(e) => updateReportData("buildingPurpose", e.target.value)}
                  placeholder="Pl. lakóépület, iroda, ipari"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">OTSZ tűzveszélyességi osztály (épület)</label>
                <Select
                  value={reportData["buildingOtsz"] || ""}
                  onChange={(e) => updateReportData("buildingOtsz", e.target.value)}
                >
                  <option value="">— nincs megadva —</option>
                  <option value="AK">AK — alacsony kockázat</option>
                  <option value="KK">KK — közepes kockázat</option>
                  <option value="MK">MK — magas kockázat</option>
                  <option value="NAK">NAK / nem alkalmazható</option>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Következő kötelező felülvizsgálat (dátum)</label>
                <Input
                  type="date"
                  value={reportData["nextInspectionDate"] || ""}
                  onChange={(e) => updateReportData("nextInspectionDate", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>§6.4.2 Szemrevételezés (MSZ HD 60364-6)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-[var(--color-text-muted)] mb-1">
                Jelöld a megfelelő pontokat; a Word export táblázatba kerülnek.
              </p>
              {VISUAL_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 min-h-11 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-[var(--border-color)] text-primary"
                    checked={visualChecks[key]}
                    onChange={(e) => updateVisualCheck(key, e.target.checked)}
                  />
                  <span className="text-sm text-[var(--color-text-main)]">{label}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Megjegyzések és Összefoglaló</CardTitle>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-11 border border-violet-500/35 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                disabled={locked}
                onClick={async () => {
                  try {
                    const payload = useDraftStore.getState().buildApiPayload();
                    const summary = await generateAiSummary(payload);
                    useDraftStore.getState().updateReportData("reportNotes", summary);
                    toast.success("AI szöveg beillesztve.");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "AI hiba");
                  }
                }}
              >
                ✨ AI Szöveggenerálás
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Ideális a feltárt hibák, mérési eredmények szabadszavas összefoglalására (Word/PDF-be is bekerül)</label>
                <textarea
                  className="w-full min-h-[150px] p-3 text-sm rounded-md border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y disabled:opacity-50"
                  value={reportData["reportNotes"] || ""}
                  onChange={(e) => updateReportData("reportNotes", e.target.value)}
                  placeholder="Pl. A vizsgálat során 3 darab kritikus hibát tártunk fel az 1. emeleti elosztónál..."
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <label className="text-sm font-semibold text-[var(--color-text-muted-strong)]">Belső megjegyzések (Csak neked, nem kerül be a nyomtatásba!)</label>
                <textarea
                  className="min-h-[80px] w-full resize-y rounded-md border border-amber-500/25 bg-[var(--bg-input)] p-3 text-sm text-[var(--text-main)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:opacity-50"
                  value={reportData["inspectorNotes"] || ""}
                  onChange={(e) => updateReportData("inspectorNotes", e.target.value)}
                  placeholder="Pl. Gipsz Jakab 10.000 Ft-ot még lóg a kiszállásért."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </fieldset>
  );
}
