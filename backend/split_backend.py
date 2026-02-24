import os
import re

os.makedirs('backend/routers', exist_ok=True)
with open('backend/routers/__init__.py', 'w') as f:
    pass

with open('backend/main.py', 'r', encoding='utf-8') as f:
    main_content = f.read()

# Define segments by comments
# --- Auth Endpoints ---
# --- Reports Endpoints ---
# --- Master Data Endpoints (Customers) ---
# --- Master Data Endpoints (Inspectors) --- (merged with above)
# --- CRM / Job Management Endpoints ---

blocks = {
    "auth": r"# --- Auth Endpoints ---(.*?)(?=# --- Reports Endpoints ---)",
    "reports": r"# --- Reports Endpoints ---(.*?)(?=# --- Admin User Management ---)",
    "admin": r"# --- Admin User Management ---(.*?)(?=# --- Master Data Endpoints)",
    "masterdata": r"# --- Master Data Endpoints \(Customers\)(.*?)(?=# --- CRM / Job Management Endpoints ---)",
    "jobs": r"# --- CRM / Job Management Endpoints ---(.*)"
}

router_template = """from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import smtplib
from email.message import EmailMessage
import zipfile
import tempfile
import sqlite3
import base64

import schemas, auth, database
import generator
from fastapi.responses import StreamingResponse

router = APIRouter()

"""

for name, pattern in blocks.items():
    match = re.search(pattern, main_content, re.DOTALL)
    if match:
        code = match.group(0) # Include the comment header as well
        # Replace @app. decorators with @router.
        code = re.sub(r"@app\.", "@router.", code)
        
        with open(f'backend/routers/{name}.py', 'w', encoding='utf-8') as f:
            f.write(router_template + code)

# Now rewrite main.py
new_main = """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth_router, reports, admin, masterdata, jobs

app = FastAPI(title="VBF Készítő API", description="Jegyzőkönyv és rajz kezelő rendszer", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(masterdata.router)
app.include_router(jobs.router)
"""

with open('backend/main_new.py', 'w', encoding='utf-8') as f:
    f.write(new_main)
