export function initReports() {
    // --- GLOBÁLIS SEGÉDVÁLTOZÓK ---
    window.currentToken = localStorage.getItem('vbf_token');
    window.currentUser = localStorage.getItem('vbf_user');
    window.currentSavedReportId = window.currentSavedReportId || null;

    window.updateHeaderReportContext = function (title, status) {
        const el = document.getElementById('headerReportContext');
        const titleEl = el?.querySelector('.nav-context-title');
        const chipEl = document.getElementById('headerReportContextChip');
        if (!el || !titleEl) return;
        const displayTitle = (title && title.trim()) ? title.trim() : 'Nincs megnyitott jegyzőkönyv';
        titleEl.textContent = displayTitle;
        if (chipEl) {
            if (status === 'saved') {
                chipEl.textContent = 'Mentve';
                chipEl.classList.remove('modified');
                chipEl.classList.remove('is-hidden');
            } else if (status === 'modified') {
                chipEl.textContent = 'Módosítva';
                chipEl.classList.add('modified');
                chipEl.classList.remove('is-hidden');
            } else {
                chipEl.classList.add('is-hidden');
            }
        }
    };

    const btnSaveCloud = document.getElementById('btnSaveCloud');
    const btnExportWord = document.getElementById('btnExportWord');
    const btnExportPdfReport = document.getElementById('btnExportPdfReport');
    const btnEmailReport = document.getElementById('btnEmailReport');
    const docTypeSelect = document.getElementById('docType');
    const vbfMeasurements = document.getElementById('vbf-measurements');
    const ephMeasurements = document.getElementById('eph-measurements');

    if (btnEmailReport) {
        btnEmailReport.addEventListener('click', () => {
            if (window.currentSavedReportId) {
                window.sendEmailReport(window.currentSavedReportId);
            } else {
                alert('Előbb menteni / betölteni kell egy jegyzőkönyvet a felhőből!');
            }
        });
    }

    // DocType változás figyelése (EPH szekció)
    if (docTypeSelect && vbfMeasurements && ephMeasurements) {
        const applyDocTypeVisibility = (value) => {
            if (value === 'EPH') {
                if (vbfMeasurements) vbfMeasurements.classList.add('is-hidden');
                if (ephMeasurements) ephMeasurements.classList.remove('is-hidden');
            } else {
                if (vbfMeasurements) vbfMeasurements.classList.remove('is-hidden');
                if (ephMeasurements) ephMeasurements.classList.add('is-hidden');
            }
        };

        // Induláskor is alkalmazzuk az aktuális értéket
        applyDocTypeVisibility(docTypeSelect.value);

        docTypeSelect.addEventListener('change', (e) => {
            applyDocTypeVisibility(e.target.value);
            calculateNextInspectionDate_UI();
        });
    }

    document.getElementById('buildingOtsz')?.addEventListener('change', calculateNextInspectionDate_UI);

    function calculateNextInspectionDate_UI() {
        const otszClass = document.getElementById('buildingOtsz')?.value;
        const docType = document.getElementById('docType')?.value;
        if (!otszClass || !docType) return;
        
        let yearsUntilNext = 6;
        if (docType === 'VVF' || docType === 'VÁK') { // Villámvédelem
            switch (otszClass) {
                case 'AK': yearsUntilNext = 6; break;
                case 'KK': yearsUntilNext = 3; break;
                case 'MK': yearsUntilNext = 1; break;
            }
        } else if (docType.startsWith('VBF')) { // Érintésvédelem
            switch (otszClass) {
                case 'MK': yearsUntilNext = 3; break;
                case 'KK': yearsUntilNext = 3; break;
                case 'AK': yearsUntilNext = 6; break;
            }
        } else if (docType === 'EPH') {
            yearsUntilNext = 3; 
        }

        const now = new Date();
        now.setFullYear(now.getFullYear() + yearsUntilNext);
        const nextDateStr = now.toISOString().split('T')[0];
        
        const nextDateField = document.getElementById('nextInspectionDate');
        if (nextDateField) nextDateField.value = nextDateStr;
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

    // QR MODAL LOGIC
    const qrModal = document.getElementById('qrModal');
    const btnScanQr = document.getElementById('btnScanQr');
    const btnCloseQr = document.getElementById('btnCloseQr');
    const btnSubmitManualQr = document.getElementById('btnSubmitManualQr');
    const manualQrId = document.getElementById('manualQrId');
    let html5QrcodeScanner = null;

    btnScanQr?.addEventListener('click', () => {
        qrModal.classList.remove('is-hidden');
        if (!html5QrcodeScanner && window.Html5QrcodeScanner) {
            html5QrcodeScanner = new Html5QrcodeScanner(
                "qrReaderPlaceholder",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                false
            );
            html5QrcodeScanner.render((decodedText) => {
                const numericId = decodedText.replace(/[^0-9]/g, '');
                if (numericId) {
                    window.loadReport(numericId);
                    closeQrScanner();
                }
            }, () => { });
        }
    });

    function closeQrScanner() {
        qrModal.classList.add('is-hidden');
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
        if (!window.currentSavedReportId) return alert('Előbb mentsd el a jegyzőkönyvet!');
        if (!confirm('Biztosan véglegesíted? Ezután a módosítás már nem lehetséges!')) return;

        try {
            const res = await fetch(`${window.API_BASE_URL}/api/reports/${window.currentSavedReportId}/finalize`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (res.ok) {
                if (window.showToast) window.showToast('Jegyzőkönyv véglegesítve! (LOCKED)', 'success'); else alert('Jegyzőkönyv véglegesítve! (LOCKED)');
                window.loadReport(window.currentSavedReportId); // Reload to lock UI
            } else {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Hiba a véglegesítés során! Kérlek ellenőrizd az űrlapot.');
            }
        } catch (err) {
            if (window.showToast) window.showToast(err.message, 'error'); else alert(err.message);
        }
    });

    function formatDocId(typeStr, id, dateStr) {
        if (!id) return "ÚJ";
        const t = (typeStr || "VBF").toUpperCase();
        const shortT = t === "EPH" ? "EPH" : "VBF";
        const d = dateStr ? new Date(dateStr) : new Date();
        const y = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
        const padId = String(id).padStart(3, '0');
        return `${shortT}-${y}-${padId}`;
    }

    function renderReportCards(reports, container) {
        if (!container) return;
        container.innerHTML = '';
        if (!reports || reports.length === 0) {
            container.innerHTML = '<p>Még nincs elmentett jegyzőkönyved.</p>';
            return;
        }
        const myId = window._currentUserId || (window.currentUserData && window.currentUserData.id);
        reports.forEach(rep => {
            const docId = formatDocId(rep.report_type, rep.id, rep.created_at);
            const isOwn = !myId || rep.owner_id === myId;
            const isShared = !isOwn && rep.company_shared;
            const sharedBadge = isShared
                ? `<span class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.7rem] font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30"><svg width='10' height='10' viewBox='0 0 20 20' fill='currentColor'><path d='M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm5 9a5 5 0 0 0-10 0h10zm-15 0a5 5 0 0 0 6.5-4.75A5 5 0 0 0 3 10a5 5 0 0 0 0 5z'/></svg> Megosztott</span>` : '';
            const card = document.createElement('div');
            card.className = 'report-card panel-glass';
            const deleteBtn = isOwn || (window.currentUser && ['COMPANY_ADMIN','ADMIN','SUPER_ADMIN'].includes(window.currentUser.role))
                ? `<button class="btn btn-danger btn-small" onclick="deleteReport(${rep.id})">Törlés</button>` : '';
            card.innerHTML = `
                <h4>[${docId}] ${rep.title} ${sharedBadge}</h4>
                <p class="meta">Típus: ${rep.report_type.toUpperCase()}<br>Létrehozva: ${new Date(rep.created_at).toLocaleDateString()}</p>
                <div class="actions">
                    <button class="btn btn-primary btn-small" onclick="loadReport(${rep.id})">Betöltés</button>
                    <button class="btn btn-secondary btn-small" onclick="cloneReport(${rep.id})">Másolás</button>
                    <button class="btn btn-primary btn-small" onclick="sendEmailReport(${rep.id})">E-mail küldése</button>
                    ${deleteBtn}
                </div>
            `;
            container.appendChild(card);
        });
    }

    window.fetchReports = async function () {
        const reportListContainer = document.getElementById('reportListContainer');
        const searchInput = document.getElementById('reportSearchInput');
        const searchHint = document.getElementById('reportSearchHint');
        if (!reportListContainer || !window.currentToken) {
            if (reportListContainer) reportListContainer.innerHTML = '';
            if (searchInput) searchInput.classList.add('is-hidden');
            return;
        }
        if (searchInput) searchInput.classList.remove('is-hidden');
        reportListContainer.innerHTML = '<p>Betöltés...</p>';

        try {
            const res = await fetch(`${window.API_BASE_URL}/api/reports`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            const reports = await res.json();
            window._reportListCache = reports || [];

            const q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
            const filtered = q
                ? window._reportListCache.filter(rep => {
                    const title = (rep.title || '').toLowerCase();
                    const cust = (rep.client_data && rep.client_data.customerName || '').toLowerCase();
                    const addr = (rep.client_data && rep.client_data.siteAddress || '').toLowerCase();
                    return title.includes(q) || cust.includes(q) || addr.includes(q);
                })
                : window._reportListCache;

            renderReportCards(filtered, reportListContainer);
            if (searchHint) searchHint.textContent = filtered.length < (window._reportListCache.length)
                ? `${filtered.length} / ${window._reportListCache.length} találat` : '';
        } catch (err) {
            reportListContainer.innerHTML = '<p style="color:red">Hiba a betöltés során.</p>';
        }
    };

    const reportSearchInput = document.getElementById('reportSearchInput');
    if (reportSearchInput) {
        reportSearchInput.addEventListener('input', () => {
            if (!window._reportListCache) return;
            const q = reportSearchInput.value.trim().toLowerCase();
            const filtered = q
                ? window._reportListCache.filter(rep => {
                    const title = (rep.title || '').toLowerCase();
                    const cust = (rep.client_data && rep.client_data.customerName || '').toLowerCase();
                    const addr = (rep.client_data && rep.client_data.siteAddress || '').toLowerCase();
                    return title.includes(q) || cust.includes(q) || addr.includes(q);
                })
                : window._reportListCache;
            const container = document.getElementById('reportListContainer');
            renderReportCards(filtered, container);
            const searchHint = document.getElementById('reportSearchHint');
            if (searchHint) searchHint.textContent = filtered.length < window._reportListCache.length ? `${filtered.length} / ${window._reportListCache.length} találat` : '';
        });
    }

    function validateReportBeforeSave() {
        const errors = [];
        const warnings = [];
        const docType = document.getElementById('docType')?.value || '';
        const isVBF = docType.startsWith('VBF_');

        if (isVBF) {
            const insulationRows = document.querySelectorAll('#table-insulation tbody tr');
            if (insulationRows.length === 0) {
                errors.push('⚠️ KÖTELEZŐ SZIGETELÉSMÉRÉS (Riso) HIÁNYZIK!\nAz MSZ HD 60364-6 szerint kötelező mérni minden áramkör\nszigetelési ellenállását (Riso ≥ 1 MΩ, 500V DC mérőfesz.)\naz aktív vezetők és a föld között.\nA jegyzőkönyv NEM zárható le ezen adatsor kitöltése nélkül!');
            }
            const loopRows = document.querySelectorAll('#table-loop tbody tr');
            if (loopRows.length === 0) {
                errors.push('⚠️ KÖTELEZŐ HUROKELLENÁLLÁS (Zs) MÉRÉS HIÁNYZIK!\nAz MSZ HD 60364-6 szerint kötelező mérni a hurokellenállást\na védőeszközök (kismegszakítók) kioldási feltételeinek igazolására.\nKéplet: Zs ≤ (U₀ × 0.95) / Ia');
            }
        }

        const instrumentType = document.getElementById('instrumentType')?.value?.trim() || '';
        const instrumentCal = document.getElementById('instrumentCal')?.value?.trim() || '';
        if (!instrumentType) {
            errors.push('🔧 MÉRŐMŰSZER TÍPUSA ÉS GYÁRI SZÁMA HIÁNYZIK!\nBírósági eljárásban a műszer típusa és gyári száma nélkül\naz okirat hiteltelen. Pl.: "Metrel MI 3152, SN:21070123"');
        } else if (!instrumentType.match(/\d/)) {
            warnings.push('🔧 A mérőműszer adatainál nem található gyári szám (szám karakter).');
        }

        if (instrumentCal) {
            const calDate = new Date(instrumentCal);
            const now = new Date();
            if (calDate < now) {
                errors.push(`📅 KALIBRÁLÁS LEJÁRT!\nA megadott kalibrálási dátum (${instrumentCal}) a múltban van.\nLejárt kalibrálású műszerrel végzett mérés érvénytelen.\nA jegyzőkönyvben NEM adható "Megfelelő" minősítés!`);
            }
        } else {
            warnings.push('📅 A műszer kalibrálási érvényessége nincs kitöltve!');
        }

        const buildingPurpose = document.getElementById('buildingPurpose')?.value?.trim() || '';
        const buildingOtsz = document.getElementById('buildingOtsz')?.value || '';
        if (isVBF && !buildingPurpose) warnings.push('🏢 Az "Épület Rendeltetése" mező üres — ez határozza meg a következő felülvizsgálat dátumát.');
        if (isVBF && !buildingOtsz) warnings.push('🏗️ OTSZ kockázati osztály (AK/KK/MK) nincs kiválasztva — jogilag ez határozza meg a kötelező felülvizsgálati időközöket.');

        const inspectorName = document.getElementById('inspectorName')?.value?.trim() || '';
        const inspectorLicense = document.getElementById('inspectorLicense')?.value?.trim() || '';
        if (!inspectorName) warnings.push('👨‍🔧 A felülvizsgáló neve/cégneve nincs megadva.');
        if (!inspectorLicense) warnings.push('📜 A vizsgabizonyítvány száma nincs megadva.');

        return { valid: errors.length === 0, errors, warnings };
    }

    function autoDetectQualification() {
        let hasAnyDefect = false;
        let hasCriticalDefect = false;
        let hasSeriousDefect = false;
        let hasMaintenanceDefect = false;
        let hasRenovationDefect = false;

        const defectCards = document.querySelectorAll('#defectList [data-vbf-defect-card]');
        if (defectCards.length > 0) {
            hasAnyDefect = true;
            defectCards.forEach(card => {
                const desc = (card.querySelector('.desc-input')?.value || '').toLowerCase();
                const criticalA = ['életveszély', 'érintésvéd', 'pe vezető hiány', 'áramütés', 'halál', 'tűzveszély', 'védővezető hiány', 'felületen feszültség', 'nincsen pe', 'test feszültség', 'védőföldelés hiány', 'nincs földelés', 'beégett', 'ívhiba', 'érinthető feszültség', 'leolvadt', 'kiégett'];
                if (criticalA.some(kw => desc.includes(kw))) { hasCriticalDefect = true; return; }

                const seriousB = ['szigetelés sérült', 'rcd nem', 'ávk nem', 'fi-relé nem', 'kioldási idő', 'hurokellenállás', 'keresztmetszet nem', 'túlterhelés', 'zárlat', 'védővezető folytonosság', 'rpe nem', 'hurokimpedancia', 'nem old ki', 'olvadóbiztosító hiány', 'érintésvédelmi osztály'];
                if (seriousB.some(kw => desc.includes(kw))) { hasSeriousDefect = true; return; }

                const maintenanceC = ['dobozfedél', 'fedél hiány', 'csatlakozó laza', 'felirat hiány', 'jelölés hiány', 'kötés laza', 'sorkapocs', 'takarólemez', 'burkolat sérült', 'por', 'tisztítás', 'kopott'];
                if (maintenanceC.some(kw => desc.includes(kw))) { hasMaintenanceDefect = true; return; }

                const renovationD = ['vezetékszínezés', 'régi szabvány', 'elavult', 'korszerűtlen', 'alumínium vezető', 'régi típus', 'nem szabványos szín', 'téves színezés', 'nullázás'];
                if (renovationD.some(kw => desc.includes(kw))) { hasRenovationDefect = true; return; }

                hasMaintenanceDefect = true;
            });
        }

        document.querySelectorAll('#table-rpe tbody tr').forEach(tr => {
            const val = parseFloat(tr.querySelector('.meas-val')?.value);
            if (!isNaN(val) && val > 1.0) { hasAnyDefect = true; hasSeriousDefect = true; }
        });

        document.querySelectorAll('#table-insulation tbody tr').forEach(tr => {
            const ln = parseFloat(tr.querySelector('.meas-ln')?.value);
            const lpe = parseFloat(tr.querySelector('.meas-lpe')?.value);
            const npe = parseFloat(tr.querySelector('.meas-npe')?.value);
            if ((!isNaN(ln) && ln < 1) || (!isNaN(lpe) && lpe < 1) || (!isNaN(npe) && npe < 1)) { hasAnyDefect = true; hasSeriousDefect = true; }
        });

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
            if (Ia > 0 && zsVal > ((230 * 0.95) / Ia)) { hasAnyDefect = true; hasSeriousDefect = true; }
        });

        document.querySelectorAll('#table-rcd tbody tr').forEach(tr => {
            const t1 = parseFloat(tr.querySelector('.meas-t1')?.value);
            if (!isNaN(t1) && t1 > 300) { hasAnyDefect = true; hasCriticalDefect = true; }
            if (tr.querySelector('.meas-pass')?.value === 'Nem') { hasAnyDefect = true; hasSeriousDefect = true; }
        });

        document.querySelectorAll('.data-table .meas-pass').forEach(sel => {
            if (sel.value === 'Nem') { hasAnyDefect = true; hasSeriousDefect = true; }
        });

        if (hasCriticalDefect) return 'NEM MEGFELELŐ';
        if (hasSeriousDefect) return 'VÁLTOZAT_B';
        if (hasMaintenanceDefect) return 'VÁLTOZAT_C';
        if (hasRenovationDefect) return 'VÁLTOZAT_C';
        if (hasAnyDefect) return 'VÁLTOZAT_C';
        return 'MEGFELELŐ';
    }



    function buildReportPayload() {
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
            ephEarthNotMeasurable: document.getElementById('ephEarthNotMeasurable')?.checked || false,
            ephConductor: document.getElementById('ephConductor')?.value || '',
            ephDeclaration: document.getElementById('ephDeclaration')?.checked || false,
            envTemp: document.getElementById('envTemp')?.value || '',
            envHumidity: document.getElementById('envHumidity')?.value || '',
            appliedStandards: document.getElementById('appliedStandards')?.value?.trim() || 'MSZ HD 60364-6:2017, 40/2017. (XII. 4.) NGM rendelet, 27/2020. (XII. 21.) ITM rendelet',
            inspectionLimits: document.getElementById('inspectionLimits')?.value?.trim() || '',
            instrumentError: document.getElementById('instrumentError')?.value?.trim() || '',
            pvDcSwitch: document.getElementById('pvDcSwitch')?.value || 'Nem releváns',
            pvDcLocation: document.getElementById('pvDcLocation')?.value || '',
            evRcdType: document.getElementById('evRcdType')?.value || 'Nem releváns',
            evNote: document.getElementById('evNote')?.value || '',
            spdType: document.getElementById('spdType')?.value || 'Nem releváns',
            spdStatus: document.getElementById('spdStatus')?.value || 'Nincs / Nem ellenőrizhető',
            afddStatus: document.getElementById('afddStatus')?.value || 'Nem releváns',
            afddNote: document.getElementById('afddNote')?.value || '',
            visualChecks: {
                id_marks: document.getElementById('check_id_marks')?.checked || false,
                protection: document.getElementById('check_protection')?.checked || false,
                fire: document.getElementById('check_fire')?.checked || false,
                conduction: document.getElementById('check_conduction')?.checked || false,
                connection: document.getElementById('check_connection')?.checked || false,
                access: document.getElementById('check_access')?.checked || false
            },
            buildingOtsz: document.getElementById('buildingOtsz')?.value || '',
            standardReference: 'TvMI 7.7:2026.02.01',
            autoQualification: document.getElementById('reportResult')?.value || '',
            nextInspectionDate: document.getElementById('nextInspectionDate')?.value || '',
            siteTree: (window.VBF && window.VBF.siteTree) ? window.VBF.siteTree.toJSON() : []
        };

        // Bejövő hálózati paraméterek
        const incomingPhases = {
            l1: document.getElementById('inPhaseL1')?.value || '',
            l2: document.getElementById('inPhaseL2')?.value || '',
            l3: document.getElementById('inPhaseL3')?.value || '',
            systemType: document.getElementById('inSystemType')?.value || '',
            phaseCount: document.getElementById('inPhaseCount')?.value || '3',
            mainFuse: document.getElementById('inMainFuse')?.value || '',
            mainFuseType: document.getElementById('inMainFuseType')?.value || '',
            note: document.getElementById('inPhaseNote')?.value || ''
        };

        const canvasJson = window.canvas ? window.canvas.toJSON(['vbfData']) : null;
        let diagramImage = null;
        if (window.canvas && window.canvas.getObjects().length > 0) {
            try {
                diagramImage = window.canvas.toDataURL({ format: 'jpeg', quality: 0.85, multiplier: 1.2 });
            } catch (_) {}
            if (!diagramImage) diagramImage = window.canvas.toDataURL({ format: 'png', multiplier: 1 });
        }

        // Alaprajz kép (canvas background) kinyerése
        let floorPlanImage = null;
        const bgObj = window.canvas && window.canvas.backgroundImage;
        if (bgObj && typeof bgObj.toDataURL === 'function') {
            try { floorPlanImage = bgObj.toDataURL({ format: 'jpeg', quality: 0.85 }); } catch (_) {}
        }

        const defectsArr = [];
        document.querySelectorAll('#defectList [data-vbf-defect-card]').forEach(card => {
            defectsArr.push({
                templateId: card.querySelector('.tpl-select')?.value || '',
                description: card.querySelector('.desc-input')?.value || '',
                deadline: card.querySelector('.deadline-input')?.value || '',
                standard: card.querySelector('.standard-input')?.value || '',
                location: card.querySelector('.loc-input')?.value || '',
                photo: card.getAttribute('data-photo') || ''
            });
        });

        // Összegyűjti a csatolt megjegyzés képeket
        const notePhotos = (window._notePhotos || []).map(p => p.data);

        return {
            title: `${clientDataObj.type} - ${clientDataObj.siteAddress || 'Új Jegyzőkönyv'}`,
            report_type: (clientDataObj.type || 'vbf').toLowerCase(),
            client_data: clientDataObj,
            diagram_data: canvasJson,
            diagram_image: diagramImage,
            floor_plan_image: floorPlanImage,
            defects_data: defectsArr,
            measurements_data: [(window.VBF && window.VBF.measurements) ? window.VBF.measurements.collectAll() : {}],
            incoming_phases: incomingPhases,
            company_shared: document.getElementById('chkCompanyShared') ? document.getElementById('chkCompanyShared').checked : true,
            notes: document.getElementById('reportNotes')?.value?.trim() || '',
            inspector_notes: document.getElementById('inspectorNotes')?.value?.trim() || '',
            note_photos: notePhotos
        };
    }

    async function compressReportPayloadImages(payload) {
        const compress = window.VBF_compressImage;
        if (!compress) return payload;
        if (payload.diagram_image) {
            payload.diagram_image = await compress(payload.diagram_image, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
        }
        if (payload.defects_data) {
            for (const d of payload.defects_data) {
                if (d.photo && d.photo.startsWith('data:image')) {
                    d.photo = await compress(d.photo, { maxWidth: 720, quality: 0.6 });
                }
            }
        }
        const m0 = payload.measurements_data && payload.measurements_data[0];
        if (m0) {
            const photoKeys = ['rpe', 'insulation', 'loop', 'rcd', 'tools', 'selv', 'eph'];
            for (const key of photoKeys) {
                const arr = m0[key];
                if (Array.isArray(arr)) {
                    for (const row of arr) {
                        if (row.photo && row.photo.startsWith('data:image')) {
                            row.photo = await compress(row.photo, { maxWidth: 720, quality: 0.6 });
                        }
                    }
                }
            }
        }
        if (payload.note_photos && payload.note_photos.length > 0) {
            for (let i = 0; i < payload.note_photos.length; i++) {
                if (payload.note_photos[i] && payload.note_photos[i].startsWith('data:image')) {
                    payload.note_photos[i] = await compress(payload.note_photos[i], { maxWidth: 800, quality: 0.7 });
                }
            }
        }
        return payload;
    }

    async function saveReportToCloud(silent = false) {
        if (!window.currentToken) {
            if (!silent) alert('Előbb jelentkezz be!');
            return false;
        }

        const validation = validateReportBeforeSave();
        if (!validation.valid) {
            if (!silent) alert('🛑 A JEGYZŐKÖNYV NEM MENTHETŐ!\n\nAz alábbi kötelező feltételek nem teljesülnek:\n\n' + validation.errors.join('\n\n'));
            return false;
        }

        if (!silent && validation.warnings.length > 0) {
            if (!confirm('⚠️ Figyelmeztetések:\n\n' + validation.warnings.join('\n\n') + '\n\nFolytatod a mentést a hiányosságok ellenére?')) return false;
        }

        const autoQualification = autoDetectQualification();
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
            if (confirm(`🔄 Automatikus minősítő irat javaslat\n\nKiválasztott: ${currentName}\nJavasolt: ${autoName}\nÁtváltasz a javaslatra?`)) {
                document.getElementById('reportResult').value = autoQualification;
            }
        }

        if (btnSaveCloud) {
            btnSaveCloud.innerText = 'Mentés...';
            btnSaveCloud.disabled = true;
        }

        try {
            let payload = buildReportPayload();
            payload = await compressReportPayloadImages(payload);
            const isUpdate = !!window.currentSavedReportId;
            const reqMethod = isUpdate ? 'PUT' : 'POST';
            const reqUrl = isUpdate ? `${window.API_BASE_URL}/api/reports/${window.currentSavedReportId}` : `${window.API_BASE_URL}/api/reports`;

            if (!navigator.onLine) {
                if (btnSaveCloud) btnSaveCloud.innerText = 'Mentés Offline...';
                let offlineQueue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');
                payload._offline_id = Date.now();
                payload._method = reqMethod;
                payload._endpoint = isUpdate ? `/api/reports/${window.currentSavedReportId}` : `/api/reports`;
                offlineQueue.push(payload);
                localStorage.setItem('vbf_offline_queue', JSON.stringify(offlineQueue));
                if (!silent) window.showToast ? window.showToast('Kapcsolat megszakadt, mentve offline tárolóba.') : alert('Offline mentve!');
                return true;
            }

            const res = await fetch(reqUrl, {
                method: reqMethod,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.currentToken}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                window.currentSavedReportId = data.id;
                try {
                    localStorage.setItem('vbf_last_report_id', String(data.id));
                    localStorage.removeItem('vbf_draft');
                } catch (_) {}
                const savedTitle = document.getElementById('documentTitle')?.value?.trim() || data.title || 'Jegyzőkönyv';
                if (window.updateHeaderReportContext) window.updateHeaderReportContext(savedTitle, 'saved');
                if (!silent && window.showToast) window.showToast('✅ Jegyzőkönyv sikeresen mentve a felhőbe!');
                if (btnExportWord) btnExportWord.classList.remove('is-hidden');
                if (btnExportPdfReport) btnExportPdfReport.classList.remove('is-hidden');
                if (btnEmailReport) btnEmailReport.classList.remove('is-hidden');
                window.showReportQr(data.id);
                window.fetchReports();
                return true;
            } else {
                throw new Error(data.detail || 'Hiba a mentés során');
            }
        } catch (err) {
            if (!silent && window.showToast) window.showToast('Hiba történt: ' + err.message, 'error'); else if (!silent) alert('Hiba történt: ' + err.message);
            return false;
        } finally {
            if (btnSaveCloud) {
                btnSaveCloud.innerText = 'Mentés ☁️';
                btnSaveCloud.disabled = false;
            }
        }
    }

    if (btnSaveCloud) btnSaveCloud.addEventListener('click', () => saveReportToCloud(false));

    if (btnExportWord) btnExportWord.addEventListener('click', async () => {
        const saved = await saveReportToCloud(true);
        if (!saved) return alert('Hiba automatikus mentés során.');
        if (!window.currentSavedReportId || !window.currentToken) return alert('Előbb mentsd el a jegyzőkönyvet.');
        btnExportWord.innerText = 'Generálás...';
        btnExportWord.disabled = true;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/reports/${window.currentSavedReportId}/export/docx`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (!res.ok) throw new Error('Hiba a Word generálás során!');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            let filename = 'VBF_Jegyzokonyv.docx';
            const disp = res.headers.get('Content-Disposition');
            if (disp && disp.indexOf('filename=') !== -1) filename = disp.split('filename=')[1].replace(/"/g, '');
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) { if (window.showToast) window.showToast(err.message, 'error'); else alert(err.message); }
        finally { btnExportWord.innerText = 'Word Generálás 📄'; btnExportWord.disabled = false; }
    });

    if (btnExportPdfReport) btnExportPdfReport.addEventListener('click', async () => {
        const saved = await saveReportToCloud(true);
        if (!saved) return alert('Hiba automatikus mentés során.');
        if (!window.currentSavedReportId || !window.currentToken) return alert('Előbb mentsd el a jegyzőkönyvet.');
        btnExportPdfReport.innerText = 'Generálás...';
        btnExportPdfReport.disabled = true;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/reports/${window.currentSavedReportId}/export/pdf`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (!res.ok) throw new Error('Hiba a PDF generálás során!');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            let filename = 'VBF_Jegyzokonyv.pdf';
            const disp = res.headers.get('Content-Disposition');
            if (disp && disp.indexOf('filename=') !== -1) filename = disp.split('filename=')[1].replace(/"/g, '');
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) { if (window.showToast) window.showToast(err.message, 'error'); else alert(err.message); }
        finally { btnExportPdfReport.innerText = 'PDF aláírva'; btnExportPdfReport.disabled = false; }
    });

    window.applyPhotoToLastRow = function (tableId, photo) {
        if (!photo) return;
        const tbody = document.querySelector(`#${tableId} tbody`);
        if (!tbody || !tbody.lastElementChild) return;
        const tr = tbody.lastElementChild;
        tr.setAttribute('data-photo', photo);
        const input = tr.querySelector('input[type="file"]');
        if (input) {
            const wrap = input.parentElement;
            if (wrap) {
                wrap.classList.add('vbf-meas-photo-label--filled');
                wrap.title = 'Kép betöltve!';
            }
        }
    };

    window.loadReportIntoUI = function (rep) {
        const existingQr = document.getElementById('qr-container');
        if (existingQr) existingQr.remove();

        document.getElementById('documentTitle') && (document.getElementById('documentTitle').value = rep.title || '');
        document.getElementById('docType') && (document.getElementById('docType').value = rep.report_type.toUpperCase() || 'VBF');
        // Notes (belső megjegyzés)
        const notesEl = document.getElementById('reportNotes');
        if (notesEl) notesEl.value = rep.notes || '';
        // Felülvizsgálói megjegyzés
        const inspNotesEl = document.getElementById('inspectorNotes');
        if (inspNotesEl) inspNotesEl.value = rep.inspector_notes || '';
        // Megjegyzés képek visszatöltése
        window._notePhotos = [];
        if (rep.note_photos && Array.isArray(rep.note_photos)) {
            rep.note_photos.forEach(dataUrl => addNotePhotoPreview(dataUrl));
        }
        // Bejövő fázisok visszatöltése
        const ip = rep.incoming_phases || {};
        const ipIds = ['inPhaseL1','inPhaseL2','inPhaseL3','inSystemType','inPhaseCount','inMainFuse','inMainFuseType','inPhaseNote'];
        const ipKeys = ['l1','l2','l3','systemType','phaseCount','mainFuse','mainFuseType','note'];
        ipIds.forEach((id, i) => { const el = document.getElementById(id); if (el) el.value = ip[ipKeys[i]] || (id === 'inPhaseCount' ? '3' : ''); });

        const c = rep.client_data || {};
        const fields = ['customerName', 'siteAddress', 'siteHrsz', 'buildingPurpose', 'inspectorName', 'inspectorLicense', 'instrumentType', 'instrumentCal', 'instrumentError', 'reportResult', 'ephGasRequired', 'ephGasMeter', 'ephPenSep', 'ephEarthMethod', 'ephRaValue', 'ephConductor', 'envTemp', 'envHumidity', 'appliedStandards', 'inspectionLimits', 'nextInspectionDate', 'pvDcSwitch', 'pvDcLocation', 'evRcdType', 'evNote', 'spdType', 'spdStatus', 'afddStatus', 'afddNote'];
        fields.forEach(f => { if (document.getElementById(f)) document.getElementById(f).value = c[f] || ''; });
        if (document.getElementById('ephDeclaration')) document.getElementById('ephDeclaration').checked = c['ephDeclaration'] ?? false;
        if (document.getElementById('ephEarthNotMeasurable')) document.getElementById('ephEarthNotMeasurable').checked = c['ephEarthNotMeasurable'] ?? false;

        const visual = c.visualChecks || {};
        ['id_marks', 'protection', 'fire', 'conduction', 'connection', 'access'].forEach(f => {
            if (document.getElementById(`check_${f}`)) document.getElementById(`check_${f}`).checked = visual[f] ?? true;
        });

        if (rep.diagram_data && window.canvas) {
            window.canvas.loadFromJSON(rep.diagram_data, () => {
                window.canvas.renderAll();
                window.canvas.calcOffset();
            });
        }

        const defectList = document.getElementById('defectList');
        if (defectList) {
            defectList.innerHTML = '';
            if (rep.defects_data) {
                rep.defects_data.forEach(d => {
                    document.getElementById('btnAddDefect')?.click();
                    const cards = defectList.querySelectorAll('[data-vbf-defect-card]');
                    if (cards.length === 0) return;
                    const lastCard = cards[cards.length - 1];
                    if (d.templateId) {
                        lastCard.querySelector('.tpl-select').value = d.templateId;
                        const tipikus = window.vbfData && window.vbfData.tipikus_hibak && window.vbfData.tipikus_hibak.find(h => h.id === d.templateId);
                        lastCard.setAttribute('data-severity', (tipikus && tipikus.sulyossag) ? tipikus.sulyossag : 'egyedi');
                    } else lastCard.setAttribute('data-severity', 'egyedi');
                    lastCard.querySelector('.desc-input').value = d.description || '';
                    lastCard.querySelector('.deadline-input').value = d.deadline || '';
                    lastCard.querySelector('.standard-input').value = d.standard || '';
                    lastCard.querySelector('.loc-input').value = d.location || '';
                    if (d.photo) {
                        lastCard.setAttribute('data-photo', d.photo);
                        const imgP = lastCard.querySelector('.img-preview');
                        const txt = lastCard.querySelector('.upload-txt');
                        if (imgP && txt) { imgP.src = d.photo; imgP.classList.remove('hidden'); txt.classList.add('hidden'); }
                    }
                });
            }
        }

        if (window.VBF && window.VBF.siteTree && c.siteTree) window.VBF.siteTree.fromJSON(c.siteTree);

        const m = (rep.measurements_data && rep.measurements_data[0]) || {};
        document.querySelectorAll('.data-table tbody').forEach(tb => tb.innerHTML = '');
        const sq = (val) => (window.VBF && window.VBF.sanitize) ? window.VBF.sanitize.attr(String(val || '')) : (val || '');

        const passCell = (p) => (typeof window.vbfMeasPassCellHtmlFromPass === 'function')
            ? window.vbfMeasPassCellHtmlFromPass(p === 'Nem' ? 'Nem' : 'Igen')
            : `<td><select class="meas-pass"><option ${p === 'Igen' ? 'selected' : ''}>Igen</option><option ${p === 'Nem' ? 'selected' : ''}>Nem</option></select></td>`;
        if (m.rpe) m.rpe.forEach(r => { window.createRow('table-rpe', `<td><input type="number" class="meas-point" value="${sq(r.point)}"></td><td><input type="text" class="meas-loc" value="${sq(r.loc)}"></td><td><input type="number" step="0.01" class="meas-val" value="${sq(r.val)}" oninput="validateRpe(this.closest('tr'))"></td>${passCell(r.pass)}`); window.applyPhotoToLastRow('table-rpe', r.photo); });
        if (m.insulation) m.insulation.forEach(r => { window.createRow('table-insulation', `<td><input type="text" class="meas-circuit" value="${sq(r.circuit)}" list="circuitNames"></td><td><input type="number" step="0.1" class="meas-ln" value="${sq(r.ln)}" oninput="validateIns(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-lpe" value="${sq(r.lpe)}" oninput="validateIns(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-npe" value="${sq(r.npe)}" oninput="validateIns(this.closest('tr'))"></td>${passCell(r.pass)}`); window.applyPhotoToLastRow('table-insulation', r.photo); });
        if (m.loop) m.loop.forEach(r => { window.createRow('table-loop', `<td><input type="text" class="meas-circuit" value="${sq(r.circuit)}" list="circuitNames"></td><td><input type="text" class="meas-device" value="${sq(r.device)}" oninput="validateZs(this.closest('tr'))"></td><td><input type="text" class="meas-loc" value="${sq(r.loc)}"></td><td><input type="number" step="0.01" class="meas-zs" value="${sq(r.zs)}" oninput="validateZs(this.closest('tr'))"></td>${passCell(r.pass)}`); window.applyPhotoToLastRow('table-loop', r.photo); });
        if (m.rcd) m.rcd.forEach(r => { window.createRow('table-rcd', `<td><input type="text" class="meas-circuit" value="${sq(r.circ)}" list="circuitNames"></td><td><select class="meas-type"><option ${r.type === 'AC' ? 'selected' : ''}>AC</option><option ${r.type === 'A' ? 'selected' : ''}>A</option><option ${r.type === 'B' ? 'selected' : ''}>B</option><option ${r.type === 'F' ? 'selected' : ''}>F</option></select></td><td><input type="number" class="meas-idn" value="${sq(r.idn)}" oninput="validateRcd(this.closest('tr'))"></td><td><select class="meas-05"><option ${r.test05 === 'OK (Nem oldott)' ? 'selected' : ''}>OK (Nem oldott)</option><option ${r.test05 === 'HIBA (Kioldott)' ? 'selected' : ''}>HIBA (Kioldott)</option></select></td><td><input type="number" step="1" class="meas-t1" value="${sq(r.t1)}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="1" class="meas-t5" value="${sq(r.t5)}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-ramp" value="${sq(r.ramp)}" oninput="validateRcd(this.closest('tr'))"></td><td><input type="number" step="0.1" class="meas-uc" value="${sq(r.uc)}"></td>${passCell(r.pass)}`); window.applyPhotoToLastRow('table-rcd', r.photo); });
        if (m.tools) m.tools.forEach(r => { window.createRow('table-tools', `<td><input type="text" class="meas-name" value="${sq(r.name)}"></td><td><input type="text" class="meas-id" value="${sq(r.id)}"></td><td><input type="number" step="0.1" class="meas-val" value="${sq(r.val)}" oninput="validateTool(this.closest('tr'))"></td>${passCell(r.pass)}`); window.applyPhotoToLastRow('table-tools', r.photo); });
        if (m.selv) m.selv.forEach(r => { window.createRow('table-selv', `<td><input type="text" class="meas-loc" value="${sq(r.loc)}"></td><td><input type="number" step="0.1" class="meas-v" value="${sq(r.v)}"></td><td><input type="number" step="1" class="meas-ps" value="${sq(r.ps)}"></td><td><input type="number" step="1" class="meas-pt" value="${sq(r.pt)}"></td><td><input type="number" step="1" class="meas-st" value="${sq(r.st)}"></td>${passCell(r.pass)}`); window.applyPhotoToLastRow('table-selv', r.photo); });
        if (m.eph_cont) m.eph_cont.forEach(r => { window.createRow('table-eph', `<td><input type="number" class="meas-index" value="${sq(r.idx)}"></td><td><input type="text" class="meas-elem" value="${sq(r.elem)}"></td><td><input type="text" class="meas-loc" value="${sq(r.loc)}"></td><td><input type="text" class="meas-mat" value="${sq(r.mat)}"></td><td><select class="meas-conn"><option ${r.conn === 'EPH bilincs' ? 'selected' : ''}>EPH bilincs</option><option ${r.conn === 'Szemes saru' ? 'selected' : ''}>Szemes saru</option><option ${r.conn === 'Hegesztett' ? 'selected' : ''}>Hegesztett</option><option ${r.conn === 'Wago/Sorkapocs' ? 'selected' : ''}>Wago/Sorkapocs</option></select></td><td><input type="number" step="0.01" class="meas-val" value="${sq(r.val)}" oninput="validateEph(this.closest('tr'))"></td>${passCell(r.pass)}`); window.applyPhotoToLastRow('table-eph', r.photo); });
    };

    window.cloneReport = async function (id) {
        if (!confirm('Biztosan szeretnéd másolni ezt a jegyzőkönyvet? Új mentésként kerül rögzítésre.')) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/reports/${id}`, { headers: { 'Authorization': `Bearer ${window.currentToken}` } });
            const rep = await res.json();
            window.currentSavedReportId = null;
            if (btnExportWord) btnExportWord.classList.add('is-hidden');
            if (btnExportPdfReport) btnExportPdfReport.classList.add('is-hidden');
            window.loadReportIntoUI(rep);
            if (document.getElementById('documentTitle')) document.getElementById('documentTitle').value = "MÁSOLAT: " + (rep.title || '');
            if (window.updateHeaderReportContext) window.updateHeaderReportContext("MÁSOLAT: " + (rep.title || ''), 'modified');
            const tabDiag = document.querySelector('.nav-tab[data-target="tab-diagram"]');
            if (tabDiag) tabDiag.click();
            if (window.showToast) window.showToast('Jegyzőkönyv adatai betöltve másolásra!', 'success'); else alert('Jegyzőkönyv adatai betöltve másolásra!');
        } catch (err) { if (window.showToast) window.showToast('Hiba a másolás során!', 'error'); else alert('Hiba a másolás során!'); }
    };

    window.loadReport = async function (id) {
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/reports/${id}`, { headers: { 'Authorization': `Bearer ${window.currentToken}` } });
            const rep = await res.json();
            window.currentSavedReportId = rep.id;
            try { localStorage.setItem('vbf_last_report_id', String(rep.id)); } catch (_) {}
            if (btnExportWord) btnExportWord.classList.remove('is-hidden');
            if (btnExportPdfReport) btnExportPdfReport.classList.remove('is-hidden');
            if (btnEmailReport) btnEmailReport.classList.remove('is-hidden');
            window.loadReportIntoUI(rep);

            if (rep.status === 'FINAL') {
                document.body.classList.add('vbf-report-final-locked');
                if (btnSaveCloud) btnSaveCloud.classList.add('is-hidden');
                if (document.getElementById('btnFinalize')) document.getElementById('btnFinalize').classList.add('is-hidden');
                document.querySelectorAll('input:not(#manualQrId), select, textarea, button:not(.nav-tab):not(#btnExportWord):not(#btnExportPdfReport):not(#btnEmailReport):not(#btnLoginNav):not(#btnToggleTheme):not(#btnCloseLogin)').forEach(el => { el.disabled = true; });
                if (!document.getElementById('lockMessage')) {
                    const lockMsg = document.createElement('div');
                    lockMsg.id = 'lockMessage';
                    lockMsg.className = 'vbf-report-lock-banner';
                    lockMsg.innerText = 'Ez a jegyzőkönyv véglegesítve van. Módosítás nem lehetséges.';
                    document.querySelector('.app-content-wrapper')?.prepend(lockMsg);
                }
            } else {
                document.body.classList.remove('vbf-report-final-locked');
                if (btnSaveCloud) btnSaveCloud.classList.remove('is-hidden');
                if (document.getElementById('btnFinalize')) document.getElementById('btnFinalize').classList.remove('is-hidden');
                document.querySelectorAll('input:not(#manualQrId), select, textarea, button').forEach(el => { el.disabled = false; });
                const lm = document.getElementById('lockMessage');
                if (lm) lm.remove();
            }

            window.showReportQr(rep.id);
            if (window.updateHeaderReportContext) window.updateHeaderReportContext(rep.title || '', 'saved');
            const tabDiag = document.querySelector('.nav-tab[data-target="tab-diagram"]');
            if (tabDiag) tabDiag.click();
            if (window.showToast) window.showToast('Jegyzőkönyv betöltve!', 'success'); else alert('Jegyzőkönyv betöltve!');
        } catch (err) { if (window.showToast) window.showToast('Hiba a betöltés során!', 'error'); else alert('Hiba a betöltés során!'); }
    };

    window.deleteReport = async function (id) {
        if (!confirm('VIGYÁZAT! Biztosan törölni szeretnéd ezt a jegyzőkönyvet? Ez a művelet nem vonható vissza!')) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/reports/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${window.currentToken}` } });
            if (res.ok) {
                if (window.currentSavedReportId === id) {
                    window.currentSavedReportId = null;
                    try { localStorage.removeItem('vbf_last_report_id'); } catch (_) {}
                    if (btnExportWord) btnExportWord.classList.add('is-hidden');
                    if (btnExportPdfReport) btnExportPdfReport.classList.add('is-hidden');
                    if (btnEmailReport) btnEmailReport.classList.add('is-hidden');
                    if (document.getElementById('documentTitle')) document.getElementById('documentTitle').value = '';
                    if (window.updateHeaderReportContext) window.updateHeaderReportContext('', null);
                }
                if (window.showToast) window.showToast('Jegyzőkönyv törölve!', 'success'); else alert('Jegyzőkönyv törölve!');
                window.fetchReports();
            } else { if (window.showToast) window.showToast('Sikertelen törlés.', 'error'); else alert('Sikertelen törlés.'); }
        } catch (err) { if (window.showToast) window.showToast('Hiba a törlés során.', 'error'); else alert('Hiba a törlés során.'); }
    };

    window.sendEmailReport = async function (id) {
        if (!window.currentToken) return alert('Kérlek jelentkezz be email küldéshez!');
        const toEmail = prompt("E-mail cím a jegyzőkönyv küldéséhez:", "");
        if (!toEmail) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) return alert("Érvénytelen e-mail!");
        alert("Küldés folyamatban...");
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/reports/${id}/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.currentToken}` },
                body: JSON.stringify({ to_email: toEmail, subject: "Érintésvédelmi Jegyzőkönyv" })
            });
            if (res.ok) { if (window.showToast) window.showToast('Email elküldve!', 'success'); else alert("Email elküldve!"); }
            else { if (window.showToast) window.showToast('Hiba az elküldés során!', 'error'); else alert("Hiba az elküldés során!"); }
        } catch (err) { if (window.showToast) window.showToast('Hiba: ' + err.message, 'error'); else alert("Hiba: " + err.message); }
    };

    window.showReportQr = function (id) {
        const inspector = document.getElementById('inspector-content');
        if (inspector) {
            const existing = document.getElementById('qr-container');
            if (existing) existing.remove();
            const qrDiv = document.createElement('div');
            qrDiv.id = 'qr-container';
            qrDiv.className = 'prop-group vbf-inspector-qr-block';
            qrDiv.innerHTML = `<p class="vbf-inspector-qr-block__title">Azonosítás (ID: R-${id})</p><div id="qrcode" class="vbf-inspector-qr-block__canvas-wrap"></div>`;
            inspector.appendChild(qrDiv);
            if (window.QRCode) new window.QRCode(document.getElementById("qrcode"), { text: `VBF-REPORT-${id}`, width: 120, height: 120, colorDark: "#000", colorLight: "#fff" });
        }
    };

    // Piszkozat: helyi mentés 2,5 percenként; helyreállítás induláskor
    window.saveDraftToLocalStorage = function () {
        try {
            const payload = buildReportPayload();
            localStorage.setItem('vbf_draft', JSON.stringify({ payload, savedAt: Date.now() }));
        } catch (_) {}
    };
    window.loadDraftIntoUI = function () {
        try {
            const raw = localStorage.getItem('vbf_draft');
            if (!raw) return false;
            const { payload } = JSON.parse(raw);
            const rep = {
                title: payload.title,
                report_type: payload.report_type || 'vbf',
                client_data: payload.client_data || {},
                defects_data: payload.defects_data || [],
                measurements_data: payload.measurements_data || [{}],
                diagram_data: payload.diagram_data || null
            };
            window.currentSavedReportId = null;
            window.loadReportIntoUI(rep);
            if (window.updateHeaderReportContext) window.updateHeaderReportContext(rep.title || 'Piszkozat', 'modified');
            return true;
        } catch (_) { return false; }
    };
    setInterval(function () {
        if (document.getElementById('customerName') && !window.currentSavedReportId) window.saveDraftToLocalStorage();
    }, 2.5 * 60 * 1000);

    // Sablonok: előre kitöltött értékek „Új sablonból” indításhoz
    window.VBF_REPORT_TEMPLATES = [
        { id: 'lako', name: 'Lakóépület', docType: 'VBF_LAKO', buildingPurpose: 'Lakóépület', buildingOtsz: 'AK', instrumentType: 'Metrel MI 3152', nextYears: 5 },
        { id: 'iroda', name: 'Iroda / Kereskedelmi', docType: 'VBF_LAKO', buildingPurpose: 'Iroda, kereskedelmi épület', buildingOtsz: 'KK', instrumentType: 'Metrel MI 3152', nextYears: 5 },
        { id: 'uzem', name: 'Ipari / Üzem', docType: 'VBF_LAKO', buildingPurpose: 'Ipari, üzemi épület', buildingOtsz: 'MK', instrumentType: 'Metrel MI 3152', nextYears: 3 },
        { id: 'eph', name: 'EPH felülvizsgálat', docType: 'EPH', buildingPurpose: '', buildingOtsz: '', instrumentType: 'Metrel MI 3152', nextYears: 5 }
    ];
    window.applyReportTemplate = function (templateId) {
        const t = window.VBF_REPORT_TEMPLATES.find(x => x.id === templateId);
        if (!t) return;
        window.currentSavedReportId = null;
        if (document.getElementById('docType')) document.getElementById('docType').value = t.docType || 'VBF_LAKO';
        if (document.getElementById('buildingPurpose')) document.getElementById('buildingPurpose').value = t.buildingPurpose || '';
        if (document.getElementById('buildingOtsz')) document.getElementById('buildingOtsz').value = t.buildingOtsz || '';
        if (document.getElementById('instrumentType')) document.getElementById('instrumentType').value = t.instrumentType || '';
        if (document.getElementById('documentTitle')) document.getElementById('documentTitle').value = `Sablon: ${t.name}`;
        document.querySelectorAll('.data-table tbody').forEach(tb => { if (tb) tb.innerHTML = ''; });
        const defectList = document.getElementById('defectList');
        if (defectList) defectList.innerHTML = '';
        if (window.canvas && window.canvas.clear) window.canvas.clear();
        if (window.updateHeaderReportContext) window.updateHeaderReportContext(`Sablon: ${t.name}`, 'modified');
        if (window.showToast) window.showToast(`Sablon „${t.name}" betöltve. Töltsd ki a mezőket!`, 'success');
    };
    document.getElementById('btnNewReportEmpty')?.addEventListener('click', () => {
        window.currentSavedReportId = null;
        document.querySelectorAll('.data-table tbody').forEach(tb => { if (tb) tb.innerHTML = ''; });
        const defectList = document.getElementById('defectList');
        if (defectList) defectList.innerHTML = '';
        if (window.canvas && window.canvas.clear) window.canvas.clear();
        ['documentTitle', 'docType', 'customerName', 'siteAddress', 'siteHrsz', 'buildingPurpose', 'buildingOtsz', 'nextInspectionDate', 'inspectorName', 'inspectorLicense', 'instrumentType', 'instrumentCal', 'instrumentError', 'reportResult', 'envTemp', 'envHumidity', 'appliedStandards', 'inspectionLimits', 'pvDcSwitch', 'pvDcLocation', 'evRcdType', 'evNote', 'spdType', 'spdStatus', 'afddStatus', 'afddNote'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = (id === 'docType') ? 'VBF_LAKO' : (id === 'documentTitle' ? 'Új jegyzőkönyv' : (['pvDcSwitch', 'evRcdType', 'spdType', 'afddStatus'].includes(id) ? 'Nem releváns' : (id === 'spdStatus' ? 'Nincs / Nem ellenőrizhető' : '')));
        });
        if (document.getElementById('ephDeclaration')) document.getElementById('ephDeclaration').checked = false;
        if (document.getElementById('ephEarthNotMeasurable')) document.getElementById('ephEarthNotMeasurable').checked = false;
        if (window.updateHeaderReportContext) window.updateHeaderReportContext('Új jegyzőkönyv', null);
        if (window.showToast) window.showToast('Üres jegyzőkönyv kész.', 'success');
    });
    document.getElementById('reportTemplateSelect')?.addEventListener('change', function () {
        const v = this.value;
        if (v) { window.applyReportTemplate(v); this.value = ''; }
    });

    if (window.updateHeaderReportContext) {
        if (window.currentSavedReportId) {
            const t = document.getElementById('documentTitle')?.value?.trim();
            window.updateHeaderReportContext(t || 'Jegyzőkönyv', 'saved');
        } else {
            const t = document.getElementById('documentTitle')?.value?.trim();
            window.updateHeaderReportContext(t || '', t ? 'modified' : null);
        }
    }

    if (window.currentToken) {
        window.fetchReports();
    }

    // AI Összefoglaló Generálása (Szimulált / Előkészített endpoint hívás)
    const btnGenerateSummaryAi = document.getElementById('btnGenerateSummaryAi');
    if (btnGenerateSummaryAi) {
        btnGenerateSummaryAi.addEventListener('click', () => {
            const notesField = document.getElementById('inspectorNotes');
            if (!notesField) return;
            
            btnGenerateSummaryAi.disabled = true;
            btnGenerateSummaryAi.innerHTML = '⏳ Generálás folyamatban...';
            
            setTimeout(() => {
                const bPurpose = document.getElementById('buildingPurpose')?.value || 'az épület';
                let bOtsz = document.getElementById('buildingOtsz')?.value || '';
                if (bOtsz) bOtsz = ' (OTSZ: ' + bOtsz + ')';
                const qResult = document.getElementById('reportResult')?.value || 'MEGFELELŐ';
                const isOk = qResult.includes('MEGFELELŐ') && !qResult.includes('NEM');
                
                let summary = `A felülvizsgálat során megállapításra került, hogy ${bPurpose}${bOtsz} villamos berendezéseinek biztonságtechnikai ellenőrzése az MSZ HD 60364-6 és vonatkozó szabványok alapján megtörtént.\n\n`;
                
                if (isOk) {
                    summary += `A vizsgálat megállapította, hogy nyomvonalakon és az elosztóberendezéseken közvetlen baleset- vagy tűzveszélyt okozó kritikus hiba nem volt azonosítható. A berendezések részben vagy maradéktalanul teljesítik a velük szemben támasztott követelményeket, a normál működés folytatása engedélyezett.`;
                } else {
                    summary += `A felülvizsgálat alatt feltárt hiányosságok az érintésvédelmi és tűzvédelmi szempontból a biztonságos üzemeltetést korlátozzák (ld. Hibajegyzék részletei). A jegyzőkönyv "Nem Megfelelő" illetve "Javításra szorul" minősítést kapott, így a hibalista pontjainak javítása az életvédelmi feltételek és a további biztonságos üzem miatt határidőre kötelező.`;
                }
                
                notesField.value = summary;
                btnGenerateSummaryAi.disabled = false;
                btnGenerateSummaryAi.innerHTML = '✨ AI Összefoglaló';
                if (window.showToast) window.showToast('AI Szakmai összefoglaló sikeresen legenerálva.', 'success');
            }, 800);
        });
    }

    // ═══════════════════════════════════════════
    // Megjegyzés képcsatolás logika
    // ═══════════════════════════════════════════
    window._notePhotos = window._notePhotos || [];

    window._addNotePhotoPreview = function addNotePhotoPreview(dataUrl) {
        if ((window._notePhotos || []).length >= 5) return;
        window._notePhotos = window._notePhotos || [];
        const idx = window._notePhotos.length;
        window._notePhotos.push({ data: dataUrl });
        const container = document.getElementById('notePhotosContainer');
        if (!container) return;
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;display:inline-block;';
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = 'width:110px;height:85px;object-fit:cover;border-radius:6px;border:1px solid var(--border-color);';
        const del = document.createElement('button');
        del.type = 'button';
        del.textContent = '×';
        del.style.cssText = 'position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.65);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:1rem;line-height:1;padding:0;';
        del.onclick = function() {
            const i = window._notePhotos.indexOf(window._notePhotos[idx]);
            if (i !== -1) window._notePhotos.splice(i, 1);
            wrap.remove();
            const cnt = document.getElementById('notePhotosCount');
            if (cnt) cnt.textContent = `${window._notePhotos.length} / 5 kép csatolva`;
        };
        wrap.appendChild(img); wrap.appendChild(del);
        container.appendChild(wrap);
        const cnt = document.getElementById('notePhotosCount');
        if (cnt) cnt.textContent = `${window._notePhotos.length} / 5 kép csatolva`;
    };

    document.getElementById('inputNotePhoto')?.addEventListener('change', function() {
        const remaining = 5 - (window._notePhotos || []).length;
        Array.from(this.files || []).slice(0, remaining).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const raw = e.target.result;
                const compress = typeof window.VBF_compressImage === 'function'
                    ? window.VBF_compressImage(raw, { maxWidth: 1200, maxHeight: 1200, quality: 0.80 })
                    : Promise.resolve(raw);
                compress.then(data => window._addNotePhotoPreview(data));
            };
            reader.readAsDataURL(file);
        });
        this.value = '';
    });
}

