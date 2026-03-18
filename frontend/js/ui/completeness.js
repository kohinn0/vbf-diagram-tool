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

        const inspectionDate = document.getElementById('inspectionDate')?.value?.trim();
        checks.push({ label: 'Vizsgálat dátuma', req: false, ok: !!inspectionDate, hint: 'A helyszíni vizsgálat napja', fieldId: 'inspectionDate' });

        const reportId = document.getElementById('documentTitle')?.value?.trim();
        checks.push({ label: 'Dokumentum Címe', req: false, ok: !!reportId, hint: 'Pl. Családi ház', fieldId: 'documentTitle' });

        // 2. Felülvizsgáló
        const inspName = document.getElementById('inspectorName')?.value?.trim();
        checks.push({ label: 'Felülvizsgáló neve', req: true, ok: !!inspName, hint: 'Jegyzőkönyv Adatok fül → Felülvizsgáló', fieldId: 'inspectorName' });

        const inspLic = document.getElementById('inspectorLicense')?.value?.trim();
        checks.push({ label: 'Vizsgabizonyítvány szám', req: false, ok: !!inspLic, hint: 'Regisztrációs szám', fieldId: 'inspectorLicense' });

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
        checks.push({ label: '⚡ Riso mérések (szigetelés)', req: isVBF, ok: isoRows > 0, hint: isVBF ? (isoRows > 0 ? `${isoRows} db sor` : 'KÖTELEZŐ! Menj a Mérési Adatok fülre!') : `${isoRows} db sor`, tabTarget: 'tab-measurements', sectionSelector: '#table-insulation' });

        const loopRows = document.querySelectorAll('#table-loop tbody tr').length;
        checks.push({ label: '🔄 Zs mérések (hurok)', req: isVBF, ok: loopRows > 0, hint: isVBF ? (loopRows > 0 ? `${loopRows} db sor` : 'KÖTELEZŐ! Menj a Mérési Adatok fülre!') : `${loopRows} db sor`, tabTarget: 'tab-measurements', sectionSelector: '#table-loop' });

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
        if (pct >= 90) bar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
        else if (pct >= 50) bar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        else bar.style.background = 'linear-gradient(90deg, #ef4444, #f59e0b)';

        text.textContent = `${pct}% kész (${filledRequired}/${requiredItems.length} kötelező)`;

        if (canSave) {
            status.textContent = '✅ Menthető!';
            status.style.color = '#10b981';
        } else {
            status.textContent = '❌ Nem menthető';
            status.style.color = '#ef4444';
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

        let html = '';
        checks.forEach(c => {
            const icon = c.ok ? '✅' : (c.req ? '❌' : '⬜');
            const color = c.ok ? '#10b981' : (c.req ? '#ef4444' : 'var(--text-secondary)');
            const reqBadge = c.req ? '<span style="color:#ef4444; font-weight:700; font-size:0.7rem; margin-left:4px;">KÖTELEZŐ</span>' : '';
            const fieldId = c.fieldId || '';
            const tabTarget = c.tabTarget || '';
            const sectionSelector = c.sectionSelector || '';
            let clickAttr = '';
            let title = '';
            if (fieldId) {
                clickAttr = `onclick="navigateToField('${fieldId}')" style="cursor:pointer;"`;
                title = 'Kattints ide → Odanavigálok!';
            } else if (tabTarget && sectionSelector) {
                clickAttr = `onclick="navigateToSection('${tabTarget}','${sectionSelector}')" style="cursor:pointer;"`;
                title = 'Kattints → Mérési Adatok fül + megfelelő táblázat';
            }
            html += `<div ${clickAttr} style="display:flex; align-items:center; gap:6px; color:${color}; padding: 3px 0; ${fieldId || tabTarget ? 'cursor:pointer;' : ''} border-radius:4px;" title="${title}">
            <span>${icon}</span>
            <span style="flex:1; color: var(--text-primary);">${c.label}${reqBadge}</span>
            <span style="font-size:0.75rem; color: var(--text-secondary); max-width: 140px; text-align:right; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.hint}</span>
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
            el.style.borderColor = isOk ? '#10b981' : '#ef4444';
            el.style.boxShadow = isOk ? '0 0 0 2px rgba(16,185,129,0.2)' : '0 0 0 2px rgba(239,68,68,0.2)';
        };

        highlightField('instrumentType', !!(instrType && instrType.match(/\d/)));
        highlightField('instrumentCal', calOk);
        highlightField('customerName', !!clientName);
        highlightField('siteAddress', !!siteAddress);
        highlightField('inspectorName', !!inspName);

        const calHelper = document.getElementById('calHelper');
        if (calHelper && instrCal) {
            const escH = (s) => (window.VBF && window.VBF.sanitize && window.VBF.sanitize.escHtml) ? window.VBF.sanitize.escHtml(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const safeCal = escH(instrCal);
            const safeDays = escH(calDaysLeft);
            if (!calOk) {
                calHelper.innerHTML = `⚠️ <span style="color:#ef4444; font-weight:600;">LEJÁRT KALIBRÁLÁS!</span> — A kalibrálás (${safeCal}) a múltban van. "Megfelelő" minősítés NEM adható!`;
            } else if (calExpiringSoon) {
                calHelper.innerHTML = `⏳ <span style="color:#f59e0b; font-weight:600;">Kalibrálás hamarosan lejár!</span> — Lejárat: ${safeCal} (${safeDays} nap múlva). Érdemes időben újrakalibrálni.`;
            } else {
                calHelper.innerHTML = `✅ <span style="color:#10b981; font-weight:600;">Érvényes kalibrálás</span> — Lejárat: ${safeCal}`;
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
        el.style.boxShadow = '0 0 0 4px rgba(245,158,11,0.6)';
        el.style.borderColor = '#f59e0b';
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
            section.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.5)';
            setTimeout(() => { section.style.boxShadow = ''; }, 2500);
        }
    };

    setInterval(updateCompleteness, 2000);
    document.addEventListener('input', () => setTimeout(updateCompleteness, 300));
    document.addEventListener('change', () => setTimeout(updateCompleteness, 300));
    setTimeout(updateCompleteness, 1000);
}
