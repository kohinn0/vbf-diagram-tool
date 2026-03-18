import os
import sys
from contextlib import asynccontextmanager

# Ensure the backend directory is in the path for internal imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import auth, reports, admin, masterdata, jobs, payments, dashboard, legal

from starlette.requests import Request
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import security
from security import RateLimitExceeded as CustomRateLimitExceeded

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan: Redis connection pool inicializálása és lezárása.
    """
    redis_client = security.create_redis()
    security.set_redis(redis_client)
    app.state.redis = redis_client
    try:
        yield
    finally:
        await redis_client.aclose()


app = FastAPI(
    title="VBF Készítő API",
    description="Jegyzőkönyv és rajz kezelő rendszer",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(CustomRateLimitExceeded)
async def rate_limit_handler(request: Request, exc: CustomRateLimitExceeded):
    headers = {}
    retry_after = getattr(exc, "retry_after", None)
    if isinstance(retry_after, int) and retry_after > 0:
        headers["Retry-After"] = str(retry_after)
    return JSONResponse(
        status_code=429,
        content={"detail": str(exc)},
        headers=headers or None,
    )

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip security headers for CORS preflight
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response

        response = await call_next(request)

        # Alap biztonsági fejlécek – reverse proxy mögött is működjenek
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # HSTS csak akkor, ha a külső kapcsolat HTTPS (pl. X-Forwarded-Proto)
        proto = request.headers.get("x-forwarded-proto") or request.headers.get("X-Forwarded-Proto")
        if not proto:
            proto = request.url.scheme
        if str(proto).lower() == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Opcionális CSP: állítsd be CONTENT_SECURITY_POLICY env-et (pl. default-src 'self'; script-src 'self' 'unsafe-inline')
        # CONTENT_SECURITY_POLICY_REPORT_ONLY=1 esetén Report-Only fejléc (nem blokkol, csak naplóz)
        csp = os.getenv("CONTENT_SECURITY_POLICY", "").strip()
        if csp:
            header_name = "Content-Security-Policy-Report-Only" if os.getenv("CONTENT_SECURITY_POLICY_REPORT_ONLY") == "1" else "Content-Security-Policy"
            response.headers[header_name] = csp

        return response

app.add_middleware(SecurityHeadersMiddleware)

# Setup CORS - Élesben állítsd be CORS_ORIGINS (pl. https://yourdomain.com)
_cors_origins = os.getenv("CORS_ORIGINS", "").strip()
CORS_ORIGINS_LIST = [o.strip() for o in _cors_origins.split(",") if o.strip()] if _cors_origins else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS_LIST,
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

