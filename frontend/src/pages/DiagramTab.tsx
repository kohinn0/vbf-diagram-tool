import { useState, useRef } from 'react';
import { SymbolLibrary } from '../components/diagram/SymbolLibrary';
import { PropertiesPanel } from '../components/diagram/PropertiesPanel';
import { CanvasWorkspace, type CanvasRef } from '../components/diagram/CanvasWorkspace';
import { type SymbolDef } from '../components/diagram/diagram-utils';
import { Button } from '../components/ui/Button';

export default function DiagramTab() {
  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const canvasRef = useRef<CanvasRef>(null);

  const handleAddSymbol = (sym: SymbolDef) => {
    canvasRef.current?.addSymbol(sym);
  };

  const handleUpdateProperty = (key: string, value: string | boolean) => {
    canvasRef.current?.updateSelectedObject(key, value);
    // Erőltetett re-render a property panelhez:
    setSelectedObject((prev: any) => ({ ...prev, vbfData: { ...prev?.vbfData, [key]: value } }));
  };

  const handleDeleteLayer = () => {
    canvasRef.current?.deleteSelectedObject();
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-[var(--color-bg-main)]">
      {/* Eszköztár (Toolbar) Fejléc */}
      <div className="h-14 flex-shrink-0 bg-[var(--color-bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-4 z-10 shadow-sm relative">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-[var(--color-text-main)]">Rajz és Alaprajz Szerkesztő</h2>
          <div className="h-4 w-px bg-[var(--border-color)] mx-2"></div>
          
          {/* Alap eszközök (pl. mentés/letöltés/zoom) */}
          <Button variant="outline" size="sm" onClick={() => canvasRef.current?.clearCanvas()}>
            Üres vászon
          </Button>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
            PNG Export
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
            Többszörös kijelölés (Shift)
          </Button>
          <Button variant="default" size="sm">
            Alaprajz háttérkép +
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Bal oldali Sáv - Elem könyvtár */}
        <SymbolLibrary onAddSymbol={handleAddSymbol} />

        {/* Középső Vászon */}
        <CanvasWorkspace 
          ref={canvasRef} 
          onSelectionChange={setSelectedObject} 
        />

        {/* Jobb oldali Sáv - Tulajdonságok panel */}
        <PropertiesPanel 
          selectedObject={selectedObject} 
          onUpdateProperty={handleUpdateProperty}
          onDeleteLayer={handleDeleteLayer}
        />
      </div>
    </div>
  );
}
