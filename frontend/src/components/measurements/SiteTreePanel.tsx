import { useDraftStore, type SiteTreeNode } from '../../store/draftStore';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

function mapAtPath(
  nodes: SiteTreeNode[],
  path: number[],
  fn: (n: SiteTreeNode) => SiteTreeNode
): SiteTreeNode[] {
  const [i, ...rest] = path;
  if (rest.length === 0) {
    const copy = [...nodes];
    copy[i] = fn(copy[i]);
    return copy;
  }
  const copy = [...nodes];
  const ch = copy[i].children || [];
  copy[i] = { ...copy[i], children: mapAtPath(ch, rest, fn) };
  return copy;
}

function deleteAtPath(nodes: SiteTreeNode[], path: number[]): SiteTreeNode[] {
  if (path.length === 1) {
    return nodes.filter((_, j) => j !== path[0]);
  }
  const [i, ...rest] = path;
  const copy = [...nodes];
  const ch = copy[i].children || [];
  copy[i] = { ...copy[i], children: deleteAtPath(ch, rest) };
  return copy;
}

function insertChildAtPath(nodes: SiteTreeNode[], pathToParent: number[], child: SiteTreeNode): SiteTreeNode[] {
  if (pathToParent.length === 0) {
    return [...nodes, child];
  }
  const [i, ...rest] = pathToParent;
  if (rest.length === 0) {
    const copy = [...nodes];
    const n = copy[i];
    copy[i] = { ...n, children: [...(n.children || []), child] };
    return copy;
  }
  const copy = [...nodes];
  copy[i] = {
    ...copy[i],
    children: insertChildAtPath(copy[i].children || [], rest, child),
  };
  return copy;
}

function newNode(): SiteTreeNode {
  return {
    id: `st_${crypto.randomUUID().slice(0, 12)}`,
    type: 'floor',
    name: 'Új elem',
    device: '',
    collapsed: false,
    children: [],
  };
}

function TreeRows({
  nodes,
  pathPrefix,
  locked,
  onPatch,
  onDelete,
  onAddChild,
}: {
  nodes: SiteTreeNode[];
  pathPrefix: number[];
  locked: boolean;
  onPatch: (path: number[], n: SiteTreeNode) => void;
  onDelete: (path: number[]) => void;
  onAddChild: (pathToParent: number[]) => void;
}) {
  return (
    <ul className="space-y-2 list-none pl-0 m-0">
      {nodes.map((node, idx) => {
        const path = [...pathPrefix, idx];
        return (
          <li key={node.id} className="border border-[var(--border-color)] rounded-lg p-3 bg-[var(--color-bg-input)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="text-xs text-[var(--color-text-muted)] block mb-1">Megnevezés</label>
                <Input
                  className="min-h-11"
                  value={node.name}
                  disabled={locked}
                  onChange={(e) => onPatch(path, { ...node, name: e.target.value })}
                  placeholder="pl. Főelosztó, 1. emelet"
                />
              </div>
              <div className="w-full sm:w-36">
                <label className="text-xs text-[var(--color-text-muted)] block mb-1">Típus</label>
                <Select
                  value={node.type}
                  disabled={locked}
                  onChange={(e) => onPatch(path, { ...node, type: e.target.value })}
                  className="min-h-11"
                >
                  <option value="building">Épület / telephely</option>
                  <option value="floor">Szint / zóna</option>
                  <option value="panel">Elosztó / tábla</option>
                  <option value="circuit">Áramkör / kör</option>
                </Select>
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="text-xs text-[var(--color-text-muted)] block mb-1">Készülék / megj.</label>
                <Input
                  className="min-h-11"
                  value={node.device || ''}
                  disabled={locked}
                  onChange={(e) => onPatch(path, { ...node, device: e.target.value })}
                  placeholder="pl. B16, FI-40"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  disabled={locked}
                  onClick={() => onAddChild(path)}
                >
                  + Gyerek
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 text-rose-700 border-rose-200"
                  disabled={locked}
                  onClick={() => onDelete(path)}
                >
                  Törlés
                </Button>
              </div>
            </div>
            {node.children && node.children.length > 0 && (
              <div className="mt-3 pl-3 border-l-2 border-primary/30">
                <TreeRows
                  nodes={node.children}
                  pathPrefix={path}
                  locked={locked}
                  onPatch={onPatch}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SiteTreePanel({ locked }: { locked: boolean }) {
  const siteTree = useDraftStore((s) => s.siteTree);

  const onPatch = (path: number[], updated: SiteTreeNode) => {
    useDraftStore.setState((state) => ({
      siteTree: mapAtPath(state.siteTree, path, () => updated),
    }));
  };

  const onDelete = (path: number[]) => {
    useDraftStore.setState((state) => ({
      siteTree: deleteAtPath(state.siteTree, path),
    }));
  };

  const onAddChild = (pathToParent: number[]) => {
    useDraftStore.setState((state) => ({
      siteTree: insertChildAtPath(state.siteTree, pathToParent, newNode()),
    }));
  };

  const addRoot = () => {
    useDraftStore.setState((state) => ({
      siteTree: [...state.siteTree, newNode()],
    }));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">Helyszínfa</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-snug">
            MSZ mérések és szerver oldali helyszín szinkron (mentéskor a <code className="text-[11px]">diagram_data.site_tree</code> részbe kerül).
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" className="min-h-11 shrink-0" disabled={locked} onClick={addRoot}>
          + Gyökér
        </Button>
      </div>
      {siteTree.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Még nincs elem — adj hozzá gyökéret (épület / főelosztó), majd szintenként bontsd.</p>
      ) : (
        <TreeRows
          nodes={siteTree}
          pathPrefix={[]}
          locked={locked}
          onPatch={onPatch}
          onDelete={onDelete}
          onAddChild={onAddChild}
        />
      )}
    </div>
  );
}
