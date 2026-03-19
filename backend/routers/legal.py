"""
Jogi oldalak + nyilvános csomaglista + kapcsolat (landing / webshop).
SaaS: GET /api/legal/privacy, GET /api/legal/terms, GET /api/plans, POST /api/contact (auth nélkül).
"""
import os
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

import auth
import database
import schemas

router = APIRouter()
logger = logging.getLogger("vbf")


class ContactRequest(BaseModel):
    name: str = ""
    email: str = ""
    company: Optional[str] = None
    message: str = ""


@router.get("/api/plans", response_model=List[schemas.SubscriptionPlanResponse])
def get_plans_public(db: Session = Depends(auth.get_db)):
    """Nyilvános csomaglista: árak és tartalom a landing/webshop oldalhoz (auth nélkül)."""
    plans = db.query(database.SubscriptionPlan).order_by(database.SubscriptionPlan.sort_order).all()
    return plans


PRIVACY_HTML = """<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adatkezelési tájékoztató | VBF Premium</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1f2937; }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; }
        h2 { font-size: 1.15rem; margin-top: 1.5rem; }
        p { margin: 0.5rem 0; }
        ul { margin: 0.5rem 0; padding-left: 1.5rem; }
        .updated { font-size: 0.9rem; color: #6b7280; }
    </style>
</head>
<body>
    <h1>Adatkezelési tájékoztató (GDPR)</h1>
    <p class="updated">Utolsó frissítés: 2026. A szolgáltatás a GDPR (EU 2016/679) és a magyar adatvédelmi törvény szerint kezeli adatait.</p>

    <h2>1. Az adatkezelő</h2>
    <p>Az adatkezelő: a VBF szolgáltatást üzemeltető szervezet (cégnév, székhely). Kapcsolat: az oldalon megadott kapcsolat űrlapon, vagy az üzemeltető által beállított e-mail címen. Adatvédelmi kérdésekben ugyanezen a címen lehet érdeklődni.</p>

    <h2>2. Kezelt személyes adatok és célja</h2>
    <ul>
        <li><strong>Fiók:</strong> felhasználónév, jelszó (titkosítva), e-mail, szerepkör, cég, előfizetés lejárat – szerződés teljesítése.</li>
        <li><strong>Jegyzőkönyvek, rajzok, mérési adatok:</strong> Ön által létrehozott tartalom – szolgáltatás nyújtása.</li>
        <li><strong>Fizetés:</strong> e-mail, név, cím, adószám (Stripe/utalás); csak tranzakció azonosító és összeg tárolásra kerül nálunk.</li>
        <li><strong>Kapcsolat űrlap:</strong> név, e-mail, cég, üzenet – kérés teljesítése.</li>
        <li><strong>Napló:</strong> bejelentkezési kísérletek, IP, audit – biztonság, jogi kötelezettség.</li>
    </ul>

    <h2>3. Jogalap</h2>
    <p>Szerződés teljesítése, jogi kötelezettség (pl. számla), légítim érdek (biztonság). Kapcsolat és nem feltétlenül szükséges sütik: hozzájárulás.</p>

    <h2>4. Megőrzés</h2>
    <ul>
        <li>Fiók és tartalom: törlésig, törlés kérést követően max. 30 nap.</li>
        <li>Számla és fizetési előzmény: számviteli törvény (pl. 8 év).</li>
        <li>Audit napló: korlátozott ideig (pl. 1 év), utána anonimizálás/törlés.</li>
    </ul>

    <h2>5. Érintett jogaid (GDPR)</h2>
    <p>Jogosult vagy hozzáférésre, helyesbítésre, törlésre, korlátozásra, adathordozhatóságra, tiltakozásra. Bejelentkezés után az alkalmazásban: <strong>Teljes adatcsomag (ZIP)</strong> – minden jegyzőkönyv, fénykép, diagram és egyéb adat egy letölthető ZIP-ben (fiók törlése előtt vagy bármikor kérhető), továbbá <strong>Adataim (JSON)</strong> összefoglaló és <strong>Fiók törlése</strong>. E-mailben is kérheti az exportot vagy a törlést. Panasz: <a href="https://www.naih.hu" target="_blank" rel="noopener">NAIH</a>.</p>

    <h2>6. Adatfeldolgozók</h2>
    <p>Stripe (fizetés, <a href="https://stripe.com/hu/privacy" target="_blank" rel="noopener">adatvédelmi nyilatkozat</a>), Szamlazz.hu (számla), SMTP (e-mail). Nemzetközi: Stripe EU régió.</p>

    <h2>7. Biztonság</h2>
    <p>Jelszó titkosítva (bcrypt), erős jelszókövetelmény, JWT token (lejárat konfigurálható). Bejelentkezés után a jelszót a „Jelszó módosítása” menüpontból lehet megváltoztatni. A bejelentkezési kísérletek rate limit alatt állnak (brute-force védelem). Élesben HTTPS és erős SECRET_KEY használata kötelező.</p>

    <h2>8. Sütik és helyi tárolás</h2>
    <p>Belépési token helyi tárolásban (pl. localStorage). Süti/hozzájárulási szöveg és Elfogadom megjelenik; a hozzájárulást rögzítjük. Nem használunk reklám-/nyomkövető sütit.</p>

</body>
</html>
"""


TERMS_HTML = """<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Felhasználási feltételek | VBF Premium</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1f2937; }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; }
        h2 { font-size: 1.15rem; margin-top: 1.5rem; }
        p { margin: 0.5rem 0; }
        .updated { font-size: 0.9rem; color: #6b7280; }
    </style>
</head>
<body>
    <h1>Felhasználási feltételek</h1>
    <p class="updated">Utolsó frissítés: 2026. <a href="/api/legal/aszf">ÁSZF</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a></p>

    <h2>1. A szolgáltatás</h2>
    <p>A VBF Premium („Szolgáltatás”) villamos biztonsági felülvizsgálati jegyzőkönyvek és kapcsolódó dokumentumok szerkesztésére, tárolására és exportálására szolgál. A szolgáltató fenntartja a jogot a funkciók és a díjszabás módosítására.</p>

    <h2>2. Regisztráció és fiók</h2>
    <p>A használathoz regisztráció szükséges. A megadott adatok helyesek legyenek. A fiók biztonsága a felhasználó felelőssége. Céges fióknál a cégen belüli felhasználók és a limitek az előfizetési csomag szerint érvényesek.</p>

    <h2>3. Előfizetés és limitek</h2>
    <p>Az előfizetési csomagok (pl. Ingyenes, Pro, Céges) a szolgáltató által meghatározott havi jegyzőkönyv- és felhasználólimitekkel rendelkeznek. A limit túllépése esetén a rendszer a további létrehozást vagy felhasználó hozzáadást korlátozhatja. A fizetős csomagok díjait és feltételeit az <strong>ÁSZF</strong> és a számlázási oldalon közöljük.</p>

    <h2>4. Elfogadható használat</h2>
    <p>A szolgáltatást csak törvényes célra, a jogosultságokon belül kell használni. Tilos jogosulatlan hozzáférés, automatizált túlterhelés, mások adatainak jogtalan kezelése vagy a rendszer biztonságának megkerülése.</p>

    <h2>5. Szellemi tulajdon és adatok</h2>
    <p>A felhasználó által feltöltött vagy létrehozott tartalom (jegyzőkönyv, rajz) továbbra is a felhasználó vagy a megbízó cég tulajdona. A szolgáltató a szolgáltatás nyújtásához szükséges mértékben feldolgozhatja és tárolja az adatokat az adatkezelési tájékoztató szerint.</p>

    <h2>6. Felelősség</h2>
    <p>A szolgáltató a rendelkezésre állásra és az adat biztonságára törekszik, de nem vállal felelősséget közvetett kárért vagy adatvesztésért, kivéve ha azt jogszabály kifejezetten előírja. A jegyzőkönyvek tartalmi és szakmai helyessége a felhasználó felelőssége.</p>

    <h2>7. Megszűnés</h2>
    <p>A fiók inaktivitás vagy a feltételek megsértése alapján felfüggeszthető vagy törölhető. A felhasználó bármikor kérheti fiókja és adatai törlését; az adatkezelés az <strong>Adatkezelési tájékoztató (GDPR)</strong> szerint történik.</p>

    <h2>8. Kapcsolat</h2>
    <p>Kérdés esetén a weboldal Kapcsolat űrlapján vagy a szolgáltató hivatalos e-mail címén érhetők el. <a href="/api/legal/imprint">Impresszum</a>.</p>
</body>
</html>
"""


# Általános Szerződési Feltételek (ÁSZF) – előfizetés, vásárlás, visszamondás, panasz
ASZF_HTML = """<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ÁSZF | VBF Premium</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1f2937; }
        h1 { font-size: 1.5rem; margin-bottom: 1rem; }
        h2 { font-size: 1.15rem; margin-top: 1.5rem; }
        p { margin: 0.5rem 0; }
        ul { margin: 0.5rem 0; padding-left: 1.5rem; }
        .updated { font-size: 0.9rem; color: #6b7280; }
    </style>
</head>
<body>
    <h1>Általános Szerződési Feltételek (ÁSZF)</h1>
    <p class="updated">Utolsó frissítés: 2026. <a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/imprint">Impresszum</a></p>

    <h2>1. Szolgáltató és szolgáltatás</h2>
    <p>A szolgáltató adatait az <a href="/api/legal/imprint">Impresszum</a> tartalmazza. A VBF Premium egy felhőalapú (SaaS) szoftver, amely jelenleg villamos biztonsági felülvizsgálati (VBF) és EPH jegyzőkönyvek készítéséhez, tárolásához és exportálásához nyújt eszközöket; a villámvédelmi felülvizsgálati (VVF) modul később kerül bele. A szolgáltatás igénybevétele regisztráció és – a fizetős csomagok esetén – előfizetés / vásárlás alapján történik.</p>

    <h2>2. Szerződéskötés</h2>
    <p>A webshopban (főoldal) kiválasztott csomag kosárba helyezése, a fizetési adatok megadása és a fizetés (kártyás vagy utalásos) végrehajtása, illetve a regisztráció és a fizetés sikeres jóváhagyása a szerződés létrejöttét jelenti. A szolgáltató a fizetés teljesítését követően a megadott e-mail címen értesíti a felhasználót a hozzáférésről. Digitális tartalom (hozzáférés) esetén a teljesítés azonnali.</p>

    <h2>3. Ár és fizetés</h2>
    <p>Az árak a webshopban, bruttó forintban (Ft) láthatók. A fizetés kártyával (Stripe) vagy banki utalással történhet. Utalás esetén a számla a megadott számlázási cím alapján készül és a megadott e-mailre kerül elküldésre. A hozzáférés az utalás jóváhagyása után kerül aktiválásra (általában 1–2 munkanap). A szolgáltató a 2001. évi CVIII. törvény és a számviteli törvény szerint számlát állít ki.</p>

    <h2>4. Visszamondás (fogyasztó)</h2>
    <p>Ha a vásárló fogyasztó (természetes személy, nem üzleti célból), a 45/2014. (II. 26.) Korm. rendelet 29. § (1) bekezdése alapján <strong>14 napon belül</strong> indoklás nélkül elállhat a szerződéstől. Az elállásról az Impresszumban megadott címre vagy e-mailre történő nyilatkozat szükséges. Ha a szolgáltató a 14 nap lejárta előtt megkezdte a digitális szolgáltatás teljesítését (hozzáférés megadása), és a fogyasztó ezt előre hozzájárulással (pl. „Elfogadom, hogy a hozzáférés megadásával a 14 napos elállási jogom elveszik”) elfogadta, az elállás a digitális tartalomra nem érvényes. Céges / üzleti vásárlás esetén a törvény által kivételként megállapított szabályok érvényesek (pl. nincs 14 napos elállás).</p>

    <h2>5. Panasz és garancia</h2>
    <p>Panasz esetén a vásárló az Impresszumban megadott kapcsolati adaton jelzi a hibát. A szolgáltató a panaszokat megvizsgálja és a 45/2014. (II. 26.) Korm. rendelet szerint, legkésőbb 30 napon belül válaszol. Ha a szolgáltatás hibás, a szolgáltató a jogszabály szerint javítási vagy helyettesítési kötelezettséggel tartozik. A jegyzőkönyvek tartalmi, szakmai helyessége nem a szolgáltató felelőssége, hanem a felhasználóé (felülvizsgáló).</p>

    <h2>6. Előfizetés megszűnése</h2>
    <p>Az előfizetés a csomagtól függően havi vagy éves. A meghatározott idő lejárta után a szolgáltató nem köteles automatikusan megújítani; a megújítás a felhasználó és a szolgáltató közötti megállapodás szerint történik. A felhasználó a fiók törlésével vagy az előfizetés megszakításával kérheti a szolgáltatás befejezését; az adatkezelésről az <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> tartalmaz részleteket (törlés, export).</p>

    <h2>7. Egyéb</h2>
    <p>A szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv, a 45/2014. (II. 26.) Korm. rendelet (fogyasztó és vállalkozói szerződésekről), valamint a 2001. évi CVIII. törvény (e-commerce) rendelkezései az irányadók. A szolgáltató fenntartja a jogot az ÁSZF módosítására; a lényeges változásról a felhasználót értesíti (pl. e-mail). A további használat a módosítás elfogadásának minősül.</p>
</body>
</html>
"""


# Impresszum – szolgáltató adatai (cégnév, székhely, adószám, képviselő)
def _imprint_html() -> str:
    company = os.getenv("IMPRINT_COMPANY_NAME", "SZIKORA ZOLTÁN EV")
    seat = os.getenv("IMPRINT_SEAT", "2091 Etyek, Liliom köz 1, Magyarország")
    reg_no = os.getenv("IMPRINT_REG_NO", "Egyéni vállalkozó")
    tax_no = os.getenv("IMPRINT_TAX_NO", "91460028-1-27")
    hosting = os.getenv("IMPRINT_HOSTING", "Amazon Web Services (AWS)")
    email = os.getenv("ADMIN_EMAIL", os.getenv("SMTP_USER", "kapcsolat@example.com"))
    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Impresszum | VBF Premium</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1f2937; }}
        h1 {{ font-size: 1.5rem; margin-bottom: 1rem; }}
        p {{ margin: 0.5rem 0; }}
        .updated {{ font-size: 0.9rem; color: #6b7280; }}
    </style>
</head>
<body>
    <h1>Impresszum</h1>
    <p class="updated"><a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/aszf">ÁSZF</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a></p>

    <p><strong>Szolgáltató / Üzemeltető:</strong><br>{company}</p>
    <p><strong>Székhely:</strong><br>{seat}</p>
    <p><strong>Nyilvántartási forma:</strong><br>{reg_no}</p>
    <p><strong>Adószám:</strong><br>{tax_no}</p>
    <p><strong>Tárhelyszolgáltató:</strong><br>{hosting}</p>
    <p><strong>Kapcsolat (e-mail):</strong><br><a href="mailto:{email}">{email}</a></p>

    <p>Az oldal üzemeltetője felel a tartalomért és a szolgáltatás nyújtásáért. Jogi és adatvédelmi kérdésekben a fenti e-mail címen vagy a weboldal Kapcsolat űrlapján lehet jelezni.</p>
</body>
</html>
"""


@router.get("/api/legal/privacy", response_class=HTMLResponse)
@router.get("/legal/privacy", response_class=HTMLResponse)
def legal_privacy():
    """Adatkezelési tájékoztató (GDPR)."""
    return HTMLResponse(PRIVACY_HTML)


@router.get("/api/legal/terms", response_class=HTMLResponse)
@router.get("/legal/terms", response_class=HTMLResponse)
def legal_terms():
    """Felhasználási feltételek."""
    return HTMLResponse(TERMS_HTML)


@router.get("/api/legal/aszf", response_class=HTMLResponse)
@router.get("/legal/aszf", response_class=HTMLResponse)
def legal_aszf():
    """Általános Szerződési Feltételek (ÁSZF) – előfizetés, vásárlás, visszamondás, panasz."""
    return HTMLResponse(ASZF_HTML)


@router.get("/api/legal/imprint", response_class=HTMLResponse)
@router.get("/legal/imprint", response_class=HTMLResponse)
def legal_imprint():
    """Impresszum – szolgáltató adatai. Tartalom: IMPRINT_* és ADMIN_EMAIL env változókból."""
    return HTMLResponse(_imprint_html())


@router.post("/api/contact")
def contact_submit(body: ContactRequest):
    """
    Kapcsolat űrlap (céges / egyedi árazás, általános kérdés). Email küldése a beállított címre.
    Ha nincs SMTP, 503 vagy üzenet nélkül kihagyja (konfigurációtól függően).
    """
    name = (body.name or "").strip()[:200]
    email = (body.email or "").strip().lower()[:255]
    company = (body.company or "").strip()[:200] if body.company else ""
    message = (body.message or "").strip()[:2000]
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Érvényes email cím szükséges.")
    to_email = os.getenv("ADMIN_EMAIL") or os.getenv("SMTP_USER") or ""
    if not to_email:
        logger.warning("Kapcsolat űrlap: nincs ADMIN_EMAIL/SMTP_USER, üzenet nem küldhető.")
        return {"message": "Üzenet fogadva. Hamarosan válaszolunk."}
    import smtplib
    from email.message import EmailMessage
    smtp_server = os.getenv("SMTP_SERVER", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    if not (smtp_server and smtp_user and smtp_pass):
        return {"message": "Üzenet fogadva. Hamarosan válaszolunk."}
    msg = EmailMessage()
    msg["Subject"] = f"[VBF Kapcsolat] {name or 'Név nélkül'}"
    msg["From"] = smtp_user
    msg["To"] = to_email
    body_text = f"Név: {name or '-'}\nEmail: {email}\nCég: {company or '-'}\n\nÜzenet:\n{message or '-'}"
    msg.set_content(body_text)
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as e:
        logger.exception("Kapcsolat űrlap email küldés: %s", e)
        raise HTTPException(status_code=503, detail="Az üzenet küldése pillanatnyilag nem sikerült. Kérjük próbáld később vagy írj közvetlenül az email címeddel.")
    return {"message": "Üzenet elküldve. Hamarosan válaszolunk."}
