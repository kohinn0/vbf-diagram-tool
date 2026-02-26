from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, reports, admin, masterdata, jobs, payments, dashboard

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware
import os
import sqlite3

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="VBF Készítő API", description="Jegyzőkönyv és rajz kezelő rendszer", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip security headers for CORS preflight
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

# Setup CORS - MUST be added before SecurityHeaders so it runs first in the chain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(masterdata.router)
app.include_router(jobs.router)
app.include_router(payments.router)
app.include_router(dashboard.router)

from fastapi.staticfiles import StaticFiles
import os

os.makedirs("data", exist_ok=True)
app.mount("/data", StaticFiles(directory="data"), name="data")

from fastapi.responses import JSONResponse
from fastapi import File, UploadFile, Depends
import auth as main_auth
import database

@app.post("/api/padfx/parse")
async def parse_padfx_file(
    file: UploadFile = File(...),
    current_user: database.User = Depends(main_auth.get_current_user)
):
    import tempfile
    import zipfile
    
    with tempfile.TemporaryDirectory() as td:
        tf_path = os.path.join(td, file.filename)
        with open(tf_path, "wb") as f:
            f.write(await file.read())
            
        try:
            with zipfile.ZipFile(tf_path, 'r') as zf:
                zf.extractall(td)
                
                sqlite_file = None
                for root, dirs, files in os.walk(td):
                    for name in files:
                        if name == "measData.sqlite" or name.endswith(".sqlite") or name.endswith(".db"):
                            sqlite_file = os.path.join(root, name)
                            break
                            
                if sqlite_file:
                    try:
                        conn = sqlite3.connect(sqlite_file)
                        c = conn.cursor()
                        tables = c.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
                        table_names = [t[0] for t in tables]
                        
                        sample_data = {}
                        if "MeasureData" in table_names:
                            c.execute("SELECT * FROM MeasureData LIMIT 5")
                            sample_data["MeasureData_sample"] = c.fetchall()
                            c.execute("PRAGMA table_info(MeasureData)")
                            sample_data["MeasureData_cols"] = c.fetchall()
                        
                        conn.close()
                        
                        return JSONResponse(status_code=200, content={
                            "status": "success",
                            "is_sqlite": True,
                            "tables": table_names,
                            "sample": sample_data
                        })
                    except Exception as ex:
                        return JSONResponse(status_code=500, content={"status": "error", "message": f"SQLite error: {str(ex)}"})
                
                xml_content = None
                for root, dirs, files in os.walk(td):
                    for name in files:
                        if name.endswith(".xml"):
                            with open(os.path.join(root, name), "r", encoding='utf-8') as xf:
                                xml_content = xf.read()
                            break
                            
                if xml_content is not None:
                    import analyzer2
                    extracted = analyzer2.parse_padfx_xml(xml_content)
                    return JSONResponse(status_code=200, content={
                        "status": "success",
                        "is_sqlite": False,
                        "xml_length": len(xml_content),
                        "measurements": extracted
                    })

            return JSONResponse(status_code=400, content={"status": "error", "message": "Nem találtam értelmezhető adatfájlt a PADFX-ben."})
            
        except Exception as e:
            return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
