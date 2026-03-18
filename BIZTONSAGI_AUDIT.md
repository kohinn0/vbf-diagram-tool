# Biztonsági audit – VBF Diagram Tool

**Dátum:** 2025-03-07  
**Scope:** Backend (FastAPI), frontend (JS/HTML), auth, fájlkezelés, API jogosultságok.

---

## 1. Összefoglaló

| Kategória        | Státusz | Megjegyzés |
|------------------|--------|------------|
| Hitelesítés      | ✅ Jó  | JWT, bcrypt, erős jelszó, rate limit login |
| Jogosultságok    | ✅ Jó  | Report/company scope konzisztens |
| Titkok kezelése | ⚠️ Figyelj | Élesben kötelező env (SECRET_KEY, Stripe) |
| CORS             | ✅ Jó     | CORS_ORIGINS env (üres = *); élesben állítsd be |
| Fájlfeltöltés    | ✅ Jó     | Zip slip védelem; logo/aláírás max 10 MB |
| XSS              | ✅ Javítva | escHtml/attr; report card, audit, admin, jobs, toast, completeness escape |
| SQL injection    | ✅ Jó  | ORM + paraméteres lekérdezések; jobs.py táblanév szűrve |

---

## 2. Hitelesítés és jelszókezelés

### Pozitívumok
- **Jelszó:** bcrypt (passlib), erős policy (min 8 karakter, nagy/kis/szám vagy speciális).
- **JWT:** HS256, lejárat konfigurálható (`JWT_EXPIRE_MINUTES`), élesben **SECRET_KEY** kötelező (alapértelmezett esetén RuntimeError productionban).
- **Rate limit:** Bejelentkezés 10/perc; jelszó módosítás / reset 5 / 15 perc.
- **Brute-force védelem:** Redis alapú lock (sikertelen próbálkozások → progresszív lock, strike TTL). Konfig: `LOGIN_FAIL_LIMIT`, `LOGIN_LOCK_SECONDS`, `STRIKE_TTL_SECONDS`, `MAX_LOCK_SECONDS`.
- **Jelszó visszaállítás:** Token SHA256 hash-ként tárolva, lejárat; rate limit a kérésen és a reset-en.

### Ajánlások
- Élesben mindig külön, erős `SECRET_KEY` (min. 32 véletlen karakter).
- Élesben rövidebb JWT lejárat (pl. 60–1440 perc) és opcionális refresh token stratégia.

---

## 3. Jogosultságok (RBAC) és adathozzáférés

### Backend
- **Report lista:** Super/Admin minden; COMPANY_ADMIN: saját cég reportjai; TECH: saját reportok.
- **Report megtekintés/módosítás/export:** Tulajdonos vagy (COMPANY_ADMIN és ugyanaz a cég). `_report_access` és filterek konzisztensek.
- **Publikus megosztás:** Csak token alapján, rate limit (60/perc/IP). Nincs szerkesztés.
- **Admin API:** `get_current_admin` → SUPER_ADMIN, ADMIN, COMPANY_ADMIN; céges admin csak saját cégre korlátozva.
- **Mérési sablonok:** Company vagy owner scope; create/update/delete jog ellenőrzött.

### Ajánlás
- Audit log kiterjesztése kritikus műveletekre (pl. report törlés, jogosultság változás), ha még nincs mindenhol.

---

## 4. Titkok és környezeti változók

| Változó | Élesben | Jelenlegi kockázat |
|---------|---------|--------------------|
| `SECRET_KEY` | Kötelező | Productionban alapértelmezett esetén az app nem indul (✅). |
| `STRIPE_SECRET_KEY` | Kötelező | Alap: `sk_test_fake` – élesben **állítsd be** valódi értékre. |
| `STRIPE_WEBHOOK_SECRET` | Kötelező | Alap: `whsec_fake` – webhook aláírás ellenőrzéséhez kell. |
| `ENV=production` | Ajánlott | Dev bootstrap endpoint (lásd alább) csak nem-productionban érhető el. |
| Redis (rate limit) | Ajánlott | Ha nincs Redis, a login lock logika hibát dob (fail-secure). |

**Dev-only endpoint:** `POST /api/dev/bootstrap-admin` – ismert jelszavú admin létrehozása/reset. **Élesben (ENV=production) 404** – ne legyen productionban `ENV` != `production`.

---

## 5. CORS és fejlécek

- **CORS – JAVÍTVA:** `allow_origins` a **CORS_ORIGINS** env-ből jön. Ha üres/nincs beállítva → `["*"]` (dev). Élesben állítsd be pl. `CORS_ORIGINS=https://yourdomain.com`. Több origin: vesszővel elválasztva. `allow_credentials=False`.
- **Security headers:** X-Content-Type-Options, X-Frame-Options, X-XSS-Protection beállítva; HTTPS esetén HSTS (X-Forwarded-Proto alapján).

---

## 6. Fájlfeltöltés és fájlkezelés

### Path traversal
- **jobs.py:** `_safe_upload_filename()` – basename + csak `\w.\-`, max 200 karakter. Temp könyvtárba írás → ✅.
- **padfx.py:** Fájlnév basename + alfanum + `._-`, max 200 karakter. ✅.

### Zip kicsomagolás (Zip Slip) – **JAVÍTVA**
- **jobs.py** és **padfx.py:** `_safe_extract_zip()` – minden ZIP member célútvonala ellenőrzött: `realpath` alapján csak akkor extract, ha a cél a `dest_dir` alatt van. Tiltott path esetén `ValueError`.

### Képfeltöltés (logo, aláírás) – **JAVÍTVA**
- Logo és aláírás: **max 10 MB** (`MAX_IMAGE_UPLOAD_BYTES`). A read limitált: `file.file.read(MAX + 1)`; ha több jön, 400-as válasz. PIL átméretezés továbbra is (thumbnail / max 400px).

### PFX feltöltés
- Csak `.pfx` / `.p12` kiterjesztés; min. 100 bájt. Tartalom típus nem ellenőrzött (bináris). A jelszó külön env (`VBF_PFX_PASSWORD`). ✅ Megfelelő.

---

## 7. SQL injection

- **Általános:** SQLAlchemy ORM és paraméteres `text()` – nincs felhasználói input közvetlenül SQL stringben.
- **jobs.py:** Táblanevek a `sqlite_master`-ból jönnek, majd regex szűrve: `^[a-zA-Z0-9_]+$`. PRAGMA és SELECT csak ezekkel a nevekkel – ✅.
- **database.py migrációk:** Fix oszlopnevek/táblanevek, vagy ciklusban `PRAGMA table_info` eredménye (oszlopnév) – nem felhasználói input. ✅.

---

## 8. XSS (frontend) – **JAVÍTVA**

- **sanitize.js:** `VBF.sanitize.escHtml()` és `VBF.sanitize.attr()` bővítve; `escHtml` minden & < > " escape.
- **reports.js:** Report kártya cím és docId; audit napló when/action/who – mind escape-elve.
- **admin.js:** username, company_name, email, expiry – escH/escA (HTML és attribútum).
- **jobs.js:** job title, address, description, dateStr – escape; „Munka Kezdése” gomb data-job-* attribútumokkal + `startJobWork(this)` (nincs user adat az onclick stringben).
- **toast.js:** üzenet escape (`escToast`) mielőtt innerHTML-be kerül.
- **completeness.js:** instrCal, calDaysLeft escape a kalibrálás szövegben.
- **CSP:** Opcionális: `CONTENT_SECURITY_POLICY` env; `CONTENT_SECURITY_POLICY_REPORT_ONLY=1` esetén Report-Only fejléc.

---

## 9. Egyéb

### Rate limit
- Login, jelszó változtatás, jelszó reset, publikus report: rate limit be van állítva. Redis kötelező a login lockhoz.

### Audit napló
- Bejelentkezés (siker / sikertelen / lock), jelszó változtatás, jelszó reset, report megnyitás/export/finalize – a kódban vannak ilyen logok. Érdemes ellenőrizni, hogy ezek valóban íródnak és megfelelően védettek.

### Statikus fájlok
- `/data` könyvtár StaticFiles-ként mountolva – a `data` mappa tartalma (pl. logos, signatures, DB) szerverről kiszolgálható. Élesben gondoskodj róla, hogy ne legyen felesleges fájl a `data` alatt, és hogy a szerver konfig ne engedjen felső szintű path traversal-t.

### Trusted proxy
- `TRUST_FORWARD_PROXIES` – csak ezen IP-kről fogadja az X-Forwarded-For / X-Real-IP értékeket. Élesben állítsd be a proxy/LB IP-jét.

---

## 10. Teendőlista (prioritás szerint)

1. **Éles környezet:** SECRET_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET mindig env-ből, soha ne alapértelmezett „fake” érték.
2. **CORS:** ✅ Élesben állítsd be a `CORS_ORIGINS` env-et (pl. `https://yourdomain.com`).
3. **Zip slip:** ✅ Javítva – `_safe_extract_zip()` használata jobs.py és padfx.py-ban.
4. **Feltöltött képek:** ✅ Javítva – logo és aláírás max 10 MB.
5. **XSS:** ✅ Javítva – escHtml/attr, report/admin/jobs/toast/completeness; opcionális CSP env.
6. **ENV=production:** Éles példányon mindig beállítva, hogy a dev bootstrap endpoint ne legyen elérhető.

---

*Az audit statikus kódelemzésen és ismert biztonsági gyakorlatokon alapul. Éles bevezetés előtt érdemes penetrációs teszttel és függőségi auditálással (pl. `pip audit`, npm audit) kiegészíteni.*
