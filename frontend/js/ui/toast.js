/**
 * Egységes toast értesítések (success / error / info).
 * Használat: window.showToast('Üzenet', 'success' | 'error' | 'info')
 */
const TOAST_DURATION_MS = 4000;
let toastTimeout = null;

function ensureContainer() {
    let el = document.getElementById('toast-container');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast-container';
        el.className = 'toast-container';
        document.body.appendChild(el);
    }
    return el;
}

function showToast(message, type = 'info') {
    const container = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION_MS);
}

export function initToast() {
    window.showToast = showToast;
}
