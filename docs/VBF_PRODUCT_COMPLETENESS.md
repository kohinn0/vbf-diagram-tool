# VBF SaaS – termék- és szabvány-megfelelőség (gap elemzés)

**Cél:** áttekinteni, a **MSZ HD 60364-6** (és kapcsolódó MSZ/OTSZ/jogszabály) szerinti **érintésvédelmi / időszakos felülvizsgálati jegyzőkönyvhöz** mit fed le a jelenlegi szoftver, és mit érdemes pótolni **értékesítésre / „production-ready”** állapot előtt.

**Fontos:** ez nem jogi tanács; a hivatalos követelményeket a mindenkori érvényű szabvány és a **40/2017. (XII. 4.) NGM** (VMBSZ), **OTSZ**, **TvMI** dokumentumok határozzák meg.

---

## 1. Alkalmazott szabvány- és jogi horgonyok (a kódban és exportban)

| Forrás | Hol jelenik meg / mit érint |
|--------|------------------------------|
| **MSZ HD 60364-6:2017** | `generator.py` / `generator_pdf.py` — §61.3 mérések, §6.4.2 szemrevételezés, hibajavítási szövegek |
| **MSZ HD 60364-4-41, -4-42, -4-44, 7-712, 7-722** | Speciális blokkok (AFDD, SPD, PV, EV) — **ha** a `client_data` / report payload tartalmazza |
| **MSZ HD 60364-5-54** | EPH szakaszok |
| **OTSZ / 54/2014. BM** | Következő felülvizsgálat, épület rendeltetés — részben a generátorban |
| **40/2017. NGM (VMBSZ)** | Hivatkozások hibáknál, minősítés |
| **IEC 60617 / HD 637** | Rajz szimbólumok (frontend diagram) — jellegű egyszerűsített ábrák |
| **HD 308 S2 / IEC 60445** | Vezeték jelölés a rajzon (`iecConductorStyle.ts`) |

---

## 2. Mi van jól lefedve (összefoglaló)

| Terület | Állapot |
|---------|---------|
| **Word (DOCX) szerkezet** | Erős: cél/jogszabályok, alapadatok, felülvizsgáló/műszer, szemrevételezés blokk, mérési szekciók (RPE, szigetelés, hurok, RCD, …), hibák, bejövő fázisok, összefoglaló minősítés, függelékek | `generator.py` |
| **PDF / aláírás pipeline** | Megvan (vízjel, PAdES útvonal — **nem módosítandó** engedély nélkül) | `generator_pdf.py`, `security.py` |
| **Backend API + RBAC + cég / limit** | Reports CRUD, finalize endpoint, megosztás, SaaS limitek | `routers/reports.py`, `database.py` |
| **Validációs logika (teszt)** | RPE, Zs, Riso, RCD határértékek — **unit tesztek** | `backend/tests/test_validation.py` |
| **PADFX backend** | Fájl feltöltés, XML/SQLite próbálkozás | `routers/padfx.py`, `analyzer2.py` |
| **GDPR / jogi oldalak** | HTML tájékoztatók | `routers/legal.py` |
| **Frontend workflow** | Rajz, jegyzőkönyv adatok, hibák, mérések (RPE + bejövő hálózat), mentés, export hívás | `draftStore`, `Layout.tsx` |

---

## 3. Szabvány szerinti hiányok / részleges lefedés

### 3.1 MSZ HD 60364-6 §61.3 mérések – **adat és UI**

| Követelmény (röviden) | Backend / generator | Frontend jelenleg |
|----------------------|---------------------|-------------------|
| **§61.3.2 RPE** | Van táblázat generálás | **Van** RPE tábla (`MeasurementsTab`, `rpeRows`) |
| **§61.3.3 Szigetelés** | Van DOCX szekció | **Van** kézi tábla a `MeasurementsTab`-on + PADFX; `insulationRows` mentésben |
| **§61.3.6 Hurok (Zs)** | Van DOCX szekció | **Van** kézi tábla + PADFX; `loopRows` |
| **§61.3.7 RCD / ÁVK** | Van részletes szekció | **Van** kézi tábla (`rcdRows`) + PADFX |
| **Kéziszerszám / SELV** | Generator kezeli, ha van adat | **Nincs** beviteli felület |

**Következmény:** a generált Word/PDF **szakaszok üresek** maradhatnak, ha az API payload nem tölti a struktúrát — **szabványos „teljes” jegyzőkönyvhöz** ezeket **kötelező** kitölthetővé tenni vagy importálni (PADFX).

### 3.2 §6.4.2 Szemrevételezés

- A **generator** tartalmaz „Szemrevételezéses ellenőrzések” blokkot; a **React appból** strukturált checklista (kategóriánként Igen/Nem/Megjegyzés) **nem** látszik külön tabon — kockázat: csak szabad szöveg (`reportNotes`) marad.

**Javaslat:** külön **„Szemrevételezés”** szekció vagy integrált checklista + export mezők a `client_data` / `measurements_data` részben (`schemas.py` SSOT).

### 3.3 OTSZ / következő felülvizsgálat

- A **generator** tud következő dátumot / OTSZ osztályt (ügyfél-adattól függően).
- **Ellenőrizendő:** a `ReportTab` / `client_data` minden szükséges mezőt kitölt-e (épület rendeltetés, OTSZ osztály) — részben placeholder selectek.

### 3.4 Zárolás, integritás, jogi védelem

| Funkció | Állapot |
|---------|---------|
| **Jegyzőkönyv véglegesítés** | `POST /api/reports/{id}/finalize` + `finalized_at` — **backend megvan** |
| **UI: Véglegesítés** | Nem minden felületen egyértelmű gomb / folyamat |
| **Szerkesztés tiltása** véglegesítés után | Ellenőrizni kell a frontend + API együtt |
| **PDF integritás / hash** | `include_integrity` jelleg a generátorban — **termék szinten** kommunikálni kell |

### 3.5 Import / PADFX

- **XML / ZIP (PADFX):** `POST /api/padfx/parse` + frontend **PADFX import** gomb → `appendPadfxImport` → RPE / Zs / Riso / RCD sorok (MID alapján, `padfxMerge.ts`).
- **SQLite (measData):** backend mintát ad vissza; **teljes** SQLite→tábla import még **hiányzik** (P0 nyitott).

### 3.6 CRM / helyszínfa

- `schemas.py`: `SiteNodeSchema`, `RpeMeasurementSchema` stb. + `reports.py` `_sync_relational_data` **site_tree**-re épít.
- **React:** `MeasurementsTab` + `siteTree` a draft store-ban → mentéskor `diagram_data.site_tree`; backend `SiteNode` szinkron.

### 3.7 Ügyfél / felülvizsgáló törzsadatok

- DB: `Customer`, `Inspector` modellek; **ReportTab:** `GET /api/customers` + `/api/inspectors`, választó + gyors „törzsbe mentés”.

### 3.8 Minősítés és felelősség

- Generator: **A/B/C** jellegű összefoglaló szövegek — a **frontend** nem vezeti végig kötelezően a minősítést minden kötelező mező kitöltése után.
- **Aláírásblokkok** (megrendelő / szerelő nyilatkozat): DOCX-ben részben megvan — **PDF megjelenés** és **PAdés** üzleti csomaghoz kötött.

### 3.9 EPH / VVF

- **EPH** jegyzőkönyv típus a ReportTab-on szerepel; **dedikált EPH-only** munkafolyamat és mezők: részben átfedés, részben hiány — külön termékütem.
- **VVF:** README szerint fejlesztés alatt — **nem** számít „késznek”.

### 3.10 Nem funkcionális / üzlet

| Téma | Megjegyzés |
|------|------------|
| **Offline/PWA** | Marketing ígéret — **implementáció** ellenőrizendő |
| **Toast** helyett **alert** mentés/export | UX / professzionalizmus |
| **Monitoring, backup, DPA** | Éles szerződéshez |
| **Penetration / audit** | Enterprise |

---

## 4. Prioritások (javasolt)

| Szint | Teendő (rövid) |
|-------|----------------|
| **P0 – értékesíthető „MVP+”** | PADFX (vagy CSV) **bekötése** a mérésekhez; **szigetelés + hurok + RCD** táblák a UI-ban vagy importból; **finalize** egyértelmű UX; kötelező mezők validációja mentés előtt |
| **P1 – szabványosabb jegyzőkönyv** | §6.4.2 checklist; OTSZ/következő vizsgálat mezők végigvezetése; ügyfél/felülvizsgáló törzs választó; hibák ↔ § hivatkozás automatikus |
| **P2 – vállalati** | Helyszínfa / `site_tree`; audit log; API webhook; offline; teljes EPH/VVF modulok |

---

## 5. Kapcsolódó fájlok (fejlesztőnek)

- `backend/generator.py` — Word szerkezet és feltételek
- `backend/schemas.py` — API és strukturált mérési sémák
- `frontend/src/store/draftStore.ts` — `buildApiPayload()` (**üres** `insulation` / `loop`)
- `frontend/src/pages/MeasurementsTab.tsx`, `ReportTab.tsx`
- `backend/routers/padfx.py`

---

*Dokumentum célja: termék- és compliance roadmap; szabványos megfelelőségért a felülvizsgáló szakmai felelőssége is fennáll.*
