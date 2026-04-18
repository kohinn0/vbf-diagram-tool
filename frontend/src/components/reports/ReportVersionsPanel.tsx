import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { toast } from '../../lib/toast';
import {
  listReportVersions,
  createReportSnapshot,
  restoreReportVersion,
  type ReportVersionMeta,
} from '../../lib/api';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return iso; }
}

const ACTION_LABELS: Record<string, string> = {
  auto: '🔒 auto',
  'kézi mentés': '✋ kézi',
};

function tagLabel(note: string | null) {
  if (!note) return null;
  for (const [k, v] of Object.entries(ACTION_LABELS)) {
    if (note.includes(k)) return v;
  }
  return null;
}

interface Props {
  reportId: number;
  locked: boolean;
  onRestored?: () => void;
}

export function ReportVersionsPanel({ reportId, locked, onRestored }: Props) {
  const [versions, setVersions] = useState<ReportVersionMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);

  const reload = () => {
    setLoading(true);
    listReportVersions(reportId)
      .then(setVersions)
      .catch(() => toast.error('Verziók betöltése sikertelen.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [reportId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createReportSnapshot(reportId, 'kézi mentés');
      toast.success('Pillanatkép mentve.');
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Hiba');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (v: ReportVersionMeta) => {
    if (!window.confirm(`Visszaállítod a(z) ${v.version_num}. verziót (${fmtDate(v.created_at)})? A jelenlegi állapotról automatikus pillanatkép készül.`)) return;
    setRestoring(v.id);
    try {
      const res = await restoreReportVersion(reportId, v.id);
      toast.success(res.message);
      onRestored?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Visszaállítás sikertelen.');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--color-text-main)]">
          Verziónapló
          {versions.length > 0 && (
            <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">({versions.length} pillanatkép)</span>
          )}
        </h4>
        {!locked && (
          <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Mentés…' : '📷 Pillanatkép'}
          </Button>
        )}
      </div>

      {loading && <p className="text-xs text-[var(--color-text-muted)]">Betöltés…</p>}

      {!loading && versions.length === 0 && (
        <p className="text-xs text-[var(--color-text-muted)]">Még nincs mentett verzió. A véglegesítéskor automatikus pillanatkép készül.</p>
      )}

      {versions.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
          <table className="w-full text-xs text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="bg-[var(--color-bg-card)] border-b border-[var(--border-color)]">
                <th className="px-3 py-2 font-semibold w-12">#</th>
                <th className="px-3 py-2 font-semibold">Megjegyzés</th>
                <th className="px-3 py-2 font-semibold w-36">Létrehozva</th>
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-b border-[var(--border-color)] bg-[var(--color-bg-input)] hover:bg-[color-mix(in_srgb,var(--primary)_4%,var(--color-bg-input))] transition-colors">
                  <td className="px-3 py-2 font-mono text-[var(--color-text-muted)]">v{v.version_num}</td>
                  <td className="px-3 py-2">
                    <span className="text-[var(--color-text-main)]">{v.note || '—'}</span>
                    {tagLabel(v.note) && (
                      <span className="ml-1.5 text-[10px] opacity-70">{tagLabel(v.note)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)] whitespace-nowrap">{fmtDate(v.created_at)}</td>
                  <td className="px-3 py-2 text-right">
                    {!locked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRestore(v)}
                        disabled={restoring === v.id}
                        className="text-xs"
                      >
                        {restoring === v.id ? '…' : 'Visszaáll.'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
