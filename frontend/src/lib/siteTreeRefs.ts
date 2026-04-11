import type { SiteTreeNode } from './diagramPayload';

/** Összes `id` a fában (rekurzív). */
export function collectSiteNodeIds(nodes: SiteTreeNode[]): Set<string> {
  const out = new Set<string>();
  const walk = (ns: SiteTreeNode[]) => {
    for (const n of ns) {
      if (n.id) out.add(n.id);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export type RowWithNode = Record<string, string> & { id?: string; node_id?: string };

/** Mérési sorok — érvénytelen helyszín-ID törlése (fa csökkenése / szerkesztés után). */
export function pruneMeasurementNodeRefs(params: {
  siteTree: SiteTreeNode[];
  rpeRows: Array<{ id: string; point: string; location: string; rpeValue: string; isOk: 'yes' | 'no'; node_id?: string }>;
  loopRows: RowWithNode[];
  insulationRows: RowWithNode[];
  rcdRows: RowWithNode[];
  ephContRows: RowWithNode[];
}): {
  rpeRows: typeof params.rpeRows;
  loopRows: RowWithNode[];
  insulationRows: RowWithNode[];
  rcdRows: RowWithNode[];
  ephContRows: RowWithNode[];
  dirty: boolean;
} {
  const valid = collectSiteNodeIds(params.siteTree);
  let dirty = false;

  const rpeRows = params.rpeRows.map((r) => {
    const raw = r.node_id?.trim();
    if (raw && !valid.has(raw)) {
      dirty = true;
      return { ...r, node_id: undefined };
    }
    return r;
  });

  const mapRec = (rows: RowWithNode[]) =>
    rows.map((r) => {
      const raw = (r.node_id || '').trim();
      if (raw && !valid.has(raw)) {
        dirty = true;
        return { ...r, node_id: '' };
      }
      return r;
    });

  const loopRows = mapRec(params.loopRows);
  const insulationRows = mapRec(params.insulationRows);
  const rcdRows = mapRec(params.rcdRows);
  const ephContRows = mapRec(params.ephContRows);

  return { rpeRows, loopRows, insulationRows, rcdRows, ephContRows, dirty };
}

/** Gyors kezdő fa: épület → főelosztó (tipikus VBF helyszín bontás). */
export function createDefaultStarterSiteTree(): SiteTreeNode[] {
  const rootId = `st_${crypto.randomUUID().slice(0, 12)}`;
  const childId = `st_${crypto.randomUUID().slice(0, 12)}`;
  return [
    {
      id: rootId,
      type: 'building',
      name: 'Vizsgált objektum',
      device: '',
      collapsed: false,
      children: [
        {
          id: childId,
          type: 'panel',
          name: 'Főelosztó',
          device: '',
          collapsed: false,
          children: [],
        },
      ],
    },
  ];
}
