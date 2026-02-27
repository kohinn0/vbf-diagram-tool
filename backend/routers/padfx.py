from fastapi import APIRouter, File, UploadFile, Depends
from fastapi.responses import JSONResponse
import os
import tempfile
import zipfile
import sqlite3

import sys
import os

# Base directory for the whole backend project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from auth import get_current_user
import database
import analyzer2
import schemas

router = APIRouter(prefix="/api/padfx", tags=["padfx"])

import shutil

@router.post("/parse")
async def parse_padfx_file(
    file: UploadFile = File(...),
    current_user: database.User = Depends(get_current_user)
):
    print(f"[PADFX] Fájl fogadva: {file.filename}")
    td = tempfile.mkdtemp()
    try:
        tf_path = os.path.join(td, file.filename)
        with open(tf_path, "wb") as f:
            f.write(await file.read())
            
        # Ha ZIP, csomagoljuk ki
        if zipfile.is_zipfile(tf_path):
            print(f"[PADFX] Ez egy ZIP fájl, kicsomagolás...")
            with zipfile.ZipFile(tf_path, 'r') as zf:
                zf.extractall(td)
        
        # Keressünk SQLite vagy XML fájlt a TemporaryDirectory-ban (és alkönyvtáraiban)
        sqlite_file = None
        xml_file = None
        
        for root, dirs, files in os.walk(td):
            for name in files:
                full_name = os.path.join(root, name)
                if name == "measData.sqlite" or name.endswith(".sqlite") or name.endswith(".db"):
                    sqlite_file = full_name
                    print(f"[PADFX] SQLite fájl megtalálva: {name}")
                elif name.endswith(".xml") or name.endswith(".PADFX") or name.endswith(".padfx"):
                    # Csak ha nem a ZIP maga (ha véletlenül átnevezve lenne)
                    if not zipfile.is_zipfile(full_name):
                        xml_file = full_name
                        print(f"[PADFX] XML/PADFX fájl megtalálva: {name}")

        # 1. Prioritás: SQLite
        if sqlite_file:
            conn = None
            try:
                conn = sqlite3.connect(str(sqlite_file))
                c = conn.cursor()
                tables = c.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
                table_names = [t[0] for t in tables]
                
                sample_data = {}
                if "MeasureData" in table_names:
                    c.execute("SELECT * FROM MeasureData LIMIT 5")
                    sample_data["MeasureData_sample"] = c.fetchall()
                    c.execute("PRAGMA table_info(MeasureData)")
                    sample_data["MeasureData_cols"] = c.fetchall()
                
                return JSONResponse(status_code=200, content={
                    "status": "success",
                    "is_sqlite": True,
                    "tables": table_names,
                    "sample": sample_data
                })
            except Exception as ex:
                print(f"[PADFX] SQLite hiba: {ex}")
                return JSONResponse(status_code=500, content={"status": "error", "message": f"SQLite error: {str(ex)}"})
            finally:
                if conn:
                    conn.close()
                    print("[PADFX] SQLite kapcsolat lezárva.")
        
        # 2. Prioritás: XML
        if xml_file:
            try:
                # Megpróbáljuk beolvasni többféle kódolással
                xml_content = None
                for enc in ['utf-8', 'utf-16', 'iso-8859-2']:
                    try:
                        with open(xml_file, "r", encoding=enc) as xf:
                            xml_content = xf.read()
                        if xml_content: break
                    except: continue
                
                if xml_content:
                    extracted = analyzer2.parse_padfx_xml(xml_content)
                    print(f"[PADFX] Sikeres XML feldolgozás, {len(extracted)} mérés.")
                    return JSONResponse(status_code=200, content={
                        "status": "success",
                        "is_sqlite": False,
                        "xml_length": len(xml_content),
                        "measurements": extracted
                    })
            except Exception as ex:
                print(f"[PADFX] XML parszolási hiba: {ex}")
                return JSONResponse(status_code=500, content={"status": "error", "message": f"XML parszolási hiba: {str(ex)}"})

        print("[PADFX] Nem sikerült felismerni az adatstruktúrát.")
        return JSONResponse(status_code=400, content={"status": "error", "message": "Nem találtam értelmezhető adatfájlt (SQLite vagy XML) a feltöltött állományban."})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
    finally:
        # Windows-on gyakori a PermissionError cleanupkor, ezért force-oljuk
        shutil.rmtree(td, ignore_errors=True)
        print(f"[PADFX] Ideiglenes könyvtár ({td}) törölve.")
