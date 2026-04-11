import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { FormField } from "../components/ui/FormField";
import { Skeleton } from "../components/ui/Skeleton";
import {
  fetchCurrentUser,
  updateMyProfile,
  changeMyPassword,
  type CurrentUserDto,
} from "../lib/api";
import { toast } from "../lib/toast";
import { SignedOutCallout } from "../components/ui/SignedOutCallout";
import { PageHeader } from "../components/ui/PageHeader";
import { vbf } from "../lib/vbfUi";

function formatSub(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("hu-HU", { dateStyle: "medium" });
  } catch {
    return String(iso);
  }
}

export default function ProfileTab() {
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("vbf_token")) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then((u) => {
        setUser(u);
        setEmail(u.email || "");
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Profil hiba"))
      .finally(() => setLoading(false));
  }, []);

  if (!localStorage.getItem("vbf_token")) {
    return <SignedOutCallout featureLabel="a profil és a jelszó" />;
  }

  if (loading) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)] space-y-4 max-w-xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <PageHeader
        eyebrow="Fiók"
        title="Profil és fiók"
        description="E-mail és jelszó — a backend PATCH /api/users/me és PUT /api/users/me/password szerint."
      />

      {user && (
        <div className="grid gap-6 max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Fiók adatok</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>
                <span className="text-[var(--color-text-muted)]">Felhasználónév:</span>{" "}
                <strong className="text-[var(--color-text-main)]">{user.username}</strong>
              </p>
              <p>
                <span className="text-[var(--color-text-muted)]">Szerepkör:</span>{" "}
                <strong>{user.role}</strong>
              </p>
              {user.company_name && (
                <p>
                  <span className="text-[var(--color-text-muted)]">Cég:</span> {user.company_name}
                </p>
              )}
              {user.company_plan && (
                <p>
                  <span className="text-[var(--color-text-muted)]">Csomag:</span> {user.company_plan}
                </p>
              )}
              <p>
                <span className="text-[var(--color-text-muted)]">Előfizetés vége (ha van):</span>{" "}
                {formatSub(user.subscription_expires)}
              </p>
              {user.pdf_export_watermarked && (
                <p className={`rounded-lg px-3 py-2 text-xs ${vbf.surfaceWarning}`}>
                  A PDF export vízjeles (demó / korlátozott csomag).
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>E-mail cím</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField label="E-mail (bejelentkezéshez / értesítéshez)" htmlFor="profile-email">
                <Input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelda@ceg.hu"
                  className="min-h-11"
                />
              </FormField>
              <Button
                type="button"
                className="min-h-11 w-full sm:w-auto"
                disabled={savingProfile}
                onClick={async () => {
                  setSavingProfile(true);
                  try {
                    const u = await updateMyProfile({
                      email: email.trim() || null,
                    });
                    setUser(u);
                    setEmail(u.email || "");
                    toast.success("E-mail mentve.");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Mentés hiba");
                  } finally {
                    setSavingProfile(false);
                  }
                }}
              >
                {savingProfile ? "Mentés…" : "E-mail mentése"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Jelszó megváltoztatása</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField label="Jelenlegi jelszó" htmlFor="profile-cur-pw">
                <Input
                  id="profile-cur-pw"
                  type="password"
                  autoComplete="current-password"
                  value={curPw}
                  onChange={(e) => setCurPw(e.target.value)}
                  className="min-h-11"
                />
              </FormField>
              <FormField
                label="Új jelszó"
                htmlFor="profile-new-pw"
                hint="A backend erős jelszó szabályt alkalmaz (hossz, komplexitás)."
              >
                <Input
                  id="profile-new-pw"
                  type="password"
                  autoComplete="new-password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="min-h-11"
                />
              </FormField>
              <FormField label="Új jelszó még egyszer" htmlFor="profile-new-pw2">
                <Input
                  id="profile-new-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={newPw2}
                  onChange={(e) => setNewPw2(e.target.value)}
                  className="min-h-11"
                />
              </FormField>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full sm:w-auto border border-[var(--border-color)]"
                disabled={savingPw}
                onClick={async () => {
                  if (newPw !== newPw2) {
                    toast.error("Az új jelszavak nem egyeznek.");
                    return;
                  }
                  if (!curPw || !newPw) {
                    toast.error("Töltsd ki mindhárom mezőt.");
                    return;
                  }
                  setSavingPw(true);
                  try {
                    const r = await changeMyPassword(curPw, newPw);
                    toast.success(r.message || "Jelszó megváltozott.");
                    setCurPw("");
                    setNewPw("");
                    setNewPw2("");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Jelszócsere hiba");
                  } finally {
                    setSavingPw(false);
                  }
                }}
              >
                {savingPw ? "Mentés…" : "Jelszó csere"}
              </Button>
            </CardContent>
          </Card>

          <p className="text-sm text-[var(--color-text-muted)]">
            <Link to="/app/data" className="font-semibold text-primary hover:underline min-h-11 inline-flex items-center">
              GDPR — adatok exportja és fiók törlése
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
