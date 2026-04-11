import { useState, useRef } from 'react';
import { SymbolLibrary } from '../components/diagram/SymbolLibrary';
import { PropertiesPanel } from '../components/diagram/PropertiesPanel';
import { CanvasWorkspace, type CanvasRef } from '../components/diagram/CanvasWorkspace';
import { type SymbolDef } from '../components/diagram/diagram-utils';
import { runRpeAutoWire } from '../components/diagram/measurementAutoWire';
import { IEC_DIAGRAM_LEGEND_SHORT } from '../components/diagram/iecConductorStyle';
import type { fabric } from 'fabric';
import { useDraftStore, useIsReportLocked } from '../store/draftStore';
import { Button } from '../components/ui/Button';
import { toast } from '../lib/toast';

export default function DiagramTab() {
  const locked = useIsReportLocked();
  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const canvasRef = useRef<CanvasRef>(null);
  const activeCanvas = useDraftStore((s) => s.activeCanvas);
  const rpeRows = useDraftStore((s) => s.rpeRows);

  const handleAddSymbol = (sym: SymbolDef) => {
    if (locked) return;
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
    <div className="flex h-full min-h-0 w-full flex-1 flex-col bg-[var(--color-bg-main)]">
      {/* Eszköztár (Toolbar) Fejléc */}
      <div className="h-14 flex-shrink-0 bg-[var(--color-bg-card)] border-b border-[var(--border-color)] flex items-center justify-between px-4 z-10 shadow-sm relative">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-[var(--color-text-main)]">Rajz és Alaprajz Szerkesztő</h2>
          <div className="h-4 w-px bg-[var(--border-color)] mx-2"></div>
          
          {/* Alap eszközök (pl. mentés/letöltés/zoom) */}
          <Button
            variant="default"
            size="sm"
            className="min-h-11"
            disabled={locked}
            title="RPE tábla Pont ↔ elem Felirat alapján láncolja az ortogonális vonalakat (újra kattintáskor az RPE-vonalak frissülnek)"
            onClick={() => {
              const r = runRpeAutoWire(activeCanvas as fabric.Canvas | null, rpeRows);
              toast.success(r.detail);
            }}
          >
            RPE → vonalak
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="min-h-11"
            disabled={locked}
            title="Jelölj ki két elemet Shift+kattal, majd kattints ide"
            onClick={() => canvasRef.current?.connectSelectedObjects()}
          >
            Kézi vonal
          </Button>
          <Button variant="outline" size="sm" disabled={locked} onClick={() => canvasRef.current?.clearCanvas()}>
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

      <details className="flex-shrink-0 px-4 py-2 border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--primary)_6%,var(--color-bg-card))] text-sm text-[var(--color-text-muted)]">
        <summary className="cursor-pointer min-h-11 flex items-center font-medium text-[var(--color-text-main)] list-none [&::-webkit-details-marker]:hidden">
          Szabványos jelölés (IEC / MSZ)
        </summary>
        <p className="pt-2 pb-1 leading-relaxed max-w-4xl">{IEC_DIAGRAM_LEGEND_SHORT}</p>
      </details>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <SymbolLibrary onAddSymbol={handleAddSymbol} />

        <CanvasWorkspace
          ref={canvasRef}
          onSelectionChange={setSelectedObject}
        />

        <PropertiesPanel
          selectedObject={selectedObject}
          onUpdateProperty={handleUpdateProperty}
          onDeleteLayer={handleDeleteLayer}
        />

        {locked && (
          <div
            className="absolute inset-0 z-50 flex items-start justify-center bg-black/30 pt-10 pointer-events-auto backdrop-blur-[1px]"
            aria-hidden
          >
            <p className="max-w-md rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100 shadow-lg">
              Véglegesített jegyzőkönyv — a rajz nem szerkeszthető.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
