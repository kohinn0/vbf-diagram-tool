export function initDashboard() {
    window.VBF = window.VBF || {};

    /** Chart.js + tokenekhez igazított színek (nem alapértelmezett neon) */
    const CHART_THEME = {
        fontFamily: "'Outfit', sans-serif",
        fontSize: 14,
        tickColor: 'rgba(203, 213, 225, 0.92)',
        gridColor: 'rgba(255, 255, 255, 0.06)',
        primary: 'rgba(74, 158, 196, 0.55)',
        primaryBorder: 'rgba(74, 158, 196, 0.9)',
        success: 'rgba(110, 184, 154, 0.85)',
        accent: 'rgba(201, 160, 74, 0.85)',
        warning: 'rgba(201, 165, 90, 0.85)',
        danger: 'rgba(217, 112, 112, 0.85)',
        panelStroke: 'rgba(11, 21, 39, 0.95)',
    };

    function chartTickFont() {
        return { family: CHART_THEME.fontFamily, size: CHART_THEME.fontSize };
    }

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

        _kpiSvg(kind) {
            const stroke = 'currentColor';
            const common = `fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"`;
            const icons = {
                reports: `<svg ${common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round"/></svg>`,
                monthly: `<svg ${common}><rect x="3" y="4" width="18" height="18" rx="2" stroke="${stroke}" stroke-width="1.75"/><path d="M16 2v4M8 2v4M3 10h18" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round"/></svg>`,
                finalized: `<svg ${common}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round"/><path d="M22 4 12 14.01l-3-3" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
                draft: `<svg ${common}><path d="M12 20h9" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
                users: `<svg ${common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round"/><circle cx="9" cy="7" r="4" stroke="${stroke}" stroke-width="1.75"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round"/></svg>`,
                jobs: `<svg ${common}><rect x="2" y="7" width="20" height="14" rx="2" stroke="${stroke}" stroke-width="1.75"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20" stroke="${stroke}" stroke-width="1.75" stroke-linecap="round"/></svg>`,
            };
            return icons[kind] || icons.reports;
        },

        render(container, stats, inspections) {
            Object.values(this.charts).forEach((c) => {
                try {
                    c?.destroy?.();
                } catch (_) { /* ignore */ }
            });
            this.charts = {};
            container.innerHTML = '';

            const rate = Math.min(100, Math.max(0, Number(stats.result_stats?.pass_rate) || 0));
            const coneBg = `conic-gradient(var(--success-muted) 0deg, var(--success-muted) ${rate * 3.6}deg, rgba(255,255,255,0.08) ${rate * 3.6}deg)`;

            const header = document.createElement('div');
            header.className = 'mb-6';
            header.innerHTML = `
                <h2 class="mb-1 text-2xl font-semibold tracking-tight text-[var(--text-main)]">Üzleti irányítópult</h2>
                <p class="text-[0.95rem] text-[var(--text-muted)]">Átfogó statisztikák és aktuális feladatok</p>
            `;
            container.appendChild(header);

            const kpiGrid = document.createElement('div');
            kpiGrid.className = 'mb-8 grid grid-cols-2 gap-4 lg:auto-rows-fr lg:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]';
            kpiGrid.innerHTML = `
                ${this._kpiCard('reports', 'Összes jegyzőkönyv', stats.total_reports, 'var(--primary)')}
                ${this._kpiCard('monthly', 'Havi új dokumentumok', stats.monthly_reports, 'var(--accent)')}
                ${this._kpiCard('finalized', 'Lezárt (véglegesített)', stats.finalized_reports, 'var(--success-muted)')}
                ${this._kpiCard('draft', 'Piszkozat (vázlat)', stats.draft_reports, 'var(--text-muted-strong)')}
                ${this._kpiCard('users', 'Aktív munkatársak', stats.active_users, 'var(--primary)')}
                ${this._kpiCard('jobs', 'Folyamatban lévő munkák', stats.pending_jobs, 'var(--accent)')}
            `;
            container.appendChild(kpiGrid);

            const chartsRow = document.createElement('div');
            chartsRow.className = 'mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2';
            chartsRow.innerHTML = `
                <div class="panel-glass flex flex-col rounded-[var(--radius)]">
                    <h3 class="mb-1 text-base font-semibold text-[var(--text-main)]">Havi trendek</h3>
                    <p class="mb-4 text-[0.8125rem] text-[var(--text-muted)]">Utolsó 12 hónap</p>
                    <div class="relative min-h-[240px] w-full flex-1 px-2 pb-3 pt-1 sm:px-4 sm:pb-4"><canvas id="chartMonthlyTrend"></canvas></div>
                </div>
                <div class="panel-glass flex flex-col rounded-[var(--radius)]">
                    <h3 class="mb-1 text-base font-semibold text-[var(--text-main)]">Minősítések megoszlása</h3>
                    <p class="mb-4 text-[0.8125rem] text-[var(--text-muted)]">Jegyzőkönyvek eredménye szerint</p>
                    <div class="relative flex min-h-[280px] w-full flex-1 items-center justify-center px-3 pb-5 pt-2 sm:px-5 sm:pb-6"><canvas id="chartQualification"></canvas></div>
                </div>
            `;
            container.appendChild(chartsRow);

            const analyticsRow = document.createElement('div');
            analyticsRow.className = 'mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2';
            analyticsRow.innerHTML = `
                <div class="panel-glass flex flex-col rounded-[var(--radius)]">
                    <h3 class="mb-1 text-base font-semibold text-[var(--text-main)]">Hibakategóriák</h3>
                    <p class="mb-4 text-[0.8125rem] text-[var(--text-muted)]">Minősítés szerinti megoszlás</p>
                    <div class="relative min-h-[260px] w-full flex-1 px-2 pb-4 pt-1 sm:px-4"><canvas id="chartDefects"></canvas></div>
                </div>
                <div class="panel-glass rounded-[var(--radius)]">
                    <h3 class="mb-1 text-base font-semibold text-[var(--text-main)]">Mérési statisztikák</h3>
                    <p class="mb-5 text-[0.8125rem] text-[var(--text-muted)]">Átmenési arány és darabszámok</p>
                    <div class="flex flex-col items-center justify-center gap-8 py-2 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
                        <div class="relative flex h-[min(11rem,42vw)] w-[min(11rem,42vw)] shrink-0 flex-col items-center justify-center rounded-full sm:h-44 sm:w-44" style="background: ${coneBg}">
                            <div class="absolute inset-3 z-0 rounded-full bg-[var(--bg-panel)]"></div>
                            <span class="relative z-[1] text-3xl font-bold tabular-nums text-[var(--success-muted)]">${rate}%</span>
                            <span class="relative z-[1] mt-0.5 text-center text-[0.75rem] font-medium leading-tight text-[var(--text-muted)]">Átmenési arány</span>
                        </div>
                        <div class="flex w-full min-w-0 max-w-md flex-col justify-center gap-2.5 self-center sm:flex-1">
                            <div class="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,white_4%,transparent)] px-4 py-2.5 text-[0.9375rem] leading-snug text-[var(--text-muted)]">Megfelelt: <strong class="font-semibold text-[var(--text-main)]">${stats.result_stats?.passed || 0}</strong></div>
                            <div class="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,white_4%,transparent)] px-4 py-2.5 text-[0.9375rem] leading-snug text-[var(--text-muted)]">Nem felelt meg: <strong class="font-semibold text-[var(--text-main)]">${stats.result_stats?.failed || 0}</strong></div>
                            <div class="rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,white_4%,transparent)] px-4 py-2.5 text-[0.9375rem] leading-snug text-[var(--text-muted)]">Összes mérés: <strong class="font-semibold text-[var(--text-main)]">${stats.result_stats?.total_measurements || 0}</strong></div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(analyticsRow);

            if (inspections) {
                const allItems = [...(inspections.overdue || []), ...(inspections.upcoming || [])];
                const empty = allItems.length === 0;
                const inspSection = document.createElement('div');
                inspSection.className = empty
                    ? 'panel-glass mb-8 max-w-2xl rounded-[var(--radius)]'
                    : 'panel-glass mb-8 rounded-[var(--radius)]';

                if (empty) {
                    inspSection.innerHTML = `
                        <h3 class="mb-3 text-base font-semibold text-[var(--text-main)]">Közelgő és lejárt felülvizsgálatok</h3>
                        <div class="flex flex-col items-center gap-4 rounded-[var(--radius-sm)] border border-dashed border-[color-mix(in_srgb,var(--border-color)_80%,transparent)] bg-[color-mix(in_srgb,white_2%,transparent)] px-6 py-10 text-center">
                            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]" aria-hidden="true">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.75"/><path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>
                            </div>
                            <p class="max-w-sm text-[0.9375rem] leading-relaxed text-[var(--text-muted)]">Nincs közelgő vagy lejárt felülvizsgálat a következő 90 napra vonatkozóan.</p>
                        </div>`;
                } else {
                    inspSection.innerHTML = `
                        <h3 class="mb-4 text-[1.05rem] font-semibold text-[var(--text-main)]">Közelgő és lejárt felülvizsgálatok</h3>
                        <div class="mb-6 flex flex-wrap gap-3">
                            <span class="inline-block rounded-full border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] px-3 py-1 text-[0.8rem] font-semibold text-[var(--danger)]">${inspections.total_overdue || 0} lejárt</span>
                            <span class="inline-block rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] px-3 py-1 text-[0.8rem] font-semibold text-[var(--accent)]">${inspections.total_upcoming || 0} közelgő (90 nap)</span>
                        </div>
                        <div class="flex flex-col gap-2" id="dashInspList"></div>
                    `;
                    const listEl = inspSection.querySelector('#dashInspList');
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
                                    ${isOverdue ? Math.abs(item.days_until) + ' napja lejárt' : item.days_until + ' nap múlva'}
                                </span>
                                <span class="text-[0.75rem] text-[var(--text-muted)]">${item.next_inspection_date}</span>
                            </div>
                            <button type="button" class="btn btn-primary btn-small !m-0 w-full shrink-0 !min-h-9 sm:mt-0 sm:w-auto"
                                    onclick="VBF.dashboard.sendReminder(${item.report_id})"
                                    title="Értesítés e-mail küldése">
                                Értesítés küldése
                            </button>
                        `;
                        listEl.appendChild(row);
                    });
                }
                container.appendChild(inspSection);
            }

            requestAnimationFrame(() => {
                this._renderMonthlyTrend(stats.monthly_trend || []);
                this._renderQualification(stats.result_stats?.qualification_breakdown || {});
                this._renderDefects(stats.defect_stats?.category_breakdown || {});
            });
        },

        _kpiCard(iconKind, label, value, color) {
            return `
                <div class="panel-glass relative overflow-hidden rounded-[var(--radius)] text-center transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg" style="color: ${color}">
                    <div class="pointer-events-none absolute inset-x-0 top-0 h-[3px] opacity-50" style="background: currentColor"></div>
                    <div class="mb-3 flex justify-center opacity-90">${this._kpiSvg(iconKind)}</div>
                    <div class="mb-2 text-[2.35rem] font-bold leading-none tabular-nums tracking-tight">${value ?? 0}</div>
                    <div class="text-[0.8125rem] font-medium leading-snug text-[var(--text-muted)]">${label}</div>
                </div>`;
        },

        _renderMonthlyTrend(data) {
            const ctx = document.getElementById('chartMonthlyTrend');
            const ChartLib = window.Chart;
            if (!ctx || !ChartLib) return;
            const existing = ChartLib.getChart(ctx);
            if (existing) existing.destroy();

            const months = ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sze', 'Okt', 'Nov', 'Dec'];
            const labels = data.map(d => months[d.month - 1] + ' ' + d.year);
            const values = data.map(d => d.count);

            this.charts.trend = new ChartLib(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Jegyzőkönyvek',
                        data: values,
                        backgroundColor: CHART_THEME.primary,
                        borderColor: CHART_THEME.primaryBorder,
                        borderWidth: 1,
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 8, right: 8, bottom: 4, left: 4 } },
                    plugins: {
                        legend: { display: false },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: CHART_THEME.tickColor,
                                font: chartTickFont(),
                                stepSize: 1,
                            },
                            grid: { color: CHART_THEME.gridColor }
                        },
                        x: {
                            ticks: { color: CHART_THEME.tickColor, font: chartTickFont(), maxRotation: 45, minRotation: 0 },
                            grid: { display: false }
                        }
                    }
                }
            });
        },

        _renderQualification(data) {
            const ctx = document.getElementById('chartQualification');
            const ChartLib = window.Chart;
            if (!ctx || !ChartLib) return;
            const existing = ChartLib.getChart(ctx);
            if (existing) existing.destroy();

            const labels = ['Megfelelő', 'C változat', 'B változat', 'Nem megfelelő'];
            const values = [
                data['MEGFELELŐ'] || 0,
                data['VÁLTOZAT_C'] || 0,
                data['VÁLTOZAT_B'] || 0,
                data['NEM MEGFELELŐ'] || 0,
            ];
            const colors = [
                CHART_THEME.success,
                CHART_THEME.accent,
                CHART_THEME.warning,
                CHART_THEME.danger,
            ];

            this.charts.qualification = new ChartLib(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors,
                        borderColor: CHART_THEME.panelStroke,
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 18, bottom: 24, left: 18, right: 18 } },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: CHART_THEME.tickColor,
                                padding: 16,
                                font: chartTickFont(),
                                boxWidth: 14,
                                boxHeight: 14,
                            }
                        }
                    },
                    cutout: '38%',
                }
            });
        },

        _renderDefects(data) {
            const ctx = document.getElementById('chartDefects');
            const ChartLib = window.Chart;
            if (!ctx || !ChartLib) return;
            const existing = ChartLib.getChart(ctx);
            if (existing) existing.destroy();

            const labels = [
                'A — Életveszély',
                'B — Súlyos',
                'C — Karbantartás',
                'D — Korszerűtlen'
            ];
            const values = [data.A || 0, data.B || 0, data.C || 0, data.D || 0];
            const borderColors = ['#c45c5c', '#c97d52', '#b8924a', '#7a6fa3'];
            const fillColors = ['rgba(196, 92, 92, 0.55)', 'rgba(201, 125, 82, 0.5)', 'rgba(184, 146, 74, 0.5)', 'rgba(122, 111, 163, 0.5)'];

            this.charts.defects = new ChartLib(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Hibák száma',
                        data: values,
                        backgroundColor: fillColors,
                        borderColor: borderColors,
                        borderWidth: 1,
                        borderRadius: 6,
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: { padding: { top: 14, right: 18, bottom: 14, left: 14 } },
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                color: CHART_THEME.tickColor,
                                font: chartTickFont(),
                                stepSize: 1,
                            },
                            grid: { color: CHART_THEME.gridColor }
                        },
                        y: {
                            ticks: {
                                color: CHART_THEME.tickColor,
                                font: chartTickFont(),
                                autoSkip: false,
                            },
                            grid: { display: false }
                        }
                    }
                }
            });
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
