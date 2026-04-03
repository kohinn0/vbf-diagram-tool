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

- Ügyfél / felülvizsgáló törzs választó (nem placeholder).
- Helyszínfa (`site_tree`) + relációs sync.
- CSV export mérésekhez.
- Offline/PWA ígéret vs. tényleges állapot összhang.
- ~~Jegyzőkönyv betöltése API-ból~~ — kész (`Layout` hydrate, `hydrateReport.ts`).

---

*Utolsó frissítés: P0 funkciók (PADFX SQLite, validáció, finalize, §6.4.2, Toast, OTSZ mezők).*
