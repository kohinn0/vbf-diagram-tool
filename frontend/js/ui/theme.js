export function initThemeToggle() {
    const btnTheme = document.getElementById('btnToggleTheme');
    const toggleTheme = () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        if (btnTheme) btnTheme.innerHTML = isLight ? '🌙 Sötét' : '☀️ Világos';
    };

    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        if (btnTheme) btnTheme.innerHTML = '🌙 Sötét';
    }
    btnTheme?.addEventListener('click', toggleTheme);
}
