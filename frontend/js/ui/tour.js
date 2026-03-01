export function initTour() {
    const overlay = document.getElementById('tourOverlay');
    const btnStart = document.getElementById('btnStartTour');
    if (!overlay || !btnStart) return;

    const titleEl = document.getElementById('tourTitle');
    const bodyEl = document.getElementById('tourBody');
    const btnPrev = document.getElementById('tourPrev');
    const btnNext = document.getElementById('tourNext');
    const btnClose = document.getElementById('tourClose');
    const dontShowCheckbox = document.getElementById('tourDontShow');

    const steps = [
        {
            id: 'welcome',
            title: '1/4 – Gyors áttekintés',
            body: 'Felül a fülekkel válthatsz a rajz, jegyzőkönyv adatok, hibajegyzék és mérések között. A jobb felső sarokban látod a belépést és az offline státuszt.',
        },
        {
            id: 'report',
            title: '2/4 – Jegyzőkönyv adatok kitöltése',
            body: 'A „Jegyzőkönyv adatok” fülön tudod kiválasztani a vizsgálat típusát, feltölteni az ügyfél / helyszín adatokat és beállítani a műszer adatait.',
            targetTab: 'tab-report',
        },
        {
            id: 'measurements',
            title: '3/4 – Mérések és PADFX import',
            body: 'A „Mérési adatok (Metrel)” fülön viheted fel kézzel a méréseket, vagy a Metrel PADFX fájlt importálhatod a gombbal.',
            targetTab: 'tab-measurements',
        },
        {
            id: 'cloud',
            title: '4/4 – Mentés és felhő',
            body: 'Ha be vagy jelentkezve, a jobb felső ☁️ gombbal menthetsz a felhőbe, a „Mentett ügyek” fülön pedig bármikor visszatöltheted őket.',
            targetTab: 'tab-cloud',
        },
    ];

    let currentIndex = 0;

    function switchToTab(targetId) {
        if (!targetId) return;
        const tabButton = document.querySelector(`.nav-tab[data-target="${targetId}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }

    function renderStep() {
        const step = steps[currentIndex];
        if (!step) return;

        if (titleEl) titleEl.textContent = step.title;
        if (bodyEl) bodyEl.textContent = step.body;
        switchToTab(step.targetTab);

        if (btnPrev) {
            btnPrev.disabled = currentIndex === 0;
            btnPrev.style.opacity = currentIndex === 0 ? '0.5' : '1';
        }
        if (btnNext) {
            btnNext.textContent = currentIndex === steps.length - 1 ? 'Befejezés' : 'Következő';
        }
    }

    function openTour(auto = false) {
        overlay.style.display = 'flex';
        currentIndex = 0;
        renderStep();
        if (auto && dontShowCheckbox) {
            dontShowCheckbox.checked = true;
        }
    }

    function closeTour() {
        overlay.style.display = 'none';
        if (dontShowCheckbox && dontShowCheckbox.checked) {
            try {
                localStorage.setItem('vbf_tour_dismissed', '1');
            } catch {
                // ignore storage errors
            }
        }
    }

    btnStart.addEventListener('click', () => openTour(false));
    btnClose?.addEventListener('click', () => closeTour());

    btnNext?.addEventListener('click', () => {
        if (currentIndex < steps.length - 1) {
            currentIndex += 1;
            renderStep();
        } else {
            closeTour();
        }
    });

    btnPrev?.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex -= 1;
            renderStep();
        }
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeTour();
        }
    });

    // Automatikus megjelenítés első használatkor (ha még nem tiltották le)
    try {
        const dismissed = localStorage.getItem('vbf_tour_dismissed') === '1';
        if (!dismissed) {
            setTimeout(() => openTour(true), 1200);
        }
    } catch {
        // ha nincs storage, csak manuális gombbal lehet indítani
    }
}

