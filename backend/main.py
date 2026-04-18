import os
import sys

# Ensure the backend directory is in the path for internal imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import auth, reports, admin, masterdata, jobs, payments, dashboard, legal, padfx

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware
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

is_production = os.getenv("ENV", "").strip().lower() == "production"
app = FastAPI(
    title="VBF Készítő API",
    description="Jegyzőkönyv és rajz kezelő rendszer",
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

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
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        # HSTS csak HTTPS éles környezetben — dev HTTP-n ne tegyen be ragadó redirectet a böngészőbe
        if os.getenv("ENV", "").strip().lower() == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Setup CORS - Élesben kötelező a CORS_ORIGINS (pl. https://yourdomain.com)
_cors_origins = os.getenv("CORS_ORIGINS", "").strip()
if is_production and not _cors_origins:
    raise RuntimeError("Production requires CORS_ORIGINS to be set (comma-separated allowed origins).")
CORS_ORIGINS_LIST = [o.strip() for o in _cors_origins.split(",") if o.strip()] if _cors_origins else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS_LIST,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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
from sqlalchemy import text
import database

database.init_db()

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

