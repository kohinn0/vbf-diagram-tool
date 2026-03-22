/**
 * Egységes toast értesítések (success / error / info).
 * Használat: window.showToast('Üzenet', 'success' | 'error' | 'info')
 */
const TOAST_DURATION_MS = 4000;
let toastTimeout = null;

const TOAST_BASE =
    'pointer-events-auto flex max-w-sm items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-panel)] px-4 py-3 text-[0.9rem] shadow-[var(--shadow-glass)] opacity-0 translate-y-2 transition-all duration-300';
const TOAST_BORDER = {
    success: 'border-l-4 border-l-[#6eb89a]',
    error: 'border-l-4 border-l-[var(--danger)]',
    info: 'border-l-4 border-l-[var(--primary)]'
};

function ensureContainer() {
    let el = document.getElementById('toast-container');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast-container';
        el.className =
            'pointer-events-none fixed bottom-6 right-6 z-[10000] flex flex-col gap-2 max-md:left-4 max-md:right-4';
        document.body.appendChild(el);
    }
    return el;
}

function showToast(message, type = 'info') {
    const container = ensureContainer();
    const toast = document.createElement('div');
    const border = TOAST_BORDER[type] || TOAST_BORDER.info;
    toast.className = `${TOAST_BASE} ${border}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span class="text-[1.1rem]">${icon}</span><span class="min-w-0 flex-1">${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-y-2');
        toast.classList.add('opacity-100', 'translate-y-0');
    });

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        toast.classList.remove('opacity-100', 'translate-y-0');
        setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION_MS);
}

export function initToast() {
    window.showToast = showToast;
}
