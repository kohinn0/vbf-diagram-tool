/**
 * sanitize.js — XSS és input sanitizáció
 * Minden felhasználói inputot ezen a modulon kell átvezetni DOM-ba illesztés előtt.
 * 
 * Használat:
 *   <script src="js/sanitize.js"></script>
 *   const safe = VBF.sanitize.html(userInput);
 */

export function initSanitize() {
    window.VBF = window.VBF || {};

    VBF.sanitize = {
        /**
         * HTML entitások escape-elése — megakadályozza az XSS-t
         * @param {string} str — Nyers input
         * @returns {string} — Biztonságos szöveg (HTML tag-ek semlegesítve)
         */
        html(str) {
            if (typeof str !== 'string') return '';
            const div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        },

        /**
         * Visszaalakítja az escape-elt szöveget eredeti formára (pl. mentett adatoknál)
         * @param {string} str — Escape-elt szöveg
         * @returns {string} — Eredeti szöveg
         */
        unescape(str) {
            if (typeof str !== 'string') return '';
            const div = document.createElement('div');
            div.innerHTML = str;
            return div.textContent || div.innerText || '';
        },

        /**
         * Attributum value sanitizálás (href, src, stb.)
         * Megakadályozza a javascript: és data: URL injection-t
         */
        attr(str) {
            if (typeof str !== 'string') return '';
            // Block dangerous protocols
            if (/^\s*(javascript|data|vbscript):/i.test(str)) {
                return '';
            }
            return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        },

        /**
         * Telefonszám validáció
         */
        isPhone(str) {
            return /^[\d\s+\-()]{6,20}$/.test(str);
        },

        /**
         * Email cím validáció
         */
        isEmail(str) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
        },

        /**
         * Szám validáció megadott tartományban
         */
        isNumberInRange(val, min, max) {
            const n = parseFloat(val);
            return !isNaN(n) && n >= min && n <= max;
        },

        /**
         * Mérési érték validáció: szám és nem negatív 
         */
        isMeasurement(val) {
            const n = parseFloat(val);
            return !isNaN(n) && n >= 0;
        },

        /**
         * Dátum formátum ellenőrzés (YYYY-MM-DD)
         */
        isValidDate(str) {
            if (typeof str !== 'string') return false;
            const d = new Date(str);
            return !isNaN(d.getTime());
        },

        /**
         * Maximális hossz ellenőrzés — megakadályozza a túl hosszú inputokat
         */
        truncate(str, maxLen = 500) {
            if (typeof str !== 'string') return '';
            return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
        },

        /**
         * Fájlnév sanitizálás (file upload)
         */
        filename(str) {
            if (typeof str !== 'string') return 'file';
            return str.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ._\-\s]/g, '_').substring(0, 100);
        },

        /**
         * JSON parse biztonságosan (try-catch wrapper)
         */
        parseJSON(str, fallback = null) {
            try {
                return JSON.parse(str);
            } catch {
                return fallback;
            }
        }
    };

    // Globális segéd: innerHTML helyett használható textContent beállítás
    VBF.safeSetText = function (elementOrId, text) {
        const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
        if (el) el.textContent = text || '';
    };

    // Automatikus sanitizáció a defect és measurement inputokon
    document.addEventListener('DOMContentLoaded', () => {
        // Figyelmeztetés ha valaki <script> taget próbál beírni
        document.addEventListener('input', (e) => {
            const target = e.target;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                const val = target.value;
                if (/<script|<iframe|javascript:|on\w+\s*=/i.test(val)) {
                    target.value = val.replace(/<script.*?>.*?<\/script>/gi, '')
                        .replace(/<iframe.*?>.*?<\/iframe>/gi, '')
                        .replace(/javascript:/gi, '')
                        .replace(/on\w+\s*=/gi, '');
                    console.warn('[VBF Security] Biztonsági szűrés: gyanús tartalom eltávolítva egy mezőből.');
                }
            }
        });
    });

    console.log('[VBF] sanitize.js betöltve — XSS védelem aktív');
}
