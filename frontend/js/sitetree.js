/**
 * ═══════════════════════════════════════════════
 * VBF Site Tree Module — sitetree.js
 * ═══════════════════════════════════════════════
 * Hierarchical site structure:
 *   Épület > Szint > Elosztó > Áramkör
 * 
 * - Interactive collapsible tree
 * - Click a node to set it as "active location"
 * - Active location auto-fills measurement rows
 * - Data saved/loaded with report JSON
 */

window.VBF = window.VBF || {};
VBF.siteTree = {

    /** The tree data structure */
    data: [],

    /** Currently selected node path (e.g. "Főépület / 1. em. / DB-2") */
    activePath: '',

    /** Currently selected node's device (for Zs rows) */
    activeDevice: '',

    /**
     * Initialize the tree panel
     */
    init() {
        const container = document.getElementById('siteTreePanel');
        if (!container) return;
        this._render(container);
        this._bindEvents();
    },

    /**
     * Add a root-level building
     */
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

    /**
     * Add a child to a parent node
     */
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

    /**
     * Remove a node (and all its children)
     */
    removeNode(nodeId) {
        this.data = this._removeFromTree(this.data, nodeId);
        this._refresh();
    },

    /**
     * Rename a node
     */
    renameNode(nodeId, newName) {
        const node = this._findNode(this.data, nodeId);
        if (node) {
            node.name = newName;
            this._refresh();
        }
    },

    /**
     * Toggle collapse
     */
    toggleCollapse(nodeId) {
        const node = this._findNode(this.data, nodeId);
        if (node) {
            node.collapsed = !node.collapsed;
            this._refresh();
        }
    },

    /**
     * Select a node → sets globalLocation (and globalDevice for panels)
     */
    selectNode(nodeId) {
        const node = this._findNode(this.data, nodeId);
        if (!node) return;

        // Build path
        const path = this._buildPath(this.data, nodeId);
        this.activePath = path;

        // Set the globalLocation input
        const locInput = document.getElementById('globalLocation');
        if (locInput) locInput.value = path;

        // If it's a panel, also set device
        if (node.device) {
            this.activeDevice = node.device;
            const devInput = document.getElementById('globalDevice');
            if (devInput) devInput.value = node.device;
        }

        this._refresh();
    },

    /**
     * Set device for a panel node
     */
    setDevice(nodeId, device) {
        const node = this._findNode(this.data, nodeId);
        if (node) {
            node.device = device;
        }
    },

    /**
     * Get all circuits as a flat list (for datalist autocomplete)
     */
    getCircuitNames() {
        const names = [];
        this._collectCircuits(this.data, [], names);
        return names;
    },

    /**
     * Serialize tree for saving
     */
    toJSON() {
        return JSON.parse(JSON.stringify(this.data));
    },

    /**
     * Load tree from saved data
     */
    fromJSON(data) {
        if (Array.isArray(data) && data.length > 0) {
            this.data = data;
        } else {
            this.data = [];
        }
        this._refresh();
    },

    // ═══════════════════════════════════════
    // Internal methods
    // ═══════════════════════════════════════

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

        // Update circuitNames datalist
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
        // Also add data.js names if available
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

        // Header
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

        // Tree body
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

        // Bind the add root button
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

            // Node row
            const row = document.createElement('div');
            row.className = `st-row ${isActive ? 'active' : ''} depth-${depth}`;
            row.style.paddingLeft = (depth * 20 + 8) + 'px';

            // Collapse toggle
            const toggle = node.children !== undefined
                ? `<span class="st-toggle ${node.collapsed ? 'collapsed' : ''}" data-action="toggle" data-id="${node.id}">
                    ${hasChildren ? (node.collapsed ? '▶' : '▼') : '·'}
                   </span>`
                : '<span class="st-toggle-space"></span>';

            row.innerHTML = `
                ${toggle}
                <span class="st-icon">${this._typeIcon(node.type)}</span>
                <span class="st-name" data-action="select" data-id="${node.id}" title="Kattints a kiválasztáshoz">${node.name}</span>
                ${node.type === 'panel' ? `<input class="st-device-input" data-id="${node.id}" value="${node.device || ''}" placeholder="B16" title="Alapértelmezett kikapcsoló" />` : ''}
                <span class="st-type-badge">${this._typeName(node.type)}</span>
                <div class="st-actions">
                    ${childType ? `<button class="st-btn st-btn-add" data-action="add" data-id="${node.id}" data-child-type="${childType}" title="+ ${this._typeName(childType)}">+</button>` : ''}
                    <button class="st-btn st-btn-rename" data-action="rename" data-id="${node.id}" title="Átnevezés">✏️</button>
                    <button class="st-btn st-btn-delete" data-action="delete" data-id="${node.id}" title="Törlés">🗑️</button>
                </div>
            `;
            nodeEl.appendChild(row);

            // Render children (if not collapsed)
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

        // Device input change
        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('st-device-input')) {
                const id = e.target.getAttribute('data-id');
                this.setDevice(id, e.target.value);
            }
        });
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    VBF.siteTree.init();
});
