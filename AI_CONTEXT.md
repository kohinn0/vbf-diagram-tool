# VBF Diagram Tool – AI kontextus (gyors onboarding)

Ez a fájl **nem** helyettesíti a részletes dokumentációt; célja, hogy egy új beszélgetésben az AI (és az ember) **percek alatt** felkapja a projekt gerincét, kulcsfájljait és a nem alapértelmezett szabályokat.

---

## 1. Mi ez a projekt?

- **Termék:** SaaS villamos biztonsági felülvizsgálati (VBF) / EPH jegyzőkönyvek, alaprajz, mérések, hibajegyzék, export.
- **Célközönség:** szakemberek, mobil-first; adatintegritás és jogi megfelelés fontosabb, mint „díszanimáció”.
- **Állapot:** React alapú app + FastAPI backend; egyes README részek marketing / régi stackre utalhatnak – a **jelenlegi UI** egy **React SPA** (`frontend/`), routing: lásd lent.

---

## 2. Aranyszabályok (kötelező értelmezés)

| Terület | Szabály |
|--------|---------|
| **API szerződés** | **`backend/schemas.py` az SSOT.** Endpointok és frontend payloadok ehhez igazodnak; ne találj ki új mezőket Pydantic nélkül. |
| **Biztonság / aláírás** | **`backend/security.py`** és a **PAdES / PDF aláírási folyamat** (`backend/generator_pdf.py` és kapcsolódók) **csak kifejezett megerősítéssel** módosílandók. |
| **SHA-256 / PDF** | A **végső PDF bináris** elkészülte után kell hash-elni (ne fordítva). |
| **Frontend CSS** | **Új stílus: Tailwind utility**; ne bővítsd szabadon a custom CSS fájlokat; **ne használj `!important`**. |
| **UX** | **Mobil-first**, interaktív elemek érintésbarátak (~44px), kritikus műveletek elérhetők (sticky/fixed alsó sáv, ahol kell). |
| **Hibák** | Backend: **ne általános 500** üzenet; frontend: **Toast / Alert** (siker: emerald, hiba: rose) – ahol már ez a minta él. |

---

## 3. Technológiai stack (jelenlegi)

| Réteg | Technológia |
|-------|-------------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind 4, React Router 7, Zustand (persist), Fabric.js 6, Lucide |
| Backend | Python 3.11, FastAPI, SQLAlchemy, SQLite **vagy** PostgreSQL (`DATABASE_URL`, `psycopg2-binary`; éles SaaS-hoz Postgres ajánlott) |
| PDF / doc | `python-docx`, ReportLab / PyHanko jellegű útvonal – a pontos láncolat a backendben (`generator.py`, `generator_pdf.py`) |

---

## 4. Repo felépítés (fontosabb útvonalak)

```
vbf-diagram-tool/
├── backend/
│   ├── main.py              # FastAPI app, routerek, /health, static /data
│   ├── schemas.py           # API modellek (SSOT)
│   ├── database.py          # Engine, init_db; Postgres → Alembic, SQLite → create_all
│   ├── alembic.ini, alembic/   # Postgres séma migrációk
│   ├── auth.py, security.py
│   ├── generator.py, generator_pdf.py
│   ├── routers/             # auth, reports, admin, masterdata, jobs, payments, dashboard, legal, padfx
│   └── tests/               # pytest
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Router definíció
│   │   ├── pages/           # Landing, DiagramTab, ReportTab, DefectsTab, MeasurementsTab
│   │   ├── components/      # landing/, diagram/ (Fabric, IEC vezeték, RPE→vonal), auth/, ui/
│   │   ├── store/           # cartStore, draftStore
│   │   └── lib/             # api.ts, utils.ts
│   └── nginx.conf           # proxy: backend:8000
├── docker-compose.yml       # proxy, frontend, backend, opcionális db-backup profil
├── docker-compose.postgres.yml  # opcionális: Postgres szolgáltatás + backend DATABASE_URL
├── README.md                # áttekintés, futtatás (ellenőrizd a portokat a környezeteddel)
├── ARCHITECTURE.md          # rövid pointer (régi három HTML modell helyett SPA; részletek: PROGRAM_LEIRAS.md)
├── INTEGRACIOK.md, ELESITES.md
├── docs/VBF_PRODUCT_COMPLETENESS.md   # szabvány / termék gap elemzés (MSZ, értékesítés)
├── docs/P0_BACKLOG.md               # értékesítés előtti P0 checklist + PADFX állapot
└── .github/workflows/ci.yml
```

---

## 5. Backend API – routerek

`main.py` include-ok (prefixeket a router fájlokban nézd):

- `auth`, `reports`, `admin`, `masterdata`, `jobs`, `payments`, `dashboard`, `legal`, `padfx`

**Dokumentáció:** dev-ben `/docs`, `/redoc`, `/openapi.json` – **production** (`ENV=production`) alatt ezek kikapcsolhatók.

**Health:** `GET /health` – DB ping; orchestrator healthcheck is erre épül.

**Statikus:** `/data` – feltöltött / generált fájlok (mount).

---

## 6. Frontend útvonalak (React Router)

| Útvonal | Tartalom |
|---------|----------|
| `/` | `Landing` – webshop/kosár, marketing |
| `/status` | `StatusPage` – `GET /health` megjelenítése (nyilvános) |
| `/app` | redirect → `/app/diagram` |
| `/app/dashboard` | `DashboardTab` – usage, stats (admin), utolsó jegyzőkönyvek |
| `/app/reports` | `ReportsListTab` – szűrhető lista (`GET /api/reports`, max 400) |
| `/app/subscription` | `SubscriptionTab` – usage, csomagok (`/api/plans`), Stripe flag |
| `/app/diagram` | `DiagramTab` – Fabric vászon |
| `/app/report` | `ReportTab` |
| `/app/defects` | `DefectsTab` |
| `/app/measurements` | `MeasurementsTab` |
| `/app/admin` | `AdminTab` |
| `/app/profile` | `ProfileTab` — e-mail, jelszó, `loginWithPassword` a főoldali modalban |
| `/app/data` | `DataPrivacyTab` — GDPR export ZIP/JSON, `DELETE /api/users/me` |

**API bázis URL:** `frontend/src/lib/api.ts` – `import.meta.env.VITE_API_URL` **vagy** alapértelmezés `http://localhost:8000`. Lokálisan állítsd a Vite env-et a futó backend portnak megfelelően (a README helyi példa néha 8001-et említ – a kód alapja **8000**).

**Auth header:** `localStorage` kulcs: `vbf_token`, `Authorization: Bearer …`.

**Piszkozat ↔ szerver:** `GET /api/reports/:id` (`fetchReportById`) + `applyServerReportToDraft` (`lib/hydrateReport.ts`) — `reportStatus`, mérések, hibák, `diagram_data` (Fabric `pendingDiagramData` → `CanvasWorkspace`). `lastKnownServerUpdatedAt` (persist) + `updated_at` összevetés: zöld toast csak ha a szerver adatai újabbnak / másnak ismertek; 401/403 → store nem íródik felül; hálózati hiba → rose toast; fejléc alatt vékony **szinkron csík** (`aria-busy` a `main`-en). Másik fülön változó `vbf_last_report_id` / `vbf_token` → `storage` esemény, újrahydrate.

---

## 7. Adatbázis

- **Alapértelmezés:** SQLite fájl (`DATABASE_PATH` vagy `./data/vbf_database.db`) — induláskor `create_all` + legacy SQLite migrációk.
- **PostgreSQL (éles SaaS):** `DATABASE_URL=postgresql://…` (vagy `postgres://…`); driver: `psycopg2-binary`. **Séma: Alembic** (`backend/alembic/`, `database.init_db()` → `upgrade head` + seed). Pool: `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`. SQLite → PG adat: `migrate_sqlite_to_postgres.py`.
- **Teszt:** `TESTING=1` → memória SQLite (lásd `database.py`); `SKIP_DB_INIT=1` Alembic CLI generáláshoz.

---

## 8. Docker / éles jellegű futtatás

- `docker-compose up -d --build` – frontend build nginx-szel; backend **belső port 8000**; proxy (nginx-proxy-manager) a 80/443-on; alapból SQLite volume.
- **PostgreSQL stack:** `docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d --build` + `POSTGRES_PASSWORD` (részletek: `ELESITES.md`).
- Frontend változás után **újra kell buildelni** a frontend image-et, ha konténerben nézed.

---

## 9. Tesztek és CI

- **Pytest:** `backend/tests/` (`conftest.py`, API és domain tesztek).
- **CI:** `.github/workflows/ci.yml` – változtatás előtt érdemes lokálisan is futtatni a releváns teszteket.

---

## 10. Mit olvasson az AI, ha mélyebb kontextus kell?

1. **`backend/schemas.py`** – minden API változáshoz.
2. **Érintett `routers/*.py`** + **`frontend/src/lib/api.ts`** és a hívó oldalak.
3. **`README.md`** – üzemeltetés és funkciólista (figyeld a stack leírás vs. kód eltéréseit).
4. **`INTEGRACIOK.md` / `ELESITES.md`** – külső szolgáltatások, élesítés.
5. **`backend/alembic/`** – Postgres séma változások (revisionök verziókezelve).
6. **`docs/P0_BACKLOG.md`** – P0 checklist (Toast, validáció, PADFX SQLite, finalize).
7. **`docs/VBF_PRODUCT_COMPLETENESS.md`** – MSZ/OTSZ szerinti **jegyzőkönyv-lefedettség**, hiányzó UI/adat (P1), értékesítési készültség.

---

## 11. Ismert dokumentációs csúszások

- **README** export sorában előfordulhat **LibreOffice** említés; a **projekt szabályok** szerint a cél a **natív PDF** pipeline (ReportLab / nem LibreOffice-alapú megoldás) – mindig a **tényleges kód** az irányadó.
- **`ARCHITECTURE.md`** csak **rövid iránytű**; a részletes felépítés: **`PROGRAM_LEIRAS.md`**, **`README.md`**. A jelenlegi frontend **egyetlen Vite SPA** (`frontend/`).

---

## 12. Jegyzőkönyv (VBF) – termék és szabvány (rövid)

- **Cél:** MSZ HD **60364-6** (és kapcsolódó MSZ) szerinti **felülvizsgálati jegyzőkönyv** + export; kiegészítő: OTSZ, VMBSZ (40/2017), TvMI hivatkozások a generált szövegekben.
- **Erős oldal:** `generator.py` Word-szerkezet (mérések §61.3, hibák, minősítés, mellékletek); PDF/PAdés útvonal; RPE + bejövő fázisok a UI-n; rajz (`diagram_data` / kép).
- **Gyenge / hiány (P1 / finomítás):** törzs választók (ügyfél, felülvizsgáló); **site_tree** sync; CSV export; PWA ígéret vs. valóság. — **Jegyzőkönyv betöltése / státusz-szinkron:** induláskori `GET` + hydrate (lásd §6).
- **Részletes gap lista és P0/P1:** lásd **`docs/VBF_PRODUCT_COMPLETENESS.md`**.
- **Rajz:** IEC **60617 / HD 637** jellegű szimbólumok (`diagram-utils.ts`); vezeték **HD 308 S2 / IEC 60445** (`iecConductorStyle.ts`); RPE automatikus vonal = **PE** stílus.

---

*Utolsó frissítés: §6 — `updated_at` toast szűrés, szinkron csík, `storage` újrahydrate, hálózati toast.*

---

## 13. Pontos programleírás (embernek)

A **felhasználói és termék szintű, pontos összefoglaló** (mit csinál a program, milyen útvonalak, mit ígér a marketing vs. kód): lásd **`PROGRAM_LEIRAS.md`** a repo gyökerében.
