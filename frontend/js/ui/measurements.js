export function initMeasurements() {
    window.VBF = window.VBF || {};

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
                const photoBtn = tr.querySelector('label[title]');
                if (photoBtn) {
                    photoBtn.innerHTML = `✅ <input type="file" accept="image/*" style="display:none;" onchange="attachMeasurementPhoto(this)">`;
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
        tr.innerHTML = htmlContent + `
            <td class="meas-actions" style="white-space:nowrap;">
                <button type="button" class="btn btn-secondary btn-small" title="Hiba felvitele a hibajegyzékbe" style="margin:0; padding: 4px 8px;" onclick="typeof window.addDefectFromMeasurementRow==='function'&&window.addDefectFromMeasurementRow(this.closest('tr'))">Hiba</button>
                <label class="btn btn-secondary btn-small" title="Fotó csatolása" style="margin:0; padding: 4px 8px;">
                    📷
                    <input type="file" accept="image/*" style="display:none;" onchange="window.attachMeasurementPhoto(this)">
                </label>
                <button class="btn btn-danger btn-small" onclick="this.closest('tr').remove()" title="Sor törlése" style="margin:0; padding: 4px 8px;">🗑️</button>
            </td>
        `;

        tbody.appendChild(tr);
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
                <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
            `);
    });

    window.validateRpe = function (tr) {
        const valInput = tr.querySelector('.meas-val');
        const val = parseFloat(valInput.value);
        const passSelect = tr.querySelector('.meas-pass');

        if (isNaN(val)) return;

        // Jellemzően védővezető folytonosságnál szigorúan max. 1.0 Ohm
        if (val > 1.0) {
            valInput.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'; // Red
            passSelect.value = 'Nem';
        } else if (val > 0.5) {
            valInput.style.backgroundColor = 'rgba(245, 158, 11, 0.3)'; // Amber/Warning
            passSelect.value = 'Igen';
        } else {
            valInput.style.backgroundColor = 'rgba(16, 185, 129, 0.3)'; // Green
            passSelect.value = 'Igen';
        }
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
                <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
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
                    input.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                    isOk = false;
                } else {
                    input.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
                }
            } else {
                input.style.backgroundColor = ''; // clear if empty
            }
        });

        if (anyFilled) {
            passSelect.value = isOk ? 'Igen' : 'Nem';
        }
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
                <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
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
                zsInput.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'; // Red
                passSelect.value = 'Nem';
            } else {
                zsInput.style.backgroundColor = 'rgba(16, 185, 129, 0.3)'; // Green
                passSelect.value = 'Igen';
            }
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
                <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
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
                t1Input.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                isOk = false;
            } else {
                t1Input.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
            }
        }

        // 5x Idn teszt (jellemzően max 40 ms)
        if (!isNaN(t5)) {
            if (t5 > 40) {
                t5Input.style.backgroundColor = 'rgba(245, 158, 11, 0.3)'; // Amber
            } else {
                t5Input.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
            }
        }

        // 2. Kioldóáram RAMP (Szabványosan: 50% < I_kioldás <= 100%)
        if (!isNaN(idn) && !isNaN(ramp)) {
            if (ramp <= idn * 0.5 || ramp > idn) {
                rampInput.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                isOk = false;
            } else {
                rampInput.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
            }
        }

        // 3. Érintési feszültség Uc (Max 50V általános esetben)
        if (!isNaN(uc)) {
            if (uc > 50) {
                if (ucInput) ucInput.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                isOk = false;
            } else {
                if (ucInput) ucInput.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
            }
        }

        passSelect.value = isOk ? 'Igen' : 'Nem';
    };

    // ═══════════════════════════════════════════
    // Kéziszerszám szigetelés
    // ═══════════════════════════════════════════

    document.getElementById('btnAddTool')?.addEventListener('click', () => {
        window.createRow('table-tools', `
                <td><input type="text" class="meas-name" placeholder="Ütvefúró"></td>
                <td><input type="text" class="meas-id" placeholder="HILTI-01"></td>
                <td><input type="number" step="0.1" class="meas-val" placeholder="50" oninput="validateTool(this.closest('tr'))"></td>
                <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
            `);
    });

    window.validateTool = function (tr) {
        const valInput = tr.querySelector('.meas-val');
        const val = parseFloat(valInput.value);
        const passSelect = tr.querySelector('.meas-pass');

        if (isNaN(val)) return;

        // Szabványosan a kéziszerszámok szigetelési ellenállása > 2.0 MΩ
        if (val < 2.0) {
            valInput.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'; // Red
            passSelect.value = 'Nem';
        } else {
            valInput.style.backgroundColor = 'rgba(16, 185, 129, 0.3)'; // Green
            passSelect.value = 'Igen';
        }
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
                <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
            `);
    });

    window.validateEph = function (tr) {
        const valInput = tr.querySelector('.meas-val');
        const val = parseFloat(valInput.value);
        const passSelect = tr.querySelector('.meas-pass');

        if (isNaN(val)) return;

        // EPH folytonosságnál maximum 1.0 Ohm, de inkább kevesebb!
        if (val > 1.0) {
            valInput.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'; // Red
            passSelect.value = 'Nem';
        } else if (val > 0.3) {
            valInput.style.backgroundColor = 'rgba(245, 158, 11, 0.3)'; // Amber/Warning
            passSelect.value = 'Igen';
        } else {
            valInput.style.backgroundColor = 'rgba(16, 185, 129, 0.3)'; // Green
            passSelect.value = 'Igen';
        }
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
}
