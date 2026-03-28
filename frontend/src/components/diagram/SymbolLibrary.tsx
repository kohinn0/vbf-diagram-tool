import { type SymbolDef, powerSymbols, connectionSymbols, consumerSymbols, archSymbols } from './diagram-utils';

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
    <div className="w-[300px] flex-shrink-0 h-full overflow-y-auto bg-[var(--color-bg-card)] border-r border-[var(--border-color)] p-4">
      <h2 className="text-lg font-bold text-[var(--color-text-main)] mb-1">VBF Eszköztár</h2>
      <p className="text-xs text-[var(--color-text-muted)] mb-5">Kattints a vászonra helyezéshez</p>
      
      {renderGroup('Védelem és Elosztás', powerSymbols)}
      {renderGroup('Kötések és Csatlakozások', connectionSymbols)}
      {renderGroup('Fogyasztók', consumerSymbols)}
      {renderGroup('Építészeti Elemek', archSymbols)}
    </div>
  );
}
