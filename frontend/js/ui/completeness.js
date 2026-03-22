export function initCompleteness() {
    function updateCompleteness() {
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
        checks.push({ label: '🔧 Mérőműszer típus + gyári szám', req: true, ok: !!(instrType && instrType.match(/\d/)), hint: 'Pl.: Metrel MI 3152, SN:21070123', fieldId: 'instrumentType' });

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
        const calHint = !instrCal ? 'Dátum hiányzik' : !calOk ? '⚠️ LEJÁRT!' : calExpiringSoon ? `⏳ ${calDaysLeft} nap múlva lejár` : 'Érvényes';
        checks.push({ label: '📅 Kalibrálás érvényessége', req: true, ok: calOk, hint: calHint, fieldId: 'instrumentCal' });

        // 4. Épület
        const bPurpose = document.getElementById('buildingPurpose')?.value?.trim();
        checks.push({ label: '🏢 Épület rendeltetése', req: isVBF, ok: !!bPurpose, hint: 'Pl. Lakóépület, Iroda, Üzem', fieldId: 'buildingPurpose' });

        const bOtsz = document.getElementById('buildingOtsz')?.value;
        checks.push({ label: '🏗️ OTSZ kockázati osztály', req: isVBF, ok: !!bOtsz, hint: 'AK / KK / MK', fieldId: 'buildingOtsz' });

        // 5. Mérések (tab + scroll a Mérési Adatok fülre)
        const rpeRows = document.querySelectorAll('#table-rpe tbody tr').length;
        checks.push({ label: '📏 Rpe mérések (védővezető)', req: false, ok: rpeRows > 0, hint: `${rpeRows} db sor`, tabTarget: 'tab-measurements', sectionSelector: '#table-rpe' });

        const isoRows = document.querySelectorAll('#table-insulation tbody tr').length;
        checks.push({
            label: '⚡ Riso mérések (szigetelés)',
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
            label: '🔄 Zs mérések (hurok)',
            req: isVBF,
            ok: loopRows > 0,
            hint: isVBF
                ? (loopRows > 0 ? `${loopRows} sor` : 'Adj meg legalább egy sort a Mérési adatok fülön (táblázat: hurokellenállás).')
                : `${loopRows} sor`,
            tabTarget: 'tab-measurements',
            sectionSelector: '#table-loop'
        });

        const rcdRows = document.querySelectorAll('#table-rcd tbody tr').length;
        checks.push({ label: '🛡️ RCD/ÁVK mérések', req: false, ok: rcdRows > 0, hint: `${rcdRows} db sor`, tabTarget: 'tab-measurements', sectionSelector: '#table-rcd' });

        // 6. Minősítés
        const reportResult = document.getElementById('reportResult')?.value;
        checks.push({ label: '📊 Összefoglaló minősítés', req: true, ok: !!reportResult, hint: 'Válaszd ki a minősítést!', fieldId: 'reportResult' });

        const requiredItems = checks.filter(c => c.req);
        const filledRequired = requiredItems.filter(c => c.ok).length;
        const allFilled = checks.filter(c => c.ok).length;
        const totalChecks = checks.length;
        const pct = Math.round((allFilled / totalChecks) * 100);
        const canSave = requiredItems.every(c => c.ok);

        bar.style.width = pct + '%';
        if (pct >= 90) bar.style.background = 'linear-gradient(90deg, #4ade80, #6ee7b7)';
        else if (pct >= 50) bar.style.background = 'linear-gradient(90deg, #d4a84d, #e8c06a)';
        else bar.style.background = 'linear-gradient(90deg, #c97b7b, #d4a574)';

        text.textContent = `${pct}% kész (${filledRequired}/${requiredItems.length} kötelező)`;

        if (canSave) {
            status.textContent = '✅ Menthető!';
            status.style.color = '#6ee7b7';
        } else {
            status.textContent = '❌ Nem menthető';
            status.style.color = '#d4a0a0';
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

        let html = '';
        checks.forEach(c => {
            const icon = c.ok ? '✅' : (c.req ? '❌' : '⬜');
            const rowFrame = c.ok
                ? 'border-0 border-l-[2px] border-l-[color-mix(in_srgb,#6ee7b7_65%,transparent)]'
                : (c.req
                    ? 'border-0 border-l-[2px] border-l-[color-mix(in_srgb,#d4a0a0_70%,transparent)]'
                    : 'border-0 border-l-[2px] border-l-[color-mix(in_srgb,var(--text-muted)_45%,transparent)]');
            const reqBadge = c.req
                ? '<span class="vbf-req-badge shrink-0 rounded px-1.5 py-0.5 text-[0.58rem] font-medium normal-case tracking-normal text-[color-mix(in_srgb,var(--danger)_55%,var(--text-muted))] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]">kötelező</span>'
                : '';
            const fieldId = c.fieldId || '';
            const tabTarget = c.tabTarget || '';
            const sectionSelector = c.sectionSelector || '';
            let clickClass = '';
            let title = '';
            if (fieldId) {
                clickClass = `onclick="navigateToField('${fieldId}')"`;
                title = 'Kattints: ugrás a mezőhöz';
            } else if (tabTarget && sectionSelector) {
                clickClass = `onclick="navigateToSection('${tabTarget}','${sectionSelector}')"`;
                title = 'Kattints: Mérési adatok fül és táblázat';
            }
            const cursor = fieldId || tabTarget ? 'cursor-pointer' : '';
            html += `<div ${clickClass} class="vbf-checkitem rounded-[10px] ${rowFrame} bg-[color-mix(in_srgb,var(--bg-glass)_42%,var(--bg-base))] px-4 py-3 transition-colors hover:bg-[color-mix(in_srgb,var(--bg-glass)_58%,var(--bg-base))] ${cursor}" title="${esc(title)}">
                <div class="flex gap-3.5">
                    <span class="shrink-0 pt-0.5 text-[1.05rem] leading-none opacity-95" aria-hidden="true">${icon}</span>
                    <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                            <span class="text-[0.875rem] font-medium leading-snug text-[var(--text-main)]">${esc(c.label)}</span>
                            ${reqBadge}
                        </div>
                        <p class="mt-2.5 break-words text-[0.8rem] leading-[1.6] text-[var(--text-muted)]">${esc(c.hint)}</p>
                    </div>
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
                calHelper.innerHTML = `⚠️ <span style="color:#c98a8a; font-weight:600;">Lejárt kalibrálás</span> — A kalibrálás (${instrCal}) a múltban van. „Megfelelő” minősítés nem adható.`;
            } else if (calExpiringSoon) {
                calHelper.innerHTML = `⏳ <span style="color:#c9a55a; font-weight:600;">Hamarosan lejár</span> — Lejárat: ${instrCal} (${calDaysLeft} nap múlva). Érdemes időben újrakalibrálni.`;
            } else {
                calHelper.innerHTML = `✅ <span style="color:#6eb89a; font-weight:600;">Érvényes kalibrálás</span> — Lejárat: ${instrCal}`;
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
