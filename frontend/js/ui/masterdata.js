export function initMasterData() {
    let customersData = [];
    let inspectorsData = [];

    window.fetchMasterData = async function () {
        if (!window.currentToken) return;

        try {
            const resC = await fetch(`${window.API_BASE_URL}/customers`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (resC.ok) {
                customersData = await resC.json();
                renderCustomers();
                updateCustomerDropdowns();
            }

            const resI = await fetch(`${window.API_BASE_URL}/inspectors`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (resI.ok) {
                inspectorsData = await resI.json();
                renderInspectors();
                updateInspectorDropdowns();
            }
        } catch (err) {
            console.error("Hiba a törzsadatok betöltésénél:", err);
        }
    };

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
            const res = await fetch(`${window.API_BASE_URL}/customers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.currentToken}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Ügyfél mentve!");
                document.getElementById('mdCustName').value = '';
                document.getElementById('mdCustAddr').value = '';
                document.getElementById('mdCustHrsz').value = '';
                document.getElementById('mdCustPurpose').value = '';
                window.fetchMasterData();
            } else {
                alert("Sikertelen mentés!");
            }
        } catch (err) { alert("Hiba a mentés során: " + err); }
    });

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
            const res = await fetch(`${window.API_BASE_URL}/inspectors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.currentToken}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Felülvizsgáló mentve!");
                document.getElementById('mdInspName').value = '';
                document.getElementById('mdInspLic').value = '';
                document.getElementById('mdInspInst').value = '';
                document.getElementById('mdInspCal').value = '';
                window.fetchMasterData();
            } else {
                alert("Sikertelen mentés!");
            }
        } catch (err) { alert("Hiba a mentés során!"); }
    });

    window.deleteCustomer = async function (id) {
        if (!confirm("Törlöd ezt az ügyfelet?")) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/customers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (res.ok) window.fetchMasterData();
        } catch (e) { console.error(e); }
    };

    window.deleteInspector = async function (id) {
        if (!confirm("Törlöd ezt a felülvizsgálót?")) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/inspectors/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (res.ok) window.fetchMasterData();
        } catch (e) { console.error(e); }
    };

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

    if (window.currentToken) {
        window.fetchMasterData();
    }

    document.getElementById('loadTemplateSelect')?.addEventListener('change', (e) => {
        const tpl = e.target.value;
        console.log("[Template] Sablon kiválasztva:", tpl);
        if (!tpl) return;

        if (!confirm("Biztosan betöltöd a sablon mérési sorait? Ez felülírja a jelenlegi táblázatokat az adott füleken!")) {
            e.target.value = "";
            return;
        }

        document.querySelectorAll('.data-table tbody').forEach(tb => tb.innerHTML = '');

        if (tpl === 'TPL_PANEL_3ROOM') {
            document.getElementById('buildingPurpose').value = 'Lakóépület - Panel';
            document.getElementById('docType').value = 'VBF_IDOSZAKOS';

            window.createRow('table-rpe', `<td><input type="number" class="meas-point" value="1"></td><td><input type="text" class="meas-loc" value="Elosztó -> Bejárati Dug."></td><td><input type="number" step="0.01" class="meas-val" value="0.12"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            window.createRow('table-rpe', `<td><input type="number" class="meas-point" value="2"></td><td><input type="text" class="meas-loc" value="Elosztó -> EPH Csomópont"></td><td><input type="number" step="0.01" class="meas-val" value="0.05"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);

            ['Világítás Nappali', 'Világítás Hálók', 'Dugalj Konyha', 'Dugalj Hálók', 'Klíma Betáp'].forEach(c => {
                window.createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            });

            ['Főbetáp', 'Világítás Nappali', 'Dugalj Konyha'].forEach(c => {
                window.createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="C16"></td><td><input type="text" class="meas-loc" value="Végelosztó/Végpont"></td><td><input type="number" step="0.01" class="meas-zs" value="0.65"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            });

            window.createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Fő ÁVK"></td><td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="22"></td><td><input type="number" step="1" class="meas-t5" value="15"></td><td><input type="number" step="0.1" class="meas-ramp" value="24.5"></td><td><input type="number" step="0.1" class="meas-uc" value="1.0"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        }
        else if (tpl === 'TPL_OFFICE_SMALL') {
            document.getElementById('buildingPurpose').value = 'Iroda / Üzlet';
            document.getElementById('docType').value = 'VBF_IDOSZAKOS';
            ['L1 Világítás', 'L2 Dugalj (Kávéfőző)', 'L3 Szerver Rack', 'L1 Dug. Asztalok'].forEach(c => {
                window.createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
                window.createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="C16"></td><td><input type="text" class="meas-loc" value="Végpont"></td><td><input type="number" step="0.01" class="meas-zs" value="0.45"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            });
            window.createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Irodai ÁVK (3F)"></td><td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="18"></td><td><input type="number" step="1" class="meas-t5" value="12"></td><td><input type="number" step="0.1" class="meas-ramp" value="22.1"></td><td><input type="number" step="0.1" class="meas-uc" value="1.5"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        }
        else if (tpl === 'TPL_FAMILY_HOUSE') {
            document.getElementById('buildingPurpose').value = 'Családi Ház';
            document.getElementById('docType').value = 'VBF_ELSO';
            ['Konyha Gépészet', 'Nappali Dugalj', 'Hőszivattyú', 'Fürdőszoba (Mosógép)', 'Kerti Kiállás'].forEach(c => {
                window.createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
                window.createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="B16"></td><td><input type="text" class="meas-loc" value="Végpont"></td><td><input type="number" step="0.01" class="meas-zs" value="0.80"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            });
            window.createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Főkábel ÁVK"></td><td><select class="meas-type"><option selected>AC</option><option>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="13"></td><td><input type="number" step="1" class="meas-t5" value="8"></td><td><input type="number" step="0.1" class="meas-ramp" value="26.0"></td><td><input type="number" step="0.1" class="meas-uc" value="1.1"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            window.createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Fürdő ÁVK"></td><td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="10"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="10"></td><td><input type="number" step="1" class="meas-t5" value="5"></td><td><input type="number" step="0.1" class="meas-ramp" value="8.0"></td><td><input type="number" step="0.1" class="meas-uc" value="0.8"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        }
        else if (tpl === 'TPL_APARTMENT_1ROOM') {
            document.getElementById('buildingPurpose').value = 'Lakóépület - Garzon';
            document.getElementById('docType').value = 'VBF_IDOSZAKOS';
            ['Világítás Rész', 'Dugalj Rész', 'Hűtő', 'Mosógép'].forEach(c => {
                window.createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
                window.createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="B16"></td><td><input type="text" class="meas-loc" value="Végpont"></td><td><input type="number" step="0.01" class="meas-zs" value="0.72"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            });
            window.createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Lakás ÁVK"></td><td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="20"></td><td><input type="number" step="1" class="meas-t5" value="10"></td><td><input type="number" step="0.1" class="meas-ramp" value="23.0"></td><td><input type="number" step="0.1" class="meas-uc" value="1.0"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        }
        else if (tpl === 'TPL_WORKSHOP') {
            document.getElementById('buildingPurpose').value = 'Ipari Csarnok / Raktár';
            document.getElementById('docType').value = 'VBF_IDOSZAKOS';
            ['Fő Elosztó Betáp (3F)', 'Csarnok Világítás (3F)', 'Hegesztő Dugalj 1', 'Eszterga Betáp', 'Irodai Részleg (L1)'].forEach(c => {
                window.createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
                window.createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="C32"></td><td><input type="text" class="meas-loc" value="Csatlakozó"></td><td><input type="number" step="0.01" class="meas-zs" value="0.25"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            });
            window.createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Dugaljak ÁVK (3F)"></td><td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="19"></td><td><input type="number" step="1" class="meas-t5" value="12"></td><td><input type="number" step="0.1" class="meas-ramp" value="25.5"></td><td><input type="number" step="0.1" class="meas-uc" value="1.2"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            window.createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Tűzvédelmi Főkapcsoló (TFK)"></td><td><select class="meas-type"><option selected>AC</option><option>A</option><option>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="300"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="30"></td><td><input type="number" step="1" class="meas-t5" value="18"></td><td><input type="number" step="0.1" class="meas-ramp" value="270"></td><td><input type="number" step="0.1" class="meas-uc" value="2.3"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        }
        else if (tpl === 'TPL_RESTAURANT') {
            document.getElementById('buildingPurpose').value = 'Étterem / Konyha';
            document.getElementById('docType').value = 'VBF_IDOSZAKOS';
            ['Ipari Sütő (3F)', 'Hűtőkamra', 'Mosogatógép', 'Elszívó Rendszer', 'Vendégtér Világítás'].forEach(c => {
                window.createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="number" step="0.1" class="meas-ln" value="500"></td><td><input type="number" step="0.1" class="meas-lpe" value="500"></td><td><input type="number" step="0.1" class="meas-npe" value="500"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
                window.createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${c}"></td><td><input type="text" class="meas-device" value="C20"></td><td><input type="text" class="meas-loc" value="Bekötés"></td><td><input type="number" step="0.01" class="meas-zs" value="0.55"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            });
            window.createRow('table-rcd', `<td><input type="text" class="meas-circ" value="Konyha ÁVK"></td><td><select class="meas-type"><option>AC</option><option>A</option><option selected>B</option><option>F</option></select></td><td><input type="number" class="meas-idn" value="30"></td><td><select class="meas-05"><option selected>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="17"></td><td><input type="number" step="1" class="meas-t5" value="11"></td><td><input type="number" step="0.1" class="meas-ramp" value="23.5"></td><td><input type="number" step="0.1" class="meas-uc" value="1.6"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        }
        else if (tpl === 'TPL_EPH_BOILER') {
            document.getElementById('buildingPurpose').value = 'Gázkazán telepítés';
            document.getElementById('docType').value = 'EPH';
            window.createRow('table-rpe', `<td><input type="number" class="meas-point" value="1"></td><td><input type="text" class="meas-loc" value="EPH -> Gázcső Bekötés"></td><td><input type="number" step="0.01" class="meas-val" value="0.03"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            window.createRow('table-rpe', `<td><input type="number" class="meas-point" value="2"></td><td><input type="text" class="meas-loc" value="EPH -> Fűtés Előremenő"></td><td><input type="number" step="0.01" class="meas-val" value="0.03"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            window.createRow('table-rpe', `<td><input type="number" class="meas-point" value="3"></td><td><input type="text" class="meas-loc" value="EPH -> Fűtés Visszatérő"></td><td><input type="number" step="0.01" class="meas-val" value="0.03"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            window.createRow('table-rpe', `<td><input type="number" class="meas-point" value="4"></td><td><input type="text" class="meas-loc" value="EPH -> HMV (Melegvíz)"></td><td><input type="number" step="0.01" class="meas-val" value="0.04"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
            window.createRow('table-rpe', `<td><input type="number" class="meas-point" value="5"></td><td><input type="text" class="meas-loc" value="EPH -> Kazán Test"></td><td><input type="number" step="0.01" class="meas-val" value="0.02"></td><td><select class="meas-pass"><option selected>Igen</option><option>Nem</option></select></td>`);
        }
        else if (tpl.startsWith('CUSTOM_')) {
            let customTpls = JSON.parse(localStorage.getItem('vbf_custom_templates') || '[]');
            const savedTpl = customTpls.find(t => t.id === tpl);
            if (savedTpl) {
                if (savedTpl.buildingPurpose) document.getElementById('buildingPurpose').value = savedTpl.buildingPurpose;
                if (savedTpl.docType) document.getElementById('docType').value = savedTpl.docType;

                const m = savedTpl.measurements;
                if (m.rpe) m.rpe.forEach(r => window.createRow('table-rpe', `<td><input type="number" class="meas-point" value="${r.point || ''}"></td><td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="number" step="0.01" class="meas-val" value="${r.val || ''}" oninput="validateRpe(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
                if (m.insulation) m.insulation.forEach(r => window.createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${r.circuit || ''}"></td><td><input type="number" step="0.1" class="meas-ln" value="${r.ln || ''}" oninput="validateIns(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-lpe" value="${r.lpe || ''}" oninput="validateIns(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-npe" value="${r.npe || ''}" oninput="validateIns(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
                if (m.loop) m.loop.forEach(r => window.createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${r.circuit || ''}"></td><td><input type="text" class="meas-device" value="${r.device || ''}" oninput="validateZs(this.closest('tr'))"></td><td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="number" step="0.01" class="meas-zs" value="${r.zs || ''}" oninput="validateZs(this.closest('tr'))"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
                if (m.rcd) m.rcd.forEach(r => window.createRow('table-rcd', `<td><input type="text" class="meas-circ" value="${r.circ || ''}"></td><td><select class="meas-type"><option ${r.type === 'AC' ? 'selected' : ''}>AC</option><option ${r.type === 'A' ? 'selected' : ''}>A</option><option ${r.type === 'B' ? 'selected' : ''}>B</option><option ${r.type === 'F' ? 'selected' : ''}>F</option></select></td><td><input type="number" class="meas-idn" value="${r.idn || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><select class="meas-05"><option ${r.test05 === 'OK (Nem oldott)' ? 'selected' : ''}>OK (Nem oldott)</option><option ${r.test05 === 'HIBA (Kioldott)' ? 'selected' : ''}>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="${r.t1 || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="1" class="meas-t5" value="${r.t5 || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-ramp" value="${r.ramp || ''}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-uc" value="${r.uc || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
                if (m.tools) m.tools.forEach(r => window.createRow('table-tools', `<td><input type="text" class="meas-name" value="${r.name || ''}"></td><td><input type="text" class="meas-id" value="${r.id || ''}"></td><td><input type="number" step="0.1" class="meas-val" value="${r.val || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
                if (m.selv) m.selv.forEach(r => window.createRow('table-selv', `<td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="number" step="0.1" class="meas-v" value="${r.v || ''}"></td><td><input type="number" step="1" class="meas-ps" value="${r.ps || ''}"></td><td><input type="number" step="1" class="meas-pt" value="${r.pt || ''}"></td><td><input type="number" step="1" class="meas-st" value="${r.st || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
                if (m.eph_cont) m.eph_cont.forEach(r => window.createRow('table-eph', `<td><input type="number" class="meas-index" value="${r.idx || ''}"></td><td><input type="text" class="meas-elem" value="${r.elem || ''}"></td><td><input type="text" class="meas-loc" value="${r.loc || ''}"></td><td><input type="text" class="meas-mat" value="${r.mat || ''}"></td><td><select class="meas-conn"><option ${r.conn === 'EPH bilincs' ? 'selected' : ''}>EPH bilincs</option><option ${r.conn === 'Szemes saru' ? 'selected' : ''}>Szemes saru</option><option ${r.conn === 'Hegesztett' ? 'selected' : ''}>Hegesztett</option><option ${r.conn === 'Wago/Sorkapocs' ? 'selected' : ''}>Wago/Sorkapocs</option></select></td><td><input type="number" step="0.01" class="meas-val" value="${r.val || ''}"></td><td><select class="meas-pass"><option ${r.pass === 'Igen' ? 'selected' : ''}>Igen</option><option ${r.pass === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`));
            }
        }

        alert("Sablon Mérések Sikeresen Betöltve! ✅");
        e.target.value = "";
    });

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
}
