// A belépési pont
import { initTabs } from './ui/tabs.js';
import { initThemeToggle } from './ui/theme.js';
import { Storage } from './storage.js';
import { initData } from './ui/data.js';
import { initSanitize } from './ui/sanitize.js';
import { initDefects } from './ui/defects.js';
import { initCanvas } from './ui/canvas.js';
import { initPadfx } from './ui/padfx.js';
import { initAuth } from './ui/auth.js';
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

// Más fájlok számára elérhető globális objektumok (a refaktorálás ezen fázisában még szükség lehet rá)
// Ha üresen hagyjuk, az API modul window.location.origin-t fog használni (Vite proxy).
window.API_BASE_URL = '';

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 VBF App Inicializálása (Moduláris)");

    // Toast (korán, hogy showToast mindenhol elérhető legyen)
    initToast();
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
        if (!trigger || !wrapper) return;
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            wrapper.classList.toggle('is-open');
            trigger.setAttribute('aria-expanded', wrapper.classList.contains('is-open'));
        });
        document.addEventListener('click', () => {
            wrapper.classList.remove('is-open');
            trigger.setAttribute('aria-expanded', 'false');
        });
        if (btnStartTour) {
            btnStartTour.addEventListener('click', () => {
                wrapper.classList.remove('is-open');
                trigger.setAttribute('aria-expanded', 'false');
            });
        }
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
    const auth = initAuth();
    window.updateAuthUI = auth.updateAuthUI;

    // Offline rendszerek
    Storage.initOfflineSystem();

    // A Canvas inicializálása továbbra is be van töltve (még) a hagyományos módon,
    // így hagytuk neki, hogy lefusson a régi DOMContentLoaded logikában.
    // Amint az `app.js` is teljesen ES6 modullá lesz konvertálva, az itt kap helyet.
});
