export function initDashboard() {
    window.VBF = window.VBF || {};

    VBF.dashboard = {
        charts: {},

        async init() {
            const container = document.getElementById('dashboardContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center gap-4 py-16 text-[var(--text-muted)]">
                    <div class="h-10 w-10 animate-spin rounded-full border-[3px] border-[color-mix(in_srgb,var(--text-main)_10%,transparent)] border-t-[var(--primary)]"></div>
                    <p>Irányítópult betöltése…</p>
                </div>`;

            try {
                const [statsRes, inspRes] = await Promise.all([
                    this.fetchJSON('/api/dashboard/stats'),
                    this.fetchJSON('/api/dashboard/upcoming-inspections?days=90')
                ]);

                if (!statsRes) {
                    container.innerHTML = '<p class="px-8 py-12 text-center text-[var(--text-muted)]">Jelentkezz be ADMIN fiókkal az Irányítópult megtekintéséhez.</p>';
                    return;
                }

                this.render(container, statsRes, inspRes);
            } catch (err) {
                console.error('Dashboard error:', err);
                container.innerHTML = '<p class="px-8 py-12 text-center text-[var(--danger)]">Hiba az irányítópult betöltésekor: ' + err.message + '</p>';
            }
        },

        async fetchJSON(path) {
            const token = localStorage.getItem('vbf_token');
            if (!token) return null;

            const base = window.API_BASE_URL || window.location.origin;
            const res = await fetch(`${base}${path}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 403) return null;
                throw new Error(`HTTP ${res.status}`);
            }
            return res.json();
        },

        render(container, stats, inspections) {
            container.innerHTML = '';

            const rate = Math.min(100, Math.max(0, Number(stats.result_stats?.pass_rate) || 0));
            const coneBg = `conic-gradient(#6eb89a 0deg, #6eb89a ${rate * 3.6}deg, rgba(255,255,255,0.08) ${rate * 3.6}deg)`;

            const header = document.createElement('div');
            header.className = 'mb-5';
            header.innerHTML = `
                <h2 class="mb-1 text-2xl font-bold text-[var(--text-main)]">📊 Üzleti Irányítópult</h2>
                <p class="text-[0.95rem] text-[var(--text-muted)]">Átfogó statisztikák és aktuális feladatok</p>
            `;
            container.appendChild(header);

            const kpiGrid = document.createElement('div');
            kpiGrid.className = 'mb-8 grid grid-cols-2 gap-4 lg:auto-rows-fr lg:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]';
            kpiGrid.innerHTML = `
                ${this._kpiCard('📋', 'Összes jegyzőkönyv', stats.total_reports, 'var(--primary)')}
                ${this._kpiCard('📅', 'Havi új dokumentumok', stats.monthly_reports, 'var(--accent)')}
                ${this._kpiCard('✅', 'Lezárt (véglegesített)', stats.finalized_reports, 'var(--success-muted)')}
                ${this._kpiCard('📝', 'Piszkozat (vázlat)', stats.draft_reports, '#8b7ab8')}
                ${this._kpiCard('👥', 'Aktív munkatársak', stats.active_users, '#5a9eaa')}
                ${this._kpiCard('📌', 'Folyamatban lévő munkák', stats.pending_jobs, '#c97b8a')}
            `;
            container.appendChild(kpiGrid);

            const chartsRow = document.createElement('div');
            chartsRow.className = 'mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2';
            chartsRow.innerHTML = `
                <div class="panel-glass rounded-[var(--radius)] p-6">
                    <h3 class="mb-4 text-base font-semibold text-[var(--text-main)]">📈 Havi trendek (utolsó 12 hónap)</h3>
                    <div class="relative h-[220px] w-full"><canvas id="chartMonthlyTrend"></canvas></div>
                </div>
                <div class="panel-glass rounded-[var(--radius)] p-6">
                    <h3 class="mb-4 text-base font-semibold text-[var(--text-main)]">🎯 Minősítések megoszlása</h3>
                    <div class="relative h-[220px] w-full"><canvas id="chartQualification"></canvas></div>
                </div>
            `;
            container.appendChild(chartsRow);

            const analyticsRow = document.createElement('div');
            analyticsRow.className = 'mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2';
            analyticsRow.innerHTML = `
                <div class="panel-glass rounded-[var(--radius)] p-6">
                    <h3 class="mb-4 text-base font-semibold text-[var(--text-main)]">⚠️ Hibakategóriák (MEE szerint)</h3>
                    <div class="relative h-[220px] w-full"><canvas id="chartDefects"></canvas></div>
                </div>
                <div class="panel-glass rounded-[var(--radius)] p-6">
                    <h3 class="mb-4 text-base font-semibold text-[var(--text-main)]">📊 Mérési statisztikák</h3>
                    <div class="flex flex-col items-center gap-8 py-4 lg:flex-row lg:items-center">
                        <div class="relative flex h-[7.5rem] w-[7.5rem] shrink-0 flex-col items-center justify-center rounded-full" style="background: ${coneBg}">
                            <div class="absolute inset-[10px] z-0 rounded-full bg-[var(--bg-panel)]"></div>
                            <span class="relative z-[1] text-2xl font-bold text-[var(--success-muted)]">${rate}%</span>
                            <span class="relative z-[1] text-[0.65rem] uppercase tracking-wide text-[var(--text-muted)]">Átmenési arány</span>
                        </div>
                        <div class="flex w-full min-w-0 flex-col gap-2">
                            <div class="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,white_3%,transparent)] px-3 py-2 text-[0.9rem] text-[var(--text-muted)]">✅ Megfelelt: <strong class="text-[var(--text-main)]">${stats.result_stats?.passed || 0}</strong></div>
                            <div class="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,white_3%,transparent)] px-3 py-2 text-[0.9rem] text-[var(--text-muted)]">❌ Nem felelt meg: <strong class="text-[var(--text-main)]">${stats.result_stats?.failed || 0}</strong></div>
                            <div class="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,white_3%,transparent)] px-3 py-2 text-[0.9rem] text-[var(--text-muted)]">📏 Összes mérés: <strong class="text-[var(--text-main)]">${stats.result_stats?.total_measurements || 0}</strong></div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(analyticsRow);

            if (inspections) {
                const inspSection = document.createElement('div');
                inspSection.className = 'panel-glass mb-8 rounded-[var(--radius)] p-6';
                inspSection.innerHTML = `
                    <h3 class="mb-4 text-[1.1rem] font-semibold text-[var(--text-main)]">🔔 Közelgő és lejárt felülvizsgálatok</h3>
                    <div class="mb-6 flex flex-wrap gap-3">
                        <span class="inline-block rounded-full border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] px-3 py-1 text-[0.8rem] font-semibold text-[var(--danger)]">${inspections.total_overdue || 0} lejárt</span>
                        <span class="inline-block rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] px-3 py-1 text-[0.8rem] font-semibold text-[var(--accent)]">${inspections.total_upcoming || 0} közelgő (90 nap)</span>
                    </div>
                    <div class="flex flex-col gap-2" id="dashInspList"></div>
                `;
                container.appendChild(inspSection);

                const listEl = inspSection.querySelector('#dashInspList');
                const allItems = [...(inspections.overdue || []), ...(inspections.upcoming || [])];

                if (allItems.length === 0) {
                    listEl.innerHTML = '<p class="p-4 text-[var(--text-muted)]">Nincs közelgő felülvizsgálat a következő 90 napban. 🎉</p>';
                } else {
                    allItems.forEach(item => {
                        const isOverdue = item.status === 'LEJÁRT';
                        const row = document.createElement('div');
                        row.className = [
                            'flex flex-col gap-3 rounded-[var(--radius-sm)] border-l-[3px] p-3 transition-colors hover:bg-[color-mix(in_srgb,white_6%,transparent)] sm:flex-row sm:items-center sm:justify-between',
                            isOverdue
                                ? 'border-l-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_5%,transparent)]'
                                : 'border-l-[var(--accent)] bg-[color-mix(in_srgb,white_3%,transparent)]'
                        ].join(' ');
                        row.innerHTML = `
                            <div class="min-w-0 flex-1">
                                <strong class="block truncate text-[0.95rem] text-[var(--text-main)]">${item.site_address || item.title}</strong>
                                <span class="text-[0.8rem] text-[var(--text-muted)]">${item.customer_name || 'Ismeretlen'} · ${(item.report_type || '').toUpperCase()} · ${item.otsz_class || ''}</span>
                            </div>
                            <div class="shrink-0 text-left sm:text-right">
                                <span class="block text-[0.85rem] font-semibold ${isOverdue ? 'text-[var(--danger)]' : 'text-[var(--accent)]'}">
                                    ${isOverdue ? Math.abs(item.days_until) + ' napja lejárt!' : item.days_until + ' nap múlva'}
                                </span>
                                <span class="text-[0.75rem] text-[var(--text-muted)]">${item.next_inspection_date}</span>
                            </div>
                            <button type="button" class="btn btn-primary btn-small !m-0 w-full shrink-0 !min-h-9 sm:mt-0 sm:w-auto" 
                                    onclick="VBF.dashboard.sendReminder(${item.report_id})"
                                    title="Értesítés e-mail küldése">
                                ✉️ Értesítés küldése
                            </button>
                        `;
                        listEl.appendChild(row);
                    });
                }
            }

            requestAnimationFrame(() => {
                this._renderMonthlyTrend(stats.monthly_trend || []);
                this._renderQualification(stats.result_stats?.qualification_breakdown || {});
                this._renderDefects(stats.defect_stats?.category_breakdown || {});
            });
        },

        _kpiCard(icon, label, value, color) {
            return `
                <div class="panel-glass relative overflow-hidden rounded-[var(--radius)] p-5 text-center transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg" style="color: ${color}">
                    <div class="pointer-events-none absolute inset-x-0 top-0 h-[3px] opacity-40" style="background: currentColor"></div>
                    <div class="mb-2 text-[2rem]">${icon}</div>
                    <div class="mb-1 text-[2.2rem] font-bold leading-none">${value || 0}</div>
                    <div class="text-[0.8rem] uppercase tracking-wide text-[var(--text-muted)]">${label}</div>
                </div>`;
        },

        _renderMonthlyTrend(data) {
            const ctx = document.getElementById('chartMonthlyTrend');
            if (!ctx) return;

            const months = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sze', 'Okt', 'Nov', 'Dec'];
            const labels = data.map(d => months[d.month - 1] + ' ' + d.year);
            const values = data.map(d => d.count);

            if (window.Chart) {
                this.charts.trend = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Jegyzőkönyvek',
                            data: values,
                            backgroundColor: 'rgba(74, 158, 196, 0.5)',
                            borderColor: 'rgba(90, 147, 173, 0.95)',
                            borderWidth: 1,
                            borderRadius: 6,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: { color: '#94a3b8', stepSize: 1 },
                                grid: { color: 'rgba(255,255,255,0.05)' }
                            },
                            x: {
                                ticks: { color: '#94a3b8' },
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        },

        _renderQualification(data) {
            const ctx = document.getElementById('chartQualification');
            if (!ctx) return;

            const labels = ['Megfelelő', 'C Változat', 'B Változat', 'Nem megfelelő'];
            const values = [
                data['MEGFELELŐ'] || 0,
                data['VÁLTOZAT_C'] || 0,
                data['VÁLTOZAT_B'] || 0,
                data['NEM MEGFELELŐ'] || 0,
            ];
            const colors = ['#6eb89a', '#c9a55a', '#d48a5c', '#c97b7b'];

            if (window.Chart) {
                this.charts.qualification = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels,
                        datasets: [{
                            data: values,
                            backgroundColor: colors,
                            borderColor: '#0b1527',
                            borderWidth: 2,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { color: '#94a3b8', padding: 12 }
                            }
                        },
                        cutout: '55%',
                    }
                });
            }
        },

        _renderDefects(data) {
            const ctx = document.getElementById('chartDefects');
            if (!ctx) return;

            const labels = [
                'A — Életveszély',
                'B — Súlyos',
                'C — Karbantartás',
                'D — Korszerűtlen'
            ];
            const values = [data.A || 0, data.B || 0, data.C || 0, data.D || 0];
            const colors = ['#c97b7b', '#d48a5c', '#c9a55a', '#8b7ab8'];

            if (window.Chart) {
                this.charts.defects = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: 'Hibák száma',
                            data: values,
                            backgroundColor: colors.map(c => c + '99'),
                            borderColor: colors,
                            borderWidth: 1,
                            borderRadius: 6,
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: {
                                beginAtZero: true,
                                ticks: { color: '#94a3b8', stepSize: 1 },
                                grid: { color: 'rgba(255,255,255,0.05)' }
                            },
                            y: {
                                ticks: { color: '#94a3b8' },
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
        },

        async sendReminder(reportId) {
            if (!confirm('Értesítés e-mail küldése erről a felülvizsgálatról?')) return;
            try {
                const res = await this.fetchJSON(`/api/dashboard/send-reminder/${reportId}`);
                alert(res?.message || 'Értesítés elküldve!');
            } catch (err) {
                alert('Hiba: ' + err.message);
            }
        }
    };

    const dashTab = document.querySelector('.nav-tab[data-target="tab-dashboard"]');
    if (dashTab) {
        dashTab.addEventListener('click', () => {
            VBF.dashboard.init();
        });
    }
}
