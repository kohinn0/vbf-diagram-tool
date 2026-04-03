import { useDraftStore } from '../../store/draftStore';
import { flattenSiteTreeOptions } from '../../lib/diagramPayload';
import { Select } from '../ui/Select';

type Props = {
  value: string;
  onChange: (nodeId: string) => void;
  disabled?: boolean;
  className?: string;
};

/** Mérési sor ↔ helyszínfa csomópont (`node_id` → backend `meas_*` táblák). */
export function SiteNodeSelect({ value, onChange, disabled, className }: Props) {
  const siteTree = useDraftStore((s) => s.siteTree);
  const opts = flattenSiteTreeOptions(siteTree);

  return (
    <Select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? 'min-h-11 text-xs'}
      title="Helyszínfa csomópont — előbb építs fát a bal oldalon"
    >
      <option value="">— nincs kötve —</option>
      {opts.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
