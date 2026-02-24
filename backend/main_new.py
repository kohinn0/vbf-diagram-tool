from fastapi import FastAPI
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
