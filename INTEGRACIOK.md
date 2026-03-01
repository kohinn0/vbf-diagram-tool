# Integrációk: Összekötés, Számlázás, Automatikus hozzáférés, Utalás

## 0. Utalásos opció – biztonságos, konzolból nem matatható

- **Főoldal (index.html)**: „Utalással fizetek” űrlap (email, név, csomag, opcionális cím/adószám). Beküldés → **POST /api/payments/request-bank-transfer** (rate limit: 5 kérés / 15 perc / IP).
- **Válasz**: Csak `{ "message": "..." }` – **nincs token, nincs order id**, így a böngésző konzolból nem lehet hozzáférést vagy jóváhagyást kicsikarni.
- **Szerver**: PendingOrder létrejön (PENDING), szamlazz.hu számla (ha be van állítva), email a vásárlónak („számla elküldve, hozzáférés az utalás jóváhagyása után”).
- **Hozzáférés**: Csak akkor jár, ha egy **főadmin** az Admin → „Utalásos megrendelések” alatt **Jóváhagyás**-ra kattint. A **mark-paid** endpoint **csak super_admin** jogosultsággal hívható (Bearer token), a konzolból nem lehet megkerülni.
- Összefoglalva: automata számlázás megy utalásnál is; a hozzáférés kizárólag szerveroldali jóváhagyás után aktiválódik, és semmilyen érzékeny adat nem kerül a kliensre.

## 1. Jelenlegi összekötés (index ↔ app) – rendben van?

**Igen.** A flow így néz ki:

- **Főoldal (index.html)** → „Belépés” / „Demó” → **app.html?from=landing** vagy **?demo=1** → ha nincs token, azonnal belépési ablak.
- **App** → „⚡ VBF Premium” kattintás → vissza **index.html**.
- **Stripe sikeres fizetés** → átirányítás **app.html?session_id=...** → „Sikeres vásárlás! Belépési adataidat emailben küldtük.” üzenet.

Ha szeretnéd később:
- a **session_id**-t a backendről is validálni (pl. egy gyors GET hogy tényleg completed-e), azt egy kis endpointtal meg lehet csinálni.
- külön **Regisztráció** linket a főoldalon (jelenleg csak Belépés + vásárlás van).

---

## 2. Automatikus hozzáférés a megvásárolt csomagnak megfelelően

A **Stripe webhook** (checkout.session.completed) mostantól így működik:

1. **Cég (Company)**  
   - Új vásárló: új cég jön létre (név: Stripe customer name vagy email).  
   - Meglévő user (email alapján): a cégéhez kapcsolódik.  
   - A cég **csomagja** mindig **PRO** (havi vagy éves a lejárat és a számla szövege alapján).

2. **Felhasználó (User)**  
   - Új: **COMPANY_ADMIN**, a fenti céghez rendelve, **subscription_expires** = 1 hónap vagy 1 év.  
   - Meglévő: **company_id** beállítás, **subscription_expires** frissítés, szerepkör COMPANY_ADMIN ha TECH/COMPANY_ADMIN volt.

3. **Limitek**  
   - A cég **plan = PRO**, **reports_per_month_limit** és **max_users** nincs beállítva (null).  
   - Így a **subscription_plans** tábla PRO sorából jön a limit (admin felületen beállított értékek).  
   - A report létrehozás és user limit ellenőrzés ezt használja, tehát **a megvásárolt csomagnak megfelelően kapja automatikusan a hozzáférést**.

Összefoglalva: nem kell manuálisan csomagot váltani; a fizetés után a cég PRO-ra áll, a user a céghez kerül, és a PRO limitjek érvényesek.

---

## 3. Szamlazz.hu – automatikus számla (nem manuális)

Cél: fizetés után **automatikusan** készüljön számla, és ne manuálisan kelljen számlázni.

### 3.1 Következő lépések (implementáció)

- A **backend/szamlazz_client.py** jelenleg csak egy **stub**: logol, nem küld tényleges kérést.  
- A Szamlazz.hu **Szamla Agent** API **XML alapú**.  
  Dokumentáció: https://docs.szamlazz.hu/hu/agent/category/generating-invoice  

Amit meg kell valósítani:

1. **Környezeti változók** (élesben):
   - `SZAMLAZZ_USER` – Szamlazz.hu bejelentkezési felhasználónév
   - `SZAMLAZZ_PASS` – jelszó (vagy token, ha az API ezt használja)
   - Opcionális: `SZAMLAZZ_AGENT_URL` (ha más URL lenne)

2. **XML összeállítás**  
   A docs szerint kell:
   - fejléc (eladó = a te céged adatai – ezeket érdemes env-ből vagy CompanySettings-ból venni),
   - vevő adatok (név, irányítószám, város, cím, email; adószám ha van),
   - számla tétel: megnevezés (pl. „VBF Tervező – Éves előfizetés”), nettó/bruttó/ÁFA, pénznem HUF.

3. **Kérés küldése**  
   - POST a Szamlazz.hu Agent URL-re, body = XML, megfelelő Content-Type (és esetlen auth header, ha kell).

4. **Válasz feldolgozása**  
   - Sikeres válasz: pl. `szlahu_szamlaszam`, `szlahu_bruttovegosszeg`; hibánál `szlahu_error`.  
   - Opcionális: számla PDF letöltése (ha az API ad ilyet), majd csatolás a „Sikeres előfizetés” emailhez, vagy link küldése.

5. **Hívás helye**  
   - A **payments.py** webhook már meghívja a  
     `create_invoice_for_stripe_session(session, company, plan_type)`  
     függvényt (új vásárló esetén).  
   - Ha nincs `SZAMLAZZ_USER` / `SZAMLAZZ_PASS`, a stub kihagyja a számla készítést, a webhook továbbra is lefut (hozzáférés, email).

### 3.2 Vevő adatok (Stripe vs. szamlazz)

- A Stripe **customer_details**-ből jön: név, email, cím (irányítószám, város, line1).  
- **Adószám** a Stripe Checkoutból általában **nem**; ha kell, a **checkout oldalon** (index.html / webshop) érdemes külön mezőt venni (céges vásárlóknak), és ezt a Stripe **metadata**-ba vagy **customer_details**-be juttatni, majd a webhook → szamlazz_client számára továbbadni.

### 3.3 Tesztelés

- Szamlazz.hu-n általában van **teszt környezet** (teszt user/jelszó).  
- Először ott érdemes az XML + POST-ot kipróbálni, majd éles userrel éles számlázás.

---

## 4. Összefoglaló

| Mit akartál | Állapot |
|-------------|--------|
| Összekötés index ↔ app | Kész: Belépés/Demó → app + belépési ablak, app → főoldal, Stripe success üzenet. |
| Automatikus hozzáférés a megvásárolt csomagnak megfelelően | Kész: webhook Company + PRO + user COMPANY_ADMIN, limitjek a subscription_plans PRO-jából. |
| Szamlazz.hu – ne manuálisan számlázzak | Stub kész (env, hívás helye, vevő/összeg); a tényleges XML + POST a docs alapján implementálandó. |

Ha szeretnéd, a következő lépés lehet a **szamlazz_client.py** teljes implementációja (XML sablon + POST + válaszkezelés) a hivatalos dokumentáció alapján.

---

## 5. Webshop – mi még nem volt téma (opcionális bővítések)

| Terület | Mi nincs még | Megjegyzés |
|--------|----------------|------------|
| **Stripe session ellenőrzés** | A success oldal csak `?session_id=...`-re mutat üzenetet; a session_id- **t nem ellenőrzi** a backend. | Ha valaki beírja a böngészőbe a `?session_id=hamis`, ugyanazt az üzenetet látja. Opcionális: GET /api/payments/session-status?session_id=xxx (Stripe Session.retrieve), és a frontend csak akkor mutatja a sikert, ha a backend `paid: true`-t ad vissza. |
| **Stripe összeg = admin árak** | A create-checkout-session **fix** 12.990 / 99.000 Ft-ot használ. | Ha az Admin → Csomagokban változtatsz árat, a **Stripe** továbbra is a kódban lévő összeget küldi. Opcionális: összeg lekérése a subscription_plans PRO sorából (price_monthly / price_yearly) és azzal Session létrehozása. |
| **Vásárlási előzmények (admin)** | Nincs egy helyen „minden fizetés” lista. | Utalásos: PendingOrder listázva. Stripe: nincs tárolt rekord (csak a webhook csinál Company+User-t). Ha kell jelentés: webhook-ban írhatsz egy PaymentLog vagy Order táblába (email, összeg, plan, stripe_session_id, created_at). |
| **Visszatérítés / lemondás** | Nincs Stripe refund vagy előfizetés lemondás. | Stripe refund API + a user/company hozzáférés letiltása vagy lejárat módosítása. Lemondás: külön flow (pl. „Lemondom” gomb a fiókban, vagy support). |
| **Kupon / kedvezménykód** | Nincs. | Stripe Coupon / Promotion Code, vagy saját kód tábla + kedvezmény összeg a checkout-nál. |
| **Próbaidő (trial)** | Nincs pl. 14 nap ingyenes. | Stripe subscription mode + trial_period_days, vagy saját logika: új user 14 napig PRO limit, aztán FREE vagy fizetés. |
| **Cookie / GDPR süti szöveg** | Nincs süti (cookie) tájékoztató / elfogadó banner. | Ha csak a bejelentkezési token van (localStorage), sok helyen nem kötelező süti banner, de érdemes egy rövid szöveg (pl. láblécben): „Az oldal a bejelentkezéshez szükséges adatot tárolja.” Opcionális: egyszerű „Elfogadom” banner. |
| **Regisztráció link** | Nincs külön „Regisztráció” a főoldalon. | Jelenleg csak Belépés + Vásárlás. Ha nyitott regisztrációt nem akarsz, maradhat így; ha „Cég regisztráció” (utána admin hozzáadja a usereket), azt külön flow kell. |
| **ENTERPRISE / Kapcsolat** | Csak havi és éves árazás van. | „Céges / egyedi árazás” = „Kapcsolat” gomb (email vagy űrlap), nincs automata fizetés. |
| **Számla PDF melléklet** | Szamlazz válaszból jönne a PDF. | Ha a szamlazz_client visszaadja a PDF-et, az utalásos és/vagy Stripe utáni email mellékelheti. |

Ezek mind **opcionális** finomítások; a webshop alap (főoldal, árazás, Stripe, utalás, jóváhagyás, automata hozzáférés, jogi oldalak) megvan.
