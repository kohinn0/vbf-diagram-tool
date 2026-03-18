export function initPadfx() {
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
                console.log("[PADFX] Új fájl feltöltése:", file.name);
                btnLoadPadfx.innerText = 'Feldolgozás... ⏳';
                const fetchHeaders = {};
                if (window.currentToken) {
                    fetchHeaders['Authorization'] = `Bearer ${window.currentToken}`;
                }

                const res = await fetch(`${window.API_BASE_URL}/api/padfx/parse`, {
                    method: 'POST',
                    headers: fetchHeaders,
                    body: formData
                });

                const data = await res.json();
                console.log("Metrel PADFX (Adatbázis / XML) Elemzés Eredménye:", data);

                if (data.status === 'success') {
                    if (data.is_sqlite) {
                        alert('✅ Sikeresen kicsomagoltuk a Metrel SQLite adatbázist a szerveren!\n\nKérlek ellenőrizd a böngésző F12 Konszolját, mert oda kiírtam a táblák neveit és a minta adatokat.');
                    } else if (data.measurements) {
                        const fmt = data.format === 'csv' ? 'CSV (Fluke/Megger)' : 'Metrel PADFX';
                        if (window.showToast) window.showToast(`${fmt}: ${data.measurements.length} mérés betöltve.`, 'success');
                        else alert(`✅ ${fmt} feldolgozva!\n\n${data.measurements.length} db mérés betöltve a táblázatokba.`);

                        let rpeCount = 0;
                        let zsCount = 0;
                        let rcdCount = 0;

                        data.measurements.forEach(m => {
                            if (m.type === "Rpe Folytonosság") {
                                const val = m.results["r_43"] || m.results["r_46"] || "";
                                window.createRow('table-rpe', `
                                    <td><input type="number" class="meas-point" value="${++rpeCount}"></td>
                                    <td><input type="text" class="meas-loc" value="${m.location}"></td>
                                    <td><input type="number" step="0.01" class="meas-val" value="${parseFloat(val) || val}" oninput="validateRpe(this.closest('tr'))"></td>
                                    <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
                                `);
                                // Automatikus validáció futtatása
                                const lastRow = document.querySelector('#table-rpe tbody tr:last-child');
                                if (lastRow) window.validateRpe(lastRow);
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

                                window.createRow('table-loop', `
                                    <td><input type="text" class="meas-circuit" value="${m.location}" list="circuitNames"></td>
                                    <td><input type="text" class="meas-device" value="${device}" oninput="validateZs(this.closest('tr'))"></td>
                                    <td><input type="text" class="meas-loc" value="${m.location}"></td>
                                    <td><input type="number" step="0.01" class="meas-zs" value="${zsVal}" oninput="validateZs(this.closest('tr'))"></td>
                                    <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
                                `);
                                const lastRow = document.querySelector('#table-loop tbody tr:last-child');
                                if (lastRow) window.validateZs(lastRow);
                            }
                            else if (m.type === "RCD (FI-relé)") {
                                const idn = parseInt(m.params["p_28"]) || 30;
                                const t1 = parseFloat(m.results["r_28"]) || "";
                                window.createRow('table-rcd', `
                                    <td><input type="text" class="meas-circuit" value="${m.location}" list="circuitNames"></td>
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
                                if (lastRow) window.validateRcd(lastRow);
                            }
                            else if (m.type === "Riso Szigetelés") {
                                const ln = m.results["r_11"] || m.results["r_14"] || "";
                                window.createRow('table-insulation', `
                                <td><input type="text" class="meas-circuit" value="${m.location}" list="circuitNames"></td>
                                <td><input type="number" step="0.1" class="meas-ln" value="${ln || ''}" oninput="validateIns(this.closest('tr'))"></td>
                                <td><input type="number" step="0.1" class="meas-lpe" placeholder=">999" oninput="validateIns(this.closest('tr'))"></td>
                                <td><input type="number" step="0.1" class="meas-npe" placeholder=">999" oninput="validateIns(this.closest('tr'))"></td>
                                <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
                            `);
                                const lastRow = document.querySelector('#table-insulation tbody tr:last-child');
                                if (lastRow) window.validateIns(lastRow);
                            }
                        });

                        if (data.measurements.length === 0) {
                            if (window.showToast) window.showToast('A fájlban nem találhatók felismerhető mérési adatok.', 'warning');
                            else alert('⚠️ A fájlban nem találhatók felismerhető mérési adatok (Rpe, Zs, RCD, Riso oszlopok).');
                        }
                    }
                } else {
                    if (window.showToast) window.showToast(data.message || 'Import hiba', 'error');
                    else alert('Hiba: ' + (data.message || 'Ismeretlen hiba'));
                }
            } catch (err) {
                if (window.showToast) window.showToast('Feltöltés hiba: ' + err.message, 'error');
                else alert('Hiba a fájl feltöltésekor: ' + err.message);
            } finally {
                btnLoadPadfx.innerText = 'Mérési fájl import (PADFX / CSV) 📥';
                e.target.value = '';
            }
        });
    }
}
