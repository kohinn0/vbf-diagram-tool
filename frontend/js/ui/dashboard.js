export function initDashboard() {
    window.VBF = window.VBF || {};

    VBF.dashboard = {
        charts: {},

        async init() {
            const container = document.getElementById('dashboardContainer');
            if (!container) return;

            container.innerHTML = `
                <div class="dashboard-loading">
                    <div class="dash-spinner"></div>
                    <p>Dashboard betöltése...</p>
                </div>`;

            try {
                const [statsRes, inspRes] = await Promise.all([
                    this.fetchJSON('/api/dashboard/stats'),
                    this.fetchJSON('/api/dashboard/upcoming-inspections?days=90')
                ]);

                if (!statsRes) {
                    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 3rem;">Jelentkezz be ADMIN fiókkal a Dashboard megtekintéséhez.</p>';
                    return;
                }

                this.render(container, statsRes, inspRes);
            } catch (err) {
                console.error('Dashboard error:', err);
                container.innerHTML = '<p style="color:var(--danger); text-align:center; padding: 3rem;">Hiba a dashboard betöltésekor: ' + err.message + '</p>';
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

            // ── Header ──
            const header = document.createElement('div');
            header.className = 'dash-header';
            header.innerHTML = `
                <h2>📊 Üzleti Dashboard</h2>
                <p class="dash-subtitle">Átfogó statisztikák és közelgő feladatok</p>
            `;
            container.appendChild(header);

            // ── KPI Cards ──
            const kpiGrid = document.createElement('div');
            kpiGrid.className = 'dash-kpi-grid';
            kpiGrid.innerHTML = `
                ${this._kpiCard('📋', 'Összes jegyzőkönyv', stats.total_reports, 'var(--primary)')}
                ${this._kpiCard('📅', 'Havi jegyzőkönyvek', stats.monthly_reports, 'var(--accent)')}
                ${this._kpiCard('✅', 'Véglegesített', stats.finalized_reports, '#10b981')}
                ${this._kpiCard('📝', 'Vázlat', stats.draft_reports, '#8b5cf6')}
                ${this._kpiCard('👥', 'Aktív felhasználók', stats.active_users, '#06b6d4')}
                ${this._kpiCard('📌', 'Függő munkák', stats.pending_jobs, '#f43f5e')}
            `;
            container.appendChild(kpiGrid);

            // ── Charts Row ──
            const chartsRow = document.createElement('div');
            chartsRow.className = 'dash-charts-row';
            chartsRow.innerHTML = `
                <div class="dash-chart-card panel-glass">
                    <h3>📈 Havi trend (utolsó 12 hónap)</h3>
                    <canvas id="chartMonthlyTrend" height="220"></canvas>
                </div>
                <div class="dash-chart-card panel-glass">
                    <h3>🎯 Minősítés megoszlás</h3>
                    <canvas id="chartQualification" height="220"></canvas>
                </div>
            `;
            container.appendChild(chartsRow);

            // ── Defect & Results Row ──
            const analyticsRow = document.createElement('div');
            analyticsRow.className = 'dash-charts-row';
            analyticsRow.innerHTML = `
                <div class="dash-chart-card panel-glass">
                    <h3>⚠️ Hibakategóriák (MEE)</h3>
                    <canvas id="chartDefects" height="220"></canvas>
                </div>
                <div class="dash-chart-card panel-glass">
                    <h3>📊 Mérési eredmények</h3>
                    <div class="dash-pass-rate">
                        <div class="dash-pass-circle" style="--rate: ${stats.result_stats?.pass_rate || 0}%">
                            <span class="dash-pass-number">${stats.result_stats?.pass_rate || 0}%</span>
                            <span class="dash-pass-label">Átmenési arány</span>
                        </div>
                        <div class="dash-pass-details">
                            <div class="dash-pass-item ok">✅ Megfelelt: <strong>${stats.result_stats?.passed || 0}</strong></div>
                            <div class="dash-pass-item fail">❌ Nem felelt meg: <strong>${stats.result_stats?.failed || 0}</strong></div>
                            <div class="dash-pass-item total">📏 Összes mérés: <strong>${stats.result_stats?.total_measurements || 0}</strong></div>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(analyticsRow);

            // ── Upcoming Inspections ──
            if (inspections) {
                const inspSection = document.createElement('div');
                inspSection.className = 'dash-inspections panel-glass';
                inspSection.innerHTML = `
                    <h3>🔔 Közelgő / lejárt felülvizsgálatok</h3>
                    <div class="dash-insp-summary">
                        <span class="dash-badge danger">${inspections.total_overdue || 0} lejárt</span>
                        <span class="dash-badge warning">${inspections.total_upcoming || 0} közelgő (90 nap)</span>
                    </div>
                    <div class="dash-insp-list" id="dashInspList"></div>
                `;
                container.appendChild(inspSection);

                const listEl = inspSection.querySelector('#dashInspList');
                const allItems = [...(inspections.overdue || []), ...(inspections.upcoming || [])];

                if (allItems.length === 0) {
                    listEl.innerHTML = '<p style="color:var(--text-muted); padding: 1rem;">Nincs közelgő felülvizsgálat a következő 90 napban. 🎉</p>';
                } else {
                    allItems.forEach(item => {
                        const isOverdue = item.status === 'LEJÁRT';
                        const row = document.createElement('div');
                        row.className = `dash-insp-row ${isOverdue ? 'overdue' : 'upcoming'}`;
                        row.innerHTML = `
                            <div class="dash-insp-info">
                                <strong>${item.site_address || item.title}</strong>
                                <span class="dash-insp-meta">${item.customer_name || 'Ismeretlen'} · ${(item.report_type || '').toUpperCase()} · ${item.otsz_class || ''}</span>
                            </div>
                            <div class="dash-insp-date">
                                <span class="dash-insp-days ${isOverdue ? 'text-danger' : 'text-warning'}">
                                    ${isOverdue ? Math.abs(item.days_until) + ' napja lejárt!' : item.days_until + ' nap múlva'}
                                </span>
                                <span class="dash-insp-date-str">${item.next_inspection_date}</span>
                            </div>
                            <button class="btn btn-primary btn-small dash-remind-btn" 
                                    onclick="VBF.dashboard.sendReminder(${item.report_id})"
                                    title="Emlékeztető email küldése">
                                ✉️ Emlékeztető
                            </button>
                        `;
                        listEl.appendChild(row);
                    });
                }
            }

            // ── Render charts after DOM is ready ──
            requestAnimationFrame(() => {
                this._renderMonthlyTrend(stats.monthly_trend || []);
                this._renderQualification(stats.result_stats?.qualification_breakdown || {});
                this._renderDefects(stats.defect_stats?.category_breakdown || {});
            });
        },

        _kpiCard(icon, label, value, color) {
            return `
                <div class="dash-kpi panel-glass">
                    <div class="dash-kpi-icon" style="color: ${color}">${icon}</div>
                    <div class="dash-kpi-value" style="color: ${color}">${value || 0}</div>
                    <div class="dash-kpi-label">${label}</div>
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
                            backgroundColor: 'rgba(14, 165, 233, 0.6)',
                            borderColor: '#0ea5e9',
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
            const colors = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

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
            const colors = ['#ef4444', '#f97316', '#f59e0b', '#8b5cf6'];

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
            if (!confirm('Emlékeztető email küldése erről a felülvizsgálatról?')) return;
            try {
                const res = await this.fetchJSON(`/api/dashboard/send-reminder/${reportId}`);
                alert(res?.message || 'Emlékeztető elküldve!');
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
