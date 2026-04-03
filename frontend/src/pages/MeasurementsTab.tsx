import { useRef, useState } from 'react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
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
          Ugyanez a tájékoztató szöveg bekerül a Word és PDF jegyzőkönyv „Mérési eredmények” fejezetébe. A pontos elfogadási feltétel a berendezéstől függ.
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 pb-2 border-b border-[var(--border-color)] mt-4">
              <h3 className="text-lg font-bold text-[var(--color-text-main)]">1. Védővezető folytonosság (Rpe)</h3>
              <Button
                variant="secondary"
                size="sm"
                className="min-h-11 shrink-0 w-full sm:w-auto"
                title="A rajzi elemek „Felirat” mezője egyezzen a Pont oszloppal; a vonalak a pontok sorrendjében készülnek"
                onClick={() => {
                  const r = runRpeAutoWire(activeCanvas as fabric.Canvas | null, rpeRows);
                  toast.success(r.detail);
                }}
              >
                Rajz: RPE vonalak
              </Button>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-3 leading-relaxed">
              A <strong className="font-semibold text-[var(--color-text-main)]">Rajz</strong> fülön minden szimbólumnál állítsd a feliratot ugyanarra, mint a <strong className="font-semibold text-[var(--color-text-main)]">Pont</strong> (pl. 1, 2, 3). A gomb a láncot <strong className="font-semibold text-[var(--color-text-main)]">PE védővezetőként</strong> (HD 308 S2, zöld szaggatott) rajzolja — a védővezető folytonosság (RPE) méréshez illeszkedően (MSZ HD 60364-6 §61.3.2).
            </p>
            <div className="w-full overflow-hidden border border-[var(--border-color)] rounded-[var(--radius-vbf)] mb-3">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg-card)] border-b border-[var(--border-color)]">
                    <th className="p-3 text-sm font-semibold text-[var(--color-text-muted-strong)] w-16">Pont</th>
                    <th className="p-3 text-sm font-semibold text-[var(--color-text-muted-strong)] min-w-[140px]">Helyszín</th>
                    <th className="p-3 text-sm font-semibold text-[var(--color-text-muted-strong)]">Mérés Helye</th>
                    <th className="p-3 text-sm font-semibold text-[var(--color-text-muted-strong)] w-32">Rpe [Ω]</th>
                    <th className="p-3 text-sm font-semibold text-[var(--color-text-muted-strong)] w-32">Megfelel?</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rpeRows.map(row => (
                    <tr key={row.id} className="bg-[var(--color-bg-input)] border-b border-[var(--border-color)] group hover:bg-[color-mix(in_srgb,var(--primary)_5%,var(--color-bg-input))] transition-colors">
                      <td className="p-2">
                        <Input className="h-8 text-center text-xs" value={row.point} onChange={e => updateRpeRow(row.id, { point: e.target.value })} />
                      </td>
                      <td className="p-2 min-w-[140px]">
                        <SiteNodeSelect
                          value={row.node_id || ''}
                          disabled={locked}
                          onChange={(v) => updateRpeRow(row.id, { node_id: v || undefined })}
                        />
                      </td>
                      <td className="p-2">
                        <Input className="h-8 text-xs" value={row.location} onChange={e => updateRpeRow(row.id, { location: e.target.value })} placeholder="Valamilyen gép földelése" />
                      </td>
                      <td className="p-2">
                        <Input className="h-8 text-xs text-right" type="number" step="0.01" value={row.rpeValue} onChange={e => updateRpeRow(row.id, { rpeValue: e.target.value })} placeholder="0.10" />
                      </td>
                      <td className="p-2">
                        <Select className={`h-8 text-xs ${row.isOk === 'yes' ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[#10b981]' : 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[#ef4444]'}`} value={row.isOk} onChange={e => updateRpeRow(row.id, { isOk: e.target.value as any })}>
                          <option value="yes">Igen</option>
                          <option value="no">Nem</option>
                        </Select>
                      </td>
                      <td className="p-2 text-center text-[var(--color-text-muted)] cursor-pointer hover:text-red-500" onClick={() => removeRpeRow(row.id)}>✕</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" onClick={addRpeRow}>+ Rpe mérés</Button>
          </div>

          {/* 2. Hurokellenállás Zs §61.3.6 */}
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2 pb-2 border-b border-[var(--border-color)]">2. Hurokellenállás (Zs) — §61.3.6</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-3">Kézi sorok; PADFX import is ide tölt. A generált Word táblázat oszlopai: áramkör, készülék, hely, Zs, megfelel.</p>
            <div className="w-full overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-vbf)] mb-3">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-[var(--color-bg-card)] border-b border-[var(--border-color)]">
                    <th className="p-2 text-xs font-semibold min-w-[120px]">Helyszín</th>
                    <th className="p-2 text-xs font-semibold">Áramkör / pont</th>
                    <th className="p-2 text-xs font-semibold">Kikapcsoló</th>
                    <th className="p-2 text-xs font-semibold">Hely</th>
                    <th className="p-2 text-xs font-semibold w-24">Zs [Ω]</th>
                    <th className="p-2 text-xs font-semibold w-28">Megfelel</th>
                    <th className="p-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {loopRows.map((row) => (
                    <tr key={rowId(row)} className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)]">
                      <td className="p-2">
                        <SiteNodeSelect
                          value={row.node_id || ''}
                          disabled={locked}
                          onChange={(v) => updateLoopRow(rowId(row), { node_id: v })}
                        />
                      </td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.circuit || ''} onChange={(e) => updateLoopRow(rowId(row), { circuit: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.device || ''} onChange={(e) => updateLoopRow(rowId(row), { device: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.loc || ''} onChange={(e) => updateLoopRow(rowId(row), { loc: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" type="number" step="0.01" value={row.zs || ''} onChange={(e) => updateLoopRow(rowId(row), { zs: e.target.value })} /></td>
                      <td className="p-2">
                        <Select className="h-9 text-xs min-h-11" value={row.pass || 'Igen'} onChange={(e) => updateLoopRow(rowId(row), { pass: e.target.value })}>
                          <option value="Igen">Igen</option>
                          <option value="Nem">Nem</option>
                        </Select>
                      </td>
                      <td className="p-2 text-center cursor-pointer text-[var(--color-text-muted)] hover:text-red-500 min-h-11" onClick={() => removeLoopRow(rowId(row))}>✕</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" className="min-h-11" onClick={addLoopRow}>+ Zs sor</Button>
          </div>

          {/* 3. Szigetelés Riso §61.3.3 */}
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2 pb-2 border-b border-[var(--border-color)]">3. Szigetelési ellenállás (Riso) — §61.3.3</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-3">L-N, L-PE, N-PE [MΩ] — a generátor 500 V DC szekciót készít.</p>
            <div className="w-full overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-vbf)] mb-3">
              <table className="w-full text-left border-collapse min-w-[840px]">
                <thead>
                  <tr className="bg-[var(--color-bg-card)] border-b border-[var(--border-color)]">
                    <th className="p-2 text-xs font-semibold min-w-[120px]">Helyszín</th>
                    <th className="p-2 text-xs font-semibold">Áramkör</th>
                    <th className="p-2 text-xs font-semibold">Riso L-N</th>
                    <th className="p-2 text-xs font-semibold">Riso L-PE</th>
                    <th className="p-2 text-xs font-semibold">Riso N-PE</th>
                    <th className="p-2 text-xs font-semibold w-28">Megfelel</th>
                    <th className="p-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {insulationRows.map((row) => (
                    <tr key={rowId(row)} className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)]">
                      <td className="p-2">
                        <SiteNodeSelect
                          value={row.node_id || ''}
                          disabled={locked}
                          onChange={(v) => updateInsulationRow(rowId(row), { node_id: v })}
                        />
                      </td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.circuit || ''} onChange={(e) => updateInsulationRow(rowId(row), { circuit: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.ln || ''} onChange={(e) => updateInsulationRow(rowId(row), { ln: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.lpe || ''} onChange={(e) => updateInsulationRow(rowId(row), { lpe: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.npe || ''} onChange={(e) => updateInsulationRow(rowId(row), { npe: e.target.value })} /></td>
                      <td className="p-2">
                        <Select className="h-9 text-xs min-h-11" value={row.pass || 'Igen'} onChange={(e) => updateInsulationRow(rowId(row), { pass: e.target.value })}>
                          <option value="Igen">Igen</option>
                          <option value="Nem">Nem</option>
                        </Select>
                      </td>
                      <td className="p-2 text-center cursor-pointer min-h-11" onClick={() => removeInsulationRow(rowId(row))}>✕</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" className="min-h-11" onClick={addInsulationRow}>+ Riso sor</Button>
          </div>

          {/* 4. RCD / ÁVK §61.3.7 */}
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2 pb-2 border-b border-[var(--border-color)]">4. FI-relé (ÁVK) — §61.3.7</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-3">Részletes próbatáblázat a Word exportban; ide a tipikus mezők.</p>
            <div className="w-full overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-vbf)] mb-3">
              <table className="w-full text-left border-collapse min-w-[1020px]">
                <thead>
                  <tr className="bg-[var(--color-bg-card)] border-b border-[var(--border-color)]">
                    <th className="p-2 text-xs font-semibold min-w-[120px]">Helyszín</th>
                    <th className="p-2 text-xs font-semibold">Áramkör</th>
                    <th className="p-2 text-xs font-semibold w-16">Típus</th>
                    <th className="p-2 text-xs font-semibold w-20">IΔn mA</th>
                    <th className="p-2 text-xs font-semibold w-20">0.5×IΔn</th>
                    <th className="p-2 text-xs font-semibold w-16">1× ms</th>
                    <th className="p-2 text-xs font-semibold w-16">5× ms</th>
                    <th className="p-2 text-xs font-semibold w-16">IΔ</th>
                    <th className="p-2 text-xs font-semibold w-16">Uc</th>
                    <th className="p-2 text-xs font-semibold w-24">Megfelel</th>
                    <th className="p-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rcdRows.map((row) => (
                    <tr key={rowId(row)} className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)]">
                      <td className="p-2">
                        <SiteNodeSelect
                          value={row.node_id || ''}
                          disabled={locked}
                          onChange={(v) => updateRcdRow(rowId(row), { node_id: v })}
                        />
                      </td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.circ || ''} onChange={(e) => updateRcdRow(rowId(row), { circ: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.type || ''} onChange={(e) => updateRcdRow(rowId(row), { type: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.idn || ''} onChange={(e) => updateRcdRow(rowId(row), { idn: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.test05 || ''} onChange={(e) => updateRcdRow(rowId(row), { test05: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.t1 || ''} onChange={(e) => updateRcdRow(rowId(row), { t1: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.t5 || ''} onChange={(e) => updateRcdRow(rowId(row), { t5: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.ramp || ''} onChange={(e) => updateRcdRow(rowId(row), { ramp: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.uc || ''} onChange={(e) => updateRcdRow(rowId(row), { uc: e.target.value })} /></td>
                      <td className="p-2">
                        <Select className="h-9 text-xs min-h-11" value={row.pass || 'Igen'} onChange={(e) => updateRcdRow(rowId(row), { pass: e.target.value })}>
                          <option value="Igen">Igen</option>
                          <option value="Nem">Nem</option>
                        </Select>
                      </td>
                      <td className="p-2 text-center cursor-pointer min-h-11" onClick={() => removeRcdRow(rowId(row))}>✕</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" className="min-h-11" onClick={addRcdRow}>+ RCD sor</Button>
          </div>

        </div>
      </div>
    </div>
    </fieldset>
  );
}
