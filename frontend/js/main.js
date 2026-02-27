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

// Más fájlok számára elérhető globális objektumok (a refaktorálás ezen fázisában még szükség lehet rá)
window.API_BASE_URL = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 VBF App Inicializálása (Moduláris)");

    // UI Komponensek
    initData();
    initSanitize();
    initThemeToggle();
    initTabs();
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
    const auth = initAuth();
    window.updateAuthUI = auth.updateAuthUI;

    // Offline rendszerek
    Storage.initOfflineSystem();

    // A Canvas inicializálása továbbra is be van töltve (még) a hagyományos módon,
    // így hagytuk neki, hogy lefusson a régi DOMContentLoaded logikában.
    // Amint az `app.js` is teljesen ES6 modullá lesz konvertálva, az itt kap helyet.
});
