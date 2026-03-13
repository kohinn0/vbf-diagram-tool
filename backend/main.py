import os
import sys

# Ensure the backend directory is in the path for internal imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, reports, admin, masterdata, jobs, payments, dashboard, legal

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware
import os
import sys
import logging

# Strukturált logging: szint, idő, üzenet
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("vbf")

# Opcionális Sentry (ha SENTRY_DSN env be van állítva)
try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    dsn = os.environ.get("SENTRY_DSN")
    if dsn:
        sentry_sdk.init(dsn=dsn, integrations=[FastApiIntegration()], traces_sample_rate=0.1)
        logger.info("Sentry error tracking enabled")
except ImportError:
    pass

app = FastAPI(title="VBF Készítő API", description="Jegyzőkönyv és rajz kezelő rendszer", version="1.0.0")

limiter = auth.limiter
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

app.add_middleware(SecurityHeadersMiddleware)

# Setup CORS - Outermost layer
# DEV: engedünk mindent; PROD: opcionálisan szigorítható env változóval
_env = os.getenv("ENV", "").lower()
_cors_origins_raw = os.getenv("CORS_ALLOW_ORIGINS", "")
if _cors_origins_raw:
    allow_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]
else:
    # Ha nincs explicit lista, akkor:
    # - fejlesztésben: "*"
    # - egyébként: biztonsági okból továbbra is "*" marad, de env‑vel szigorítható
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from routers import padfx
app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(masterdata.router)
app.include_router(jobs.router)
app.include_router(payments.router)
app.include_router(dashboard.router)
app.include_router(legal.router)
app.include_router(padfx.router)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text
import database

os.makedirs("data", exist_ok=True)
app.mount("/data", StaticFiles(directory="data"), name="data")


@app.get("/health")
def health():
    """Kubernetes / load balancer probe: DB elérhetőség."""
    try:
        with database.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        logger.exception("Health check failed")
        return JSONResponse(
            {"status": "error", "detail": str(e)},
            status_code=503,
        )

