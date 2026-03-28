# VBF Premium – Villamos Biztonsági Felülvizsgálati SaaS

Modern, interaktív, vállalati szintű felhőalkalmazás (SaaS) **villamos biztonsági felülvizsgálati (VBF)** és **EPH** jegyzőkönyvek / nyilatkozatok rögzítéséhez, alaprajzok felvételéhez és automatizált, szabványos dokumentumok generálásához. *A villámvédelmi felülvizsgálati (VVF) modul fejlesztés alatt áll.*

A rendszer Fabric.js alapú rajzoló felülettel, okos offline hálózatkezeléssel, QR kód szkenneléssel, RBAC jogosultságkezeléssel és FastAPI Python backenddel rendelkezik a professzionális Word és elektronikusan aláírt PDF dokumentumok előállításához.

---

## 🚀 Főbb funkciók

- **🛡️ RBAC jogosultságkezelés** – Adminok osztanak ki feladatokat; a szerelők (TECH) csak a nekik szánt egyszerűsített naptáros és rajzos felületet látják.
- **📡 Offline szinkronizáció (PWA)** – Nincs net a pincében? Az app offline módban menti a munkát a böngészőben, majd egyetlen gombnyomással szinkronizál.
- **🌓 Sötét / Világos mód** – Modern design system CSS változókkal, azonnali témaváltással.
- **📷 QR kód & képfeltöltés** – Beépített kamerás QR szkenner, fotómellékletek a Word exporthoz.
- **🤖 Automatikus hibagenerálás** – Egy kattintásra elemzi a mérési lapokat, és legenerálja a feltárt hibák listáját.
- **🔒 Zárolás** – Elkészült jegyzőkönyvek fagyasztása jogi és biztonsági okokból.
- **📄 Export** – Valós idejű DOCX és elektronikusan aláírt PDF (PyHanko + LibreOffice headless).
- **🛡️ GDPR** – Adatkezelési tájékoztató, adatexport, fióktörlés, audit napló.

---

## 🛠️ Technológiai Stack

### Frontend (Új – React)
| Technológia | Verzió / Csomag | Cél |
|---|---|---|
| **React** | 19 | UI framework |
| **TypeScript** | 5+ | Típusbiztonság |
| **Vite** | 6 | Build eszköz, dev szerver |
| **Tailwind CSS** | 4 | Utility-first stílusozás |
| **Zustand** | persist middleware | Állapotkezelés (kosár, draft adatok) |
| **React Router** | v7 | Routing (`/`, `/app/*`) |
| **Fabric.js** | 6 | Vászon alapú elosztó rajzoló |
| **Lucide React** | – | Ikonkészlet |

### Backend
| Technológia | Cél |
|---|---|
| **Python 3.11 + FastAPI** | REST API |
| **SQLAlchemy + SQLite** | ORM és adatbázis |
| **python-docx** | DOCX generálás |
| **PyHanko + LibreOffice** | PDF e-Aláírás |

---

## 📐 Alkalmazás rétegek

| Réteg | Útvonal | Cél |
|---|---|---|
| **Landing / Webshop** | `/` | Főoldal: funkciók, árazás, kosár (utalásos), kapcsolat |
| **Diagram Tool** | `/app/*` | Naptár, rajz, VBF/EPH adatok, mérések, hibajegyzék, export |
| **Admin** | `/app/admin` | Felhasználók, cégek, csomagok, megrendelések (csak ADMIN) |

---

## 🐳 Futtatás Dockerrel (Éles környezet)

```bash
# Klónozás
git clone https://github.com/kohinn0/vbf-diagram-tool.git
cd vbf-diagram-tool

# Indítás (build + háttérben)
docker-compose up -d --build

# Elérhetőség
# Frontend:  http://localhost  (vagy a NAS/szerver IP-je)
# API docs:  http://localhost:8001/docs
```

**Frissítés:**
```bash
git pull
docker-compose up -d --build
```

> **Fontos:** A frontend konténer az `npm run build` kimenetét (`frontend/dist/`) szolgálja ki nginx-szel. Kód változtatás után mindig `--build` szükséges.
>
> *Az első regisztrált felhasználó automatikusan ADMIN jogot kap.*

---

## 💻 Fejlesztői környezet (Helyi futtatás)

### Frontend (React + Vite)

```bash
cd frontend

# Függőségek telepítése
npm install

# Dev szerver indítása (http://localhost:5173)
npm run dev
```

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

---

## 📁 Projekt struktúra

```
vbf-diagram-tool/
├── frontend/               # ✨ Új React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── landing/    # HeroSection, PricingSection, FaqSection, stb.
│   │   │   ├── diagram/    # CanvasWorkspace, MeasurementsTab, DefectsTab
│   │   │   └── auth/       # LoginModal
│   │   ├── pages/          # Landing.tsx, DiagramTool.tsx
│   │   ├── store/          # Zustand: cartStore, draftStore
│   │   └── lib/            # api.ts, utils.ts
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                # FastAPI Python backend
│   ├── main.py
│   └── generator.py
├── docker-compose.yml
└── README.md
```

---

## 📋 Fejlesztési státusz

| Modul | Státusz |
|---|---|
| Landing Page (React) | ✅ Kész |
| Webshop / Kosár (Zustand) | ✅ Kész |
| Bejelentkezés (LoginModal) | ✅ Kész |
| DiagramTool shell + routing | ✅ Kész |
| CanvasWorkspace (Fabric.js) | ✅ Kész |
| MeasurementsTab | ✅ Kész |
| DefectsTab (Hibajegyzék) | ✅ Kész |
| PDF / Word export (backend) | ✅ Kész |
| VVF modul | 🔄 Fejlesztés alatt |

---

VBF Premium © 2026 – Szakembertől szakembereknek. Minden jog fenntartva.
