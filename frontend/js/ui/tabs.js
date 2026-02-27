export function initTabs() {
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            navTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-target');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
            } else {
                console.warn(`[Tabs] Pane not found for target: ${targetId}`);
            }

            // Fire custom event to let other modules (like canvas) know it should resize
            window.dispatchEvent(new CustomEvent('tabChanged', { detail: { targetId } }));
        });
    });
}
