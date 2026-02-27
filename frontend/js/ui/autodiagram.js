/**
 * ═══════════════════════════════════════════════
 * VBF Auto-Diagram Generator — autodiagram.js
 * ═══════════════════════════════════════════════
 * Automatically draws a single-line electrical
 * diagram on the Fabric.js canvas from:
 *   1. Site tree hierarchy (VBF.siteTree.data)
 *   2. Measurement tables (RCD, loop, insulation)
 * 
 * Symbols: IEC 60617 standard single-line style
 * 
 * Performance optimizations for 1000+ circuits:
 *   - Batch rendering (renderOnAddRemove = false)
 *   - Multi-page vertical layout for large sets
 *   - Maximum circuits per panel row (paginated)
 *   - Object count cap with grouped Fabric objects
 *   - Deduplication of circuit names
 */

export function initAutoDiagram() {
    window.VBF = window.VBF || {};
    VBF.autoDiagram = {

        // Layout constants
        C: {
            START_X: 80,
            START_Y: 60,
            BUSBAR_Y: 140,
            CIRCUIT_GAP: 90,       // horizontal gap between circuits
            CIRCUIT_DROP: 160,     // vertical drop from busbar to circuit end
            MAX_CIRCUITS_ROW: 12,  // max circuits per sub-row (prevents mega-wide)
            PAGE_HEIGHT: 500,      // vertical page spacing for multi-page
            LINE_COLOR: '#3b82f6',
            LINE_WIDTH: 2,
            BUS_COLOR: '#f59e0b',
            BUS_WIDTH: 3,
            TEXT_COLOR: '#94a3b8',
            LABEL_COLOR: '#e2e8f0',
            PANEL_LABEL_COLOR: '#f59e0b',
        },

        /**
         * Main entry: generate the full diagram
         */
        generate() {
            if (!window.canvas) {
                alert('Canvas nem elérhető!');
                return;
            }

            // Build the circuit list from available sources
            const treeData = (VBF.siteTree && VBF.siteTree.data) ? VBF.siteTree.data : [];
            let panels = this._collectPanels(treeData);

            if (panels.length === 0) {
                // Fallback: build panels from measurement tables
                const measPanels = this._buildFromMeasurements();
                if (measPanels.length === 0) {
                    alert('Nincs adat a rajzhoz!\n\nAdj hozzá áramköröket a Helyszínfához,\nvagy vigyél be mérési adatokat a Mérési Adatok fülön.');
                    return;
                }
                panels = measPanels;
            }

            const totalCircuits = panels.reduce((s, p) => s + p.circuits.length, 0);

            if (!confirm(
                `Egyvonalas rajz generálása:\n` +
                `  • ${panels.length} elosztó\n` +
                `  • ${totalCircuits} áramkör\n\n` +
                `A jelenlegi rajz TÖRLŐDIK!\n` +
                `${totalCircuits > 200 ? '⚠️ Nagy adatmennyiség — a generálás pár másodpercet vehet igénybe.' : ''}`
            )) {
                return;
            }

            // Clear canvas + disable incremental rendering (huge perf boost)
            canvas.renderOnAddRemove = false;
            canvas.clear();

            const t0 = performance.now();

            // Draw
            this._draw(panels);

            // Re-enable rendering + final render
            canvas.renderOnAddRemove = true;
            canvas.renderAll();

            const elapsed = Math.round(performance.now() - t0);
            console.log(`[AutoDiagram] Generated ${totalCircuits} circuits in ${elapsed}ms, ${canvas.getObjects().length} objects`);

            alert(
                `✅ Egyvonalas rajz elkészült!\n` +
                `${panels.length} elosztó, ${totalCircuits} áramkör\n` +
                `${canvas.getObjects().length} grafikus elem – ${elapsed}ms`
            );
        },

        // ═══════════════════════════════════════
        // Data collection
        // ═══════════════════════════════════════

        _collectPanels(treeNodes, parentPath) {
            parentPath = parentPath || '';
            const panels = [];

            for (const node of treeNodes) {
                const path = parentPath ? `${parentPath} / ${node.name}` : node.name;

                if (node.type === 'panel') {
                    const circuits = (node.children || [])
                        .filter(c => c.type === 'circuit')
                        .map(c => ({
                            name: c.name,
                            device: node.device || 'B16',
                        }));
                    panels.push({
                        name: node.name,
                        path,
                        device: node.device || 'B16',
                        circuits
                    });
                }

                if (node.children && node.children.length > 0) {
                    panels.push(...this._collectPanels(node.children, path));
                }
            }
            return panels;
        },

        _buildFromMeasurements() {
            // Collect unique circuit names from ALL measurement tables
            const circuitMap = new Map(); // name → {device, tables}

            // Loop impedance table (has circuit + device)
            document.querySelectorAll('#table-loop tbody tr').forEach(tr => {
                const name = tr.querySelector('.meas-circuit')?.value?.trim();
                const device = tr.querySelector('.meas-device')?.value?.trim();
                if (name) {
                    const existing = circuitMap.get(name) || { device: '', tables: [] };
                    if (device) existing.device = device;
                    if (!existing.tables.includes('Zs')) existing.tables.push('Zs');
                    circuitMap.set(name, existing);
                }
            });

            // Insulation resistance table
            document.querySelectorAll('#table-insulation tbody tr').forEach(tr => {
                const name = tr.querySelector('.meas-circuit')?.value?.trim();
                if (name) {
                    const existing = circuitMap.get(name) || { device: '', tables: [] };
                    if (!existing.tables.includes('Riso')) existing.tables.push('Riso');
                    circuitMap.set(name, existing);
                }
            });

            // RCD table
            document.querySelectorAll('#table-rcd tbody tr').forEach(tr => {
                const name = tr.querySelector('.meas-circ')?.value?.trim();
                if (name) {
                    const existing = circuitMap.get(name) || { device: '', tables: [] };
                    if (!existing.tables.includes('RCD')) existing.tables.push('RCD');
                    circuitMap.set(name, existing);
                }
            });

            // RPE table
            document.querySelectorAll('#table-rpe tbody tr').forEach(tr => {
                const loc = tr.querySelector('.meas-loc')?.value?.trim();
                if (loc) {
                    const existing = circuitMap.get(loc) || { device: '', tables: [] };
                    if (!existing.tables.includes('Rpe')) existing.tables.push('Rpe');
                    circuitMap.set(loc, existing);
                }
            });

            if (circuitMap.size === 0) return [];

            // Group by location prefix if available (e.g. "Panel A / circuit 1")
            const panelGroups = new Map();
            const globalLoc = document.getElementById('globalLocation')?.value?.trim() || '';
            const globalDev = document.getElementById('globalDevice')?.value?.trim() || 'B16';

            circuitMap.forEach((data, name) => {
                // Detect panel from path separator
                const parts = name.split(/\s*[\/→>]\s*/);
                let panelName, circName;
                if (parts.length >= 2) {
                    panelName = parts.slice(0, -1).join(' / ');
                    circName = parts[parts.length - 1];
                } else {
                    panelName = globalLoc || 'Főelosztó';
                    circName = name;
                }

                if (!panelGroups.has(panelName)) {
                    panelGroups.set(panelName, []);
                }
                panelGroups.get(panelName).push({
                    name: circName,
                    device: data.device || globalDev
                });
            });

            const panels = [];
            panelGroups.forEach((circuits, panelName) => {
                panels.push({
                    name: panelName,
                    path: panelName,
                    device: globalDev,
                    circuits
                });
            });

            return panels;
        },

        // ═══════════════════════════════════════
        // Drawing engine — multi-page vertical layout
        // ═══════════════════════════════════════

        _draw(panels) {
            const C = this.C;
            let maxX = 400;
            let curY = C.START_Y;

            // ── 1. Supply header (once at top) ──
            this._drawSupplyHeader(C.START_X, curY);
            curY = C.BUSBAR_Y + 10;

            // ── 2. Each panel as a vertical section ──
            panels.forEach((panel, panelIdx) => {
                const circuits = panel.circuits;
                const nCircuits = circuits.length;

                if (nCircuits === 0) {
                    // Empty panel — minimal block
                    this._drawPanelSection(C.START_X, curY, panel, [], panelIdx);
                    curY += 80;
                    return;
                }

                // Split circuits into rows of MAX_CIRCUITS_ROW
                const rows = [];
                for (let i = 0; i < nCircuits; i += C.MAX_CIRCUITS_ROW) {
                    rows.push(circuits.slice(i, i + C.MAX_CIRCUITS_ROW));
                }

                rows.forEach((rowCircuits, rowIdx) => {
                    const isFirstRow = (rowIdx === 0);
                    this._drawPanelSection(C.START_X, curY, panel, rowCircuits, panelIdx, isFirstRow, rowIdx, rows.length);

                    const rowWidth = C.START_X + 60 + rowCircuits.length * C.CIRCUIT_GAP + 60;
                    if (rowWidth > maxX) maxX = rowWidth;

                    curY += C.CIRCUIT_DROP + 100;
                });
            });

            // ── 3. Earth bar at bottom ──
            const earthY = curY;
            this._addObj(this._line(C.START_X - 20, earthY, maxX, earthY, '#10b981', 2));
            this._addObj(this._text('PE (Védővezető sín)', maxX + 10, earthY, 9, 'left', '#10b981'));
            this._drawEarth(C.START_X - 30, earthY);
            curY += 50;

            // Resize canvas
            canvas.setWidth(Math.max(maxX + 120, canvas.width));
            canvas.setHeight(Math.max(curY + 30, canvas.height));
        },

        /**
         * Draw supply header: network → switch → meter
         */
        _drawSupplyHeader(x, y) {
            const C = this.C;

            // Supply label
            this._addObj(this._text('Hálózat\n3×230/400V', x, y - 10, 11, 'center', C.LABEL_COLOR));

            // Vertical line down
            this._addObj(this._line(x, y + 10, x, y + 25, C.LINE_COLOR, C.LINE_WIDTH));
            this._addObj(this._arrow(x, y + 10, 'down'));

            // Main switch
            this._drawSwitch(x, y + 25);
            this._addObj(this._text('Főkapcsoló', x + 22, y + 32, 8, 'left', C.TEXT_COLOR));

            // Line to meter
            this._addObj(this._line(x, y + 45, x, y + 55, C.LINE_COLOR, C.LINE_WIDTH));

            // Meter
            this._drawMeter(x, y + 65);
            this._addObj(this._text('kWh', x, y + 67, 8, 'center', '#fff'));

            // SPD (surge protection)
            this._addObj(this._line(x + 20, y + 55, x + 30, y + 55, C.LINE_COLOR, 1));
            this._addObj(this._text('SPD', x + 40, y + 55, 7, 'left', C.TEXT_COLOR));

            // Line to busbar
            this._addObj(this._line(x, y + 78, x, C.BUSBAR_Y, C.LINE_COLOR, C.LINE_WIDTH));
        },

        /**
         * Draw one panel section with its circuits
         */
        _drawPanelSection(startX, topY, panel, circuits, panelIdx, isFirstRow, rowIdx, totalRows) {
            const C = this.C;

            // Panel label
            const labelSuffix = (totalRows && totalRows > 1) ? ` (${rowIdx + 1}/${totalRows})` : '';
            const labelText = isFirstRow !== false ? panel.name + labelSuffix : `${panel.name} (folyt. ${rowIdx + 1}/${totalRows})`;
            this._addObj(this._panelBox(startX + 30, topY, labelText));

            // Main busbar for this panel
            const busX1 = startX;
            const busX2 = startX + 60 + circuits.length * C.CIRCUIT_GAP;
            const busY = topY + 30;

            // 3-phase busbar
            for (let i = -2; i <= 2; i += 2) {
                this._addObj(this._line(busX1, busY + i, busX2, busY + i, C.BUS_COLOR, 2));
            }

            // Bus label
            this._addObj(this._text('L1 L2 L3 N', busX2 + 5, busY, 7, 'left', C.BUS_COLOR));

            // Panel RCD on left side
            if (isFirstRow !== false) {
                this._addObj(this._line(startX + 20, topY + 18, startX + 20, busY - 3, C.LINE_COLOR, C.LINE_WIDTH));
                this._drawRCD(startX + 20, topY + 18, panel.device);
            }

            if (circuits.length === 0) {
                this._addObj(this._text('(üres elosztó)', startX + 100, busY + 30, 9, 'left', C.TEXT_COLOR));
                return;
            }

            // Individual circuits
            circuits.forEach((circ, idx) => {
                const circX = startX + 60 + idx * C.CIRCUIT_GAP + C.CIRCUIT_GAP / 2;
                this._drawCircuit(circX, busY, circ);
            });
        },

        /**
         * Draw a single circuit: drop line, MCB, load symbol, label
         */
        _drawCircuit(cx, busY, circ) {
            const C = this.C;
            const mcbY = busY + 15;
            const loadY = busY + C.CIRCUIT_DROP - 40;

            // Drop from busbar
            this._addObj(this._line(cx, busY + 3, cx, mcbY, C.LINE_COLOR, C.LINE_WIDTH));

            // MCB
            this._drawMCB(cx, mcbY);

            // Device label (e.g. B16)
            this._addObj(this._text(circ.device, cx + 14, mcbY + 14, 7, 'left', C.TEXT_COLOR));

            // Wire to load
            this._addObj(this._line(cx, mcbY + 30, cx, loadY, C.LINE_COLOR, C.LINE_WIDTH));

            // Load symbol
            const loadType = this._detectLoadType(circ.name);
            this._drawLoad(cx, loadY, loadType);

            // Circuit name label
            this._addObj(this._text(
                this._truncate(circ.name, 12),
                cx, loadY + 28, 8, 'center', C.LABEL_COLOR
            ));
        },

        // ═══════════════════════════════════════
        // Primitive drawing helpers (optimized)
        // ═══════════════════════════════════════

        _addObj(obj) {
            if (obj) canvas.add(obj);
        },

        _line(x1, y1, x2, y2, color, width) {
            return new fabric.Line([x1, y1, x2, y2], {
                stroke: color || this.C.LINE_COLOR,
                strokeWidth: width || this.C.LINE_WIDTH,
                selectable: false,
                evented: false,
            });
        },

        _text(str, x, y, size, align, color) {
            return new fabric.Text(str || '', {
                left: x,
                top: y,
                fontSize: size || 10,
                fill: color || this.C.TEXT_COLOR,
                fontFamily: 'Outfit, sans-serif',
                textAlign: align || 'center',
                originX: align === 'left' ? 'left' : 'center',
                originY: 'center',
                selectable: false,
                evented: false,
            });
        },

        _truncate(str, max) {
            if (!str) return '';
            return str.length > max ? str.substring(0, max - 1) + '…' : str;
        },

        _arrow(x, y, dir) {
            const s = 5;
            const points = dir === 'down'
                ? [{ x: x - s, y }, { x: x + s, y }, { x, y: y + s * 1.5 }]
                : [{ x: x - s, y: y + s }, { x: x + s, y: y + s }, { x, y }];
            return new fabric.Polygon(points, {
                fill: this.C.LINE_COLOR,
                stroke: this.C.LINE_COLOR,
                strokeWidth: 1,
                selectable: false, evented: false,
            });
        },

        _panelBox(cx, cy, label) {
            const w = Math.max(label.length * 7 + 16, 80);
            const group = new fabric.Group([
                new fabric.Rect({
                    width: w, height: 22,
                    fill: 'rgba(245, 158, 11, 0.12)',
                    stroke: this.C.PANEL_LABEL_COLOR,
                    strokeWidth: 1.5,
                    rx: 4, ry: 4,
                    originX: 'center', originY: 'center',
                }),
                new fabric.Text(label, {
                    fontSize: 10,
                    fill: this.C.PANEL_LABEL_COLOR,
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: '600',
                    originX: 'center', originY: 'center',
                })
            ], {
                left: cx, top: cy,
                originX: 'left', originY: 'center',
                selectable: true, evented: true,
                vbfData: { type: 'Elosztó', name: label, rating: '', cable: '' }
            });
            this._addObj(group);
        },

        // ═══════════════════════════════════════
        // Symbol drawing (IEC 60617)
        // Each method directly adds to canvas
        // ═══════════════════════════════════════

        _drawSwitch(cx, cy) {
            this._addObj(this._line(cx, cy, cx, cy + 5, this.C.LINE_COLOR, this.C.LINE_WIDTH));
            this._addObj(new fabric.Line([cx, cy + 5, cx + 6, cy + 18], {
                stroke: this.C.LINE_COLOR, strokeWidth: this.C.LINE_WIDTH,
                selectable: false, evented: false
            }));
            this._addObj(this._line(cx, cy + 18, cx, cy + 22, this.C.LINE_COLOR, this.C.LINE_WIDTH));
        },

        _drawMeter(cx, cy) {
            this._addObj(new fabric.Rect({
                left: cx, top: cy,
                width: 20, height: 20,
                fill: 'rgba(14, 165, 233, 0.1)',
                stroke: this.C.LINE_COLOR,
                strokeWidth: 1.5,
                rx: 2, ry: 2,
                originX: 'center', originY: 'center',
                selectable: false, evented: false,
            }));
        },

        _drawRCD(cx, cy, label) {
            this._addObj(new fabric.Circle({
                left: cx, top: cy + 8,
                radius: 8,
                fill: 'transparent',
                stroke: this.C.LINE_COLOR,
                strokeWidth: 1.5,
                originX: 'center', originY: 'center',
                selectable: false, evented: false,
            }));
            this._addObj(new fabric.Circle({
                left: cx, top: cy + 8,
                radius: 2,
                fill: this.C.LINE_COLOR,
                originX: 'center', originY: 'center',
                selectable: false, evented: false,
            }));
            if (label) {
                this._addObj(this._text(label, cx + 14, cy + 8, 7, 'left', this.C.TEXT_COLOR));
            }
        },

        _drawMCB(cx, cy) {
            // Single grouped object for performance
            this._addObj(this._line(cx, cy, cx, cy + 4, this.C.LINE_COLOR, this.C.LINE_WIDTH));
            this._addObj(new fabric.Line([cx, cy + 4, cx + 5, cy + 18], {
                stroke: this.C.LINE_COLOR, strokeWidth: this.C.LINE_WIDTH,
                selectable: false, evented: false
            }));
            this._addObj(new fabric.Rect({
                left: cx, top: cy + 21,
                width: 7, height: 5,
                fill: 'transparent',
                stroke: this.C.LINE_COLOR,
                strokeWidth: 1,
                originX: 'center', originY: 'center',
                selectable: false, evented: false,
            }));
            this._addObj(this._line(cx, cy + 24, cx, cy + 30, this.C.LINE_COLOR, this.C.LINE_WIDTH));
        },

        _drawLoad(cx, cy, type) {
            const C = this.C;
            switch (type) {
                case 'light':
                    this._addObj(new fabric.Circle({
                        left: cx, top: cy + 8, radius: 8, fill: 'transparent',
                        stroke: C.LINE_COLOR, strokeWidth: 1.5,
                        originX: 'center', originY: 'center',
                        selectable: false, evented: false,
                    }));
                    this._addObj(this._line(cx - 5, cy + 3, cx + 5, cy + 13, C.LINE_COLOR, 1));
                    this._addObj(this._line(cx + 5, cy + 3, cx - 5, cy + 13, C.LINE_COLOR, 1));
                    break;
                case 'motor':
                    this._addObj(new fabric.Circle({
                        left: cx, top: cy + 8, radius: 8, fill: 'transparent',
                        stroke: C.LINE_COLOR, strokeWidth: 1.5,
                        originX: 'center', originY: 'center',
                        selectable: false, evented: false,
                    }));
                    this._addObj(this._text('M', cx, cy + 8, 10, 'center', C.LINE_COLOR));
                    break;
                case 'heater':
                    this._addObj(new fabric.Rect({
                        left: cx, top: cy + 8, width: 16, height: 10, fill: 'transparent',
                        stroke: C.LINE_COLOR, strokeWidth: 1.5,
                        originX: 'center', originY: 'center',
                        selectable: false, evented: false,
                    }));
                    this._addObj(this._line(cx - 4, cy + 5, cx, cy + 11, C.LINE_COLOR, 1));
                    this._addObj(this._line(cx, cy + 11, cx + 4, cy + 5, C.LINE_COLOR, 1));
                    break;
                default: // socket
                    this._addObj(new fabric.Circle({
                        left: cx, top: cy + 8, radius: 7, fill: 'transparent',
                        stroke: C.LINE_COLOR, strokeWidth: 1.5,
                        originX: 'center', originY: 'center',
                        selectable: false, evented: false,
                    }));
                    this._addObj(this._line(cx - 7, cy + 8, cx + 7, cy + 8, C.LINE_COLOR, 1.5));
                    this._addObj(this._line(cx, cy, cx, cy + 8, C.LINE_COLOR, C.LINE_WIDTH));
                    break;
            }
        },

        _drawEarth(cx, cy) {
            this._addObj(this._line(cx, cy, cx, cy + 10, '#10b981', 2));
            this._addObj(this._line(cx - 8, cy + 10, cx + 8, cy + 10, '#10b981', 2));
            this._addObj(this._line(cx - 5, cy + 14, cx + 5, cy + 14, '#10b981', 2));
            this._addObj(this._line(cx - 2, cy + 18, cx + 2, cy + 18, '#10b981', 2));
        },

        // ═══════════════════════════════════════
        // Load type detection from circuit name
        // ═══════════════════════════════════════

        _detectLoadType(name) {
            if (!name) return 'socket';
            const n = name.toLowerCase();
            if (/világít|lámpa|light|csillár|led.?sz|spot|mennyezet/i.test(n)) return 'light';
            if (/motor|szivatt|kompr|ventil|elszív|eszterga|hegeszt|fúr|sarol|darab|daru/i.test(n)) return 'motor';
            if (/fűt|hősziv|kazán|bojler|süt|radiát|infra|klíma|termos/i.test(n)) return 'heater';
            return 'socket';
        }
    };

    // ── Button handler ──
    const btn = document.getElementById('btnAutodiagram');
    if (btn) {
        btn.addEventListener('click', () => VBF.autoDiagram.generate());
    }
}
