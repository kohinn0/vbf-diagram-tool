/**
 * Főoldal (index.html) – reset + tokenek + Tailwind + landing + kosár + cookie.
 */
import '../css/reset.css';
import '../css/tokens.css';
import '../css/tw.css';
import '../css/cart-drawer.css';
import '../css/landing.css';
import '../css/landing-index.css';
import '../css/cookie-consent.css';
import { initBugReportLinks } from './ui/bug-report.js';

document.addEventListener('DOMContentLoaded', () => {
    initBugReportLinks();
});
