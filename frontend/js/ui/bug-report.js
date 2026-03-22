/** Béta: mailto hibabejelentés – URL + böngésző automatikusan a levélben. */
const BUG_REPORT_EMAIL = 'info@vbfpremium.hu';
const BUG_REPORT_SUBJECT = '[VBF Premium béta] Hibabejelentés';

export function buildBugReportMailto() {
    const body = [
        'Leírás (mit csináltál, mit vártál, mi történt):',
        '',
        '',
        '---',
        `Oldal: ${typeof location !== 'undefined' ? location.href : ''}`,
        `Időpont: ${new Date().toISOString()}`,
        `Böngésző: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
    ].join('\n');
    return `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent(BUG_REPORT_SUBJECT)}&body=${encodeURIComponent(body)}`;
}

export function initBugReportLinks(root = document) {
    root.querySelectorAll('[data-bug-report]').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const help = el.closest('.nav-help-dropdown');
            if (help) {
                help.classList.remove('is-open');
                const tr = help.querySelector('.nav-help-trigger');
                tr?.setAttribute('aria-expanded', 'false');
            }
            window.location.href = buildBugReportMailto();
        });
    });
}
