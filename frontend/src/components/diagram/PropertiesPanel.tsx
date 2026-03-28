import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

// A "selectedObject" típusát leegyszerűsítjük, mert a fabric Object egyedi metódusokkal rendelkezik
interface PropertiesPanelProps {
  selectedObject: any | null;
  onUpdateProperty: (key: string, value: string | boolean) => void;
  onDeleteLayer?: () => void;
}

export function PropertiesPanel({ selectedObject, onUpdateProperty, onDeleteLayer }: PropertiesPanelProps) {
  if (!selectedObject || !selectedObject.vbfData) {
    return (
      <div className="w-[320px] flex-shrink-0 h-full bg-[var(--color-bg-card)] border-l border-[var(--border-color)] p-6">
        <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-1">Tulajdonságok</h2>
        <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)] text-center pb-20">
          <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <p>Kattints egy elemre a vásznon a szerkesztéshez.</p>
        </div>
      </div>
    );
  }

  const data = selectedObject.vbfData;

  return (
    <div className="w-[320px] flex-shrink-0 h-full overflow-y-auto bg-[var(--color-bg-card)] border-l border-[var(--border-color)] p-4 flex flex-col">
      <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-4">Elem Tulajdonságai</h2>
      
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-muted-strong)] uppercase tracking-wider">Típus</label>
          <Input value={data.type || ''} disabled className="bg-[var(--color-bg-main)] opacity-70" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-muted-strong)] uppercase tracking-wider">Megnevezés</label>
          <Input 
            value={data.name || ''} 
            onChange={(e) => onUpdateProperty('name', e.target.value)} 
            placeholder="Elem neve"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-muted-strong)] uppercase tracking-wider">Felirat a rajzon</label>
          <Input 
            value={data.label || ''} 
            onChange={(e) => onUpdateProperty('label', e.target.value)} 
            placeholder="pl. Nappali vagy F1"
          />
        </div>

        {!data.isArch && (
          <>
            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-xs font-semibold text-[var(--color-text-muted-strong)] uppercase tracking-wider">Névleges Áram (A)</label>
              <Select 
                value={data.rating || '16A'} 
                onChange={(e) => onUpdateProperty('rating', e.target.value)}
              >
                <option value="6A">6 A</option>
                <option value="10A">10 A</option>
                <option value="13A">13 A</option>
                <option value="16A">16 A</option>
                <option value="20A">20 A</option>
                <option value="25A">25 A</option>
                <option value="32A">32 A</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-muted-strong)] uppercase tracking-wider">Vezeték típusa</label>
              <Input 
                value={data.cable || ''} 
                onChange={(e) => onUpdateProperty('cable', e.target.value)} 
                placeholder="MBCU 3x2.5"
              />
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
          <Button 
            variant="outline" 
            className="w-full justify-start text-left mb-2"
            onClick={() => onUpdateProperty('locked', !data.locked)}
          >
            {data.locked ? '🔓 Zárolás feloldása' : '🔒 Elem zárolása (nem mozgatható)'}
          </Button>
          <Button 
            variant="danger" 
            className="w-full justify-start text-left"
            onClick={onDeleteLayer}
          >
            🗑️ Elem törlése
          </Button>
        </div>
      </div>
    </div>
  );
}
