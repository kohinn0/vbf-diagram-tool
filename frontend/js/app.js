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
                        const MAX_WIDTH = 800; // Optimal for reports
                        let width = img.width;
                        let height = img.height;
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                        canvas2.width = width;
                        canvas2.height = height;
                        ctx.drawImage(img, 0, 0, width, height);

                        // Use WebP compression instead of JPEG for much better size vs quality ratio
                        const dataUrl = canvas2.toDataURL('image/webp', 0.7);

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
                        const stdInput = lastDefect.querySelector('.standard-input');
                        const details = extractFn(tr);
                        if (descInput) descInput.value = details.desc;
                        if (locInput) locInput.value = details.loc || '';
                        if (stdInput) stdInput.value = details.standard || '';

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

        // RPE Táblázat — M1 melléklet, Védővezető folytonosság
        scanTable('#table-rpe tbody tr', (tr) => {
            const loc = tr.querySelector('.meas-loc')?.value || '';
            const val = tr.querySelector('.meas-val')?.value || '';
            return {
                desc: `A védővezető folytonossága nem megfelelő. Mért érték: ${val} Ω (Követelmény: ≤ 1.0 Ω). Javaslat: Kötések ellenőrzése, utánahúzása, szükség esetén a vezeték cseréje.`,
                loc: loc,
                standard: 'MSZ HD 60364-6:2017 §61.3.2 (Védővezető folytonosság); MEE Kézikönyv M1; 40/2017. (XII.4.) NGM 5.§'
            };
        });

        // Szigetelés Táblázat — M6 melléklet, Hálózat szigetelési ellenállás
        scanTable('#table-insulation tbody tr', (tr) => {
            const circ = tr.querySelector('.meas-circuit')?.value || '';
            const ln = tr.querySelector('.meas-ln')?.value || '';
            const lpe = tr.querySelector('.meas-lpe')?.value || '';
            const npe = tr.querySelector('.meas-npe')?.value || '';
            return {
                desc: `Szigetelési ellenállás érték határértéken kívül. Mért értékek [MΩ]: L-N: ${ln}, L-PE: ${lpe}, N-PE: ${npe} (Követelmény: ≥ 1.0 MΩ, 500V DC mérőfeszültség). Javaslat: Vezetékrendszer és kötődobozok szigetelésvizsgálata, rágás/sérülés keresése.`,
                loc: circ,
                standard: 'MSZ HD 60364-6:2017 §61.3.3 (Szigetelési ellenállás); MEE Kézikönyv M6; TvMI 7.7:2026.02.01 §4.3'
            };
        });

        // Hurok Táblázat — M1 melléklet, Hibavédelem ellenőrzése
        scanTable('#table-loop tbody tr', (tr) => {
            const circ = tr.querySelector('.meas-circuit')?.value || '';
            const loc = tr.querySelector('.meas-loc')?.value || '';
            const device = tr.querySelector('.meas-device')?.value || '';
            const val = tr.querySelector('.meas-zs')?.value || '';
            // Számolt határérték
            const curve = device.toUpperCase().match(/[A-Z]+/)?.[0] || '';
            const In = parseFloat(device.match(/[0-9.]+/)?.[0]);
            let maxZsStr = '';
            if (curve && !isNaN(In)) {
                let Ia = 0;
                if (curve === 'B') Ia = In * 5;
                else if (curve === 'C') Ia = In * 10;
                else if (curve === 'D') Ia = In * 20;
                if (Ia > 0) maxZsStr = ` (Határérték: Zs ≤ ${((230 * 0.95) / Ia).toFixed(2)} Ω, ${curve}${In}A, Ia=${Ia}A)`;
            }
            return {
                desc: `A hurokellenállás értéke nem biztosítja a ${device} kikapcsoló szerv előírt időn belüli kioldását. Mért Zs érték: ${val} Ω${maxZsStr}. Képlet: Zs ≤ (U₀×0.95)/Ia. Javaslat: Keresztmetszet-növelés vagy ÁVK (RCD) beépítése javasolt a kiegészítő védelemhez.`,
                loc: `${circ} (${loc})`,
                standard: 'MSZ HD 60364-6:2017 §61.3.6 (Hurokimpedancia); MSZ HD 60364-4-41:2017 §411.4; MEE Kézikönyv M1; 40/2017. (XII.4.) NGM 5.§'
            };
        });

        // RCD Táblázat — M5 melléklet, FI-relék (áram-védőkapcsoló)
        scanTable('#table-rcd tbody tr', (tr) => {
            const circ = tr.querySelector('.meas-circ')?.value || '';
            const idn = tr.querySelector('.meas-idn')?.value || '';
            const t1 = tr.querySelector('.meas-t1')?.value || '';
            return {
                desc: `Az ÁVK (FI-relé) kioldási ideje vagy kioldó árama nem megfelelő. Kioldási idő (1×Idn): ${t1} ms (Követelmény: ≤ 300 ms általános, ≤ 40 ms perszonális védelem), Névleges áram: ${idn} mA. Javaslat: Az ÁVK azonnali cseréje és az áramkör felülvizsgálata!`,
                loc: circ,
                standard: 'MSZ HD 60364-6:2017 §61.3.7 (ÁVK vizsgálat); MSZ EN 61008-1; MEE Kézikönyv M5; TvMI 7.7:2026.02.01 §4.4'
            };
        });

        // EPH Táblázat — Egyenértékű potenciálkiegyenlítés
        scanTable('#table-eph tbody tr', (tr) => {
            const node = tr.querySelector('.meas-loc')?.value || '';
            const conn = tr.querySelector('.meas-elem')?.value || '';
            const val = tr.querySelector('.meas-val')?.value || '';
            return {
                desc: `A ${conn} és a ${node} EPH csomópont közötti földelővezető vagy összekötő vezető folytonossága / ellenállása nem megfelelő. Mért Rpe érték: ${val} Ω. Javaslat: Földelési / EPH kötés javítása elengedhetetlen!`,
                loc: `Csomópont: ${node}, Eszköz: ${conn}`,
                standard: 'MSZ HD 60364-5-54:2011 §544 (EPH rendszer); MSZ HD 60364-4-41:2017 §411.3.1.2; 40/2017. (XII.4.) NGM 6.§'
            };
        });

        // Szerszám Táblázat — M3-M4 melléklet, Kéziszerszámok
        scanTable('#table-tools tbody tr', (tr) => {
            const name = tr.querySelector('.meas-name')?.value || '';
            const id = tr.querySelector('.meas-id')?.value || '';
            const val = tr.querySelector('.meas-val')?.value || '';
            return {
                desc: `A ${name} megnevezésű kéziszerszám / berendezés szigetelési ellenállása nem megfelelő. Mért érték: ${val} MΩ (Követelmény: ≥ 2.0 MΩ, II. érintésvédelmi osztály). Javaslat: Eszköz javítása vagy selejtezése!`,
                loc: `Eszköz: ${name}, Azonosító: ${id}`,
                standard: 'MSZ EN 60745-1 (Kéziszerszámok biztonsága); MEE Kézikönyv M3-M4; MSZ 1585:2021'
            };
        });

        // SELV/PELV Táblázat — M2 melléklet, Törpefeszültség
        scanTable('#table-selv tbody tr', (tr) => {
            const loc = tr.querySelector('.meas-loc')?.value || '';
            const v = tr.querySelector('.meas-v')?.value || '';
            return {
                desc: `SELV/PELV áramkör érintésvédelmi vagy szigetelési paraméterei nem megfelelőek. Szekunder feszültség: ${v} V (Követelmény: max. 50V AC / 120V DC). Javaslat: Biztonsági transzformátor vagy leválasztó áramkör felülvizsgálata!`,
                loc: loc,
                standard: 'MSZ HD 60364-4-41:2017 §414 (SELV/PELV); MSZ EN 61558-2-6 (Biztonsági transzformátorok); MEE Kézikönyv M2'
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

// ==========================================
// AUTHENTICATION & API INTEGRATION (NEW)
const API_BASE_URL = (window.location.protocol === 'file:')
    ? 'http://127.0.0.1:8001/api'
    : `${window.location.protocol}//${window.location.hostname}:8001/api`;
let currentToken = localStorage.getItem('vbf_token');
let currentUser = localStorage.getItem('vbf_user');

const userInfoSpan = document.getElementById('userInfo');
const btnLoginNav = document.getElementById('btnLoginNav');
const btnSaveCloud = document.getElementById('btnSaveCloud');
const btnExportWord = document.getElementById('btnExportWord');
const btnExportPdfReport = document.getElementById('btnExportPdfReport');
const loginModal = document.getElementById('loginModal');
const btnSubmitLogin = document.getElementById('btnSubmitLogin');
const btnEmailReport = document.getElementById('btnEmailReport');

if (btnEmailReport) {
    btnEmailReport.addEventListener('click', () => {
        if (currentSavedReportId) {
            sendEmailReport(currentSavedReportId);
        } else {
            alert('Előbb menteni / betölteni kell egy jegyzőkönyvet a felhőből!');
        }
    });
}

// OFFLINE INDICATOR ELEMENTS
const offlineIndicator = document.getElementById('offlineIndicator');
const offlineDot = document.getElementById('offlineDot');
const offlineText = document.getElementById('offlineText');
const btnSyncOffline = document.getElementById('btnSyncOffline');
const offlineCountSpan = document.getElementById('offlineCount');
const btnCloseLogin = document.getElementById('btnCloseLogin');
const loginError = document.getElementById('loginError');
let currentSavedReportId = null;

function formatDocId(typeStr, id, dateStr) {
    if (!id) return "ÚJ";
    const t = (typeStr || "VBF").toUpperCase();
    const shortT = t === "EPH" ? "EPH" : "VBF";
    const d = dateStr ? new Date(dateStr) : new Date();
    const y = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    const padId = String(id).padStart(3, '0');
    return `${shortT} -${y} -${padId} `;
}

async function fetchReports() {
    const reportListContainer = document.getElementById('reportListContainer');
    if (!reportListContainer || !currentToken) {
        if (reportListContainer) reportListContainer.innerHTML = '<p>Jelentkezz be a jegyzőkönyvek megtekintéséhez.</p>';
        return;
    }

    reportListContainer.innerHTML = '<p>Betöltés...</p>';

    try {
        const res = await fetch(`${API_BASE_URL}/reports`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const reports = await res.json();

        if (reports.length === 0) {
            reportListContainer.innerHTML = '<p>Még nincs elmentett jegyzőkönyved.</p>';
            return;
        }

        reportListContainer.innerHTML = '';
        reports.forEach(rep => {
            const docId = formatDocId(rep.report_type, rep.id, rep.created_at);
            const card = document.createElement('div');
            card.className = 'report-card panel-glass';
            card.innerHTML = `
                    <h4>[${docId}] ${rep.title}</h4>
                    <p class="meta">Típus: ${rep.report_type.toUpperCase()}<br>Létrehozva: ${new Date(rep.created_at).toLocaleDateString()}</p>
                    <div class="actions">
                        <button class="btn btn-primary btn-small" onclick="loadReport(${rep.id})">Betöltés</button>
                        <button class="btn btn-secondary btn-small" onclick="cloneReport(${rep.id})">Másolás</button>
                        <button class="btn btn-accent btn-small" onclick="sendEmailReport(${rep.id})" style="background: #10b981; color: white;">Email Küldése ✉️</button>
                        <button class="btn btn-danger btn-small" onclick="deleteReport(${rep.id})">Törlés</button>
                    </div>
                `;
            reportListContainer.appendChild(card);
        });
    } catch (err) {
        reportListContainer.innerHTML = '<p style="color:red">Hiba a betöltés során.</p>';
    }
}

// UI Frissítő függvény
async function updateAuthUI() {
    if (currentToken && currentUser) {
        userInfoSpan.innerText = `Szia, ${currentUser}!`;
        btnLoginNav.innerText = 'Kijelentkezés';
        btnLoginNav.classList.replace('btn-secondary', 'btn-danger');
        btnSaveCloud.style.display = 'inline-block';
        document.getElementById('btnFinalize').style.display = 'inline-block';
        fetchReports();
        fetchJobs(); // NEW: Fetch jobs when logged in

        // Check Admin Status
        try {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const userData = await res.json();
                window.currentUserRole = userData.role;

                const cloudTab = document.querySelector('.nav-tab[data-target="tab-cloud"]');
                const masterTab = document.querySelector('.nav-tab[data-target="tab-master-data"]');
                const dashboardTab = document.getElementById('navDashboard');

                if (userData.role === 'ADMIN') {
                    document.getElementById('navAdmin').style.display = 'inline-block';
                    if (cloudTab) cloudTab.style.display = 'inline-block';
                    if (masterTab) masterTab.style.display = 'inline-block';
                    if (dashboardTab) dashboardTab.style.display = 'inline-block';
                    fetchAdminUsers();
                    fetchCompanySettings();
                } else {
                    document.getElementById('navAdmin').style.display = 'none';
                    if (cloudTab) cloudTab.style.display = 'none';
                    if (masterTab) masterTab.style.display = 'none';
                    if (dashboardTab) dashboardTab.style.display = 'none';
                }
            }
        } catch (err) { console.error("Admin check failed", err); }

    } else {
        userInfoSpan.innerText = '';
        btnLoginNav.innerText = 'Bejelentkezés';
        btnLoginNav.classList.replace('btn-danger', 'btn-secondary');
        btnSaveCloud.style.display = 'none';
        btnExportWord.style.display = 'none';
        if (btnExportPdfReport) btnExportPdfReport.style.display = 'none';
        if (btnEmailReport) btnEmailReport.style.display = 'none';
        document.getElementById('btnFinalize').style.display = 'none';
        document.getElementById('navAdmin').style.display = 'none';

        const cloudTab = document.querySelector('.nav-tab[data-target="tab-cloud"]');
        const masterTab = document.querySelector('.nav-tab[data-target="tab-master-data"]');
        if (cloudTab) cloudTab.style.display = 'none';
        if (masterTab) masterTab.style.display = 'none';

        currentSavedReportId = null;
        if (document.getElementById('reportListContainer')) {
            document.getElementById('reportListContainer').innerHTML = '<p>Jelentkezz be a jegyzőkönyvek megtekintéséhez.</p>';
        }
    }
}

async function fetchCompanySettings() {
    try {
        const res = await fetch(`${API_BASE_URL}/admin/company`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            const data = await res.json();
            document.getElementById('adminCompName').value = data.company_name || '';
            document.getElementById('adminCompTax').value = data.tax_number || '';
            document.getElementById('adminCompAddress').value = data.address || '';
            document.getElementById('adminCompBank').value = data.bank_account || '';

            if (data.logo_path) {
                const img = document.getElementById('adminCompLogoPreview');
                // Ha statikus fileról van szó:
                img.src = `${API_BASE_URL.replace('/api', '')}/${data.logo_path}`;
                img.style.display = 'block';
            }
        }
    } catch (e) {
        console.error("Nem sikerült betölteni a céges adatokat", e);
    }
}

document.getElementById('btnAdminSaveCompany')?.addEventListener('click', async () => {
    const data = {
        company_name: document.getElementById('adminCompName').value,
        tax_number: document.getElementById('adminCompTax').value,
        address: document.getElementById('adminCompAddress').value,
        bank_account: document.getElementById('adminCompBank').value
    };
    try {
        const res = await fetch(`${API_BASE_URL}/admin/company`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('Céges adatok sikeresen elmentve!');
        } else {
            alert('Hiba történt a mentés során.');
        }
    } catch (e) {
        alert('Hálózati hiba: ' + e.message);
    }
});

document.getElementById('btnAdminUploadLogo')?.addEventListener('click', () => {
    document.getElementById('adminCompLogoInput').click();
});

document.getElementById('adminCompLogoInput')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch(`${API_BASE_URL}/admin/company/logo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            const img = document.getElementById('adminCompLogoPreview');
            img.src = `${API_BASE_URL.replace('/api', '')}/${data.logo_path}?t=${new Date().getTime()}`;
            img.style.display = 'block';
            alert('Logó sikeresen feltöltve!');
        } else {
            alert('Hiba történt a logó feltöltésekor.');
        }
    } catch (err) {
        alert('Hálózati hiba: ' + err.message);
    }
});

async function fetchAdminUsers() {
    const list = document.getElementById('adminUserList');
    if (!list) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) {
            list.innerHTML = '<tr><td colspan="6">Hiba történt a felhasználók lekérdezése közben. Nincs jogosultságod vagy lejárt a tokened.</td></tr>';
            return;
        }
        const users = await res.json();
        if (!Array.isArray(users)) return;
        list.innerHTML = '';

        // Populate the Dropdown for Job Assignments as well
        const jobAssignSelect = document.getElementById('adminJobAssignSelect');
        if (jobAssignSelect) {
            jobAssignSelect.innerHTML = '<option value="">-- Válassz kollégát --</option>';
        }

        users.forEach(u => {
            if (jobAssignSelect) {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.text = `${u.username} (${u.role})`;
                jobAssignSelect.appendChild(opt);
            }

            const tr = document.createElement('tr');
            const expiry = u.subscription_expires ? new Date(u.subscription_expires).toISOString().split('T')[0] : '';
            tr.innerHTML = `
                    <td>${u.id}</td>
                    <td>${u.username}</td>
                    <td><input type="email" value="${u.email || ''}" onchange="updateUser(${u.id}, {email: this.value})" style="width: 150px; padding: 0.2rem;" placeholder="Email cím"></td>
                    <td>
                        <select onchange="updateUser(${u.id}, {is_active: this.value === 'active'})">
                            <option value="active" ${u.is_active ? 'selected' : ''}>Aktív</option>
                            <option value="inactive" ${!u.is_active ? 'selected' : ''}>Tiltott</option>
                        </select>
                    </td>
                    <td>
                        <select onchange="updateUser(${u.id}, {role: this.value})">
                            <option value="TECH" ${u.role === 'TECH' ? 'selected' : ''}>Villanyszerelő</option>
                            <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Admin / Cégvezető</option>
                        </select>
                    </td>
                    <td>
                        <input type="date" value="${expiry}" onchange="updateUser(${u.id}, {subscription_expires: this.value})">
                    </td>
                    <td>
                        <button class="btn btn-danger btn-small" onclick="deleteUser(${u.id})">Törlés</button>
                    </td>
                `;
            list.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

window.updateUser = async function (id, data) {
    try {
        // Fix date format if needed (handle empty date string -> null)
        if (data.subscription_expires !== undefined) {
            if (data.subscription_expires) {
                data.subscription_expires = new Date(data.subscription_expires).toISOString();
            } else {
                data.subscription_expires = null;
            }
        }
        const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(data)
        });
        if (res.ok) alert('Felhasználó frissítve!');
        else alert('Hiba a frissítés során!');
    } catch (err) { alert(err.message); }
};

window.deleteUser = async function (id) {
    if (!confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        if (res.ok) {
            alert('Felhasználó törölve!');
            fetchAdminUsers();
        } else {
            alert('Hiba a törlés során!');
        }
    } catch (err) { alert(err.message); }
};

// QR MODAL LOGIC
const qrModal = document.getElementById('qrModal');
const btnScanQr = document.getElementById('btnScanQr');
const btnCloseQr = document.getElementById('btnCloseQr');
const btnSubmitManualQr = document.getElementById('btnSubmitManualQr');
const manualQrId = document.getElementById('manualQrId');
let html5QrcodeScanner = null;

btnScanQr?.addEventListener('click', () => {
    qrModal.style.display = 'flex';
    if (!html5QrcodeScanner && window.Html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner(
            "qrReaderPlaceholder",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );
        html5QrcodeScanner.render((decodedText) => {
            const numericId = decodedText.replace(/[^0-9]/g, '');
            if (numericId) {
                window.loadReport(numericId);
                closeQrScanner();
            }
        }, (error) => {
            // ignore scan frame errors
        });
    }
});

function closeQrScanner() {
    qrModal.style.display = 'none';
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(e => console.error(e));
        html5QrcodeScanner = null;
        document.getElementById('qrReaderPlaceholder').innerHTML = '<p>[ Kamerakép ... ]</p>';
    }
}

btnCloseQr?.addEventListener('click', closeQrScanner);

btnSubmitManualQr?.addEventListener('click', () => {
    const id = manualQrId.value.trim();
    if (id) {
        const numericId = id.replace(/[^0-9]/g, '');
        if (numericId) {
            window.loadReport(numericId);
            closeQrScanner();
        }
    }
});

// FINALIZATION LOGIC
document.getElementById('btnFinalize')?.addEventListener('click', async () => {
    if (!currentSavedReportId) return alert('Előbb mentsd el a jegyzőkönyvet!');
    if (!confirm('Biztosan véglegesíted? Ezután a módosítás már nem lehetséges!')) return;

    try {
        const res = await fetch(`${API_BASE_URL}/reports/${currentSavedReportId}/finalize`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            alert('Jegyzőkönyv véglegesítve! (LOCKED)');
            window.loadReport(currentSavedReportId); // Reload to lock UI
        }
    } catch (err) { alert('Szerver hiba a véglegesítéskor.'); }
});

window.deleteMyAccount = async function () {
    if (!confirm('FIGYELEM! Ezzel minden adatod és jegyzőkönyved VÉGLEG törlődik. Nincs visszaút. Folytatod?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/users/me`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            alert('Fiók törölve. Viszlát!');
            localStorage.clear();
            window.location.reload();
        }
    } catch (err) { alert('Hiba a törlés során.'); }
};

updateAuthUI();

// DocType változás figyelése (EPH szekció)
const docTypeSelect = document.getElementById('docType');
const sectionEPH = document.getElementById('sectionEPH');
const vbfMeasurements = document.getElementById('vbf-measurements');
const ephMeasurements = document.getElementById('eph-measurements');

if (docTypeSelect && sectionEPH) {
    docTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'EPH') {
            sectionEPH.style.display = 'block';
            if (vbfMeasurements) vbfMeasurements.style.display = 'none';
            if (ephMeasurements) ephMeasurements.style.display = 'block';
        } else if (e.target.value === 'VBF_ELSO') {
            sectionEPH.style.display = 'none';
            if (vbfMeasurements) vbfMeasurements.style.display = 'block';
            if (ephMeasurements) ephMeasurements.style.display = 'none';
        } else {
            sectionEPH.style.display = 'none';
            if (vbfMeasurements) vbfMeasurements.style.display = 'block';
            if (ephMeasurements) ephMeasurements.style.display = 'none';
        }
    });
}

// -- Áramkör nevek Datalist betöltése --
if (window.vbfData && window.vbfData.aramkor_nevek) {
    const dl = document.createElement('datalist');
    dl.id = 'circuitNames';
    window.vbfData.aramkor_nevek.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        dl.appendChild(opt);
    });
    document.body.appendChild(dl);
}

// --- MÉRÉSI ADATOK LOGIKA → measurements.js-be került ---



// --- PADFX / Metrel Fájl Betöltés Logika ---
const btnLoadPadfx = document.getElementById('btnLoadPadfx');
const inputPadfx = document.getElementById('inputPadfx');

if (btnLoadPadfx && inputPadfx) {
    btnLoadPadfx.addEventListener('click', () => {
        inputPadfx.click();
    });

    inputPadfx.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            btnLoadPadfx.innerText = 'Feldolgozás... ⏳';
            const res = await fetch(`${API_BASE_URL}/padfx/parse`, {
                method: 'POST',
                headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {},
                body: formData
            });

            const data = await res.json();
            console.log("Metrel PADFX (Adatbázis / XML) Elemzés Eredménye:", data);

            if (data.status === 'success') {
                if (data.is_sqlite) {
                    alert('✅ Sikeresen kicsomagoltuk a Metrel SQLite adatbázist a szerveren!\n\nKérlek ellenőrizd a böngésző F12 Konszolját, mert oda kiírtam a táblák neveit és a minta adatokat. Kérlek másold ki és küldd el az AI-nak a struktúrát (például Dataset vagy Measurements táblát), hogy be tudjam fejezni a programozást!');
                } else if (data.measurements) {
                    alert(`✅ Sikeres Metrel kicsomagolás!\n\n${data.measurements.length} db mérést azonosítottam a fájlban. Most automatikusan betöltöm azokat a megfelelő Jegyzőkönyv táblázatokba!`);

                    let rpeCount = 0;
                    let zsCount = 0;
                    let rcdCount = 0;

                    data.measurements.forEach(m => {
                        if (m.type === "Rpe Folytonosság") {
                            const val = m.results["r_43"] || m.results["r_46"] || "";
                            createRow('table-rpe', `
                                    <td><input type="number" class="meas-point" value="${++rpeCount}"></td>
                                    <td><input type="text" class="meas-loc" value="${m.location}"></td>
                                    <td><input type="number" step="0.01" class="meas-val" value="${parseFloat(val) || val}" oninput="validateRpe(this.closest('tr'))"></td>
                                    <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
                                `);
                            // Automatikus validáció futtatása
                            const lastRow = document.querySelector('#table-rpe tbody tr:last-child');
                            if (lastRow) validateRpe(lastRow);
                        }
                        else if (m.type === "Zs Hurokellenállás") {
                            // R38 vagy R205 vagy R261 a hurok értéke általában Ohmm-ban
                            const zsValStr = m.results["r_38"] || m.results["r_205"] || m.results["r_261"] || m.results["r_269"] || "";
                            let zsVal = parseFloat(zsValStr);
                            if (isNaN(zsVal)) zsVal = "";

                            // Eszköz karakterisztika
                            const char = m.params["p_108"] || "B";
                            const rating = m.params["p_28"] || "16 A";
                            const device = char + parseInt(rating); // pl C16

                            createRow('table-loop', `
                                    <td><input type="text" class="meas-circuit" value="${m.location}" list="circuitNames"></td>
                                    <td><input type="text" class="meas-device" value="${device}" oninput="validateZs(this.closest('tr'))"></td>
                                    <td><input type="text" class="meas-loc" value="${m.location}"></td>
                                    <td><input type="number" step="0.01" class="meas-zs" value="${zsVal}" oninput="validateZs(this.closest('tr'))"></td>
                                    <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
                                `);
                            const lastRow = document.querySelector('#table-loop tbody tr:last-child');
                            if (lastRow) validateZs(lastRow);
                        }
                        else if (m.type === "RCD (FI-relé)") {
                            const idn = parseInt(m.params["p_28"]) || 30;
                            const t1 = parseFloat(m.results["r_28"]) || "";
                            createRow('table-rcd', `
                                    <td><input type="text" class="meas-circ" value="${m.location}" list="circuitNames"></td>
                                    <td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td>
                                    <td><input type="number" class="meas-idn" value="${idn}" oninput="validateRcd(this.closest('tr'))"></td>
                                    <td><select class="meas-05"><option>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td>
                                    <td><input type="number" step="1" class="meas-t1" value="${t1}" oninput="validateRcd(this.closest('tr'))"></td>
                                    <td><input type="number" step="1" class="meas-t5" placeholder="12" oninput="validateRcd(this.closest('tr'))"></td>
                                    <td><input type="number" step="0.1" class="meas-ramp" placeholder="21" oninput="validateRcd(this.closest('tr'))"></td>
                                    <td><input type="number" step="0.1" class="meas-uc" placeholder="1.2"></td>
                                    <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
                                `);
                            const lastRow = document.querySelector('#table-rcd tbody tr:last-child');
                            if (lastRow) validateRcd(lastRow);
                        }
                    });
                }
            } else {
                alert('Hiba történt a PADFX fájl feldolgozása során: ' + (data.message || 'Ismeretlen hiba'));
            }
        } catch (err) {
            alert('Hiba a fájl feltöltésekor: ' + err.message);
        } finally {
            btnLoadPadfx.innerText = 'Metrel PADFX Import 📥';
            e.target.value = '';
        }
    });
}

// Navigációs gomb kattintás
btnLoginNav.addEventListener('click', () => {
    if (currentToken) {
        // Kijelentkezés
        localStorage.removeItem('vbf_token');
        localStorage.removeItem('vbf_user');
        currentToken = null;
        currentUser = null;
        updateAuthUI();
    } else {
        loginModal.style.display = 'flex';
    }
});

btnCloseLogin.addEventListener('click', () => {
    loginModal.style.display = 'none';
    loginError.innerText = '';
});

// Bejelentkezés vagy Regisztráció
btnSubmitLogin.addEventListener('click', async () => {
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;

    if (!username || !password) {
        loginError.innerText = 'Kérlek töltsd ki mindkét mezőt!';
        return;
    }

    try {
        // Próbáljuk meg a login-t
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        let res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || 'Hibás bejelentkezési adatok!');
        }

        const data = await res.json();
        currentToken = data.access_token;
        currentUser = username;

        localStorage.setItem('vbf_token', currentToken);
        localStorage.setItem('vbf_user', currentUser);

        updateAuthUI();
        loginModal.style.display = 'none';
        loginError.innerText = '';

    } catch (error) {
        loginError.innerText = error.message;
    }
});

// ==========================================
// SZABVÁNYOSSÁGI VALIDÁCIÓ ÉS MEE MINŐSÍTÉS
// TvMI 7.7:2026.02.01 alapján
// ==========================================

/**
 * Validates mandatory fields before allowing save/finalization.
 * Returns an object: { valid: boolean, errors: string[], warnings: string[] }
 */
function validateReportBeforeSave() {
    const errors = [];
    const warnings = [];
    const docType = document.getElementById('docType')?.value || '';
    const isVBF = docType.startsWith('VBF_');

    // ═══════════════════════════════════════════════════
    // 1. KÖTELEZŐ MÉRÉSEK (MSZ HD 60364-6 Stop-szabályok)
    // ═══════════════════════════════════════════════════
    if (isVBF) {
        // 1a. Riso - Szigetelési ellenállás (M6 melléklet)
        const insulationRows = document.querySelectorAll('#table-insulation tbody tr');
        if (insulationRows.length === 0) {
            errors.push('⚠️ KÖTELEZŐ SZIGETELÉSMÉRÉS (Riso) HIÁNYZIK!\n' +
                'Az MSZ HD 60364-6 szerint kötelező mérni minden áramkör\n' +
                'szigetelési ellenállását (Riso ≥ 1 MΩ, 500V DC mérőfesz.)\n' +
                'az aktív vezetők és a föld között.\n' +
                'A jegyzőkönyv NEM zárható le ezen adatsor kitöltése nélkül!');
        }

        // 1b. Zs - Hurokellenállás (M1 melléklet)
        const loopRows = document.querySelectorAll('#table-loop tbody tr');
        if (loopRows.length === 0) {
            errors.push('⚠️ KÖTELEZŐ HUROKELLENÁLLÁS (Zs) MÉRÉS HIÁNYZIK!\n' +
                'Az MSZ HD 60364-6 szerint kötelező mérni a hurokellenállást\n' +
                'a védőeszközök (kismegszakítók) kioldási feltételeinek igazolására.\n' +
                'Képlet: Zs ≤ (U₀ × 0.95) / Ia');
        }
    }

    // ═══════════════════════════════════════════════════
    // 2. MŰSZERADATOK KÖTELEZŐ VALIDÁCIÓ
    // ═══════════════════════════════════════════════════
    const instrumentType = document.getElementById('instrumentType')?.value?.trim() || '';
    const instrumentCal = document.getElementById('instrumentCal')?.value?.trim() || '';
    if (!instrumentType) {
        errors.push('🔧 MÉRŐMŰSZER TÍPUSA ÉS GYÁRI SZÁMA HIÁNYZIK!\n' +
            'Bírósági eljárásban a műszer típusa és gyári száma nélkül\n' +
            'az okirat hiteltelen. Pl.: "Metrel MI 3152, SN:21070123"');
    } else if (!instrumentType.match(/\d/)) {
        warnings.push('🔧 A mérőműszer adatainál nem található gyári szám (szám karakter).');
    }

    // ═══════════════════════════════════════════════════
    // 3. KALIBRÁLÁSI GÁT — Lejárt kalibráció → NEM adható "Megfelelő"
    // ═══════════════════════════════════════════════════
    if (instrumentCal) {
        const calDate = new Date(instrumentCal);
        const now = new Date();
        if (calDate < now) {
            errors.push('📅 KALIBRÁLÁS LEJÁRT!\n' +
                `A megadott kalibrálási dátum (${instrumentCal}) a múltban van.\n` +
                'Lejárt kalibrálású műszerrel végzett mérés érvénytelen.\n' +
                'A jegyzőkönyvben NEM adható "Megfelelő" minősítés!');
        }
    } else {
        warnings.push('📅 A műszer kalibrálási érvényessége nincs kitöltve!');
    }

    // ═══════════════════════════════════════════════════
    // 4. KOCKÁZATI OSZTÁLY / OTSZ BESOROLÁS
    // ═══════════════════════════════════════════════════
    const buildingPurpose = document.getElementById('buildingPurpose')?.value?.trim() || '';
    const buildingOtsz = document.getElementById('buildingOtsz')?.value || '';
    if (isVBF && !buildingPurpose) {
        warnings.push('🏢 Az "Épület Rendeltetése" mező üres — ez határozza meg a következő felülvizsgálat dátumát.');
    }
    if (isVBF && !buildingOtsz) {
        warnings.push('🏗️ OTSZ kockázati osztály (AK/KK/MK) nincs kiválasztva — jogilag ez határozza meg a kötelező felülvizsgálati időközöket.');
    }

    // ═══════════════════════════════════════════════════
    // 5. FELÜLVIZSGÁLÓ ADATOK
    // ═══════════════════════════════════════════════════
    const inspectorName = document.getElementById('inspectorName')?.value?.trim() || '';
    const inspectorLicense = document.getElementById('inspectorLicense')?.value?.trim() || '';
    if (!inspectorName) {
        warnings.push('👨‍🔧 A felülvizsgáló neve/cégneve nincs megadva.');
    }
    if (!inspectorLicense) {
        warnings.push('📜 A vizsgabizonyítvány száma nincs megadva.');
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Automatically determines the MEE Handbook qualifying document variant (A/B/C/MEGFELELŐ)
 * based on found defects, failed measurements, and their severity.
 * 
 * MEE Handbook Categories:
 *   MEGFELELŐ:   No defects found at all
 *   C Változat:  Minor defects found, no immediate danger
 *   B Változat:  Serious defects that must be fixed, re-inspection after fix
 *   A Változat:  Immediate life-threatening danger detected
 *   NEM MEGFELELŐ: Critical failure, must be taken out of service immediately
 */
function autoDetectMEEQualification() {
    let hasAnyDefect = false;
    let hasCriticalDefect = false;  // MEE "(A)" - Közvetlen élet- és tűzveszély
    let hasSeriousDefect = false;   // MEE "(B)" - Súlyos hiba (soron kívül javítandó)
    let hasMaintenanceDefect = false; // MEE "(C)" - Karbantartási hiba
    let hasRenovationDefect = false;  // MEE "(D)" - Felújításkor javítandó

    // ═══════════════════════════════════════════════
    // 1. Hibajegyzék elemzése (kulcsszó alapú AI)
    // ═══════════════════════════════════════════════
    const defectCards = document.querySelectorAll('#defectList .defect-card');
    if (defectCards.length > 0) {
        hasAnyDefect = true;

        defectCards.forEach(card => {
            const desc = (card.querySelector('.desc-input')?.value || '').toLowerCase();

            // (A) Közvetlen élet- és tűzveszély
            const criticalA = ['életveszély', 'érintésvéd', 'pe vezető hiány', 'áramütés', 'halál',
                'tűzveszély', 'védővezető hiány', 'felületen feszültség', 'nincsen pe',
                'test feszültség', 'védőföldelés hiány', 'nincs földelés', 'beégett', 'ívhiba',
                'érinthető feszültség', 'leolvadt', 'kiégett'];
            if (criticalA.some(kw => desc.includes(kw))) {
                hasCriticalDefect = true;
                return; // Nem kell tovább vizsgálni ezt a hibát
            }

            // (B) Súlyos hiba (soron kívül javítandó)
            const seriousB = ['szigetelés sérült', 'rcd nem', 'ávk nem', 'fi-relé nem', 'kioldási idő',
                'hurokellenállás', 'keresztmetszet nem', 'túlterhelés', 'zárlat',
                'védővezető folytonosság', 'rpe nem', 'hurokimpedancia', 'nem old ki',
                'olvadóbiztosító hiány', 'érintésvédelmi osztály'];
            if (seriousB.some(kw => desc.includes(kw))) {
                hasSeriousDefect = true;
                return;
            }

            // (C) Karbantartási hiba
            const maintenanceC = ['dobozfedél', 'fedél hiány', 'csatlakozó laza', 'felirat hiány',
                'jelölés hiány', 'kötés laza', 'sorkapocs', 'takarólemez',
                'burkolat sérült', 'por', 'tisztítás', 'kopott'];
            if (maintenanceC.some(kw => desc.includes(kw))) {
                hasMaintenanceDefect = true;
                return;
            }

            // (D) Felújításkor javítandó
            const renovationD = ['vezetékszínezés', 'régi szabvány', 'elavult', 'korszerűtlen',
                'alumínium vezető', 'régi típus', 'nem szabványos szín',
                'téves színezés', 'nullázás'];
            if (renovationD.some(kw => desc.includes(kw))) {
                hasRenovationDefect = true;
                return;
            }

            // Ha nem illeszkedik semmire, akkor karbantartási kategória
            hasMaintenanceDefect = true;
        });
    }

    // ═══════════════════════════════════════════════
    // 2. Mérési táblázatok automatikus kiértékelése
    // ═══════════════════════════════════════════════

    // 2a. Rpe - Védővezető folytonosság: > 1.0 Ω = súlyos hiba (B)
    document.querySelectorAll('#table-rpe tbody tr').forEach(tr => {
        const val = parseFloat(tr.querySelector('.meas-val')?.value);
        if (!isNaN(val) && val > 1.0) {
            hasAnyDefect = true;
            hasSeriousDefect = true; // Rpe > 1Ω → B kategória
        }
    });

    // 2b. Riso - Szigetelési ellenállás: < 1 MΩ = súlyos hiba (B)  
    document.querySelectorAll('#table-insulation tbody tr').forEach(tr => {
        const ln = parseFloat(tr.querySelector('.meas-ln')?.value);
        const lpe = parseFloat(tr.querySelector('.meas-lpe')?.value);
        const npe = parseFloat(tr.querySelector('.meas-npe')?.value);
        if ((!isNaN(ln) && ln < 1) || (!isNaN(lpe) && lpe < 1) || (!isNaN(npe) && npe < 1)) {
            hasAnyDefect = true;
            hasSeriousDefect = true; // Riso < 1MΩ → B kategória
        }
    });

    // 2c. Zs - Hurokellenállás: automatikus kioldási feltétel ellenőrzés
    document.querySelectorAll('#table-loop tbody tr').forEach(tr => {
        const device = (tr.querySelector('.meas-device')?.value || '').toUpperCase();
        const zsVal = parseFloat(tr.querySelector('.meas-zs')?.value);
        if (!device || isNaN(zsVal)) return;

        const curve = device.match(/[A-Z]+/)?.[0];
        const In = parseFloat(device.match(/[0-9.]+/)?.[0]);
        if (!curve || isNaN(In)) return;

        let Ia = 0;
        if (curve === 'B') Ia = In * 5;
        else if (curve === 'C') Ia = In * 10;
        else if (curve === 'D') Ia = In * 20;

        if (Ia > 0) {
            const maxZs = (230 * 0.95) / Ia;
            if (zsVal > maxZs) {
                hasAnyDefect = true;
                hasSeriousDefect = true; // Kioldás nem garantált → B kategória
            }
        }
    });

    // 2d. RCD kioldási idő: > 300ms = hiba (40ms is alkalmazható szigorúbban)
    document.querySelectorAll('#table-rcd tbody tr').forEach(tr => {
        const t1 = parseFloat(tr.querySelector('.meas-t1')?.value);
        if (!isNaN(t1) && t1 > 300) {
            hasAnyDefect = true;
            hasCriticalDefect = true; // RCD nem old ki időben → A (életveszély)
        }
        const pass = tr.querySelector('.meas-pass')?.value;
        if (pass === 'Nem') {
            hasAnyDefect = true;
            hasSeriousDefect = true;
        }
    });

    // 2e. Általános "Nem" mérési eredmények
    const allPassSelects = document.querySelectorAll('.data-table .meas-pass');
    allPassSelects.forEach(sel => {
        if (sel.value === 'Nem') {
            hasAnyDefect = true;
            hasSeriousDefect = true; // Bármely mérési fail → minimum B
        }
    });

    // ═══════════════════════════════════════════════
    // 3. MEE Minősítés meghatározása
    // ═══════════════════════════════════════════════
    if (hasCriticalDefect) return 'NEM MEGFELELŐ';      // (A) Életveszély → üzemen kívül
    if (hasSeriousDefect) return 'VÁLTOZAT_B';           // (B) Súlyos → javítás + újraellenőrzés
    if (hasMaintenanceDefect) return 'VÁLTOZAT_C';       // (C) Karbantartási → javítás ajánlott
    if (hasRenovationDefect) return 'VÁLTOZAT_C';        // (D) Felújítási → is C-be sorolva
    if (hasAnyDefect) return 'VÁLTOZAT_C';               // Egyéb → C
    return 'MEGFELELŐ';                                   // Hibamentes
}

/**
 * Calculates the next mandatory inspection date based on OTSZ risk class.
 * Returns a string like "2029-02-25" or null if not determinable.
 */
function calculateNextInspectionDate(otszClass) {
    const now = new Date();
    let yearsUntilNext = 6; // Default (AK - lakóépület)

    switch (otszClass) {
        case 'AK': yearsUntilNext = 6; break;   // Alacsony kockázat: 6 év
        case 'KK': yearsUntilNext = 3; break;   // Közepes kockázat: 3 év
        case 'MK': yearsUntilNext = 1; break;   // Magas kockázat: 1 év
        default: return null;
    }

    const nextDate = new Date(now);
    nextDate.setFullYear(nextDate.getFullYear() + yearsUntilNext);
    return nextDate.toISOString().split('T')[0];
}

// Mentés a Felhőbe Funkció
async function saveReportToCloud(silent = false) {
    if (!currentToken) {
        if (!silent) alert('Előbb jelentkezz be!');
        return false;
    }

    // --- PRE-SAVE VALIDÁCIÓ ---
    const validation = validateReportBeforeSave();

    if (!validation.valid) {
        // BLOKKOLÓ HIBÁK - nem engedjük a mentést
        if (!silent) {
            const errorMsg = '🛑 A JEGYZŐKÖNYV NEM MENTHETŐ!\n\nAz alábbi kötelező feltételek nem teljesülnek:\n\n' +
                validation.errors.join('\n\n');
            alert(errorMsg);
        }
        return false;
    }

    if (!silent && validation.warnings.length > 0) {
        // FIGYELMEZTETÉSEK - megkérdezzük a felhasználót
        const warningMsg = '⚠️ FIGYELMEZTETÉSEK:\n\n' +
            validation.warnings.join('\n\n') +
            '\n\n─────────────────────\nSzeretné folytatni a mentést a hiányosságok ellenére?';
        if (!confirm(warningMsg)) return false;
    }

    // --- AUTOMATIKUS MEE MINŐSÍTÉS ---
    const autoQualification = autoDetectMEEQualification();
    const currentResult = document.getElementById('reportResult')?.value || '';

    if (!silent && autoQualification !== currentResult) {
        const qualNames = {
            'MEGFELELŐ': '✅ MEGFELELŐ',
            'VÁLTOZAT_C': 'C Változat: Kisebb hibák',
            'VÁLTOZAT_B': 'B Változat: Súlyos hibák',
            'VÁLTOZAT_A': 'A Változat: Pótlólagos ellenőrzés',
            'NEM MEGFELELŐ': '❌ NEM MEGFELELŐ'
        };
        const autoName = qualNames[autoQualification] || autoQualification;
        const currentName = qualNames[currentResult] || currentResult;

        const switchMsg = `🔄 AUTOMATIKUS MINŐSÍTŐ IRAT JAVASLAT (MEE Handbook)\n\n` +
            `Az Ön által kiválasztott minősítés: ${currentName}\n` +
            `A rendszer a hibák és mérések alapján javasolt minősítés: ${autoName}\n\n` +
            `A MEE Handbook szerint az időszakos felülvizsgálatnál, ha hiba van, a minősítő iratnak ` +
            `tükröznie kell a hiba súlyosságát (A: életveszély, B: súlyos, C: kisebb).\n\n` +
            `Szeretné ÁTVÁLTANI a javasolt minősítésre?`;

        if (confirm(switchMsg)) {
            document.getElementById('reportResult').value = autoQualification;
        }
    }

    if (btnSaveCloud) {
        btnSaveCloud.innerText = 'Mentés...';
        btnSaveCloud.disabled = true;
    }

    try {
        // 1. Kinyerjük az aktuális kliens adatokat az Űrlapról
        const clientDataObj = {
            type: document.getElementById('docType')?.value || '',
            customerName: document.getElementById('customerName')?.value || '',
            siteAddress: document.getElementById('siteAddress')?.value || '',
            siteHrsz: document.getElementById('siteHrsz')?.value || '',
            buildingPurpose: document.getElementById('buildingPurpose')?.value || '',
            inspectorName: document.getElementById('inspectorName')?.value || '',
            inspectorLicense: document.getElementById('inspectorLicense')?.value || '',
            instrumentType: document.getElementById('instrumentType')?.value || '',
            instrumentCal: document.getElementById('instrumentCal')?.value || '',
            reportResult: document.getElementById('reportResult')?.value || '',
            ephGasRequired: document.getElementById('ephGasRequired')?.value || 'Nem',
            ephGasMeter: document.getElementById('ephGasMeter')?.value || '',
            ephPenSep: document.getElementById('ephPenSep')?.value || '',
            ephEarthMethod: document.getElementById('ephEarthMethod')?.value || '',
            ephRaValue: document.getElementById('ephRaValue')?.value || '',
            ephConductor: document.getElementById('ephConductor')?.value || '',
            visualChecks: {
                id_marks: document.getElementById('check_id_marks')?.checked || false,
                protection: document.getElementById('check_protection')?.checked || false,
                fire: document.getElementById('check_fire')?.checked || false,
                conduction: document.getElementById('check_conduction')?.checked || false,
                connection: document.getElementById('check_connection')?.checked || false,
                access: document.getElementById('check_access')?.checked || false
            },
            // Új szabványossági metaadatok (TvMI 7.7:2026.02.01)
            buildingOtsz: document.getElementById('buildingOtsz')?.value || '',
            standardReference: 'TvMI 7.7:2026.02.01',
            meeQualification: document.getElementById('reportResult')?.value || '',
            nextInspectionDate: calculateNextInspectionDate(document.getElementById('buildingOtsz')?.value || ''),
            siteTree: VBF.siteTree ? VBF.siteTree.toJSON() : []
        };

        // 2. Kinyerjük a Fabric Canvas-t
        const canvasJson = canvas.toJSON(['vbfData']);
        // 2b. Egyvonalas rajz raszteres képe (base64 PNG) — jegyzőkönyvbe illesztéshez
        const diagramImage = (canvas.getObjects().length > 0)
            ? canvas.toDataURL({ format: 'png', multiplier: 2 })
            : null;

        // 3. Kinyerjük a Hibajegyzéket
        const defectsArr = [];
        document.querySelectorAll('#defectList .defect-card').forEach(card => {
            defectsArr.push({
                templateId: card.querySelector('.tpl-select')?.value || '',
                description: card.querySelector('.desc-input')?.value || '',
                deadline: card.querySelector('.deadline-input')?.value || '',
                standard: card.querySelector('.standard-input')?.value || '',
                location: card.querySelector('.loc-input')?.value || '',
                photo: card.getAttribute('data-photo') || ''
            });
        });

        // 4. Payload összeállítása
        const payload = {
            title: `${clientDataObj.type} - ${clientDataObj.siteAddress || 'Új Jegyzőkönyv'}`,
            report_type: clientDataObj.type.toLowerCase(),
            client_data: clientDataObj,
            diagram_data: canvasJson,
            diagram_image: diagramImage,
            defects_data: defectsArr,
            measurements_data: [VBF.measurements.collectAll()]
        };

        const isUpdate = !!currentSavedReportId;
        const reqMethod = isUpdate ? 'PUT' : 'POST';
        const reqUrl = isUpdate ? `${API_BASE_URL}/reports/${currentSavedReportId}` : `${API_BASE_URL}/reports`;

        if (!navigator.onLine) {
            // HÁLÓZAT NÉLKÜLI MENTÉS (OFFLINE QUEUE)
            if (btnSaveCloud) btnSaveCloud.innerText = 'Mentés Offline...';
            let offlineQueue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');
            payload._offline_id = Date.now(); // Belső azonosító
            payload._method = reqMethod;
            // Ne a teljes API URL-t tartogassuk, csak az elérési utat, hátha változik a domain
            payload._endpoint = isUpdate ? `/reports/${currentSavedReportId}` : `/reports`;

            offlineQueue.push(payload);
            localStorage.setItem('vbf_offline_queue', JSON.stringify(offlineQueue));

            if (!silent) showToast('A kapcsolat megszakadt, a jegyzőkönyv az offline várólistára került.');
            return true;
        }

        const res = await fetch(reqUrl, {
            method: reqMethod,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            currentSavedReportId = data.id;
            if (!silent) showToast('✅ Jegyzőkönyv sikeresen mentve a felhőbe!');

            // UI elements update
            if (btnExportWord) btnExportWord.style.display = 'inline-block';
            if (btnExportPdfReport) btnExportPdfReport.style.display = 'inline-block';
            if (btnEmailReport) btnEmailReport.style.display = 'inline-block';

            // Generate QR Code in Inspector or a specific area
            showReportQr(data.id);
            fetchReports(); // Refresh cloud list
            return true;
        } else {
            throw new Error(data.detail || 'Hiba a mentés során');
        }
    } catch (err) {
        if (!silent) alert('Hiba történt: ' + err.message);
        return false;
    } finally {
        if (btnSaveCloud) {
            btnSaveCloud.innerText = 'Mentés ☁️';
            btnSaveCloud.disabled = false;
        }
    }
}

btnSaveCloud.addEventListener('click', () => saveReportToCloud(false));

// Word Generálás Funkció
btnExportWord.addEventListener('click', async () => {
    // Automatikus mentés generálás előtt
    const saved = await saveReportToCloud(true);
    if (!saved) return alert('Hiba az automatikus mentés során. Kérjük, mentse kézzel az exportálás előtt!');

    if (!currentSavedReportId || !currentToken) return alert('Előbb mentsd el a jegyzőkönyvet a felhőbe!');

    btnExportWord.innerText = 'Generálás...';
    btnExportWord.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/reports/${currentSavedReportId}/export/docx`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (!res.ok) throw new Error('Hiba a Word generálás során! (Backend hiba)');

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Try to extract filename from header
        const disp = res.headers.get('Content-Disposition');
        let filename = 'VBF_Jegyzokonyv.docx';
        if (disp && disp.indexOf('filename=') !== -1) {
            filename = disp.split('filename=')[1].replace(/"/g, '');
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);

    } catch (err) {
        alert(err.message);
    } finally {
        btnExportWord.innerText = 'Word Generálás 📄';
        btnExportWord.disabled = false;
    }
});

// PDF Generálás és Aláírás Funkció
if (btnExportPdfReport) {
    btnExportPdfReport.addEventListener('click', async () => {
        // Automatikus mentés generálás előtt
        const saved = await saveReportToCloud(true);
        if (!saved) return alert('Hiba az automatikus mentés során. Kérjük, mentse kézzel az exportálás előtt!');

        if (!currentSavedReportId || !currentToken) return alert('Előbb mentsd el a jegyzőkönyvet a felhőbe!');

        btnExportPdfReport.innerText = 'PDF Aláírása... ⏳';
        btnExportPdfReport.disabled = true;

        try {
            const res = await fetch(`${API_BASE_URL}/reports/${currentSavedReportId}/export/pdf`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.detail || 'Hiba a PDF generálás során!');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Try to extract filename from header
            const disp = res.headers.get('Content-Disposition');
            let filename = 'VBF_Jegyzokonyv.pdf';
            if (disp && disp.indexOf('filename=') !== -1) {
                filename = disp.split('filename=')[1].replace(/"/g, '');
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

        } catch (err) {
            alert(err.message);
        } finally {
            btnExportPdfReport.innerText = 'PDF Aláírva 📜';
            btnExportPdfReport.disabled = false;
        }
    });
}

window.applyPhotoToLastRow = function (tableId, photo) {
    if (!photo) return;
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody || !tbody.lastElementChild) return;
    const tr = tbody.lastElementChild;
    tr.setAttribute('data-photo', photo);
    const input = tr.querySelector('input[type="file"]');
    if (input) {
        input.parentElement.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
        input.parentElement.style.borderColor = 'var(--accent)';
        input.parentElement.title = "Kép betöltve!";
    }
}

// CLONE & LOADING UI LOGIC
window.loadReportIntoUI = function (rep) {
    // Clear existing QR code if present
    const existingQr = document.getElementById('qr-container');
    if (existingQr) existingQr.remove();

    // Alapadatok
    document.getElementById('documentTitle').value = rep.title || '';
    document.getElementById('docType').value = rep.report_type.toUpperCase() || 'VBF';

    const c = rep.client_data || {};
    document.getElementById('customerName').value = c.customerName || '';
    document.getElementById('siteAddress').value = c.siteAddress || '';
    document.getElementById('siteHrsz').value = c.siteHrsz || '';
    document.getElementById('buildingPurpose').value = c.buildingPurpose || '';
    document.getElementById('inspectorName').value = c.inspectorName || '';
    document.getElementById('inspectorLicense').value = c.inspectorLicense || '';
    document.getElementById('instrumentType').value = c.instrumentType || '';
    document.getElementById('instrumentCal').value = c.instrumentCal || '';
    document.getElementById('reportResult').value = c.reportResult || 'MEGFELELŐ';

    // EPH extra
    document.getElementById('ephGasRequired').value = c.ephGasRequired || 'Nem';
    document.getElementById('ephGasMeter').value = c.ephGasMeter || '';
    document.getElementById('ephPenSep').value = c.ephPenSep || '';
    document.getElementById('ephEarthMethod').value = c.ephEarthMethod || '';
    document.getElementById('ephRaValue').value = c.ephRaValue || '';
    document.getElementById('ephConductor').value = c.ephConductor || '';

    // Szemrevételezés
    const visual = c.visualChecks || {};
    document.getElementById('check_id_marks').checked = visual.id_marks ?? true;
    document.getElementById('check_protection').checked = visual.protection ?? true;
    document.getElementById('check_fire').checked = visual.fire ?? true;
    document.getElementById('check_conduction').checked = visual.conduction ?? true;
    document.getElementById('check_connection').checked = visual.connection ?? true;
    document.getElementById('check_access').checked = visual.access ?? true;

    // Rajz
    if (rep.diagram_data) {
        canvas.loadFromJSON(rep.diagram_data, () => {
            canvas.renderAll();
            canvas.calcOffset();
        });
    }

    // Hibajegyzék
    defectList.innerHTML = '';
    if (rep.defects_data) {
        rep.defects_data.forEach(d => {
            btnAddDefect.click();
            const cards = defectList.querySelectorAll('.defect-card');
            const lastCard = cards[cards.length - 1];
            if (d.templateId) lastCard.querySelector('.tpl-select').value = d.templateId;
            lastCard.querySelector('.desc-input').value = d.description || '';
            lastCard.querySelector('.deadline-input').value = d.deadline || '';
            lastCard.querySelector('.standard-input').value = d.standard || '';
            lastCard.querySelector('.loc-input').value = d.location || '';

            if (d.photo) {
                lastCard.setAttribute('data-photo', d.photo);
                const imgPreview = lastCard.querySelector('.img-preview');
                const uploadTxt = lastCard.querySelector('.upload-txt');
                if (imgPreview && uploadTxt) {
                    imgPreview.src = d.photo;
                    imgPreview.style.display = 'block';
                    uploadTxt.style.display = 'none';
                }
            }
        });
    }

    // Helyszínfa betöltése
    if (VBF.siteTree && c.siteTree) {
        VBF.siteTree.fromJSON(c.siteTree);
    }

    // Mérések
    const m = (rep.measurements_data && rep.measurements_data[0]) || {};
    document.querySelectorAll('.data-table tbody').forEach(tb => tb.innerHTML = '');

    if (m.rpe) m.rpe.forEach(r => { createRow('table-rpe', `<td><input type="number" class="meas-point" value="${r.point || ''}"></td><td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="number" step="0.01" class="meas-val" value="${r.val || ''}" oninput="validateRpe(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`); applyPhotoToLastRow('table-rpe', r.photo); });

    if (m.insulation) m.insulation.forEach(r => { createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${r.circuit || ''}" list="circuitNames"></td><td><input type="number" step="0.1" class="meas-ln" value="${r.ln || ''}" oninput="validateIns(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-lpe" value="${r.lpe || ''}" oninput="validateIns(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-npe" value="${r.npe || ''}" oninput="validateIns(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`); applyPhotoToLastRow('table-insulation', r.photo); });

    if (m.loop) m.loop.forEach(r => { createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${r.circuit || ''}" list="circuitNames"></td><td><input type="text" class="meas-device" value="${r.device || ''}" oninput="validateZs(this.closest('tr'))"></td><td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="number" step="0.01" class="meas-zs" value="${r.zs || ''}" oninput="validateZs(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`); applyPhotoToLastRow('table-loop', r.photo); });

    if (m.rcd) m.rcd.forEach(r => { createRow('table-rcd', `<td><input type="text" class="meas-circ" value="${r.circ || ''}" list="circuitNames"></td><td><select class="meas-type"><option ${r.type === 'AC' ? 'selected' : ''}>AC</option><option ${r.type === 'A' ? 'selected' : ''}>A</option><option ${r.type === 'B' ? 'selected' : ''}>B</option><option ${r.type === 'F' ? 'selected' : ''}>F</option></select></td><td><input type="number" class="meas-idn" value="${r.idn || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><select class="meas-05"><option ${r.test05 === 'OK (Nem oldott)' ? 'selected' : ''}>OK (Nem oldott)</option><option ${r.test05 === 'HIBA (Kioldott)' ? 'selected' : ''}>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="${r.t1 || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="1" class="meas-t5" value="${r.t5 || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-ramp" value="${r.ramp || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-uc" value="${r.uc || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`); applyPhotoToLastRow('table-rcd', r.photo); });

    if (m.tools) m.tools.forEach(r => { createRow('table-tools', `<td><input type="text" class="meas-name" value="${r.name || ''}"></td><td><input type="text" class="meas-id" value="${r.id || ''}"></td><td><input type="number" step="0.1" class="meas-val" value="${r.val || ''}" oninput="validateTool(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`); applyPhotoToLastRow('table-tools', r.photo); });

    if (m.selv) m.selv.forEach(r => { createRow('table-selv', `<td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="number" step="0.1" class="meas-v" value="${r.v || ''}"></td><td><input type="number" step="1" class="meas-ps" value="${r.ps || ''}"></td><td><input type="number" step="1" class="meas-pt" value="${r.pt || ''}"></td><td><input type="number" step="1" class="meas-st" value="${r.st || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`); applyPhotoToLastRow('table-selv', r.photo); });

    if (m.eph_cont) m.eph_cont.forEach(r => { createRow('table-eph', `<td><input type="number" class="meas-index" value="${r.idx || ''}"></td><td><input type="text" class="meas-elem" value="${r.elem || ''}"></td><td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="text" class="meas-mat" value="${r.mat || ''}"></td><td><select class="meas-conn"><option ${r.conn === 'EPH bilincs' ? 'selected' : ''}>EPH bilincs</option><option ${r.conn === 'Szemes saru' ? 'selected' : ''}>Szemes saru</option><option ${r.conn === 'Hegesztett' ? 'selected' : ''}>Hegesztett</option><option ${r.conn === 'Wago/Sorkapocs' ? 'selected' : ''}>Wago/Sorkapocs</option></select></td><td><input type="number" step="0.01" class="meas-val" value="${r.val || ''}" oninput="validateEph(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`); applyPhotoToLastRow('table-eph', r.photo); });
};

window.cloneReport = async function (id) {
    if (!confirm('Biztosan szeretnéd másolni ezt a jegyzőkönyvet? Új mentésként kerül rögzítésre.')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const rep = await res.json();

        // Reset state for NEW save
        currentSavedReportId = null;
        btnExportWord.style.display = 'none';
        if (btnExportPdfReport) btnExportPdfReport.style.display = 'none';

        loadReportIntoUI(rep);
        document.getElementById('documentTitle').value = "MÁSOLAT: " + rep.title;

        // Go to first tab
        document.querySelector('.nav-tab[data-target="tab-diagram"]').click();
        alert('Jegyzőkönyv adatai betöltve másolásra!');
    } catch (err) {
        alert('Hiba a másolás során!');
    }
};

window.loadReport = async function (id) {
    try {
        const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const rep = await res.json();

        currentSavedReportId = rep.id;
        btnExportWord.style.display = 'inline-block';
        if (btnExportPdfReport) btnExportPdfReport.style.display = 'inline-block';
        if (btnEmailReport) btnEmailReport.style.display = 'inline-block';

        loadReportIntoUI(rep);

        // Lock UI if finalized
        if (rep.status === 'FINAL') {
            document.getElementById('btnSaveCloud').style.display = 'none';
            const btnFin = document.getElementById('btnFinalize');
            if (btnFin) btnFin.style.display = 'none';

            // disable inputs
            document.querySelectorAll('input:not(#manualQrId), select, textarea, button:not(.nav-tab):not(#btnExportWord):not(#btnExportPdfReport):not(#btnEmailReport):not(#btnLoginNav):not(#btnToggleTheme):not(#btnCloseLogin)').forEach(el => {
                el.disabled = true;
                el.style.opacity = '0.7';
            });
            // Show lock message
            let lockMsg = document.getElementById('lockMessage');
            if (!lockMsg) {
                lockMsg = document.createElement('div');
                lockMsg.id = 'lockMessage';
                lockMsg.style = 'background: #dc2626; color: white; padding: 10px; text-align: center; font-weight: bold; width: 100%; z-index: 1000;';
                lockMsg.innerText = '🔒 EZ A JEGYZŐKÖNYV VÉGLEGESÍTVE VAN. MÓDOSÍTÁS NEM LEHETSÉGES!';
                document.querySelector('.app-content-wrapper').prepend(lockMsg);
            }
        } else {
            document.getElementById('btnSaveCloud').style.display = 'inline-block';
            const btnFin = document.getElementById('btnFinalize');
            if (btnFin) btnFin.style.display = 'inline-block';

            document.querySelectorAll('input:not(#manualQrId), select, textarea, button').forEach(el => {
                el.disabled = false;
                el.style.opacity = '1';
            });
            const lockMsg = document.getElementById('lockMessage');
            if (lockMsg) lockMsg.remove();
        }

        // Show QR in info area
        showReportQr(rep.id);

        // Go to first tab
        document.querySelector('.nav-tab[data-target="tab-diagram"]').click();
        alert('Jegyzőkönyv betöltve!');
    } catch (err) {
        alert('Hiba a betöltés során!');
    }
};

window.deleteReport = async function (id) {
    if (!confirm('VIGYÁZAT! Biztosan törölni szeretnéd ezt a jegyzőkönyvet? Ez a művelet nem vonható vissza!')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/reports/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            // If we deleted the actively open report, clear current ID
            if (currentSavedReportId === id) {
                currentSavedReportId = null;
                btnExportWord.style.display = 'none';
                if (btnExportPdfReport) btnExportPdfReport.style.display = 'none';
                if (btnEmailReport) btnEmailReport.style.display = 'none';
                document.getElementById('documentTitle').value = '';
            }
            alert('Jegyzőkönyv sikeresen véglegesen törölve! 🗑️');
            fetchReports(); // Refresh cloud list automatically
        } else {
            alert('Nem sikerült törölni a jegyzőkönyvet.');
        }
    } catch (err) {
        alert('Hálózati hiba a törlés során!');
    }
};

window.sendEmailReport = async function (id) {
    if (!currentToken) return alert('Kérlek jelentkezz be az email küldéshez!');

    const toEmail = prompt("Kérlek írd be a cél e-mail címet (Ügyfél), ahova a DOCX jegyzőkönyvet (VBF/EPH) azonnal elküldjük:", "");
    if (!toEmail) return; // User cancelled

    // Basic email validation regex
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
        return alert("Kérlek érvényes email címet adj meg!");
    }

    // We can't easily grab the button element in a global onclick without passing `this`,
    // so we just show an alert or overlay and proceed
    alert("Küldés folyamatban a háttérben... Kérlek várj néhány másodpercet!");

    try {
        const payload = {
            to_email: toEmail,
            subject: "⚡ Érintésvédelmi Jegyzőkönyv (VBF Dokumentáció)"
        };

        const res = await fetch(`${API_BASE_URL}/reports/${id}/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(data.message || "Email sikeresen elküldve az ügyfélnek! ✉️✅");
        } else {
            const errData = await res.json();
            alert(`Hiba az elküldés során: ${errData.detail || 'Ismeretlen hiba'}`);
        }
    } catch (err) {
        alert("Hálózati hiba: " + err.message);
    }
};

function showReportQr(id) {
    const inspector = document.getElementById('inspector-content');
    if (inspector) {
        // Clear existing QR if any
        const existing = document.getElementById('qr-container');
        if (existing) existing.remove();

        const qrDiv = document.createElement('div');
        qrDiv.id = 'qr-container';
        qrDiv.className = 'prop-group';
        qrDiv.style.textAlign = 'center';
        qrDiv.style.marginTop = '20px';
        qrDiv.style.background = 'rgba(255,255,255,0.05)';
        qrDiv.style.padding = '15px';
        qrDiv.style.borderRadius = '12px';
        qrDiv.innerHTML = `
                <label style="color:var(--accent); font-weight:bold;">Azonosítás (ID: R-${id})</label>
                <div id="qrcode" style="display:inline-block; padding:10px; background:#fff; border-radius:8px; margin: 10px 0;"></div>
                <p style="font-size:0.75rem; color:var(--text-muted);">Mentsd el ezt a képet és nyomtasd ki a helyszínen az elosztóra.</p>
            `;
        inspector.appendChild(qrDiv);

        new QRCode(document.getElementById("qrcode"), {
            text: `VBF-REPORT-${id}`,
            width: 120,
            height: 120,
            colorDark: "#000000",
            colorLight: "#ffffff"
        });
    }
}

// ==========================================
// MASTER DATA LOGIC (TÖRZSDATATOK)
// ==========================================

let customersData = [];
let inspectorsData = [];

async function fetchMasterData() {
    if (!currentToken) return;

    try {
        // Fetch Customers
        const resC = await fetch(`${API_BASE_URL}/customers`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (resC.ok) {
            customersData = await resC.json();
            renderCustomers();
            updateCustomerDropdowns();
        }

        // Fetch Inspectors
        const resI = await fetch(`${API_BASE_URL}/inspectors`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (resI.ok) {
            inspectorsData = await resI.json();
            renderInspectors();
            updateInspectorDropdowns();
        }
    } catch (err) {
        console.error("Hiba a törzsadatok betöltésénél:", err);
    }
}

function renderCustomers() {
    const container = document.getElementById('customerListContainer');
    if (!container) return;
    container.innerHTML = '';
    if (customersData.length === 0) {
        container.innerHTML = '<span class="empty-state">Nincs mentett ügyfél.</span>';
        return;
    }
    customersData.forEach(c => {
        const div = document.createElement('div');
        div.className = 'prop-group';
        div.style.background = 'rgba(255,255,255,0.05)';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.innerHTML = `
                <div>
                    <strong>${c.name}</strong><br>
                    <small style="color:#aaa;">${c.address || ''} | ${c.hrsz || ''}</small>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteCustomer(${c.id})">Del</button>
            `;
        container.appendChild(div);
    });
}

function renderInspectors() {
    const container = document.getElementById('inspectorListContainer');
    if (!container) return;
    container.innerHTML = '';
    if (inspectorsData.length === 0) {
        container.innerHTML = '<span class="empty-state">Nincs mentett felülvizsgáló.</span>';
        return;
    }
    inspectorsData.forEach(i => {
        const div = document.createElement('div');
        div.className = 'prop-group';
        div.style.background = 'rgba(255,255,255,0.05)';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.innerHTML = `
                <div>
                    <strong>${i.name}</strong><br>
                    <small style="color:#aaa;">${i.license || ''} | ${i.instrument_type || ''}</small>
                </div>
                <button class="btn btn-danger btn-small" onclick="deleteInspector(${i.id})">Del</button>
            `;
        container.appendChild(div);
    });
}

function updateCustomerDropdowns() {
    const select = document.getElementById('loadCustomerSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- Válassz Ügyfelet --</option>';
    customersData.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.text = c.name;
        select.appendChild(opt);
    });
}

function updateInspectorDropdowns() {
    const select = document.getElementById('loadInspectorSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- Válassz Felülvizsgálót --</option>';
    inspectorsData.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i.id;
        opt.text = i.name;
        select.appendChild(opt);
    });
}

// Save Customer
document.getElementById('btnSaveCustomer')?.addEventListener('click', async () => {
    const name = document.getElementById('mdCustName').value.trim();
    if (!name) return alert("Név kitöltése kötelező!");

    const payload = {
        name: name,
        address: document.getElementById('mdCustAddr').value,
        hrsz: document.getElementById('mdCustHrsz').value,
        building_purpose: document.getElementById('mdCustPurpose').value
    };

    try {
        const res = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Ügyfél mentve!");
            // Clear form
            document.getElementById('mdCustName').value = '';
            document.getElementById('mdCustAddr').value = '';
            document.getElementById('mdCustHrsz').value = '';
            document.getElementById('mdCustPurpose').value = '';
            fetchMasterData();
        } else {
            alert("Sikertelen mentés!");
        }
    } catch (err) { alert("Hiba a mentés során: " + err); }
});

// Save Inspector
document.getElementById('btnSaveInspector')?.addEventListener('click', async () => {
    const name = document.getElementById('mdInspName').value.trim();
    if (!name) return alert("Név kitöltése kötelező!");

    const payload = {
        name: name,
        license: document.getElementById('mdInspLic').value,
        instrument_type: document.getElementById('mdInspInst').value,
        instrument_cal: document.getElementById('mdInspCal').value
    };

    try {
        const res = await fetch(`${API_BASE_URL}/inspectors`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Felülvizsgáló mentve!");
            document.getElementById('mdInspName').value = '';
            document.getElementById('mdInspLic').value = '';
            document.getElementById('mdInspInst').value = '';
            document.getElementById('mdInspCal').value = '';
            fetchMasterData();
        } else {
            alert("Sikertelen mentés!");
        }
    } catch (err) { alert("Hiba a mentés során!"); }
});

// Delete Globals
window.deleteCustomer = async function (id) {
    if (!confirm("Törlöd ezt az ügyfelet?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) fetchMasterData();
    } catch (e) { console.error(e); }
};

window.deleteInspector = async function (id) {
    if (!confirm("Törlöd ezt a felülvizsgálót?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/inspectors/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) fetchMasterData();
    } catch (e) { console.error(e); }
};

// Auto-fill events
document.getElementById('loadCustomerSelect')?.addEventListener('change', (e) => {
    const id = parseInt(e.target.value);
    if (!id) return;
    const c = customersData.find(x => x.id === id);
    if (c) {
        document.getElementById('customerName').value = c.name || '';
        document.getElementById('siteAddress').value = c.address || '';
        document.getElementById('siteHrsz').value = c.hrsz || '';
        document.getElementById('buildingPurpose').value = c.building_purpose || '';
    }
});

document.getElementById('loadInspectorSelect')?.addEventListener('change', (e) => {
    const id = parseInt(e.target.value);
    if (!id) return;
    const i = inspectorsData.find(x => x.id === id);
    if (i) {
        document.getElementById('inspectorName').value = i.name || '';
        document.getElementById('inspectorLicense').value = i.license || '';
        document.getElementById('instrumentType').value = i.instrument_type || '';
        document.getElementById('instrumentCal').value = i.instrument_cal || '';
    }
});

// Make sure to load master data if authed
if (currentToken) {
    fetchMasterData();
}

// Template loading for Report Details Tab
document.getElementById('loadTemplateSelect')?.addEventListener('change', (e) => {
    const tpl = e.target.value;
    if (!tpl) return;

    if (!confirm("Biztosan betöltöd a sablon mérési sorait? Ez felülírja a jelenlegi táblázatokat az adott füleken!")) {
        e.target.value = "";
        return;
    }

    // Töröljük a meglévő sorokat a mérés táblázatokból
    document.querySelectorAll('.data-table tbody').forEach(tb => tb.innerHTML = '');

    if (tpl === 'TPL_PANEL_3ROOM') {
        document.getElementById('buildingPurpose').value = 'Lakóépület - Panel';
        document.getElementById('docType').value = 'VBF_IDOSZAKOS';

        // Folytonosság
        createRow('table-rpe', `<td><input type="number" class="meas-point" value="1"></td><td><input type="text" class="meas-loc" value="Elosztó -> Bejárati Dug."></td><td><input type="number" step="0.01" class="meas-val" value="0.12"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        createRow('table-rpe', `<td><input type="number" class="meas-point" value="2"></td><td><input type="text" class="meas-loc" value="Elosztó -> EPH Csomópont"></td><td><input type="number" step="0.01" class="meas-val" value="0.05"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);

        // Szigetelés
        ['Világítás Nappali', 'Világítás Hálók', 'Dugalj Konyha', 'Dugalj Hálók', 'Klíma Betáp'].forEach(c => {
            createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        });

        // Hurokellenállás
        ['Főbetáp', 'Világítás Nappali', 'Dugalj Konyha'].forEach(c => {
            createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="C16"></td><td><input type="text" class="meas-loc" value="Végelosztó/Végpont"></td><td><input type="number" step="0.01" class="meas-zs" value="0.65"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        });

        // ÁVK
        createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Fő ÁVK"></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="22"></td><td><input type="number" step="1" class="meas-t5" value="15"></td><td><input type="number" step="0.1" class="meas-ramp" value="24.5"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
    }
    else if (tpl === 'TPL_OFFICE_SMALL') {
        document.getElementById('buildingPurpose').value = 'Iroda / Üzlet';
        document.getElementById('docType').value = 'VBF_IDOSZAKOS';
        ['L1 Világítás', 'L2 Dugalj (Kávéfőző)', 'L3 Szerver Rack', 'L1 Dug. Asztalok'].forEach(c => {
            createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="C16"></td><td><input type="text" class="meas-loc" value="Végpont"></td><td><input type="number" step="0.01" class="meas-zs" value="0.45"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        });
        createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Irodai ÁVK (3F)"></td><td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="18"></td><td><input type="number" step="1" class="meas-t5" value="12"></td><td><input type="number" step="0.1" class="meas-ramp" value="22.1"></td><td><input type="number" step="0.1" class="meas-uc" value="1.5"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
    }
    else if (tpl === 'TPL_FAMILY_HOUSE') {
        document.getElementById('buildingPurpose').value = 'Családi Ház';
        document.getElementById('docType').value = 'VBF_ELSO';
        ['Konyha Gépészet', 'Nappali Dugalj', 'Hőszivattyú', 'Fürdőszoba (Mosógép)', 'Kerti Kiállás'].forEach(c => {
            createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="B16"></td><td><input type="text" class="meas-loc" value="Végpont"></td><td><input type="number" step="0.01" class="meas-zs" value="0.80"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        });
        createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Főkábel ÁVK"></td><td><select class="meas-type"><option selected>AC</option><option>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="13"></td><td><input type="number" step="1" class="meas-t5" value="8"></td><td><input type="number" step="0.1" class="meas-ramp" value="26.0"></td><td><input type="number" step="0.1" class="meas-uc" value="1.1"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Fürdő ÁVK"></td><td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="10"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="10"></td><td><input type="number" step="1" class="meas-t5" value="5"></td><td><input type="number" step="0.1" class="meas-ramp" value="8.0"></td><td><input type="number" step="0.1" class="meas-uc" value="0.8"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
    }
    else if (tpl === 'TPL_APARTMENT_1ROOM') {
        document.getElementById('buildingPurpose').value = 'Lakóépület - Garzon';
        document.getElementById('docType').value = 'VBF_IDOSZAKOS';
        ['Világítás Rész', 'Dugalj Rész', 'Hűtő', 'Mosógép'].forEach(c => {
            createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="B16"></td><td><input type="text" class="meas-loc" value="Végpont"></td><td><input type="number" step="0.01" class="meas-zs" value="0.72"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        });
        createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Lakás ÁVK"></td><td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="20"></td><td><input type="number" step="1" class="meas-t5" value="10"></td><td><input type="number" step="0.1" class="meas-ramp" value="23.0"></td><td><input type="number" step="0.1" class="meas-uc" value="1.0"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
    }
    else if (tpl === 'TPL_WORKSHOP') {
        document.getElementById('buildingPurpose').value = 'Ipari Csarnok / Raktár';
        document.getElementById('docType').value = 'VBF_IDOSZAKOS';
        ['Fő Elosztó Betáp (3F)', 'Csarnok Világítás (3F)', 'Hegesztő Dugalj 1', 'Eszterga Betáp', 'Irodai Részleg (L1)'].forEach(c => {
            createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="C32"></td><td><input type="text" class="meas-loc" value="Csatlakozó"></td><td><input type="number" step="0.01" class="meas-zs" value="0.25"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        });
        createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Dugaljak ÁVK (3F)"></td><td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="19"></td><td><input type="number" step="1" class="meas-t5" value="12"></td><td><input type="number" step="0.1" class="meas-ramp" value="25.5"></td><td><input type="number" step="0.1" class="meas-uc" value="1.2"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Tűzvédelmi Főkapcsoló (TFK)"></td><td><select class="meas-type"><option selected>AC</option><option>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="300"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="30"></td><td><input type="number" step="1" class="meas-t5" value="18"></td><td><input type="number" step="0.1" class="meas-ramp" value="270"></td><td><input type="number" step="0.1" class="meas-uc" value="2.3"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
    }
    else if (tpl === 'TPL_RESTAURANT') {
        document.getElementById('buildingPurpose').value = 'Étterem / Konyha';
        document.getElementById('docType').value = 'VBF_IDOSZAKOS';
        ['Ipari Sütő (3F)', 'Hűtőkamra', 'Mosogatógép', 'Elszívó Rendszer', 'Vendégtér Világítás'].forEach(c => {
            createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="C20"></td><td><input type="text" class="meas-loc" value="Bekötés"></td><td><input type="number" step="0.01" class="meas-zs" value="0.55"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        });
        createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Konyha ÁVK"></td><td><select class="meas-type"><option>AC</option><option>A</option><option selected>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="17"></td><td><input type="number" step="1" class="meas-t5" value="11"></td><td><input type="number" step="0.1" class="meas-ramp" value="23.5"></td><td><input type="number" step="0.1" class="meas-uc" value="1.6"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
    }
    else if (tpl === 'TPL_EPH_BOILER') {
        document.getElementById('buildingPurpose').value = 'Gázkazán telepítés';
        document.getElementById('docType').value = 'EPH';
        createRow('table-rpe', `<td><input type="number" class="meas-point" value="1"></td><td><input type="text" class="meas-loc" value="EPH -> Gázcső Bekötés"></td><td><input type="number" step="0.01" class="meas-val" value="0.03"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        createRow('table-rpe', `<td><input type="number" class="meas-point" value="2"></td><td><input type="text" class="meas-loc" value="EPH -> Fűtés Előremenő"></td><td><input type="number" step="0.01" class="meas-val" value="0.03"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        createRow('table-rpe', `<td><input type="number" class="meas-point" value="3"></td><td><input type="text" class="meas-loc" value="EPH -> Fűtés Visszatérő"></td><td><input type="number" step="0.01" class="meas-val" value="0.03"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        createRow('table-rpe', `<td><input type="number" class="meas-point" value="4"></td><td><input type="text" class="meas-loc" value="EPH -> HMV (Melegvíz)"></td><td><input type="number" step="0.01" class="meas-val" value="0.04"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        createRow('table-rpe', `<td><input type="number" class="meas-point" value="5"></td><td><input type="text" class="meas-loc" value="EPH -> Kazán Test"></td><td><input type="number" step="0.01" class="meas-val" value="0.02"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
    }
    else if (tpl.startsWith('CUSTOM_')) {
        let customTpls = JSON.parse(localStorage.getItem('vbf_custom_templates') || '[]');
        const savedTpl = customTpls.find(t => t.id === tpl);
        if (savedTpl) {
            if (savedTpl.buildingPurpose) document.getElementById('buildingPurpose').value = savedTpl.buildingPurpose;
            if (savedTpl.docType) document.getElementById('docType').value = savedTpl.docType;

            const m = savedTpl.measurements;
            if (m.rpe) m.rpe.forEach(r => createRow('table-rpe', `<td><input type="number" class="meas-point" value="${r.point || ''}"></td><td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="number" step="0.01" class="meas-val" value="${r.val || ''}" oninput="validateRpe(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
            if (m.insulation) m.insulation.forEach(r => createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${r.circuit || ''}"></td><td><input type="number" step="0.1" class="meas-ln" value="${r.ln || ''}" oninput="validateIns(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-lpe" value="${r.lpe || ''}" oninput="validateIns(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-npe" value="${r.npe || ''}" oninput="validateIns(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
            if (m.loop) m.loop.forEach(r => createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${r.circuit || ''}"></td><td><input type="text" class="meas-device" value="${r.device || ''}" oninput="validateZs(this.closest('tr'))"></td><td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="number" step="0.01" class="meas-zs" value="${r.zs || ''}" oninput="validateZs(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
            if (m.rcd) m.rcd.forEach(r => createRow('table-rcd', `<td><input type="text" class="meas-circ" value="${r.circ || ''}"></td><td><select class="meas-type"><option ${r.type === 'AC' ? 'selected' : ''}>AC</option><option ${r.type === 'A' ? 'selected' : ''}>A</option><option ${r.type === 'B' ? 'selected' : ''}>B</option><option ${r.type === 'F' ? 'selected' : ''}>F</option></select></td><td><input type="number" class="meas-idn" value="${r.idn || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><select class="meas-05"><option ${r.test05 === 'OK (Nem oldott)' ? 'selected' : ''}>OK (Nem oldott)</option><option ${r.test05 === 'HIBA (Kioldott)' ? 'selected' : ''}>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="${r.t1 || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="1" class="meas-t5" value="${r.t5 || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-ramp" value="${r.ramp || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-uc" value="${r.uc || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
            if (m.tools) m.tools.forEach(r => createRow('table-tools', `<td><input type="text" class="meas-name" value="${r.name || ''}"></td><td><input type="text" class="meas-id" value="${r.id || ''}"></td><td><input type="number" step="0.1" class="meas-val" value="${r.val || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
            if (m.selv) m.selv.forEach(r => createRow('table-selv', `<td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="number" step="0.1" class="meas-v" value="${r.v || ''}"></td><td><input type="number" step="1" class="meas-ps" value="${r.ps || ''}"></td><td><input type="number" step="1" class="meas-pt" value="${r.pt || ''}"></td><td><input type="number" step="1" class="meas-st" value="${r.st || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
            if (m.eph_cont) m.eph_cont.forEach(r => createRow('table-eph', `<td><input type="number" class="meas-index" value="${r.idx || ''}"></td><td><input type="text" class="meas-elem" value="${r.elem || ''}"></td><td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="text" class="meas-mat" value="${r.mat || ''}"></td><td><select class="meas-conn"><option ${r.conn === 'EPH bilincs' ? 'selected' : ''}>EPH bilincs</option><option ${r.conn === 'Szemes saru' ? 'selected' : ''}>Szemes saru</option><option ${r.conn === 'Hegesztett' ? 'selected' : ''}>Hegesztett</option><option ${r.conn === 'Wago/Sorkapocs' ? 'selected' : ''}>Wago/Sorkapocs</option></select></td><td><input type="number" step="0.01" class="meas-val" value="${r.val || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
        }
    }

    alert("Sablon Mérések Sikeresen Betöltve! ✅");
    // Resetelni a dropdown-t hogy látszódjon a placeholder
    e.target.value = "";
});

// --- Custom Template Saving ---
const btnSaveCustomTemplate = document.getElementById('btnSaveCustomTemplate');
if (btnSaveCustomTemplate) {
    btnSaveCustomTemplate.addEventListener('click', () => {
        const tplName = prompt("Add meg a saját sablon nevét (pl. 'Kissék Családi Ház'):");
        if (!tplName) return;

        const measData = VBF.measurements.collectAll();

        const docType = document.getElementById('docType')?.value || '';
        const buildingPurpose = document.getElementById('buildingPurpose')?.value || '';

        let customTpls = JSON.parse(localStorage.getItem('vbf_custom_templates') || '[]');
        const newId = 'CUSTOM_' + Date.now();
        customTpls.push({
            id: newId,
            name: tplName,
            docType: docType,
            buildingPurpose: buildingPurpose,
            measurements: measData
        });
        localStorage.setItem('vbf_custom_templates', JSON.stringify(customTpls));
        alert("Sablon sikeresen elmentve!");
        loadCustomTemplatesToSelect();
    });
}

function loadCustomTemplatesToSelect() {
    const select = document.getElementById('loadTemplateSelect');
    if (!select) return;

    // Remove existing CUSTOM options
    Array.from(select.options).forEach(opt => {
        if (opt.value.startsWith('CUSTOM_')) opt.remove();
    });

    let customTpls = JSON.parse(localStorage.getItem('vbf_custom_templates') || '[]');
    customTpls.forEach(tpl => {
        const opt = document.createElement('option');
        opt.value = tpl.id;
        opt.text = "⭐ Saját: " + tpl.name;
        select.appendChild(opt);
    });
}
loadCustomTemplatesToSelect();

// --- Theme / Dark Mode Toggle ---
let isDarkMode = true;
document.getElementById('btnToggleTheme')?.addEventListener('click', (e) => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
        document.body.classList.remove('light-mode');
        e.target.innerText = '☀️ Világos Mód';
    } else {
        document.body.classList.add('light-mode');
        e.target.innerText = '🌙 Sötét Mód';
    }
});

// ==========================================
// JS OFFLINE SYSTEM MECHANIKA PWA
// ==========================================

function updateOfflineUI() {
    const queue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');
    if (!navigator.onLine) {
        offlineDot.style.background = '#ef4444'; // Piros
        offlineText.innerText = 'Offline';
        offlineText.style.color = '#ef4444';
    } else {
        offlineDot.style.background = '#10b981'; // Zöld
        offlineText.innerText = 'Online';
        offlineText.style.color = '#10b981';
    }

    if (queue.length > 0) {
        btnSyncOffline.style.display = 'inline-block';
        offlineCountSpan.innerText = queue.length;
    } else {
        btnSyncOffline.style.display = 'none';
    }
}

// Szinkronizáció gomb
btnSyncOffline?.addEventListener('click', async () => {
    if (!navigator.onLine) return alert("Továbbra sincs internet kapcsolatod. Várj egy kicsit!");
    if (!currentToken) return alert("Be kell jelentkezned a szinkronizáláshoz!");

    btnSyncOffline.disabled = true;
    btnSyncOffline.innerText = "Syncing...";

    let queue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');
    let successCount = 0;
    let failedQueue = [];

    for (let i = 0; i < queue.length; i++) {
        let payload = queue[i];
        const oldId = payload._offline_id;
        const method = payload._method || 'POST';
        const endpoint = payload._endpoint || '/reports';

        delete payload._offline_id; // Remove internal tracking tags before API
        delete payload._method;
        delete payload._endpoint;

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                successCount++;
            } else {
                payload._offline_id = oldId;
                payload._method = method;
                payload._endpoint = endpoint;
                failedQueue.push(payload);
            }
        } catch (e) {
            payload._offline_id = oldId; // restore tags
            payload._method = method;
            payload._endpoint = endpoint;
            failedQueue.push(payload);
        }
    }

    localStorage.setItem('vbf_offline_queue', JSON.stringify(failedQueue));
    updateOfflineUI();

    btnSyncOffline.disabled = false;
    btnSyncOffline.innerHTML = `🔄 Szinkronizálás (<span id="offlineCount">${failedQueue.length}</span>)`;

    if (successCount > 0) {
        alert(`Sikeresen felszinkronizálva ${successCount} db Offline jegyzőkönyv a felhőbe!`);
        fetchReports(); // Frissítjük a szerveres listát
    } else if (failedQueue.length > 0) {
        alert("Sajnos néhány vagy az összes szinkronizáció elbukott a szerverhibából fakadóan.");
    }
});

// Listeners for network changes
window.addEventListener('online', updateOfflineUI);
window.addEventListener('offline', updateOfflineUI);

// Initial check
updateOfflineUI();

// ==========================================
// CRM JOBS / NAPTÁR ÉS FELADATOK
// ==========================================

window.fetchJobs = async function () {
    const container = document.getElementById('jobListContainer');
    if (!container || !currentToken) return;

    try {
        const res = await fetch(`${API_BASE_URL}/jobs`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error("Hiba a feladatok betöltésekor");

        const jobs = await res.json();
        container.innerHTML = '';

        if (jobs.length === 0) {
            container.innerHTML = '<span class="empty-state">Nincs folyamatban lévő kiosztott feladatod.</span>';
            return;
        }

        jobs.forEach(job => {
            const card = document.createElement('div');
            card.className = 'prop-group panel-glass';
            card.style.background = 'rgba(255,255,255,0.05)';
            card.style.padding = '15px';
            card.style.borderRadius = '8px';
            card.style.borderLeft = job.status === 'COMPLETED' ? '4px solid #10b981' :
                job.status === 'IN_PROGRESS' ? '4px solid #f59e0b' : '4px solid #3b82f6';

            const dateStr = job.scheduled_date ? new Date(job.scheduled_date).toLocaleString('hu-HU') : 'Nincs dátum kiosztva';

            card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <h4 style="margin:0; font-size:1.2rem; color:var(--accent);">${job.title}</h4>
                        <span style="font-size: 0.9rem; font-weight: bold; color: ${job.status === 'COMPLETED' ? '#10b981' : job.status === 'IN_PROGRESS' ? '#f59e0b' : '#3b82f6'};">${job.status}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.9rem;"><strong>Helyszín:</strong> ${job.address || '-'}</p>
                    <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Időpont:</strong> ${dateStr}</p>
                    <p style="margin: 0 0 15px 0; font-size: 0.9rem;"><strong>Leírás:</strong> ${job.description || '-'}</p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-small" onclick="updateJobStatus(${job.id}, 'IN_PROGRESS')" style="flex:1;">Kiszállás alatt / Folyamatban</button>
                        <button class="btn btn-primary btn-small" onclick="updateJobStatus(${job.id}, 'COMPLETED')" style="flex:1;">Megtörtént / Kész</button>
                        <button class="btn btn-accent btn-small" onclick="startJobWork(${job.id}, \`${job.title || ''}\`, \`${job.address || ''}\`)" style="flex: 2; background: #10b981; color: white;">🚀 Munka Kezdése (Jegyzőkönyv)</button>
                    </div>
                `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:red">Hiba a feladatok betöltése során.</p>';
    }
}

// A TECH is tudja frissíteni a státuszt
window.updateJobStatus = async function (jobId, newStatus) {
    try {
        const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/status?status=${newStatus}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            alert("Feladat státusza frissítve!");
            fetchJobs();
        } else {
            alert("Sikertelen frissítés! Nincs jogosultságod vagy hiba történt.");
        }
    } catch (e) { console.error(e); }
};

window.startJobWork = async function (jobId, jobTitle, jobAddress) {
    if (!confirm("Ezzel elkezdesz egy új jegyzőkönyvet ehhez a munkához. A jelenlegi rajz törlődik. Folytatod?")) return;

    // Törlés és alaphelyzet
    document.getElementById('btnClear').click();

    // Adatok betöltése
    document.getElementById('documentTitle').value = jobTitle || "Új Vizsgálat";
    document.getElementById('siteAddress').value = jobAddress || "";

    // Státusz beállítása "IN_PROGRESS"
    try {
        await fetch(`${API_BASE_URL}/jobs/${jobId}/status?status=IN_PROGRESS`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        fetchJobs(); // Update the list in background
    } catch (e) { console.error("Could not update job status:", e); }

    // Átváltás a Jegyzőkönyv Adatok fülre
    const tabMatches = Array.from(document.querySelectorAll('.nav-tab')).find(t => t.getAttribute('data-target') === 'tab-report');
    if (tabMatches) tabMatches.click();
};

// Az ADMIN új felhasználót tud felvenni
document.getElementById('btnAdminCreateUser')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnAdminCreateUser');
    const uName = document.getElementById('adminNewUsername').value;
    const uPass = document.getElementById('adminNewPassword').value;
    const uEmail = document.getElementById('adminNewEmail').value;
    const uRole = document.getElementById('adminNewRole').value;
    const errDiv = document.getElementById('adminCreateUserError');

    if (!uName || !uPass) {
        if (errDiv) errDiv.innerText = 'Felhasználónév és jelszó is kötelező!';
        return;
    }

    try {
        btn.disabled = true;
        const res = await fetch(`${API_BASE_URL}/admin/users?role=${uRole}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ username: uName, password: uPass, email: uEmail || null })
        });

        if (res.ok) {
            alert("Új felhasználó sikeresen létrehozva!");
            document.getElementById('adminNewUsername').value = '';
            document.getElementById('adminNewPassword').value = '';
            if (errDiv) errDiv.innerText = '';
            fetchAdminUsers();
        } else {
            const data = await res.json();
            if (errDiv) errDiv.innerText = data.detail || 'Hiba történt a létrehozáskor.';
        }
    } catch (e) {
        console.error(e);
        if (errDiv) errDiv.innerText = 'Hálózat vagy szerver hiba!';
    } finally {
        btn.disabled = false;
    }
});

// Az ADMIN tud új feladatot létrehozni
document.getElementById('btnAdminCreateJob')?.addEventListener('click', async () => {
    const title = document.getElementById('adminJobTitle').value;
    const address = document.getElementById('adminJobAddress').value;
    const desc = document.getElementById('adminJobDesc').value;
    const dt = document.getElementById('adminJobDate').value; // from datetime-local
    const assignee = document.getElementById('adminJobAssignSelect').value;

    if (!title || !assignee) return alert("A Cím és a Kijelölt kolléga megadása kötelező!");

    const payload = {
        title: title,
        address: address,
        description: desc,
        scheduled_date: dt ? new Date(dt).toISOString() : null,
        assigned_to_id: parseInt(assignee),
        status: "PENDING"
    };

    try {
        const res = await fetch(`${API_BASE_URL}/admin/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Feladat sikeresen kiosztva!");
            document.getElementById('adminJobTitle').value = '';
            document.getElementById('adminJobAddress').value = '';
            document.getElementById('adminJobDesc').value = '';
            fetchJobs(); // Ujratöltés, hogy az admin lássa a kiosztott munkáit a naptárban
        } else {
            alert("Hiba a feladat kiosztásakor!");
        }
    } catch (e) { console.error(e); }
});

// ==========================================
// VALÓS IDEJŰ KÉSZÜLTSÉGFIGYELŐ (UX)
// "Hülyebiztos" felhasználói segédlet
// ==========================================
function updateCompleteness() {
    const bar = document.getElementById('completenessBar');
    const text = document.getElementById('completenessText');
    const status = document.getElementById('completenessStatus');
    const items = document.getElementById('checkItems');
    if (!bar || !items) return;

    const docType = document.getElementById('docType')?.value || '';
    const isVBF = docType.startsWith('VBF_');

    // Checklist items: { label, required, filled, hint }
    const checks = [];

    // 1. Azonosító adatok
    const clientName = document.getElementById('clientName')?.value?.trim();
    checks.push({ label: 'Megrendelő neve', req: true, ok: !!clientName, hint: 'Jegyzőkönyv Adatok fül → Megrendelő', fieldId: 'clientName' });

    const siteAddress = document.getElementById('siteAddress')?.value?.trim();
    checks.push({ label: 'Vizsgált objektum címe', req: true, ok: !!siteAddress, hint: 'Jegyzőkönyv Adatok fül → Cím', fieldId: 'siteAddress' });

    const reportId = document.getElementById('reportId')?.value?.trim();
    checks.push({ label: 'Vizsgabizonyítvány száma', req: false, ok: !!reportId, hint: 'Pl. VBF-12345/2026', fieldId: 'reportId' });

    // 2. Felülvizsgáló
    const inspName = document.getElementById('inspectorName')?.value?.trim();
    checks.push({ label: 'Felülvizsgáló neve', req: true, ok: !!inspName, hint: 'Jegyzőkönyv Adatok fül → Felülvizsgáló', fieldId: 'inspectorName' });

    const inspLic = document.getElementById('inspectorLicense')?.value?.trim();
    checks.push({ label: 'Vizsgabizonyítvány szám', req: false, ok: !!inspLic, hint: 'Regisztrációs szám', fieldId: 'inspectorLicense' });

    // 3. Műszer
    const instrType = document.getElementById('instrumentType')?.value?.trim();
    checks.push({ label: '🔧 Mérőműszer típus + gyári szám', req: true, ok: !!(instrType && instrType.match(/\d/)), hint: 'Pl.: Metrel MI 3152, SN:21070123', fieldId: 'instrumentType' });

    const instrCal = document.getElementById('instrumentCal')?.value?.trim();
    let calOk = false;
    if (instrCal) {
        calOk = new Date(instrCal) >= new Date();
    }
    checks.push({ label: '📅 Kalibrálás érvényessége', req: true, ok: calOk, hint: instrCal ? (calOk ? 'Érvényes' : '⚠️ LEJÁRT!') : 'Dátum hiányzik', fieldId: 'instrumentCal' });

    // 4. Épület
    const bPurpose = document.getElementById('buildingPurpose')?.value?.trim();
    checks.push({ label: '🏢 Épület rendeltetése', req: isVBF, ok: !!bPurpose, hint: 'Pl. Lakóépület, Iroda, Üzem', fieldId: 'buildingPurpose' });

    const bOtsz = document.getElementById('buildingOtsz')?.value;
    checks.push({ label: '🏗️ OTSZ kockázati osztály', req: isVBF, ok: !!bOtsz, hint: 'AK / KK / MK', fieldId: 'buildingOtsz' });

    // 5. Mérések
    const rpeRows = document.querySelectorAll('#table-rpe tbody tr').length;
    checks.push({ label: '📏 Rpe mérések (védővezető)', req: false, ok: rpeRows > 0, hint: `${rpeRows} db sor` });

    const isoRows = document.querySelectorAll('#table-insulation tbody tr').length;
    checks.push({ label: '⚡ Riso mérések (szigetelés)', req: isVBF, ok: isoRows > 0, hint: isVBF ? (isoRows > 0 ? `${isoRows} db sor` : 'KÖTELEZŐ! Menj a Mérési Adatok fülre!') : `${isoRows} db sor` });

    const loopRows = document.querySelectorAll('#table-loop tbody tr').length;
    checks.push({ label: '🔄 Zs mérések (hurok)', req: isVBF, ok: loopRows > 0, hint: isVBF ? (loopRows > 0 ? `${loopRows} db sor` : 'KÖTELEZŐ! Menj a Mérési Adatok fülre!') : `${loopRows} db sor` });

    const rcdRows = document.querySelectorAll('#table-rcd tbody tr').length;
    checks.push({ label: '🛡️ RCD/ÁVK mérések', req: false, ok: rcdRows > 0, hint: `${rcdRows} db sor` });

    // 6. Minősítés
    const reportResult = document.getElementById('reportResult')?.value;
    checks.push({ label: '📊 Összefoglaló minősítés', req: true, ok: !!reportResult, hint: 'Válaszd ki a minősítést!', fieldId: 'reportResult' });

    // Count
    const requiredItems = checks.filter(c => c.req);
    const filledRequired = requiredItems.filter(c => c.ok).length;
    const allFilled = checks.filter(c => c.ok).length;
    const totalChecks = checks.length;
    const pct = Math.round((allFilled / totalChecks) * 100);
    const canSave = requiredItems.every(c => c.ok);

    // Update bar
    bar.style.width = pct + '%';
    if (pct >= 90) {
        bar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
    } else if (pct >= 50) {
        bar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    } else {
        bar.style.background = 'linear-gradient(90deg, #ef4444, #f59e0b)';
    }

    text.textContent = `${pct}% kész (${filledRequired}/${requiredItems.length} kötelező)`;

    if (canSave) {
        status.textContent = '✅ Menthető!';
        status.style.color = '#10b981';
    } else {
        status.textContent = '❌ Nem menthető';
        status.style.color = '#ef4444';
    }

    // Build checklist HTML with click-to-navigate
    let html = '';
    checks.forEach(c => {
        const icon = c.ok ? '✅' : (c.req ? '❌' : '⬜');
        const color = c.ok ? '#10b981' : (c.req ? '#ef4444' : 'var(--text-secondary)');
        const reqBadge = c.req ? '<span style="color:#ef4444; font-weight:700; font-size:0.7rem; margin-left:4px;">KÖTELEZŐ</span>' : '';
        const fieldId = c.fieldId || '';
        const clickAttr = fieldId ? `onclick="navigateToField('${fieldId}')" style="cursor:pointer;"` : '';
        html += `<div ${clickAttr} style="display:flex; align-items:center; gap:6px; color:${color}; padding: 3px 0; ${fieldId ? 'cursor:pointer;' : ''} border-radius:4px; ${fieldId ? '' : ''}" title="${fieldId ? 'Kattints ide → Odanavigálok!' : ''}">
            <span>${icon}</span>
            <span style="flex:1; color: var(--text-primary);">${c.label}${reqBadge}</span>
            <span style="font-size:0.75rem; color: var(--text-secondary); max-width: 140px; text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.hint}</span>
        </div>`;
    });
    items.innerHTML = html;

    // ═══════════════════════════════════════════════
    // INLINE VALIDÁCIÓ - Piros/zöld keretszín a mezőkön
    // ═══════════════════════════════════════════════
    const highlightField = (id, isOk) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (!el.value || !el.value.trim()) {
            el.style.borderColor = '';  // Üres → alapértelmezett
            return;
        }
        el.style.borderColor = isOk ? '#10b981' : '#ef4444';
        el.style.boxShadow = isOk ? '0 0 0 2px rgba(16,185,129,0.2)' : '0 0 0 2px rgba(239,68,68,0.2)';
    };

    highlightField('instrumentType', !!(instrType && instrType.match(/\d/)));
    highlightField('instrumentCal', calOk);
    highlightField('clientName', !!clientName);
    highlightField('siteAddress', !!siteAddress);
    highlightField('inspectorName', !!inspName);

    // Kalibrálási dátum élő visszajelzés
    const calHelper = document.getElementById('calHelper');
    if (calHelper && instrCal) {
        if (calOk) {
            calHelper.innerHTML = '✅ <span style="color:#10b981; font-weight:600;">Érvényes kalibrálás</span> — Lejárat: ' + instrCal;
        } else {
            calHelper.innerHTML = '⚠️ <span style="color:#ef4444; font-weight:600;">LEJÁRT KALIBRÁLÁS!</span> — A kalibrálás (' + instrCal + ') a múltban van. "Megfelelő" minősítés NEM adható!';
        }
    }
}

// Navigate to a field when clicked in checklist
window.navigateToField = function (fieldId) {
    const el = document.getElementById(fieldId);
    if (!el) return;

    // Find which tab the field is in
    const tabPane = el.closest('.tab-pane');
    if (tabPane) {
        const tabId = tabPane.id;
        // Activate that tab
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        const targetTab = document.querySelector(`.nav-tab[data-target="${tabId}"]`);
        if (targetTab) targetTab.classList.add('active');
        tabPane.classList.add('active');
    }

    // Scroll to the field
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Highlight animation
    el.style.transition = 'all 0.3s ease';
    el.style.boxShadow = '0 0 0 4px rgba(245,158,11,0.6)';
    el.style.borderColor = '#f59e0b';
    el.focus();

    setTimeout(() => {
        el.style.boxShadow = '';
        el.style.borderColor = '';
    }, 2000);
};

// Run completeness check periodically and on input events
setInterval(updateCompleteness, 2000);
document.addEventListener('input', () => setTimeout(updateCompleteness, 300));
document.addEventListener('change', () => setTimeout(updateCompleteness, 300));

// Initial run
setTimeout(updateCompleteness, 1000);
