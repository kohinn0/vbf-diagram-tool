import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { useDraftStore, useIsReportLocked } from '../store/draftStore';
import { toast } from '../lib/toast';
import { cn } from '../lib/utils';
import { PageActionBar } from '../components/ui/PageActionBar';

const defectTemplates = [
  "A biztosíték tábla nincs megfelelően feliratozva.",
  "A PE vezető keresztmetszete nem megfelelő.",
  "Szinjelzési hiba (zöld-sárga vezető fázisként használva).",
  "EPH csomópont kialakítása hiányos."
];

const SEVERITY_CONFIG = {
  kritikus: { label: "Kritikus", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  sulyos:   { label: "Súlyos",   className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  kozepes:  { label: "Közepes",  className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  egyedi:   { label: "Egyedi",   className: "bg-[var(--text-muted)]/15 text-[var(--text-muted)] border-[var(--border-color)]" },
} as const;

function DeleteIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  );
}

export default function DefectsTab() {
  const locked = useIsReportLocked();
  const { defects, addDefect, updateDefect, removeDefect, collectDefectsFromMeasurements } = useDraftStore();
  const [filter, setFilter] = useState("");

  const pendingCount = defects.filter(d => !d.isFixed).length;
  const headerDescription = defects.length === 0
    ? "Nincsenek bejegyett hibák"
    : `${defects.length} bejegyzés${pendingCount > 0 ? ` · ${pendingCount} javításra vár` : ''}`;

  const handleAddDefect = () => {
    addDefect({ description: "", location: "", severity: "sulyos", isFixed: false });
  };

  const filteredDefects = defects.filter(d => filter === "" || d.severity === filter);

  return (
    <fieldset disabled={locked} className="min-h-0 border-0 p-0 m-0 flex flex-col flex-1">
      <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[var(--bg-main)]">

        {/* Page header */}
        <PageActionBar title="Feltárt hibák és hiányosságok" description={headerDescription}>
          <Select
            className="h-8 text-xs w-40"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Összes súlyosság</option>
            <option value="kritikus">Kritikus</option>
            <option value="sulyos">Súlyos</option>
            <option value="kozepes">Közepes</option>
            <option value="egyedi">Egyedi</option>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => {
              const r = collectDefectsFromMeasurements();
              if (r.added > 0) toast.success(r.message);
              else toast.error(r.message);
            }}
          >
            Auto gyűjtés
          </Button>
          <Button size="sm" onClick={handleAddDefect}>+ Új hiba</Button>
        </PageActionBar>

        {/* Table area */}
        <div className="flex-1 overflow-auto">
          {filteredDefects.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6 py-16">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-[var(--text-muted)] opacity-40">
                <circle cx="24" cy="24" r="20" />
                <path d="M24 14v10l6 4" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-medium text-[var(--text-muted)]">Nincsenek feltárt hibák</p>
              <p className="text-xs text-[var(--text-muted)] opacity-70 max-w-xs">
                Kattints az „+ Új hiba" gombra, vagy használd az „Auto gyűjtés" funkciót a mérési adatokból.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-8">#</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Hiba leírása</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-28">Súlyosság</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-48 hidden sm:table-cell">Helyszín</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-32">Státusz</th>
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredDefects.map((defect, idx) => {
                  const sev = SEVERITY_CONFIG[defect.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.egyedi;
                  return (
                    <tr
                      key={defect.id}
                      className={cn(
                        "border-b border-[var(--border-color)] transition-colors",
                        "hover:bg-[var(--bg-input)]",
                        defect.isFixed && "opacity-50"
                      )}
                    >
                      {/* # */}
                      <td className="px-4 py-2 text-xs text-[var(--text-muted)] tabular-nums">
                        {idx + 1}
                      </td>

                      {/* Leírás */}
                      <td className="px-2 py-2">
                        <Input
                          list="defectTemplates"
                          className="h-8 text-xs w-full min-w-[200px]"
                          value={defect.description}
                          onChange={(e) => updateDefect(defect.id, { description: e.target.value })}
                          placeholder="Hiba leírása..."
                        />
                      </td>

                      {/* Súlyosság */}
                      <td className="px-2 py-2">
                        <select
                          value={defect.severity}
                          disabled={locked}
                          onChange={(e) => updateDefect(defect.id, { severity: e.target.value as never })}
                          className={cn(
                            "w-full h-8 rounded-md border px-2 text-xs font-semibold bg-transparent cursor-pointer appearance-none text-center",
                            sev.className
                          )}
                        >
                          <option value="kritikus">Kritikus</option>
                          <option value="sulyos">Súlyos</option>
                          <option value="kozepes">Közepes</option>
                          <option value="egyedi">Egyedi</option>
                        </select>
                      </td>

                      {/* Helyszín */}
                      <td className="px-2 py-2 hidden sm:table-cell">
                        <Input
                          className="h-8 text-xs w-full"
                          value={defect.location}
                          onChange={(e) => updateDefect(defect.id, { location: e.target.value })}
                          placeholder="Főelosztó..."
                        />
                      </td>

                      {/* Státusz toggle */}
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => updateDefect(defect.id, { isFixed: !defect.isFixed })}
                          className={cn(
                            "w-full h-8 rounded-md border text-xs font-semibold transition-colors",
                            defect.isFixed
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/20"
                          )}
                        >
                          {defect.isFixed ? "Kijavítva" : "Javításra vár"}
                        </button>
                      </td>

                      {/* Törlés */}
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeDefect(defect.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Hiba törlése"
                        >
                          <DeleteIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <datalist id="defectTemplates">
          {defectTemplates.map((t, idx) => <option key={idx} value={t} />)}
        </datalist>
      </div>
    </fieldset>
  );
}
