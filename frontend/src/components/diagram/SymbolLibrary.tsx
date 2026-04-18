import {
  type SymbolDef,
  powerSymbols,
  connectionSymbolsWithoutEph,
  consumerSymbols,
  archSymbols,
  ephSymbol,
} from './diagram-utils';

interface SymbolLibraryProps {
  onAddSymbol: (sym: SymbolDef) => void;
}

export function SymbolLibrary({ onAddSymbol }: SymbolLibraryProps) {
  const renderGroup = (title: string, symbols: SymbolDef[]) => (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {symbols.map(sym => (
          <div
            key={sym.id}
            onClick={() => onAddSymbol(sym)}
            className="flex flex-col items-center justify-center p-2 min-h-[5rem] bg-[var(--color-bg-input)] border border-[var(--border-color)] rounded-[var(--radius-vbf)] cursor-pointer hover:border-primary hover:-translate-y-0.5 hover:shadow-md transition-all group"
          >
            <svg 
              viewBox="0 0 32 32" 
              className="w-8 h-8 stroke-[var(--color-text-main)] stroke-2 fill-none group-hover:stroke-primary transition-colors mb-1"
              dangerouslySetInnerHTML={{ __html: sym.svgPath }}
            />
            <span className="text-[10px] text-center text-[var(--color-text-muted)] leading-tight">{sym.name}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-[min(100%,260px)] shrink-0 flex-col overflow-y-auto border-r border-[var(--border-color)] bg-[var(--color-bg-card)] p-3 sm:w-[min(100%,280px)] sm:p-4 xl:w-[300px]">
      <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-1">VBF / EPH eszköztár</h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-1">IEC 60617 / HD 637 jellegű egysoros szimbólumok</p>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">Kattints — a vászon közepére kerül</p>

      {renderGroup('EPH (egyenpotenciál)', [ephSymbol])}
      {renderGroup('Védelem és Elosztás', powerSymbols)}
      {renderGroup('Kötések és Csatlakozások', connectionSymbolsWithoutEph)}
      {renderGroup('Fogyasztók', consumerSymbols)}
      {renderGroup('Építészeti Elemek', archSymbols)}
    </div>
  );
}
