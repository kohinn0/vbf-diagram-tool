import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { fabric } from 'fabric';
import { type SymbolDef } from './diagram-utils';
import { useDraftStore } from '../../store/draftStore';

export interface CanvasRef {
  addSymbol: (sym: SymbolDef) => void;
  updateSelectedObject: (key: string, value: any) => void;
  deleteSelectedObject: () => void;
  clearCanvas: () => void;
}

interface CanvasWorkspaceProps {
  onSelectionChange: (selectedObject: any | null) => void;
}

export const CanvasWorkspace = forwardRef<CanvasRef, CanvasWorkspaceProps>(({ onSelectionChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

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
    
    // Elmentjük a globális állapotba, hogy a Mentés gomb hozzáférjen
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
      ro.disconnect();
      useDraftStore.getState().setActiveCanvas(null);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [onSelectionChange]);

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
    }
  }));

  return (
    <div ref={containerRef} className="flex-1 w-full h-full relative overflow-hidden bg-dot-pattern">
      <canvas ref={canvasElementRef} />
    </div>
  );
});

CanvasWorkspace.displayName = 'CanvasWorkspace';
