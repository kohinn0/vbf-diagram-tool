// A belépési pont: reset → tokenek → Tailwind → app shell (style.css + modul importok)
import '../css/reset.css';
import '../css/tokens.css';
import '../css/tw.css';
import '../css/style.css';
import { initTabs } from './ui/tabs.js';
import { initThemeToggle } from './ui/theme.js';
import { Storage } from './storage.js';
import { initData } from './ui/data.js';
import { initSanitize } from './ui/sanitize.js';
import { initDefects } from './ui/defects.js';
import { initCanvas } from './ui/canvas.js';
import { initPadfx } from './ui/padfx.js';
import { initAuth } from './ui/auth.js';
import { initCart } from './ui/cart.js';
import { initAdmin } from './ui/admin.js';
import { initJobs } from './ui/jobs.js';
import { initMasterData } from './ui/masterdata.js';
import { initReports } from './ui/reports.js';
import { initCompleteness } from './ui/completeness.js';
import { initMeasurements } from './ui/measurements.js';
import { initDashboard } from './ui/dashboard.js';
import { initSiteTree } from './ui/sitetree.js';
import { initAutoDiagram } from './ui/autodiagram.js';
import { initTour } from './ui/tour.js';
import { initToast } from './ui/toast.js';
import { initBugReportLinks } from './ui/bug-report.js';

// Más fájlok számára elérhető globális objektumok (a refaktorálás ezen fázisában még szükség lehet rá)
// Ha üresen hagyjuk, az API modul window.location.origin-t fog használni (Vite proxy).
window.API_BASE_URL = '';

document.addEventListener('DOMContentLoaded', () => {
    console.log('VBF App inicializálása (moduláris)');

    // Toast (korán, hogy showToast mindenhol elérhető legyen)
    initToast();
    
    // Globális alert felülírás, így az összes legacy "alert(...)" szép toast-ként jelenik meg:
    const origAlert = window.alert;
    window.alert = function(msg) {
        if (typeof window.showToast === 'function') {
            const lowMsg = (msg || '').toString().toLowerCase();
            let type = 'info';
            if (['hiba', 'sikertelen', 'nem ', 'érvénytelen', 'tilos', 'kötelező'].some(w => lowMsg.includes(w))) type = 'error';
            else if (['siker', 'kész', 'mentve', 'létrehozva'].some(w => lowMsg.includes(w))) type = 'success';
            window.showToast(msg, type);
        } else {
            origAlert(msg);
        }
    };
    
    initBugReportLinks();
    // UI Komponensek
    initData();
    initSanitize();
    initThemeToggle();
    initTabs();
    (function initReportActionsDropdown() {
        const trigger = document.getElementById('reportActionsTrigger');
        const wrapper = document.querySelector('.report-actions-wrapper');
        if (!trigger || !wrapper) return;
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.classList.toggle('report-actions-open');
            trigger.setAttribute('aria-expanded', wrapper.classList.contains('report-actions-open'));
        });
        document.addEventListener('click', () => {
            wrapper.classList.remove('report-actions-open');
            trigger.setAttribute('aria-expanded', 'false');
        });
    })();
    (function initHelpDropdown() {
        const trigger = document.getElementById('navHelpTrigger');
        const wrapper = document.querySelector('.nav-help-dropdown');
        const btnStartTour = document.getElementById('btnStartTour');
        const btnShowKeyboardShortcuts = document.getElementById('btnShowKeyboardShortcuts');
        const keyboardModal = document.getElementById('keyboardShortcutsModal');
        const btnCloseKeyboardShortcuts = document.getElementById('btnCloseKeyboardShortcuts');
        const closeHelp = () => {
            wrapper?.classList.remove('is-open');
            trigger?.setAttribute('aria-expanded', 'false');
        };
        if (!trigger || !wrapper) return;
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.classList.toggle('is-open');
            trigger.setAttribute('aria-expanded', wrapper.classList.contains('is-open'));
        });
        document.addEventListener('click', () => {
            closeHelp();
        });
        if (btnStartTour) {
            btnStartTour.addEventListener('click', () => closeHelp());
        }
        if (btnShowKeyboardShortcuts && keyboardModal) {
            btnShowKeyboardShortcuts.addEventListener('click', () => {
                closeHelp();
                keyboardModal.classList.remove('is-hidden');
                keyboardModal.setAttribute('aria-hidden', 'false');
            });
        }
        if (btnCloseKeyboardShortcuts && keyboardModal) {
            btnCloseKeyboardShortcuts.addEventListener('click', () => {
                keyboardModal.classList.add('is-hidden');
                keyboardModal.setAttribute('aria-hidden', 'true');
            });
        }
        if (keyboardModal) {
            keyboardModal.addEventListener('click', (e) => {
                if (e.target === keyboardModal) {
                    keyboardModal.classList.add('is-hidden');
                    keyboardModal.setAttribute('aria-hidden', 'true');
                }
            });
        }
    })();

    (function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const inInput = e.target.closest('input, textarea, select, [contenteditable="true"]');
            if (inInput) return;
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                const btn = document.getElementById('btnSaveCloud');
                if (btn && btn.offsetParent) btn.click();
            }
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                const btn = document.getElementById('btnExportWord');
                if (btn && btn.offsetParent) btn.click();
            }
        });
    })();
    initDefects();
    initCanvas();
    initPadfx();
    initAdmin();
    initJobs();
    initMasterData();
    initReports();
    initCompleteness();
    initMeasurements();
    initDashboard();
    initSiteTree();
    initAutoDiagram();
    initTour();
    initCart();
    const auth = initAuth();
    window.updateAuthUI = auth.updateAuthUI;

    // Offline rendszerek
    Storage.initOfflineSystem();

    // Utolsó jegyzőkönyv folytatása: ha van mentett id és be vagy jelentkezve, kérdezzük meg
    setTimeout(() => {
        const lastId = localStorage.getItem('vbf_last_report_id');
        if (lastId && !window.currentSavedReportId && window.currentToken && confirm('Folytatod az utolsó jegyzőkönyvet?')) {
            const id = parseInt(lastId, 10);
            if (!isNaN(id) && typeof window.loadReport === 'function') window.loadReport(id);
            return;
        }
        // Piszkozat: ha nincs betöltött jegyzőkönyv, és van mentett piszkozat
        try {
            const draft = localStorage.getItem('vbf_draft');
            if (draft && !window.currentSavedReportId && typeof window.loadDraftIntoUI === 'function' && confirm('Van mentett piszkozat. Betöltöd?')) {
                window.loadDraftIntoUI();
            }
        } catch (_) {}
    }, 800);

    // A Canvas inicializálása továbbra is be van töltve (még) a hagyományos módon,
    // így hagytuk neki, hogy lefusson a régi DOMContentLoaded logikában.
    // Amint az `app.js` is teljesen ES6 modullá lesz konvertálva, az itt kap helyet.
});
