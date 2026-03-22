function vbfMeasSetInputState(el, state) {
    if (!el) return;
    el.classList.remove('vbf-meas-input--error', 'vbf-meas-input--warn', 'vbf-meas-input--ok');
    if (state === 'error') el.classList.add('vbf-meas-input--error');
    else if (state === 'warn') el.classList.add('vbf-meas-input--warn');
    else if (state === 'ok') el.classList.add('vbf-meas-input--ok');
}

export function initMeasurements() {
    window.VBF = window.VBF || {};

    /** Megfelelőség: rejtett select (collectAll) + ✓ / ✕ gombok */
    window.vbfMeasPassCellHtmlFromPass = function (pass) {
        const p = pass === 'Nem' ? 'Nem' : 'Igen';
        const isIgen = p === 'Igen';
        return `<td class="vbf-meas-pass-cell">
            <select class="meas-pass vbf-meas-pass-native" tabindex="-1" aria-hidden="true">
                <option${isIgen ? ' selected' : ''}>Igen</option>
                <option${!isIgen ? ' selected' : ''}>Nem</option>
            </select>
            <div class="vbf-meas-pass-pair" role="group" aria-label="Megfelelőség">
                <button type="button" class="vbf-meas-pass-btn vbf-meas-pass-btn--yes${isIgen ? ' is-active' : ''}" aria-pressed="${isIgen}">✓</button>
                <button type="button" class="vbf-meas-pass-btn vbf-meas-pass-btn--no${!isIgen ? ' is-active' : ''}" aria-pressed="${!isIgen}">✕</button>
            </div>
        </td>`;
    };

    window.vbfSyncMeasPassUI = function (tr) {
        const cell = tr?.querySelector('.vbf-meas-pass-cell');
        if (!cell) return;
        const sel = cell.querySelector('.meas-pass');
        const y = cell.querySelector('.vbf-meas-pass-btn--yes');
        const n = cell.querySelector('.vbf-meas-pass-btn--no');
        if (!sel || !y || !n) return;
        const yes = sel.value === 'Igen';
        y.classList.toggle('is-active', yes);
        n.classList.toggle('is-active', !yes);
        y.setAttribute('aria-pressed', yes ? 'true' : 'false');
        n.setAttribute('aria-pressed', yes ? 'false' : 'true');
    };

    // ═══════════════════════════════════════════
    // Mérési kép csatolás
    // ═══════════════════════════════════════════

    window.attachMeasurementPhoto = function (input) {
        const tr = input.closest('tr');
        const file = input.files[0];
        if (!file || !tr) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const dataUrl = e.target.result;
            const compress = typeof window.VBF_compressImage === 'function'
                ? window.VBF_compressImage(dataUrl, { maxWidth: 720, maxHeight: 720, quality: 0.6 })
                : Promise.resolve(dataUrl);
            compress.then(function (compressed) {
                tr.setAttribute('data-photo', compressed);
                const photoBtn = tr.querySelector('label.meas-photo-label');
                const fid = photoBtn?.getAttribute('for');
                if (photoBtn && fid) {
                    photoBtn.innerHTML = `Fotó ✓<input type="file" id="${fid}" accept="image/*" class="hidden" onchange="window.attachMeasurementPhoto(this)">`;
                    photoBtn.title = 'Kép csatolva! Kattints a cseréhez.';
                }
            });
        };
        reader.readAsDataURL(file);
    };

    // ═══════════════════════════════════════════
    // Új sor hozzáadása mérési táblázathoz
    // ═══════════════════════════════════════════

    window.createRow = function (tableId, htmlContent, nodeId = null) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!tbody) return null;

        const tr = document.createElement('tr');
        if (nodeId) tr.setAttribute('data-node-id', nodeId);
        const measPhotoId = `meas-ph-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
        tr.innerHTML = htmlContent + `
            <td class="meas-actions vbf-meas-actions-cell">
                <div class="vbf-meas-actions-row">
                    <button type="button" class="btn btn-secondary btn-small vbf-meas-row-btn" title="Hiba felvitele a hibajegyzékbe" onclick="typeof window.addDefectFromMeasurementRow==='function'&&window.addDefectFromMeasurementRow(this.closest('tr'))">Hiba</button>
                    <label for="${measPhotoId}" class="btn btn-secondary btn-small vbf-meas-row-btn meas-photo-label" title="Fotó csatolása">
                        Fotó
                        <input type="file" id="${measPhotoId}" accept="image/*" class="hidden" onchange="window.attachMeasurementPhoto(this)">
                    </label>
                    <button type="button" class="btn btn-danger btn-small vbf-meas-row-btn" onclick="this.closest('tr').remove()" title="Sor törlése">Törlés</button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
        window.vbfSyncMeasPassUI(tr);
        return tr;
    };

    // ═══════════════════════════════════════════
    // RPE — Védővezető folytonosság
    // ═══════════════════════════════════════════

    document.getElementById('btnAddRpe')?.addEventListener('click', () => {
        const gloc = document.getElementById('globalLocation')?.value || '';
        const safeGloc = window.VBF && VBF.sanitize ? VBF.sanitize.attr(gloc) : gloc;
        window.createRow('table-rpe', `
                <td><input type="number" class="meas-point" placeholder="1"></td>
                <td><input type="text" class="meas-loc" placeholder="PE sín - Gázcső" value="${safeGloc}"></td>
                <td><input type="number" step="0.01" class="meas-val" placeholder="0.12" oninput="validateRpe(this.closest('tr'))"></td>
                ${window.vbfMeasPassCellHtmlFromPass('Igen')}
            `);
    });

    window.validateRpe = function (tr) {
        const valInput = tr.querySelector('.meas-val');
        const val = parseFloat(valInput.value);
        const passSelect = tr.querySelector('.meas-pass');

        if (isNaN(val)) return;

        // Jellemzően védővezető folytonosságnál szigorúan max. 1.0 Ohm
        if (val > 1.0) {
            vbfMeasSetInputState(valInput, 'error');
            passSelect.value = 'Nem';
        } else if (val > 0.5) {
            vbfMeasSetInputState(valInput, 'warn');
            passSelect.value = 'Igen';
        } else {
            vbfMeasSetInputState(valInput, 'ok');
            passSelect.value = 'Igen';
        }
        window.vbfSyncMeasPassUI(tr);
    };

    // ═══════════════════════════════════════════
    // RISO — Szigetelési ellenállás
    // ═══════════════════════════════════════════

    document.getElementById('btnAddInsulation')?.addEventListener('click', () => {
        const gloc = document.getElementById('globalLocation')?.value || '';
        const safeGloc = window.VBF && VBF.sanitize ? VBF.sanitize.attr(gloc) : gloc;
        window.createRow('table-insulation', `
                <td><input type="text" class="meas-circuit" placeholder="L1 - Világítás" list="circuitNames" value="${safeGloc ? safeGloc + ' - ' : ''}"></td>
                <td><input type="number" step="0.1" class="meas-ln" placeholder=">999" oninput="validateIns(this.closest('tr'))"></td>
                <td><input type="number" step="0.1" class="meas-lpe" placeholder=">999" oninput="validateIns(this.closest('tr'))"></td>
                <td><input type="number" step="0.1" class="meas-npe" placeholder=">999" oninput="validateIns(this.closest('tr'))"></td>
                ${window.vbfMeasPassCellHtmlFromPass('Igen')}
            `);
    });

    window.validateIns = function (tr) {
        const lnI = tr.querySelector('.meas-ln');
        const lpeI = tr.querySelector('.meas-lpe');
        const npeI = tr.querySelector('.meas-npe');
        const passSelect = tr.querySelector('.meas-pass');

        const limit = 1.0; // Szabvány szerint kisfeszültségre: >= 1.0 MOhm
        let isOk = true;
        let anyFilled = false;

        [lnI, lpeI, npeI].forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val)) {
                anyFilled = true;
                if (val < limit) {
                    vbfMeasSetInputState(input, 'error');
                    isOk = false;
                } else {
                    vbfMeasSetInputState(input, 'ok');
                }
            } else {
                vbfMeasSetInputState(input, null);
            }
        });

        if (anyFilled) {
            passSelect.value = isOk ? 'Igen' : 'Nem';
        }
        window.vbfSyncMeasPassUI(tr);
    };

    // ═══════════════════════════════════════════
    // Zs — Hurokellenállás
    // ═══════════════════════════════════════════

    document.getElementById('btnAddLoop')?.addEventListener('click', () => {
        const gloc = document.getElementById('globalLocation')?.value || '';
        const gdev = document.getElementById('globalDevice')?.value || '';
        const safeGloc = window.VBF && VBF.sanitize ? VBF.sanitize.attr(gloc) : gloc;
        const safeGdev = window.VBF && VBF.sanitize ? VBF.sanitize.attr(gdev) : gdev;
        window.createRow('table-loop', `
                <td><input type="text" class="meas-circuit" placeholder="Dugalj 1. szoba" list="circuitNames"></td>
                <td><input type="text" class="meas-device" placeholder="B16" value="${safeGdev}" oninput="validateZs(this.closest('tr'))"></td>
                <td><input type="text" class="meas-loc" placeholder="E1/4" value="${safeGloc}"></td>
                <td><input type="number" step="0.01" class="meas-zs" placeholder="0.85" oninput="validateZs(this.closest('tr'))"></td>
                ${window.vbfMeasPassCellHtmlFromPass('Igen')}
            `);
    });

    window.validateZs = function (tr) {
        const deviceInput = tr.querySelector('.meas-device').value.toUpperCase(); // pl: B16, C20
        const zsInput = tr.querySelector('.meas-zs');
        const zsVal = parseFloat(zsInput.value);
        const passSelect = tr.querySelector('.meas-pass');

        if (!deviceInput || isNaN(zsVal)) return;

        // Parse: kioldási karakterisztika és névleges áram
        const curve = deviceInput.match(/[A-Z]+/)?.[0];
        const nominalStr = deviceInput.match(/[0-9.]+/)?.[0];
        const In = parseFloat(nominalStr);

        let maxZs = null;

        if (curve && !isNaN(In)) {
            let Ia = 0;
            // Szabványos kioldási szorzók: B -> 5x, C -> 10x, D -> 20x
            if (curve === 'B') Ia = In * 5;
            else if (curve === 'C') Ia = In * 10;
            else if (curve === 'D') Ia = In * 20;

            if (Ia > 0) {
                // Zs ≤ (U₀ × 0.95) / Ia  — MSZ HD 60364-6 képlet biztonsági szorzóval
                maxZs = (230 * 0.95) / Ia;
            }
        }

        // Ha nincs maxZs (pl. betétes biztosító), nem tudunk automatizáltan minősíteni
        if (maxZs !== null) {
            if (zsVal > maxZs) {
                vbfMeasSetInputState(zsInput, 'error');
                passSelect.value = 'Nem';
            } else {
                vbfMeasSetInputState(zsInput, 'ok');
                passSelect.value = 'Igen';
            }
            window.vbfSyncMeasPassUI(tr);
        }
    };

    // ═══════════════════════════════════════════
    // RCD — Áramvédő kapcsoló
    // ═══════════════════════════════════════════

    document.getElementById('btnAddRcd')?.addEventListener('click', () => {
        window.createRow('table-rcd', `
                <td><input type="text" class="meas-circuit" placeholder="Fürdő ÁVK" list="circuitNames"></td>
                <td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td>
                <td><input type="number" class="meas-idn" placeholder="30" oninput="validateRcd(this.closest('tr'))"></td>
                <td><select class="meas-05"><option>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td>
                <td><input type="number" step="1" class="meas-t1" placeholder="24" oninput="validateRcd(this.closest('tr'))"></td>
                <td><input type="number" step="1" class="meas-t5" placeholder="12" oninput="validateRcd(this.closest('tr'))"></td>
                <td><input type="number" step="0.1" class="meas-ramp" placeholder="21" oninput="validateRcd(this.closest('tr'))"></td>
                <td><input type="number" step="0.1" class="meas-uc" placeholder="1.2"></td>
                ${window.vbfMeasPassCellHtmlFromPass('Igen')}
            `);
    });

    window.validateRcd = function (tr) {
        const idn = parseFloat(tr.querySelector('.meas-idn').value);
        const t1Input = tr.querySelector('.meas-t1');
        const t1 = parseFloat(t1Input.value);
        const t5Input = tr.querySelector('.meas-t5');
        const t5 = parseFloat(t5Input.value);
        const rampInput = tr.querySelector('.meas-ramp');
        const ramp = parseFloat(rampInput.value);
        const ucInput = tr.querySelector('.meas-uc');
        const uc = parseFloat(ucInput?.value || 0);

        const test05Select = tr.querySelector('.meas-05');
        const passSelect = tr.querySelector('.meas-pass');

        let isOk = true;

        // 0. Fél Idn teszt
        if (test05Select.value !== 'OK (Nem oldott)') {
            isOk = false;
        }

        // 1. Általános RCD max kioldási idő 300ms a HD 60364-4-41 alapján
        if (!isNaN(t1)) {
            if (t1 > 300) {
                vbfMeasSetInputState(t1Input, 'error');
                isOk = false;
            } else {
                vbfMeasSetInputState(t1Input, 'ok');
            }
        }

        // 5x Idn teszt (jellemzően max 40 ms)
        if (!isNaN(t5)) {
            if (t5 > 40) {
                vbfMeasSetInputState(t5Input, 'warn');
            } else {
                vbfMeasSetInputState(t5Input, 'ok');
            }
        }

        // 2. Kioldóáram RAMP (Szabványosan: 50% < I_kioldás <= 100%)
        if (!isNaN(idn) && !isNaN(ramp)) {
            if (ramp <= idn * 0.5 || ramp > idn) {
                vbfMeasSetInputState(rampInput, 'error');
                isOk = false;
            } else {
                vbfMeasSetInputState(rampInput, 'ok');
            }
        }

        // 3. Érintési feszültség Uc (Max 50V általános esetben)
        if (!isNaN(uc)) {
            if (uc > 50) {
                if (ucInput) vbfMeasSetInputState(ucInput, 'error');
                isOk = false;
            } else {
                if (ucInput) vbfMeasSetInputState(ucInput, 'ok');
            }
        }

        passSelect.value = isOk ? 'Igen' : 'Nem';
        window.vbfSyncMeasPassUI(tr);
    };

    // ═══════════════════════════════════════════
    // Kéziszerszám szigetelés
    // ═══════════════════════════════════════════

    document.getElementById('btnAddTool')?.addEventListener('click', () => {
        window.createRow('table-tools', `
                <td><input type="text" class="meas-name" placeholder="Ütvefúró"></td>
                <td><input type="text" class="meas-id" placeholder="HILTI-01"></td>
                <td><input type="number" step="0.1" class="meas-val" placeholder="50" oninput="validateTool(this.closest('tr'))"></td>
                ${window.vbfMeasPassCellHtmlFromPass('Igen')}
            `);
    });

    window.validateTool = function (tr) {
        const valInput = tr.querySelector('.meas-val');
        const val = parseFloat(valInput.value);
        const passSelect = tr.querySelector('.meas-pass');

        if (isNaN(val)) return;

        // Szabványosan a kéziszerszámok szigetelési ellenállása > 2.0 MΩ
        if (val < 2.0) {
            vbfMeasSetInputState(valInput, 'error');
            passSelect.value = 'Nem';
        } else {
            vbfMeasSetInputState(valInput, 'ok');
            passSelect.value = 'Igen';
        }
        window.vbfSyncMeasPassUI(tr);
    };

    // ═══════════════════════════════════════════
    // SELV/PELV — Törpefeszültség
    // ═══════════════════════════════════════════

    document.getElementById('btnAddSelv')?.addEventListener('click', () => {
        window.createRow('table-selv', `
                <td><input type="text" class="meas-loc" placeholder="Fszt. folyosó / 230-24V"></td>
                <td><input type="number" step="0.1" class="meas-v" placeholder="26.4"></td>
                <td><input type="number" step="1" class="meas-ps" placeholder="999"></td>
                <td><input type="number" step="1" class="meas-pt" placeholder="999"></td>
                <td><input type="number" step="1" class="meas-st" placeholder="999"></td>
                <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
            `);
    });

    // ═══════════════════════════════════════════
    // EPH — Egyenpotenciálra hozás
    // ═══════════════════════════════════════════

    document.getElementById('btnAddEph')?.addEventListener('click', () => {
        window.createRow('table-eph', `
                <td><input type="number" class="meas-index" placeholder="1"></td>
                <td><input type="text" class="meas-elem" placeholder="Fémkád"></td>
                <td><input type="text" class="meas-loc" placeholder="EPH sín"></td>
                <td><input type="text" class="meas-mat" placeholder="Cu 6mm2"></td>
                <td><select class="meas-conn"><option>EPH bilincs</option><option>Szemes saru</option><option>Hegesztett</option><option>Wago/Sorkapocs</option></select></td>
                <td><input type="number" step="0.01" class="meas-val" placeholder="0.15" oninput="validateEph(this.closest('tr'))"></td>
                ${window.vbfMeasPassCellHtmlFromPass('Igen')}
            `);
    });

    window.validateEph = function (tr) {
        const valInput = tr.querySelector('.meas-val');
        const val = parseFloat(valInput.value);
        const passSelect = tr.querySelector('.meas-pass');

        if (isNaN(val)) return;

        // EPH folytonosságnál maximum 1.0 Ohm, de inkább kevesebb!
        if (val > 1.0) {
            vbfMeasSetInputState(valInput, 'error');
            passSelect.value = 'Nem';
        } else if (val > 0.3) {
            vbfMeasSetInputState(valInput, 'warn');
            passSelect.value = 'Igen';
        } else {
            vbfMeasSetInputState(valInput, 'ok');
            passSelect.value = 'Igen';
        }
        window.vbfSyncMeasPassUI(tr);
    };

    // ═══════════════════════════════════════════
    // Mérési adatok kinyerése JSON formátumban
    // ═══════════════════════════════════════════

    VBF.measurements = {
        /**
         * Összegyűjti az összes mérési adat objektumot a táblázatokból
         * @returns {Object} — Mérési adatok strukturáltan
         */
        collectAll() {
            return {
                rpe: Array.from(document.querySelectorAll('#table-rpe tbody tr')).map(tr => ({
                    point: tr.querySelector('.meas-point')?.value || '',
                    loc: tr.querySelector('.meas-loc')?.value || '',
                    val: tr.querySelector('.meas-val')?.value || '',
                    pass: tr.querySelector('.meas-pass')?.value || '',
                    photo: tr.getAttribute('data-photo') || ''
                })),
                insulation: Array.from(document.querySelectorAll('#table-insulation tbody tr')).map(tr => ({
                    circuit: tr.querySelector('.meas-circuit')?.value || '',
                    ln: tr.querySelector('.meas-ln')?.value || '',
                    lpe: tr.querySelector('.meas-lpe')?.value || '',
                    npe: tr.querySelector('.meas-npe')?.value || '',
                    pass: tr.querySelector('.meas-pass')?.value || '',
                    photo: tr.getAttribute('data-photo') || ''
                })),
                loop: Array.from(document.querySelectorAll('#table-loop tbody tr')).map(tr => ({
                    circuit: tr.querySelector('.meas-circuit')?.value || '',
                    device: tr.querySelector('.meas-device')?.value || '',
                    loc: tr.querySelector('.meas-loc')?.value || '',
                    zs: tr.querySelector('.meas-zs')?.value || '',
                    pass: tr.querySelector('.meas-pass')?.value || '',
                    photo: tr.getAttribute('data-photo') || ''
                })),
                rcd: Array.from(document.querySelectorAll('#table-rcd tbody tr')).map(tr => ({
                    circ: tr.querySelector('.meas-circuit')?.value || '',
                    type: tr.querySelector('.meas-type')?.value || 'A',
                    idn: tr.querySelector('.meas-idn')?.value || '',
                    test05: tr.querySelector('.meas-05')?.value || '',
                    t1: tr.querySelector('.meas-t1')?.value || '',
                    t5: tr.querySelector('.meas-t5')?.value || '',
                    ramp: tr.querySelector('.meas-ramp')?.value || '',
                    uc: tr.querySelector('.meas-uc')?.value || '',
                    pass: tr.querySelector('.meas-pass')?.value || '',
                    photo: tr.getAttribute('data-photo') || ''
                })),
                tools: Array.from(document.querySelectorAll('#table-tools tbody tr')).map(tr => ({
                    name: tr.querySelector('.meas-name')?.value || '',
                    id: tr.querySelector('.meas-id')?.value || '',
                    val: tr.querySelector('.meas-val')?.value || '',
                    pass: tr.querySelector('.meas-pass')?.value || '',
                    photo: tr.getAttribute('data-photo') || ''
                })),
                selv: Array.from(document.querySelectorAll('#table-selv tbody tr')).map(tr => ({
                    loc: tr.querySelector('.meas-loc')?.value || '',
                    v: tr.querySelector('.meas-v')?.value || '',
                    ps: tr.querySelector('.meas-ps')?.value || '',
                    pt: tr.querySelector('.meas-pt')?.value || '',
                    st: tr.querySelector('.meas-st')?.value || '',
                    pass: tr.querySelector('.meas-pass')?.value || '',
                    photo: tr.getAttribute('data-photo') || ''
                })),
                eph: Array.from(document.querySelectorAll('#table-eph tbody tr')).map(tr => ({
                    index: tr.querySelector('.meas-index')?.value || '',
                    elem: tr.querySelector('.meas-elem')?.value || '',
                    loc: tr.querySelector('.meas-loc')?.value || '',
                    mat: tr.querySelector('.meas-mat')?.value || '',
                    conn: tr.querySelector('.meas-conn')?.value || '',
                    val: tr.querySelector('.meas-val')?.value || '',
                    pass: tr.querySelector('.meas-pass')?.value || '',
                    photo: tr.getAttribute('data-photo') || ''
                }))
            };
        }
    };

    // Mérések export CSV (Rpe, Riso, Zs, RCD) — egy fájl, szakaszok fejléccel
    function escapeCsvCell(val) {
        const s = String(val == null ? '' : val);
        if (/[";\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
        return s;
    }
    document.getElementById('btnExportMeasurementsCsv')?.addEventListener('click', () => {
        const rows = [];
        const sep = ';';
        rows.push('Rpe - Védővezető folytonosság');
        rows.push(['Pont', 'Helyszín', 'Rpe (Ω)', 'Megfelel'].join(sep));
        document.querySelectorAll('#table-rpe tbody tr').forEach(tr => {
            rows.push([
                tr.querySelector('.meas-point')?.value ?? '',
                tr.querySelector('.meas-loc')?.value ?? '',
                tr.querySelector('.meas-val')?.value ?? '',
                tr.querySelector('.meas-pass')?.value ?? ''
            ].map(escapeCsvCell).join(sep));
        });
        rows.push('');
        rows.push('Riso - Szigetelési ellenállás');
        rows.push(['Áramkör', 'L-N (MΩ)', 'L-PE (MΩ)', 'N-PE (MΩ)', 'Megfelel'].join(sep));
        document.querySelectorAll('#table-insulation tbody tr').forEach(tr => {
            rows.push([
                tr.querySelector('.meas-circuit')?.value ?? '',
                tr.querySelector('.meas-ln')?.value ?? '',
                tr.querySelector('.meas-lpe')?.value ?? '',
                tr.querySelector('.meas-npe')?.value ?? '',
                tr.querySelector('.meas-pass')?.value ?? ''
            ].map(escapeCsvCell).join(sep));
        });
        rows.push('');
        rows.push('Zs - Hurokellenállás');
        rows.push(['Áramkör', 'Védelem', 'Helyszín', 'Zs (Ω)', 'Megfelel'].join(sep));
        document.querySelectorAll('#table-loop tbody tr').forEach(tr => {
            rows.push([
                tr.querySelector('.meas-circuit')?.value ?? '',
                tr.querySelector('.meas-device')?.value ?? '',
                tr.querySelector('.meas-loc')?.value ?? '',
                tr.querySelector('.meas-zs')?.value ?? '',
                tr.querySelector('.meas-pass')?.value ?? ''
            ].map(escapeCsvCell).join(sep));
        });
        rows.push('');
        rows.push('RCD / ÁVK');
        rows.push(['Áramkör', 'Típus', 'Idn (mA)', '0,5x teszt', 't1 (ms)', 't5 (ms)', 'Megfelel'].join(sep));
        document.querySelectorAll('#table-rcd tbody tr').forEach(tr => {
            rows.push([
                tr.querySelector('.meas-circuit')?.value ?? '',
                tr.querySelector('.meas-type')?.value ?? '',
                tr.querySelector('.meas-idn')?.value ?? '',
                tr.querySelector('.meas-05')?.value ?? '',
                tr.querySelector('.meas-t1')?.value ?? '',
                tr.querySelector('.meas-t5')?.value ?? '',
                tr.querySelector('.meas-pass')?.value ?? ''
            ].map(escapeCsvCell).join(sep));
        });
        const csv = '\uFEFF' + rows.join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Meresi_adatok_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        if (typeof window.showToast === 'function') window.showToast('CSV export kész.', 'success');
    });

    document.getElementById('tab-measurements')?.addEventListener('click', (e) => {
        const yes = e.target.closest('.vbf-meas-pass-btn--yes');
        const no = e.target.closest('.vbf-meas-pass-btn--no');
        const cell = (yes || no)?.closest('.vbf-meas-pass-cell');
        if (!cell) return;
        e.preventDefault();
        const sel = cell.querySelector('.meas-pass');
        const tr = cell.closest('tr');
        if (!sel || !tr) return;
        if (yes) sel.value = 'Igen';
        if (no) sel.value = 'Nem';
        window.vbfSyncMeasPassUI(tr);
    });
}
