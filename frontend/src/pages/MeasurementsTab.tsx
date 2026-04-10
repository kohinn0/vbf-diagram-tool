import { useRef, useState, type ReactNode } from 'react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import type { fabric } from 'fabric';
import { runRpeAutoWire } from '../components/diagram/measurementAutoWire';
import { uploadPadfxFile } from '../lib/api';
import type { PadfxXmlMeasurement } from '../lib/padfxMerge';
import { useDraftStore, useIsReportLocked } from '../store/draftStore';
import { toast } from '../lib/toast';
import { SiteTreePanel } from '../components/measurements/SiteTreePanel';
import { SiteNodeSelect } from '../components/measurements/SiteNodeSelect';
import {
  MEASUREMENT_THRESHOLDS_BULLETS,
  MEASUREMENT_THRESHOLDS_SECTION_TITLE,
} from '../lib/measurementThresholds';

// Shared table header cell
const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn("px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap", className)}>
    {children}
  </th>
);

// Pass/fail toggle badge
function PassBadge({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ok = value === "yes" || value === "Igen";
  return (
    <button
      type="button"
      onClick={() => onChange(ok ? (value === "yes" ? "no" : "Nem") : (value === "no" ? "yes" : "Igen"))}
      className={cn(
        "w-full h-8 rounded-md border text-xs font-semibold transition-colors",
        ok
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
          : "bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
      )}
    >
      {ok ? "Megfelel" : "Nem felel"}
    </button>
  );
}

// Delete icon button
function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors mx-auto"
      title="Sor törlése"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4">
        <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
      </svg>
    </button>
  );
}

// Section header
function SectionHeader({ number, title, description }: { number: string; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[var(--border-color)] mb-3">
      <span className="mt-0.5 w-6 h-6 rounded-md bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0">{number}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--text-main)] leading-tight">{title}</h3>
        {description && <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{description}</p>}
      </div>
    </div>
  );
}

export default function MeasurementsTab() {
  const locked = useIsReportLocked();
  const {
    measurementsData, updateMeasurementData,
    rpeRows, addRpeRow, updateRpeRow, removeRpeRow,
    loopRows, addLoopRow, updateLoopRow, removeLoopRow,
    insulationRows, addInsulationRow, updateInsulationRow, removeInsulationRow,
    rcdRows, addRcdRow, updateRcdRow, removeRcdRow,
  } = useDraftStore();

  const rowId = (r: Record<string, string>) => (r as { id?: string }).id || '';
  const activeCanvas = useDraftStore((s) => s.activeCanvas);
  const appendPadfxImport = useDraftStore((s) => s.appendPadfxImport);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [padfxLoading, setPadfxLoading] = useState(false);

  const onPadfxFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (locked) {
      toast.error('Véglegesített jegyzőkönyvhöz nem importálhatsz.');
      return;
    }
    setPadfxLoading(true);
    try {
      const res = await uploadPadfxFile(file);
      if (res.status === 'error') {
        toast.error(res.message);
        return;
      }
      if (res.status !== 'success') {
        toast.error('Ismeretlen válasz a szervertől.');
        return;
      }
      const measurements = (res.measurements || []) as unknown as PadfxXmlMeasurement[];
      if (res.is_sqlite && measurements.length === 0) {
        toast.error(
          res.message ||
            `SQLite: ${(res.tables || []).join(', ') || 'nincs tábla'} — nem található MID oszlopú mérési sor. Próbálj XML/PADFX exportot.`
        );
        return;
      }
      if (measurements.length === 0) {
        toast.error('A fájlban nem található feldolgozható mérési rekord.');
        return;
      }
      const out = appendPadfxImport(measurements);
      if (out.added) {
        toast.success(out.message);
      } else {
        toast.error(out.message);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import hiba');
    } finally {
      setPadfxLoading(false);
    }
  };

  return (
    <fieldset disabled={locked} className="min-h-0 border-0 p-0 m-0 flex flex-col flex-1">
    <div className="flex-1 w-full h-full overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Mérési adatok (kézi bevitel)</h2>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".zip,.xml,.padfx,.PADFX,application/zip,application/xml,text/xml"
            onChange={onPadfxFile}
          />
          <Button
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={padfxLoading}
            title="Metrel PADFX / ZIP (XML). Bejelentkezés szükséges."
            onClick={() => fileInputRef.current?.click()}
          >
            {padfxLoading ? 'Import…' : 'PADFX import'}
          </Button>
          <Button variant="secondary" size="sm" className="min-h-11" disabled>
            CSV export (hamarosan)
          </Button>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-[var(--radius-vbf)] border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--primary)_4%,var(--bg-panel))]">
        <h3 className="text-base font-semibold text-[var(--color-text-main)] m-0 mb-2">{MEASUREMENT_THRESHOLDS_SECTION_TITLE}</h3>
        <p className="text-xs text-[var(--color-text-muted)] m-0 mb-2 leading-relaxed">
          Ugyanez a tájékoztató szöveg bekerül a Word és PDF jegyzőkönyv „Mérési eredmények" fejezetébe. A pontos elfogadási feltétel a berendezéstől függ.
        </p>
        <ul className="m-0 pl-5 list-disc space-y-1.5 text-sm text-[var(--color-text-muted)] leading-relaxed">
          {MEASUREMENT_THRESHOLDS_BULLETS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div className="lg:hidden mb-4 p-4 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--color-bg-card)] max-h-[50vh] overflow-y-auto">
        <SiteTreePanel locked={locked} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="hidden lg:block w-72 shrink-0 bg-[var(--color-bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 shadow-sm max-h-[calc(100vh-140px)] overflow-y-auto">
          <SiteTreePanel locked={locked} />
        </div>

        {/* Fő mérés panel */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          
          {/* Bejövő hálózati paraméterek */}
          <div className="p-5 bg-[color-mix(in_srgb,var(--primary)_4%,var(--bg-panel))] border border-[var(--border-color)] rounded-[var(--radius-vbf)]">
            <h3 className="text-lg font-bold mb-4">⚡ Bejövő hálózati paraméterek</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">L1 feszültség [V]</label>
                <Input type="number" value={measurementsData['inPhaseL1'] || ''} onChange={e => updateMeasurementData('inPhaseL1', e.target.value)} placeholder="230" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">L2 feszültség [V]</label>
                <Input type="number" value={measurementsData['inPhaseL2'] || ''} onChange={e => updateMeasurementData('inPhaseL2', e.target.value)} placeholder="230" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">L3 feszültség [V]</label>
                <Input type="number" value={measurementsData['inPhaseL3'] || ''} onChange={e => updateMeasurementData('inPhaseL3', e.target.value)} placeholder="230" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">Rendszer típusa</label>
                <Select value={measurementsData['inSystemType'] || ''} onChange={e => updateMeasurementData('inSystemType', e.target.value)}>
                  <option value="">-- Válassz --</option>
                  <option value="TN-S">TN-S (PE és N szétválasztva)</option>
                  <option value="TN-C">TN-C (PEN vezető)</option>
                  <option value="TN-C-S">TN-C-S (vegyes)</option>
                  <option value="TT">TT (független földelés)</option>
                  <option value="IT">IT (elszigetelt)</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">Fázisszám</label>
                <Select value={measurementsData['inPhaseCount'] || '3'} onChange={e => updateMeasurementData('inPhaseCount', e.target.value)}>
                  <option value="1">1 fázis (egyfázisú)</option>
                  <option value="3">3 fázis (háromfázisú)</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">Főbiztosíték [A]</label>
                <Input type="number" value={measurementsData['inMainFuse'] || ''} onChange={e => updateMeasurementData('inMainFuse', e.target.value)} placeholder="63" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">Főbiz. karakterisztika</label>
                <Input value={measurementsData['inMainFuseType'] || ''} onChange={e => updateMeasurementData('inMainFuseType', e.target.value)} placeholder="gG / B / C / D" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">Megjegyzés (bejövő)</label>
                <Input value={measurementsData['inPhaseNote'] || ''} onChange={e => updateMeasurementData('inPhaseNote', e.target.value)} placeholder="pl. L2 fázisjel gyenge" />
              </div>
            </div>
          </div>

          {/* Gyors hozzárendelés */}
          <div className="p-4 bg-[color-mix(in_srgb,white_3%,transparent)] border border-[var(--border-color)] rounded-[var(--radius-vbf)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">📍 Aktív helyszín / elosztó <span className="opacity-60">(a fából vagy kézzel)</span></label>
                <Input value={measurementsData['globalLocation'] || ''} onChange={e => updateMeasurementData('globalLocation', e.target.value)} placeholder="Főelosztó → 1. emeleti alelosztó" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--color-text-muted)]">⚡ Kikapcsoló szerv</label>
                <Input value={measurementsData['globalDevice'] || ''} onChange={e => updateMeasurementData('globalDevice', e.target.value)} placeholder="B16" />
              </div>
            </div>
          </div>

          {/* 1. Védővezető folytonosság (Rpe) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <SectionHeader
                number="1"
                title="Védővezető folytonosság (Rpe)"
                description="MSZ HD 60364-6 §61.3.2 — PE védővezető lánc ellenőrzése. Rajz fülön a szimbólum felirata = Pont érték."
              />
              <Button
                variant="secondary"
                size="sm"
                className="shrink-0 self-start mt-1"
                title='A rajzi elemek „Felirat" mezője egyezzen a Pont oszloppal'
                onClick={() => {
                  const r = runRpeAutoWire(activeCanvas as fabric.Canvas | null, rpeRows);
                  toast.success(r.detail);
                }}
              >
                Rajz: RPE vonalak
              </Button>
            </div>
            <div className="w-full overflow-x-auto border border-[var(--border-color)] rounded-lg mb-3">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                  <tr>
                    <Th className="w-16">Pont</Th>
                    <Th className="min-w-[140px]">Helyszín</Th>
                    <Th>Mérés helye</Th>
                    <Th className="w-28">Rpe [Ω]</Th>
                    <Th className="w-28">Eredmény</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rpeRows.map(row => (
                    <tr key={row.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-input)] transition-colors">
                      <td className="px-2 py-1.5">
                        <Input className="h-8 text-center text-xs" value={row.point} onChange={e => updateRpeRow(row.id, { point: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5 min-w-[140px]">
                        <SiteNodeSelect value={row.node_id || ''} disabled={locked} onChange={(v) => updateRpeRow(row.id, { node_id: v || undefined })} />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input className="h-8 text-xs" value={row.location} onChange={e => updateRpeRow(row.id, { location: e.target.value })} placeholder="Valamilyen gép földelése" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input className="h-8 text-xs text-right" type="number" step="0.01" value={row.rpeValue} onChange={e => updateRpeRow(row.id, { rpeValue: e.target.value })} placeholder="0.10" />
                      </td>
                      <td className="px-2 py-1.5">
                        <PassBadge value={row.isOk} onChange={(v) => updateRpeRow(row.id, { isOk: v as never })} />
                      </td>
                      <td className="px-2 py-1.5"><DeleteBtn onClick={() => removeRpeRow(row.id)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" onClick={addRpeRow}>+ Rpe mérés</Button>
          </div>

          {/* 2. Hurokellenállás Zs §61.3.6 */}
          <div>
            <SectionHeader number="2" title="Hurokellenállás (Zs) — §61.3.6" description="Kézi sorok; PADFX import is ide tölt." />
            <div className="w-full overflow-x-auto border border-[var(--border-color)] rounded-lg mb-3">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                  <tr>
                    <Th className="min-w-[120px]">Helyszín</Th>
                    <Th>Áramkör / pont</Th>
                    <Th>Kikapcsoló</Th>
                    <Th>Hely</Th>
                    <Th className="w-24">Zs [Ω]</Th>
                    <Th className="w-28">Eredmény</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {loopRows.map((row) => (
                    <tr key={rowId(row)} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-input)] transition-colors">
                      <td className="px-2 py-1.5"><SiteNodeSelect value={row.node_id || ''} disabled={locked} onChange={(v) => updateLoopRow(rowId(row), { node_id: v })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.circuit || ''} onChange={(e) => updateLoopRow(rowId(row), { circuit: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.device || ''} onChange={(e) => updateLoopRow(rowId(row), { device: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.loc || ''} onChange={(e) => updateLoopRow(rowId(row), { loc: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" type="number" step="0.01" value={row.zs || ''} onChange={(e) => updateLoopRow(rowId(row), { zs: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><PassBadge value={row.pass || 'Igen'} onChange={(v) => updateLoopRow(rowId(row), { pass: v })} /></td>
                      <td className="px-2 py-1.5"><DeleteBtn onClick={() => removeLoopRow(rowId(row))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" onClick={addLoopRow}>+ Zs sor</Button>
          </div>

          {/* 3. Szigetelés Riso §61.3.3 */}
          <div>
            <SectionHeader number="3" title="Szigetelési ellenállás (Riso) — §61.3.3" description="L-N, L-PE, N-PE [MΩ] — a generátor 500 V DC szekciót készít." />
            <div className="w-full overflow-x-auto border border-[var(--border-color)] rounded-lg mb-3">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                  <tr>
                    <Th className="min-w-[120px]">Helyszín</Th>
                    <Th>Áramkör</Th>
                    <Th className="w-24">Riso L-N</Th>
                    <Th className="w-24">Riso L-PE</Th>
                    <Th className="w-24">Riso N-PE</Th>
                    <Th className="w-28">Eredmény</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {insulationRows.map((row) => (
                    <tr key={rowId(row)} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-input)] transition-colors">
                      <td className="px-2 py-1.5"><SiteNodeSelect value={row.node_id || ''} disabled={locked} onChange={(v) => updateInsulationRow(rowId(row), { node_id: v })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.circuit || ''} onChange={(e) => updateInsulationRow(rowId(row), { circuit: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" value={row.ln || ''} onChange={(e) => updateInsulationRow(rowId(row), { ln: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" value={row.lpe || ''} onChange={(e) => updateInsulationRow(rowId(row), { lpe: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" value={row.npe || ''} onChange={(e) => updateInsulationRow(rowId(row), { npe: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><PassBadge value={row.pass || 'Igen'} onChange={(v) => updateInsulationRow(rowId(row), { pass: v })} /></td>
                      <td className="px-2 py-1.5"><DeleteBtn onClick={() => removeInsulationRow(rowId(row))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" onClick={addInsulationRow}>+ Riso sor</Button>
          </div>

          {/* 4. RCD / ÁVK §61.3.7 */}
          <div>
            <SectionHeader number="4" title="FI-relé (ÁVK) — §61.3.7" description="Részletes próbatáblázat a Word exportban; ide a tipikus mezők." />
            <div className="w-full overflow-x-auto border border-[var(--border-color)] rounded-lg mb-3">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                  <tr>
                    <Th className="min-w-[110px]">Helyszín</Th>
                    <Th>Áramkör</Th>
                    <Th className="w-16">Típus</Th>
                    <Th className="w-18">IΔn mA</Th>
                    <Th className="w-18">0.5×IΔn</Th>
                    <Th className="w-16">1× ms</Th>
                    <Th className="w-16">5× ms</Th>
                    <Th className="w-14">IΔ</Th>
                    <Th className="w-14">Uc</Th>
                    <Th className="w-28">Eredmény</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rcdRows.map((row) => (
                    <tr key={rowId(row)} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-input)] transition-colors">
                      <td className="px-2 py-1.5"><SiteNodeSelect value={row.node_id || ''} disabled={locked} onChange={(v) => updateRcdRow(rowId(row), { node_id: v })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.circ || ''} onChange={(e) => updateRcdRow(rowId(row), { circ: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs" value={row.type || ''} onChange={(e) => updateRcdRow(rowId(row), { type: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" value={row.idn || ''} onChange={(e) => updateRcdRow(rowId(row), { idn: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" value={row.test05 || ''} onChange={(e) => updateRcdRow(rowId(row), { test05: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" value={row.t1 || ''} onChange={(e) => updateRcdRow(rowId(row), { t1: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" value={row.t5 || ''} onChange={(e) => updateRcdRow(rowId(row), { t5: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" value={row.ramp || ''} onChange={(e) => updateRcdRow(rowId(row), { ramp: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><Input className="h-8 text-xs text-right" value={row.uc || ''} onChange={(e) => updateRcdRow(rowId(row), { uc: e.target.value })} /></td>
                      <td className="px-2 py-1.5"><PassBadge value={row.pass || 'Igen'} onChange={(v) => updateRcdRow(rowId(row), { pass: v })} /></td>
                      <td className="px-2 py-1.5"><DeleteBtn onClick={() => removeRcdRow(rowId(row))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" onClick={addRcdRow}>+ RCD sor</Button>
          </div>

        </div>
      </div>
    </div>
    </fieldset>
  );
}
