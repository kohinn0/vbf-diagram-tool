# VBF Érintésvédelmi Rajzkészítő és Jegyzőkönyv Generáló

Modern, interaktív webalkalmazás villamos biztonsági felülvizsgálatok (VBF) rögzítéséhez, alaprajzok felvételéhez, és automatizált jegyzőkönyvek generálásához. A rendszer tartalmaz egy Fabric.js alapú rajzoló felületet, QR kód olvasót, mérések rögzítésére szolgáló táblázatokat és egy Python (FastAPI) alapú backendet a Word és PDF jegyzőkönyvek előállításához.

## 🚀 Főbb funkciók

- **Interaktív Rajzkészítő**: Villamos és építészeti szimbólumok elhelyezése vásznon.
- **Többlapos Felület**: Rajz, Jegyzőkönyv adatok, Eredmények, Naptár, Adminisztráció egy helyen.
- **Automatikus Hibagenerálás**: Képes elemezni a rögzített mérési adatokat, és automatikusan generálni a hibajegyzéket a "Nem" megfelelt mérések alapján.
- **Jegyzőkönyv Export**: Valós idejű DOCX (Word) és elektronikusan aláírt PDF generálás a FastAPI backend segítségével.
- **Metrel PADFX import**: Mérések beolvasása `.padfx` állományokból (fejlesztés alatt).
- **Admin & Role-Based Access (RBAC)**: Különféle jogosultságok a felülvizsgálat kiosztására és a felhasználók kezelésére.

## 🛠️ Technológiai Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS, Fabric.js (rajz), QRCode.js.
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, python-docx (DOCX), pyhanko (PDF aláírás).
- **Adatbázis**: SQLite (a `backend/data` mappában tárolva).

## 🐳 Futtatás Dockerrel (Ajánlott)

A projekt teljes egészében futtatható Docker és Docker Compose segítségével.

1. **Klónozd a repót**:
   ```bash
   git clone https://github.com/felhasznalo_neved/vbf-diagram-tool.git
   cd vbf-diagram-tool
   ```

2. **Indítsd el a konténereket**:
   ```bash
   docker-compose up -d --build
   ```

3. **Használat**:
   - A frontend applikáció elérhető: [http://localhost](http://localhost)
   - A backend API elérhető (FastAPI Docs): [http://localhost:8001/docs](http://localhost:8001/docs)

## 💻 Helyi fejlesztés (Lokális futtatás)

Ha Docker nélkül szeretnéd futtatni:

### Backend Indítása
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

> **Fontos**: Ahhoz hogy a PDF aláírás megfelelően működjön, kell egy PKCS12 / PFX tanúsítvány (`signer.pfx` néven a `backend` mappába). Bekerült egy teszt tanúsítvány próbára, de éles környezetben cseréld le a sajátodra!

### Frontend Indítása
Egyszerűen nyisd meg az `index.html`-t egy böngészőben, vagy indíts egy egyszerű fájlszervert:
```bash
cd frontend
python -m http.server 80
```
Nyisd meg: [http://localhost](http://localhost)

## 📁 Projekt struktúra

- `frontend/`: Statikus fájlok, HTML, CSS és Vanilla JS app fájlok.
- `backend/`: FastAPI alkalmazás, PDF/DOCX generátor logika, autentikációs rendszer.
- `analyzer.py` / `analyzer2.py`: Műszeres fájlok (Metrel) elemzéséhez készült scriptek. 

---

Copyright © 2026. Minden jog fenntartva.
