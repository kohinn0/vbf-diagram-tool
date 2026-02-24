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

window.attachMeasurementPhoto = function (input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const tr = input.closest('tr');
            tr.setAttribute('data-photo', e.target.result);
            input.parentElement.style.backgroundColor = 'rgba(16, 185, 129, 0.3)';
            input.parentElement.style.borderColor = 'var(--accent)';
            input.parentElement.title = "Kép csatolva!";
        };
        reader.readAsDataURL(file);
    }
};

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
            // Ha a login nem sikerült, próbáljuk meg regisztrálni (könnyített dev flow)
            res = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                // Sikeres reg után login újra
                res = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString()
                });
            } else {
                const errData = await res.json();
                throw new Error(errData.detail || 'Hibás adatok vagy regisztráció!');
            }
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

// Mentés a Felhőbe Funkció
btnSaveCloud.addEventListener('click', async () => {
    if (!currentToken) return alert('Előbb jelentkezz be!');

    btnSaveCloud.innerText = 'Mentés...';
    btnSaveCloud.disabled = true;

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
            }
        };

        // 2. Kinyerjük a Fabric Canvas-t
        const canvasJson = canvas.toJSON(['vbfData']);

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
            defects_data: defectsArr,
            measurements_data: []
        };

        // Összegyűjtjük a méréseket JSON objektumokként a táblázatokból
        const measData = {
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
                circ: tr.querySelector('.meas-circ')?.value || '',
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
            eph_cont: Array.from(document.querySelectorAll('#table-eph tbody tr')).map(tr => ({
                idx: tr.querySelector('.meas-index')?.value || '',
                elem: tr.querySelector('.meas-elem')?.value || '',
                loc: tr.querySelector('.meas-loc')?.value || '',
                mat: tr.querySelector('.meas-mat')?.value || '',
                conn: tr.querySelector('.meas-conn')?.value || '',
                val: tr.querySelector('.meas-val')?.value || '',
                pass: tr.querySelector('.meas-pass')?.value || '',
                photo: tr.getAttribute('data-photo') || ''
            }))
        };
        payload.measurements_data = [measData];

        const isUpdate = !!currentSavedReportId;
        const reqMethod = isUpdate ? 'PUT' : 'POST';
        const reqUrl = isUpdate ? `${API_BASE_URL}/reports/${currentSavedReportId}` : `${API_BASE_URL}/reports`;

        if (!navigator.onLine) {
            // HÁLÓZAT NÉLKÜLI MENTÉS (OFFLINE QUEUE)
            btnSaveCloud.innerText = 'Mentés Offline...';
            let offlineQueue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');
            payload._offline_id = Date.now(); // Belső azonosító
            payload._method = reqMethod;
            // Ne a teljes API URL-t tartogassuk, csak az elérési utat, hátha változik a domain
            payload._endpoint = isUpdate ? `/reports/${currentSavedReportId}` : `/reports`;

            offlineQueue.push(payload);
            localStorage.setItem('vbf_offline_queue', JSON.stringify(offlineQueue));

            // Ha új report volt offline mentve, nincs ID-ja, így legközelebb is POST lesz offline, hacsak nem ürítjük a UI-t, de ez így egy elfogadható offline UX első körben.
            alert("Nincs internetkapcsolat! A jegyzőkönyv az eszköz memóriájába (Offline) mentve. Amint lesz hálózat, szinkronizáld a felhőbe!");
            updateOfflineUI();
        } else {
            // NORMÁL ONLINE MENTÉS
            const res = await fetch(reqUrl, {
                method: reqMethod,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Hiba történt a mentés során!');

            const jsonResponse = await res.json();
            currentSavedReportId = jsonResponse.id;
            btnExportWord.style.display = 'inline-block';
            if (btnExportPdfReport) btnExportPdfReport.style.display = 'inline-block';
            if (btnEmailReport) btnEmailReport.style.display = 'inline-block';
            const savedDocId = formatDocId(payload.report_type, jsonResponse.id, null);
            alert(`Sikeres mentés! Jegyzőkönyv Száma: ${savedDocId}`);

            // Generate QR Code in Inspector or a specific area
            showReportQr(jsonResponse.id);
            fetchReports(); // Refresh cloud list
        }
    } catch (err) {
        alert(err.message);
    } finally {
        btnSaveCloud.innerText = 'Mentés ☁️';
        btnSaveCloud.disabled = false;
    }
});

// Word Generálás Funkció
btnExportWord.addEventListener('click', async () => {
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
        a.style.display = 'none';
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
                throw new Error(error.detail || 'Hiba a PDF generálás során! (Backend hiba). Telepítve van a MS Word a szerveren?');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
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

        const measData = {
            rpe: Array.from(document.querySelectorAll('#table-rpe tbody tr')).map(tr => ({
                point: tr.querySelector('.meas-point')?.value || '',
                loc: tr.querySelector('.meas-loc')?.value || '',
                val: tr.querySelector('.meas-val')?.value || '',
                pass: tr.querySelector('.meas-pass')?.value || ''
            })),
            insulation: Array.from(document.querySelectorAll('#table-insulation tbody tr')).map(tr => ({
                circuit: tr.querySelector('.meas-circuit')?.value || '',
                ln: tr.querySelector('.meas-ln')?.value || '',
                lpe: tr.querySelector('.meas-lpe')?.value || '',
                npe: tr.querySelector('.meas-npe')?.value || '',
                pass: tr.querySelector('.meas-pass')?.value || ''
            })),
            loop: Array.from(document.querySelectorAll('#table-loop tbody tr')).map(tr => ({
                circuit: tr.querySelector('.meas-circuit')?.value || '',
                device: tr.querySelector('.meas-device')?.value || '',
                loc: tr.querySelector('.meas-loc')?.value || '',
                zs: tr.querySelector('.meas-zs')?.value || '',
                pass: tr.querySelector('.meas-pass')?.value || ''
            })),
            rcd: Array.from(document.querySelectorAll('#table-rcd tbody tr')).map(tr => ({
                circ: tr.querySelector('.meas-circ')?.value || '',
                type: tr.querySelector('.meas-type')?.value || 'A',
                idn: tr.querySelector('.meas-idn')?.value || '',
                test05: tr.querySelector('.meas-05')?.value || '',
                t1: tr.querySelector('.meas-t1')?.value || '',
                t5: tr.querySelector('.meas-t5')?.value || '',
                ramp: tr.querySelector('.meas-ramp')?.value || '',
                uc: tr.querySelector('.meas-uc')?.value || '',
                pass: tr.querySelector('.meas-pass')?.value || ''
            })),
            tools: Array.from(document.querySelectorAll('#table-tools tbody tr')).map(tr => ({
                name: tr.querySelector('.meas-name')?.value || '',
                id: tr.querySelector('.meas-id')?.value || '',
                val: tr.querySelector('.meas-val')?.value || '',
                pass: tr.querySelector('.meas-pass')?.value || ''
            })),
            selv: Array.from(document.querySelectorAll('#table-selv tbody tr')).map(tr => ({
                loc: tr.querySelector('.meas-loc')?.value || '',
                v: tr.querySelector('.meas-v')?.value || '',
                ps: tr.querySelector('.meas-ps')?.value || '',
                pt: tr.querySelector('.meas-pt')?.value || '',
                st: tr.querySelector('.meas-st')?.value || '',
                pass: tr.querySelector('.meas-pass')?.value || ''
            })),
            eph_cont: Array.from(document.querySelectorAll('#table-eph tbody tr')).map(tr => ({
                idx: tr.querySelector('.meas-index')?.value || '',
                elem: tr.querySelector('.meas-elem')?.value || '',
                loc: tr.querySelector('.meas-loc')?.value || '',
                mat: tr.querySelector('.meas-mat')?.value || '',
                conn: tr.querySelector('.meas-conn')?.value || '',
                val: tr.querySelector('.meas-val')?.value || '',
                pass: tr.querySelector('.meas-pass')?.value || ''
            }))
        };

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
