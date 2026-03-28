import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { useDraftStore } from '../store/draftStore';

export default function MeasurementsTab() {
  const { 
    measurementsData, updateMeasurementData,
    rpeRows, addRpeRow, updateRpeRow, removeRpeRow 
  } = useDraftStore();

  return (
    <div className="flex-1 w-full h-full overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Mérési adatok (kézi bevitel)</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
             Műszer Adat Import (PADFX, CSV, Fluke, Megger)
          </Button>
          <Button variant="secondary" size="sm">
             CSV export
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Bal oldali fastruktúra helye */}
        <div className="hidden lg:block w-64 bg-[var(--color-bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] p-4 shadow-sm">
          <p className="text-sm text-[var(--color-text-muted)]">Helyszínfa (Később integrálva)</p>
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
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-3 pb-2 border-b border-[var(--border-color)] mt-4">1. Védővezető folytonosság (Rpe)</h3>
            <div className="w-full overflow-hidden border border-[var(--border-color)] rounded-[var(--radius-vbf)] mb-3">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg-card)] border-b border-[var(--border-color)]">
                    <th className="p-3 text-sm font-semibold text-[var(--color-text-muted-strong)] w-16">Pont</th>
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

        </div>
      </div>
    </div>
  );
}
