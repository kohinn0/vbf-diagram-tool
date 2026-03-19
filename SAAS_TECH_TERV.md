# SaaS technológiai váltás – terv (Postgres, PDF, mentés)

Ez a dokumentum a Gemini javaslata és a jelenlegi kód alapján összeállított terv: SQLite → PostgreSQL, LibreOffice → WeasyPrint (vagy Gotenberg), valamint a mentési stratégiák.

---

## 1. PostgreSQL – státusz és lépések

### Jelenlegi állapot

- **database.py** már SQLAlchemy-t használ, és **támogatja a Postgres-t**: ha a `DATABASE_URL` környezeti változó `postgresql://...` formátumú, akkor Postgres lesz az engine (pool_pre_ping=True). SQLite csak akkor fut, ha nincs `DATABASE_URL` (vagy teszt módban in-memory). A táblák létrehozását a `Base.metadata.create_all(bind=engine)` végzi.
- A **docker-compose.postgres.yml** ezt használja: Postgres 15 Alpine + Redis 7 Alpine, a backend `DATABASE_URL` és `REDIS_HOST`/`REDIS_PORT` beállítással.

### Használat

```bash
# Postgres + Redis indítása (a meglévő frontend + backend mellett)
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d

# Vagy override-ként (ha már nem kell SQLite)
cp docker-compose.postgres.yml docker-compose.override.yml
docker compose up -d
```

A backend első indulásakor a `Base.metadata.create_all(bind=engine)` létrehozza a táblákat a Postgres-ben. **Fontos:** a `database.py`-ban az SQLite-specifikus migrációk (PRAGMA, ALTER TABLE) csak SQLite-n futnak; Postgres-re a séma a `create_all`-ból jön.

### Migráció: SQLite → Postgres (adat átemelés)

- **Új telepítés:** ne állíts be `DATABASE_URL`-t, vagy állítsd be rögtön Postgres-re; a táblák üresen jönnek létre.
- **Meglévő SQLite adat átvitele:**
  1. **pgloader** (ajánlott): `pgloader ./data/vbf_database.db postgresql://user:pass@localhost:5432/vbf` – a pgloader automatikusan mapeli a típusokat és az adatokat.
  2. **Saját script:** SQLAlchemy-val két engine (SQLite forrás, Postgres cél), táblánként olvasás + insert. A JSON/Text mezők kompatibilisek.
  3. **Export/import:** pl. SQLite → JSON export, majd Postgres-be import a backend API vagy egy egyszeri script alapján.

Ha nem szeretnél külső tool-t (pgloader) használni, a repo tartalmaz egy migrációs scriptet is:

- `backend/migrate_sqlite_to_postgres.py`
  - Példa futtatás (friss, üres Postgres DB ajánlott):
    ```bash
    # 1) Indítsd el a Postgres+Redis szolgáltatásokat
    docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d postgres redis

    # 2) Futtasd a migrációt a backend konténerből (itt a host: "postgres" biztosan elérhető)
    docker compose -f docker-compose.yml -f docker-compose.postgres.yml run --rm backend \
      python backend/migrate_sqlite_to_postgres.py \
        --sqlite-path /app/data/vbf_database.db \
        --postgres-url "postgresql://vbf:vbf_secret_change_me@postgres:5432/vbf" \
        --batch-size 200
    ```
  - Ha a céladatbázis még nem üres, előbb töröld le vagy használd a `--force-empty` opciót (csak friss környezetben!).

A migráció után a **céges fájlok** (logó, aláírás, PFX) továbbra is a **vbf_data** volume-on maradnak (`/app/data`); csak az adatbázis költözik Postgres-be.

---

## 2. LibreOffice kiváltása – WeasyPrint vagy Gotenberg

### Mi van most a kódban?

- A `backend/generator.py` jelenleg DOCX-et állít elő (python-docx), majd PDF-et konvertál:
  - Windows: `docx2pdf`
  - Linux (Docker): `libreoffice --headless --convert-to pdf ...`
- A DOCX-be beépül:
  - egyvonalas rajz (ha be van állítva és van `diagram_image`),
  - MEE szerinti fejezetek és méréstáblák,
  - QR kód és SHA-256 tartalmi lenyomat (digitális integritás),
  - TvMI 7.7:2026.02.01 és vonatkozó MSZ/OTSZ hivatkozások,
  - opcionális aláíráskép (céges beállításokból).

### Jelenlegi állapot

- **generator.py** DOCX-et készít (python-docx), majd PDF-et:
  - Windows: `docx2pdf`
  - Linux (Docker): **LibreOffice headless** (`libreoffice --headless --convert-to pdf ...`)
- A Dockerfile telepíti a LibreOffice-t (súlyos, ~hundreds MB RAM).

### WeasyPrint (HTML/CSS → PDF)

- **Előny:** Kevesebb RAM, tisztább tipográfia, verziókövethető sablonok (Jinja2 + CSS).
- **Lépések (terv):**
  1. Jinja2 sablon(ok) a jegyzőkönyvhöz: HTML + CSS (pl. `templates/report.html`, `static/report.css`).
  2. A meglévő adatstruktúra (report, client_data, measurements_data, stb.) ugyanúgy betöltődik; a generator egy új függvényt kap: pl. `render_report_html(report, db)` → HTML string.
  3. WeasyPrint: `weasyprint.HTML(string=html).write_pdf(target)` → PDF stream. A pyhanko aláírás továbbra is a generált PDF-re megy.
  4. **Word (DOCX) export:** Megtartható a jelenlegi python-docx alapú export (a felhasználók kérhetik), vagy később „Export as DOCX” = ugyanaz a HTML → docx (pl. python-docx-ba másolva) – ez több munka. Röviden: a PDF lehet WeasyPrint, a DOCX maradhat docx, vagy külön terv.

### Gotenberg (Docker mikroszerviz)

- Chromium alapú PDF generálás (HTML → PDF). Ha a sablonokat HTML-ben írod, a Gotenberg-et is lehet használni HTTP hívással; több RAM, de nagyon kompatibilis a böngésző megjelenéssel.
- Ha a RAM a szűk keresztmetszet (pl. kicsi VPS), a WeasyPrint jobb első lépés.

### Ajánlás

1. **Rövid távon:** Marad a LibreOffice a PDF-hez (a jelenlegi Docker image így is működik), de a **docker-compose.postgres.yml**-lal már Postgres + Redis fut.
2. **Középtáv:** Egy új modul pl. `generator_weasyprint.py` vagy a `generator.py` bővítése: Jinja2 + WeasyPrint a **csak PDF** exportra (aláírással), a DOCX export maradjon python-docx. Így fokozatosan lehet tesztelni és átállni.
3. **Hosszú táv:** Ha a DOCX sablon szerkesztést feladod, minden kimenet HTML → WeasyPrint (PDF), esetleg DOCX = ugyanabból az adatból más formátum (több fejlesztés).

---

## 3. Docker felállás (összefoglalva)

| Szolgáltatás    | Kép / megjegyzés |
|-----------------|-------------------|
| Nginx / Cloudflare Tunnel | A „kapu” – a jelenlegi deploy ezt külsőleg intézi (pl. reverse proxy, tunnel). |
| Frontend        | Meglévő frontend image, 8080. |
| Backend (FastAPI) | Meglévő backend image; Postgres esetén `DATABASE_URL` + `REDIS_HOST`/`REDIS_PORT`. |
| PostgreSQL      | `postgres:15-alpine`, ~150–200 MB RAM. |
| Redis           | `redis:7-alpine`, rate limit + lock. |
| (Opcionális) Celery/RQ | Később, ha a PDF generálást háttérfeladatba akarod tenni. |

A **docker-compose.postgres.yml** a Postgres + Redis szolgáltatásokat és a backend környezeti változóit adja hozzá; a base compose változatlanul hagyja az SQLite + db-backup (SQLite) opciót.

---

## 4. Mentési stratégia (Postgres + Hetzner)

- **Hetzner Snapshot:** Napi/héti snapshot a VPS-ről (pár cent/hó) – egész lemez visszaállítható.
- **pg_dump + távoli tárolás:** A **docker-compose.postgres.yml**-ban a `db-backup` szolgáltatás (profile: backup) `pg_dump -Fc`-vel készít dumpot a `vbf_backups` volume-ra. Bővíthető egy cron vagy külön job, ami:
  - a volume-ból másolja a dumpot egy távoli helyre (pl. Cloudflare R2, S3), vagy
  - egy one-off containerből közvetlenül `pg_dump` és upload (pl. `rclone`, `aws s3 cp`).
- **VBF adatvesztés:** Kritikus – a napi pg_dump + off-site másolat ajánlott.

---

## 5. Összefoglaló – következő lépések

1. **Postgres + Redis:**  
   `docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d`  
   Környezet: `.env`-ben `POSTGRES_*` és opcionálisan `REDIS_*`. A backendnek szüksége van a `psycopg2-binary` csomagra (már a requirements.txt-ben).
   - Kötelező env változók fontos részei:
     - `DATABASE_URL` (ha Postgres-t használsz; formátum: `postgresql://user:pass@host:5432/db`)
     - PDF aláíráshoz: `VBF_PFX_PASSWORD` (a PFX jelszava), és a PFX elérési útja a céges beállításokban (`CompanySettings.pfx_path`) vagy `signer.pfx` alapértelmezés.

2. **Migráció (ha van meglévő SQLite adat):**  
   pgloader vagy a `backend/migrate_sqlite_to_postgres.py` script; majd a backend csak `DATABASE_URL`-lal indul.

3. **PDF (WeasyPrint):**  
   Külön fejlesztési fázis: Jinja2 sablon + WeasyPrint a PDF exportra, DOCX maradhat; később opcionálisan Gotenberg vagy teljes átállás HTML-re.

4. **Mentés:**  
   Napi pg_dump (profile backup) + script a dump feltöltésére R2/S3-re (vagy Hetzner snapshot).

A `database.py`-ban a Postgresre váltás **csak egy kapcsolati sztring**: a Docker Compose ezt a `docker-compose.postgres.yml`-ban biztosítja.

---

## Melléklet – Gyors `.env` példa (Postgres)

```env
POSTGRES_USER=vbf
POSTGRES_PASSWORD=change_me
POSTGRES_DB=vbf

# Backend
DATABASE_URL=postgresql://vbf:change_me@postgres:5432/vbf
REDIS_HOST=redis
REDIS_PORT=6379

# PDF aláírás
VBF_PFX_PASSWORD=itt_a_pfx_jelszava
```
