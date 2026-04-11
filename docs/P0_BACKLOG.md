# P0 backlog – értékesítés előtti minimum

Ellenőrzőlista a **VBF Premium** „MVP+” / értékesíthető állapotához. A részletes szabvány-hivatkozások: `docs/VBF_PRODUCT_COMPLETENESS.md`.

## Kész / részben kész (frissítve)

- [x] **Word export RPE + mérési blokk** — `generator.py` + `_normalize_measurements_block` (lista/dict + `location`/`rpeValue` alias).
- [x] **PADFX XML import** — `POST /api/padfx/parse` + frontend `PADFX import` gomb, `padfxMerge.ts`, `appendPadfxImport` a store-ban (RPE, Zs, Riso, RCD MID szerint).
- [x] **`measurements_data` payload** — `loopRows` / `insulationRows` / `rcdRows` a mentésben (nem csak üres tömb).
- [x] **PostgreSQL éles stack** — `psycopg2-binary`, pool env, `docker-compose.postgres.yml`, **Alembic**, CI, `scripts/pg_backup.sh`, dokumentáció.
- [x] **SQLite PADFX (measData.sqlite)** — `backend/padfx_sqlite.py` → `measurements[]` (XML-lel azonos forma); üres esetén tájékoztató üzenet.
- [x] **Kötelező mezők** — `validateReport.ts` (mentés + export + véglegesítés); Toast hibaüzenetek.
- [x] **Véglegesítés (finalize)** — `Layout`: gomb + mobil sticky sáv; `POST /api/reports/{id}/finalize`; `reportStatus` + zárolt UI (fieldset / rajz overlay).
- [x] **§6.4.2 szemrevételezés** — `visualChecks` a store-ban + `ReportTab` checkboxes; `client_data` → Word (`generator.py`).
- [x] **Toast** — `sonner` + `lib/toast.ts` (emerald / rose); mentés, export, import, RPE, AI.
- [x] **OTSZ következő vizsgálat** — `buildingPurpose`, `buildingOtsz`, `nextInspectionDate` a `ReportTab`-on; `client_data` teljes `reportData` spread a generátornak.

## P1 (követő hullám)

- [x] Ügyfél / felülvizsgáló törzs választó — `ReportTab` (`fetchCustomers` / `fetchInspectors`, új törzs sor).
- [x] Helyszínfa (`site_tree`) + relációs sync — UI: `SiteTreePanel`, mentés `diagram_data.site_tree`, backend `SiteNode`; **érvénytelen node_id** a mérési sorokban mentéskor és fa törléskor törlődik (`siteTreeRefs.ts`).
- [x] CSV export mérésekhez — `MeasurementsTab` „CSV export”, `frontend/src/lib/exportMeasurementsCsv.ts` (UTF-8 BOM, `;`, szakaszok).
- [x] Offline/PWA ígéret vs. tényleges állapot — README + landing FAQ / How it works (internet szükséges mentéshez; nincs teljes offline PWA ígéret).
- [x] Hibák — **szabvány / §** opcionális mező (`standardRef`); API `severity` + `standard` szétválasztva (generátor automatikus MSZ kitöltés nem blokkolódik).
- ~~Jegyzőkönyv betöltése API-ból~~ — kész (`Layout` hydrate, `hydrateReport.ts`).

---

*Utolsó frissítés: P0 funkciók (PADFX SQLite, validáció, finalize, §6.4.2, Toast, OTSZ mezők).*
