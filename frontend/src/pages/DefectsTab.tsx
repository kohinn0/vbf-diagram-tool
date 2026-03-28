import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { useDraftStore } from '../store/draftStore';

const defectTemplates = [
  "A biztosíték tábla nincs megfelelően feliratozva.",
  "A PE vezető keresztmetszete nem megfelelő.",
  "Szinjelzési hiba (zöld-sárga vezető fázisként használva).",
  "EPH csomópont kialakítása hiányos."
];

export default function DefectsTab() {
  const { defects, addDefect, updateDefect, removeDefect } = useDraftStore();
  const [filter, setFilter] = useState("");

  const handleAddDefect = () => {
    addDefect({
      description: "",
      location: "",
      severity: "sulyos",
      isFixed: false
    });
  };

  const filteredDefects = defects.filter(d => filter === "" || d.severity === filter);

  return (
    <div className="flex-1 w-full h-full flex flex-col p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <div className="flex flex-col h-full rounded-xl border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-panel)_80%,transparent)] p-6 shadow-sm md:p-8">
        
        <header className="shrink-0 border-b border-[var(--border-color)] pb-4 mb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="min-w-0 flex flex-col gap-3">
              <h2 className="text-xl font-semibold text-[var(--color-text-main)] sm:text-[1.35rem] leading-tight m-0">Feltárt Hibák és Hiányosságok</h2>
              <div className="flex flex-wrap items-center gap-2">
                <label className="shrink-0 text-sm text-[var(--color-text-muted)]">Szűrés:</label>
                <Select 
                  className="w-full sm:w-auto"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">Összes hiba</option>
                  <option value="kritikus">Kritikus</option>
                  <option value="sulyos">Súlyos</option>
                  <option value="kozepes">Közepes</option>
                  <option value="egyedi">Egyedi (sablon nélkül)</option>
                </Select>
              </div>
            </div>
            
            <div className="flex w-full shrink-0 flex-wrap gap-2 md:w-auto md:justify-end md:pt-0.5">
              <Button variant="secondary" size="sm">Automatikus gyűjtés</Button>
              <Button onClick={handleAddDefect} size="sm">Új hiba</Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-6">
          {filteredDefects.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[var(--color-text-muted)]">Nincsenek feltárt hibák. Kattints az "Új hiba" gombra.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDefects.map((defect) => (
                <Card key={defect.id} className={`border-l-4 ${defect.isFixed ? 'border-l-green-500 opacity-60' : defect.severity === 'kritikus' ? 'border-l-red-600' : defect.severity === 'sulyos' ? 'border-l-orange-500' : 'border-l-yellow-400'}`}>
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <label className="text-xs text-[var(--color-text-muted-strong)] uppercase tracking-wider mb-1 block">Hiba leírása</label>
                        <Input 
                          list="defectTemplates"
                          className="w-full"
                          value={defect.description}
                          onChange={(e) => updateDefect(defect.id, { description: e.target.value })}
                          placeholder="pl. A biztosíték tábla nincs feliratozva..."
                        />
                      </div>
                      <Button variant="ghost" size="sm" className="ml-2 text-red-500" onClick={() => removeDefect(defect.id)}>✕</Button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-[var(--color-text-muted-strong)] uppercase tracking-wider mb-1 block">Súlyosság</label>
                        <Select
                          value={defect.severity}
                          onChange={(e) => updateDefect(defect.id, { severity: e.target.value as any })}
                        >
                          <option value="kritikus">Kritikus</option>
                          <option value="sulyos">Súlyos</option>
                          <option value="kozepes">Közepes</option>
                          <option value="egyedi">Egyedi</option>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-xs text-[var(--color-text-muted-strong)] uppercase tracking-wider mb-1 block">Fizikai helyzet</label>
                        <Input 
                          value={defect.location}
                          onChange={(e) => updateDefect(defect.id, { location: e.target.value })}
                          placeholder="Főelosztó, 2. emelet..."
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <Button 
                          variant={defect.isFixed ? "outline" : "secondary"} 
                          className="w-full"
                          onClick={() => updateDefect(defect.id, { isFixed: !defect.isFixed })}
                        >
                          {defect.isFixed ? '✅ Kijavítva' : '⏳ Javításra vár'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          <datalist id="defectTemplates">
            {defectTemplates.map((t, idx) => <option key={idx} value={t} />)}
          </datalist>
        </div>
      </div>
    </div>
  );
}
