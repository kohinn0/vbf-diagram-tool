/**
 * Cég admin / Webshop réteg: Dashboard + Admin. Külön HTML (shop.html).
 */
import { initTabs } from './ui/tabs.js';
import { initThemeToggle } from './ui/theme.js';
import { initSanitize } from './ui/sanitize.js';
import { initAuth } from './ui/auth.js';
import { initAdmin } from './ui/admin.js';
import { initDashboard } from './ui/dashboard.js';
import { initToast } from './ui/toast.js';

window.API_BASE_URL = '';

document.addEventListener('DOMContentLoaded', () => {
    initToast();
    initSanitize();
    initThemeToggle();
    initTabs();
    initAdmin();
    initDashboard();
    const auth = initAuth();
    window.updateAuthUI = auth.updateAuthUI;

    // Dashboard tartalom betöltése (shop első tabja aktív)
    if (window.VBF && window.VBF.dashboard && typeof window.VBF.dashboard.init === 'function') {
        setTimeout(() => window.VBF.dashboard.init(), 500);
    }
});
