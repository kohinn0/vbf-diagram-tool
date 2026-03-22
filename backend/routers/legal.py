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


def _legal_css() -> str:
    """Közös CSS a jogi oldalakhoz – VBF témához igazítva (villamos, jegyzőkönyv)."""
    return """
    :root { --primary: #0ea5e9; --primary-light: #38bdf8; --accent: #f59e0b; --bg: #040914; --surface: #0b1527; --text: #e2e8f0; --text-muted: #94a3b8; --border: rgba(14,165,233,0.2); }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { background: var(--bg); }
    body {
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        background: radial-gradient(ellipse 100% 50% at 50% 0%, rgba(14,165,233,0.08) 0%, transparent 50%),
                    var(--bg);
        color: var(--text);
        line-height: 1.7;
        min-height: 100vh;
    }
    .legal-wrap { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
    .legal-header {
        border-bottom: 1px solid var(--border);
        padding-bottom: 1.5rem;
        margin-bottom: 2rem;
    }
    .legal-header a { color: var(--primary-light); text-decoration: none; font-weight: 600; }
    .legal-header a:hover { color: var(--accent); text-decoration: underline; }
    .legal-header h1 {
        font-size: 1.6rem;
        background: linear-gradient(135deg, #fff 0%, var(--primary-light) 50%, var(--accent) 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
    }
    .legal-nav { font-size: 0.9rem; color: var(--text-muted); }
    .legal-nav a { color: var(--primary-light); }
    .legal-nav a:hover { color: var(--accent); }
    h2 {
        font-size: 1.2rem;
        color: var(--primary-light);
        margin-top: 2rem;
        margin-bottom: 0.75rem;
        padding-left: 12px;
        border-left: 3px solid var(--accent);
    }
    p { margin: 0.75rem 0; color: var(--text); }
    ul { margin: 0.75rem 0; padding-left: 1.5rem; color: var(--text); }
    li { margin: 0.35rem 0; }
    a { color: var(--primary-light); }
    a:hover { color: var(--accent); }
    .updated { font-size: 0.9rem; color: var(--text-muted); margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .updated a { color: var(--primary-light); }
    """


def _legal_header(title: str, nav_links: str) -> str:
    """Jogi oldal fejléc – VBF branding, visszalépés."""
    return f"""
    <div class="legal-wrap">
    <header class="legal-header">
        <a href="/">← VBF Premium</a>
        <h1>{title}</h1>
        <p class="legal-nav">{nav_links}</p>
    </header>
    <main>
    """


def _legal_footer(links: str) -> str:
    return f'<p class="updated">{links}</p></main></div>'


def _imprint_email() -> str:
    """Központi e-mail cím az IMPRINT_* / ADMIN_EMAIL env-ből."""
    return os.getenv("ADMIN_EMAIL", os.getenv("SMTP_USER", "info@vbfpremium.hu"))


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
    email = _imprint_email()
    phone = os.getenv("IMPRINT_PHONE", "+36303419594")
    web = os.getenv("IMPRINT_WEB", "www.vbfpremium.hu")
    hosting = os.getenv("IMPRINT_HOSTING", "Amazon Web Services (AWS) Frankfurt")

    nav = f'<a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/aszf">ÁSZF</a> · <a href="/api/legal/imprint">Impresszum</a> · <a href="/api/legal/jogi-nyilatkozat">Jogi nyilatkozat</a>'
    footer_links = f"Utolsó frissítés: 2026. március. {nav}"
    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adatkezelési tájékoztató | VBF Premium</title>
    <style>{_legal_css()}</style>
</head>
<body>
{_legal_header("Adatkezelési tájékoztató (GDPR)", f"Utolsó frissítés: 2026. március. A weboldal látogatói és felhasználói részére. {nav}")}

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

    <h2>7. Adatfeldolgozók és adatfeldolgozási megállapodás (DPA)</h2>
    <p><strong>Tárhelyszolgáltató:</strong> {hosting}. <strong>CDN és proxy szolgáltatás:</strong> Cloudflare, Inc. (USA) – a Cloudflare DPA és Standard Contractual Clauses szerint. Az Ön adatait a tárhelyszolgáltató által üzemeltetett szerver tárolja. Az adatokhoz csak munkatársaink, illetve a szervert üzemeltető munkatársak férhetnek hozzá. Számlázás: Számlázz.hu vagy más partner, ha alkalmazva. E-mail küldés: SMTP szolgáltató. Bankkártyás fizetés esetén: Stripe (vagy más szolgáltató) saját adatvédelmi szabályzata szerint.</p>
    <p><strong>B2B adatfeldolgozás:</strong> Ha Ön jogi személyként vagy vállalkozóként a jegyzőkönyvekben megbízottjaik (ügyfeleik) adatait kezeli, mi adatfeldolgozóként járunk el. A GDPR 28. cikke szerinti adatfeldolgozási megállapodás (DPA) kérhető a {email} címen.</p>
    <p>Külföldre nem továbbítunk adatokat. A bíróság, ügyészség, hatóságok megkeresése esetén adatszolgáltatási kötelezettség teljesítésére csak a szükséges mértékben kerülhet sor.</p>

    <h2>8. Adatbiztonság és adatvédelmi incidens</h2>
    <p>Adatait megfelelő technikai és szervezési intézkedésekkel védjük:</p>
    <ul>
        <li><strong>Az adatokat titkosítva tároljuk</strong> – titkosítás nyugalmi állapotban (adatbázis szinten)</li>
        <li><strong>SSL titkosítás</strong> minden adatátvitelnél (HTTPS)</li>
        <li><strong>Jelszavak hash-elve</strong> tárolva (bcrypt), erős jelszókövetelmény</li>
        <li><strong>Hozzáférés korlátozása</strong> – need-to-know elv, szerepkör alapú jogosultságok</li>
        <li><strong>Rendszeres biztonsági mentések</strong></li>
        <li><strong>Adatvédelmi incidenskezelési protokoll</strong> – a GDPR 33–34. cikke szerint</li>
    </ul>
    <p>JWT token hitelesítés, rate limit a bejelentkezéshez és nyilvános végpontokhoz. Az interneten keresztüli adattovábbítás nem tekinthető teljes körűen biztonságosnak; a beérkezett adatok tekintetében szigorú előírásokat tartunk be.</p>
    <p><strong>Adatvédelmi incidens:</strong> Ha adatvédelmi incidens (személyes adat jogosulatlan hozzáférése, elvesztése stb.) történik, a hatóságot (NAIH) legkésőbb 72 órán belül értesítjük; ha magas kockázat áll fenn az érintettek jogaira, az érintetteket is haladéktalanul tájékoztatjuk.</p>

    <h2>9. Érintett jogaid (GDPR)</h2>
    <p>Jogosult vagy: tájékoztatásra, hozzáférésre, helyesbítésre, törlésre, korlátozásra, adathordozhatóságra, hozzájárulás visszavonására (ha az adatkezelés erre alapul), tiltakozásra jogos érdek alapú kezelés ellen. Bejelentkezés után az alkalmazásban: <strong>Teljes adatcsomag (ZIP)</strong>, <strong>Adataim (JSON)</strong>, <strong>Fiók törlése</strong>. Marketinghez: leiratkozás. E-mailben is kérhet exportot vagy törlést a {email} címen.</p>
    <p><strong>Panasz:</strong> <a href="https://www.naih.hu" target="_blank" rel="noopener">Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)</a>, 1055 Budapest, Falk Miksa utca 9-11., <a href="https://naih.hu/panaszuegyintezes-rendje.html" target="_blank" rel="noopener">panaszügyintézés</a>.</p>

    <h2>10. Automatizált döntéshozatal</h2>
    <p>A szolgáltatás nem alkalmaz Önre nézve joghatással járó, kizárólag automatizált döntéshozatalt (profilalkotást) a GDPR 22. cikke értelmében.</p>

    <h2>11. Jogszabályok</h2>
    <p>Az adatkezelés alapjául szolgáló jogszabályok: az Európai Parlament és a Tanács (EU) 2016/679 rendelete (GDPR); 2011. évi CXII. törvény az információs önrendelkezési jogról és az információszabadságról; 2001. évi CVIII. törvény az elektronikus kereskedelmi szolgáltatásokról; 2003. évi C. törvény az elektronikus hírközlésről; 2007. évi CXXVII. törvény (ÁFA tv.) 169. §.</p>

    {_legal_footer(footer_links)}
</body>
</html>"""


def _terms_html() -> str:
    email = _imprint_email()
    nav = '<a href="/api/legal/aszf">ÁSZF</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/imprint">Impresszum</a> · <a href="/api/legal/jogi-nyilatkozat">Jogi nyilatkozat</a>'
    footer_links = f"Utolsó frissítés: 2026. március. {nav}"
    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Felhasználási feltételek | VBF Premium</title>
    <style>{_legal_css()}</style>
</head>
<body>
{_legal_header("Felhasználási feltételek", footer_links)}

    <h2>1. A szolgáltatás és az elfogadás</h2>
    <p>A VBF Premium („Szolgáltatás”) villamos biztonsági felülvizsgálati jegyzőkönyvek és kapcsolódó dokumentumok szerkesztésére, tárolására és exportálására szolgál.</p>
    <p><strong>Vállalkozói / jogi személy használat:</strong> A szolgáltatás kizárólag vállalkozói (üzleti) célra szól. Csak jogi személyek (Kft., Zrt., Bt. stb.) vagy természetes személyek – egyéni vállalkozóként, szakmai tevékenységük során – igénybe vehetik. A szolgáltatás nem szól fogyasztóknak (természetes személynek nem üzleti célú használatra). A regisztrációval és a szolgáltatás használatával a felhasználó kijelenti, hogy vállalkozóként vagy jogi személyként, üzleti célból veszi igénybe a szolgáltatást. Fogyasztói vásárlás nem lehetséges; a fogyasztóvédelmi törvények (pl. 14 napos elállás) nem alkalmazandók.</p>
    <p>A szolgáltatás használatával, regisztrációval vagy előfizetéssel a felhasználó tudomásul veszi és elfogadja a jelen feltételek és az ÁSZF teljes körű hatályát. Ha nem fogadja el a feltételeket, a szolgáltatás használata tilos.</p>
    <p><strong>Változtatás joga:</strong> A szolgáltató fenntartja a jogot a feltételek, a szolgáltatás tartalma, funkciói, díjszabása és elérhetősége bármely időben történő módosítására, kiegészítésére vagy felfüggesztésére, előzetes értesítés nélkül is. A szolgáltatás nem minősül megszakíthatatlannak; a szolgáltató jogosult a szolgáltatás részleges vagy teljes felfüggesztésére, korlátozására vagy megszüntetésére. A lényeges változásról a szolgáltató igyekszik értesíteni (pl. e-mail, weboldal); a további használat a módosítás elfogadásának minősül.</p>

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

    <h2>6. Felelősség, garancia kizárás, kártérítési limit</h2>
    <p><strong>Jegyzőkönyvek tartalma:</strong> A szolgáltató semmilyen jogi felelősséget nem vállal a felhasználók által a szoftverben létrehozott jegyzőkönyvek (VBF, EPH, villámvédelem, elosztó rajz stb.) tartalmáért. A szolgáltatás csupán eszközt nyújt; a szolgáltató nem állít ki, nem ellenőriz, nem minősít semmilyen dokumentumot. A jegyzőkönyvek tartalma, szakmai helyessége, jogszabályi megfelelősége és jogérvényessége kizárólag a felhasználó felelőssége.</p>
    <p><strong>Garancia kizárás:</strong> A szolgáltatás „ahogy van” (as is) és „amennyire elérhető” (as available) alapon nyújtott. A szolgáltató nem vállal kifejezett vagy hallgatólagos garanciát a szolgáltatás megszakítatlanságára, hibamentességére vagy adott célra való alkalmasságára. A jogszabály által el nem roncsolható fogyasztói jogok továbbra is érvényesek.</p>
    <p><strong>Felelősség korlátozása:</strong> A szolgáltató – a jogszabály által kötelezően előírt esetek kivételével – nem vállal felelősséget közvetett, következményes, különleges vagy végrehajtási kárért, adatvesztésért, üzletszegényért, elszalasztott haszonért. Üzleti (nem fogyasztói) használat esetén a szolgáltató felelőssége a kérdéses időszakra (max. 12 hónap) fizetett díjak összegével szemben legfeljebb a befizetett összegre korlátozódik.</p>
    <p><strong>Force majeure:</strong> A szolgáltató nem felelős olyan teljesítési akadályokért, amelyek az ő ésszerű befolyása alatt álló körülményeken kívül esnek (pl. természeti katasztrófa, háború, terrorizmus, áramszünet, internet- vagy tárhelyszolgáltatói hiba, vírusok, szabotázs, hatósági intézkedés).</p>
    <p><strong>Kártalanítás:</strong> A felhasználó kártalanítja a szolgáltatót minden olyan követeléssel, kárral és költséggel szemben, amely a felhasználó szolgáltatás-használatából, a benne létrehozott tartalmakból (jegyzőkönyvek stb.) vagy a felhasználó jogi kötelezettségének megsértéséből ered, ideértve a szolgáltató védelmében felmerülő jogi költségeket.</p>
    <p><strong>Alkalmazandó jog és illetékesség:</strong> A jelen feltételek magyar jog szerint értelendők. A szerződéses felekre vonatkozó jogvitákra – a jogszabály által kivételként meghatározott eseteket kivéve – a szolgáltató székhelye szerint illetékes magyar bíróság kizárólagos illetékességgel rendelkezik.</p>

    <h2>7. Megszűnés</h2>
    <p>A fiók inaktivitás vagy a feltételek megsértése alapján felfüggeszthető vagy törölhető. A felhasználó bármikor kérheti fiókja és adatai törlését; az adatkezelés az <strong>Adatkezelési tájékoztató (GDPR)</strong> szerint történik.</p>

    <h2>8. Kapcsolat</h2>
    <p>Kérdés esetén a weboldal Kapcsolat űrlapján vagy közvetlenül e-mailben: <a href="mailto:{email}">{email}</a>. Részletes adatok: <a href="/api/legal/imprint">Impresszum</a>.</p>

    <h2>9. Szakaszhatóság, teljes megállapodás, jogok alól való mentesülés</h2>
    <p><strong>Szakaszhatóság:</strong> Ha a jelen feltételek bármely rendelkezése jogellenesnek, érvénytelennék vagy végrehajthatatlannak minősülne, az adott rendelkezés hatályát veszti; a többi rendelkezés teljes mértékben hatályban marad.</p>
    <p><strong>Teljes megállapodás:</strong> A jelen feltételek és az ÁSZF a felek teljes megállapodását képezik a szolgáltatásra vonatkozóan. Korábbi, szóbeli vagy írásbeli megállapodások, megértések vagy nyilatkozatok a jelen feltételekhez és az ÁSZF-hez képest nem alkalmazandók.</p>
    <p><strong>Jogok alól való mentesülés hiánya:</strong> A szolgáltató részéről a jelen feltételek egyes rendelkezéseinek nem kérhető végrehajtása vagy késedelmes végrehajtása nem jelenti a további rendelkezések alól való mentesülést vagy a jogsértés elfogadását.</p>

    {_legal_footer(footer_links)}
</body>
</html>"""


# Általános Szerződési Feltételek (ÁSZF) – előfizetés, vásárlás, visszamondás, panasz
def _aszf_html() -> str:
    email = _imprint_email()
    nav = '<a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/imprint">Impresszum</a> · <a href="/api/legal/jogi-nyilatkozat">Jogi nyilatkozat</a>'
    footer_links = f"Utolsó frissítés: 2026. március. {nav}"
    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ÁSZF | VBF Premium</title>
    <style>{_legal_css()}</style>
</head>
<body>
{_legal_header("Általános Szerződési Feltételek (ÁSZF)", footer_links)}

    <h2>1. Szolgáltató és szolgáltatás</h2>
    <p>A szolgáltató adatait az <a href="/api/legal/imprint">Impresszum</a> tartalmazza. A VBF Premium egy felhőalapú (SaaS) szoftver, amely jelenleg villamos biztonsági felülvizsgálati (VBF) és EPH jegyzőkönyvek készítéséhez, tárolásához és exportálásához nyújt eszközöket; a villámvédelmi felülvizsgálati (VVF) modul később kerül bele. A szolgáltatás igénybevétele regisztráció és – a fizetős csomagok esetén – előfizetés / vásárlás alapján történik.</p>
    <p><strong>Vállalkozói / jogi személy vásárlás:</strong> A szolgáltatás kizárólag vállalkozói (üzleti) célra szól. Csak jogi személyek (Kft., Zrt., Bt. stb.) vagy egyéni vállalkozók – szakmai tevékenységük során – vásárolhatnak. Fogyasztói (természetes személy nem üzleti célú) vásárlás nem lehetséges. A megrendeléssel a vásárló kijelenti, hogy vállalkozóként vagy jogi személyként, üzleti célból vásárol. A fogyasztóvédelmi jogszabályok (pl. 14 napos elállási jog) ezért nem alkalmazandók.</p>
    <p><strong>Változtatás joga:</strong> A szolgáltató fenntartja a jogot az ÁSZF, a szolgáltatás tartalma, funkciói és díjszabása bármely időben történő módosítására vagy megszüntetésére. A lényeges változásról igyekszünk értesíteni (pl. e-mail: <a href="mailto:{email}">{email}</a>). A további használat a módosítás elfogadásának minősül. A szolgáltatás nem minősül megszakíthatatlannak; a szolgáltató jogosult a szolgáltatás részleges vagy teljes felfüggesztésére, korlátozására vagy megszüntetésére.</p>

    <h2>2. Szerződéskötés</h2>
    <p>A webshopban (főoldal) kiválasztott csomag kosárba helyezése, a számlázási adatok megadása és az utalásos megrendelés leadása a szerződéskötési folyamat része. A szerződés a fizetés jóváírása és a szolgáltató jóváhagyása után jön létre, ekkor a hozzáférésről e-mail értesítés készül.</p>

    <h2>3. Ár és fizetés</h2>
    <p>Az árak a webshopban, bruttó forintban (Ft) láthatók. A fizetés jelenleg banki utalással történik. A számla a megadott számlázási cím alapján készül és a megadott e-mailre kerül elküldésre. A hozzáférés az utalás jóváhagyása után kerül aktiválásra (általában 1–2 munkanap). A szolgáltató a 2001. évi CVIII. törvény és a számviteli törvény szerint számlát állít ki.</p>

    <h2>4. Visszamondás (elállás)</h2>
    <p>A szolgáltatás kizárólag vállalkozói / jogi személy vásárlásra szól (1. pont). Fogyasztói vásárlás nem lehetséges, ezért az elállási jog (45/2014. Korm. rendelet 29. §) nem alkalmazandó. Céges, üzleti vásárlás esetén a törvény által kivételként megállapított szabályok érvényesek: <strong>nincs 14 napos elállás</strong>. Ha mégis olyan vásárló merülne fel, aki fogyasztónak minősülne, az elállásról az Impresszumban megadott címre vagy e-mailre (<a href="mailto:{email}">{email}</a>) történő nyilatkozat szükséges; a digitális tartalomra (hozzáférés megadása után) az elállás a jogszabály szerint általában nem érvényes.</p>

    <h2>5. Panasz és garancia</h2>
    <p>Panasz esetén a vásárló a kapcsolati adaton jelzi a hibát: <a href="mailto:{email}">{email}</a>. A szolgáltató a panaszokat megvizsgálja és a 45/2014. (II. 26.) Korm. rendelet szerint, legkésőbb 30 napon belül válaszol. Ha a szolgáltatás (szoftver működése) hibás, a szolgáltató a jogszabály szerint javítási vagy helyettesítési kötelezettséggel tartozik.</p>
    <p><strong>Jegyzőkönyvek tartalma – felelősség kizárása:</strong> A szolgáltató semmilyen jogi felelősséget nem vállal a felhasználók által létrehozott jegyzőkönyvek (VBF, EPH, villámvédelem, elosztó rajz stb.) tartalmáért, szakmai helyességéért, jogszabályi megfelelőségéért vagy jogérvényességéért. A jegyzőkönyvek tartalma kizárólag a felülvizsgálatot végző szakember felelőssége. A garancia a szoftver működésére vonatkozik, nem a benne szerkesztett dokumentumok tartalmára.</p>
    <p><strong>Garancia kizárás:</strong> A szolgáltatás „ahogy van” (as is) és „amennyire elérhető” (as available) alapon nyújtott. A szolgáltató nem vállal kifejezett vagy hallgatólagos garanciát a megszakítatlanságra, hibamentességre vagy adott célra való alkalmasságra. A jogszabály által el nem roncsolható fogyasztói jogok továbbra is érvényesek.</p>

    <h2>6. Előfizetés megszűnése és megújítása</h2>
    <p>Az előfizetés a csomagtól függően havi vagy éves. A meghatározott idő lejárta után a szolgáltató nem köteles automatikusan megújítani; a megújítás a felhasználó által kezdeményezett új megrendelés / fizetés és a szolgáltató jóváhagyása útján történik (kosár, utalás vagy – ha elérhető – bankkártya). Ha a megrendeléskor a fiókhoz tartozó e-mail és a céghez kötött hozzáférés alapján még van érvényes előfizetési idő, a szolgáltató a rendszerben az új időszakot a legkésőbbi érvényes lejáratra <strong>ráépíti</strong>, hogy a már kifizetett napok ne vesszenek el.</p>
    <p>A felhasználó a fiók törlésével vagy az előfizetés megszakításával kérheti a szolgáltatás befejezését; az adatkezelésről az <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> tartalmaz részleteket (törlés, export).</p>

    <h2>7. Felelősség korlátozása, force majeure, kártalanítás, illetékesség</h2>
    <p><strong>Felelősség korlátozása:</strong> A szolgáltató – a jogszabály által kötelezően előírt (pl. fogyasztói) jogok kivételével – nem vállal felelősséget közvetett, következményes, különleges vagy végrehajtási kárért, adatvesztésért, üzletszegényért, elszalasztott haszonért. Üzleti (nem fogyasztói) vásárlás esetén a szolgáltató felelőssége legfeljebb a kérdéses időszakra (max. 12 hónap) befizetett díjak összegével korlátozódik.</p>
    <p><strong>Force majeure:</strong> A szolgáltató nem felelős olyan akadályokért, amelyek az ő ésszerű befolyása alatt álló körülményeken kívül esnek (természeti katasztrófa, háború, terrorizmus, áramszünet, internet-/tárhelyszolgáltatói hiba, vírusok, szabotázs, hatósági intézkedés stb.).</p>
    <p><strong>Kártalanítás:</strong> A vásárló kártalanítja a szolgáltatót minden olyan követeléssel, kárral és költséggel szemben (ideértve a jogi védelmi költségeket), amely a vásárló szolgáltatás-használatából, a benne létrehozott tartalmakból (jegyzőkönyvek stb.) vagy a vásárló jogi kötelezettségének megsértéséből ered.</p>
    <p><strong>Illetékesség:</strong> A jelen szerződés magyar jog szerint értelendő. A jogvitákra – a jogszabály által kivételként meghatározott eseteket kivéve – a szolgáltató székhelye szerint illetékes magyar bíróság kizárólagos illetékességgel rendelkezik.</p>

    <h2>8. Egyéb</h2>
    <p>A szerződésben nem szabályozott kérdésekben a Polgári Törvénykönyv, a 45/2014. (II. 26.) Korm. rendelet (fogyasztó és vállalkozói szerződésekről), valamint a 2001. évi CVIII. törvény (e-commerce) rendelkezései az irányadók.</p>
    <p><strong>Szakaszhatóság:</strong> Ha az ÁSZF bármely rendelkezése jogellenesnek vagy érvénytelennék minősülne, az adott rendelkezés hatályát veszti; a többi rendelkezés hatályban marad.</p>
    <p><strong>Teljes megállapodás:</strong> A jelen ÁSZF és a Felhasználási feltételek a felek teljes megállapodását képezik. Korábbi szóbeli vagy írásbeli megállapodások nem alkalmazandók.</p>
    <p><strong>Jogok alól való mentesülés hiánya:</strong> A szolgáltató egyes jogai késedelmes vagy nem kért végrehajtása nem jelenti a többi jog alól való mentesülést.</p>

    {_legal_footer(footer_links)}
</body>
</html>"""


# Jogi nyilatkozat – szerzői jog, adatkezelési összefoglaló (IMPRINT_* env)
def _legal_notice_html() -> str:
    company = os.getenv("IMPRINT_COMPANY_NAME", "SZIKORA ZOLTÁN EV")
    web = os.getenv("IMPRINT_WEB", "www.vbfpremium.hu")
    email = _imprint_email()
    nav = '<a href="/api/legal/imprint">Impresszum</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/aszf">ÁSZF</a>'
    footer_links = f"Utolsó frissítés: 2026. március. {nav}"

    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jogi nyilatkozat | VBF Premium</title>
    <style>{_legal_css()}</style>
</head>
<body>
{_legal_header("Jogi nyilatkozat", footer_links)}

    <h2>1. Fenntartó és üzemeltető</h2>
    <p>Az Ön által látogatott honlap ({web}) fenntartója és üzemeltetője a {company}.</p>

    <h2>2. Szerzői jog</h2>
    <p>A weboldal szerzői jogi műnek minősül. Önnek jogában áll a weboldal egyes részeit kinyomtatni vagy merevlemezre letölteni, és más személyekkel megosztani, feltéve hogy ezt kizárólag tájékoztatás céljából teszi. Az Ön által készített valamennyi másolatnak tartalmaznia kell a következő szerzői jogi nyilatkozatot: <strong>Copyright © {company}. Minden jog fenntartva.</strong></p>
    <p>Előzetes írásbeli jóváhagyás nélkül tilos a weboldal egészének vagy részének, részletének tájékoztatási célon túli (pl. kereskedelmi célú) másolása, többszörözése, újra nyilvánossághoz történő közvetítése, és/vagy a weboldal tartalmának mindenfajta eltorzítása, megcsonkítása, egészben vagy részben történő használata, felhasználása, feldolgozása, értékesítése a {company} írásos hozzájárulása nélkül. Előzetes írásbeli jóváhagyás nélkül tilos módosítani a weboldalt (vagy annak bármely részét), vagy belefoglalni azt bármilyen más műbe, nyomtatott dokumentumba, blogba vagy harmadik fél weboldalába.</p>
    <p>A weboldal olvasója, felhasználója tudomásul veszi, hogy a felhasználási engedély nélküli felhasználás esetén a szerzőt kötbér illeti meg. A kötbér összege mondatonként és/vagy képenként és/vagy videónként bruttó 25.000 Ft. Szerzői jogi jogsértés esetén közjegyzői ténytanúsítás alkalmazásra kerülhet, melynek összegét a jogsértő felhasználóra hárítjuk.</p>

    <h2>3. Jegyzőkönyvek tartalma – felelősség kizárása</h2>
    <p><strong>A {company} semmilyen jogi felelősséget nem vállal a felhasználók által a VBF Premium szoftverben létrehozott jegyzőkönyvek (VBF, EPH, villámvédelem, elosztó rajz stb.) tartalmáért, szakmai helyességéért, jogszabályi megfelelőségéért vagy jogérvényességéért.</strong> A szolgáltatás eszközt nyújt a dokumentumok szerkesztéséhez; a tartalom kizárólag a felhasználó (a felülvizsgálatot végző szakember) felelőssége. Bármilyen kár, igény vagy jogkövetkezmény, amely a jegyzőkönyvek tartalmából ered, a felhasználóra hárul. A szolgáltatás „ahogy van” alapon nyújtott; garanciát nem vállalunk a dokumentumok tartalmára, pontosságára vagy jogszabályi megfelelőségére vonatkozóan.</p>

    <h2>4. Szolgáltatás és számlázás</h2>
    <p>A {company} ezúton tájékoztatja Ügyfeleit, hogy a szolgáltatások nyújtása és a számlázás kizárólag a {company} nevében és javára történik. A VBF Premium szolgáltatás kizárólag vállalkozóknak és jogi személyeknek szól; fogyasztói vásárlás nem lehetséges (részletek: <a href="/api/legal/terms">Felhasználási feltételek</a>, <a href="/api/legal/aszf">ÁSZF</a>).</p>
    <p>A {company}-vel történő kapcsolatfelvétel, megrendelés vagy bármilyen üzleti ügylet kizárólag a {company}-vel jön létre. Nem használunk fedőcégeket; alvállalkozók bevonása esetén minden esetben egyértelmű és átlátható szerződéses viszonyt biztosítunk.</p>
    <p>A számlázás mindig a {company} nevében, hivatalos magyar adószámmal történik, így ügyfeleink biztosak lehetnek a szolgáltatás jogszerűségében és átláthatóságában.</p>

    <h2>5. Adatkezelési összefoglaló</h2>
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

    <h2>6. Elérhetőség</h2>
    <p>A weboldal üzemeltetőjének elérhetősége: <a href="/api/legal/imprint">Impresszum</a>.</p>

    <h2>7. Felelősség kizárása – általános</h2>
    <p>A {company} a jogszabály által el nem roncsolható jogok kivételével semmilyen felelősséget nem vállal közvetett, következményes vagy különleges kárért, adatvesztésért, üzletszegényért. A szolgáltatás legfontosabb jogi feltételei (felelősség korlátozása, force majeure, kártalanítás, illetékesség) a <a href="/api/legal/terms">Felhasználási feltételek</a> és az <a href="/api/legal/aszf">ÁSZF</a> tartalmazza.</p>

    <h2>8. Változtatás joga</h2>
    <p>A {company} fenntartja a jogot a weboldal tartalmának, a szolgáltatásoknak, az áraknak és a jelen nyilatkozatnak bármely időben történő módosítására vagy megszüntetésére. A változások előzetes értesítés nélkül is életbe léphetnek.</p>

    {_legal_footer(footer_links)}
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
    email = _imprint_email()
    phone = os.getenv("IMPRINT_PHONE", "+36303419594")
    bank_line = f'    <p><strong>Bankszámlaszám:</strong><br>{bank}</p>\n' if bank else ""
    nav = '<a href="/api/legal/terms">Felhasználási feltételek</a> · <a href="/api/legal/aszf">ÁSZF</a> · <a href="/api/legal/privacy">Adatkezelési tájékoztató</a> · <a href="/api/legal/jogi-nyilatkozat">Jogi nyilatkozat</a>'
    footer_links = f"Utolsó frissítés: 2026. március. {nav}"
    return f"""<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Impresszum | VBF Premium</title>
    <style>{_legal_css()}</style>
</head>
<body>
{_legal_header("Impresszum", footer_links)}

    <p><strong>Szolgáltató / Üzemeltető:</strong><br>{company}</p>
    <p><strong>Székhely:</strong><br>{seat}</p>
    <p><strong>Nyilvántartási forma:</strong><br>{reg_no}</p>
    <p><strong>Nyilvántartási szám:</strong><br>{nyilv}</p>
    <p><strong>Adószám:</strong><br>{tax_no}</p>
    {bank_line}<p><strong>Tárhelyszolgáltató:</strong><br>{hosting}</p>
    <p><strong>Kapcsolat:</strong><br>E-mail: <a href="mailto:{email}">{email}</a><br>Telefon: {phone}</p>

    <p>Az oldal üzemeltetője felel a weboldal saját tartalmáért és a szolgáltatás nyújtásáért. <strong>A felhasználók által a szoftverben létrehozott jegyzőkönyvek tartalmáért a szolgáltató semmilyen jogi felelősséget nem vállal</strong> (részletek: <a href="/api/legal/terms">Felhasználási feltételek</a>, <a href="/api/legal/jogi-nyilatkozat">Jogi nyilatkozat</a>). Jogi és adatvédelmi kérdésekben a fenti e-mail címen vagy a weboldal Kapcsolat űrlapján lehet jelezni.</p>

    {_legal_footer(footer_links)}
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
    return HTMLResponse(_terms_html())


@router.get("/api/legal/aszf", response_class=HTMLResponse)
@router.get("/legal/aszf", response_class=HTMLResponse)
def legal_aszf():
    """Általános Szerződési Feltételek (ÁSZF) – előfizetés, vásárlás, visszamondás, panasz."""
    return HTMLResponse(_aszf_html())


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
    to_email = _imprint_email()
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
