import { useRef, useState, Fragment } from 'react';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { calcZsMax } from '../lib/measurementAutoPass';
import {
  loadTemplates,
  saveNewTemplate,
  deleteTemplate,
  type MeasurementTemplate,
} from '../lib/measurementTemplateStorage';
import type { fabric } from 'fabric';
import { runRpeAutoWire } from '../components/diagram/measurementAutoWire';
import { uploadPadfxFile } from '../lib/api';
import type { PadfxXmlMeasurement } from '../lib/padfxMerge';
import { useDraftStore, useIsReportLocked } from '../store/draftStore';
import { toast } from '../lib/toast';
import { SiteTreePanel } from '../components/measurements/SiteTreePanel';
import { SiteNodeSelect } from '../components/measurements/SiteNodeSelect';
import { MEASUREMENT_THRESHOLDS_BULLETS, MEASUREMENT_THRESHOLDS_SECTION_TITLE } from '../lib/measurementThresholds';
import { downloadMeasurementsCsv } from '../lib/exportMeasurementsCsv';

// ── Kép tömörítés ────────────────────────────────────────────────────────────

async function compressImage(file: File, maxPx = 800, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kép betöltési hiba')); };
    img.src = url;
  });
}

// ── Melléklet gomb ───────────────────────────────────────────────────────────

function AttachBtn({ hasContent, onClick }: { hasContent: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-7 h-7 rounded flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--primary,#4f46e5)] hover:bg-[color-mix(in_srgb,var(--primary,#4f46e5)_10%,transparent)] transition-colors"
      title="Megjegyzés / fotó csatolása"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="w-4 h-4">
        <path d="M2 4h12M2 8h12M2 12h7" />
      </svg>
      {hasContent && (
        <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[var(--primary,#4f46e5)]" />
      )}
    </button>
  );
}

// ── Expandált melléklet sor ───────────────────────────────────────────────────

function RowAttachment({
  colSpan, note, photo,
  onNoteChange, onPhotoChange,
}: {
  colSpan: number;
  note: string;
  photo: string;
  onNoteChange: (v: string) => void;
  onPhotoChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  return (
    <tr className="bg-[color-mix(in_srgb,var(--primary,#4f46e5)_4%,var(--color-bg-input))]">
      <td colSpan={colSpan} className="px-4 py-3">
        <div className="flex gap-3 items-start">
          <textarea
            className="flex-1 text-xs rounded-lg border border-[var(--border-color)] bg-transparent p-2 min-h-[56px] resize-y focus:outline-none focus:border-[var(--primary,#4f46e5)]"
            placeholder="Megjegyzés ehhez a sorhoz (megjelenik a Word exportban)..."
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
          />
          <div className="flex flex-col gap-2 items-center shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setUploading(true);
                try {
                  onPhotoChange(await compressImage(file));
                } catch {
                  toast.error('Kép betöltési hiba');
                } finally {
                  setUploading(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-[11px] rounded border border-[var(--border-color)] px-2 py-1 hover:bg-[var(--color-bg-card)] transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {uploading ? '…' : '📷 Fotó'}
            </button>
            {photo && (
              <>
                <img
                  src={photo}
                  alt="Melléklet"
                  className="w-16 h-16 object-cover rounded-lg border border-[var(--border-color)] cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(photo, '_blank')}
                  title="Megnyitás teljes méretben"
                />
                <button
                  type="button"
                  className="text-[10px] text-red-400 hover:underline"
                  onClick={() => onPhotoChange('')}
                >
                  Törlés
                </button>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
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
    ephContRows, addEphContRow, updateEphContRow, removeEphContRow,
  } = useDraftStore();
  const reportData = useDraftStore((s) => s.reportData);
  const siteTree = useDraftStore((s) => s.siteTree);
  const isEph = reportData.docType === 'EPH';

  const rowId = (r: Record<string, string>) => (r as { id?: string }).id || '';
  const activeCanvas = useDraftStore((s) => s.activeCanvas);
  const appendPadfxImport = useDraftStore((s) => s.appendPadfxImport);
  const loadMeasurementTemplate = useDraftStore((s) => s.loadMeasurementTemplate);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [padfxLoading, setPadfxLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => setExpandedRows((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [templates, setTemplates] = useState<MeasurementTemplate[]>(() => loadTemplates());

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
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Mérési adatok (kézi bevitel)</h2>
          {isEph && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1 m-0">
              EPH jegyzőkönyv: a VBF táblázatok (Rpe, Zs, Riso, RCD) itt elrejtve; az „EPH bekötések folytonossága” táblát töltsd ki.
            </p>
          )}
        </div>
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
          <Button
            variant="secondary"
            size="sm"
            className="min-h-11"
            title="Bejövő paraméterek + Rpe / Zs / Riso / RCD táblák — UTF-8, pontosvessző (Excel HU)"
            onClick={() => {
              try {
                downloadMeasurementsCsv({
                  reportData,
                  measurementsData,
                  rpeRows,
                  loopRows,
                  insulationRows,
                  rcdRows,
                  ephContRows,
                  siteTree,
                });
                toast.success('CSV letöltve (UTF-8, pontosvessző).');
              } catch (e: unknown) {
                toast.error(e instanceof Error ? e.message : 'Export hiba');
              }
            }}
          >
            CSV export
          </Button>

          {/* Sablonok */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={locked}
              onClick={() => { setTemplates(loadTemplates()); setTplOpen((v) => !v); }}
            >
              Sablonok ▾
            </Button>
            {tplOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-xl border border-[var(--border-color)] bg-[var(--color-bg-card)] shadow-xl p-4 flex flex-col gap-3">
                {/* Mentés */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-[var(--color-text-main)]">Mentés sablonként</p>
                  <div className="flex gap-2">
                    <Input
                      className="h-8 text-xs flex-1"
                      placeholder="pl. Tipikus lakás – 6 kör"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                    />
                    <Button
                      size="sm"
                      disabled={!tplName.trim()}
                      onClick={() => {
                        saveNewTemplate(tplName, {
                          rpePoints: rpeRows.map((r) => ({ point: r.point, location: r.location })),
                          loopCircuits: loopRows.map((r) => ({
                            circuit: r.circuit || '',
                            device: r.device || '',
                            device_type: r.device_type || '',
                            in_rating: r.in_rating || '',
                            loc: r.loc || '',
                          })),
                          insulationCircuits: insulationRows.map((r) => ({ circuit: r.circuit || '' })),
                          rcdCircuits: rcdRows.map((r) => ({
                            circ: r.circ || '',
                            type: r.type || 'A',
                            idn: r.idn || '',
                          })),
                        });
                        setTemplates(loadTemplates());
                        setTplName('');
                        toast.success('Sablon mentve.');
                      }}
                    >
                      Mentés
                    </Button>
                  </div>
                </div>

                {/* Betöltés */}
                {templates.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-[var(--color-text-main)]">Mentett sablonok</p>
                    <ul className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                      {templates.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--color-bg-input)]">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[var(--color-text-main)] truncate">{t.name}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">
                              {t.rpePoints.length} Rpe · {t.loopCircuits.length} Zs · {t.insulationCircuits.length} Riso · {t.rcdCircuits.length} RCD
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              if (!window.confirm(`„${t.name}" betöltése felülírja a jelenlegi mérési sorokat. Folytatod?`)) return;
                              loadMeasurementTemplate(t);
                              setTplOpen(false);
                              toast.success(`„${t.name}" sablon betöltve.`);
                            }}
                          >
                            Betölt
                          </Button>
                          <button
                            type="button"
                            className="text-[var(--color-text-muted)] hover:text-red-400 text-xs px-1"
                            title="Törlés"
                            onClick={() => {
                              deleteTemplate(t.id);
                              setTemplates(loadTemplates());
                            }}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {templates.length === 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] text-center py-2">Még nincs mentett sablon.</p>
                )}
              </div>
            )}
          </div>
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

          {isEph && (
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2 pb-2 border-b border-[var(--border-color)]">
              EPH bekötések folytonossága
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-3 leading-relaxed">
              A Word/PDF „Mérési eredmények” szakaszban ez a táblázat jelenik meg (MSZ HD 60364-6 szerinti kiegészítő mérés).
            </p>
            <div className="w-full overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-vbf)] mb-3">
              <table className="w-full text-left border-collapse min-w-[920px]">
                <thead>
                  <tr className="bg-[var(--color-bg-card)] border-b border-[var(--border-color)]">
                    <th className="p-2 text-xs font-semibold min-w-[120px]">Helyszín</th>
                    <th className="p-2 text-xs font-semibold w-14">Sorsz.</th>
                    <th className="p-2 text-xs font-semibold min-w-[100px]">Bekötött elem</th>
                    <th className="p-2 text-xs font-semibold min-w-[100px]">Hely</th>
                    <th className="p-2 text-xs font-semibold min-w-[88px]">Vezető (mm²)</th>
                    <th className="p-2 text-xs font-semibold min-w-[88px]">Kötés módja</th>
                    <th className="p-2 text-xs font-semibold w-24">Folyt. [Ω]</th>
                    <th className="p-2 text-xs font-semibold w-28">Megfelel</th>
                    <th className="p-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {ephContRows.map((row) => (
                    <tr key={rowId(row)} className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)]">
                      <td className="p-2">
                        <SiteNodeSelect
                          value={row.node_id || ''}
                          disabled={locked}
                          onChange={(v) => updateEphContRow(rowId(row), { node_id: v })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-9 text-xs min-h-11 text-center"
                          value={row.idx || ''}
                          onChange={(e) => updateEphContRow(rowId(row), { idx: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-9 text-xs min-h-11"
                          value={row.elem || ''}
                          onChange={(e) => updateEphContRow(rowId(row), { elem: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-9 text-xs min-h-11"
                          value={row.loc || ''}
                          onChange={(e) => updateEphContRow(rowId(row), { loc: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-9 text-xs min-h-11"
                          value={row.mat || ''}
                          onChange={(e) => updateEphContRow(rowId(row), { mat: e.target.value })}
                          placeholder="pl. 16"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-9 text-xs min-h-11"
                          value={row.conn || ''}
                          onChange={(e) => updateEphContRow(rowId(row), { conn: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-9 text-xs min-h-11"
                          type="number"
                          step="0.01"
                          value={row.val || ''}
                          onChange={(e) => updateEphContRow(rowId(row), { val: e.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          className="h-9 text-xs min-h-11"
                          value={row.pass || 'Igen'}
                          onChange={(e) => updateEphContRow(rowId(row), { pass: e.target.value })}
                        >
                          <option value="Igen">Igen</option>
                          <option value="Nem">Nem</option>
                        </Select>
                      </td>
                      <td className="p-2 text-center cursor-pointer text-[var(--color-text-muted)] hover:text-red-500 min-h-11" onClick={() => removeEphContRow(rowId(row))}>
                        ✕
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" className="min-h-11" onClick={addEphContRow}>
              + EPH sor
            </Button>
          </div>
          )}

          {/* 1–4. VBF táblázatok */}
          {!isEph && (
          <>
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
                    <Fragment key={row.id}>
                    <tr className="bg-[var(--color-bg-input)] border-b border-[var(--border-color)] group hover:bg-[color-mix(in_srgb,var(--primary)_5%,var(--color-bg-input))] transition-colors">
                      <td className="p-2">
                        <Input className="h-8 text-center text-xs" value={row.point} onChange={e => updateRpeRow(row.id, { point: e.target.value })} />
                      </td>
                      <td className="p-2 min-w-[140px]">
                        <SiteNodeSelect value={row.node_id || ''} disabled={locked} onChange={(v) => updateRpeRow(row.id, { node_id: v || undefined })} />
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
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AttachBtn hasContent={!!(row.note || row.photo)} onClick={() => toggleRow(row.id)} />
                          <button type="button" className="text-[var(--color-text-muted)] hover:text-red-500 w-7 h-7 flex items-center justify-center" onClick={() => removeRpeRow(row.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(row.id) && (
                      <RowAttachment colSpan={6} note={row.note || ''} photo={row.photo || ''}
                        onNoteChange={(v) => updateRpeRow(row.id, { note: v })}
                        onPhotoChange={(v) => updateRpeRow(row.id, { photo: v })} />
                    )}
                    </Fragment>
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
            {(() => {
              const sys = measurementsData['inSystemType'] || '';
              if (sys === 'TT') return (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <span className="shrink-0 font-bold">TT rendszer:</span>
                  <span>A Zs ≤ U₀×0,95/Ia formula TT rendszernél nem alkalmazható. Védelmet FI-relé (ÁVK) biztosít: Ra×IΔn ≤ 50 V (IEC 60364-4-41 §411.5.3). Az automatikus Megfelel számítás ki van kapcsolva — töltsd ki az RCD táblát.</span>
                </div>
              );
              if (sys === 'IT') return (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/8 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                  <span className="shrink-0 font-bold">IT rendszer:</span>
                  <span>Elszigetelt semleges — az első földhiba nem okoz veszélyes érintési feszültséget. A hurokellenállás mérés elvégezhető, de az automatikus küszöbértékelés nem alkalmazható. Ellenőrizd a szigetelés-figyelőt (IMD).</span>
                </div>
              );
              if (!sys) return (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  <span>Tipp: a Bejövő paraméterek &rarr; Rendszer típusa (TN-S/TN-C/TT/IT) megadásával az automatikus Zs_max számítás pontosabb lesz.</span>
                </div>
              );
              return null;
            })()}
            <div className="w-full overflow-x-auto border border-[var(--border-color)] rounded-[var(--radius-vbf)] mb-3">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[var(--color-bg-card)] border-b border-[var(--border-color)]">
                    <th className="p-2 text-xs font-semibold min-w-[120px]">Helyszín</th>
                    <th className="p-2 text-xs font-semibold">Áramkör / pont</th>
                    <th className="p-2 text-xs font-semibold w-20">Tip.</th>
                    <th className="p-2 text-xs font-semibold w-20">In [A]</th>
                    <th className="p-2 text-xs font-semibold">Hely</th>
                    <th className="p-2 text-xs font-semibold w-28">Zs [Ω] / max</th>
                    <th className="p-2 text-xs font-semibold w-28">Megfelel</th>
                    <th className="p-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {loopRows.map((row) => {
                    const id = rowId(row);
                    const zsMax = calcZsMax(row.device_type || '', row.in_rating || '', measurementsData['inSystemType'] || '');
                    return (
                    <Fragment key={id}>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)]">
                      <td className="p-2"><SiteNodeSelect value={row.node_id || ''} disabled={locked} onChange={(v) => updateLoopRow(id, { node_id: v })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.circuit || ''} onChange={(e) => updateLoopRow(id, { circuit: e.target.value })} /></td>
                      <td className="p-2">
                        <Select className="h-9 text-xs min-h-11" value={row.device_type || ''} onChange={(e) => updateLoopRow(id, { device_type: e.target.value })}>
                          <option value="">—</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="gG">gG</option>
                        </Select>
                      </td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" type="number" placeholder="16" value={row.in_rating || ''} onChange={(e) => updateLoopRow(id, { in_rating: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.loc || ''} onChange={(e) => updateLoopRow(id, { loc: e.target.value })} /></td>
                      <td className="p-2">
                        <Input className="h-9 text-xs min-h-11" type="number" step="0.01" value={row.zs || ''} onChange={(e) => updateLoopRow(id, { zs: e.target.value })} />
                        {zsMax !== null && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 px-1">max: {zsMax.toFixed(3)} Ω</p>}
                      </td>
                      <td className="p-2">
                        <Select className="h-9 text-xs min-h-11" value={row.pass || 'Igen'} onChange={(e) => updateLoopRow(id, { pass: e.target.value })}>
                          <option value="Igen">Igen</option>
                          <option value="Nem">Nem</option>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AttachBtn hasContent={!!(row.note || row.photo)} onClick={() => toggleRow(id)} />
                          <button type="button" className="text-[var(--color-text-muted)] hover:text-red-500 w-7 h-7 flex items-center justify-center" onClick={() => removeLoopRow(id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(id) && (
                      <RowAttachment colSpan={8} note={row.note || ''} photo={row.photo || ''}
                        onNoteChange={(v) => updateLoopRow(id, { note: v })}
                        onPhotoChange={(v) => updateLoopRow(id, { photo: v })} />
                    )}
                    </Fragment>
                    );
                  })}
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
                  {insulationRows.map((row) => {
                    const id = rowId(row);
                    return (
                    <Fragment key={id}>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)]">
                      <td className="p-2">
                        <SiteNodeSelect
                          value={row.node_id || ''}
                          disabled={locked}
                          onChange={(v) => updateInsulationRow(id, { node_id: v })}
                        />
                      </td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.circuit || ''} onChange={(e) => updateInsulationRow(id, { circuit: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.ln || ''} onChange={(e) => updateInsulationRow(id, { ln: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.lpe || ''} onChange={(e) => updateInsulationRow(id, { lpe: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.npe || ''} onChange={(e) => updateInsulationRow(id, { npe: e.target.value })} /></td>
                      <td className="p-2">
                        <Select className="h-9 text-xs min-h-11" value={row.pass || 'Igen'} onChange={(e) => updateInsulationRow(id, { pass: e.target.value })}>
                          <option value="Igen">Igen</option>
                          <option value="Nem">Nem</option>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AttachBtn hasContent={!!(row.note || row.photo)} onClick={() => toggleRow(id)} />
                          <button type="button" className="text-[var(--color-text-muted)] hover:text-red-500 w-7 h-7 flex items-center justify-center" onClick={() => removeInsulationRow(id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(id) && (
                      <RowAttachment colSpan={7} note={row.note || ''} photo={row.photo || ''}
                        onNoteChange={(v) => updateInsulationRow(id, { note: v })}
                        onPhotoChange={(v) => updateInsulationRow(id, { photo: v })} />
                    )}
                    </Fragment>
                    );
                  })}
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
                  {rcdRows.map((row) => {
                    const id = rowId(row);
                    return (
                    <Fragment key={id}>
                    <tr className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)]">
                      <td className="p-2">
                        <SiteNodeSelect
                          value={row.node_id || ''}
                          disabled={locked}
                          onChange={(v) => updateRcdRow(id, { node_id: v })}
                        />
                      </td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.circ || ''} onChange={(e) => updateRcdRow(id, { circ: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.type || ''} onChange={(e) => updateRcdRow(id, { type: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.idn || ''} onChange={(e) => updateRcdRow(id, { idn: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.test05 || ''} onChange={(e) => updateRcdRow(id, { test05: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.t1 || ''} onChange={(e) => updateRcdRow(id, { t1: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.t5 || ''} onChange={(e) => updateRcdRow(id, { t5: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.ramp || ''} onChange={(e) => updateRcdRow(id, { ramp: e.target.value })} /></td>
                      <td className="p-2"><Input className="h-9 text-xs min-h-11" value={row.uc || ''} onChange={(e) => updateRcdRow(id, { uc: e.target.value })} /></td>
                      <td className="p-2">
                        <Select className="h-9 text-xs min-h-11" value={row.pass || 'Igen'} onChange={(e) => updateRcdRow(id, { pass: e.target.value })}>
                          <option value="Igen">Igen</option>
                          <option value="Nem">Nem</option>
                        </Select>
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AttachBtn hasContent={!!(row.note || row.photo)} onClick={() => toggleRow(id)} />
                          <button type="button" className="text-[var(--color-text-muted)] hover:text-red-500 w-7 h-7 flex items-center justify-center" onClick={() => removeRcdRow(id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(id) && (
                      <RowAttachment colSpan={11} note={row.note || ''} photo={row.photo || ''}
                        onNoteChange={(v) => updateRcdRow(id, { note: v })}
                        onPhotoChange={(v) => updateRcdRow(id, { photo: v })} />
                    )}
                    </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button variant="secondary" size="sm" className="min-h-11" onClick={addRcdRow}>+ RCD sor</Button>
          </div>
          </>
          )}

        </div>
      </div>
    </div>
    </fieldset>
  );
}
