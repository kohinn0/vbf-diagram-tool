import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { fabric } from 'fabric';
import { type SymbolDef } from './diagram-utils';
import { useDraftStore } from '../../store/draftStore';
import { toast } from '../../lib/toast';
import { splitDiagramPayload } from '../../lib/diagramPayload';
import {
  computeOrthogonalRoute,
  connectionPairExists,
  createConnectionLineObject,
  ensureElementId,
  isConnectionLine,
  isWireEndpoint,
  pointsToPathString,
  restyleConnectionPathFromVbfData,
  type ConnectionLineVbfData,
} from './orthogonalWire';

export interface CanvasRef {
  addSymbol: (sym: SymbolDef) => void;
  updateSelectedObject: (key: string, value: any) => void;
  deleteSelectedObject: () => void;
  clearCanvas: () => void;
  /** Pontosan 2 nem-vonal elem kijelölése (Shift + katt), majd hívás. */
  connectSelectedObjects: () => boolean;
}

interface CanvasWorkspaceProps {
  onSelectionChange: (selectedObject: any | null) => void;
}

export const CanvasWorkspace = forwardRef<CanvasRef, CanvasWorkspaceProps>(({ onSelectionChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const pendingDiagramData = useDraftStore((s) => s.pendingDiagramData);

  useEffect(() => {
    if (!canvasElementRef.current || !containerRef.current) return;

    // Canvas inicializálása
    const canvas = new fabric.Canvas(canvasElementRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      selection: true,
      backgroundColor: 'var(--color-bg-card)',
    });
    fabricRef.current = canvas;

    const refreshConnectionLines = () => {
      canvas.getObjects().forEach((obj) => {
        const o = obj as fabric.Path & { vbfData?: { type?: string; fromId?: string; toId?: string } };
        if (o.vbfData?.type !== 'connectionLine') return;
        const fromId = o.vbfData.fromId;
        const toId = o.vbfData.toId;
        if (!fromId || !toId) return;
        const a = canvas.getObjects().find(
          (x) => (x as { vbfData?: { elementId?: string } }).vbfData?.elementId === fromId
        ) as fabric.Object | undefined;
        const b = canvas.getObjects().find(
          (x) => (x as { vbfData?: { elementId?: string } }).vbfData?.elementId === toId
        ) as fabric.Object | undefined;
        if (!a || !b) return;
        const pts = computeOrthogonalRoute(a, b);
        const d = pointsToPathString(pts);
        (o as fabric.Path & { _setPath: (path: string | unknown[]) => void })._setPath(d);
        o.setCoords();
        restyleConnectionPathFromVbfData(o, o.vbfData as ConnectionLineVbfData | undefined);
      });
      canvas.requestRenderAll();
    };

    let wireRaf = 0;
    const scheduleWireRefresh = () => {
      if (wireRaf) return;
      wireRaf = requestAnimationFrame(() => {
        wireRaf = 0;
        refreshConnectionLines();
      });
    };

    const onObjectRemoved = (e: { target?: unknown }) => {
      const target = e.target as { vbfData?: { type?: string; elementId?: string } } | undefined;
      if (!target || isConnectionLine(target)) return;
      const id = target.vbfData?.elementId;
      if (!id) return;
      const toRemove = canvas.getObjects().filter((obj) => {
        const v = (obj as { vbfData?: { type?: string; fromId?: string; toId?: string } }).vbfData;
        return v?.type === 'connectionLine' && (v.fromId === id || v.toId === id);
      });
      toRemove.forEach((obj) => canvas.remove(obj));
    };

    canvas.on('object:moving', scheduleWireRefresh);
    canvas.on('object:modified', refreshConnectionLines);
    canvas.on('object:removed', onObjectRemoved);

    useDraftStore.getState().setActiveCanvas(canvas);

    // Kijelölési események
    canvas.on('selection:created', (e) => onSelectionChange(e.selected?.[0] || null));
    canvas.on('selection:updated', (e) => onSelectionChange(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => onSelectionChange(null));
    
    // Zoom / Pan alapok
    canvas.on('mouse:wheel', function(opt) {
      if (!opt.e.ctrlKey && !opt.e.metaKey) return;
      opt.e.preventDefault();
      opt.e.stopPropagation();
      let delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.min(Math.max(zoom, 0.3), 5);
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    });

    // ResizeObserver
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        canvas.setWidth(containerRef.current.clientWidth);
        canvas.setHeight(containerRef.current.clientHeight);
        canvas.renderAll();
      }
    });
    ro.observe(containerRef.current);

    return () => {
      canvas.off('object:moving', scheduleWireRefresh);
      canvas.off('object:modified', refreshConnectionLines);
      canvas.off('object:removed', onObjectRemoved);
      ro.disconnect();
      useDraftStore.getState().setActiveCanvas(null);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [onSelectionChange]);

  /** Szerverről később érkező diagram_data (hydrate) — a vászon már létezhet. */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !pendingDiagramData) return;
    if (typeof pendingDiagramData === 'object' && Object.keys(pendingDiagramData).length === 0) {
      useDraftStore.getState().setPendingDiagramData(null);
      return;
    }
    try {
      const { fabricJson } = splitDiagramPayload(pendingDiagramData);
      if (!fabricJson || Object.keys(fabricJson).length === 0) {
        useDraftStore.getState().setPendingDiagramData(null);
        return;
      }
      canvas.loadFromJSON(fabricJson as object, () => {
        canvas.renderAll();
        useDraftStore.getState().setPendingDiagramData(null);
        useDraftStore.getState().setActiveCanvas(canvas);
      });
    } catch {
      useDraftStore.getState().setPendingDiagramData(null);
      toast.error('A szerverről érkező rajz nem töltődött be.');
    }
  }, [pendingDiagramData]);

  // Visszaadjuk a metódusokat a szülőnek
  useImperativeHandle(ref, () => ({
    addSymbol: (sym: SymbolDef) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      fabric.loadSVGFromString(`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#5a92ad" stroke-width="2" fill="none">${sym.svgPath}</svg>`, function (objects, options) {
        const obj = fabric.util.groupSVGElements(objects, options) as any;
        obj.set({
          left: (canvas.width || 800) / 2 - 16,
          top: (canvas.height || 600) / 2 - 16,
          scaleX: 2,
          scaleY: 2,
          hasControls: true,
          hasBorders: true,
          borderColor: '#5eb89a',
          cornerColor: '#5eb89a',
          transparentCorners: false
        });

        obj.vbfData = {
          elementId: crypto.randomUUID(),
          type: sym.name,
          name: sym.name + ' 1',
          rating: sym.isArch ? '' : '16A',
          cable: sym.isArch ? '' : 'MBCU 3x2.5',
          label: '',
          isArch: sym.isArch || false,
          locked: false
        };

        canvas.add(obj);
        canvas.setActiveObject(obj);
      });
    },
    updateSelectedObject: (key: string, value: any) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject() as any;
      if (active && active.vbfData) {
        active.vbfData[key] = value;
        
        // Zárolás logikája
        if (key === 'locked') {
          active.set({
            lockMovementX: value,
            lockMovementY: value,
            lockScalingX: value,
            lockScalingY: value,
            lockRotation: value,
            hasControls: !value,
          });
        }

        if (key === 'circuitKind' && active.vbfData?.type === 'connectionLine' && active.type === 'path') {
          restyleConnectionPathFromVbfData(active as fabric.Path, active.vbfData as ConnectionLineVbfData);
        }

        // Felirat logika itt implementálható extra `fabric.Text` hookként
        // Most csak force render:
        canvas.renderAll();
      }
    },
    deleteSelectedObject: () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach((object) => canvas.remove(object));
        onSelectionChange(null);
      }
    },
    clearCanvas: () => {
      const canvas = fabricRef.current;
      if (canvas) {
        if (window.confirm('Biztosan törlöd a teljes rajzot?')) {
          canvas.clear();
          onSelectionChange(null);
        }
      }
    },
    connectSelectedObjects: () => {
      const canvas = fabricRef.current;
      if (!canvas) return false;
      const selected = canvas.getActiveObjects() as (fabric.Object & {
        vbfData?: Record<string, unknown>;
      })[];
      if (selected.length !== 2) {
        window.alert('Válassz ki pontosan két elemet (Shift + kattintás a másodikra), majd kattints újra az Automata vonal gombra.');
        return false;
      }
      const [o1, o2] = selected;
      if (!isWireEndpoint(o1) || !isWireEndpoint(o2)) {
        window.alert('Csak szimbólumok / alaprajz elemek között húzható automatikus vonal (vonal elem nem választható végpontnak).');
        return false;
      }
      const id1 = ensureElementId(o1);
      const id2 = ensureElementId(o2);
      if (id1 === id2) {
        return false;
      }
      if (connectionPairExists(canvas, id1, id2)) {
        window.alert('Ezek az elemek már össze vannak kötve.');
        return false;
      }
      const pathObj = createConnectionLineObject(o1, o2, { name: 'Vezeték (automatikus)', source: 'manual' });
      canvas.add(pathObj);
      canvas.sendToBack(pathObj);
      canvas.setActiveObject(pathObj);
      canvas.requestRenderAll();
      onSelectionChange(pathObj);
      return true;
    },
  }));

  return (
    <div ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-dot-pattern">
      <canvas ref={canvasElementRef} />
    </div>
  );
});

CanvasWorkspace.displayName = 'CanvasWorkspace';
