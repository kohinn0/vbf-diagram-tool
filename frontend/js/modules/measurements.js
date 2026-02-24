// --- MÉRÉSI ADATOK TÁBLÁZAT KEZELÉSE ---
function createRow(tableId, htmlContent) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = htmlContent + `
        <td style="display:flex; gap: 5px; align-items: center; border: none;">
            <label class="btn btn-secondary btn-small" title="Kép csatolása az áramkörhöz" style="margin:0; padding: 4px 8px; cursor: pointer;">
                📷
                <input type="file" accept="image/*" style="display:none;" onchange="attachMeasurementPhoto(this)">
            </label>
            <button class="btn btn-danger btn-small" onclick="this.closest('tr').remove()" style="margin:0; padding: 4px 8px;">Törlés</button>
        </td>`;
    tbody.appendChild(tr);
}

document.getElementById('btnAddRpe')?.addEventListener('click', () => {
    const gloc = document.getElementById('globalLocation')?.value || '';
    createRow('table-rpe', `
            <td><input type="number" class="meas-point" placeholder="1"></td>
            <td><input type="text" class="meas-loc" placeholder="PE sín - Gázcső" value="${gloc}"></td>
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

document.getElementById('btnAddInsulation')?.addEventListener('click', () => {
    const gloc = document.getElementById('globalLocation')?.value || '';
    createRow('table-insulation', `
            <td><input type="text" class="meas-circuit" placeholder="L1 - Világítás" list="circuitNames" value="${gloc ? gloc + ' - ' : ''}"></td>
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

document.getElementById('btnAddLoop')?.addEventListener('click', () => {
    const gloc = document.getElementById('globalLocation')?.value || '';
    const gdev = document.getElementById('globalDevice')?.value || '';
    createRow('table-loop', `
            <td><input type="text" class="meas-circuit" placeholder="Dugalj 1. szoba" list="circuitNames"></td>
            <td><input type="text" class="meas-device" placeholder="B16" value="${gdev}" oninput="validateZs(this.closest('tr'))"></td>
            <td><input type="text" class="meas-loc" placeholder="E1/4" value="${gloc}"></td>
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
            maxZs = 230 / Ia; // Zs <= Uo / Ia paraméter a képletből
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

document.getElementById('btnAddRcd')?.addEventListener('click', () => {
    createRow('table-rcd', `
            <td><input type="text" class="meas-circ" placeholder="Fürdő ÁVK" list="circuitNames"></td>
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

    // 1. Általános RCD max kioldási idő 300ms a HD 60364-4-41 alapján (TN 230V -> 400ms is lehet, de 300ms konzervatív)
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

document.getElementById('btnAddTool')?.addEventListener('click', () => {
    createRow('table-tools', `
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

    // Szabványosan a kéziszerszámok szigetelési ellenállása I. év II. év. osztálytól függően > 2.0 MQ
    if (val < 2.0) {
        valInput.style.backgroundColor = 'rgba(239, 68, 68, 0.3)'; // Red
        passSelect.value = 'Nem';
    } else {
        valInput.style.backgroundColor = 'rgba(16, 185, 129, 0.3)'; // Green
        passSelect.value = 'Igen';
    }
};

document.getElementById('btnAddSelv')?.addEventListener('click', () => {
    createRow('table-selv', `
            <td><input type="text" class="meas-loc" placeholder="Fszt. folyosó / 230-24V"></td>
            <td><input type="number" step="0.1" class="meas-v" placeholder="26.4"></td>
            <td><input type="number" step="1" class="meas-ps" placeholder="999"></td>
            <td><input type="number" step="1" class="meas-pt" placeholder="999"></td>
            <td><input type="number" step="1" class="meas-st" placeholder="999"></td>
            <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
        `);
});

document.getElementById('btnAddEph')?.addEventListener('click', () => {
    createRow('table-eph', `
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
