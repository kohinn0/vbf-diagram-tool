# VBF / EPH Érintésvédelmi Rajzkészítő és Jegyzőkönyv Generáló SaaS

Modern, interaktív, vállalati szintű felhőalkalmazás (SaaS) **villamos biztonsági felülvizsgálati (VBF)** és **EPH** jegyzőkönyvek / nyilatkozatok rögzítéséhez, alaprajzok felvételéhez és automatizált jegyzőkönyvek generálásához. *Jelenleg a rendszer VBF és EPH generátor; a villámvédelmi felülvizsgálati (VVF) modul később kerül bele.*

A rendszer tartalmaz egy Fabric.js alapú rajzoló felületet, okos Offline hálózatkezelést, QR kód szkennert, RBAC jogosultságkezelést és egy FastAPI alapú Python backendet a professzionális Word és elektronikusan aláírt PDF jegyzőkönyvek ipari előállításához.

## 🚀 Főbb funkciók és Képességek

*   **🛡️ Szerepkör alapú jogosultságkezelés (RBAC)**: Adminisztrátorok osztanak ki naptárban feladatokat (munkákat), kezelik az előfizetéseket és a felhasználókat. A szerelők (TECH) csak a nekik szánt egyszerűsített felületet, naptárat és rajztáblát látják.
*   **📡 Okos Offline Szinkronizáció (PWA szerű működés)**: Nincs internet a pincében? Semmi gond! A rendszer háttérben figyeli a hálózatot. Ha megszakad az internet, az alkalmazás "Offline Módba" kapcsol, a telefon memóriájában tárolja a munkát, és amint lesz térerő, a technikus egyetlen gombnyomással felküldi a módosított vagy új jegyzőkönyveket a felhőbe.
*   **🌓 Prémium Élmény (Világos / Sötét mód)**: Modern, gyönyörű, testreszabható felület azonnali Dark/Light mode váltással, ami böngésző szinten megjegyzi a preferenciádat.
*   **📷 QR Kódos Eszközmenedzsment & Képfeltöltés**: Beépített kamerás QR szkenner a jegyzőkönyvek azonnali beolvasásához. A mérésekhez (pl. egy RPE kötési ponthoz) a technikus a helyszínen fotókat is csatolhat, amik bekerülnek a Word mellékletébe!
*   **🤖 Automatizált Hibagenerálás**: Egy gombnyomásra kielemzi az összes mérési lapot (táblázatot), és a "Nem" megfelelt értékekből automatikusan legenerálja a Feltárt Hibák és Hiányosságok listáját fotókkal és leírásokkal együtt.
*   **🔒 Jegyzőkönyv Véglegesítés (Lock)**: Elkészült jegyzőkönyvek fagyasztása biztonsági és jogi okokból.
*   **📄 Fejlett Export**: Valós idejű, formázott DOCX (Word) dokumentumok és szerverszinten elektronikusan aláírt PDF-ek (PyHanko és LibreOffice headless motorral) előállítása.
*   **🛡️ Adatvédelem (GDPR)**: Adatkezelési tájékoztató, adatexport (adathordozhatóság), fióktörlés (törlés joga), süti tájékoztató és elfogadó, audit napló anonimizálás törléskor.

## 🛠️ Technológiai Stack

*   **Frontend**: HTML5, Vanilla JavaScript (Moduláris), Tiszta CSS változókkal (Design System), Fabric.js (rajz), `html5-qrcode`.
*   **Backend**: Python 3.11, FastAPI, SQLAlchemy (ORM), python-docx (DOCX manipuláció), pyhanko (PDF e-Aláírás).
*   **Csomagolás és Adatbázis**: SQLite (a `backend/data` mappában tárolva), teljes Docker & Docker Compose ökoszisztéma LibreOffice csomagokkal a PDF konverzióhoz.

## 📐 Frontend rétegek (átlátható felosztás)

A felület három, cél szerint szétválasztott rétegben érhető el:

| Réteg | Fájl | Cél |
|--------|------|-----|
| **Webshop** | `index.html` | Főoldal: árazás, vásárlás (kártya / utalás), kapcsolat. Regisztráció = vásárlás. |
| **Cég admin** | `shop.html` | Dashboard (statisztikák, grafikonok), Admin (felhasználók, cégek, csomagok, megrendelések, fizetési előzmények, céges beállítások, munkakiosztás). Csak admin jogosultságúaknak. |
| **Jegyzőkönyv alkalmazás** | `app.html` | Naptár és feladatok, rajz, jegyzőkönyv adatok, hibajegyzék, mérések, mentett ügyek, törzsadatok. Adminnak innen link a Cég admin felületre. |

Részletesebb leírás: `ARCHITECTURE.md`.

## 🐳 Futtatás Dockerrel (Ajánlott / Éles Környezet)

A projekt teljes egészében, minden függőségével (PDF motorok, adatbázis) futtatható egyetlen pillanat alatt Docker és Docker Compose segítségével.

1. **Klónozd a repót**:
   ```bash
   git clone https://github.com/kohinn0/vbf-diagram-tool.git
   cd vbf-diagram-tool
   ```

2. **Indítsd el a konténereket a háttérben**:
   ```bash
   docker-compose up -d --build
   ```

3. **Használat**:
   *   A frontend applikáció (Web kliens) elérhető: [http://localhost](http://localhost) vagy az adott gép / NAS IP címén (pl: `http://192.168.1.100`)
   *   A backend API elérhető (FastAPI Docs Swagger): [http://localhost:8001/docs](http://localhost:8001/docs)

4. **Frissítés (kód / image újraépítése)**:
   ```bash
   git pull
   docker-compose up -d --build
   ```
   A `--build` újraépíti a frontend és backend image-eket a legfrissebb kódból, majd újraindítja a konténereket. Az adatbázis (SQLite a `vbf_data` volume-on) megmarad. Ha csak a konténereket akarod újraindítani build nélkül: `docker-compose up -d`.

*Alapértelmezett első belépés: Készíts egy felhasználót, az legelső regisztráló automatikusan ADMIN jogot kap az egész alkalmazás felett!*

## 📁 Projekt struktúra (Nagyvonalakban)

*   `frontend/`: Statikus fájlok, HTML beépített templatekkel, Moduláris CSS archtektúra és PWA JS alkalmazás kódja.
*   `backend/`: Microservice orientált FastAPI alkalmazás (`main.py`, `generator.py` API-kkal), SQLite adatbázis relációkkal.
*   `docker-compose.yml`: DevOps leíró konfiguráció az élesítéshez.

---
VBF / EPH Cloud SaaS © 2026. Minden jog fenntartva.
