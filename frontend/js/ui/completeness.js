export function initCompleteness() {
    function updateCompleteness() {
        const panel = document.getElementById('completenessPanel');
        const bar = document.getElementById('completenessBar');
        const text = document.getElementById('completenessText');
        const status = document.getElementById('completenessStatus');
        const items = document.getElementById('checkItems');
        if (!bar || !items) return;

        const docType = document.getElementById('docType')?.value || '';
        const isVBF = docType.startsWith('VBF_');

        const checks = [];

        // 1. Azonosító adatok
        const clientName = document.getElementById('customerName')?.value?.trim();
        checks.push({ label: 'Megrendelő neve', req: true, ok: !!clientName, hint: 'Jegyzőkönyv Adatok fül → Megrendelő', fieldId: 'customerName' });

        const siteAddress = document.getElementById('siteAddress')?.value?.trim();
        checks.push({ label: 'Vizsgált objektum címe', req: true, ok: !!siteAddress, hint: 'Jegyzőkönyv Adatok fül → Cím', fieldId: 'siteAddress' });

        const reportId = document.getElementById('documentTitle')?.value?.trim();
        checks.push({ label: 'Dokumentum Címe', req: false, ok: !!reportId, hint: 'Pl. Családi ház', fieldId: 'documentTitle' });

        // 2. Felülvizsgáló
        const inspName = document.getElementById('inspectorName')?.value?.trim();
        checks.push({ label: 'Felülvizsgáló neve', req: true, ok: !!inspName, hint: 'Jegyzőkönyv Adatok fül → Felülvizsgáló', fieldId: 'inspectorName' });

        const inspLic = document.getElementById('inspectorLicense')?.value?.trim();
        checks.push({ label: 'Vizsgabizonyítvány száma', req: false, ok: !!inspLic, hint: 'Regisztrációs / okmányszám', fieldId: 'inspectorLicense' });

        // 3. Műszer
        const instrType = document.getElementById('instrumentType')?.value?.trim();
        checks.push({ label: 'Mérőműszer típus + gyári szám', req: true, ok: !!(instrType && instrType.match(/\d/)), hint: 'Pl.: Metrel MI 3152, SN:21070123', fieldId: 'instrumentType' });

        const instrCal = document.getElementById('instrumentCal')?.value?.trim();
        let calOk = false;
        let calExpiringSoon = false;
        let calDaysLeft = null;
        if (instrCal) {
            const calDate = new Date(instrCal);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            calDate.setHours(0, 0, 0, 0);
            calOk = calDate >= today;
            if (calOk) {
                calDaysLeft = Math.ceil((calDate - today) / (24 * 60 * 60 * 1000));
                calExpiringSoon = calDaysLeft <= 30 && calDaysLeft >= 0;
            }
        }
        const calHint = !instrCal
            ? 'Dátum hiányzik'
            : !calOk
                ? 'Lejárt kalibrálás'
                : calExpiringSoon
                    ? `${calDaysLeft} nap múlva lejár`
                    : 'Érvényes';
        checks.push({ label: 'Kalibrálás érvényessége', req: true, ok: calOk, hint: calHint, fieldId: 'instrumentCal' });

        // 4. Épület
        const bPurpose = document.getElementById('buildingPurpose')?.value?.trim();
        checks.push({ label: 'Épület rendeltetése', req: isVBF, ok: !!bPurpose, hint: 'Pl. Lakóépület, Iroda, Üzem', fieldId: 'buildingPurpose' });

        const bOtsz = document.getElementById('buildingOtsz')?.value;
        checks.push({ label: 'OTSZ kockázati osztály', req: isVBF, ok: !!bOtsz, hint: 'AK / KK / MK', fieldId: 'buildingOtsz' });

        // 5. Mérések (tab + scroll a Mérési Adatok fülre)
        const rpeRows = document.querySelectorAll('#table-rpe tbody tr').length;
        checks.push({ label: 'Rpe mérések (védővezető)', req: false, ok: rpeRows > 0, hint: `${rpeRows} db sor`, tabTarget: 'tab-measurements', sectionSelector: '#table-rpe' });

        const isoRows = document.querySelectorAll('#table-insulation tbody tr').length;
        checks.push({
            label: 'Riso mérések (szigetelés)',
            req: isVBF,
            ok: isoRows > 0,
            hint: isVBF
                ? (isoRows > 0 ? `${isoRows} sor` : 'Adj meg legalább egy sort a Mérési adatok fülön (táblázat: szigetelés).')
                : `${isoRows} sor`,
            tabTarget: 'tab-measurements',
            sectionSelector: '#table-insulation'
        });

        const loopRows = document.querySelectorAll('#table-loop tbody tr').length;
        checks.push({
            label: 'Zs mérések (hurok)',
            req: isVBF,
            ok: loopRows > 0,
            hint: isVBF
                ? (loopRows > 0 ? `${loopRows} sor` : 'Adj meg legalább egy sort a Mérési adatok fülön (táblázat: hurokellenállás).')
                : `${loopRows} sor`,
            tabTarget: 'tab-measurements',
            sectionSelector: '#table-loop'
        });

        const rcdRows = document.querySelectorAll('#table-rcd tbody tr').length;
        checks.push({ label: 'RCD/ÁVK mérések', req: false, ok: rcdRows > 0, hint: `${rcdRows} db sor`, tabTarget: 'tab-measurements', sectionSelector: '#table-rcd' });

        // 6. Minősítés
        const reportResult = document.getElementById('reportResult')?.value;
        checks.push({ label: 'Összefoglaló minősítés', req: true, ok: !!reportResult, hint: 'Válaszd ki a minősítést!', fieldId: 'reportResult' });

        const requiredItems = checks.filter(c => c.req);
        const filledRequired = requiredItems.filter(c => c.ok).length;
        const allFilled = checks.filter(c => c.ok).length;
        const totalChecks = checks.length;
        const pct = Math.round((allFilled / totalChecks) * 100);
        const canSave = requiredItems.every(c => c.ok);

        bar.style.width = pct + '%';
        if (canSave) {
            bar.style.background = 'linear-gradient(90deg, #34d399, #6ee7b7)';
        } else if (pct >= 66) {
            bar.style.background = 'linear-gradient(90deg, #3b82f6, #60a5fa)';
        } else if (pct >= 33) {
            bar.style.background = 'linear-gradient(90deg, #2563eb, #3b82f6)';
        } else {
            bar.style.background = 'linear-gradient(90deg, #1d4ed8, #60a5fa)';
        }

        if (panel) panel.classList.toggle('is-blocked', !canSave);

        if (text) {
            text.textContent = `${pct}% kész (${filledRequired}/${requiredItems.length} kötelező)`;
        }

        const icOk =
            '<svg class="vbf-completeness-status-ic" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M3.5 8.5l3 3 6-7"/></svg>';
        const icHold =
            '<svg class="vbf-completeness-status-ic" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.25" opacity="0.55"/></svg>';
        if (status) {
            status.className = canSave ? 'vbf-completeness-status vbf-completeness-status--ok' : 'vbf-completeness-status';
            status.innerHTML = canSave ? `${icOk}<span>Menthető</span>` : `${icHold}<span>Nem menthető</span>`;
        }

        const reportTabBadge = document.getElementById('tabReportBadge');
        if (reportTabBadge) {
            const reportMissing = requiredItems.filter(c => c.fieldId && !c.ok).length;
            if (reportMissing > 0) {
                reportTabBadge.textContent = reportMissing;
                reportTabBadge.style.display = 'inline';
            } else {
                reportTabBadge.textContent = '';
                reportTabBadge.style.display = 'none';
            }
        }
        const measurementsBadge = document.getElementById('tabMeasurementsBadge');
        if (measurementsBadge) {
            const measMissing = requiredItems.filter(c => c.tabTarget === 'tab-measurements' && !c.ok).length;
            if (measMissing > 0) {
                measurementsBadge.textContent = measMissing;
                measurementsBadge.style.display = 'inline';
            } else {
                measurementsBadge.textContent = '';
                measurementsBadge.style.display = 'none';
            }
        }

        const esc = (s) => String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');

        const svgCheck =
            '<svg class="vbf-checkitem-glyph-svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3.5 8.5l3 3 6-7"/></svg>';
        const svgMiss =
            '<svg class="vbf-checkitem-glyph-svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="none" stroke="#f87171" stroke-width="1.5"/></svg>';
        const svgOpt =
            '<svg class="vbf-checkitem-glyph-svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.5" fill="none" stroke="#64748b" stroke-width="1.5"/></svg>';

        let html = '';
        checks.forEach(c => {
            const rowMod = c.ok ? 'vbf-checkitem--ok' : (c.req ? 'vbf-checkitem--miss' : 'vbf-checkitem--optional');
            const glyph = c.ok ? svgCheck : (c.req ? svgMiss : svgOpt);
            const star = c.req && !c.ok
                ? '<span class="vbf-checkitem-req-star" title="Kötelező mező" aria-hidden="true">*</span>'
                : '';
            const fieldId = c.fieldId || '';
            const tabTarget = c.tabTarget || '';
            const sectionSelector = c.sectionSelector || '';
            let clickAttr = '';
            let title = '';
            if (fieldId) {
                clickAttr = `onclick="navigateToField('${fieldId}')"`;
                title = 'Kattints: ugrás a mezőhöz';
            } else if (tabTarget && sectionSelector) {
                clickAttr = `onclick="navigateToSection('${tabTarget}','${sectionSelector}')"`;
                title = 'Kattints: Mérési adatok fül és táblázat';
            }
            const cursor = fieldId || tabTarget ? 'vbf-checkitem--click' : '';
            html += `<div ${clickAttr} class="vbf-checkitem ${rowMod} ${cursor}" title="${esc(title)}">
                <div class="vbf-checkitem-glyph" aria-hidden="true">${glyph}</div>
                <div class="vbf-checkitem-body">
                    <div class="vbf-checkitem-title-row">
                        ${star}<span class="vbf-checkitem-label">${esc(c.label)}</span>
                    </div>
                    <p class="vbf-checkitem-hint">${esc(c.hint)}</p>
                </div>
            </div>`;
        });
        items.innerHTML = html;

        const highlightField = (id, isOk) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!el.value || !el.value.trim()) {
                el.style.borderColor = '';
                return;
            }
            el.style.borderColor = isOk ? '#5eb89a' : '#b88282';
            el.style.boxShadow = isOk ? '0 0 0 2px rgba(94,184,154,0.2)' : '0 0 0 2px rgba(184,130,130,0.22)';
        };

        highlightField('instrumentType', !!(instrType && instrType.match(/\d/)));
        highlightField('instrumentCal', calOk);
        highlightField('customerName', !!clientName);
        highlightField('siteAddress', !!siteAddress);
        highlightField('inspectorName', !!inspName);

        const calHelper = document.getElementById('calHelper');
        if (calHelper && instrCal) {
            if (!calOk) {
                calHelper.innerHTML = `<span style="color:#c98a8a; font-weight:600;">Lejárt kalibrálás</span> — A kalibrálás (${instrCal}) a múltban van. „Megfelelő” minősítés nem adható.`;
            } else if (calExpiringSoon) {
                calHelper.innerHTML = `<span style="color:#c9a55a; font-weight:600;">Hamarosan lejár</span> — Lejárat: ${instrCal} (${calDaysLeft} nap múlva). Érdemes időben újrakalibrálni.`;
            } else {
                calHelper.innerHTML = `<span style="color:#6eb89a; font-weight:600;">Érvényes kalibrálás</span> — Lejárat: ${instrCal}`;
            }
        }
    }

    window.navigateToField = function (fieldId) {
        const el = document.getElementById(fieldId);
        if (!el) return;
        const tabPane = el.closest('.tab-pane');
        if (tabPane) {
            const tabId = tabPane.id;
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            const targetTab = document.querySelector(`.nav-tab[data-target="${tabId}"]`);
            if (targetTab) targetTab.classList.add('active');
            tabPane.classList.add('active');
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'all 0.3s ease';
        el.style.boxShadow = '0 0 0 4px rgba(201,165,90,0.45)';
        el.style.borderColor = '#c9a55a';
        el.focus();
        setTimeout(() => {
            el.style.boxShadow = '';
            el.style.borderColor = '';
        }, 2000);
    };

    /** Tab váltás + scroll a megadott szekcióra (pl. mérési táblázat). */
    window.navigateToSection = function (tabTarget, sectionSelector) {
        const targetTab = document.querySelector(`.nav-tab[data-target="${tabTarget}"]`);
        const targetPane = document.getElementById(tabTarget);
        if (!targetTab || !targetPane) return;
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        targetTab.classList.add('active');
        targetPane.classList.add('active');
        const section = sectionSelector ? document.querySelector(sectionSelector) : targetPane;
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            section.style.transition = 'box-shadow 0.3s ease';
            section.style.boxShadow = '0 0 0 3px rgba(201,165,90,0.42)';
            setTimeout(() => { section.style.boxShadow = ''; }, 2500);
        }
    };

    setInterval(updateCompleteness, 2000);
    document.addEventListener('input', () => setTimeout(updateCompleteness, 300));
    document.addEventListener('change', () => setTimeout(updateCompleteness, 300));
    setTimeout(updateCompleteness, 1000);
}
