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

    // ═══════════════════════════════════════════
    // Validációs segédfüggvények (MSZ HD 60364-6)
    // ═══════════════════════════════════════════

    /** Tooltip beállítása egy inputra */
    function setMeasTooltip(input, msg) {
        if (!input) return;
        input.title = msg || '';
    }

    /** Zs max számítása: Zs ≤ (U0 × 0.95) / Ia  [MSZ HD 60364-6, §61.3.6] */
    function calcZsMax(deviceStr) {
        const s = (deviceStr || '').toUpperCase().trim();
        const curve = s.match(/^([A-Z]+)/)?.[1];
        const In = parseFloat(s.match(/([0-9.]+)$/)?.[1]);
        if (!curve || isNaN(In) || In <= 0) return null;
        // Biztosíték kioldási szorzók (MSZ HD 60364-4-41, IEC 60898-1 B/C/D/K/gG)
        const factors = { B: 5, C: 10, D: 20, K: 14, Z: 3.75 };
        // gG olvadó biztosítékok (MSZ IEC 60269-2): ~6× In
        let Ia = null;
        if (factors[curve]) { Ia = In * factors[curve]; }
        else if (s.startsWith('GG') || s.startsWith('GL')) { Ia = In * 6; }
        if (!Ia || Ia <= 0) return null;
        return (230 * 0.95) / Ia;  // Ω
    }

    // ─── RPE — Védővezető folytonosság ───────────────────────────────────────
    window.validateRpe = function (tr) {
        const valInput = tr.querySelector('.meas-val');
        const val = parseFloat(valInput.value);
        const passSelect = tr.querySelector('.meas-pass');
        if (isNaN(val)) return;

        // MSZ HD 60364-6:2017 §61.3.2: R_pe ≤ 1 Ω (± mérési bizonytalanság)
        // Megjegyzés: a zöld határ 0.5 Ω (komplex hálózatoknál ajánlott)
        if (val > 1.0) {
            vbfMeasSetInputState(valInput, 'error');
            passSelect.value = 'Nem';
            setMeasTooltip(valInput, `❌ NEM MEGFELELŐ: ${val} Ω > 1,00 Ω (MSZ HD 60364-6 §61.3.2 max. limit)`);
        } else if (val > 0.5) {
            vbfMeasSetInputState(valInput, 'warn');
            passSelect.value = 'Igen';
            setMeasTooltip(valInput, `⚠️ FIGYELEM: ${val} Ω – megfelel, de 0,5 Ω felett érdemes ellenőrizni a csatlakozásokat`);
        } else {
            vbfMeasSetInputState(valInput, 'ok');
            passSelect.value = 'Igen';
            setMeasTooltip(valInput, `✅ MEGFELELŐ: ${val} Ω ≤ 0,50 Ω (MSZ HD 60364-6 §61.3.2)`);
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
        // MSZ HD 60364-6:2017 §61.3.3: Riso ≥ 1,0 MΩ (kisfeszültségű hálózat, 500V DC teszt)
        // SELV/PELV körök külön kezelés: ≥ 0,5 MΩ (az áramkör neve alapján nem azonosítható itt)
        const LIMIT = 1.0;
        const WARN  = 2.0;  // sárga: megfelel, de közel a határhoz
        let isOk = true; let anyFilled = false;
        [lnI, lpeI, npeI].forEach(inp => {
            if (!inp) return;
            const v = parseFloat(inp.value);
            if (!isNaN(v)) {
                anyFilled = true;
                if (v < LIMIT) {
                    vbfMeasSetInputState(inp, 'error');
                    setMeasTooltip(inp, `❌ NEM MEGFELELŐ: ${v} MΩ < ${LIMIT} MΩ (MSZ HD 60364-6 §61.3.3)`);
                    isOk = false;
                } else if (v < WARN) {
                    vbfMeasSetInputState(inp, 'warn');
                    setMeasTooltip(inp, `⚠️ FIGYELEM: ${v} MΩ – megfelel, de közel a ${LIMIT} MΩ határhoz`);
                } else {
                    vbfMeasSetInputState(inp, 'ok');
                    setMeasTooltip(inp, `✅ MEGFELELŐ: ${v} MΩ ≥ ${LIMIT} MΩ (MSZ HD 60364-6 §61.3.3)`);
                }
            } else { vbfMeasSetInputState(inp, null); }
        });
        if (anyFilled) passSelect.value = isOk ? 'Igen' : 'Nem';
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
        const deviceVal = (tr.querySelector('.meas-device')?.value || '').toUpperCase().trim();
        const zsInput = tr.querySelector('.meas-zs');
        const zsVal = parseFloat(zsInput?.value);
        const passSelect = tr.querySelector('.meas-pass');
        if (!deviceVal || isNaN(zsVal)) return;

        const maxZs = calcZsMax(deviceVal);

        if (maxZs !== null) {
            const limit = maxZs.toFixed(3);
            if (zsVal > maxZs) {
                vbfMeasSetInputState(zsInput, 'error');
                passSelect.value = 'Nem';
                setMeasTooltip(zsInput, `❌ NEM MEGFELELŐ: ${zsVal} Ω > ${limit} Ω (MSZ HD 60364-6 §61.3.6, képlet: Zs ≤ U₀×0,95/Ia = 230×0,95/Ia)`);
            } else {
                vbfMeasSetInputState(zsInput, 'ok');
                passSelect.value = 'Igen';
                setMeasTooltip(zsInput, `✅ MEGFELELŐ: ${zsVal} Ω ≤ ${limit} Ω (max. Zs ${deviceVal})`);
            }
        } else {
            // Ismeretlen védelem (pl. NH biztosíték szám nélkül) – nem tudunk automatikusan minősíteni
            vbfMeasSetInputState(zsInput, null);
            setMeasTooltip(zsInput, `ℹ️ Nem ismert biztosíték típus: "${deviceVal}" – pl. B16, C20, D10, GG63`);
        }
        window.vbfSyncMeasPassUI(tr);
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
        const idnInput = tr.querySelector('.meas-idn');
        const idn = parseFloat(idnInput?.value);
        const typeSelect = tr.querySelector('.meas-type');
        const rcdType = typeSelect?.value || 'A';  // AC, A, B, F, S
        const t1Input = tr.querySelector('.meas-t1');
        const t1 = parseFloat(t1Input?.value);
        const t5Input = tr.querySelector('.meas-t5');
        const t5 = parseFloat(t5Input?.value);
        const rampInput = tr.querySelector('.meas-ramp');
        const ramp = parseFloat(rampInput?.value);
        const ucInput = tr.querySelector('.meas-uc');
        const uc = parseFloat(ucInput?.value);
        const test05Select = tr.querySelector('.meas-05');
        const passSelect = tr.querySelector('.meas-pass');
        let isOk = true;

        // MSZ HD 60364-6:2017 §61.3.7 + IEC 61008-1 / EN 61009-1
        // Max kioldási idők IΔn áramnál:
        //   Általános (AC/A/B/F): 300 ms (időfüggetlen)
        //   S (késleltetett): 1000 ms
        // 5×IΔn áramnál: általános → 40 ms, S → 150 ms
        const isSTypeDelay = rcdType === 'S';
        const maxT1 = isSTypeDelay ? 1000 : 300;   // ms @ IΔn
        const maxT5 = isSTypeDelay ? 150  : 40;    // ms @ 5×IΔn

        // 0. Fél IΔn teszt (nem szabad kioldani 0,5×IΔn-nél)
        if (test05Select?.value !== 'OK (Nem oldott)') {
            isOk = false;
        }

        // 1. t1 @ 1×IΔn
        if (!isNaN(t1)) {
            if (t1 > maxT1) {
                vbfMeasSetInputState(t1Input, 'error');
                setMeasTooltip(t1Input, `❌ NEM MEGFELELŐ: ${t1} ms > ${maxT1} ms (IEC 61008-1, ${rcdType} típus, 1×IΔn)`);
                isOk = false;
            } else if (t1 > maxT1 * 0.8) {
                vbfMeasSetInputState(t1Input, 'warn');
                setMeasTooltip(t1Input, `⚠️ FIGYELEM: ${t1} ms – közel a ${maxT1} ms határhoz`);
            } else {
                vbfMeasSetInputState(t1Input, 'ok');
                setMeasTooltip(t1Input, `✅ ${t1} ms ≤ ${maxT1} ms`);
            }
        }

        // 2. t5 @ 5×IΔn
        if (!isNaN(t5)) {
            if (t5 > maxT5) {
                vbfMeasSetInputState(t5Input, 'error');
                setMeasTooltip(t5Input, `❌ NEM MEGFELELŐ: ${t5} ms > ${maxT5} ms (IEC 61008-1, ${rcdType} típus, 5×IΔn)`);
                isOk = false;
            } else {
                vbfMeasSetInputState(t5Input, 'ok');
                setMeasTooltip(t5Input, `✅ ${t5} ms ≤ ${maxT5} ms`);
            }
        }

        // 3. Kioldóáram RAMP: 50% < I_kioldás ≤ 100% × IΔn (IEC 61008-1 §8.6)
        if (!isNaN(idn) && !isNaN(ramp)) {
            const rampLo = idn * 0.5;
            const rampHi = idn * 1.0;
            if (ramp <= rampLo || ramp > rampHi) {
                vbfMeasSetInputState(rampInput, 'error');
                setMeasTooltip(rampInput, `❌ NEM MEGFELELŐ: ${ramp} mA – szükséges: ${rampLo}–${rampHi} mA (IEC 61008-1 §8.6)`);
                isOk = false;
            } else {
                vbfMeasSetInputState(rampInput, 'ok');
                setMeasTooltip(rampInput, `✅ ${ramp} mA a ${rampLo}–${rampHi} mA tarton belül`);
            }
        }

        // 4. Érintési feszültség Uc (MSZ HD 60364-4-41 §411.3.2: Uc ≤ 50 V AC általános,
        //    nedves/kültéri: ≤ 25 V – ez utóbbit a felhasználó manuálisan állítja)
        if (!isNaN(uc)) {
            if (uc > 50) {
                if (ucInput) { vbfMeasSetInputState(ucInput, 'error'); setMeasTooltip(ucInput, `❌ ${uc} V > 50 V max (MSZ HD 60364-4-41 §411.3.2)`); }
                isOk = false;
            } else if (uc > 25) {
                if (ucInput) { vbfMeasSetInputState(ucInput, 'warn'); setMeasTooltip(ucInput, `⚠️ ${uc} V > 25 V – nedves/kültéri helyen nem megfelelő`); }
            } else {
                if (ucInput) { vbfMeasSetInputState(ucInput, 'ok'); setMeasTooltip(ucInput, `✅ ${uc} V ≤ 25 V`); }
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
                <td><input type="number" step="0.1" class="meas-v" placeholder="26.4" oninput="validateSelv(this.closest('tr'))"></td>
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
        const val = parseFloat(valInput?.value);
        const passSelect = tr.querySelector('.meas-pass');
        if (isNaN(val)) return;
        // MSZ HD 60364-5-54:2011 §544 + 60364-4-41 §411.3.1.2: R_EPH ≤ 1 Ω
        if (val > 1.0) {
            vbfMeasSetInputState(valInput, 'error');
            passSelect.value = 'Nem';
            setMeasTooltip(valInput, `❌ NEM MEGFELELŐ: ${val} Ω > 1,0 Ω (MSZ HD 60364-5-54 §544)`);
        } else if (val > 0.3) {
            vbfMeasSetInputState(valInput, 'warn');
            passSelect.value = 'Igen';
            setMeasTooltip(valInput, `⚠️ FIGYELEM: ${val} Ω – megfelel, de 0,3 Ω felett érdemes ellenőrizni`);
        } else {
            vbfMeasSetInputState(valInput, 'ok');
            passSelect.value = 'Igen';
            setMeasTooltip(valInput, `✅ MEGFELELŐ: ${val} Ω ≤ 0,30 Ω (MSZ HD 60364-5-54 §544)`);
        }
        window.vbfSyncMeasPassUI(tr);
    };

    // SELV/PELV validáció
    window.validateSelv = function (tr) {
        const vInput = tr.querySelector('.meas-v');
        const v = parseFloat(vInput?.value);
        const passSelect = tr.querySelector('.meas-pass');
        if (!vInput || isNaN(v)) return;
        // MSZ HD 60364-4-41:2017 §414: SELV max feszültség
        // Száraz helyiség: ≤ 25 V AC  |  Nedves/kültéri: ≤ 12 V AC
        if (v > 25) {
            vbfMeasSetInputState(vInput, 'error');
            passSelect.value = 'Nem';
            setMeasTooltip(vInput, `❌ NEM MEGFELELŐ: ${v} V > 25 V AC max (MSZ HD 60364-4-41 §414, SELV száraz helyiség)`);
        } else if (v > 12) {
            vbfMeasSetInputState(vInput, 'warn');
            passSelect.value = 'Igen';
            setMeasTooltip(vInput, `⚠️ FIGYELEM: ${v} V > 12 V – nedves/kültéri helyiségben nem megfelelő SELV`);
        } else {
            vbfMeasSetInputState(vInput, 'ok');
            passSelect.value = 'Igen';
            setMeasTooltip(vInput, `✅ MEGFELELŐ: ${v} V ≤ 12 V AC (MSZ HD 60364-4-41 §414)`);
        }
        window.vbfSyncMeasPassUI(tr);
    };

    window.validateTool = function (tr) {
        const valInput = tr.querySelector('.meas-val');
        const val = parseFloat(valInput?.value);
        const passSelect = tr.querySelector('.meas-pass');
        if (isNaN(val)) return;
        // MSZ EN 60745-1:2009 + MSZ EN 62841-1 §16:
        // Kéziszerszám szigetelési ellenállás (500V DC próba): ≥ 2 MΩ
        if (val < 2.0) {
            vbfMeasSetInputState(valInput, 'error');
            passSelect.value = 'Nem';
            setMeasTooltip(valInput, `❌ NEM MEGFELELŐ: ${val} MΩ < 2,0 MΩ (MSZ EN 60745-1 §16)`);
        } else if (val < 5.0) {
            vbfMeasSetInputState(valInput, 'warn');
            passSelect.value = 'Igen';
            setMeasTooltip(valInput, `⚠️ FIGYELEM: ${val} MΩ – megfelel, de közel a 2 MΩ határhoz`);
        } else {
            vbfMeasSetInputState(valInput, 'ok');
            passSelect.value = 'Igen';
            setMeasTooltip(valInput, `✅ MEGFELELŐ: ${val} MΩ ≥ 5,0 MΩ (MSZ EN 60745-1 §16)`);
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
