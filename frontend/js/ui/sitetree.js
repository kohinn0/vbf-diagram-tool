/**
 * Helyszínfa (Site Tree) — hierarchia az egyvonalas rajz és mérések adatforrásához.
 *
 * NODE TÍPUSOK (autodiagram.js és mérések ezekre támaszkodnak):
 *   - building: épület, gyökér, children: floor[]
 *   - floor:     szint, children: panel[]
 *   - panel:     elosztó, children: circuit[], device: string (pl. B16)
 *   - circuit:   áramkör, nincs children, name = áramkör megnevezés
 *
 * Az automata egyvonalas rajz (_collectPanels) a type === 'panel' node-okat keresi,
 * és a panel children közül a type === 'circuit' elemeket veszi áramkörnek.
 */
export function initSiteTree() {
    window.VBF = window.VBF || {};

    const siteTree = {
        data: [],
        activePath: '',
        activeDevice: '',

        init() {
            const container = document.getElementById('siteTreePanel');
            if (!container) return;
            this._render(container);
            this._bindEvents();
        },

        addBuilding(name) {
            name = name || 'Új épület';
            this.data.push({
                id: this._uid(),
                type: 'building',
                name,
                collapsed: false,
                children: []
            });
            this._refresh();
        },

        addChild(parentId, type, name) {
            const parent = this._findNode(this.data, parentId);
            if (!parent) return;
            if (!parent.children) parent.children = [];
            parent.children.push({
                id: this._uid(),
                type,
                name: name || this._defaultName(type),
                collapsed: false,
                device: '',
                children: type === 'circuit' ? undefined : []
            });
            this._refresh();
        },

        removeNode(nodeId) {
            this.data = this._removeFromTree(this.data, nodeId);
            this._refresh();
        },

        renameNode(nodeId, newName) {
            const node = this._findNode(this.data, nodeId);
            if (node) {
                node.name = newName;
                this._refresh();
            }
        },

        toggleCollapse(nodeId) {
            const node = this._findNode(this.data, nodeId);
            if (node) {
                node.collapsed = !node.collapsed;
                this._refresh();
            }
        },

        selectNode(nodeId) {
            const node = this._findNode(this.data, nodeId);
            if (!node) return;

            const path = this._buildPath(this.data, nodeId);
            this.activePath = path;

            const locInput = document.getElementById('globalLocation');
            if (locInput) locInput.value = path;

            if (node.device) {
                this.activeDevice = node.device;
                const devInput = document.getElementById('globalDevice');
                if (devInput) devInput.value = node.device;
            }

            this._refresh();
        },

        setDevice(nodeId, device) {
            const node = this._findNode(this.data, nodeId);
            if (node) {
                node.device = device;
            }
        },

        addMeasurement(nodeId, type) {
            const node = this._findNode(this.data, nodeId);
            if (!node) return;

            const path = this._buildPath(this.data, nodeId);

            let deviceStr = '';
            const parent = this._findParentNode(this.data, nodeId);
            if (parent && parent.type === 'panel' && parent.device) {
                deviceStr = parent.device;
            }

            const sq = window.VBF && VBF.sanitize ? VBF.sanitize.attr : (v) => v;
            const safePath = sq(path);
            const safeName = sq(node.name);
            const safeDeviceStr = sq(deviceStr);

            const navTab = document.querySelector('.nav-tab[data-target="tab-measurements"]');
            if (navTab) navTab.click();

            if (type === 'rpe') {
                window.createRow('table-rpe', `
                    <td><input type="number" class="meas-point" placeholder="1"></td>
                    <td><input type="text" class="meas-loc" value="${safePath}"></td>
                    <td><input type="number" step="0.01" class="meas-val" placeholder="0.12" oninput="window.validateRpe(this.closest('tr'))"></td>
                    <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
                `, node.id);
            } else if (type === 'loop') {
                window.createRow('table-loop', `
                    <td><input type="text" class="meas-circuit" value="${safeName}" list="circuitNames"></td>
                    <td><input type="text" class="meas-device" value="${safeDeviceStr}" oninput="window.validateZs(this.closest('tr'))"></td>
                    <td><input type="text" class="meas-loc" value="${safePath}"></td>
                    <td><input type="number" step="0.01" class="meas-zs" placeholder="0.85" oninput="window.validateZs(this.closest('tr'))"></td>
                    ${window.vbfMeasPassCellHtmlFromPass ? window.vbfMeasPassCellHtmlFromPass('Igen') : '<td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>'}
                `, node.id);
            } else if (type === 'rcd') {
                window.createRow('table-rcd', `
                    <td><input type="text" class="meas-circuit" value="${safeName}" list="circuitNames"></td>
                    <td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td>
                    <td><input type="number" class="meas-idn" value="30" oninput="window.validateRcd(this.closest('tr'))"></td>
                    <td><select class="meas-05"><option>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td>
                    <td><input type="number" step="1" class="meas-t1" placeholder="24" oninput="window.validateRcd(this.closest('tr'))"></td>
                    <td><input type="number" step="1" class="meas-t5" placeholder="12" oninput="window.validateRcd(this.closest('tr'))"></td>
                    <td><input type="number" step="0.1" class="meas-ramp" placeholder="21" oninput="window.validateRcd(this.closest('tr'))"></td>
                    <td><input type="number" step="0.1" class="meas-uc" placeholder="1.2"></td>
                    ${window.vbfMeasPassCellHtmlFromPass ? window.vbfMeasPassCellHtmlFromPass('Igen') : '<td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>'}
                `, node.id);
            } else if (type === 'insulation') {
                window.createRow('table-insulation', `
                    <td><input type="text" class="meas-circuit" value="${safePath}" list="circuitNames"></td>
                    <td><input type="number" step="0.1" class="meas-ln" placeholder=">999" oninput="window.validateIns(this.closest('tr'))"></td>
                    <td><input type="number" step="0.1" class="meas-lpe" placeholder=">999" oninput="window.validateIns(this.closest('tr'))"></td>
                    <td><input type="number" step="0.1" class="meas-npe" placeholder=">999" oninput="window.validateIns(this.closest('tr'))"></td>
                    ${window.vbfMeasPassCellHtmlFromPass ? window.vbfMeasPassCellHtmlFromPass('Igen') : '<td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>'}
                `, node.id);
            }
        },

        getCircuitNames() {
            const names = [];
            this._collectCircuits(this.data, [], names);
            return names;
        },

        toJSON() {
            return JSON.parse(JSON.stringify(this.data));
        },

        fromJSON(data) {
            if (Array.isArray(data) && data.length > 0) {
                this.data = data;
            } else {
                this.data = [];
            }
            this._refresh();
        },

        _uid() {
            return 'st_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        },

        _defaultName(type) {
            const defaults = {
                building: 'Új épület',
                floor: 'Új szint',
                panel: 'Új elosztó',
                circuit: 'Új áramkör'
            };
            return defaults[type] || 'Új elem';
        },

        _typeIcon(type) {
            return { building: '🏢', floor: '🏗️', panel: '⚡', circuit: '🔌' }[type] || '📌';
        },

        _typeName(type) {
            return { building: 'Épület', floor: 'Szint', panel: 'Elosztó', circuit: 'Áramkör' }[type] || '';
        },

        _childType(parentType) {
            return { building: 'floor', floor: 'panel', panel: 'circuit' }[parentType] || null;
        },

        _findNode(nodes, id) {
            for (const node of nodes) {
                if (node.id === id) return node;
                if (node.children) {
                    const found = this._findNode(node.children, id);
                    if (found) return found;
                }
            }
            return null;
        },

        _findParentNode(nodes, id, parent = null) {
            for (const node of nodes) {
                if (node.id === id) return parent;
                if (node.children) {
                    const found = this._findParentNode(node.children, id, node);
                    if (found) return found;
                }
            }
            return null;
        },

        _removeFromTree(nodes, id) {
            return nodes.filter(n => {
                if (n.id === id) return false;
                if (n.children) n.children = this._removeFromTree(n.children, id);
                return true;
            });
        },

        _buildPath(nodes, targetId, pathParts) {
            pathParts = pathParts || [];
            for (const node of nodes) {
                if (node.id === targetId) {
                    return [...pathParts, node.name].join(' / ');
                }
                if (node.children) {
                    const result = this._buildPath(node.children, targetId, [...pathParts, node.name]);
                    if (result) return result;
                }
            }
            return null;
        },

        _collectCircuits(nodes, pathParts, result) {
            for (const node of nodes) {
                const thisPath = [...pathParts, node.name];
                if (node.type === 'circuit') {
                    result.push(thisPath.join(' / '));
                }
                if (node.children) {
                    this._collectCircuits(node.children, thisPath, result);
                }
            }
        },

        _refresh() {
            const container = document.getElementById('siteTreePanel');
            if (container) this._render(container);

            this._updateDatalist();
        },

        _updateDatalist() {
            let dl = document.getElementById('circuitNames');
            if (!dl) {
                dl = document.createElement('datalist');
                dl.id = 'circuitNames';
                document.body.appendChild(dl);
            }
            dl.innerHTML = '';
            const names = this.getCircuitNames();
            if (window.vbfData && window.vbfData.aramkor_nevek) {
                window.vbfData.aramkor_nevek.forEach(n => {
                    if (!names.includes(n)) names.push(n);
                });
            }
            names.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                dl.appendChild(opt);
            });
        },

        _render(container) {
            container.innerHTML = '';

            const header = document.createElement('div');
            header.className =
                'vbf-st-tree-head flex flex-row flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-glass)_55%,transparent)] px-3 py-2 sm:px-4 sm:py-2.5';
            header.innerHTML = `
                <h3 class="m-0 flex min-w-0 flex-1 items-center gap-2 text-[0.9rem] font-semibold text-[var(--text-main)] sm:text-base">
                    <svg class="shrink-0 text-[var(--text-muted)]" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                    Helyszínfa
                </h3>
                <button type="button" class="btn btn-secondary btn-small m-0 shrink-0 vbf-st-add-building-btn" data-vbf-st-add-root title="Új épület hozzáadása"><span class="vbf-st-add-building-ic" aria-hidden="true">+</span><span>Épület</span></button>
            `;
            container.appendChild(header);

            if (this.data.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'px-8 py-8 text-center text-[var(--text-muted)]';
                empty.innerHTML = `
                    <p>Nincs még helyszín megadva.</p>
                    <p class="mt-1 text-[0.8rem] opacity-60">Kattints a <strong>+ Épület</strong> gombra az építkezéshez!</p>
                `;
                container.appendChild(empty);
            } else {
                const tree = document.createElement('div');
                tree.className = 'max-h-[min(50vh,18rem)] overflow-y-auto overflow-x-hidden py-1.5 sm:max-h-[min(55vh,22rem)] md:max-h-[28rem]';
                this._renderNodes(tree, this.data, 0);
                container.appendChild(tree);
            }

            container.querySelector('[data-vbf-st-add-root]')?.addEventListener('click', () => {
                const name = prompt('Épület neve:', 'Főépület');
                if (name) this.addBuilding(name.trim());
            });
        },

        _renderNodes(parentEl, nodes, depth) {
            nodes.forEach(node => {
                const nodeEl = document.createElement('div');
                nodeEl.className = 'relative';
                nodeEl.setAttribute('data-depth', depth);
                nodeEl.setAttribute('data-id', node.id);
                nodeEl.setAttribute('data-type', node.type);

                const isActive = this.activePath === this._buildPath(this.data, node.id);
                const hasChildren = node.children && node.children.length > 0;
                const childType = this._childType(node.type);

                const sq = window.VBF && VBF.sanitize ? VBF.sanitize.attr : (v) => v;
                const sh = window.VBF && VBF.sanitize ? VBF.sanitize.html : (v) => v;

                const row = document.createElement('div');
                row.className = [
                    'vbf-site-tree-row-indent group flex min-h-11 min-w-0 w-full flex-wrap items-start gap-x-1 gap-y-1.5 border-l-[3px] border-transparent py-1.5 pr-1 transition-colors sm:min-h-[2.35rem] sm:items-center sm:gap-y-1 sm:py-2 sm:pr-2',
                    'hover:bg-[color-mix(in_srgb,white_4%,transparent)]',
                    isActive ? 'border-l-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]' : ''
                ].filter(Boolean).join(' ');
                row.style.setProperty('--vbf-site-tree-row-indent', `${0.45 + depth * 1.05}rem`);

                const toggle = node.children !== undefined
                    ? `<span class="flex h-7 w-4 shrink-0 select-none items-center justify-center text-[0.65rem] text-[var(--text-muted)] transition-transform hover:text-[var(--text-main)] sm:h-4 ${node.collapsed ? '-rotate-90' : ''}" data-action="toggle" data-id="${node.id}" role="button" tabindex="0">
                        ${hasChildren ? (node.collapsed ? '▶' : '▼') : '·'}
                       </span>`
                    : '<span class="inline-block h-7 w-4 shrink-0 sm:h-4"></span>';

                const typeLabel = this._typeName(node.type);
                const panelInput = node.type === 'panel'
                    ? `<input data-vbf-st-device class="mt-1 w-full max-w-[6.5rem] rounded border border-[color-mix(in_srgb,var(--text-main)_15%,transparent)] bg-[color-mix(in_srgb,black_30%,transparent)] px-1.5 py-1 text-center text-[0.74rem] font-semibold text-[var(--accent)] focus:border-[var(--primary)] focus:outline-none sm:mt-0 sm:max-w-[4.5rem] sm:py-0.5 sm:text-[0.78rem]" data-id="${node.id}" value="${sq(node.device || '')}" placeholder="B16" title="Kikapcsoló szerv" />`
                    : '';

                row.innerHTML = `
                    ${toggle}
                    <span class="shrink-0 pt-0.5 text-base leading-none sm:pt-0">${this._typeIcon(node.type)}</span>
                    <div class="min-w-0 flex-[1_1_10rem] max-w-full">
                        <div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span class="min-w-0 cursor-pointer break-words text-[0.8rem] leading-snug text-[var(--text-main)] transition-colors hover:text-[var(--primary)] sm:text-[0.86rem] ${isActive ? 'font-semibold text-[var(--primary)]' : ''}" data-action="select" data-id="${node.id}" title="Kattints a kiválasztáshoz">${sh(node.name)}</span>
                            <span class="shrink-0 rounded-md bg-[color-mix(in_srgb,var(--text-main)_10%,transparent)] px-1.5 py-px text-[0.58rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">${typeLabel}</span>
                        </div>
                        ${panelInput}
                    </div>
                    <div class="flex basis-full shrink-0 flex-wrap justify-end gap-0.5 pl-5 sm:basis-auto sm:pl-0 sm:opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                        ${node.type === 'circuit' ? `
                            <div class="group/me relative shrink-0">
                                <button type="button" class="flex h-[34px] w-8 items-center justify-center rounded border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-transparent text-[0.65rem] font-bold leading-none text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] sm:h-[26px] sm:text-[0.7rem]" title="Mérés Hozzáadása">+M</button>
                                <div class="absolute right-0 top-[110%] z-[1000] hidden min-w-[9rem] rounded-lg border border-[var(--border-color)] bg-[var(--bg-panel)] py-1 shadow-xl backdrop-blur-md group-hover/me:block">
                                    <button type="button" class="block w-full border-0 bg-transparent px-4 py-2.5 text-left text-[0.8rem] text-[var(--text-main)] first:rounded-t-lg last:rounded-b-lg hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--primary)]" onclick="VBF.siteTree.addMeasurement('${node.id}', 'rpe')">Folytonosság (Rpe)</button>
                                    <button type="button" class="block w-full border-0 bg-transparent px-4 py-2.5 text-left text-[0.8rem] text-[var(--text-main)] first:rounded-t-lg last:rounded-b-lg hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--primary)]" onclick="VBF.siteTree.addMeasurement('${node.id}', 'loop')">Hurok (Zs)</button>
                                    <button type="button" class="block w-full border-0 bg-transparent px-4 py-2.5 text-left text-[0.8rem] text-[var(--text-main)] first:rounded-t-lg last:rounded-b-lg hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--primary)]" onclick="VBF.siteTree.addMeasurement('${node.id}', 'rcd')">ÁVK (RCD)</button>
                                    <button type="button" class="block w-full border-0 bg-transparent px-4 py-2.5 text-left text-[0.8rem] text-[var(--text-main)] first:rounded-t-lg last:rounded-b-lg hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] hover:text-[var(--primary)]" onclick="VBF.siteTree.addMeasurement('${node.id}', 'insulation')">Szigetelés (Riso)</button>
                                </div>
                            </div>
                        ` : ''}
                        ${childType ? `<button type="button" class="flex h-[34px] w-[26px] items-center justify-center rounded border border-transparent bg-transparent p-0 text-[0.9rem] font-bold text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] sm:h-[26px] sm:text-[0.7rem]" data-action="add" data-id="${node.id}" data-child-type="${childType}" title="+ ${this._typeName(childType)}">+</button>` : ''}
                        <button type="button" class="flex h-[34px] w-[26px] items-center justify-center rounded border border-transparent bg-transparent p-0 text-[0.7rem] text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,white_8%,transparent)] hover:text-[var(--text-main)] sm:h-[26px]" data-action="rename" data-id="${node.id}" title="Átnevezés">✏️</button>
                        <button type="button" class="flex h-[34px] w-[26px] items-center justify-center rounded border border-transparent bg-transparent p-0 text-[0.7rem] text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] hover:text-[var(--danger)] sm:h-[26px]" data-action="delete" data-id="${node.id}" title="Törlés">🗑️</button>
                    </div>
                `;
                nodeEl.appendChild(row);

                if (node.children && !node.collapsed) {
                    const childContainer = document.createElement('div');
                    childContainer.setAttribute('data-vbf-tree-children', '');
                    childContainer.style.setProperty('--vbf-d', String(depth));
                    this._renderNodes(childContainer, node.children, depth + 1);
                    nodeEl.appendChild(childContainer);
                }

                parentEl.appendChild(nodeEl);
            });
        },

        _bindEvents() {
            const container = document.getElementById('siteTreePanel');
            if (!container) return;

            container.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;

                const action = target.getAttribute('data-action');
                const id = target.getAttribute('data-id');

                switch (action) {
                    case 'toggle':
                        this.toggleCollapse(id);
                        break;
                    case 'select':
                        this.selectNode(id);
                        break;
                    case 'add': {
                        const childType = target.getAttribute('data-child-type');
                        const name = prompt(`${this._typeName(childType)} neve:`, this._defaultName(childType));
                        if (name) this.addChild(id, childType, name.trim());
                        break;
                    }
                    case 'rename': {
                        const node = this._findNode(this.data, id);
                        if (!node) break;
                        const newName = prompt('Új név:', node.name);
                        if (newName) this.renameNode(id, newName.trim());
                        break;
                    }
                    case 'delete':
                        if (confirm('Biztosan törlöd? Az alatta lévő elemek is törlődnek.')) {
                            this.removeNode(id);
                        }
                        break;
                }
            });

            container.addEventListener('input', (e) => {
                if (e.target.matches('[data-vbf-st-device]')) {
                    const id = e.target.getAttribute('data-id');
                    this.setDevice(id, e.target.value);
                }
            });
        }
    };

    VBF.siteTree = siteTree;
    siteTree.init();
}
