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


def _privacy_html() -> str:
    """Adatkezelési tájékoztató – adatkezelő adatai az IMPRINT_* env-ből."""
    company = os.getenv("IMPRINT_COMPANY_NAME", "SZIKORA ZOLTÁN EV")
    seat = os.getenv("IMPRINT_SEAT", "2091 Etyek, Liliom köz 1, Magyarország")
    tax_no = os.getenv("IMPRINT_TAX_NO", "91460028-1-27")
    email = os.getenv("ADMIN_EMAIL", os.getenv("SMTP_USER", "info@vbfpremium.hu"))
    phone = os.getenv("IMPRINT_PHONE", "+36303419594")
    web = os.getenv("IMPRINT_WEB", "www.vbfpremium.hu")
    hosting = os.getenv("IMPRINT_HOSTING", "Amazon Web Services (AWS) Frankfurt")

    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adatkezelési tájékoztató | VBF Premium</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1f2937; }}
        h1 {{ font-size: 1.5rem; margin-bottom: 1rem; }}
        h2 {{ font-size: 1.15rem; margin-top: 1.5rem; }}
        p {{ margin: 0.5rem 0; }}
        ul {{ margin: 0.5rem 0; padding-left: 1.5rem; }}
        .updated {{ font-size: 0.9rem; color: #6b7280; }}
    </style>
</head>
<body>
    <h1>Adatkezelési tájékoztató (GDPR)</h1>
    <p class="updated">Utolsó frissítés: 2026. március. A weboldal látogatói és felhasználói részére. A szolgáltatás a GDPR (EU 2016/679) és a magyar adatvédelmi törvény szerint kezeli adatait.</p>

    <h2>1. Az adatkezelő</h2>
    <p><strong>Szolgáltató, adatkezelő:</strong><br>
    Név / cégnév: {company}<br>
    Székhely: {seat}<br>
    Adószám: {tax_no}<br>
    Weboldal: {web}<br>
    E-mail: <a href="mailto:{email}">{email}</a><br>
    Telefon: {phone}</p>
    <p>Az adatkezeléssel kapcsolatos kérdéseivel a fenti e-mail címen vagy postacímen kérhet további tájékoztatást; válaszunkat késedelem nélkül, 20 napon belül (legfeljebb 1 hónapon belül) megküldjük.</p>

    <h2>2. Kezelt személyes adatok és célja</h2>
    <ul>
        <li><strong>Fiók (bejelentkezett felhasználó):</strong> felhasználónév, jelszó (titkosítva), e-mail, szerepkör, céghez rendelés, előfizetés lejárata – szerződés / szolgáltatás teljesítése.</li>
        <li><strong>Nyilvános demó regisztráció:</strong> felhasználónév, e-mail (kötelező), jelszó, opcionálisan megjelenített cégnév (új ingyenes „demó” cég létrehozásához) – fiók létrehozása és a szolgáltatás kipróbálása. Ha a regisztrációnál bejelöli a marketing jelölőnégyzetet, e-mail címe a lenti „Marketing” pont szerint kerül kezelésre.</li>
        <li><strong>Jegyzőkönyvek, rajzok, mérési adatok, fényképek:</strong> Ön által létrehozott vagy feltöltött tartalom – szolgáltatás nyújtása, tárolás, export.</li>
        <li><strong>PDF és Word export:</strong> a rendszer a megadott adatokból dokumentumot generál. Az <strong>ingyenes / demó</strong> csomag esetén a letölthető PDF <strong>technikai vízjellel</strong> készül; ez a szolgáltatás működésének része.</li>
        <li><strong>Fizetés, előfizetés megújítása:</strong> e-mail, név, számlázási cím, adószám (utalásos megrendelés); a megrendelés és a számla kiállítása. Opcionálisan bankkártyás fizetés (Stripe) esetén a fizetési szolgáltató saját feltételei szerint dolgozza fel a tranzakciót.</li>
        <li><strong>Marketing / hírlevél:</strong> ha kifejezetten hozzájárul (feliratkozás vagy regisztráció), tároljuk: e-mail, opcionálisan név, feliratkozás forrása. Cél: hírlevél, újdonságok. Leiratkozás bármikor lehetséges.</li>
        <li><strong>Kapcsolat űrlap:</strong> név, e-mail, cég, üzenet – megkeresés kezelése.</li>
        <li><strong>Napló (audit, biztonság):</strong> bejelentkezés, regisztráció, fontos műveletek, szükség szerint IP-cím – jogos érdek, visszaélések megelőzése.</li>
    </ul>

    <h2>3. Jogalap és alapelvek</h2>
    <p>A személyes adatokat jogszerűen, tisztességesen és átláthatóan kezeljük; csak meghatározott, egyértelmű és jogszerű célból gyűjtjük; megfelelő technikai és szervezési intézkedésekkel biztosítjuk a biztonságot. Szerződés teljesítése (fiók, jegyzőkönyv, export), jogi kötelezettség (számla, számvitel), jogos érdek (biztonság, naplózás). A <strong>marketing</strong> kizárólag önkéntes hozzájárulás alapján; a hozzájárulást bármikor visszavonhatja.</p>

    <h2>4. Megőrzés</h2>
    <ul>
        <li>Fiók és szakmai tartalom: a fiók fennállásáig; törlés kérése után legfeljebb 30 napon belül törlés vagy anonimizálás.</li>
        <li>Marketing lista: a hozzájárulás visszavonásáig; leiratkozás után törlés vagy megjelölés.</li>
        <li>Számla, megrendelés, fizetési előzmény: a számviteli törvénynek megfelelő időtartam (jellemzően legalább 8 év).</li>
        <li>Audit napló: korlátozott ideig (pl. 1 év), utána törlés vagy anonimizálás.</li>
    </ul>

    <h2>5. Google Analytics és sütik</h2>
    <p><strong>Google Analytics:</strong> A weboldal jelenleg nem használja a Google Analytics alkalmazást. Ha a jövőben alkalmaznánk, a felhasználók a Google Analytics letiltó bővítményével kikapcsolhatnák. További információ: <a href="https://support.google.com/analytics/answer/6004245?hl=hu" target="_blank" rel="noopener">Google Analytics letiltás</a>.</p>
    <p><strong>Sütik (cookie-k):</strong> A sütik kisméretű adatfájlok, amelyeket a böngésző ment le. Vannak olyan sütik, amelyek nem igénylik az előzetes hozzájárulást (pl. hitelesítési, munkamenet-sütik). A belépési token és egyes beállítások helyi tárolásban (localStorage) is tárolhatók. Nem használunk kizárólag reklámcélú, harmadik féltől származó nyomkövető sütit. A sütik kezeléséről a böngésző „Súgó” menüje nyújt tájékoztatást.</p>

    <h2>6. Számlakiállítás</h2>
    <p>Az adatkezelés célja: számla kiállítása és küldése e-mail mellékletként. Jogalap: jogszabályon alapuló kötelező adatkezelés. Kezelt adatok: név, cégnév, cím, e-mail, telefon, adószám, számlaadatok. Megőrzés: a számviteli törvény szerint (jellemzően legalább 8 év). Az adatok megismerésére jogosultak az adatkezelő és alkalmazottai.</p>

    <h2>7. Adatfeldolgozók</h2>
    <p><strong>Tárhelyszolgáltató:</strong> {hosting}. Az Ön adatait a tárhelyszolgáltató által üzemeltetett szerver tárolja. Az adatokhoz csak munkatársaink, illetve a szervert üzemeltető munkatársak férhetnek hozzá. Számlázás: Számlázz.hu vagy más partner, ha alkalmazva. E-mail küldés: SMTP szolgáltató. Bankkártyás fizetés esetén: Stripe (vagy más szolgáltató) saját adatvédelmi szabályzata szerint.</p>
    <p>Külföldre nem továbbítunk adatokat. A bíróság, ügyészség, hatóságok megkeresése esetén adatszolgáltatási kötelezettség teljesítésére csak a szükséges mértékben kerülhet sor.</p>

    <h2>8. Biztonság</h2>
    <p>Jelszó titkosítva (bcrypt), erős jelszókövetelmény, JWT token. Rate limit a bejelentkezéshez és nyilvános végpontokhoz. Élesben HTTPS kötelező. Titkosítás, jelszóvédelem, megfelelő technikai intézkedések. Az interneten keresztüli adattovábbítás nem tekinthető teljes körűen biztonságosnak; a beérkezett adatok tekintetében szigorú előírásokat tartunk be.</p>

    <h2>9. Érintett jogaid (GDPR)</h2>
    <p>Jogosult vagy: tájékoztatásra, hozzáférésre, helyesbítésre, törlésre, korlátozásra, adathordozhatóságra, hozzájárulás visszavonására (ha az adatkezelés erre alapul), tiltakozásra jogos érdek alapú kezelés ellen. Bejelentkezés után az alkalmazásban: <strong>Teljes adatcsomag (ZIP)</strong>, <strong>Adataim (JSON)</strong>, <strong>Fiók törlése</strong>. Marketinghez: leiratkozás. E-mailben is kérhet exportot vagy törlést a {email} címen.</p>
    <p><strong>Panasz:</strong> <a href="https://www.naih.hu" target="_blank" rel="noopener">Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)</a>, 1055 Budapest, Falk Miksa utca 9-11., <a href="https://naih.hu/panaszuegyintezes-rendje.html" target="_blank" rel="noopener">panaszügyintézés</a>.</p>

    <h2>10. Automatizált döntéshozatal</h2>
    <p>A szolgáltatás nem alkalmaz Önre nézve joghatással járó, kizárólag automatizált döntéshozatalt (profilalkotást) a GDPR 22. cikke értelmében.</p>

    <h2>11. Jogszabályok</h2>
    <p>Az adatkezelés alapjául szolgáló jogszabályok: az Európai Parlament és a Tanács (EU) 2016/679 rendelete (GDPR); 2011. évi CXII. törvény az információs önrendelkezési jogról és az információszabadságról; 2001. évi CVIII. törvény az elektronikus kereskedelmi szolgáltatásokról; 2003. évi C. törvény az elektronikus hírközlésről; 2007. évi CXXVII. törvény (ÁFA tv.) 169. §.</p>

    <p class="updated">Utolsó frissítés: 2026. március. <a href="/api/legal/imprint">Impresszum</a> · <a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/aszf">ÁSZF</a> · <a href="/api/legal/jogi-nyilatkozat">Jogi nyilatkozat</a>.</p>
</body>
</html>"""


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
    <p class="updated">Utolsó frissítés: 2026. március. <a href="/api/legal/aszf">ÁSZF</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/jogi-nyilatkozat">Jogi nyilatkozat</a></p>

    <h2>1. A szolgáltatás</h2>
    <p>A VBF Premium („Szolgáltatás”) villamos biztonsági felülvizsgálati jegyzőkönyvek és kapcsolódó dokumentumok szerkesztésére, tárolására és exportálására szolgál. A szolgáltató fenntartja a jogot a funkciók és a díjszabás módosítására.</p>

    <h2>2. Regisztráció és fiók</h2>
    <p>A teljes alkalmazás használatához regisztráció és bejelentkezés szükséges. A megadott adatoknak valósnak kell lenniük. A fiók biztonsága (jelszó, eszköz) a felhasználó felelőssége. Céges fióknál a cégen belüli felhasználók és a limitek az előfizetési csomag szerint érvényesek.</p>
    <p><strong>Nyilvános demó regisztráció:</strong> a szolgáltató lehetővé teheti, hogy új felhasználó önállóan hozzon létre fiókot és egy ingyenes („demó”) céget a kipróbáláshoz. Ehhez érvényes e-mail cím megadása kötelező; opcionálisan megadható megjelenített cégnév, illetve a regisztrációnál külön jelölőnégyzettel hozzájárulhat marketing (hírlevél) célú megkereséshez. A személyes adatok kezelését az <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> részletezi.</p>

    <h2>3. Előfizetés, limitek és dokumentumexport</h2>
    <p>Az előfizetési csomagok (pl. Ingyenes, Pro, Céges) a szolgáltató által meghatározott havi jegyzőkönyv- és felhasználólimitekkel rendelkeznek. A limit túllépése esetén a rendszer a további létrehozást vagy felhasználó hozzáadást korlátozhatja. A fizetős csomagok díjait és feltételeit az <strong>ÁSZF</strong> és a webshop / kosár folyamat során közöljük.</p>
    <p><strong>Ingyenes / demó csomag és PDF:</strong> az ilyen csomaghoz tartozó fiókból letölthető PDF export <strong>technikai vízjellel</strong> készül; ez kipróbálási célú, és nem minősül a fizetős csomaghoz tartozó, teljes értékű dokumentumkimenetnek. A Word-export és a további funkciók a csomag szerint változhatnak. <strong>Előfizetés (Pro) és megújítás:</strong> a fizetés jóváhagyása után a hozzáférés és a dokumentumexport a választott csomagnak megfelelően változik. Meglévő, még érvényes előfizetési időszak esetén az új időtartam a szolgáltató rendszere szerint a hátralévő időre <strong>ráépül</strong> (a már kifizetett napok elvesztése nélkül, a technikai beállításoknak megfelelően). Részletek: <a href="/api/legal/aszf">ÁSZF</a>.</p>

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
    <p class="updated">Utolsó frissítés: 2026. március. <a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/imprint">Impresszum</a> · <a href="/api/legal/jogi-nyilatkozat">Jogi nyilatkozat</a></p>

    <h2>1. Szolgáltató és szolgáltatás</h2>
    <p>A szolgáltató adatait az <a href="/api/legal/imprint">Impresszum</a> tartalmazza. A VBF Premium egy felhőalapú (SaaS) szoftver, amely jelenleg villamos biztonsági felülvizsgálati (VBF) és EPH jegyzőkönyvek készítéséhez, tárolásához és exportálásához nyújt eszközöket; a villámvédelmi felülvizsgálati (VVF) modul később kerül bele. A szolgáltatás igénybevétele regisztráció és – a fizetős csomagok esetén – előfizetés / vásárlás alapján történik.</p>

    <h2>2. Szerződéskötés</h2>
    <p>A webshopban (főoldal) kiválasztott csomag kosárba helyezése, a számlázási adatok megadása és az utalásos megrendelés leadása a szerződéskötési folyamat része. A szerződés a fizetés jóváírása és a szolgáltató jóváhagyása után jön létre, ekkor a hozzáférésről e-mail értesítés készül.</p>

    <h2>3. Ár és fizetés</h2>
    <p>Az árak a webshopban, bruttó forintban (Ft) láthatók. A fizetés jelenleg banki utalással történik. A számla a megadott számlázási cím alapján készül és a megadott e-mailre kerül elküldésre. A hozzáférés az utalás jóváhagyása után kerül aktiválásra (általában 1–2 munkanap). A szolgáltató a 2001. évi CVIII. törvény és a számviteli törvény szerint számlát állít ki.</p>

    <h2>4. Visszamondás (fogyasztó)</h2>
    <p>Ha a vásárló fogyasztó (természetes személy, nem üzleti célból), a 45/2014. (II. 26.) Korm. rendelet 29. § (1) bekezdése alapján <strong>14 napon belül</strong> indoklás nélkül elállhat a szerződéstől. Az elállásról az Impresszumban megadott címre vagy e-mailre történő nyilatkozat szükséges. Ha a szolgáltató a 14 nap lejárta előtt megkezdte a digitális szolgáltatás teljesítését (hozzáférés megadása), és a fogyasztó ezt előre hozzájárulással (pl. „Elfogadom, hogy a hozzáférés megadásával a 14 napos elállási jogom elveszik”) elfogadta, az elállás a digitális tartalomra nem érvényes. Céges / üzleti vásárlás esetén a törvény által kivételként megállapított szabályok érvényesek (pl. nincs 14 napos elállás).</p>

    <h2>5. Panasz és garancia</h2>
    <p>Panasz esetén a vásárló az Impresszumban megadott kapcsolati adaton jelzi a hibát. A szolgáltató a panaszokat megvizsgálja és a 45/2014. (II. 26.) Korm. rendelet szerint, legkésőbb 30 napon belül válaszol. Ha a szolgáltatás hibás, a szolgáltató a jogszabály szerint javítási vagy helyettesítési kötelezettséggel tartozik. A jegyzőkönyvek tartalmi, szakmai helyessége nem a szolgáltató felelőssége, hanem a felhasználóé (felülvizsgáló).</p>

    <h2>6. Előfizetés megszűnése és megújítása</h2>
    <p>Az előfizetés a csomagtól függően havi vagy éves. A meghatározott idő lejárta után a szolgáltató nem köteles automatikusan megújítani; a megújítás a felhasználó által kezdeményezett új megrendelés / fizetés és a szolgáltató jóváhagyása útján történik (kosár, utalás vagy – ha elérhető – bankkártya). Ha a megrendeléskor a fiókhoz tartozó e-mail és a céghez kötött hozzáférés alapján még van érvényes előfizetési idő, a szolgáltató a rendszerben az új időszakot a legkésőbbi érvényes lejáratra <strong>ráépíti</strong>, hogy a már kifizetett napok ne vesszenek el.</p>
    <p>A felhasználó a fiók törlésével vagy az előfizetés megszakításával kérheti a szolgáltatás befejezését; az adatkezelésről az <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> tartalmaz részleteket (törlés, export).</p>

    <h2>7. Egyéb</h2>
    <p>A szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv, a 45/2014. (II. 26.) Korm. rendelet (fogyasztó és vállalkozói szerződésekről), valamint a 2001. évi CVIII. törvény (e-commerce) rendelkezései az irányadók. A szolgáltató fenntartja a jogot az ÁSZF módosítására; a lényeges változásról a felhasználót értesíti (pl. e-mail). A további használat a módosítás elfogadásának minősül.</p>
</body>
</html>
"""


# Jogi nyilatkozat – szerzői jog, adatkezelési összefoglaló (IMPRINT_* env)
def _legal_notice_html() -> str:
    company = os.getenv("IMPRINT_COMPANY_NAME", "SZIKORA ZOLTÁN EV")
    web = os.getenv("IMPRINT_WEB", "www.vbfpremium.hu")
    email = os.getenv("ADMIN_EMAIL", os.getenv("SMTP_USER", "info@vbfpremium.hu"))

    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jogi nyilatkozat | VBF Premium</title>
    <style>
        body {{ font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1f2937; }}
        h1 {{ font-size: 1.5rem; margin-bottom: 1rem; }}
        h2 {{ font-size: 1.15rem; margin-top: 1.5rem; }}
        p {{ margin: 0.5rem 0; }}
        ul {{ margin: 0.5rem 0; padding-left: 1.5rem; }}
        .updated {{ font-size: 0.9rem; color: #6b7280; }}
    </style>
</head>
<body>
    <h1>Jogi nyilatkozat</h1>
    <p class="updated">Utolsó frissítés: 2026. március. <a href="/api/legal/imprint">Impresszum</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/aszf">ÁSZF</a></p>

    <h2>1. Fenntartó és üzemeltető</h2>
    <p>Az Ön által látogatott honlap ({web}) fenntartója és üzemeltetője a {company}.</p>

    <h2>2. Szerzői jog</h2>
    <p>A weboldal szerzői jogi műnek minősül. Önnek jogában áll a weboldal egyes részeit kinyomtatni vagy merevlemezre letölteni, és más személyekkel megosztani, feltéve hogy ezt kizárólag tájékoztatás céljából teszi. Az Ön által készített valamennyi másolatnak tartalmaznia kell a következő szerzői jogi nyilatkozatot: <strong>Copyright © {company}. Minden jog fenntartva.</strong></p>
    <p>Előzetes írásbeli jóváhagyás nélkül tilos a weboldal egészének vagy részének, részletének tájékoztatási célon túli (pl. kereskedelmi célú) másolása, többszörözése, újra nyilvánossághoz történő közvetítése, és/vagy a weboldal tartalmának mindenfajta eltorzítása, megcsonkítása, egészben vagy részben történő használata, felhasználása, feldolgozása, értékesítése a {company} írásos hozzájárulása nélkül. Előzetes írásbeli jóváhagyás nélkül tilos módosítani a weboldalt (vagy annak bármely részét), vagy belefoglalni azt bármilyen más műbe, nyomtatott dokumentumba, blogba vagy harmadik fél weboldalába.</p>
    <p>A weboldal olvasója, felhasználója tudomásul veszi, hogy a felhasználási engedély nélküli felhasználás esetén a szerzőt kötbér illeti meg. A kötbér összege mondatonként és/vagy képenként és/vagy videónként bruttó 25.000 Ft. Szerzői jogi jogsértés esetén közjegyzői ténytanúsítás alkalmazásra kerülhet, melynek összegét a jogsértő felhasználóra hárítjuk.</p>

    <h2>3. Szolgáltatás és számlázás</h2>
    <p>A {company} ezúton tájékoztatja Ügyfeleit, hogy a szolgáltatások nyújtása és a számlázás kizárólag a {company} nevében és javára történik.</p>
    <p>A {company}-vel történő kapcsolatfelvétel, megrendelés vagy bármilyen üzleti ügylet kizárólag a {company}-vel jön létre. Nem használunk fedőcégeket; alvállalkozók bevonása esetén minden esetben egyértelmű és átlátható szerződéses viszonyt biztosítunk.</p>
    <p>A számlázás mindig a {company} nevében, hivatalos magyar adószámmal történik, így ügyfeleink biztosak lehetnek a szolgáltatás jogszerűségében és átláthatóságában.</p>

    <h2>4. Adatkezelési összefoglaló</h2>
    <p>A {company} tájékoztatja a {web} weboldalra látogatókat az oldalán keresztül kezelt adatokról, az adatkezelés elveiről és az érintettek jogairól.</p>
    <ul>
        <li><strong>Jogalap:</strong> az érintett önkéntes hozzájárulása (2011. évi CXII. törvény), szerződés teljesítése, jogi kötelezettség. Csak a Látogató által megadott személyes adatokat kezeljük.</li>
        <li><strong>Sütik:</strong> technikai adatok (IP-cím, cookie-k) a weboldal működéséhez, látogatottság mérésére. A böngésző Beállítások / Adatvédelem menüpontjában letilthatók; ezzel egyes szolgáltatások korlátozottan érhetők el. A weboldal jelenleg nem használja a Google Analytics rendszert. Részletek: <a href="/api/legal/privacy">Adatkezelési tájékoztató</a>.</li>
        <li><strong>Jogszabályok:</strong> 2011. évi CXII. törvény (Infotv.), 1992. évi LXIII. törvény (Avtv.), 2001. évi CVIII. törvény (Ekertv.), GDPR.</li>
        <li><strong>Célok:</strong> szolgáltatás nyújtása, tájékoztatás, kapcsolattartás, jogi kötelezettség teljesítése. Közvetlen marketing csak önkéntes hozzájárulás esetén.</li>
        <li><strong>Érintett jogai:</strong> tájékoztatás, hozzáférés, helyesbítés, törlés, tiltakozás. Megkeresés: <a href="mailto:{email}">{email}</a> vagy az Impresszumban megadott cím. Válasz: legfeljebb 30 napon belül.</li>
        <li><strong>Hírlevél:</strong> a {email} címről küldjük azon ügyfeleknek, akik előzetesen hozzájárultak. Leiratkozás a hírlevelekben található linkkel lehetséges.</li>
        <li><strong>Biztonság:</strong> megfelelő technikai és szervezési intézkedések a személyes adatok védelmére.</li>
        <li><strong>Külső linkek:</strong> más oldalakra navigáláskor a Látogató elhagyja a weboldalt; az ottani adatkezelésért a {company} felelősséget nem vállal.</li>
        <li><strong>Internet:</strong> a nyilvános interneten történő adatközlés adatbiztonsági szempontból nem minden esetben védett; az ebből fakadó kockázatokért a {company} felelősséget nem vállal.</li>
    </ul>

    <h2>5. Elérhetőség</h2>
    <p>A weboldal üzemeltetőjének elérhetősége: <a href="/api/legal/imprint">Impresszum</a>.</p>

    <p class="updated">Utolsó frissítés: 2026. március. <a href="/api/legal/imprint">Impresszum</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/aszf">ÁSZF</a></p>
</body>
</html>"""


# Impresszum – szolgáltató adatai (cégnév, székhely, adószám, képviselő)
def _imprint_html() -> str:
    company = os.getenv("IMPRINT_COMPANY_NAME", "SZIKORA ZOLTÁN EV")
    seat = os.getenv("IMPRINT_SEAT", "2091 Etyek, Liliom köz 1, Magyarország")
    reg_no = os.getenv("IMPRINT_REG_NO", "Egyéni vállalkozó")
    nyilv = os.getenv("IMPRINT_NYILVANTARTASI", "61186846")  # EV nyilvántartási szám
    tax_no = os.getenv("IMPRINT_TAX_NO", "91460028-1-27")
    bank = os.getenv("IMPRINT_BANK_ACCOUNT", "11711113-20002781")
    hosting = os.getenv("IMPRINT_HOSTING", "Amazon Web Services (AWS) Frankfurt")
    email = os.getenv("ADMIN_EMAIL", os.getenv("SMTP_USER", "info@vbfpremium.hu"))
    phone = os.getenv("IMPRINT_PHONE", "+36303419594")
    bank_line = f'    <p><strong>Bankszámlaszám:</strong><br>{bank}</p>\n' if bank else ""
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
    <p class="updated"><a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/aszf">ÁSZF</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/jogi-nyilatkozat">Jogi nyilatkozat</a></p>

    <p><strong>Szolgáltató / Üzemeltető:</strong><br>{company}</p>
    <p><strong>Székhely:</strong><br>{seat}</p>
    <p><strong>Nyilvántartási forma:</strong><br>{reg_no}</p>
    <p><strong>Nyilvántartási szám:</strong><br>{nyilv}</p>
    <p><strong>Adószám:</strong><br>{tax_no}</p>
    {bank_line}<p><strong>Tárhelyszolgáltató:</strong><br>{hosting}</p>
    <p><strong>Kapcsolat:</strong><br>E-mail: <a href="mailto:{email}">{email}</a><br>Telefon: {phone}</p>

    <p>Az oldal üzemeltetője felel a tartalomért és a szolgáltatás nyújtásáért. Jogi és adatvédelmi kérdésekben a fenti e-mail címen vagy a weboldal Kapcsolat űrlapján lehet jelezni.</p>
</body>
</html>
"""


@router.get("/api/legal/privacy", response_class=HTMLResponse)
@router.get("/legal/privacy", response_class=HTMLResponse)
def legal_privacy():
    """Adatkezelési tájékoztató (GDPR). Tartalom: IMPRINT_*, ADMIN_EMAIL env változókból."""
    return HTMLResponse(_privacy_html())


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


@router.get("/api/legal/jogi-nyilatkozat", response_class=HTMLResponse)
@router.get("/legal/jogi-nyilatkozat", response_class=HTMLResponse)
def legal_notice():
    """Jogi nyilatkozat – szerzői jog, szolgáltatás/számlázás, adatkezelési összefoglaló."""
    return HTMLResponse(_legal_notice_html())


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
