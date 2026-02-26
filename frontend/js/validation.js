/**
 * validation.js — Szabványossági validáció és MEE minősítés
 * MSZ HD 60364-6, TvMI 7.7:2026.02.01, 40/2017. NGM, 54/2014. BM (OTSZ)
 * 
 * Exportált függvények:
 *   VBF.validation.validateZs(tr)           — Hurokellenállás automatikus ellenőrzés
 *   VBF.validation.validateRcd(tr)          — RCD kioldási idő ellenőrzés
 *   VBF.validation.validateBeforeSave()     — Pre-save stop-szabályok
 *   VBF.validation.autoDetectMEE()          — Automatikus MEE minősítés
 *   VBF.validation.calcNextInspection(cls)  — OTSZ következő felülvizsgálat dátum
 */

window.VBF = window.VBF || {};

VBF.validation = {
    // MCB kioldási szorzók: B → 5x, C → 10x, D → 20x
    MCB_MULTIPLIERS: { 'B': 5, 'C': 10, 'D': 20 },

    // Szabványos határértékek
    LIMITS: {
        RPE_MAX_OHM: 1.0,          // Védővezető folytonosság max [Ω]
        RISO_MIN_MOHM: 1.0,        // Szigetelési ellenállás min [MΩ]
        RCD_MAX_MS: 300,            // RCD max kioldási idő [ms]
        RCD_PERSONAL_MAX_MS: 40,    // RCD személyvédelmi max [ms]
        SELV_MAX_V: 50,             // SELV max feszültség [V AC]
        TOOL_RISO_MIN_MOHM: 2.0,   // Kéziszerszám Riso min [MΩ]
        EARTH_MAX_OHM: 10,         // Földelési ellenállás max [Ω]
        U0: 230,                    // Fázisfeszültség [V]
        SAFETY_FACTOR: 0.95         // Biztonsági szorzó (60364-6)
    },

    /**
     * Zs megengedett max érték számítása
     * Képlet: Zs ≤ (U₀ × 0.95) / Ia
     */
    calcMaxZs(curve, nominalAmps) {
        const mult = this.MCB_MULTIPLIERS[curve];
        if (!mult || !nominalAmps || nominalAmps <= 0) return null;
        const Ia = nominalAmps * mult;
        return (this.LIMITS.U0 * this.LIMITS.SAFETY_FACTOR) / Ia;
    },

    /**
     * MEE Kézikönyv hibakategória kulcsszavak
     */
    DEFECT_KEYWORDS: {
        A: ['életveszély', 'érintésvéd', 'pe vezető hiány', 'áramütés', 'halál',
            'tűzveszély', 'védővezető hiány', 'felületen feszültség', 'nincsen pe',
            'test feszültség', 'védőföldelés hiány', 'nincs földelés', 'beégett', 'ívhiba',
            'érinthető feszültség', 'leolvadt', 'kiégett'],
        B: ['szigetelés sérült', 'rcd nem', 'ávk nem', 'fi-relé nem', 'kioldási idő',
            'hurokellenállás', 'keresztmetszet nem', 'túlterhelés', 'zárlat',
            'védővezető folytonosság', 'rpe nem', 'hurokimpedancia', 'nem old ki',
            'olvadóbiztosító hiány', 'érintésvédelmi osztály'],
        C: ['dobozfedél', 'fedél hiány', 'csatlakozó laza', 'felirat hiány',
            'jelölés hiány', 'kötés laza', 'sorkapocs', 'takarólemez',
            'burkolat sérült', 'por', 'tisztítás', 'kopott'],
        D: ['vezetékszínezés', 'régi szabvány', 'elavult', 'korszerűtlen',
            'alumínium vezető', 'régi típus', 'nem szabványos szín',
            'téves színezés', 'nullázás']
    },

    /**
     * Szabvány hivatkozások mérési típusonként
     */
    STANDARDS: {
        RPE: 'MSZ HD 60364-6:2017 §61.3.2 (Védővezető folytonosság); MEE Kézikönyv M1; 40/2017. (XII.4.) NGM 5.§',
        RISO: 'MSZ HD 60364-6:2017 §61.3.3 (Szigetelési ellenállás); MEE Kézikönyv M6; TvMI 7.7:2026.02.01 §4.3',
        ZS: 'MSZ HD 60364-6:2017 §61.3.6 (Hurokimpedancia); MSZ HD 60364-4-41:2017 §411.4; MEE Kézikönyv M1',
        RCD: 'MSZ HD 60364-6:2017 §61.3.7 (ÁVK vizsgálat); MSZ EN 61008-1; MEE Kézikönyv M5',
        EPH: 'MSZ HD 60364-5-54:2011 §544 (EPH rendszer); MSZ HD 60364-4-41:2017 §411.3.1.2',
        SELV: 'MSZ HD 60364-4-41:2017 §414 (SELV/PELV); MSZ EN 61558-2-6; MEE Kézikönyv M2',
        TOOL: 'MSZ EN 60745-1 (Kéziszerszámok biztonsága); MEE Kézikönyv M3-M4; MSZ 1585:2021',
        FIRE: 'TvMI 7.7:2026.02.01 (Tűzvédelmi felülvizsgálat); 54/2014. (XII.5.) BM rendelet (OTSZ)',
        GENERAL: 'MSZ HD 60364-6:2017 (Villamos berendezések hitelesítése); 40/2017. (XII.4.) NGM (VMBSZ)'
    },

    /**
     * OTSZ felülvizsgálati ciklusidő években
     */
    INSPECTION_CYCLES: {
        'AK': 6,   // Alacsony kockázat (lakóépület)
        'KK': 3,   // Közepes kockázat (munkahely)
        'MK': 1,   // Magas kockázat (robbanásveszélyes)
        'NAK': 6   // Nagyon alacsony kockázat
    },

    // ═══════════════════════════════════════════
    // Validációs függvények
    // ═══════════════════════════════════════════

    /**
     * Hurokellenállás (Zs) automatikus ellenőrzés egy mérési táblázatsoron
     * @param {HTMLTableRowElement} tr — Táblázat sor
     * @returns {{ pass: boolean, measured: number, maxZs: number|null, message: string }}
     */
    validateZs(tr) {
        const device = tr.querySelector('.meas-device')?.value || '';
        const zsVal = parseFloat(tr.querySelector('.meas-zs')?.value);
        const passSelect = tr.querySelector('.meas-pass');

        if (isNaN(zsVal) || !device) {
            return { pass: null, measured: zsVal, maxZs: null, message: 'Hiányos adatok' };
        }

        // Karakter+szám kiolvasás: pl. "C16" → curve='C', In=16
        const curve = (device.toUpperCase().match(/[A-Z]+/)?.[0]) || '';
        const In = parseFloat(device.match(/[0-9.]+/)?.[0]);
        const maxZs = this.calcMaxZs(curve, In);

        if (maxZs === null) {
            return { pass: null, measured: zsVal, maxZs: null, message: `Ismeretlen karakterisztika: ${device}` };
        }

        const pass = zsVal <= maxZs;

        // Automatikus színezés és értékbeállítás
        if (passSelect) {
            passSelect.value = pass ? 'Igen' : 'Nem';
            tr.style.backgroundColor = pass ? '' : 'rgba(239, 68, 68, 0.1)';
        }

        return {
            pass,
            measured: zsVal,
            maxZs: Math.round(maxZs * 100) / 100,
            message: pass
                ? `Zs=${zsVal}Ω ≤ ${maxZs.toFixed(2)}Ω → MEGFELELT`
                : `Zs=${zsVal}Ω > ${maxZs.toFixed(2)}Ω → NEM FELELT MEG`
        };
    },

    /**
     * RCD kioldási idő automatikus ellenőrzés
     * @param {HTMLTableRowElement} tr — Táblázat sor
     * @returns {{ pass: boolean, measured: number, limit: number, message: string }}
     */
    validateRcd(tr) {
        const t1 = parseFloat(tr.querySelector('.meas-t1')?.value);
        const idn = tr.querySelector('.meas-idn')?.value || '';
        const passSelect = tr.querySelector('.meas-pass');

        if (isNaN(t1)) {
            return { pass: null, measured: t1, limit: null, message: 'Hiányzó kioldási idő' };
        }

        // 30mA → személyvédelem (40ms), egyéb → általános (300ms)
        const isPersonal = idn.includes('30') || parseInt(idn) <= 30;
        const limit = isPersonal ? this.LIMITS.RCD_PERSONAL_MAX_MS : this.LIMITS.RCD_MAX_MS;
        const pass = t1 <= limit;

        if (passSelect) {
            passSelect.value = pass ? 'Igen' : 'Nem';
            tr.style.backgroundColor = pass ? '' : 'rgba(239, 68, 68, 0.1)';
        }

        return {
            pass,
            measured: t1,
            limit,
            message: pass
                ? `t=${t1}ms ≤ ${limit}ms → MEGFELELT`
                : `t=${t1}ms > ${limit}ms → NEM FELELT MEG`
        };
    },

    /**
     * Védővezető folytonosság (Rpe) automatikus ellenőrzés
     * @param {HTMLTableRowElement} tr — Táblázat sor
     * @returns {{ pass: boolean, measured: number, message: string }}
     */
    validateRpe(tr) {
        const val = parseFloat(tr.querySelector('.meas-val')?.value);
        const passSelect = tr.querySelector('.meas-pass');

        if (isNaN(val)) {
            return { pass: null, measured: val, message: 'Hiányzó mérési érték' };
        }

        const pass = val <= this.LIMITS.RPE_MAX_OHM;

        if (passSelect) {
            passSelect.value = pass ? 'Igen' : 'Nem';
            tr.style.backgroundColor = pass ? '' : 'rgba(239, 68, 68, 0.1)';
        }

        return {
            pass,
            measured: val,
            message: pass
                ? `Rpe=${val}Ω ≤ ${this.LIMITS.RPE_MAX_OHM}Ω → MEGFELELT`
                : `Rpe=${val}Ω > ${this.LIMITS.RPE_MAX_OHM}Ω → NEM FELELT MEG`
        };
    },

    /**
     * Szigetelési ellenállás (Riso) automatikus ellenőrzés
     * @param {HTMLTableRowElement} tr — Táblázat sor
     * @returns {{ pass: boolean, minValue: number, message: string }}
     */
    validateRiso(tr) {
        const ln = parseFloat(tr.querySelector('.meas-ln')?.value) || Infinity;
        const lpe = parseFloat(tr.querySelector('.meas-lpe')?.value) || Infinity;
        const npe = parseFloat(tr.querySelector('.meas-npe')?.value) || Infinity;
        const passSelect = tr.querySelector('.meas-pass');

        const minValue = Math.min(ln, lpe, npe);

        if (!isFinite(minValue)) {
            return { pass: null, minValue: null, message: 'Hiányzó mérési értékek' };
        }

        const pass = minValue >= this.LIMITS.RISO_MIN_MOHM;

        if (passSelect) {
            passSelect.value = pass ? 'Igen' : 'Nem';
            tr.style.backgroundColor = pass ? '' : 'rgba(239, 68, 68, 0.1)';
        }

        return {
            pass,
            minValue,
            message: pass
                ? `Riso min=${minValue}MΩ ≥ ${this.LIMITS.RISO_MIN_MOHM}MΩ → MEGFELELT`
                : `Riso min=${minValue}MΩ < ${this.LIMITS.RISO_MIN_MOHM}MΩ → NEM FELELT MEG`
        };
    },

    /**
     * Pre-save validáció — ellenőrzi a kötelező mezőket mentés előtt
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validateBeforeSave() {
        const errors = [];

        // Kötelező fejléc mezők
        const requiredFields = [
            { selector: '#documentTitle', label: 'Jegyzőkönyv címe' },
            { selector: '#clientName', label: 'Megrendelő neve' },
            { selector: '#siteAddress', label: 'Vizsgálat helyszíne (cím)' },
            { selector: '#inspectionDate', label: 'Vizsgálat dátuma' },
            { selector: '#inspectorName', label: 'Felülvizsgáló neve' }
        ];

        requiredFields.forEach(({ selector, label }) => {
            const el = document.querySelector(selector);
            if (!el || !el.value.trim()) {
                errors.push(`❌ Hiányzó kötelező mező: ${label}`);
                if (el) el.style.borderColor = '#ef4444';
            } else {
                if (el) el.style.borderColor = '';
            }
        });

        // Kalibrálási dátum ellenőrzés
        const calDateEl = document.querySelector('#calibrationDate');
        if (calDateEl && calDateEl.value) {
            const calDate = new Date(calDateEl.value);
            if (calDate < new Date()) {
                errors.push('⚠️ A mérőműszer kalibrálása lejárt! Megfelelő minősítés nem adható ki lejárt kalibrálással.');
            }
        }

        // Ha van "Nem" jelölésű mérés, figyelmeztetés (nem blokkoló)
        const failedMeasurements = document.querySelectorAll('.meas-pass');
        let failCount = 0;
        failedMeasurements.forEach(sel => {
            if (sel.value === 'Nem') failCount++;
        });
        if (failCount > 0) {
            errors.push(`⚠️ ${failCount} db "Nem megfelelő" mérés található — a hibajegyzékbe történő felvétel ajánlott.`);
        }

        return {
            valid: errors.filter(e => e.startsWith('❌')).length === 0,
            errors
        };
    },

    /**
     * Automatikus MEE hibakategória meghatározás a hiba leírása alapján
     * @param {string} description — Hiba leírás szöveg
     * @returns {{ category: string, categoryName: string }}
     */
    autoDetectMEE(description) {
        if (!description || typeof description !== 'string') {
            return { category: 'C', categoryName: 'Karbantartás szintű' };
        }

        const desc = description.toLowerCase();

        // A → Azonnali életveszély
        if (this.DEFECT_KEYWORDS.A.some(kw => desc.includes(kw))) {
            return { category: 'A', categoryName: 'Azonnali életveszély / tűzveszély' };
        }
        // B → Súlyos biztonsági hiba
        if (this.DEFECT_KEYWORDS.B.some(kw => desc.includes(kw))) {
            return { category: 'B', categoryName: 'Súlyos biztonsági hiba' };
        }
        // D → Korszerűtlenség (előbb vizsgáljuk mint C, mert szűkebb)
        if (this.DEFECT_KEYWORDS.D.some(kw => desc.includes(kw))) {
            return { category: 'D', categoryName: 'Korszerűtlenség / régi szabvány' };
        }
        // C → Karbantartás szintű
        if (this.DEFECT_KEYWORDS.C.some(kw => desc.includes(kw))) {
            return { category: 'C', categoryName: 'Karbantartás szintű hiba' };
        }

        // Default → C
        return { category: 'C', categoryName: 'Karbantartás szintű (alapértelmezett)' };
    },

    /**
     * OTSZ következő felülvizsgálat dátum számítása
     * @param {string} riskClass — Kockázati osztály: 'AK', 'KK', 'MK', 'NAK'
     * @param {Date} [fromDate] — Kezdő dátum (alapértelmezett: ma)
     * @returns {{ nextDate: Date, years: number, formattedDate: string }}
     */
    calcNextInspection(riskClass, fromDate) {
        const years = this.INSPECTION_CYCLES[riskClass] || 6;
        const from = fromDate || new Date();
        const nextDate = new Date(from);
        nextDate.setFullYear(nextDate.getFullYear() + years);

        const pad = n => String(n).padStart(2, '0');
        const formattedDate = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(nextDate.getDate())}`;

        return { nextDate, years, formattedDate };
    },

    /**
     * Összes mérési táblázat automatikus validálása (batch)
     * @returns {{ total: number, passed: number, failed: number, skipped: number }}
     */
    validateAllMeasurements() {
        let total = 0, passed = 0, failed = 0, skipped = 0;

        // RPE
        document.querySelectorAll('#table-rpe tbody tr').forEach(tr => {
            total++;
            const result = this.validateRpe(tr);
            if (result.pass === true) passed++;
            else if (result.pass === false) failed++;
            else skipped++;
        });

        // Riso
        document.querySelectorAll('#table-insulation tbody tr').forEach(tr => {
            total++;
            const result = this.validateRiso(tr);
            if (result.pass === true) passed++;
            else if (result.pass === false) failed++;
            else skipped++;
        });

        // Zs (Hurok)
        document.querySelectorAll('#table-loop tbody tr').forEach(tr => {
            total++;
            const result = this.validateZs(tr);
            if (result.pass === true) passed++;
            else if (result.pass === false) failed++;
            else skipped++;
        });

        // RCD
        document.querySelectorAll('#table-rcd tbody tr').forEach(tr => {
            total++;
            const result = this.validateRcd(tr);
            if (result.pass === true) passed++;
            else if (result.pass === false) failed++;
            else skipped++;
        });

        console.log(`[VBF Validation] Összesítés: ${total} mérés, ${passed} megfelelt, ${failed} nem felelt meg, ${skipped} kihagyva`);

        return { total, passed, failed, skipped };
    }
};

console.log('[VBF] validation.js betöltve — szabványossági konstansok és validáció aktív');
