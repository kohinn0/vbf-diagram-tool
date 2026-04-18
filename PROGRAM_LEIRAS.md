# VBF Premium – pontos programleírás

Ez a dokumentum **a jelenlegi kódbázisnak megfelelő**, rögzített tényeket ír le. A marketing szövegekben előfordulhatnak olyan ígéretek (pl. teljes PWA, minden modul kész), amelyek **nem minden részletben** egyeznek a tényleges implementációval — a döntéshez mindig a repo és a `backend/` viselkedése az irányadó.

---

## 1. Mi ez a program?

A **VBF Premium** egy **webes (böngészős) SaaS alkalmazás**, amelyet **villamos biztonsági felülvizsgálati (VBF)** és **EPH (egyenpotenciál)** jegyzőkönyvekhez terveztek. A felhasználó **helyszíni adatokat** (rajz, alaprajz, mérések, hibák, szöveges jegyzőkönyv-mezők) rögzít, a rendszer ezekből **Word (DOCX)** és **PDF** dokumentumot készít; a PDF-hez kapcsolódik az **elektronikus aláírás / PAdés** jellegű feldolgozás a backendben (részletek: `backend/generator_pdf.py`, `backend/security.py` — ezek módosítása csak szándékosan).

**Egyetlen frontend:** **React + Vite** SPA (`frontend/`), nem három külön HTML oldal. (A korábbi `ARCHITECTURE.md` háromréteges modellje **elavult**.)

---

## 2. Kinek és milyen helyzetben?

- **Elsődleges célcsoport:** villamos szakemberek, **mobilbarát** felület (nagy érintési célok, alsó „Mentés / Véglegesítés” sáv kisebb képernyőn).
- **Adatintegritás és export** fontosabb, mint vizuális „díszítés”.
- **Jogosultság (RBAC):** a backend szerepkörökkel (pl. technikus, cég admin, szuperadmin) szűri az API-hozzáférést; a teljes cégadmin funkcionalitás nagy része **REST API** (`/api/admin/...`) felől érhető el, a React appban az **`/app/admin`** oldal főleg **fiókinformációt** és **OpenAPI (Swagger) linket** ad admin jogosultságú felhasználónak.

---

## 3. Fő felhasználói felület (React útvonalak)

| Útvonal | Tartalom |
|--------|----------|
| `/` | **Landing** – termék bemutató, árazás, kapcsolat, kosár (Zustand), regisztrációs folyamat támogatás |
| `/status` | **Rendszer állapot** – nyilvános oldal, meghívja a `GET /health` API-t (adatbázis probe), válaszidő; auth nélkül |
| `/app` | Átirányítás → `/app/diagram` |
| `/app/dashboard` | **Dashboard** – kihasználtság (`/api/usage`), adminnak cégstatisztikák (`/api/dashboard/stats`), gyors linkek, legutóbb módosított jegyzőkönyvek listája |
| `/app/reports` | **Jegyzőkönyvek lista** – `GET /api/reports` (kliens oldali keresés, státusz/típus szűrő, rendezés); megnyitás ugyanúgy betölti a piszkozatot |
| `/app/subscription` | **Előfizetés / csomag** – `GET /api/users/me`, `GET /api/usage`, nyilvános `GET /api/plans`, bankkártya flag `GET /api/payments/card-payments-enabled`; vásárlás link a főoldal `#pricing` szekcióra |
| `/app/diagram` | **Rajz és alaprajz** – Fabric.js vászon, IEC/HD jellegű szimbólumok, vezetékstílusok, méret/rács; a rajz **JSON-ként** mentődik (`diagram_data`) |
| `/app/report` | **Jegyzőkönyv adatok** – vizsgálat típusa (VBF/EPH változatok), megrendelő és helyszín, felülvizsgáló és műszer, OTSZ mezők, §6.4.2 szemrevételezés, megjegyzések; **előre definiált és saját (böngészőben mentett) sablonok** |
| `/app/defects` | **Hibajegyzék** – feltárt hibák, súlyosság, képek |
| `/app/measurements` | **Mérési adatok** – RPE, hurokimpedancia, szigetelés, FI/RCD, PADFX import, automatikus hibagyűjtés opció |
| `/app/admin` | **Cég / admin** – bejelentkezett felhasználó adatai; admin szerepkörnél Swagger/API dokumentáció link |
| `/app/profile` | **Profil** – e-mail és jelszó (`PATCH` / `PUT /api/users/me`); bejelentkezés a főoldalon: `POST /api/login` (felhasználónév + jelszó) |
| `/app/data` | **GDPR / adatok** – adatvédelmi linkek (`/api/legal/...`), JSON és ZIP export (`GET /api/users/me/data-export*`), fiók törlés (`DELETE /api/users/me`) |

**Mentés:** a piszkozat **Zustand + böngésző persist** mellett **REST API**-n keresztül is szinkronizálható (`/api/reports`), ha van JWT (`localStorage`: `vbf_token`). A fejléc **háttérben** betölti a kiválasztott jegyzőkönyvet, ha van `vbf_last_report_id`.

**Export:** a Layout **Word** és **PDF** letöltést** kér a backendtől; véglegesített jegyzőkönyvnél a Word tipikusan nem elérhető, PDF igen.

---

## 4. Backend (röviden)

- **FastAPI** (`backend/main.py`), **SQLAlchemy**, alapértelmezésben **SQLite**, élesben ajánlott **PostgreSQL** (`DATABASE_URL`, Alembic migrációk).
- **API szerződés egy helyen:** `backend/schemas.py` (SSOT).
- **Routerek ( többek között):** `auth`, `reports`, `admin`, `masterdata`, `jobs`, `payments`, `dashboard`, `legal`, `padfx`.
- **Dokumentáció:** fejlesztői módban `/docs`, `/redoc`; élesben kikapcsolható.
- **Egészség:** `GET /health`.

---

## 5. Dokumentumgenerálás

- **DOCX:** `python-docx` alapú generálás (`backend/generator.py`) – szerződéses/szabványos szövegek, táblázatok, mérések és hibák beemelése.
- **PDF:** natív pipeline (ReportLab / PyHanko jellegű útvonal — részletek a kódban); a **SHA-256 hash** a **végső PDF binárisra** vonatkozzon (ne fordítva). A README egyes sorai **LibreOffice**-t említhetnek; a **projekt célja a natív PDF**, nem LibreOffice-központú megoldás.

---

## 6. Mit érdemes még tudni?

- **VVF (villámvédelem)** modul: a README szerint **fejlesztés alatt** / részben hiányzó — ne feltételezz teljes VVF jegyzőkönyvet.
- **„Offline / PWA”:** a landing szövegek PWA-t említhetnek; a tényleges offline élmény **főleg a helyi tárolt piszkozatra** és a hálózati szinkronra épül — teljes, telepíthető PWA **nem garantált** minden funkcióra.
- **QR-kód:** marketingben szerepel; a teljes „szkennelés → azonnali betöltés” élmény **nem ebben a leírásban részletezett kötelező funkcióként** kezelendő, hanem a kód és a roadmap alapján.

---

## 7. Kapcsolódó fájlok

| Fájl | Szerep |
|------|--------|
| `README.md` | Áttekintés, futtatás, stack (ellenőrizd a portokat és a LibreOffice sort a §5-höz képest) |
| `AI_CONTEXT.md` | AI / fejlesztői onboarding, részletes szabályok |
| `ELESITES.md`, `INTEGRACIOK.md` | Élesítés, külső szolgáltatások |
| `docs/VBF_PRODUCT_COMPLETENESS.md` | Szabvány-lefedettség, hiányok |

---

*Utolsó frissítés: a dokumentum a repo aktuális React útvonalait és az `/app/admin` oldalt tükrözi.*
