/**
 * Fabric `diagram_data` és `site_tree` szétválasztása (hydrate / mentés).
 * A backend `diagram_data.site_tree`-t várja a SiteNode szinkronhoz.
 */

export type SiteTreeNode = {
  id: string;
  type: string;
  name: string;
  device?: string;
  collapsed?: boolean;
  children?: SiteTreeNode[];
};

export function splitDiagramPayload(data: Record<string, unknown> | null | undefined): {
  fabricJson: Record<string, unknown> | null;
  siteTree: SiteTreeNode[];
} {
  if (!data || typeof data !== 'object') {
    return { fabricJson: null, siteTree: [] };
  }
  const clone = { ...data };
  const raw = clone.site_tree;
  delete clone.site_tree;
  const siteTree = Array.isArray(raw) ? (raw as SiteTreeNode[]) : [];
  const fabricJson = Object.keys(clone).length > 0 ? clone : null;
  return { fabricJson, siteTree };
}

/** Összecsukható fa → legördülő opciók (mélység jelölése). */
export function flattenSiteTreeOptions(nodes: SiteTreeNode[], depth = 0): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const pad = depth > 0 ? `${'\u00A0'.repeat(depth * 2)}\u21B3 ` : '';
    out.push({ id: n.id, label: `${pad}${n.name || n.id}` });
    if (n.children?.length) {
      out.push(...flattenSiteTreeOptions(n.children, depth + 1));
    }
  }
  return out;
}

export function mergeDiagramPayload(
  fabricPart: Record<string, unknown> | null | undefined,
  siteTree: SiteTreeNode[]
): Record<string, unknown> | null {
  const base = fabricPart && typeof fabricPart === 'object' ? { ...fabricPart } : {};
  if (siteTree.length > 0) {
    (base as Record<string, unknown>).site_tree = siteTree;
  }
  return Object.keys(base).length > 0 ? base : null;
}

/** API / generátor felé — React `id` kulcsot nem küldjük */
export function stripMeasurementIds(rows: Record<string, string>[]): Record<string, string>[] {
  return rows.map((r) => {
    const { id, ...rest } = r as Record<string, string> & { id?: string };
    void id;
    return rest;
  });
}
