/**
 * VBF Diagram Editor Main JS
 */

let canvas;
document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Logic
    const btnTheme = document.getElementById('btnToggleTheme');
    const toggleTheme = () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        if (btnTheme) btnTheme.innerHTML = isLight ? '🌙 Sötét' : '☀️ Világos';
    };
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        if (btnTheme) btnTheme.innerHTML = '🌙 Sötét';
    }
    btnTheme?.addEventListener('click', toggleTheme);

    // 1. Inicializáljuk a Fabric.js Canvast
    const wrapper = document.querySelector('.canvas-container-wrapper');

    // Offline Indicator Logic
    function updateOnlineStatus() {
        const indicator = document.getElementById('offlineIndicator');
        const dot = indicator.querySelector('span');
        if (navigator.onLine) {
            dot.style.background = '#10b981';
            indicator.lastChild.textContent = ' Online';
        } else {
            dot.style.background = '#ef4444';
            indicator.lastChild.textContent = ' Offline (Helyi mentés)';
        }
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
    canvas = new fabric.Canvas('diagramCanvas', {
        width: wrapper.clientWidth,
        height: wrapper.clientHeight,
        selection: true
    });

    // Handle responsive resize
    window.addEventListener('resize', () => {
        canvas.setWidth(wrapper.clientWidth);
        canvas.setHeight(wrapper.clientHeight);
        canvas.renderAll();
    });

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

    const symbolGrid = document.getElementById('symbolGrid');

    // Rendereljük ki a bal oldali menübe
    symbols.forEach(sym => {
        const div = document.createElement('div');
        div.className = 'symbol-item';
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

    // 2.5 Építészeti Elemek
    const archSymbols = [
        { id: 'room', name: 'Szoba / Tér', isArch: true, svgPath: '<rect x="2" y="2" width="28" height="28" fill="rgba(59, 130, 246, 0.1)" stroke="var(--primary)" stroke-dasharray="2 2" stroke-width="1.5" />' },
        { id: 'wall', name: 'Fal', isArch: true, svgPath: '<rect x="2" y="14" width="28" height="4" fill="var(--text-muted)" />' },
        { id: 'door', name: 'Ajtó', isArch: true, svgPath: '<path d="M4 28 L4 4 A 24 24 0 0 1 28 28 Z" fill="rgba(255,255,255,0.05)" stroke="var(--text-muted)" stroke-width="1.5" /><line x1="4" y1="28" x2="28" y2="28" stroke="var(--bg-base)" stroke-width="3" />' },
        { id: 'window', name: 'Ablak', isArch: true, svgPath: '<rect x="4" y="12" width="24" height="8" fill="transparent" stroke="var(--text-main)" stroke-width="1.5" /><line x1="4" y1="16" x2="28" y2="16" stroke="var(--text-main)" stroke-width="1" />' }
    ];

    const archGrid = document.getElementById('archGrid');
    archSymbols.forEach(sym => {
        const div = document.createElement('div');
        div.className = 'symbol-item';
        div.draggable = true;
        div.innerHTML = `
            <svg viewBox="0 0 32 32">${sym.svgPath}</svg>
            <span>${sym.name}</span>
        `;
        div.addEventListener('click', () => {
            addSymbolToCanvas(sym);
        });
        if (archGrid) archGrid.appendChild(div);
    });

    // 3. Elem vászonra helyezése
    function addSymbolToCanvas(symbolDef) {
        // We use Fabric.js Path or SVG loading
        // For simplicity now, let's just make a grouped object with Text

        // In real app we load proper SVGs nicely formatted
        fabric.loadSVGFromString(`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" stroke="#3b82f6" stroke-width="2" fill="none">${symbolDef.svgPath}</svg>`, function (objects, options) {
            const obj = fabric.util.groupSVGElements(objects, options);
            obj.set({
                left: wrapper.clientWidth / 2 - 16,
                top: wrapper.clientHeight / 2 - 16,
                scaleX: 2,
                scaleY: 2,
                hasControls: true,
                hasBorders: true,
                borderColor: '#10b981',
                cornerColor: '#10b981',
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
                    <label>Típus</label>
                    <input type="text" value="${data.type}" disabled>
                </div>
                <div class="prop-group">
                    <label>Megnevezés</label>
                    <input type="text" id="propName" value="${data.name}">
                </div>
            `;
            document.getElementById('propName').addEventListener('input', (event) => {
                selected.vbfData.name = event.target.value;
            });
        } else {
            inspector.innerHTML = `
                <div class="prop-group">
                    <label>Típus</label>
                    <input type="text" value="${data.type}" disabled>
                </div>
                <div class="prop-group">
                    <label>Megnevezés (Áramkör neve)</label>
                    <input type="text" id="propName" value="${data.name}">
                </div>
                <div class="prop-group">
                    <label>Névleges Áram (A)</label>
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
                    <label>Vezeték típusa</label>
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

    // 5. Actions / Delete Tool
    document.getElementById('toolDelete').addEventListener('click', () => {
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
            canvas.discardActiveObject();
            activeObjects.forEach(function (object) {
                canvas.remove(object);
            });
        }
    });

    // Delete with Keyboard
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Delete') {
            document.getElementById('toolDelete').click();
        }
    });

    document.getElementById('btnClear').addEventListener('click', () => {
        if (confirm('Biztosan törlöd a teljes vásznat?')) {
            canvas.clear();
        }
    });

    // 6. Rajzolási módok (Vezeték húzás egyszerűsített implementáció)
    let isDrawingLine = false;
    let line, isDown;

    const toolSelect = document.getElementById('toolSelect');
    const toolLine = document.getElementById('toolLine');

    toolSelect.addEventListener('click', () => {
        isDrawingLine = false;
        toolSelect.classList.add('active');
        toolLine.classList.remove('active');
        canvas.selection = true;
        canvas.forEachObject(o => o.selectable = true);
    });

    toolLine.addEventListener('click', () => {
        isDrawingLine = true;
        toolLine.classList.add('active');
        toolSelect.classList.remove('active');
        canvas.selection = false;
        canvas.forEachObject(o => o.selectable = false);
    });

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
    document.getElementById('btnExportPng').addEventListener('click', () => {
        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1
        });
        const link = document.createElement('a');
        link.download = document.getElementById('documentTitle').value + '.png';
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // 8. Background Image Logic
    document.getElementById('btnUploadBg').addEventListener('change', (e) => {
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

    document.getElementById('btnClearBg')?.addEventListener('click', () => {
        // Remove objects that have evented = false and opacity = 0.3 (our heuristic for backgrounds)
        const objects = canvas.getObjects();
        const bgObjects = objects.filter(o => o.selectable === false && o.opacity === 0.3);
        bgObjects.forEach(bg => canvas.remove(bg));
        canvas.renderAll();
    });

    // ==========================================
    // MULTI-TAB LOGIC (NEW)
    // ==========================================
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            navTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Resize fabric canvas logic safely
            if (targetId === 'tab-diagram') {
                canvas.setWidth(wrapper.clientWidth);
                canvas.setHeight(wrapper.clientHeight);
                canvas.renderAll();
            }
        });
    });

    // ==========================================
    // DEFECTS (HIBAJEGYZÉK) LOGIC
    // ==========================================
    const btnAddDefect = document.getElementById('btnAddDefect');
    const defectList = document.getElementById('defectList');
    let defectCount = 0;

    btnAddDefect.addEventListener('click', () => {
        defectCount++;
        // Options listából felépítése
        let tipikusOptions = '<option value="">-- Egyedi hiba kézi bevitele --</option>';
        if (typeof vbfData !== 'undefined' && vbfData.tipikus_hibak) {
            vbfData.tipikus_hibak.forEach(hiba => {
                tipikusOptions += `<option value="${hiba.id}">${hiba.nev}</option>`;
            });
        }

        const defectRow = document.createElement('div');
        defectRow.className = 'defect-card';
        defectRow.innerHTML = `
            <div class="defect-details">
                <label>Válassz tipikus hibát a sablonhoz:</label>
                <select class="tpl-select">
                    ${tipikusOptions}
                </select>
                
                <label style="margin-top: 10px;">Jegyzőkönyvbe kerülő szöveg:</label>
                <textarea rows="4" class="desc-input" placeholder="Ide kerül a hiba leírása..."></textarea>
                
                <label style="margin-top: 10px;">Javasolt javítási határidő:</label>
                <select class="deadline-input">
                    <option value="Azonnali (0 nap)">Azonnali (0 nap)</option>
                    <option value="30 napon belül">30 napon belül</option>
                    <option value="90 napon belül vagy a következő karbantartáskor">90 napon belül vagy a karbantartáskor</option>
                    <option value="A következő felújításkor">A következő felújításkor</option>
                    <option value="Egyedi">Egyedi dátum</option>
                </select>
            </div>
            
            <div class="defect-location">
                <label>Szabvány hivatkozás:</label>
                <input type="text" class="standard-input" placeholder="MSZ HD 60364..." style="margin-bottom: 10px;" />
                
                <label>Pontos Helyszín (Emelet, Részleg, Vagy Eszköz):</label>
                <textarea rows="3" class="loc-input" placeholder="Pl. Földszint, Élosztó, Q2 kismegszakító..."></textarea>
            </div>
            
            <div class="defect-image">
                <label>Fotó csatolása:</label>
                <div class="image-upload-area" style="cursor:pointer;">
                    <span class="upload-txt">+ Kattints ide kép feltöltéséhez</span>
                    <img class="img-preview" src="" style="display:none; max-width: 100%; max-height: 150px; border-radius: 4px; margin-top: 10px;" />
                </div>
                <input type="file" class="photo-input" accept="image/*" style="display:none;" />
                <button type="button" class="btn btn-danger btn-small" onclick="this.closest('.defect-card').remove()" style="margin-top: 10px; width: 100%;">❌ Hiba Törlése</button>
            </div>
        `;

        defectList.appendChild(defectRow);

        // Event listener az Auto-fill funkcióhoz
        const tplSelect = defectRow.querySelector('.tpl-select');
        const descInput = defectRow.querySelector('.desc-input');
        const deadlineInput = defectRow.querySelector('.deadline-input');
        const standardInput = defectRow.querySelector('.standard-input');

        tplSelect.addEventListener('change', (e) => {
            const hibaId = e.target.value;
            if (hibaId && typeof vbfData !== 'undefined') {
                const hibaData = vbfData.tipikus_hibak.find(h => h.id === hibaId);
                if (hibaData) {
                    descInput.value = hibaData.sablon_szoveg + "\\n" + "Javasolt intézkedés: " + hibaData.javasolt_intezkedes;
                    standardInput.value = hibaData.szabvany_pont;

                    // Határidő beállítása a súlyosság alapján
                    const sulyossagObj = vbfData.sulyossagi_szintek[hibaData.sulyossag];
                    if (sulyossagObj && sulyossagObj.hatarido) {
                        // Keresés a select opciók között
                        const optionToSelect = Array.from(deadlineInput.options).find(opt => opt.value === sulyossagObj.hatarido || opt.text.includes(sulyossagObj.hatarido));
                        if (optionToSelect) optionToSelect.selected = true;
                    }
                }
            } else {
                descInput.value = "";
                standardInput.value = "";
            }
        });

        const uploadArea = defectRow.querySelector('.image-upload-area');
        const photoInput = defectRow.querySelector('.photo-input');
        const imgPreview = defectRow.querySelector('.img-preview');
        const uploadTxt = defectRow.querySelector('.upload-txt');

        uploadArea.addEventListener('click', () => {
            photoInput.click();
        });

        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    const img = new Image();
                    img.onload = function () {
                        const canvas2 = document.createElement('canvas');
                        const ctx = canvas2.getContext('2d');
                        const MAX_WIDTH = 800;
                        let width = img.width;
                        let height = img.height;
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                        canvas2.width = width;
                        canvas2.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        const dataUrl = canvas2.toDataURL('image/jpeg', 0.8);

                        imgPreview.src = dataUrl;
                        imgPreview.style.display = 'block';
                        uploadTxt.style.display = 'none';
                        defectRow.setAttribute('data-photo', dataUrl);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    });
});

const btnGenerateDefects = document.getElementById('btnGenerateDefects');
if (btnGenerateDefects) {
    btnGenerateDefects.addEventListener('click', () => {
        let foundDefects = 0;

        // Segédfüggvény egy táblázat sorainak vizsgálatához
        const scanTable = (selector, extractFn) => {
            document.querySelectorAll(selector).forEach(tr => {
                const passSelect = tr.querySelector('.meas-pass');
                if (passSelect && passSelect.value === 'Nem') {
                    foundDefects++;
                    btnAddDefect.click();
                    const lastDefect = defectList.lastElementChild;
                    if (lastDefect) {
                        const descInput = lastDefect.querySelector('.desc-input');
                        const locInput = lastDefect.querySelector('.loc-input');
                        const details = extractFn(tr);
                        if (descInput) descInput.value = details.desc;
                        if (locInput) locInput.value = details.loc || '';

                        // Copy photo if attached to the measurement row
                        const attrPhoto = tr.getAttribute('data-photo');
                        if (attrPhoto) {
                            lastDefect.setAttribute('data-photo', attrPhoto);
                            const imgPreview = lastDefect.querySelector('.img-preview');
                            const uploadTxt = lastDefect.querySelector('.upload-txt');
                            if (imgPreview && uploadTxt) {
                                imgPreview.src = attrPhoto;
                                imgPreview.style.display = 'block';
                                uploadTxt.style.display = 'none';
                            }
                        }
                    }
                }
            });
        };

        // RPE Táblázat
        scanTable('#table-rpe tbody tr', (tr) => {
            const loc = tr.querySelector('.meas-loc')?.value || '';
            const val = tr.querySelector('.meas-val')?.value || '';
            return {
                desc: `A védővezető folytonossága nem megfelelő. Mért érték: ${val} Ω (Követelmény: ≤ 1.0 Ω). Javaslat: Kötések ellenőrzése, utánahúzása, szükség esetén a vezeték cseréje.`,
                loc: loc
            };
        });

        // Szigetelés Táblázat
        scanTable('#table-insulation tbody tr', (tr) => {
            const circ = tr.querySelector('.meas-circuit')?.value || '';
            const ln = tr.querySelector('.meas-ln')?.value || '';
            const lpe = tr.querySelector('.meas-lpe')?.value || '';
            const npe = tr.querySelector('.meas-npe')?.value || '';
            return {
                desc: `Szigetelési ellenállás érték határértéken kívül. Mért értékek [MΩ]: L-N: ${ln}, L-PE: ${lpe}, N-PE: ${npe} (Követelmény: ≥ 1.0 MΩ). Javaslat: Vezetékrendszer és kötődobozok szigetelésvizsgálata, rágás/sérülés keresése.`,
                loc: circ
            };
        });

        // Hurok Táblázat
        scanTable('#table-loop tbody tr', (tr) => {
            const circ = tr.querySelector('.meas-circuit')?.value || '';
            const loc = tr.querySelector('.meas-loc')?.value || '';
            const device = tr.querySelector('.meas-device')?.value || '';
            const val = tr.querySelector('.meas-zs')?.value || '';
            return {
                desc: `A hurokellenállás értéke nem biztosítja a ${device} kikapcsoló szerv előírt időn belüli kioldását. Mért Zs érték: ${val} Ω. Javaslat: Keresztmetszet-növelés vagy ÁVK (RCD) beépítése javasolt a kiegészítő védelemhez.`,
                loc: `${circ} (${loc})`
            };
        });

        // RCD Táblázat
        scanTable('#table-rcd tbody tr', (tr) => {
            const circ = tr.querySelector('.meas-circ')?.value || '';
            const idn = tr.querySelector('.meas-idn')?.value || '';
            const t1 = tr.querySelector('.meas-t1')?.value || '';
            return {
                desc: `Az ÁVK (FI-relé) kioldási ideje vagy kioldó árama nem megfelelő. Kioldási idő (1xIdn): ${t1} ms, Névleges áram: ${idn} mA. Javaslat: Az ÁVK azonnali cseréje és az áramkör felülvizsgálata javasolt!`,
                loc: circ
            };
        });

        // EPH Táblázat
        scanTable('#table-eph tbody tr', (tr) => {
            const node = tr.querySelector('.meas-loc')?.value || '';
            const conn = tr.querySelector('.meas-elem')?.value || '';
            const val = tr.querySelector('.meas-val')?.value || '';
            return {
                desc: `A ${conn} és a ${node} EPH csomópont közötti földelővezető vagy összekötő vezető folytonossága / ellenállása nem megfelelő. Mért Rpe érték: ${val} Ω. Javaslat: Földelési / EPH kötés javítása elengedhetetlen!`,
                loc: `Csomópont: ${node}, Eszköz: ${conn}`
            };
        });

        // Szerszám Táblázat
        scanTable('#table-tools tbody tr', (tr) => {
            const name = tr.querySelector('.meas-name')?.value || '';
            const id = tr.querySelector('.meas-id')?.value || '';
            const val = tr.querySelector('.meas-val')?.value || '';
            return {
                desc: `A ${name} megnevezésű kéziszerszám / berendezés szigetelési ellenállása nem megfelelő. Mért érték: ${val} MΩ (Követelmény: ≥ 2.0 MΩ). Javaslat: Eszköz javítása vagy selejtezése!`,
                loc: `Eszköz: ${name}, Azonosító: ${id}`
            };
        });

        // SELV/PELV Táblázat
        scanTable('#table-selv tbody tr', (tr) => {
            const loc = tr.querySelector('.meas-loc')?.value || '';
            const v = tr.querySelector('.meas-v')?.value || '';
            return {
                desc: `SELV/PELV áramkör érintésvédelmi vagy szigetelési paraméterei nem megfelelőek. Szekunder feszültség: ${v} V. Javaslat: Biztonsági transzformátor vagy leválasztó áramkör felülvizsgálata!`,
                loc: loc
            };
        });

        if (foundDefects > 0) {
            alert(`✅ ${foundDefects} db hibát sikeresen kigyűjtöttem a mérésekből a Hibajegyzékbe! Lépj át a "Feltárt Hibák" fülre a megtekintéshez!`);
            // Navigáljunk is át a tabra
            const btnTabs = document.querySelectorAll('.nav-tab');
            btnTabs.forEach(btn => {
                if (btn.innerText.includes('Hibajegyzék')) btn.click();
            });
        } else {
            alert(`Nincs "NEM" vagy "Piros" jelzésű mérés a táblázatokban!(Yuhuu!)`);
        }
    });
}

