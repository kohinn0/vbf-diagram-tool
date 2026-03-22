export function initCanvas() {
    let canvas = null;
    const wrapper = document.querySelector('.canvas-container-wrapper');
    if (!wrapper) return;

    canvas = new fabric.Canvas('diagramCanvas', {
        width: wrapper.clientWidth,
        height: wrapper.clientHeight,
        selection: true
    });

    // Globális hozzáférés (legacy modulokhoz, pl. autodiagram.js)
    window.canvas = canvas;

    // ─── UNDO / REDO STACK ─────────────────────────────────────────
    const _undoStack = [];
    const _redoStack = [];
    let _isSavingState = false;

    function _saveState() {
        if (_isSavingState) return;
        _undoStack.push(JSON.stringify(canvas.toJSON(['vbfData'])));
        if (_undoStack.length > 50) _undoStack.shift();
        _redoStack.length = 0;
    }

    function _undo() {
        if (_undoStack.length === 0) return;
        _isSavingState = true;
        _redoStack.push(JSON.stringify(canvas.toJSON(['vbfData'])));
        const prev = _undoStack.pop();
        canvas.loadFromJSON(prev, () => { canvas.renderAll(); _isSavingState = false; });
    }

    function _redo() {
        if (_redoStack.length === 0) return;
        _isSavingState = true;
        _undoStack.push(JSON.stringify(canvas.toJSON(['vbfData'])));
        const next = _redoStack.pop();
        canvas.loadFromJSON(next, () => { canvas.renderAll(); _isSavingState = false; });
    }

    // Állapot mentés minden szerkesztő művelet után
    canvas.on('object:added', _saveState);
    canvas.on('object:modified', _saveState);
    canvas.on('object:removed', _saveState);

    // Billentyűparancosok
    window.addEventListener('keydown', (e) => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); _undo(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); _redo(); }
    });

    // Handle responsive resize: ResizeObserver tracks wrapper size, window resize as fallback
    function resizeCanvas() {
        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;
        if (w > 0 && h > 0) {
            canvas.setWidth(w);
            canvas.setHeight(h);
            canvas.renderAll();
        }
    }
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(wrapper);
    window.addEventListener('resize', resizeCanvas);

    // Grid snapping (opcionális, be lehet állítani egy 20px-es rácshoz)
    const gridSize = 20;

    canvas.on('object:moving', function (options) {
        options.target.set({
            left: Math.round(options.target.left / gridSize) * gridSize,
            top: Math.round(options.target.top / gridSize) * gridSize
        });
    });

    // ─── ZOOM & PAN ─────────────────────────────────────────
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

    let _isPanning = false;
    let _panStart = null;
    canvas.on('mouse:down', function(opt) {
        if (opt.e.spaceKey || (opt.e.button === 1)) {
            _isPanning = true;
            _panStart = { x: opt.e.clientX, y: opt.e.clientY };
            canvas.setCursor('grabbing');
            return;
        }
    });
    canvas.on('mouse:move', function(opt) {
        if (!_isPanning || !_panStart) return;
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - _panStart.x;
        vpt[5] += e.clientY - _panStart.y;
        canvas.requestRenderAll();
        _panStart = { x: e.clientX, y: e.clientY };
    });
    canvas.on('mouse:up', function() {
        _isPanning = false;
        _panStart = null;
        canvas.setCursor('default');
    });

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { canvas.defaultCursor = 'grab'; canvas.renderAll(); }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') { canvas.defaultCursor = 'default'; canvas.renderAll(); }
    });

    // Zoom reset gomb
    const btnZoomReset = document.getElementById('btnZoomReset');
    if (btnZoomReset) btnZoomReset.addEventListener('click', () => {
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.setZoom(1);
        canvas.renderAll();
    });

    // ─── COPY / PASTE ─────────────────────────────────────────
    let _clipboardObj = null;
    window.addEventListener('keydown', (e) => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            const active = canvas.getActiveObject();
            if (active) active.clone(cloned => { _clipboardObj = cloned; });
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            if (!_clipboardObj) return;
            _clipboardObj.clone(cloned => {
                canvas.discardActiveObject();
                cloned.set({ left: (_clipboardObj.left || 0) + 20, top: (_clipboardObj.top || 0) + 20 });
                if (cloned.type === 'activeSelection') {
                    cloned.canvas = canvas;
                    cloned.forEachObject(o => canvas.add(o));
                    cloned.setCoords();
                } else {
                    canvas.add(cloned);
                }
                canvas.setActiveObject(cloned);
                canvas.requestRenderAll();
            });
        }
    });

    // 2. Szimbólum Könyvtár (alapok)
    const symbols = [
        // Alapvető védelem és mérés
        { id: 'mcb', name: 'Kismegszakító', svgPath: '<path d="M16 2 L16 12 M10 12 L22 12 M16 12 L16 30" />' },
        { id: 'rcd', name: 'FI Relé', svgPath: '<circle cx="16" cy="16" r="10" /><path d="M16 2 L16 6 M16 26 L16 30" />' },
        { id: 'meter', name: 'Fogyaszt.mérő', svgPath: '<rect x="6" y="6" width="20" height="20" /><text x="11" y="21" font-size="12" fill="var(--text-main)" stroke="none">kWh</text>' },
        { id: 'spd', name: 'Túlfesz. levezető', svgPath: '<rect x="8" y="10" width="16" height="12" /><path d="M16 2 L16 10 M16 22 L16 30 M12 16 L20 16 M14 20 L18 12" />' },
        { id: 'fuse', name: 'Olvadóbiztosító', svgPath: '<rect x="10" y="8" width="12" height="16" /><path d="M16 2 L16 8 M16 24 L16 30 M16 8 L16 24" />' },
        { id: 'switch', name: 'Főkapcsoló', svgPath: '<path d="M16 2 L16 10 M16 10 L22 20 M16 24 L16 30" />' },
        { id: 'contactor', name: 'Mágneskapcsoló', svgPath: '<rect x="8" y="8" width="16" height="16" /><path d="M16 2 L16 8 M16 24 L16 30" /><circle cx="16" cy="16" r="4" />' },

        // Csatlakozások és kötések
        { id: 'terminal', name: 'Sorkapocs', svgPath: '<circle cx="16" cy="16" r="4" /><path d="M16 2 L16 12 M16 20 L16 30" />' },
        { id: 'eph', name: 'EPH Csomópont', svgPath: '<circle cx="16" cy="16" r="14" /><path d="M8 16 L24 16 M16 8 L16 24 M10 10 L22 22 M22 10 L10 22" />' },
        { id: 'earth', name: 'Földelés', svgPath: '<path d="M16 2 L16 20 M8 20 L24 20 M11 23 L21 23 M14 26 L18 26" />' },
        { id: 'busbar', name: 'Gyűjtősín (3F)', svgPath: '<path d="M2 13 L30 13 M2 16 L30 16 M2 19 L30 19" />' },
        { id: 'junction', name: 'Kötődoboz', svgPath: '<circle cx="16" cy="16" r="10" fill="transparent" /><path d="M6 16 L26 16 M16 6 L16 26" />' },
        { id: 'transformer', name: 'Transzformátor', svgPath: '<circle cx="16" cy="12" r="8" /><circle cx="16" cy="20" r="8" />' },

        // Fogyasztók
        { id: 'socket', name: 'Dugalj (230V)', svgPath: '<path d="M16 2 L16 10 M6 10 L26 10 M6 10 A 10 10 0 0 0 26 10" />' },
        { id: 'socket_3p', name: 'Dugalj (400V)', svgPath: '<path d="M16 2 L16 10 M6 10 L26 10 M6 10 A 10 10 0 0 0 26 10 M12 16 L20 16 M16 12 L16 20" />' },
        { id: 'light', name: 'Világítás', svgPath: '<circle cx="16" cy="16" r="10" /><path d="M9 9 L23 23 M23 9 L9 23" />' },
        { id: 'motor', name: 'Motor', svgPath: '<circle cx="16" cy="16" r="12" /><text x="11" y="21" font-size="16" fill="var(--text-main)" stroke="none">M</text>' },
        { id: 'heater', name: 'Fűtőtest', svgPath: '<rect x="6" y="10" width="20" height="12" /><path d="M10 10 L10 22 M16 10 L16 22 M22 10 L22 22" />' },
        { id: 'fan', name: 'Ventilátor', svgPath: '<circle cx="16" cy="16" r="12" /><path d="M10 16 L22 16 M16 10 L16 22 M11 11 L21 21 M11 21 L21 11" />' },
    ];

    const symbolItemClass =
        'flex min-h-[6rem] cursor-grab flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-glass)] px-3 py-3.5 transition-all hover:border-[color-mix(in_srgb,var(--primary)_55%,var(--border-color))] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(0,0,0,0.2)] [&_svg]:shrink-0 [&_svg]:h-8 [&_svg]:w-8 [&_svg]:stroke-[var(--text-main)] [&_svg]:[stroke-width:2] [&_svg]:fill-none [&_span]:text-center [&_span]:text-[0.72rem] [&_span]:leading-tight [&_span]:text-[var(--text-muted)]';

    const symbolGrid = document.getElementById('symbolGrid');
    if (symbolGrid) {
        symbols.forEach(sym => {
            const div = document.createElement('div');
            div.className = symbolItemClass;
            div.draggable = true;
            div.innerHTML = `
                <svg viewBox="0 0 32 32">${sym.svgPath}</svg>
                <span>${sym.name}</span>
            `;
            div.addEventListener('click', () => {
                addSymbolToCanvas(sym);
            });
            symbolGrid.appendChild(div);
        });
    }

    // 2.5 Építészeti Elemek
    const archSymbols = [
        { id: 'room', name: 'Szoba / Tér', isArch: true, svgPath: '<rect x="2" y="2" width="28" height="28" fill="rgba(59, 130, 246, 0.1)" stroke="var(--primary)" stroke-dasharray="2 2" stroke-width="1.5" />' },
        { id: 'wall', name: 'Fal', isArch: true, svgPath: '<rect x="2" y="14" width="28" height="4" fill="var(--text-muted)" />' },
        { id: 'door', name: 'Ajtó', isArch: true, svgPath: '<path d="M4 28 L4 4 A 24 24 0 0 1 28 28 Z" fill="rgba(255,255,255,0.05)" stroke="var(--text-muted)" stroke-width="1.5" /><line x1="4" y1="28" x2="28" y2="28" stroke="var(--bg-base)" stroke-width="3" />' },
        { id: 'window', name: 'Ablak', isArch: true, svgPath: '<rect x="4" y="12" width="24" height="8" fill="transparent" stroke="var(--text-main)" stroke-width="1.5" /><line x1="4" y1="16" x2="28" y2="16" stroke="var(--text-main)" stroke-width="1" />' }
    ];

    const archGrid = document.getElementById('archGrid');
    if (archGrid) {
        archSymbols.forEach(sym => {
            const div = document.createElement('div');
            div.className = symbolItemClass;
            div.draggable = true;
            div.innerHTML = `
                <svg viewBox="0 0 32 32">${sym.svgPath}</svg>
                <span>${sym.name}</span>
            `;
            div.addEventListener('click', () => {
                addSymbolToCanvas(sym);
            });
            archGrid.appendChild(div);
        });
    }

    // 3. Elem vászonra helyezése
    function addSymbolToCanvas(symbolDef) {
        fabric.loadSVGFromString(`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#5a92ad" stroke-width="2" fill="none">${symbolDef.svgPath}</svg>`, function (objects, options) {
            const obj = fabric.util.groupSVGElements(objects, options);
            obj.set({
                left: wrapper.clientWidth / 2 - 16,
                top: wrapper.clientHeight / 2 - 16,
                scaleX: 2,
                scaleY: 2,
                hasControls: true,
                hasBorders: true,
                borderColor: '#5eb89a',
                cornerColor: '#5eb89a',
                transparentCorners: false
            });

            // Custom properties for Inspector
            obj.vbfData = {
                type: symbolDef.name,
                name: symbolDef.name + ' 1',
                rating: symbolDef.isArch ? '' : '16A',
                cable: symbolDef.isArch ? '' : 'MBCU 3x2.5',
                label: '',
                isArch: symbolDef.isArch || false,
                locked: false
            };

            canvas.add(obj);
            canvas.setActiveObject(obj);
        });
    }

    // 4. Properties Inspector (Jobb oldali panel)
    const inspector = document.getElementById('inspector-content');

    if (inspector) {
        canvas.on('selection:created', updateInspector);
        canvas.on('selection:updated', updateInspector);
        canvas.on('selection:cleared', () => {
            inspector.innerHTML = '<p class="empty-state">Válassz ki egy elemet a szerkesztéshez.</p>';
        });

        function updateInspector(e) {
            const selected = e.selected[0];
            if (!selected || !selected.vbfData) return;

            const data = selected.vbfData;
            const lockBtnHtml = `
                <div class="prop-group">
                    <label>Elem zárolás</label>
                    <button id="btnLockObj" class="btn btn-secondary btn-small w-full">${data.locked ? '🔓 Zárolás feloldása' : '🔒 Zárolás'}</button>
                </div>`;

            if (data.isArch) {
                inspector.innerHTML = `
                    <div class="prop-group">
                        <label for="propTypeArch">Típus</label>
                        <input type="text" id="propTypeArch" value="${data.type}" disabled>
                    </div>
                    <div class="prop-group">
                        <label for="propName">Megnevezés</label>
                        <input type="text" id="propName" value="${data.name}">
                    </div>
                    <div class="prop-group">
                        <label for="propLabel">Felirat a rajzon</label>
                        <input type="text" id="propLabel" value="${data.label || ''}" placeholder="pl. Nappali">
                    </div>
                    ${lockBtnHtml}
                `;
                document.getElementById('propName').addEventListener('input', (event) => {
                    selected.vbfData.name = event.target.value;
                });
                document.getElementById('propLabel').addEventListener('input', (event) => {
                    selected.vbfData.label = event.target.value;
                    _updateLabelOnCanvas(selected, event.target.value);
                });
            } else {
                inspector.innerHTML = `
                    <div class="prop-group">
                        <label for="propTypeCircuit">Típus</label>
                        <input type="text" id="propTypeCircuit" value="${data.type}" disabled>
                    </div>
                    <div class="prop-group">
                        <label for="propName">Megnevezés (Áramkör neve)</label>
                        <input type="text" id="propName" value="${data.name}">
                    </div>
                    <div class="prop-group">
                        <label for="propLabel">Felirat a rajzon</label>
                        <input type="text" id="propLabel" value="${data.label || ''}" placeholder="pl. F1 / Hálószoba">
                    </div>
                    <div class="prop-group">
                        <label for="propRating">Névleges Áram (A)</label>
                        <select id="propRating">
                            <option value="6A" ${data.rating === '6A' ? 'selected' : ''}>6 A</option>
                            <option value="10A" ${data.rating === '10A' ? 'selected' : ''}>10 A</option>
                            <option value="13A" ${data.rating === '13A' ? 'selected' : ''}>13 A</option>
                            <option value="16A" ${data.rating === '16A' ? 'selected' : ''}>16 A</option>
                            <option value="20A" ${data.rating === '20A' ? 'selected' : ''}>20 A</option>
                            <option value="25A" ${data.rating === '25A' ? 'selected' : ''}>25 A</option>
                            <option value="32A" ${data.rating === '32A' ? 'selected' : ''}>32 A</option>
                        </select>
                    </div>
                    <div class="prop-group">
                        <label for="propCable">Vezeték típusa</label>
                        <input type="text" id="propCable" value="${data.cable}">
                    </div>
                    ${lockBtnHtml}
                `;

                // Add Event Listeners to update the canvas object data
                document.getElementById('propName').addEventListener('input', (event) => {
                    selected.vbfData.name = event.target.value;
                });
                document.getElementById('propLabel').addEventListener('input', (event) => {
                    selected.vbfData.label = event.target.value;
                    _updateLabelOnCanvas(selected, event.target.value);
                });
                document.getElementById('propRating').addEventListener('change', (event) => {
                    selected.vbfData.rating = event.target.value;
                });
                document.getElementById('propCable').addEventListener('input', (event) => {
                    selected.vbfData.cable = event.target.value;
                });
            }

            // Zárolás gomb
            document.getElementById('btnLockObj')?.addEventListener('click', () => {
                const locked = !selected.vbfData.locked;
                selected.vbfData.locked = locked;
                selected.set({
                    lockMovementX: locked,
                    lockMovementY: locked,
                    lockScalingX: locked,
                    lockScalingY: locked,
                    lockRotation: locked,
                    hasControls: !locked,
                });
                canvas.renderAll();
                updateInspector({ selected: [selected] });
            });
        }
    }

    // ─── SZÖVEGCÍMKE frissítése a vásznon ────────────────────────
    function _updateLabelOnCanvas(targetObj, labelText) {
        // Eltávolítjuk a régi label-t ha van
        const existing = canvas.getObjects('text').find(o => o._vbfLabelFor === targetObj);
        if (existing) canvas.remove(existing);

        if (!labelText) { canvas.renderAll(); return; }

        const lbl = new fabric.Text(labelText, {
            left: (targetObj.left || 0) + (targetObj.getScaledWidth ? targetObj.getScaledWidth() / 2 : 32),
            top: (targetObj.top || 0) + (targetObj.getScaledHeight ? targetObj.getScaledHeight() : 64) + 4,
            fontSize: 11,
            fill: '#a0aec0',
            selectable: false,
            evented: false,
            originX: 'center',
        });
        lbl._vbfLabelFor = targetObj;
        canvas.add(lbl);
        canvas.renderAll();
    }

    // 5. Actions / Delete Tool
    const toolDelete = document.getElementById('toolDelete');
    if (toolDelete) {
        toolDelete.addEventListener('click', () => {
            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length) {
                canvas.discardActiveObject();
                activeObjects.forEach(function (object) {
                    canvas.remove(object);
                    // Remove associated label
                    const lbl = canvas.getObjects('text').find(o => o._vbfLabelFor === object);
                    if (lbl) canvas.remove(lbl);
                });
            }
        });
    }

    // Delete with Keyboard
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete') {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
            const toolDeleteEl = document.getElementById('toolDelete');
            if (toolDeleteEl) toolDeleteEl.click();
        }
    });

    const btnClear = document.getElementById('btnClear');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (confirm('Biztosan törlöd a teljes vásznat?')) {
                canvas.clear();
            }
        });
    }

    // 6. Rajzolási módok (Vezeték húzás + Shift=ortho)
    let isDrawingLine = false;
    let line, isDown;

    const toolSelect = document.getElementById('toolSelect');
    const toolLine = document.getElementById('toolLine');

    if (toolSelect && toolLine) {
        toolSelect.addEventListener('click', () => {
            isDrawingLine = false;
            toolSelect.setAttribute('data-active', '');
            toolLine.removeAttribute('data-active');
            canvas.selection = true;
            canvas.forEachObject(o => o.selectable = !o.vbfData?.locked);
        });

        toolLine.addEventListener('click', () => {
            isDrawingLine = true;
            toolLine.setAttribute('data-active', '');
            toolSelect.removeAttribute('data-active');
            canvas.selection = false;
            canvas.forEachObject(o => o.selectable = false);
        });
    }

    canvas.on('mouse:down', function (o) {
        if (!isDrawingLine) return;
        isDown = true;
        var pointer = canvas.getPointer(o.e);
        var points = [pointer.x, pointer.y, pointer.x, pointer.y];
        line = new fabric.Line(points, {
            strokeWidth: 2,
            fill: '#f0f2f5',
            stroke: '#f0f2f5',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });
        canvas.add(line);
    });

    canvas.on('mouse:move', function (o) {
        if (!isDown || !isDrawingLine) return;
        var pointer = canvas.getPointer(o.e);
        let x2 = pointer.x;
        let y2 = pointer.y;
        // Shift = ortho mód (vízszintes/függőleges)
        if (o.e.shiftKey) {
            const dx = Math.abs(x2 - line.x1);
            const dy = Math.abs(y2 - line.y1);
            if (dx > dy) y2 = line.y1; else x2 = line.x1;
        }
        line.set({ x2, y2 });
        canvas.renderAll();
    });

    canvas.on('mouse:up', function () {
        isDown = false;
        if (line) { line.setCoords(); }
    });

    // 7. Export PNG
    const btnExportPng = document.getElementById('btnExportPng');
    if (btnExportPng) {
        btnExportPng.addEventListener('click', () => {
            const dataURL = canvas.toDataURL({
                format: 'png',
                quality: 1
            });
            const link = document.createElement('a');
            const documentTitle = document.getElementById('documentTitle');
            link.download = (documentTitle ? documentTitle.value : 'rajz') + '.png';
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // 8. Background Image Logic
    const btnUploadBg = document.getElementById('btnUploadBg');
    if (btnUploadBg) {
        btnUploadBg.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (f) => {
                    fabric.Image.fromURL(f.target.result, (img) => {
                        // Scale image to fit canvas comfortably
                        const scale = Math.min(
                            (canvas.width * 0.9) / img.width,
                            (canvas.height * 0.9) / img.height
                        );
                        img.set({
                            originX: 'center',
                            originY: 'center',
                            left: canvas.width / 2,
                            top: canvas.height / 2,
                            scaleX: scale,
                            scaleY: scale,
                            opacity: 0.3,   // semi-transparent background
                            selectable: false, // background shouldn't be movable by normal means
                            evented: false
                        });

                        canvas.add(img);
                        img.sendToBack();
                        canvas.renderAll();
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const btnClearBg = document.getElementById('btnClearBg');
    if (btnClearBg) {
        btnClearBg.addEventListener('click', () => {
            const objects = canvas.getObjects();
            const bgObjects = objects.filter(o => o.selectable === false && o.opacity === 0.3);
            bgObjects.forEach(bg => canvas.remove(bg));
            canvas.renderAll();
        });
    }
}


    canvas = new fabric.Canvas('diagramCanvas', {
        width: wrapper.clientWidth,
        height: wrapper.clientHeight,
        selection: true
    });

    // Globális hozzáférés (legacy modulokhoz, pl. autodiagram.js)
    window.canvas = canvas;

    // Handle responsive resize: ResizeObserver tracks wrapper size, window resize as fallback
    function resizeCanvas() {
        const w = wrapper.clientWidth;
        const h = wrapper.clientHeight;
        if (w > 0 && h > 0) {
            canvas.setWidth(w);
            canvas.setHeight(h);
            canvas.renderAll();
        }
    }
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(wrapper);
    window.addEventListener('resize', resizeCanvas);

    // Grid snapping (opcionális, be lehet állítani egy 20px-es rácshoz)
    const gridSize = 20;

    canvas.on('object:moving', function (options) {
        options.target.set({
            left: Math.round(options.target.left / gridSize) * gridSize,
            top: Math.round(options.target.top / gridSize) * gridSize
        });
    });

    // 2. Szimbólum Könyvtár (alapok)
    const symbols = [
        // Alapvető védelem és mérés
        { id: 'mcb', name: 'Kismegszakító', svgPath: '<path d="M16 2 L16 12 M10 12 L22 12 M16 12 L16 30" />' },
        { id: 'rcd', name: 'FI Relé', svgPath: '<circle cx="16" cy="16" r="10" /><path d="M16 2 L16 6 M16 26 L16 30" />' },
        { id: 'meter', name: 'Fogyaszt.mérő', svgPath: '<rect x="6" y="6" width="20" height="20" /><text x="11" y="21" font-size="12" fill="var(--text-main)" stroke="none">kWh</text>' },
        { id: 'spd', name: 'Túlfesz. levezető', svgPath: '<rect x="8" y="10" width="16" height="12" /><path d="M16 2 L16 10 M16 22 L16 30 M12 16 L20 16 M14 20 L18 12" />' },
        { id: 'fuse', name: 'Olvadóbiztosító', svgPath: '<rect x="10" y="8" width="12" height="16" /><path d="M16 2 L16 8 M16 24 L16 30 M16 8 L16 24" />' },
        { id: 'switch', name: 'Főkapcsoló', svgPath: '<path d="M16 2 L16 10 M16 10 L22 20 M16 24 L16 30" />' },
        { id: 'contactor', name: 'Mágneskapcsoló', svgPath: '<rect x="8" y="8" width="16" height="16" /><path d="M16 2 L16 8 M16 24 L16 30" /><circle cx="16" cy="16" r="4" />' },

        // Csatlakozások és kötések
        { id: 'terminal', name: 'Sorkapocs', svgPath: '<circle cx="16" cy="16" r="4" /><path d="M16 2 L16 12 M16 20 L16 30" />' },
        { id: 'eph', name: 'EPH Csomópont', svgPath: '<circle cx="16" cy="16" r="14" /><path d="M8 16 L24 16 M16 8 L16 24 M10 10 L22 22 M22 10 L10 22" />' },
        { id: 'earth', name: 'Földelés', svgPath: '<path d="M16 2 L16 20 M8 20 L24 20 M11 23 L21 23 M14 26 L18 26" />' },
        { id: 'busbar', name: 'Gyűjtősín (3F)', svgPath: '<path d="M2 13 L30 13 M2 16 L30 16 M2 19 L30 19" />' },
        { id: 'junction', name: 'Kötődoboz', svgPath: '<circle cx="16" cy="16" r="10" fill="transparent" /><path d="M6 16 L26 16 M16 6 L16 26" />' },
        { id: 'transformer', name: 'Transzformátor', svgPath: '<circle cx="16" cy="12" r="8" /><circle cx="16" cy="20" r="8" />' },

        // Fogyasztók
        { id: 'socket', name: 'Dugalj (230V)', svgPath: '<path d="M16 2 L16 10 M6 10 L26 10 M6 10 A 10 10 0 0 0 26 10" />' },
        { id: 'socket_3p', name: 'Dugalj (400V)', svgPath: '<path d="M16 2 L16 10 M6 10 L26 10 M6 10 A 10 10 0 0 0 26 10 M12 16 L20 16 M16 12 L16 20" />' },
        { id: 'light', name: 'Világítás', svgPath: '<circle cx="16" cy="16" r="10" /><path d="M9 9 L23 23 M23 9 L9 23" />' },
        { id: 'motor', name: 'Motor', svgPath: '<circle cx="16" cy="16" r="12" /><text x="11" y="21" font-size="16" fill="var(--text-main)" stroke="none">M</text>' },
        { id: 'heater', name: 'Fűtőtest', svgPath: '<rect x="6" y="10" width="20" height="12" /><path d="M10 10 L10 22 M16 10 L16 22 M22 10 L22 22" />' },
        { id: 'fan', name: 'Ventilátor', svgPath: '<circle cx="16" cy="16" r="12" /><path d="M10 16 L22 16 M16 10 L16 22 M11 11 L21 21 M11 21 L21 11" />' },
    ];

    const symbolItemClass =
        'flex min-h-[6rem] cursor-grab flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-glass)] px-3 py-3.5 transition-all hover:border-[color-mix(in_srgb,var(--primary)_55%,var(--border-color))] hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(0,0,0,0.2)] [&_svg]:shrink-0 [&_svg]:h-8 [&_svg]:w-8 [&_svg]:stroke-[var(--text-main)] [&_svg]:[stroke-width:2] [&_svg]:fill-none [&_span]:text-center [&_span]:text-[0.72rem] [&_span]:leading-tight [&_span]:text-[var(--text-muted)]';

    const symbolGrid = document.getElementById('symbolGrid');
    if (symbolGrid) {
        symbols.forEach(sym => {
            const div = document.createElement('div');
            div.className = symbolItemClass;
            div.draggable = true;
            div.innerHTML = `
                <svg viewBox="0 0 32 32">${sym.svgPath}</svg>
                <span>${sym.name}</span>
            `;
            div.addEventListener('click', () => {
                addSymbolToCanvas(sym);
            });
            symbolGrid.appendChild(div);
        });



    const archGrid = document.getElementById('archGrid');
    if (archGrid) {
        archSymbols.forEach(sym => {
            const div = document.createElement('div');
            div.className = symbolItemClass;
            div.draggable = true;
            div.innerHTML = `
                <svg viewBox="0 0 32 32">${sym.svgPath}</svg>
                <span>${sym.name}</span>
            `;
            div.addEventListener('click', () => {
                addSymbolToCanvas(sym);
            });
            archGrid.appendChild(div);
        });
    }

    // 3. Elem vászonra helyezése
    function addSymbolToCanvas(symbolDef) {
        fabric.loadSVGFromString(`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#5a92ad" stroke-width="2" fill="none">${symbolDef.svgPath}</svg>`, function (objects, options) {
            const obj = fabric.util.groupSVGElements(objects, options);
            obj.set({
                left: wrapper.clientWidth / 2 - 16,
                top: wrapper.clientHeight / 2 - 16,
                scaleX: 2,
                scaleY: 2,
                hasControls: true,
                hasBorders: true,
                borderColor: '#5eb89a',
                cornerColor: '#5eb89a',
                transparentCorners: false
            });

            // Custom properties for Inspector
            obj.vbfData = {
                type: symbolDef.name,
                name: symbolDef.name + ' 1',
                rating: symbolDef.isArch ? '' : '16A',
                cable: symbolDef.isArch ? '' : 'MBCU 3x2.5',
                isArch: symbolDef.isArch || false
            };

            canvas.add(obj);
            canvas.setActiveObject(obj);
        });
    }

    // 4. Properties Inspector (Jobb oldali panel)
    const inspector = document.getElementById('inspector-content');

    if (inspector) {
        canvas.on('selection:created', updateInspector);
        canvas.on('selection:updated', updateInspector);
        canvas.on('selection:cleared', () => {
            inspector.innerHTML = '<p class="empty-state">Válassz ki egy elemet a szerkesztéshez.</p>';
        });

        function updateInspector(e) {
            const selected = e.selected[0];
            if (!selected || !selected.vbfData) return;

            const data = selected.vbfData;

            if (data.isArch) {
                inspector.innerHTML = `
                    <div class="prop-group">
                        <label for="propTypeArch">Típus</label>
                        <input type="text" id="propTypeArch" value="${data.type}" disabled>
                    </div>
                    <div class="prop-group">
                        <label for="propName">Megnevezés</label>
                        <input type="text" id="propName" value="${data.name}">
                    </div>
                `;
                document.getElementById('propName').addEventListener('input', (event) => {
                    selected.vbfData.name = event.target.value;
                });
            } else {
                inspector.innerHTML = `
                    <div class="prop-group">
                        <label for="propTypeCircuit">Típus</label>
                        <input type="text" id="propTypeCircuit" value="${data.type}" disabled>
                    </div>
                    <div class="prop-group">
                        <label for="propName">Megnevezés (Áramkör neve)</label>
                        <input type="text" id="propName" value="${data.name}">
                    </div>
                    <div class="prop-group">
                        <label for="propRating">Névleges Áram (A)</label>
                        <select id="propRating">
                            <option value="6A" ${data.rating === '6A' ? 'selected' : ''}>6 A</option>
                            <option value="10A" ${data.rating === '10A' ? 'selected' : ''}>10 A</option>
                            <option value="13A" ${data.rating === '13A' ? 'selected' : ''}>13 A</option>
                            <option value="16A" ${data.rating === '16A' ? 'selected' : ''}>16 A</option>
                            <option value="20A" ${data.rating === '20A' ? 'selected' : ''}>20 A</option>
                            <option value="25A" ${data.rating === '25A' ? 'selected' : ''}>25 A</option>
                            <option value="32A" ${data.rating === '32A' ? 'selected' : ''}>32 A</option>
                        </select>
                    </div>
                    <div class="prop-group">
                        <label for="propCable">Vezeték típusa</label>
                        <input type="text" id="propCable" value="${data.cable}">
                    </div>
                `;

                // Add Event Listeners to update the canvas object data
                document.getElementById('propName').addEventListener('input', (event) => {
                    selected.vbfData.name = event.target.value;
                });
                document.getElementById('propRating').addEventListener('change', (event) => {
                    selected.vbfData.rating = event.target.value;
                });
                document.getElementById('propCable').addEventListener('input', (event) => {
                    selected.vbfData.cable = event.target.value;
                });
            }
        }
    }

    // 5. Actions / Delete Tool
    const toolDelete = document.getElementById('toolDelete');
    if (toolDelete) {
        toolDelete.addEventListener('click', () => {
            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length) {
                canvas.discardActiveObject();
                activeObjects.forEach(function (object) {
                    canvas.remove(object);
                });
            }
        });
    }

    // Delete with Keyboard
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete') {
            const toolDeleteEl = document.getElementById('toolDelete');
            if (toolDeleteEl) toolDeleteEl.click();
        }
    });

    const btnClear = document.getElementById('btnClear');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (confirm('Biztosan törlöd a teljes vásznat?')) {
                canvas.clear();
            }
        });
    }

    // 6. Rajzolási módok (Vezeték húzás egyszerűsített implementáció)
    let isDrawingLine = false;
    let line, isDown;

    const toolSelect = document.getElementById('toolSelect');
    const toolLine = document.getElementById('toolLine');

    if (toolSelect && toolLine) {
        toolSelect.addEventListener('click', () => {
            isDrawingLine = false;
            toolSelect.setAttribute('data-active', '');
            toolLine.removeAttribute('data-active');
            canvas.selection = true;
            canvas.forEachObject(o => o.selectable = true);
        });

        toolLine.addEventListener('click', () => {
            isDrawingLine = true;
            toolLine.setAttribute('data-active', '');
            toolSelect.removeAttribute('data-active');
            canvas.selection = false;
            canvas.forEachObject(o => o.selectable = false);
        });
    }

    canvas.on('mouse:down', function (o) {
        if (!isDrawingLine) return;
        isDown = true;
        var pointer = canvas.getPointer(o.e);
        var points = [pointer.x, pointer.y, pointer.x, pointer.y];
        line = new fabric.Line(points, {
            strokeWidth: 2,
            fill: '#f0f2f5',
            stroke: '#f0f2f5',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
        });
        canvas.add(line);
    });

    canvas.on('mouse:move', function (o) {
        if (!isDown || !isDrawingLine) return;
        var pointer = canvas.getPointer(o.e);
        line.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
    });

    canvas.on('mouse:up', function (o) {
        isDown = false;
        // if drawing line completed, make it selectable later when switching back to Select mode
        if (line) {
            line.setCoords();
        }
    });

    // 7. Export PNG
    const btnExportPng = document.getElementById('btnExportPng');
    if (btnExportPng) {
        btnExportPng.addEventListener('click', () => {
            const dataURL = canvas.toDataURL({
                format: 'png',
                quality: 1
            });
            const link = document.createElement('a');
            const documentTitle = document.getElementById('documentTitle');
            link.download = (documentTitle ? documentTitle.value : 'rajz') + '.png';
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // 8. Background Image Logic
    const btnUploadBg = document.getElementById('btnUploadBg');
    if (btnUploadBg) {
        btnUploadBg.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (f) => {
                    fabric.Image.fromURL(f.target.result, (img) => {
                        // Scale image to fit canvas comfortably
                        const scale = Math.min(
                            (canvas.width * 0.9) / img.width,
                            (canvas.height * 0.9) / img.height
                        );
                        img.set({
                            originX: 'center',
                            originY: 'center',
                            left: canvas.width / 2,
                            top: canvas.height / 2,
                            scaleX: scale,
                            scaleY: scale,
                            opacity: 0.3,   // semi-transparent background
                            selectable: false, // background shouldn't be movable by normal means
                            evented: false
                        });

                        // Optional: remove existing background object if we track it,
                        // but for simplicity, let's just add it as the lowest level object
                        canvas.add(img);
                        img.sendToBack();
                        canvas.renderAll();
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const btnClearBg = document.getElementById('btnClearBg');
    if (btnClearBg) {
        btnClearBg.addEventListener('click', () => {
            // Remove objects that have evented = false and opacity = 0.3 (our heuristic for backgrounds)
            const objects = canvas.getObjects();
            const bgObjects = objects.filter(o => o.selectable === false && o.opacity === 0.3);
            bgObjects.forEach(bg => canvas.remove(bg));
            canvas.renderAll();
        });
    }
}
