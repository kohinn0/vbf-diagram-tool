import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import {
  fetchCurrentUser,
  downloadMyDataJsonFile,
  downloadMyDataZipFile,
  deleteMyAccount,
  clearSession,
  type CurrentUserDto,
} from "../lib/api";
import { legalUrls } from "../lib/legalUrls";
import { toast } from "../lib/toast";
import { SignedOutCallout } from "../components/ui/SignedOutCallout";
import { PageHeader } from "../components/ui/PageHeader";

export default function DataPrivacyTab() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"json" | "zip" | "del" | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("vbf_token")) {
      setLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => toast.error("Profil betöltése sikertelen."))
      .finally(() => setLoading(false));
  }, []);

  if (!localStorage.getItem("vbf_token")) {
    return <SignedOutCallout featureLabel="az adatexport és a fiók törlése" />;
  }

  const handleDelete = async () => {
    if (!user) return;
    if (
      !window.confirm(
        "Biztosan törlöd a fiókodat? A saját jegyzőkönyveid és adataid véglegesen törlődnek. Ez nem vonható vissza."
      )
    ) {
      return;
    }
    const typed = window.prompt(`Megerősítés: írd be pontosan a felhasználóneved (${user.username})`);
    if (typed !== user.username) {
      toast.error("A felhasználónév nem egyezett — törlés megszakítva.");
      return;
    }
    setBusy("del");
    try {
      const r = await deleteMyAccount();
      toast.success(r.message || "Fiók törölve.");
      clearSession();
      window.dispatchEvent(new Event("vbf-token-changed"));
      navigate("/");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Törlés sikertelen.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-[var(--vbf-panel-padding)] bg-[var(--bg-main)]">
      <PageHeader
        eyebrow="Megfelelés"
        title="Adatok és adatvédelem (GDPR)"
        description={
          <>
            Adathordozhatóság (export) és törlés joga — a backend{" "}
            <code className="rounded bg-[var(--color-bg-input)] px-1 text-xs">/api/users/me/…</code> végpontjai szerint.
          </>
        }
      />

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Tájékoztatók</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <a
              href={legalUrls.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline min-h-11 inline-flex items-center"
            >
              Adatkezelési tájékoztató (teljes szöveg)
            </a>
            <a
              href={legalUrls.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-text-muted)] hover:text-primary min-h-11 inline-flex items-center"
            >
              Felhasználási feltételek
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Adatok letöltése (export)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-[var(--color-text-muted)]">
            <p>
              <strong className="text-[var(--color-text-main)]">JSON:</strong> profil, jegyzőkönyv meta, ügyfelek és
              vizsgálók összefoglalója — géppel olvasható.
            </p>
            <p>
              <strong className="text-[var(--color-text-main)]">ZIP:</strong> részletes jegyzőkönyv adatok, diagramok és
              képek — nagyobb méretű lehet.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="min-h-11"
                disabled={loading || busy !== null}
                onClick={async () => {
                  setBusy("json");
                  try {
                    await downloadMyDataJsonFile();
                    toast.success("JSON letöltve.");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "Export hiba");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === "json" ? "Készül…" : "JSON letöltése"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 border border-[var(--border-color)]"
                disabled={loading || busy !== null}
                onClick={async () => {
                  setBusy("zip");
                  try {
                    await downloadMyDataZipFile();
                    toast.success("ZIP letöltve.");
                  } catch (e: unknown) {
                    toast.error(e instanceof Error ? e.message : "ZIP hiba");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === "zip" ? "Készül…" : "Teljes ZIP letöltése"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-rose-800">Fiók törlése</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <p className="text-[var(--color-text-muted)]">
              A saját fiókod és a hozzá tartozó, általad létrehozott jegyzőkönyvek törlése.{" "}
              <strong className="text-[var(--color-text-main)]">
                Az egyetlen főadmin fiók nem törölhető itt
              </strong>{" "}
              — ekkor a backend hibaüzenetet ad; ebben az esetben az üzemeltetővel kell egyeztetni.
            </p>
            <Button
              type="button"
              variant="danger"
              className="min-h-11 w-full sm:w-auto"
              disabled={loading || busy !== null || !user}
              onClick={handleDelete}
            >
              {busy === "del" ? "Törlés…" : "Fiókom végleges törlése"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
