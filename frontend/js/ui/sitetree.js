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
                    <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
                `, node.id);
            } else if (type === 'rcd') {
                window.createRow('table-rcd', `
                    <td><input type="text" class="meas-circ" value="${safeName}" list="circuitNames"></td>
                    <td><select class="meas-type"><option>AC</option><option selected>A</option><option>B</option><option>F</option></select></td>
                    <td><input type="number" class="meas-idn" value="30" oninput="window.validateRcd(this.closest('tr'))"></td>
                    <td><select class="meas-05"><option>OK (Nem oldott)</option><option>HIBA (Kioldott)</option></select></td>
                    <td><input type="number" step="1" class="meas-t1" placeholder="24" oninput="window.validateRcd(this.closest('tr'))"></td>
                    <td><input type="number" step="1" class="meas-t5" placeholder="12" oninput="window.validateRcd(this.closest('tr'))"></td>
                    <td><input type="number" step="0.1" class="meas-ramp" placeholder="21" oninput="window.validateRcd(this.closest('tr'))"></td>
                    <td><input type="number" step="0.1" class="meas-uc" placeholder="1.2"></td>
                    <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
                `, node.id);
            } else if (type === 'insulation') {
                window.createRow('table-insulation', `
                    <td><input type="text" class="meas-circuit" value="${safePath}" list="circuitNames"></td>
                    <td><input type="number" step="0.1" class="meas-ln" placeholder=">999" oninput="window.validateIns(this.closest('tr'))"></td>
                    <td><input type="number" step="0.1" class="meas-lpe" placeholder=">999" oninput="window.validateIns(this.closest('tr'))"></td>
                    <td><input type="number" step="0.1" class="meas-npe" placeholder=">999" oninput="window.validateIns(this.closest('tr'))"></td>
                    <td><select class="meas-pass"><option>Igen</option><option>Nem</option></select></td>
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
            header.className = 'st-header';
            header.innerHTML = `
                <h3>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                    Helyszínfa
                </h3>
                <button class="btn btn-primary btn-small st-add-root" title="Új épület hozzáadása">+ Épület</button>
            `;
            container.appendChild(header);

            if (this.data.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'st-empty';
                empty.innerHTML = `
                    <p>Nincs még helyszín megadva.</p>
                    <p style="font-size: 0.8rem; opacity: 0.6;">Kattints a <strong>+ Épület</strong> gombra az építkezéshez!</p>
                `;
                container.appendChild(empty);
            } else {
                const tree = document.createElement('div');
                tree.className = 'st-tree';
                this._renderNodes(tree, this.data, 0);
                container.appendChild(tree);
            }

            container.querySelector('.st-add-root')?.addEventListener('click', () => {
                const name = prompt('Épület neve:', 'Főépület');
                if (name) this.addBuilding(name.trim());
            });
        },

        _renderNodes(parentEl, nodes, depth) {
            nodes.forEach(node => {
                const nodeEl = document.createElement('div');
                nodeEl.className = 'st-node';
                nodeEl.setAttribute('data-depth', depth);
                nodeEl.setAttribute('data-id', node.id);
                nodeEl.setAttribute('data-type', node.type);

                const isActive = this.activePath === this._buildPath(this.data, node.id);
                const hasChildren = node.children && node.children.length > 0;
                const childType = this._childType(node.type);

                const sq = window.VBF && VBF.sanitize ? VBF.sanitize.attr : (v) => v;
                const sh = window.VBF && VBF.sanitize ? VBF.sanitize.html : (v) => v;

                const row = document.createElement('div');
                row.className = `st-row ${isActive ? 'active' : ''} depth-${depth}`;
                row.style.paddingLeft = (depth * 20 + 8) + 'px';

                const toggle = node.children !== undefined
                    ? `<span class="st-toggle ${node.collapsed ? 'collapsed' : ''}" data-action="toggle" data-id="${node.id}">
                        ${hasChildren ? (node.collapsed ? '▶' : '▼') : '·'}
                       </span>`
                    : '<span class="st-toggle-space"></span>';

                row.innerHTML = `
                    ${toggle}
                    <span class="st-icon">${this._typeIcon(node.type)}</span>
                    <span class="st-name" data-action="select" data-id="${node.id}" title="Kattints a kiválasztáshoz">${sh(node.name)}</span>
                    ${node.type === 'panel' ? `<input class="st-device-input" data-id="${node.id}" value="${sq(node.device || '')}" placeholder="B16" title="Alapértelmezett kikapcsoló" />` : ''}
                    <span class="st-type-badge">${this._typeName(node.type)}</span>
    
                    <div class="st-actions">
                        ${node.type === 'circuit' ? `
                            <div class="st-measure-menu">
                                <button class="st-btn st-btn-meas" title="Mérés Hozzáadása">+ M</button>
                                <div class="st-meas-dropdown">
                                    <button onclick="VBF.siteTree.addMeasurement('${node.id}', 'rpe')">Folytonosság (Rpe)</button>
                                    <button onclick="VBF.siteTree.addMeasurement('${node.id}', 'loop')">Hurok (Zs)</button>
                                    <button onclick="VBF.siteTree.addMeasurement('${node.id}', 'rcd')">ÁVK (RCD)</button>
                                    <button onclick="VBF.siteTree.addMeasurement('${node.id}', 'insulation')">Szigetelés (Riso)</button>
                                </div>
                            </div>
                        ` : ''}
                        ${childType ? `<button class="st-btn st-btn-add" data-action="add" data-id="${node.id}" data-child-type="${childType}" title="+ ${this._typeName(childType)}">+</button>` : ''}
                        <button class="st-btn st-btn-rename" data-action="rename" data-id="${node.id}" title="Átnevezés">✏️</button>
                        <button class="st-btn st-btn-delete" data-action="delete" data-id="${node.id}" title="Törlés">🗑️</button>
                    </div>
                `;
                nodeEl.appendChild(row);

                if (node.children && !node.collapsed) {
                    const childContainer = document.createElement('div');
                    childContainer.className = 'st-children';
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
                if (e.target.classList.contains('st-device-input')) {
                    const id = e.target.getAttribute('data-id');
                    this.setDevice(id, e.target.value);
                }
            });
        }
    };

    VBF.siteTree = siteTree;
    siteTree.init();
}
