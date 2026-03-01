export function initTabs() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const trigger = document.getElementById('navSectionTrigger');
    const dropdown = document.getElementById('navSectionDropdown');
    const labelEl = document.getElementById('navSectionLabel');
    const dropdownWrap = document.querySelector('.nav-section-dropdown');

    function setSectionLabel(text) {
        if (labelEl && text) labelEl.textContent = text;
    }

    function openDropdown() {
        if (!dropdownWrap || !dropdown) return;
        dropdownWrap.classList.add('is-open');
        if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown() {
        if (!dropdownWrap || !dropdown) return;
        dropdownWrap.classList.remove('is-open');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }

    function syncLabelFromActive() {
        const active = document.querySelector('.nav-tab.active');
        if (active && labelEl) {
            const text = active.getAttribute('data-section-label') || active.textContent?.trim() || '';
            if (text) labelEl.textContent = text;
        }
    }

    syncLabelFromActive();

    if (trigger && dropdownWrap) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownWrap.classList.toggle('is-open');
            const open = dropdownWrap.classList.contains('is-open');
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }

    document.addEventListener('click', (e) => {
        if (dropdownWrap && !dropdownWrap.contains(e.target)) closeDropdown();
    });

    navTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (tab.getAttribute('href')) {
                closeDropdown();
                return; /* external link (shop) */
            }
            e.preventDefault?.();
            const targetId = tab.getAttribute('data-target');

            navTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');

            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
            } else {
                console.warn(`[Tabs] Pane not found for target: ${targetId}`);
            }

            setSectionLabel(tab.getAttribute('data-section-label') || tab.textContent?.trim());
            closeDropdown();
            window.dispatchEvent(new CustomEvent('tabChanged', { detail: { targetId } }));
            if (targetId === 'tab-defects' && typeof window.refreshDefectLocationDatalist === 'function') window.refreshDefectLocationDatalist();
        });
    });
}
