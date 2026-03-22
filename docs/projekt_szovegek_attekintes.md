# VBF Premium – felhasználói szövegek áttekintése

Ez a dokumentum **átnézésre és szerkesztésre** gyűjti össze a projektben megjelenő (vagy dinamikusan beillesztett) magyar / vegyes szövegeket. A **hivatalos forrás** mindig a megjelölt fájl; eltéréskor a forrást vedd alapul.

**Nem tartalmazza teljes körűen:** backend API válaszüzenetek szövegét, generált Word/PDF sablonok szövegét, e-mail sablonokat a `backend`-ben, adatbázis seedeket, harmadik féltől származó könyvtárakat.

**Dinamikus / változó:** árak a szerverről, kosár összegek, hibaüzenetek a szervertől, diagramfeliratok (hónapnevek), felhasználónevek.

---

## 1. Főoldal – `frontend/index.html`

### 1.1 Meta (SEO)

| Mező | Szöveg |
|------|--------|
| `description` | VBF Premium – Villamos biztonsági felülvizsgálati (VBF) és EPH jegyzőkönyv szoftver magyar villanyszerelőknek. MSZ HD 60364, OTSZ szerinti sablonok. VBF szakértő készítette – szakembertől szakembereknek. Metrel PADFX import, elosztó rajz, hibajegyzék, tableten is működik. |
| `keywords` | (kulcsszólista – lásd HTML) |
| `<title>` | VBF Premium \| VBF és EPH Jegyzőkönyv Szoftver – Villamos Szakemberektől |

### 1.2 Navigáció

- Logo: **VBF Premium**
- Menü: Funkciók · Rólunk · Hogyan Működik · Webshop és árazás · Partnereink · Szakemberek · Gyakori kérdések · 🐛 Hibajelentés (title: Hibajelentés e-mailben (béta verzió))
- Kosár gomb title: **Kosár**
- **Belépés (Jegyzőkönyv)** · **Vásárlás és regisztráció**

### 1.3 Kosár modális

- Cím: **🛒 Kosár**
- Üres kosár: *A kosár üres. Válassz egy licencet az Árazás szekcióból.*
- **Tovább a fizetéshez**
- 2. lépés cím: **Utalásos megrendelés**
- Általános feltételek szöveg (checkbox): vállalkozói vásárlás, Felhasználási feltételek, ÁSZF, felelősség a jegyzőkönyvért
- Tájékoztató: új előfizetés / hosszabbítás, ráépülés, utalás, e-mail egyeztetés, aktiválás
- Bejelentkezett felhasználónak: alkalmazás + kosár ugyanabban a böngészőben
- **Bankkártya (Stripe)** – leírás új fiók / jelszó / e-mail
- Mezők: E-mail (ajánlott), Jelszó, Jelszó megerősítése · **💳 Tovább a biztonságos fizetéshez (Stripe)** · — vagy utalással —
- **🏦 Számla kérése (utalás)**
- Utalás űrlap: E-mail *, Név / Cégnév *, Számlázási cím *, Adószám (opcionális) · **Számla kérése utaláshoz**
- **← Vissza a kosárhoz**

### 1.4 Sikeres fizetés (Stripe) banner

- **✓ Köszönjük a vásárlást!**
- Belépési adatok e-mailben; **Belépés (Jegyzőkönyv)** gomb a menüben
- **Belépés az alkalmazásba**

### 1.5 Hero

- Badge: **⚡ VBF szakértő készítette – szakembertől szakembereknek**
- Alcím (accent): *✨ VBF és EPH jegyzőkönyv, elosztó rajz, Metrel mérések – minden egy helyen*
- **H1:** Villamos biztonsági felülvizsgálat. / Gyorsabban és szakszerűen.
- Bevezetők: VBF szakértő terepen; személyes fejlesztői szöveg (jegyzőkönyv, terep)
- Fő blokk: *Egy helyen minden:* VBF/EPH, rajz, PADFX, hibajegyzék, naptár, LPS, offline… *Szabványos és hiteles:* MSZ, TvMI, OTSZ, logó, Word/PDF, QR, demó vízjel…
- CTA: **Licenc vásárlása** · **Demó és regisztráció**
- Kis szöveg: demó fiók, videó, webshop PDF
- **Miért bízhatsz bennünk?** – fejlesztő VBF szakértő…
- Dekor kártya: VBF · EPH Jegyzőkönyv, MSZ HD 60364 · OTSZ · Elosztó rajz, címkék: Saját logó, Szakértői

### 1.6 Demó szekció

- **Próbáld ki ingyen – VBF jegyzőkönyv demó**
- Alcím: regisztráció után teljes készítő…
- Videó helyőrző: *A bemutató videó hamarosan itt jelenik meg.*
- PDF vízjel / előfizetés szöveg
- **Regisztráció és demó** · **Előfizetés (teljes PDF)**
- **Hírlevél & újdonságok** – nem spamelünk, leiratkozás…
- Checkbox: marketing hozzájárulás
- **Feliratkozom**

### 1.7 Rólunk

- **Rólunk** / *Miért jött létre a VBF Premium?*
- Két bekezdés (Excel/Word időrabló; VBF Premium eredete, szakértő, magyar fejlesztés)
- **Kapcsolat**

### 1.8 Hogyan működik

- Cím + alcím (licenc → kész jegyzőkönyv, négy lépés)
- Bevezető bekezdés (regisztráció, utalás, kiosztás, terep, PADFX, Word/PDF, GDPR)
- Lépéskártyák: **Licenc és regisztráció** · **Munkakiosztás** · **Terepi munka** · **Jegyzőkönyv és aláírás** (saját szövegeikkel)

### 1.9 Funkciók (feature grid)

- Szekciócím + alcím + hosszabb bevezető (MSZ, rajz, PADFX, hibajegyzék, naptár, LPS, export, QR)
- Kártyák címei és leírásai: **Egyvonalas Rajzoló**, **Metrel PADFX import**, **Automatikus hibajegyzék**, **Saját céges arculat**, **QR kód az elosztón**, **Munkakiosztás és naptár**, **Villámvédelem (LPS)**

### 1.10 Árazás (shop szekció)

- **Árazás és licenc vásárlás** + alcím + bevezető (havi/éves, utalás, 1–2 munkanap, online)
- Csomagok: **Havi licenc**, **Éves licenc** (**Legnépszerűbb**), **Céges / egyedi** – jellemzők listái (lásd HTML)
- **Kosárba 🛒** · **Kapcsolat**
- Lábjegyzet: *Válaszd ki a csomagot… kosár ikon…*

### 1.11 Partnerek

- **🤝 Együttműködő Partnereink** + alcím + bevezető
- Partner kártya szövegek (pl. VízVillanyFűtés leírása)
- *Partner lenni szeretnél?* → e-mail

### 1.12 Szakemberek

- **👷 Minősített Szakemberek** + alcím + bevezető
- Példa: Szikora Zoltán, VBF · EPH szakértő, leírás, **Kapcsolat: info@vbfpremium.hu**
- *Szakemberként megjelenni szeretnél?*

### 1.13 Gyakori kérdések (teljes lista – kérdés / válasz)

1. **Béta verzió – hogyan jelezhetek hibát?** – (válasz: béta verzióban fejlesztjük, Hibajelentés link/gomb, e-mail sablon, **Hibajelentés küldése** gomb)
2. **Mi a VBF Premium, és kinek való?**
3. **Milyen csomagok vannak, és mennyibe kerül?**
4. **Hogyan tudok fizetni?**
5. **Kipróbálhatom ingyen vagy próbaidővel?**
6. **A VBF és EPH jegyzőkönyv sablonok megfelelnek az MSZ-nek és az OTSZ-nek?**
7. **Be tudom tölteni a Metrel mérő PADFX méréseit a VBF jegyzőkönyvbe?**
8. **Mikor és hogyan jön meg a számla?**
9. **Milyen gépen, telefonon vagy tableten lehet használni?**
10. **Biztonságban vannak az adataim?**

(A pontos válaszszövegek a `index.html` `#faq` szekcióban.)

### 1.14 „Nem találtad a választ?”

- Cím: **Nem találtad a választ?**
- Szöveg: gyakori kérdések, info@vbfpremium.hu, egy-két munkanap, **béta verzióban** fut, **jelezd egy kattintással e-mailben**
- **Írj nekünk**

### 1.15 Kapcsolat

- **Kapcsolat** + alcím + bevezető (egyedi ár, partnerség, szakemberi megjelenés)
- Második bekezdés: nagyobb csomag, partner, hirdetés, kérdések, 1–2 munkanap
- E-mail · Telefon
- Béta verzió + **🐛 Hibajelentés e-mailben**
- Űrlap: Név, E-mail, Cég, Üzenet placeholder *Kérem a céges ajánlatot…* · **Üzenet küldése**
- Instagram sor: *Hírek és tippek: Instagram – @vbfpremium*

### 1.16 Lábléc

- Rövid leírás, elérhetőségek, **Kövess minket** / Instagram
- Oszlopok: Termék (Funkciók, Árazás, Partnereink, Szakemberek) · Támogatás (Dokumentáció, Gyakori kérdések, Kapcsolat, 🐛 Hibajelentés (béta verzió)) · Jogi (ÁSZF, Adatvédelmi Nyilatkozat, Impresszum)
- Copyright + adatkezelési link

### 1.17 Mobil sticky / cookie

- **Vásárlás** · **Belépés** · **🐛 Hiba** (title: Hibajelentés – béta verzió)
- Alsó cookie sáv (egyszerű): munkamenet, **Adatkezelési tájékoztató** · **Elfogadom**
- **Cookie és helyi tárolás** (részletes banner + modal): bejelentkezés, téma, offline, funkcionális – **Részletek** · **Elfogadom** · **Bezárás**

### 1.18 `index.html` beágyazott script – felhasználónak látható üzenetek

- Hírlevél: *Kérjük, jelöld be a hozzájárulást.* · *Köszönjük a feliratkozást!* (vagy API `message`) · *Hiba történt.* / részlet · *Hálózati hiba.*
- Kosár Stripe: ÁSZF elfogadás hiánya · jelszavak nem egyeznek · e-mail kötelező jelszóhoz · *Átirányítás a fizetéshez…* · fizetés indítási hiba · *Hálózati hiba.*
- Kosár utalás: ÁSZF · *Email és név kötelező.* · *Számlázási cím megadása kötelező.* · *Küldés...* · siker/hiba (API)
- Kapcsolat: *Email és üzenet kötelező.* · *Küldés...* · siker/hiba · *Hálózati hiba.*
- Kosár lista sor: *Összesen: … Ft*
- `formatPrice`: *Ingyenes* (ha 0)

---

## 2. Jegyzőkönyv alkalmazás – `frontend/app.html`

> A teljes lapfülek (jegyzőkönyv mezők, táblázatok, hibajegyzék, mérések, LPS, naptár, felhő, törzsadatok) **nagyrészt ebben a fájlban** vannak, több száz sor. Átnézéshez keress a fájlban: `placeholder`, `label`, `>…<` szövegeket.

### 2.1 Meta / title

- `description`: VBF és EPH jegyzőkönyv szerkesztő… MSZ HD 60364-6, TvMI 7. A VVF modul később kerül bele.
- `<title>`: **VBF Elektromos Rajzkészítő \| Prémium Szerkesztő**

### 2.2 Fejléc / navigáció

- Márka: **VBF Premium** (title: Vissza a főoldalra)
- Szekcióváltó: **Rajz & Alaprajz** (változó címke)
- Csoport: **Jegyzőkönyv** – fülek: Rajz & Alaprajz · Jegyzőkönyv adatok · Hibajegyzék & Képek · Mérési adatok (Metrel) · Villámvédelem
- **Szervezet** – Naptár & Feladatok · Mentett ügyek · Törzsadatok · **Cég admin** (link)
- **Műveletek ▾** – Mentés · Zárás · Word · PDF · Küldés
- **? Súgó** – Bemutató · ⌨️ Billentyűk · 🐛 Hibajelentés (béta verzió)
- **🐛 Hiba** (title: Hibajelentés e-mailben – béta verzió)
- Offline: **Online** · **🔄 Szinkronizálás (N)** · GDPR linkek (info, Jelszó, Export ZIP, Adataim, Fiók törlés) · Kosár · **Belépés** · téma gomb

### 2.3 Billentyűparancsok modal

- **⌨️ Billentyűparancsok** – Ctrl+S / Ctrl+E leírások · *A billentyűk nem működnek beviteli mezők…* · **Bezárás**

### 2.4 Kosár (app)

- Hasonló a főoldalhoz; különbségek: *A kosár üres.* + link főoldal árazásra · utalás szöveg rövidebb változat · vendég blokk: *Nincs bejelentkezve…*

### 2.5 Belépés / regisztráció modal

- **Belépés** – Felhasználónév, Jelszó · *Elfelejtettem a jelszavam* · **Belépés** · **Regisztráció**
- Regisztráció: demó info szöveg · mezők · ÁSZF checkbox szöveg · **Hírlevél (opcionális)** · **Fiók létrehozása** · **Már van fiókom – Belépés**

### 2.6 További modálok a fájlban

- Jelszó módosítása, profil, törlés, cookie, jogi linkek – címkék és gombok a `app.html`-ben (pl. **Jelszó mentése**, **Profil**, **Teljes adatcsomag (ZIP)**).

### 2.7 Rajz / eszköztár (`app.html` + `canvas.js`)

- Dokumentum cím placeholder, szimbólum nevek (Kismegszakító, FI Relé, …) – `canvas.js` és oldalsáv címkék.

---

## 3. Cég admin / shop – `frontend/shop.html`

### 3.1 Meta / title

- `description`: VBF Cég admin és Dashboard – Felhasználók, előfizetések, munkakiosztás.
- `<title>`: **VBF Cég admin \| Dashboard & Admin** *(angol „Dashboard & Admin” a címben)*

### 3.2 Nav

- **📊 Dashboard** · **🔑 Admin**
- **🐛 Hiba** · **📝 Jegyzőkönyv alkalmazás** · GDPR linkek (Jelszó módosítása, Teljes adatcsomag, Fiók törlése) · **Belépés**

### 3.3 Dashboard üres állapot

- *Jelentkezz be az admin felület megtekintéséhez.*

### 3.4 Admin fül – fő blokkok (címek / gombok)

- **🔑 Adminisztrátori Felület** – *Felhasználók kezelése és előfizetések beállítása.*
- **💰 Előfizetési csomagok** – Árak (HUF)… · Csomag szerkesztő modal (Megjelenített név, árak, limitek, funkciók listája) · **Mégse** · **💾 Mentés**
- **🏦 Utalásos megrendelések** – *Nincs függő megrendelés.*
- **📋 Fizetési előzmények** – *Betöltés…*
- **📄 Díjbekérő PDF** – NAV-kötés nélküli… · mezők (sablon, összeg, leírás, határidő, vevő, e-mail) · **📥 Letöltés** · **📧 Küldés emailben** · **📋 Duplikátum**
- **🏛️ Cégek** – Új cég · **➕ Cég létrehozása**
- Táblázat fejlécek: ID, Felhasználónév, Email, Státusz, Jogosultság, Cég, Lejárat, Műveletek
- **🏢 Céges Adatok és Logó** – mezők, **💾 Céges Adatok mentése**, Logó, Aláírás, Tanúsítvány (.pfx)
- **👤 Új Felhasználó** – jogkörök: Villanyszerelő, Céges vezető, Főadmin · **Létrehozás**
- **📅 Feladat / Kiszállás Kiosztása** – mezők · **Munkavégzés kiosztása**

### 3.5 Shop – auth modálok (ugyanazok mint app, részben)

- **Bejelentkezés** vs app **Belépés** – *érdemes egységesíteni*
- Profil: **Email mentése** (shop) vs máshol **E-mail**
- Elfelejtett jelszó, új jelszó, lejárati sáv **Értem**, cookie szöveg

---

## 4. Dashboard (dinamikus) – `frontend/js/ui/dashboard.js`

- Betöltés: *Dashboard betöltése…*
- Nem admin: *Jelentkezz be ADMIN fiókkal a Dashboard megtekintéséhez.*
- Hiba: *Hiba a dashboard betöltésekor:* + üzenet
- **📊 Üzleti Dashboard** – *Átfogó statisztikák és közelgő feladatok*
- KPI címkék: Összes jegyzőkönyv · Havi jegyzőkönyvek · Véglegesített · Vázlat · Aktív felhasználók · Függő munkák
- Diagramok: **📈 Havi trend (utolsó 12 hónap)** · **🎯 Minősítés megoszlás** · **⚠️ Hibakategóriák (MEE)** · **📊 Mérési eredmények**
- Kördiagram felirat: **Átmenési arány** · Megfelelt / Nem felelt meg / Összes mérés
- **🔔 Közelgő / lejárt felülvizsgálatok** · *X lejárt* · *Y közelgő (90 nap)*
- Üres lista: *Nincs közelgő felülvizsgálat a következő 90 napban. 🎉*
- Sorok: *Ismeretlen* · *X napja lejárt!* · *Y nap múlva* · gomb **✉️ Emlékeztető** (title: Emlékeztető email küldése)
- Chart.js: *Jegyzőkönyvek* (dataset), minősítés címkék (Megfelelő, C változat…), hibakategóriák (A — Életveszély…)
- `confirm`: *Emlékeztető email küldése erről a felülvizsgálatról?*
- `alert`: *Emlékeztető elküldve!* / *Hiba:* …

---

## 5. Hibajelentés e-mail – `frontend/js/ui/bug-report.js`

- Levél tárgya: **`[VBF Premium – béta verzió] Hibajelentés`**
- Törzs első sor: *Kérlek írd le röviden: mit csináltál, mit vártál, és mi történt helyette.*
- Automatikus sorok: Oldal, Időpont, Böngésző

---

## 6. Helyszínfa – `frontend/js/ui/sitetree.js` (prompt / confirm)

- *Épület neve:* (alapértelmezett: Főépület)
- Típusnév + *neve:* (prompt)
- *Új név:* (átnevezés)
- *Biztosan törlöd? Az alatta lévő elemek is törlődnek.*

---

## 7. JavaScript üzenetek – összegzés fájlonként

A lista **nem teljes szó szerint**; a fájlokban további `alert` / `confirm` / `showToast` / `prompt` fordul elő. Részletes grep:

`rg "alert\\(|confirm\\(|showToast\\(|prompt\\(" frontend/js -g'*.js'`

| Fájl (röviden) | Jelleg |
|----------------|--------|
| `main.js` | confirm: utolsó jegyzőkönyv folytatása, piszkozat betöltése |
| `reports.js` | Mentés, véglegesítés, validáció, offline, export, email, másolás, törlés – sok magyar üzenet |
| `canvas.js` | confirm: teljes vászon törlése |
| `masterdata.js` | Ügyfél / felülvizsgáló mentés, törlés, sablon betöltés |
| `admin.js` | Cég, logó, aláírás, tanúsítvány, csomagok, Stripe refund, felhasználók, feladat, díjbekérő |
| `auth.js` | Regisztráció, e-mail mentés, jelszó, export ZIP |
| `jobs.js` | Feladat státusz, új jegyzőkönyv, kiosztás |
| `padfx.js` | PADFX feldolgozás, Metrel üzenetek |
| `storage.js` | Offline szinkron |
| `measurements.js` | CSV export kész |
| `autodiagram.js` | Helyszínfa / canvas figyelmeztetések |
| `cart.js` | (ha van) kosár az appban |

---

## 8. Egyéb front

- **`frontend/css`**: kommentek (pl. béta gomb) – nem felhasználói szöveg
- **`frontend/manifest.json`** (ha van): PWA név / leírás
- **`README.md`**, **`docs/*.md`**: dokumentáció, nem UI

---

## 9. Frissítés ehhez a doksihez

1. Szerkeszd a forrás HTML/JS fájlokat.
2. GYIK / landing szövegeknél ezt a fájlt is igazítsd, **vagy** töröld a fejezetet és hivatkozz csak a forrásra.
3. Nagy átdolgozásnál: `frontend/index.html` szövegének összehasonlítása a 1. fejezettel.

*Generálva: projekt másolat alapján; a főoldal GYIK és több blokk szó szerint egyezik a `index.html` aktuális verziójával, ha nem történt közben módosítás.*
