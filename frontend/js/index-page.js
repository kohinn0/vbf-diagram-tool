/**
 * Főoldal (index.html) – közös tokenek + Tailwind + landing + cookie.
 */
import '../css/tokens.css';
import '../css/tw.css';
import '../css/landing.css';
import '../css/cookie-consent.css';
import { initBugReportLinks } from './ui/bug-report.js';

document.addEventListener('DOMContentLoaded', () => {
    initBugReportLinks();
});
