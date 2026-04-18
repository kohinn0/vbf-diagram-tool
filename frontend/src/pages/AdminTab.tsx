import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../lib/apiBaseUrl';
import { fetchCurrentUser, type CurrentUserDto } from '../lib/api';
import { SignedOutCallout } from '../components/ui/SignedOutCallout';
import { PageHeader } from '../components/ui/PageHeader';
import { vbf } from '../lib/vbfUi';

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN']);

export default function AdminTab() {
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vbf_token');
    if (!token) {
      setLoading(false);
      return;
    }
    setErr(null);
    fetchCurrentUser()
      .then(setUser)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Profil nem elérhető.'))
      .finally(() => setLoading(false));
  }, []);

  if (!localStorage.getItem('vbf_token')) {
    return <SignedOutCallout featureLabel="a cég / admin oldal" />;
  }

  const isAdmin = user && ADMIN_ROLES.has(user.role);
  const docsUrl = `${API_BASE_URL.replace(/\/$/, '')}/docs`;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <PageHeader
        eyebrow="Üzemeltetés"
        title="Cég / admin"
        description={
          <>
            Az <code className="rounded bg-[var(--color-bg-input)] px-1 text-xs">/app/admin</code> útvonal — fiók adatok,
            API-hozzáférés és (jogosultság esetén) cégadmin feladatok.
          </>
        }
      />

      {loading && (
        <p className="text-sm text-[var(--color-text-muted)]" role="status">
          Betöltés…
        </p>
      )}

      {err && !loading && (
        <div className={`mb-6 max-w-xl rounded-xl px-4 py-3 text-sm ${vbf.surfaceDanger}`}>
          {err}{' '}
          <Link to="/" className="font-semibold text-primary underline">
            Főoldal
          </Link>
        </div>
      )}

      {user && !loading && (
        <div className="grid gap-4 max-w-2xl">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-3">Fiók</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <dt className="text-[var(--color-text-muted)]">Felhasználó:</dt>
                <dd className="font-medium text-[var(--color-text-main)]">{user.username}</dd>
              </div>
              {user.email && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-[var(--color-text-muted)]">E-mail:</dt>
                  <dd>{user.email}</dd>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <dt className="text-[var(--color-text-muted)]">Szerepkör:</dt>
                <dd className="font-medium">{user.role}</dd>
              </div>
              {user.company_name && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-[var(--color-text-muted)]">Cég:</dt>
                  <dd>{user.company_name}</dd>
                </div>
              )}
              {user.company_plan && (
                <div className="flex flex-wrap gap-2">
                  <dt className="text-[var(--color-text-muted)]">Csomag:</dt>
                  <dd>{user.company_plan}</dd>
                </div>
              )}
            </dl>
          </div>

          {isAdmin ? (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wide mb-2">Admin API és dokumentáció</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Felhasználók, cégbeállítások, megrendelések, csomagok — a backend{' '}
                <strong className="text-[var(--color-text-main)]">/api/admin/*</strong> végpontjain érhetők el. A
                böngészőben interaktív lista:
              </p>
              <a
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow hover:opacity-95"
              >
                OpenAPI / Swagger megnyitása
              </a>
              <p className="text-xs text-[var(--color-text-muted)] mt-3">
                Ha a link nem nyílik meg, ellenőrizd az <code className="bg-[var(--color-bg-input)] px-1 rounded">API_BASE_URL</code>{' '}
                beállítást (dev: proxy vagy <code className="bg-[var(--color-bg-input)] px-1 rounded">Vite</code> env).
              </p>
            </div>
          ) : (
            <div className={`rounded-2xl px-4 py-3 text-sm ${vbf.surfaceWarning}`}>
              A teljes cégadmin / főadmin funkciók (felhasználók, fizetések) csak{' '}
              <strong className="font-semibold">COMPANY_ADMIN</strong> vagy{' '}
              <strong className="font-semibold">SUPER_ADMIN</strong> jogkörrel érhetők el az API-n keresztül.
              Technikusi fiókkal a jegyzőkönyv-készítő és a saját feladataid maradnak elérhetők.
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--color-bg-card)] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[var(--color-text-main)] mb-2">Vissza a munkához</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/app/report"
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border-color)] px-4 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)]"
              >
                Jegyzőkönyv adatok
              </Link>
              <Link
                to="/app/diagram"
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border-color)] px-4 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-input)]"
              >
                Rajz
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
